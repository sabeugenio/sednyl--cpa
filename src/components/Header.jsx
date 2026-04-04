import React from 'react';
import { LogOut } from 'lucide-react';

export default function Header({ user, onLogout }) {
  const fullName = user?.user_metadata?.full_name || 'CPA Student';

  return (
    <header className="header" style={{ position: 'relative' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        {fullName}, CPA
      </h1>
      <p className="subtitle">Consistency over intensity</p>

      {onLogout && (
        <button
          className="header-logout-btn"
          onClick={onLogout}
          title="Sign out"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      )}
    </header>
  );
}
