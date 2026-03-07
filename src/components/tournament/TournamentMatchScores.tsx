import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Swords, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MatchData {
  id: string;
  player1: string;
  player2: string;
  player1_score: number;
  player2_score: number;
  status: string;
  game: string;
  start_time: string;
}

interface TournamentMatchScoresProps {
  tournamentId: string;
}

const TournamentMatchScores = ({ tournamentId }: TournamentMatchScoresProps) => {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('start_time', { ascending: true });

    if (!error && data) {
      setMatches(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();

    const channel = supabase
      .channel(`matches-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
      }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tournamentId]);

  if (loading) {
    return <div className="text-center text-gray-400 py-8">Loading matches...</div>;
  }

  if (matches.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-8 text-center">
          <Swords className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No matches scheduled yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white flex items-center gap-2">
        <Swords className="w-5 h-5 text-purple-400" />
        1v1 Match Scores
      </h3>
      {matches.map((match) => {
        const isLive = match.status === 'live';
        const isCompleted = match.status === 'completed';
        const p1Wins = isCompleted && match.player1_score > match.player2_score;
        const p2Wins = isCompleted && match.player2_score > match.player1_score;

        return (
          <Card
            key={match.id}
            className={`border transition-all ${
              isLive
                ? 'bg-gradient-to-r from-red-900/30 to-orange-900/30 border-red-500/50 animate-pulse'
                : isCompleted
                ? 'bg-gray-800/50 border-gray-700'
                : 'bg-gray-800/30 border-gray-700/50'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge
                  className={
                    isLive
                      ? 'bg-red-500 text-white'
                      : isCompleted
                      ? 'bg-green-500/20 text-green-400 border-green-500/50'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                  }
                >
                  {isLive ? '🔴 LIVE' : isCompleted ? '✅ Completed' : '⏳ Upcoming'}
                </Badge>
                <span className="text-xs text-gray-500">
                  {new Date(match.start_time).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3">
                {/* Player 1 */}
                <div className={`text-right ${p1Wins ? 'text-yellow-400' : 'text-white'}`}>
                  <p className="font-bold text-base sm:text-lg flex items-center justify-end gap-2">
                    {p1Wins && <Trophy className="w-4 h-4 text-yellow-400" />}
                    {match.player1}
                  </p>
                </div>

                {/* Scores */}
                <div className="flex items-center gap-2 px-4">
                  <span className={`text-2xl sm:text-3xl font-black ${p1Wins ? 'text-yellow-400' : 'text-white'}`}>
                    {match.player1_score}
                  </span>
                  <span className="text-gray-500 text-lg font-bold">:</span>
                  <span className={`text-2xl sm:text-3xl font-black ${p2Wins ? 'text-yellow-400' : 'text-white'}`}>
                    {match.player2_score}
                  </span>
                </div>

                {/* Player 2 */}
                <div className={`text-left ${p2Wins ? 'text-yellow-400' : 'text-white'}`}>
                  <p className="font-bold text-base sm:text-lg flex items-center gap-2">
                    {match.player2}
                    {p2Wins && <Trophy className="w-4 h-4 text-yellow-400" />}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TournamentMatchScores;
