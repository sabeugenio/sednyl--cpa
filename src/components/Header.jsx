import React from 'react';
import { GraduationCap } from 'lucide-react';

export default function Header() {
  return (
    <header className="header" style={{ position: 'relative' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <GraduationCap size={28} style={{ color: 'var(--primary)' }} />
        Sednyl Andrie Balingit Eugenio, CPA
      </h1>
      <p className="subtitle">Consistency over intensity</p>
    </header>
  );
}
