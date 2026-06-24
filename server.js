const express = require('express');
const app = express();

app.get('/watch', async (req, res) => {
  const videoId = req.query.v;

  if (!videoId) {
    return res.redirect('/');
  }

  try {
    const response = await fetch(
      `https://backend.airstreamx.com/videos/${videoId}`
    );
    const data = await response.json();

    if (!data.success || !data.video) {
      return res.redirect('/');
    }

    const video = data.video;
    const thumbnail = video.thumbnail || 'https://airstreamx.com/og-image.png';
    const videoUrl = `https://www.airstreamx.com/watch?v=${videoId}`;

    const html = `<!DOCTYPE html>
<html>
<head>
<title>${video.title} - AirStreamX</title>
<meta charset="UTF-8">
<meta property="og:title" content="${video.title}">
<meta property="og:description" content="${video.description || 'Watch on AirStreamX'}">
<meta property="og:image" content="${thumbnail}">
<meta property="og:url" content="${videoUrl}">
<meta property="og:type" content="video.other">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${video.title}">
<meta name="twitter:image" content="${thumbnail}">
<link rel="canonical" href="${videoUrl}">
<script>window.location.replace('${videoUrl}');</script>
</head>
<body>Loading...</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error:', error);
    res.redirect('/');
  }
});

// Serve Vite dist folder
app.use(express.static('dist'));
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/dist/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));