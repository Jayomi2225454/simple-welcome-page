import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Radio, Loader2, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SportsLiveMatch {
  id: string;
  tournament_id: string | null;
  tournament_name: string;
  sport_type: string;
  team_1: string;
  team_2: string;
  score_1: number;
  score_2: number;
  status: string | null;
  venue_name: string | null;
  city: string | null;
  start_time: string | null;
  match_phase: string | null;
}

const sportTypes = ['Cricket', 'Football', 'Badminton', 'Basketball', 'Kabaddi', 'Chess', 'Athletics', 'Tennis', 'Volleyball', 'Hockey'];

const SportsLiveMatchesAdmin = () => {
  const [matches, setMatches] = useState<SportsLiveMatch[]>([]);
  const [tournaments, setTournaments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    tournament_id: '',
    tournament_name: '',
    sport_type: 'Cricket',
    team_1: '',
    team_2: '',
    score_1: '0',
    score_2: '0',
    status: 'upcoming',
    venue_name: '',
    city: '',
    start_time: '',
    match_phase: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [matchesRes, tournamentsRes] = await Promise.all([
        supabase.from('sports_live_matches').select('*').order('created_at', { ascending: false }),
        supabase.from('sports_tournaments').select('id, name').order('name')
      ]);

      if (matchesRes.error) throw matchesRes.error;
      setMatches(matchesRes.data || []);
      setTournaments(tournamentsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      tournament_id: '',
      tournament_name: '',
      sport_type: 'Cricket',
      team_1: '',
      team_2: '',
      score_1: '0',
      score_2: '0',
      status: 'upcoming',
      venue_name: '',
      city: '',
      start_time: '',
      match_phase: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (match: SportsLiveMatch) => {
    setForm({
      tournament_id: match.tournament_id || '',
      tournament_name: match.tournament_name,
      sport_type: match.sport_type,
      team_1: match.team_1,
      team_2: match.team_2,
      score_1: match.score_1.toString(),
      score_2: match.score_2.toString(),
      status: match.status || 'upcoming',
      venue_name: match.venue_name || '',
      city: match.city || '',
      start_time: match.start_time ? match.start_time.slice(0, 16) : '',
      match_phase: match.match_phase || ''
    });
    setEditingId(match.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.team_1 || !form.team_2 || !form.tournament_name) {
      toast.error('Team names and tournament name are required');
      return;
    }

    setSaving(true);
    try {
      const matchData = {
        tournament_id: form.tournament_id || null,
        tournament_name: form.tournament_name,
        sport_type: form.sport_type,
        team_1: form.team_1,
        team_2: form.team_2,
        score_1: parseInt(form.score_1) || 0,
        score_2: parseInt(form.score_2) || 0,
        status: form.status,
        venue_name: form.venue_name || null,
        city: form.city || null,
        start_time: form.start_time ? new Date(form.start_time).toISOString() : null,
        match_phase: form.match_phase || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('sports_live_matches')
          .update(matchData)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Match updated successfully');
      } else {
        const { error } = await supabase
          .from('sports_live_matches')
          .insert([matchData]);
        if (error) throw error;
        toast.success('Match created successfully');
      }

      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Failed to save match:', error);
      toast.error(error.message || 'Failed to save match');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this match?')) return;

    try {
      const { error } = await supabase
        .from('sports_live_matches')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Match deleted successfully');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete match');
    }
  };

  const quickUpdateScore = async (id: string, team: 'score_1' | 'score_2', change: number) => {
    const match = matches.find(m => m.id === id);
    if (!match) return;

    const newScore = Math.max(0, match[team] + change);
    try {
      const { error } = await supabase
        .from('sports_live_matches')
        .update({ [team]: newScore })
        .eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      toast.error('Failed to update score');
    }
  };

  const updateMatchStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('sports_live_matches')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      toast.success(`Match marked as ${status}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="ml-2 text-gray-400">Loading matches...</span>
        </CardContent>
      </Card>
    );
  }

  const liveMatches = matches.filter(m => m.status === 'live');
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');
  const completedMatches = matches.filter(m => m.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-900/50 to-red-800/50 border-red-500/30">
          <CardContent className="p-4 text-center">
            <Radio className="w-6 h-6 text-red-400 mx-auto mb-2 animate-pulse" />
            <div className="text-2xl font-bold text-white">{liveMatches.length}</div>
            <div className="text-red-300 text-sm">Live Now</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">{upcomingMatches.length}</div>
            <div className="text-blue-300 text-sm">Upcoming</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-700/50 to-gray-600/50 border-gray-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">{completedMatches.length}</div>
            <div className="text-gray-300 text-sm">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Radio className="w-6 h-6 text-red-400" />
          Live Matches
        </h2>
        <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Match
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              {editingId ? 'Edit Match' : 'Create Match'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Tournament</label>
                <Select 
                  value={form.tournament_id} 
                  onValueChange={(v) => {
                    const t = tournaments.find(t => t.id === v);
                    setForm({ ...form, tournament_id: v, tournament_name: t?.name || '' });
                  }}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select tournament" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {tournaments.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Tournament Name *</label>
                <Input
                  value={form.tournament_name}
                  onChange={(e) => setForm({ ...form, tournament_name: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Tournament name"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Sport Type</label>
                <Select value={form.sport_type} onValueChange={(v) => setForm({ ...form, sport_type: v })}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {sportTypes.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Team 1 *</label>
                <Input
                  value={form.team_1}
                  onChange={(e) => setForm({ ...form, team_1: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Team 1 name"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Team 2 *</label>
                <Input
                  value={form.team_2}
                  onChange={(e) => setForm({ ...form, team_2: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Team 2 name"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Score 1</label>
                <Input
                  type="number"
                  value={form.score_1}
                  onChange={(e) => setForm({ ...form, score_1: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Score 2</label>
                <Input
                  type="number"
                  value={form.score_2}
                  onChange={(e) => setForm({ ...form, score_2: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Venue</label>
                <Input
                  value={form.venue_name}
                  onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Stadium name"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">City</label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Start Time</label>
                <Input
                  type="datetime-local"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Match Phase</label>
                <Input
                  value={form.match_phase}
                  onChange={(e) => setForm({ ...form, match_phase: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="2nd Half - 67'"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingId ? 'Update' : 'Create'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matches List */}
      <div className="space-y-4">
        {matches.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-8 text-center">
              <Radio className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg text-gray-400">No matches yet</h3>
            </CardContent>
          </Card>
        ) : (
          matches.map((match) => (
            <Card key={match.id} className={`border-gray-700 ${match.status === 'live' ? 'bg-red-900/20 border-red-500/50' : 'bg-gray-800/50'}`}>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-emerald-500/20 text-emerald-400">{match.sport_type}</Badge>
                      <Badge className={
                        match.status === 'live' ? 'bg-red-500 animate-pulse' :
                        match.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }>
                        {match.status === 'live' && <Radio className="w-3 h-3 mr-1" />}
                        {match.status?.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-400 mb-2">{match.tournament_name}</div>
                    
                    {/* Score Display */}
                    <div className="flex items-center gap-4 my-3">
                      <div className="text-center flex-1">
                        <div className="font-bold text-white">{match.team_1}</div>
                        <div className="text-2xl font-bold text-emerald-400">{match.score_1}</div>
                        {match.status === 'live' && (
                          <div className="flex justify-center gap-1 mt-1">
                            <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => quickUpdateScore(match.id, 'score_1', 1)}>+</Button>
                            <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => quickUpdateScore(match.id, 'score_1', -1)}>-</Button>
                          </div>
                        )}
                      </div>
                      <div className="text-gray-500 text-xl">VS</div>
                      <div className="text-center flex-1">
                        <div className="font-bold text-white">{match.team_2}</div>
                        <div className="text-2xl font-bold text-emerald-400">{match.score_2}</div>
                        {match.status === 'live' && (
                          <div className="flex justify-center gap-1 mt-1">
                            <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => quickUpdateScore(match.id, 'score_2', 1)}>+</Button>
                            <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => quickUpdateScore(match.id, 'score_2', -1)}>-</Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {match.match_phase && (
                      <div className="text-sm text-emerald-400">{match.match_phase}</div>
                    )}
                    {match.venue_name && (
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {match.venue_name}, {match.city}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {match.status === 'upcoming' && (
                      <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => updateMatchStatus(match.id, 'live')}>
                        Go Live
                      </Button>
                    )}
                    {match.status === 'live' && (
                      <Button size="sm" className="bg-gray-600 hover:bg-gray-700" onClick={() => updateMatchStatus(match.id, 'completed')}>
                        End Match
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleEdit(match)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(match.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SportsLiveMatchesAdmin;
