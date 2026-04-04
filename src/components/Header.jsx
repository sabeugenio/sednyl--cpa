import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, User, Settings } from 'lucide-react';
import EditProfileModal from './EditProfileModal';

export default function Header({ user, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  // Add local state for full_name to immediately reflect updates without waiting for re-auth
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || 'CPA Student');
  const dropdownRef = useRef(null);

  // Sync state if user prop changes
  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleUpdateProfile = (updatedUser) => {
    if (updatedUser?.user_metadata?.full_name) {
      setFullName(updatedUser.user_metadata.full_name);
    }
  };

  return (
    <header className="header" style={{ position: 'relative' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        {fullName}, CPA
      </h1>
      <p className="subtitle">Consistency over intensity</p>

      {onLogout && (
        <div className="header-profile-dropdown" ref={dropdownRef}>
          <button
            className="header-profile-btn"
            onClick={toggleDropdown}
            title="Profile"
          >
            <User size={16} />
            <span className="profile-btn-text">Profile</span>
            <ChevronDown size={14} className={`dropdown-chevron ${dropdownOpen ? 'open' : ''}`} />
          </button>
          
          {dropdownOpen && (
            <div className="profile-dropdown-menu">
              <button
                className="dropdown-item"
                onClick={() => {
                  setShowEditProfile(true);
                  setDropdownOpen(false);
                }}
              >
                <Settings size={14} />
                <span>Edit Profile</span>
              </button>
              <button
                className="dropdown-item text-danger"
                onClick={() => {
                  setDropdownOpen(false);
                  onLogout();
                }}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}

      {showEditProfile && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditProfile(false)}
          onUpdate={handleUpdateProfile}
        />
      )}
    </header>
  );
}
