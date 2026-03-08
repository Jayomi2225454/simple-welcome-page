import { useState, useEffect, useRef } from 'react';
import { Swords } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LiveMatch {
  id: string;
  player1: string;
  player2: string;
  player1_score: number;
  player2_score: number;
}

const LiveMatchScoreBadge = ({ tournamentId }: { tournamentId: string }) => {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!tournamentId) return;

    const fetchMatches = async () => {
      const { data } = await supabase
        .from('matches')
        .select('id, player1, player2, player1_score, player2_score')
        .eq('tournament_id', tournamentId)
        .eq('status', 'live');
      setLiveMatches(data || []);
    };

    // Initial fetch
    fetchMatches();

    // Polling fallback every 5s
    intervalRef.current = setInterval(fetchMatches, 5000);

    // Realtime subscription
    const channel = supabase
      .channel(`live-badge-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
      }, () => fetchMatches())
      .subscribe();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  if (!liveMatches.length) return null;

  return (
    <div className="space-y-1.5">
      {liveMatches.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 rounded-lg px-3 py-1.5 backdrop-blur-sm animate-pulse"
        >
          <Swords className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="text-white text-xs font-bold truncate max-w-[60px]">{m.player1}</span>
          <span className="text-yellow-400 text-sm font-black">{m.player1_score}</span>
          <span className="text-gray-400 text-xs">:</span>
          <span className="text-yellow-400 text-sm font-black">{m.player2_score}</span>
          <span className="text-white text-xs font-bold truncate max-w-[60px]">{m.player2}</span>
        </div>
      ))}
    </div>
  );
};

export default LiveMatchScoreBadge;
