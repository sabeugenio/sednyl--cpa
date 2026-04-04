import React, { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';
import PlaylistModal from './PlaylistModal';
import { fetchPlaylists, savePlaylist, deletePlaylist, setActivePlaylist } from '../utils/api';

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
  const [autoplay, setAutoplay] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Playlist State
  const [playlists, setPlaylists] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [savePromptPending, setSavePromptPending] = useState(null);
  const [playlistTitleInput, setPlaylistTitleInput] = useState('');

  // Load playlists on mount
  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const data = await fetchPlaylists();
      setPlaylists(data);
      
      // Auto-load active playlist (paused) if not already playing something
      if (!activeVideoId) {
        const active = data.find(p => p.is_active === 1);
        if (active) {
          setActiveVideoId(active.video_id);
          setAutoplay(0); // Load paused
        }
      }
    } catch (err) {
      console.error('Failed to load playlists:', err);
    }
  };

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

  // When user pastes a URL and hits Play
  const handleUrlSubmit = () => {
    const videoId = extractVideoId(urlInput.trim());
    if (videoId) {
      // Don't play immediately, show prompt first
      setSavePromptPending({ video_id: videoId, type: 'url' });
      setPlaylistTitleInput('Saved Video/Playlist'); // Default title
      setShowUrlInput(false);
      setError(null);
    } else {
      setError('Invalid YouTube URL');
    }
  };

  // From Search Results
  const handleSelectSearchResult = (video) => {
    setSavePromptPending({ 
      video_id: video.id, 
      type: 'search',
      title: video.title,
      thumbnail: video.thumbnail,
      channel: video.channel
    });
    setPlaylistTitleInput(video.title); // Pre-fill with yt title
  };

  // Handle the Prompt choices
  const handleSaveAndPlay = async () => {
    if (!savePromptPending) return;
    
    try {
      const newPlaylist = await savePlaylist({
        video_id: savePromptPending.video_id,
        title: playlistTitleInput || 'Saved Video',
        thumbnail: savePromptPending.thumbnail || '',
        channel: savePromptPending.channel || ''
      });
      // Set as active
      await setActivePlaylist(newPlaylist.id);
      await loadPlaylists(); // Refresh
      
      // Play
      setActiveVideoId(savePromptPending.video_id);
      setAutoplay(1);
      setUrlInput('');
      setSavePromptPending(null);
    } catch (err) {
      console.error('Failed to save playlist:', err);
      setError('Failed to save to library.');
    }
  };

  const handleJustPlay = () => {
    if (!savePromptPending) return;
    setActiveVideoId(savePromptPending.video_id);
    setAutoplay(1);
    setUrlInput('');
    setSavePromptPending(null);
  };

  // Library actions
  const handleSelectFromLibrary = async (playlist) => {
    setActiveVideoId(playlist.video_id);
    setAutoplay(1);
    setShowModal(false);
    await setActivePlaylist(playlist.id);
    loadPlaylists(); // Refresh to show new active status
  };

  const handleDeletePlaylist = async (id) => {
    await deletePlaylist(id);
    loadPlaylists();
  };

  const handleClosePlayer = () => {
    setActiveVideoId(null);
  };

  return (
    <div className={`yt-widget ${collapsed ? 'yt-widget-is-collapsed' : ''}`} style={collapsed ? { padding: 0 } : {}}>
      {collapsed && (
        <div className="yt-widget-collapsed" onClick={() => setCollapsed(false)}>
          <span className="yt-collapsed-icon">▶</span>
          <span className="yt-collapsed-label">
            YouTube Study Videos {activeVideoId ? (isPlaying ? '(Playing)' : '(Paused)') : ''}
          </span>
        </div>
      )}

      <div style={{ display: collapsed ? 'none' : 'block' }}>
        <div className="yt-header">
          <div className="yt-header-left">
            <span className="yt-icon">▶</span>
          <span className="yt-title">Study Videos</span>
        </div>
        <div className="yt-header-right">
          <button
            className="yt-header-btn"
            onClick={() => setShowModal(true)}
            title="Your Library"
          >
            📚
          </button>
          <button
            className="yt-header-btn"
            onClick={() => { setShowUrlInput(!showUrlInput); setSavePromptPending(null); }}
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

      {/* Save Prompt (intercepts playing) */}
      {savePromptPending && (
        <div className="yt-save-prompt">
          <p className="yt-save-message">Save this video to your library?</p>
          <input
            type="text"
            className="yt-url-input"
            value={playlistTitleInput}
            onChange={(e) => setPlaylistTitleInput(e.target.value)}
            placeholder="Give it a title (e.g., FAR Prep Playlist)"
            autoFocus
          />
          <div className="yt-save-actions">
            <button className="yt-btn-primary" onClick={handleSaveAndPlay}>
              Save & Play
            </button>
            <button className="yt-btn-secondary" onClick={handleJustPlay}>
              Just Play
            </button>
            <button className="yt-btn-ghost" onClick={() => setSavePromptPending(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Paste URL */}
      {showUrlInput && !savePromptPending && (
        <div className="yt-url-bar">
          <input
            type="text"
            className="yt-url-input"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste YouTube URL here…"
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            autoFocus
          />
          <button className="yt-url-play" onClick={handleUrlSubmit}>
            Play
          </button>
        </div>
      )}

      {/* Search */}
      {!savePromptPending && (
        <form className="yt-search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            className="yt-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search study videos or lofi music…"
          />
          {query && (
            <button 
              type="button" 
              className="yt-search-btn" 
              onClick={() => { setQuery(''); setResults([]); setError(null); }}
              title="Clear Search"
            >
              ✕
            </button>
          )}
          <button type="submit" className="yt-search-btn" disabled={isSearching || !query.trim()}>
            {isSearching ? '…' : '🔍'}
          </button>
        </form>
      )}

      {/* Active Player */}
      {activeVideoId && !savePromptPending && (
        <div className="yt-player-wrap">
          <div className="yt-player-container yt-react-player">
            <YouTube
              videoId={activeVideoId}
              opts={{
                width: '100%',
                height: '100%',
                playerVars: {
                  autoplay: autoplay,
                  rel: 0
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnd={() => setIsPlaying(false)}
            />
          </div>
          <button className="yt-close-player" onClick={handleClosePlayer}>
            ✕ Close Player
          </button>
        </div>
      )}

      {error && <div className="yt-error">{error}</div>}

      {/* Results */}
      {results.length > 0 && !savePromptPending && (
        <div className="yt-results">
          {results.map((video) => (
            <button
              key={video.id}
              className={`yt-result-item ${activeVideoId === video.id ? 'active' : ''}`}
              onClick={() => handleSelectSearchResult(video)}
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
      {results.length === 0 && !activeVideoId && !error && !savePromptPending && (
        <div className="yt-empty">
          Search for CPA review videos or paste a YouTube URL
        </div>
      )}

      {showModal && (
        <PlaylistModal
          playlists={playlists}
          onClose={() => setShowModal(false)}
          onSelect={handleSelectFromLibrary}
          onDelete={handleDeletePlaylist}
        />
      )}
      </div>
    </div>
  );
}
