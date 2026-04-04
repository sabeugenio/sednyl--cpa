import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronRight, ChevronDown } from 'lucide-react';

const PHASES = [
  { phase: 1, main: 'FAR', mainFull: 'Financial Accounting & Reporting', light: 'RFBT', lightFull: 'Law' },
  { phase: 2, main: 'AFAR', mainFull: 'Advanced Financial Accounting & Reporting', light: 'AUDITING', lightFull: 'Auditing' },
  { phase: 3, main: 'TAXATION', mainFull: 'Taxation', light: 'MAS', lightFull: 'Management Advisory Services' },
];

const LOW_ENERGY_MESSAGES = [
  "Low energy? Do your light subject or just 5 minutes.",
  "Showing up is enough.",
  "Even a small step forward counts.",
];

export default function StudyGuidance({ currentPhase, onPhaseChange }) {
  const phaseIndex = Math.max(0, Math.min(2, (parseInt(currentPhase) || 1) - 1));
  const phase = PHASES[phaseIndex];

  const [showTip, setShowTip] = useState(false);

  const handleNextPhase = () => {
    const next = phaseIndex < 2 ? phaseIndex + 2 : 1; // wrap to 1
    onPhaseChange(next);
  };

  const randomTip = LOW_ENERGY_MESSAGES[Math.floor(Math.random() * LOW_ENERGY_MESSAGES.length)];

  return (
    <div className="study-guidance">
      <h3>Current Focus</h3>

      <div className="phase-badge">Phase {phase.phase}</div>

      <div className="subject-row main-subject">
        <span className="subject-type">Main</span>
        <span className="subject-name">{phase.main}</span>
      </div>
      <div className="subject-desc">{phase.mainFull}</div>

      <div className="subject-row light-subject">
        <span className="subject-type">Light</span>
        <span className="subject-name">{phase.light}</span>
      </div>
      <div className="subject-desc">{phase.lightFull}</div>

      <div className="guidance-tips">
        <p className="guidance-tip">Focus more time on Main subject (70–80%)</p>
        <p className="guidance-tip">Use Light subject for low-energy days</p>
      </div>

      <button className="phase-next-btn" onClick={handleNextPhase} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
        {phaseIndex < 2 ? 'Move to Next Phase' : 'Back to Phase 1'} <ArrowRight size={16} />
      </button>

      <button
        className="low-energy-toggle"
        onClick={() => setShowTip(!showTip)}
        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        {showTip ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Low energy?
      </button>

      {showTip && (
        <p className="low-energy-message">{randomTip}</p>
      )}
    </div>
  );
}
