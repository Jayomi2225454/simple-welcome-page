import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Medal, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SportsLeaderboardEntry {
  id: string;
  player_name: string;
  sport_type: string;
  city: string | null;
  points: number;
  wins: number;
  matches_played: number;
  avatar_url: string | null;
  user_id: string | null;
}

const sportTypes = ['Cricket', 'Football', 'Badminton', 'Basketball', 'Kabaddi', 'Chess', 'Athletics', 'Tennis', 'Volleyball', 'Hockey'];

const SportsLeaderboardsAdmin = () => {
  const [entries, setEntries] = useState<SportsLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState('all');

  const [form, setForm] = useState({
    player_name: '',
    sport_type: 'Cricket',
    city: '',
    points: '0',
    wins: '0',
    matches_played: '0',
    avatar_url: ''
  });

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('sports_leaderboards')
        .select('*')
        .order('points', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      player_name: '',
      sport_type: 'Cricket',
      city: '',
      points: '0',
      wins: '0',
      matches_played: '0',
      avatar_url: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (entry: SportsLeaderboardEntry) => {
    setForm({
      player_name: entry.player_name,
      sport_type: entry.sport_type,
      city: entry.city || '',
      points: entry.points.toString(),
      wins: entry.wins.toString(),
      matches_played: entry.matches_played.toString(),
      avatar_url: entry.avatar_url || ''
    });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.player_name || !form.sport_type) {
      toast.error('Player name and sport type are required');
      return;
    }

    setSaving(true);
    try {
      const entryData = {
        player_name: form.player_name,
        sport_type: form.sport_type,
        city: form.city || null,
        points: parseInt(form.points) || 0,
        wins: parseInt(form.wins) || 0,
        matches_played: parseInt(form.matches_played) || 0,
        avatar_url: form.avatar_url || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('sports_leaderboards')
          .update(entryData)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Entry updated successfully');
      } else {
        const { error } = await supabase
          .from('sports_leaderboards')
          .insert([entryData]);
        if (error) throw error;
        toast.success('Entry created successfully');
      }

      resetForm();
      loadEntries();
    } catch (error: any) {
      console.error('Failed to save entry:', error);
      toast.error(error.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const { error } = await supabase
        .from('sports_leaderboards')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Entry deleted successfully');
      loadEntries();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete entry');
    }
  };

  const filteredEntries = entries.filter(e => 
    sportFilter === 'all' || e.sport_type === sportFilter
  );

  const getRankBadgeColor = (index: number) => {
    if (index === 0) return 'bg-yellow-500 text-black';
    if (index === 1) return 'bg-gray-400 text-black';
    if (index === 2) return 'bg-amber-600 text-white';
    return 'bg-gray-700 text-white';
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="ml-2 text-gray-400">Loading leaderboard...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Medal className="w-6 h-6 text-yellow-400" />
          Leaderboards ({entries.length} athletes)
        </h2>
        <div className="flex gap-4">
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="w-[180px] bg-gray-800/50 border-gray-700 text-white">
              <SelectValue placeholder="Filter by sport" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Sports</SelectItem>
              {sportTypes.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Athlete
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              {editingId ? 'Edit Athlete' : 'Add Athlete'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Player Name *</label>
                <Input
                  value={form.player_name}
                  onChange={(e) => setForm({ ...form, player_name: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Player name"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Sport Type *</label>
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
                <label className="text-sm text-gray-400 mb-1 block">City</label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Points</label>
                <Input
                  type="number"
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Wins</label>
                <Input
                  type="number"
                  value={form.wins}
                  onChange={(e) => setForm({ ...form, wins: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Matches Played</label>
                <Input
                  type="number"
                  value={form.matches_played}
                  onChange={(e) => setForm({ ...form, matches_played: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="text-sm text-gray-400 mb-1 block">Avatar URL</label>
                <Input
                  value={form.avatar_url}
                  onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="https://..."
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

      {/* Leaderboard Table */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-0">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No athletes found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Rank</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Athlete</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Sport</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">City</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Points</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Wins</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Matches</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredEntries.map((entry, index) => (
                    <tr key={entry.id} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${getRankBadgeColor(index)}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                            {entry.avatar_url ? (
                              <img src={entry.avatar_url} alt={entry.player_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-emerald-400 font-bold">{entry.player_name.charAt(0)}</span>
                            )}
                          </div>
                          <span className="font-semibold text-white">{entry.player_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-emerald-500/20 text-emerald-400">{entry.sport_type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{entry.city || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-emerald-400">{entry.points}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-green-400">{entry.wins}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{entry.matches_played}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(entry)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(entry.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SportsLeaderboardsAdmin;
