import React, { useEffect, useRef, useState } from 'react';
import styles from './VideoTile.module.css';

export default function VideoTile({
  stream, name, muted = false,
  audioOn = true, videoOn = true,
  isLocal = false, handRaised = false, small = false
}) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      // Always set srcObject fresh
      video.srcObject = stream;
      const tryPlay = () => {
        video.play()
          .then(() => setPlaying(true))
          .catch(err => {
            // Autoplay blocked - try muted first then unmute
            if (!video.muted) {
              video.muted = true;
              video.play().then(() => {
                setPlaying(true);
                if (!isLocal) {
                  // Try to unmute after a short delay
                  setTimeout(() => { video.muted = false; }, 500);
                }
              }).catch(e => console.warn('[VideoTile] play failed:', e));
            }
          });
      };
      // Small delay to let stream stabilize
      const timer = setTimeout(tryPlay, 100);
      return () => clearTimeout(timer);
    } else {
      video.srcObject = null;
      setPlaying(false);
    }
  }, [stream, isLocal]);

  // Re-play when tracks are added
  useEffect(() => {
    if (!stream || !videoRef.current) return;
    const onAddTrack = () => {
      videoRef.current.srcObject = new MediaStream(stream.getTracks());
      videoRef.current.play().catch(() => {});
    };
    stream.addEventListener('addtrack', onAddTrack);
    return () => stream.removeEventListener('addtrack', onAddTrack);
  }, [stream]);

  const hasVideoTrack = stream && stream.getVideoTracks().length > 0;
  const showVideo = hasVideoTrack && videoOn;
  const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={`${styles.tile} ${small ? styles.small : ''}`} style={{ position: 'relative', overflow: 'hidden', background: '#1a1a2e', borderRadius: 12 }}>
      {/* Always render video - show/hide via CSS */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted || isLocal}
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover',
          display: showVideo ? 'block' : 'none',
          transform: isLocal ? 'scaleX(-1)' : 'none', // mirror local video
        }}
      />

      {/* Avatar fallback when no video */}
      {!showVideo && (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(139,92,246,0.4)', border: '2px solid rgba(139,92,246,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 22, fontWeight: 700,
          }}>
            {initials}
          </div>
        </div>
      )}

      {/* Name label */}
      <div style={{
        position: 'absolute', bottom: 8, left: 10,
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(0,0,0,0.55)', borderRadius: 6,
        padding: '2px 8px', fontSize: 12, color: 'white', fontWeight: 500,
      }}>
        {!audioOn && <span>🔇</span>}
        {handRaised && <span>✋</span>}
        <span>{name}{isLocal ? ' (you)' : ''}</span>
      </div>
    </div>
  );
}
