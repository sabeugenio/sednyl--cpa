import React, { useState, useRef } from 'react';

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

function extractVideoId(url) {
  if (!url) return null;
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function YouTubeWidget() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const searchTimerRef = useRef(null);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=6&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`
      );
      if (!res.ok) throw new Error('YouTube API error');
      const data = await res.json();
      setResults(
        (data.items || []).map((item) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium.url,
          channel: item.snippet.channelTitle,
        }))
      );
    } catch (err) {
      console.error('YouTube search failed:', err);
      setError('Search failed. Check your API key.');
    }
    setIsSearching(false);
  };

  const handlePlayUrl = () => {
    const videoId = extractVideoId(urlInput.trim());
    if (videoId) {
      setActiveVideoId(videoId);
      setShowUrlInput(false);
      setUrlInput('');
      setError(null);
    } else {
      setError('Invalid YouTube URL');
    }
  };

  const handleSelectVideo = (videoId) => {
    setActiveVideoId(videoId);
  };

  const handleClosePlayer = () => {
    setActiveVideoId(null);
  };

  if (collapsed) {
    return (
      <div className="yt-widget yt-widget-collapsed" onClick={() => setCollapsed(false)}>
        <span className="yt-collapsed-icon">▶</span>
        <span className="yt-collapsed-label">YouTube Study Videos</span>
      </div>
    );
  }

  return (
    <div className="yt-widget">
      <div className="yt-header">
        <div className="yt-header-left">
          <span className="yt-icon">▶</span>
          <span className="yt-title">Study Videos</span>
        </div>
        <div className="yt-header-right">
          <button
            className="yt-header-btn"
            onClick={() => setShowUrlInput(!showUrlInput)}
            title="Paste YouTube URL"
          >
            🔗
          </button>
          <button
            className="yt-header-btn"
            onClick={() => setCollapsed(true)}
            title="Minimize"
          >
            —
          </button>
        </div>
      </div>

      {/* Active Player */}
      {activeVideoId && (
        <div className="yt-player-wrap">
          <div className="yt-player-container">
            <iframe
              src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <button className="yt-close-player" onClick={handleClosePlayer}>
            ✕ Close Player
          </button>
        </div>
      )}

      {/* Paste URL */}
      {showUrlInput && (
        <div className="yt-url-bar">
          <input
            type="text"
            className="yt-url-input"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste YouTube URL here…"
            onKeyDown={(e) => e.key === 'Enter' && handlePlayUrl()}
          />
          <button className="yt-url-play" onClick={handlePlayUrl}>
            Play
          </button>
        </div>
      )}

      {/* Search */}
      <form className="yt-search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          className="yt-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search study videos or lofi music…"
        />
        <button type="submit" className="yt-search-btn" disabled={isSearching}>
          {isSearching ? '…' : '🔍'}
        </button>
      </form>

      {error && <div className="yt-error">{error}</div>}

      {/* Results */}
      {results.length > 0 && (
        <div className="yt-results">
          {results.map((video) => (
            <button
              key={video.id}
              className={`yt-result-item ${activeVideoId === video.id ? 'active' : ''}`}
              onClick={() => handleSelectVideo(video.id)}
            >
              <img src={video.thumbnail} alt="" className="yt-thumb" />
              <div className="yt-result-info">
                <span className="yt-result-title" dangerouslySetInnerHTML={{ __html: video.title }} />
                <span className="yt-result-channel">{video.channel}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !activeVideoId && !error && (
        <div className="yt-empty">
          Search for CPA review videos or paste a YouTube URL
        </div>
      )}
    </div>
  );
}
