import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Trash2, Swords, Loader2, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MatchEntry {
  id?: string;
  player1: string;
  player2: string;
  player1_score: number;
  player2_score: number;
  status: string;
  game: string;
  start_time: string;
}

interface TournamentMatchScoresAdminProps {
  tournamentId: string;
  gameName: string;
}

const TournamentMatchScoresAdmin = ({ tournamentId, gameName }: TournamentMatchScoresAdminProps) => {
  const { toast } = useToast();
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMatch, setNewMatch] = useState<MatchEntry>({
    player1: '',
    player2: '',
    player1_score: 0,
    player2_score: 0,
    status: 'upcoming',
    game: gameName,
    start_time: '',
  });

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
  }, [tournamentId]);

  const handleAddMatch = async () => {
    if (!newMatch.player1.trim() || !newMatch.player2.trim()) {
      toast({ title: 'Error', description: 'Both player names are required', variant: 'destructive' });
      return;
    }

    setSaving('new');
    try {
      const { error } = await supabase.from('matches').insert({
        tournament_id: tournamentId,
        player1: newMatch.player1,
        player2: newMatch.player2,
        player1_score: newMatch.player1_score,
        player2_score: newMatch.player2_score,
        status: newMatch.status,
        game: newMatch.game || gameName,
        start_time: newMatch.start_time || new Date().toISOString(),
      });

      if (error) throw error;

      toast({ title: 'Match Added' });
      setNewMatch({ player1: '', player2: '', player1_score: 0, player2_score: 0, status: 'upcoming', game: gameName, start_time: '' });
      setShowAddForm(false);
      fetchMatches();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleQuickScoreUpdate = async (matchId: string, player: 'player1' | 'player2', delta: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const field = player === 'player1' ? 'player1_score' : 'player2_score';
    const newScore = Math.max(0, (match[field] as number) + delta);

    setSaving(matchId);
    try {
      const { error } = await supabase
        .from('matches')
        .update({ [field]: newScore })
        .eq('id', matchId);

      if (error) throw error;

      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, [field]: newScore } : m));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleStatusChange = async (matchId: string, newStatus: string) => {
    setSaving(matchId);
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: newStatus })
        .eq('id', matchId);

      if (error) throw error;

      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: newStatus } : m));
      toast({ title: 'Status Updated', description: `Match set to ${newStatus}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    setSaving(matchId);
    try {
      const { error } = await supabase.from('matches').delete().eq('id', matchId);
      if (error) throw error;

      setMatches(prev => prev.filter(m => m.id !== matchId));
      toast({ title: 'Match Deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2 text-base">
            <Swords className="w-4 h-4 text-primary" />
            1v1 Match Scores
          </CardTitle>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1" />
            Add Match
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Match Form */}
        {showAddForm && (
          <Card className="bg-secondary/50 border-border">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Player 1</label>
                  <Input
                    value={newMatch.player1}
                    onChange={(e) => setNewMatch({ ...newMatch, player1: e.target.value })}
                    placeholder="Player 1 name"
                    className="bg-background border-border text-foreground h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Player 2</label>
                  <Input
                    value={newMatch.player2}
                    onChange={(e) => setNewMatch({ ...newMatch, player2: e.target.value })}
                    placeholder="Player 2 name"
                    className="bg-background border-border text-foreground h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Status</label>
                  <Select value={newMatch.status} onValueChange={(v) => setNewMatch({ ...newMatch, status: v })}>
                    <SelectTrigger className="bg-background border-border text-foreground h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Start Time</label>
                  <Input
                    type="datetime-local"
                    value={newMatch.start_time}
                    onChange={(e) => setNewMatch({ ...newMatch, start_time: e.target.value })}
                    className="bg-background border-border text-foreground h-9"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddMatch} disabled={saving === 'new'} size="sm" className="w-full bg-green-600 hover:bg-green-700">
                    {saving === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Add</>}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Match List with Quick Score Controls */}
        {matches.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Swords className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No matches yet. Add a match to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => {
              const isLive = match.status === 'live';
              const isCompleted = match.status === 'completed';

              return (
                <div
                  key={match.id}
                  className={`rounded-lg border p-4 transition-all ${
                    isLive
                      ? 'bg-red-500/10 border-red-500/30'
                      : isCompleted
                      ? 'bg-green-500/5 border-border'
                      : 'bg-secondary/30 border-border'
                  }`}
                >
                  {/* Status & Actions Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Select value={match.status} onValueChange={(v) => handleStatusChange(match.id!, v)}>
                        <SelectTrigger className={`h-7 w-auto text-xs border-0 ${
                          isLive ? 'bg-red-500 text-white' : isCompleted ? 'bg-green-600 text-white' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          <SelectItem value="upcoming">⏳ Upcoming</SelectItem>
                          <SelectItem value="live">🔴 Live</SelectItem>
                          <SelectItem value="completed">✅ Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      {isLive && <span className="text-xs text-red-400 animate-pulse font-semibold">LIVE</span>}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteMatch(match.id!)}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Score Controls */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    {/* Player 1 */}
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground truncate">{match.player1}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 border-border"
                          onClick={() => handleQuickScoreUpdate(match.id!, 'player1', -1)}
                          disabled={match.player1_score <= 0 || saving === match.id}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-2xl font-black text-foreground w-10 text-center">
                          {match.player1_score}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 border-primary text-primary hover:bg-primary/10"
                          onClick={() => handleQuickScoreUpdate(match.id!, 'player1', 1)}
                          disabled={saving === match.id}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* VS */}
                    <div className="text-center">
                      <span className="text-muted-foreground font-bold text-lg">VS</span>
                    </div>

                    {/* Player 2 */}
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground truncate">{match.player2}</p>
                      <div className="flex items-center justify-start gap-1 mt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 border-border"
                          onClick={() => handleQuickScoreUpdate(match.id!, 'player2', -1)}
                          disabled={match.player2_score <= 0 || saving === match.id}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-2xl font-black text-foreground w-10 text-center">
                          {match.player2_score}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 border-primary text-primary hover:bg-primary/10"
                          onClick={() => handleQuickScoreUpdate(match.id!, 'player2', 1)}
                          disabled={saving === match.id}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {saving === match.id && (
                    <div className="flex justify-center mt-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TournamentMatchScoresAdmin;
