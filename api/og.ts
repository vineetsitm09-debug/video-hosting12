export default async function handler(req, res) {
  try {
    const videoId = req.query.videoId;

    if (!videoId) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(302).redirect('https://www.airstreamx.com');
    }

    const response = await fetch(
      `https://backend.airstreamx.com/videos/${videoId}`
    );
    const data = await response.json();

    if (!data.success || !data.video) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(302).redirect('https://www.airstreamx.com');
    }

    const video = data.video;
    const thumbnail = video.thumbnail || 'https://airstreamx.com/og-image.png';
    const videoUrl = `https://www.airstreamx.com/watch?v=${videoId}`;

    const html = `<!DOCTYPE html>
<html>
<head>
<title>${video.title} - AirStreamX</title>
<meta charset="UTF-8">
<meta name="description" content="${video.description || 'Watch on AirStreamX'}">
<meta property="og:title" content="${video.title}">
<meta property="og:description" content="${video.description || 'Watch on AirStreamX'}">
<meta property="og:image" content="${thumbnail}">
<meta property="og:url" content="${videoUrl}">
<meta property="og:type" content="video.other">
<meta property="og:site_name" content="AirStreamX">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${video.title}">
<meta name="twitter:image" content="${thumbnail}">
<link rel="canonical" href="${videoUrl}">
<script>window.location.replace('${videoUrl}');</script>
</head>
<body>Loading...</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error:', error);
    res.setHeader('Content-Type', 'text/html');
    res.status(302).redirect('https://www.airstreamx.com');
  }
}