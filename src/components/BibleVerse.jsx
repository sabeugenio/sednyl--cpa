import React, { useState, useEffect, useRef } from 'react';
import { BookOpen } from 'lucide-react';
import { fetchBibleVerse } from '../utils/api';

export default function BibleVerse() {
  const [verse, setVerse] = useState(null);
  const [reference, setReference] = useState(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const loadVerse = async () => {
    try {
      const data = await fetchBibleVerse();
      if (data.verse) {
        setVerse(data.verse);
        setReference(data.reference);
        setVisible(true);
      } else {
        // Hidden period
        setVisible(false);
      }
    } catch (err) {
      console.error('Failed to load Bible verse:', err);
      setVisible(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerse();
    // Re-check every 60 seconds for cycle transitions
    intervalRef.current = setInterval(loadVerse, 60 * 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (loading || !visible) return null;

  return (
    <div className="bible-verse-card">
      <blockquote className="bible-verse-text">
        "{verse}"
      </blockquote>
      <cite className="bible-verse-ref">— {reference}</cite>
    </div>
  );
}
