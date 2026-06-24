import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface VideoData {
  id: number;
  title: string;
  description?: string;
  thumbnail?: string;
  channel_name?: string;
}

export default function VideoMetaTags() {
  const [searchParams] = useSearchParams();
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔵 VideoMetaTags mounted');
    
    const videoId = searchParams.get('v');
    
    console.log('🎬 Video ID from URL:', videoId);

    if (!videoId) {
      console.log('⚠️ No video ID in URL');
      setLoading(false);
      return;
    }

    // ✅ CORRECT ENDPOINT
    const fetchUrl = `https://backend.airstreamx.com/videos/${videoId}`;
    console.log('📡 Fetching from:', fetchUrl);

    fetch(fetchUrl)
      .then(res => {
        console.log('📥 Response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('✅ Full response:', data);
        
        // ✅ EXTRACT FROM data.video
        if (data.success && data.video) {
          console.log('✅ Video data extracted:', data.video);
          setVideoData(data.video);
        } else {
          console.error('❌ Invalid response structure');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('❌ Error fetching video:', err);
        setLoading(false);
      });
  }, [searchParams]);

  if (loading) return null;

  if (!videoData) {
    return (
      <Helmet>
        <title>AirstreamX — Free Video Streaming Platform India</title>
        <meta name="description" content="Join AirStreamX, the next-generation AI-powered video streaming platform." />
      </Helmet>
    );
  }

  // ✅ USE CORRECT FIELD NAMES
  const videoUrl = `https://www.airstreamx.com/watch?v=${videoData.id}`;
  const thumbnail = videoData.thumbnail || 'https://airstreamx.com/og-image.png';
  const title = videoData.title || 'Untitled Video';
  const description = videoData.description || `Watch ${title} on AirstreamX`;

  console.log('🎥 Setting video meta tags:');
  console.log('  Title:', title);
  console.log('  URL:', videoUrl);
  console.log('  Thumbnail:', thumbnail);
  console.log('  Description:', description);

  return (
    <Helmet>
      {/* ========== TITLE & DESCRIPTION ========== */}
      <title>{title} - AirstreamX</title>
      <meta name="description" content={description} />
      
      {/* ========== OPEN GRAPH (Facebook/LinkedIn) ========== */}
      <meta property="og:type" content="video.other" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={thumbnail} />
      <meta property="og:url" content={videoUrl} />
      <meta property="og:site_name" content="AirstreamX" />
      
      {/* ========== TWITTER/X ========== */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={thumbnail} />
      <meta name="twitter:site" content="@airstreamx" />
      
      {/* ========== CANONICAL URL ========== */}
      <link rel="canonical" href={videoUrl} />
    </Helmet>
  );
}