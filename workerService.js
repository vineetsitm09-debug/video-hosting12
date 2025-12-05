// worker.js — Production-grade HLS Pipeline (Master Playlist + Multi-Quality + Thumbnails)
// ----------------------------------------------------------------------------------------
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import { exec as execCb } from "child_process";
import { Worker } from "bullmq";
import { Client as MinioClient } from "minio";
import { pool } from "./db.js";

const exec = promisify(execCb);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========= Config =========
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);

const API_HOST = process.env.API_HOST || "18.218.164.106";
const API_PORT = parseInt(process.env.API_PORT || "5000", 10);

// MinIO
const MINIO_ENDPOINT   = process.env.MINIO_ENDPOINT   || "18.218.164.106";
const MINIO_API_PORT   = parseInt(process.env.MINIO_API_PORT || "9000", 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || "admin";
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || "password123";
const MINIO_BUCKET     = process.env.MINIO_BUCKET     || "hls";

// Local temp roots
const HLS_ROOT    = path.join(__dirname, "hls");
const THUMBS_ROOT = path.join(__dirname, "thumbnails");
for (const d of [HLS_ROOT, THUMBS_ROOT]) fs.mkdirSync(d, { recursive: true });

// Renditions (kbps numbers ? we convert to bits/sec for master.m3u8)
const RENDITIONS = [
  { name: "240p",  size: "426x240",   vKbps: 400,  aKbps: 96,  maxrateKbps: 500,  bufKbps: 800  },
  { name: "480p",  size: "854x480",   vKbps: 800,  aKbps: 96,  maxrateKbps: 950,  bufKbps: 1200 },
  { name: "720p",  size: "1280x720",  vKbps: 1500, aKbps: 128, maxrateKbps: 1800, bufKbps: 3000 },
  { name: "1080p", size: "1920x1080", vKbps: 3000, aKbps: 128, maxrateKbps: 3500, bufKbps: 5000 },
];

// ========= MinIO =========
const minio = new MinioClient({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_API_PORT,
  useSSL: false,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

async function ensureBucket(bucket) {
  const exists = await minio.bucketExists(bucket).catch(() => false);
  if (!exists) {
    await minio.makeBucket(bucket);
    console.log(`[WORKER] Bucket created: ${bucket}`);
  } else {
    console.log(`[WORKER] Bucket exists: ${bucket}`);
  }
}
await ensureBucket(MINIO_BUCKET);

// ========= Helpers =========
const log   = (...a) => console.log("[WORKER]", ...a);
const error = (...a) => console.error("[WORKER]", ...a);

const sh = (p) => `"${String(p).replace(/(["$` + "`" + `\\])/g, "\\$1")}"`;

async function uploadWithRetry(localPath, remoteKey, tries = 3, meta = {}) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      await minio.fPutObject(MINIO_BUCKET, remoteKey, localPath, meta);
      log(`? uploaded: ${remoteKey}`);
      return;
    } catch (e) {
      error(`upload fail ${remoteKey} (${attempt}/${tries}): ${e.message}`);
      if (attempt === tries) throw e;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

async function uploadFolderRecursive(localDir, prefix) {
  const items = fs.readdirSync(localDir);
  for (const name of items) {
    const full = path.join(localDir, name);
    const relKey = `${prefix}/${name}`;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      await uploadFolderRecursive(full, relKey);
    } else {
      const meta =
        name.endsWith(".m3u8")
          ? { "Content-Type": "application/vnd.apple.mpegurl" }
          : name.endsWith(".ts")
          ? { "Content-Type": "video/mp2t" }
          : {};
      await uploadWithRetry(full, relKey, 3, meta);
    }
  }
}

async function runFFmpeg(cmd) {
  try {
    log(`FFmpeg: ${cmd.replace(/\s+/g, " ").trim()}`);
    const { stdout, stderr } = await exec(cmd);
    if (stdout?.trim()) log(`ffmpeg out: ${stdout.trim().slice(0, 400)}...`);
    if (stderr?.trim()) log(`ffmpeg err: ${stderr.trim().slice(0, 400)}...`);
  } catch (e) {
    error(`FFmpeg failed: ${e.stderr || e.message}`);
    throw e;
  }
}

const stripExt = (s = "") => s.replace(/\.[^/.]+$/, "");

// ========= Worker =========
log(`Started — waiting for jobs (Redis: ${REDIS_HOST}:${REDIS_PORT})`);

new Worker(
  "video-processing",
  async (job) => {
    const startedAt = Date.now();
    const { filePath, fileName } = job.data;

    // folder key in MinIO (baseName is Multer's stored filename w/o extension)
    const baseName  = stripExt(fileName);

    // per-job temp dirs
    const hlsDir    = path.join(HLS_ROOT,    baseName);
    const thumbsDir = path.join(THUMBS_ROOT, baseName);
    fs.mkdirSync(hlsDir, { recursive: true });
    fs.mkdirSync(thumbsDir, { recursive: true });

    log(`Job ${job.id} — file: ${fileName} ? base: ${baseName}`);

    try {
      const inPath = sh(filePath);

      // 1) Create each rendition (playlist + segments)
      //    GOP/keyframe every ~2s; segment duration 4s (tune as you like)
      for (const r of RENDITIONS) {
        const outPlaylist = sh(path.join(hlsDir, `${r.name}.m3u8`));
        const segPattern  = sh(path.join(hlsDir, `${r.name}_%03d.ts`));

        log(`Encode ${r.name} @ ${r.size} (${r.vKbps}k video / ${r.aKbps}k audio)`);
        await runFFmpeg(`
          ffmpeg -y -i ${inPath} \
          -vf scale=${r.size} -c:v h264 -profile:v main -preset veryfast \
          -b:v ${r.vKbps}k -maxrate ${r.maxrateKbps}k -bufsize ${r.bufKbps}k -sc_threshold 0 \
          -g 48 -keyint_min 48 \
          -c:a aac -b:a ${r.aKbps}k -ar 48000 -ac 2 \
          -hls_time 4 -hls_playlist_type vod -hls_flags independent_segments \
          -hls_segment_filename ${segPattern} -f hls ${outPlaylist}
        `);
      }

      // 2) Master playlist that references all variants
      const masterPath = path.join(hlsDir, "master.m3u8");
      const masterLines = [
        "#EXTM3U",
        "#EXT-X-VERSION:3",
        // Optional: add CODECS if you want; not strictly required by hls.js
        ...RENDITIONS.map(r => {
          const bandwidthBits = (r.vKbps + r.aKbps) * 1000; // kbps -> bits/s
          return `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidthBits},RESOLUTION=${r.size}
${r.name}.m3u8`;
        }),
      ];
      fs.writeFileSync(masterPath, masterLines.join("\n"));
      log(`? master.m3u8 created`);

      // 3) Thumbnails (every 5s, cap to ~60 frames to keep small)
      const thumbsPattern = sh(path.join(thumbsDir, "thumb_%04d.jpg"));
      await runFFmpeg(`ffmpeg -y -i ${inPath} -vf "fps=1/5,select='lte(n,60)'" ${thumbsPattern}`);
      log(`? thumbnails generated`);

      // 4) Upload to MinIO
      log("Uploading HLS …");
      await uploadFolderRecursive(hlsDir, baseName);
      // Ensure master last (idempotent)
      await uploadWithRetry(masterPath, `${baseName}/master.m3u8`, 3, {
        "Content-Type": "application/vnd.apple.mpegurl",
      });
      log("Uploading thumbnails …");
      await uploadFolderRecursive(thumbsDir, `thumbnails/${baseName}`);

      // 5) Update DB with playable URL + thumbs base
      const videoUrl   = `http://${API_HOST}:${API_PORT}/hls/${baseName}/master.m3u8`;
      const thumbsBase = `http://${API_HOST}:${API_PORT}/hls/thumbnails/${baseName}`;
      await pool.query(
        `UPDATE videos SET status=$1, video_url=$2, thumbnails_base=$3, updated_at=NOW() WHERE filename=$4`,
        ["ready", videoUrl, thumbsBase, fileName]
      );
      log(`? DB updated ? ${videoUrl}`);

      // 6) Cleanup
      try {
        fs.rmSync(hlsDir, { recursive: true, force: true });
        fs.rmSync(thumbsDir, { recursive: true, force: true });
        fs.unlinkSync(filePath);
      } catch (e) {
        error(`cleanup warning: ${e.message}`);
      }

      log(`Job ${job.id} — complete in ${Math.round((Date.now() - startedAt)/1000)}s`);
    } catch (e) {
      error(`Job ${job.id} failed: ${e.message}`);
      await pool.query(`UPDATE videos SET status='error', updated_at=NOW() WHERE filename=$1`, [fileName]);
      throw e;
    }
  },
  { connection: { host: REDIS_HOST, port: REDIS_PORT } }
)
.on("failed", (job, err) => error(`BullMQ failed job ${job?.id}: ${err?.message}`))
.on("completed", (job) => log(`BullMQ completed job ${job.id}`));
