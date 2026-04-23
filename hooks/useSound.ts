'use client';

import { useState, useCallback } from 'react';
import { sfx } from '@/lib/sound/engine';

export function useSound() {
  const [muted, setMuted] = useState(false);

  const toggle = useCallback(() => {
    const newMuted = sfx.toggleMute();
    setMuted(newMuted);
    return newMuted;
  }, []);

  return {
    muted,
    toggle,
    click: () => sfx.click(),
    select: () => sfx.select(),
    correct: () => sfx.correct(),
    wrong: () => sfx.wrong(),
    winner: () => sfx.winner(),
    join: () => sfx.join(),
    tick: () => sfx.tick(),
  };
}
