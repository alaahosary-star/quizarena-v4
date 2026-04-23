'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { sfx } from '@/lib/sound/engine';

export type TimerPhase = 'ok' | 'warning' | 'danger' | 'done';

export interface TimerState {
  left: number;
  running: boolean;
  phase: TimerPhase;
  percent: number;
  elapsed: number;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useTimer(totalSeconds: number, onEnd?: () => void): TimerState {
  const [left, setLeft] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  const start = useCallback(() => {
    setLeft(totalSeconds);
    setElapsed(0);
    setRunning(true);
    startRef.current = Date.now();
  }, [totalSeconds]);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setLeft(totalSeconds);
    setElapsed(0);
  }, [totalSeconds, stop]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setLeft((prev) => {
        const next = prev - 1;
        setElapsed((totalSeconds - next) * 1000);
        if (next <= 5 && next > 0) sfx.tick();
        if (next <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setRunning(false);
          onEnd?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, totalSeconds, onEnd]);

  const phase: TimerPhase =
    left === 0 ? 'done' : left <= 5 ? 'danger' : left <= 10 ? 'warning' : 'ok';

  return {
    left,
    running,
    phase,
    percent: left / totalSeconds,
    elapsed,
    start,
    stop,
    reset,
  };
}
