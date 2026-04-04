import React from 'react';

export default function PlaylistModal({ playlists, onClose, onSelect, onDelete }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content yt-playlist-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Your Study Library</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {playlists.length === 0 ? (
            <div className="yt-empty" style={{ border: 'none', padding: '3rem 1rem' }}>
              You haven't saved any playlists or videos yet.
            </div>
          ) : (
            <div className="yt-playlist-list">
              {playlists.map((playlist) => (
                <div key={playlist.id} className={`yt-playlist-item ${playlist.is_active ? 'active-playlist' : ''}`}>
                  <button className="yt-playlist-play-btn" onClick={() => onSelect(playlist)}>
                    {playlist.thumbnail ? (
                      <img src={playlist.thumbnail} alt="" className="yt-playlist-thumb" />
                    ) : (
                      <div className="yt-playlist-thumb-placeholder">▶</div>
                    )}
                    <div className="yt-playlist-info">
                      <span className="yt-playlist-title">{playlist.title}</span>
                      {playlist.channel && (
                        <span className="yt-playlist-channel">{playlist.channel}</span>
                      )}
                      {playlist.is_active === 1 && (
                        <span className="yt-playlist-badge">Last Played</span>
                      )}
                    </div>
                  </button>
                  <button 
                    className="yt-playlist-delete"
                    onClick={() => onDelete(playlist.id)}
                    title="Remove from library"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
