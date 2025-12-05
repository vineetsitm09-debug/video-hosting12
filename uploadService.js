// ----------------------------------------------------------------------
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import multer from "multer";
import { Queue } from "bullmq";
import { pool } from "./db.js";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import compression from "compression";
import { fileURLToPath } from "url";
import { Client } from "minio";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { verifyFirebaseToken } from "./middleware/verifyFirebaseToken.js";

// -----------------------------------------------------
// ?? Express App Setup
// -----------------------------------------------------
const app = express();
app.use(express.json());
// Helmet helps set security headers, including X-Content-Type-Options: nosniff
app.use(helmet()); 
app.use(compression());

// FIX: Add general security header for all responses to prevent MIME type blocking
app.use((req, res, next) => {
    // Helps prevent 'net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin' 
    // by ensuring the browser doesn't try to sniff MIME types.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});

app.use(
    cors({
        origin: [
            "http://localhost:5173", // your local frontend
            "http://18.218.164.106", // optional public IP
            "https://airstream.live" // your production domain (optional)
        ],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Accept",
        ],
    })
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------------------------------
// ?? MinIO Setup
// -----------------------------------------------------
const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || "18.218.164.106",
    // FIX: Ensure port is parsed as a number for MinIO Client constructor
    port: parseInt(process.env.MINIO_API_PORT || "9000", 10), 
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || "admin",
    secretKey: process.env.MINIO_SECRET_KEY || "password123",
});

const HLS_BUCKET = "hls";

// Ensure bucket exists
(async () => {
    const exists = await minioClient.bucketExists(HLS_BUCKET).catch(() => false);
    if (!exists) {
        console.log("?? Creating bucket:", HLS_BUCKET);
        await minioClient.makeBucket(HLS_BUCKET);
    }
})();

// -----------------------------------------------------
// ?? BullMQ Queue
// -----------------------------------------------------
const videoQueue = new Queue("video-processing", {
    connection: { host: "127.0.0.1", port: 6379 },
});

// -----------------------------------------------------
// ??? Multer Upload Config (Videos)
// -----------------------------------------------------
const upload = multer({
    dest: "uploads/",
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("video/")) {
            return cb(new Error("Only video files allowed"));
        }
        cb(null, true);
    },
});

// -----------------------------------------------------
// ?? JWT Middleware (for Company Login)
// -----------------------------------------------------
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized: No token" });

    try {
        req.company = jwt.verify(token, process.env.JWT_SECRET || "supersecret");
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}

// -----------------------------------------------------
// ?? AUTH ROUTES — Company Signup/Login
// -----------------------------------------------------
app.post("/api/auth/signup", async (req, res) => {
    try {
        const { companyName, email, password } = req.body;
        if (!companyName || !email || !password)
            return res.status(400).json({ error: "All fields are required" });

        const existing = await pool.query("SELECT * FROM companies WHERE email=$1", [email]);
        if (existing.rows.length > 0)
            return res.status(400).json({ error: "Email already registered" });

        const hash = await bcrypt.hash(password, 10);
        
        // Corrected logic: Insert new company and return its basic details
        const result = await pool.query(
            "INSERT INTO companies (company_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, company_name, email",
            [companyName, email, hash]
        );

        res.json({ success: true, company: result.rows[0] });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ error: "Server error during signup" });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query("SELECT * FROM companies WHERE email=$1", [email]);
        const company = result.rows[0];
        if (!company) return res.status(401).json({ error: "Invalid credentials" });

        const valid = await bcrypt.compare(password, company.password_hash);
        if (!valid) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign(
            { id: company.id, email: company.email, companyName: company.company_name },
            process.env.JWT_SECRET || "supersecret",
            { expiresIn: "12h" }
        );

        res.json({
            success: true,
            token,
            company: { id: company.id, companyName: company.company_name, email: company.email },
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error during login" });
    }
});

app.get("/api/auth/me", (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "No token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret");
        res.json({ success: true, company: decoded });
    } catch {
        res.status(401).json({ error: "Invalid token" });
    }
});

// -----------------------------------------------------
// ? NEW PUBLIC ROUTE: GET /videos (Fixes 404 error)
// -----------------------------------------------------
// -----------------------------------------------------
// ? FIXED: /videos route with playable + thumbnail URLs
// -----------------------------------------------------
app.get("/videos", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, filename, title, status, uploader_email, created_at
       FROM videos
       WHERE status='ready'
       ORDER BY created_at DESC`
    );

    // Normalize each video with stream & thumbnail URLs
    const videos = result.rows.map((v) => {
      const baseName = v.filename?.replace(/\.[^/.]+$/, "") || v.filename;

      return {
        id: v.id,
        filename: v.filename,
        title: v.title || baseName,
        status: v.status,
        uploader_email: v.uploader_email,
        created_at: v.created_at,
        // ?? Streaming HLS URL
        url: `http://18.218.164.106:5000/hls/${baseName}/master.m3u8`,
        // ?? Thumbnail URL (matches your /hls/thumbnails route)
        thumbnail: `http://18.218.164.106:5000/hls/thumbnails/${baseName}/thumb_0001.jpg`,
      };
    });

    res.json({ success: true, videos });
  } catch (err) {
    console.error("? Error fetching videos:", err);
    res.status(500).json({ error: "Failed to fetch video list" });
  }
});



// -----------------------------------------------------
// ?? UPLOAD VIDEO — Protected by Firebase Auth
// -----------------------------------------------------
app.post("/upload", verifyFirebaseToken, upload.single("file"), async (req, res) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(401).json({ error: "Invalid user" });
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        // ? Define filePath and fileName (this was missing!)
        const filePath = req.file.path;
        const fileName = req.file.filename;

        console.log(`?? Upload by: ${userEmail}, file: ${fileName}`);

        // ? Add the job to BullMQ queue for FFmpeg processing
        await videoQueue.add("processVideo", {
            filePath,
            fileName,
            uploaderEmail: userEmail,
        });

        // ? Insert into PostgreSQL
        await pool.query(
            "INSERT INTO videos (filename, status, uploader_email) VALUES ($1, $2, $3)",
            [fileName, "queued", userEmail]
        );

        // ? Respond immediately (don’t wait for FFmpeg)
        res.json({
            success: true,
            message: `Upload received: ${fileName}. Processing started.`,
        });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: err.message });
    }
});


// -----------------------------------------------------
// ?? SERVE THUMBNAILS (using the nested path fix)
// -----------------------------------------------------
app.get("/hls/:video/:file", async (req, res) => {
  const { video, file } = req.params;
  const bucket = HLS_BUCKET; // usually 'hls'
  let key = `${video}/${file}`; // ? Correct — no extra 'hls/' prefix

  // Ensure player can load segments cross-origin
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  try {
    // ? Handle master playlist
    if (file.endsWith(".m3u8")) {
      const stream = await minioClient.getObject(bucket, key);
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return stream.pipe(res);
    }

    // ? Handle .ts segments
    if (file.endsWith(".ts")) {
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Type", "video/mp2t");
      const stream = await minioClient.getObject(bucket, key);
      return stream.pipe(res);
    }

    // ? Any other file (fallback)
    const stream = await minioClient.getObject(bucket, key);
    stream.pipe(res);
  } catch (err) {
    console.error(`? Stream error: ${err.message} | key: ${key}`);
    res.status(404).send("Video segment not found");
  }
});
// -----------------------------------------------------
// ?? ADMIN DASHBOARD (Protected)
// -----------------------------------------------------
app.get("/admin", verifyToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM videos ORDER BY id DESC");

        let html = `
            <html><head><title>AirStream Admin</title>
            <style>
                body { font-family: Arial; background:#111; color:#eee; }
                table { width:90%; margin:2rem auto; border-collapse:collapse; }
                th,td { border:1px solid #444; padding:8px; text-align:left; }
                th { background:#222; }
                .queued { color:orange; }
                .ready { color:lightgreen; }
            </style></head><body>
            <h2 style="text-align:center;">?? AirStream Admin Dashboard</h2>
            <table><tr><th>ID</th><th>Filename</th><th>Status</th><th>Uploader</th><th>Created</th></tr>`;
        for (const v of result.rows) {
            html += `<tr>
                <td>${v.id}</td>
                <td>${v.filename}</td>
                <td class="${v.status}">${v.status}</td>
                <td>${v.uploader_email || "—"}</td>
                <td>${new Date(v.created_at).toLocaleString()}</td>
            </tr>`;
        }
        html += `</table></body></html>`;
        res.send(html);
    } catch (err) {
        res.status(500).send("Error loading admin panel: " + err.message);
    }
});


// -----------------------------------------------------
// ?? DRAFT ROUTES — Save, List, Delete, Update (No changes needed)
// -----------------------------------------------------
app.post("/api/drafts", verifyFirebaseToken, async (req, res) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

        const {
            title,
            description,
            tags,
            category,
            visibility,
            scheduleEnabled,
            scheduleDate,
            scheduleTime,
            thumbnailUrl,
        } = req.body;

        const result = await pool.query(
            `INSERT INTO video_drafts 
             (uploader_email, title, description, tags, category, visibility, 
              schedule_enabled, schedule_date, schedule_time, thumbnail_url)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             RETURNING *`,
            [
                userEmail,
                title || "",
                description || "",
                tags || "",
                category || "Entertainment",
                visibility || "Private",
                scheduleEnabled || false,
                scheduleDate || null,
                scheduleTime || null,
                thumbnailUrl || null,
            ]
        );

        res.json({ success: true, draft: result.rows[0] });
    } catch (err) {
        console.error("? Draft Save Error:", err);
        res.status(500).json({ error: "Failed to save draft" });
    }
});

app.get("/api/drafts", verifyFirebaseToken, async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const result = await pool.query(
            `SELECT * FROM video_drafts WHERE uploader_email=$1 ORDER BY updated_at DESC`,
            [userEmail]
        );
        res.json({ success: true, drafts: result.rows });
    } catch (err) {
        console.error("? Fetch Drafts Error:", err);
        res.status(500).json({ error: "Failed to load drafts" });
    }
});

app.delete("/api/drafts/:id", verifyFirebaseToken, async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM video_drafts WHERE id=$1 AND uploader_email=$2 RETURNING id",
            [id, userEmail]
        );

        if (result.rowCount === 0)
            return res.status(404).json({ error: "Draft not found" });

        res.json({ success: true });
    } catch (err) {
        console.error("? Delete Draft Error:", err);
        res.status(500).json({ error: "Failed to delete draft" });
    }
});

// -----------------------------------------------------
// ??? THUMBNAIL UPLOAD — Save to MinIO + Update Draft (No changes needed)
// -----------------------------------------------------
const thumbnailUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files allowed"));
        }
        cb(null, true);
    },
});

app.post("/api/thumbnails/:draftId", verifyFirebaseToken, thumbnailUpload.single("thumbnail"), async (req, res) => {
    try {
        const userEmail = req.user?.email;
        const { draftId } = req.params;

        if (!userEmail) return res.status(401).json({ error: "Unauthorized" });
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const fileName = `${Date.now()}_${req.file.originalname.replace(/\s+/g, "_")}`;
        const bucketName = "thumbnails";

        const exists = await minioClient.bucketExists(bucketName).catch(() => false);
        if (!exists) await minioClient.makeBucket(bucketName);

        await minioClient.putObject(bucketName, fileName, req.file.buffer, {
            "Content-Type": req.file.mimetype,
        });

        // NOTE: The frontend will need to be able to fetch this directly from MinIO
        // This URL should probably point to a proxy route on this service for consistency,
        // but using the direct MinIO endpoint is fine if its public facing.
        const publicUrl = `http://18.218.164.106:9000/${bucketName}/${fileName}`;

        await pool.query(
            "UPDATE video_drafts SET thumbnail_url=$1, updated_at=NOW() WHERE id=$2 AND uploader_email=$3",
            [publicUrl, draftId, userEmail]
        );

        res.json({ success: true, thumbnailUrl: publicUrl });
    } catch (err) {
        console.error("? Thumbnail Upload Error:", err);
        res.status(500).json({ error: "Failed to upload thumbnail" });
    }
});

// -----------------------------------------------------
// ? Serve thumbnails correctly from MinIO
// -----------------------------------------------------
app.get("/hls/thumbnails/:video/:file", async (req, res) => {
  try {
    const { video, file } = req.params;
    const bucket = "hls";
    const key = `thumbnails/${video}/${file}`;

    const stream = await minioClient.getObject(bucket, key);

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    stream.pipe(res);
  } catch (err) {
    console.error(`? Thumbnail stream error [${req.params.video}]:`, err.message);
    res.status(404).send("Thumbnail not found");
  }
});


// -----------------------------------------------------
// ?? HEALTH CHECK
// -----------------------------------------------------
app.get("/", (req, res) => {
    res.send(`
        <html><head><title>AirStream Upload Service</title>
          <style>
            body { font-family: Arial; background:#111; color:#eee; text-align:center; padding:40px; }
            a { color:#00e0ff; text-decoration:none; }
          </style></head><body>
          <h2>?? AirStream Upload Service is Running</h2>
          <ul style="list-style:none;line-height:1.8;">
            <li>? <a href="/videos">/videos</a> — **Public video list (New!)**</li>
            <li>?? /upload — Upload (Auth required)</li>
            <li>?? <a href="/admin">/admin</a> — Admin dashboard</li>
            <li>?? /api/auth/login — Company login</li>
            <li>?? /api/auth/signup — Company signup</li>
            <li>?? /api/drafts — Save video drafts</li>
            <li>??? /api/thumbnails/:draftId — Upload thumbnails</li>
          </ul>
          </body></html>
    `);
});

// -----------------------------------------------------
// ?? START SERVER
// -----------------------------------------------------
app.listen(5000, "0.0.0.0", () => {
    console.log("? AirStream Upload Service running at http://18.218.164.106:5000");
});
