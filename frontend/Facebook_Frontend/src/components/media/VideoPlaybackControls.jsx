import { useEffect, useMemo, useState } from 'react';
import { Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import './VideoPlaybackControls.css';

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = String(totalSeconds % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${remainingSeconds}`
    : `${minutes}:${remainingSeconds}`;
};

const getMediaDuration = (video) => {
  if (Number.isFinite(video?.duration) && video.duration > 0) return video.duration;
  if (video?.seekable?.length) {
    const seekableEnd = video.seekable.end(video.seekable.length - 1);
    if (Number.isFinite(seekableEnd) && seekableEnd > 0) return seekableEnd;
  }
  return 0;
};

const VideoPlaybackControls = ({ videoRef, containerRef, sourceKey, autoPlay = true, label = 'video' }) => {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const syncPlayback = () => {
      setPlaying(!video.paused && !video.ended);
      setCurrentTime(Number.isFinite(video.currentTime) ? video.currentTime : 0);
      const nextDuration = getMediaDuration(video);
      if (nextDuration > 0) setDuration(nextDuration);
    };
    const resetPlayback = () => {
      setCurrentTime(0);
      setDuration(0);
      setPlaying(false);
    };
    const toggleFromVideo = () => {
      if (video.paused) video.play().catch(() => setPlaying(false));
      else video.pause();
    };

    ['loadedmetadata', 'durationchange', 'canplay', 'progress', 'timeupdate', 'play', 'pause', 'ended']
      .forEach((eventName) => video.addEventListener(eventName, syncPlayback));
    video.addEventListener('emptied', resetPlayback);
    video.addEventListener('click', toggleFromVideo);

    video.load();
    if (autoPlay) video.play().catch(() => setPlaying(false));
    syncPlayback();

    return () => {
      ['loadedmetadata', 'durationchange', 'canplay', 'progress', 'timeupdate', 'play', 'pause', 'ended']
        .forEach((eventName) => video.removeEventListener(eventName, syncPlayback));
      video.removeEventListener('emptied', resetPlayback);
      video.removeEventListener('click', toggleFromVideo);
    };
  }, [autoPlay, sourceKey, videoRef]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, videoRef]);

  const progress = useMemo(
    () => (duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0),
    [currentTime, duration],
  );

  const togglePlayback = (event) => {
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => setPlaying(false));
    else video.pause();
  };

  const seek = (event) => {
    event.stopPropagation();
    const video = videoRef.current;
    const nextTime = Number(event.target.value);
    if (!video || !Number.isFinite(nextTime)) return;
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const toggleMute = (event) => {
    event.stopPropagation();
    setMuted((value) => !value);
  };

  const enterFullscreen = (event) => {
    event.stopPropagation();
    (containerRef?.current || videoRef.current)?.requestFullscreen?.();
  };

  return (
    <>
      {!playing && (
        <button type="button" className="video-playback-center" onClick={togglePlayback} aria-label={`Phát ${label}`}>
          <Play size={34} fill="currentColor" />
        </button>
      )}

      <div className="video-playback-controls" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={togglePlayback} aria-label={playing ? `Tạm dừng ${label}` : `Phát ${label}`}>
          {playing ? <Pause size={19} /> : <Play size={19} fill="currentColor" />}
        </button>

        <span className="video-playback-time" aria-label="Thời gian đã phát">{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={Math.min(currentTime, duration || 0)}
          onChange={seek}
          disabled={duration <= 0}
          aria-label={`Tiến trình phát ${label}`}
          style={{ '--video-progress': `${progress}%` }}
        />
        <span className="video-playback-time video-playback-duration" aria-label="Tổng thời lượng">{formatTime(duration)}</span>

        <button type="button" onClick={toggleMute} aria-label={muted ? `Bật tiếng ${label}` : `Tắt tiếng ${label}`}>
          {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
        <button type="button" onClick={enterFullscreen} aria-label={`Toàn màn hình ${label}`}>
          <Maximize2 size={19} />
        </button>
      </div>
    </>
  );
};

export default VideoPlaybackControls;
