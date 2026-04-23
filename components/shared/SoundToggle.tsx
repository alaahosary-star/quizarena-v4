'use client';

import { useState } from 'react';
import { sfx } from '@/lib/sound/engine';

export function SoundToggle() {
  const [muted, setMuted] = useState(false);

  const toggle = () => {
    const newMuted = sfx.toggleMute();
    setMuted(newMuted);
  };

  return (
    <button
      onClick={toggle}
      title={muted ? 'تفعيل الصوت' : 'كتم الصوت'}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--card)',
        color: 'var(--text)',
        cursor: 'pointer',
        fontSize: 18,
        display: 'grid',
        placeItems: 'center',
        transition: 'all .2s',
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
