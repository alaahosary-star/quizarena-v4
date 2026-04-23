'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LiveSession, Participant } from '@/lib/supabase/types';

export function useLiveSession(sessionId: string | null) {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();

    const loadSession = async () => {
      const { data: sessionData } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      if (sessionData) setSession(sessionData as LiveSession);

      const { data: parts } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('total_score', { ascending: false });
      if (parts) setParticipants(parts as Participant[]);
      setLoading(false);
    };

    loadSession();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_sessions', filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as LiveSession)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` },
        async () => {
          const { data } = await supabase
            .from('participants')
            .select('*')
            .eq('session_id', sessionId)
            .order('total_score', { ascending: false });
          if (data) setParticipants(data as Participant[]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId]);

  return { session, participants, loading };
}
