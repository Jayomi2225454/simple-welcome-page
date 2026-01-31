import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Trophy, Loader2, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SportsTournament {
  id: string;
  name: string;
  sport_type: string;
  description: string | null;
  prize_pool: string | null;
  max_participants: number | null;
  current_participants: number | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  status: string | null;
  venue_name: string | null;
  venue_address: string | null;
  city: string | null;
  banner_url: string | null;
  entry_fee: string | null;
  team_size: number | null;
  format: string | null;
  organizer_name: string | null;
  organizer_phone: string | null;
  rules: string | null;
}

const sportTypes = ['Cricket', 'Football', 'Badminton', 'Basketball', 'Kabaddi', 'Chess', 'Athletics', 'Tennis', 'Volleyball', 'Hockey'];

const SportsTournamentsAdmin = () => {
  const [tournaments, setTournaments] = useState<SportsTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    sport_type: 'Cricket',
    description: '',
    prize_pool: '',
    max_participants: '',
    start_date: '',
    end_date: '',
    start_time: '',
    status: 'upcoming',
    venue_name: '',
    venue_address: '',
    city: '',
    banner_url: '',
    entry_fee: '',
    team_size: '1',
    format: 'Knockout',
    organizer_name: '',
    organizer_phone: '',
    rules: ''
  });

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('sports_tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      sport_type: 'Cricket',
      description: '',
      prize_pool: '',
      max_participants: '',
      start_date: '',
      end_date: '',
      start_time: '',
      status: 'upcoming',
      venue_name: '',
      venue_address: '',
      city: '',
      banner_url: '',
      entry_fee: '',
      team_size: '1',
      format: 'Knockout',
      organizer_name: '',
      organizer_phone: '',
      rules: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (tournament: SportsTournament) => {
    setForm({
      name: tournament.name,
      sport_type: tournament.sport_type,
      description: tournament.description || '',
      prize_pool: tournament.prize_pool || '',
      max_participants: tournament.max_participants?.toString() || '',
      start_date: tournament.start_date ? tournament.start_date.split('T')[0] : '',
      end_date: tournament.end_date ? tournament.end_date.split('T')[0] : '',
      start_time: tournament.start_time || '',
      status: tournament.status || 'upcoming',
      venue_name: tournament.venue_name || '',
      venue_address: tournament.venue_address || '',
      city: tournament.city || '',
      banner_url: tournament.banner_url || '',
      entry_fee: tournament.entry_fee || '',
      team_size: tournament.team_size?.toString() || '1',
      format: tournament.format || 'Knockout',
      organizer_name: tournament.organizer_name || '',
      organizer_phone: tournament.organizer_phone || '',
      rules: tournament.rules || ''
    });
    setEditingId(tournament.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.sport_type) {
      toast.error('Name and sport type are required');
      return;
    }

    setSaving(true);
    try {
      const tournamentData = {
        name: form.name,
        sport_type: form.sport_type,
        description: form.description || null,
        prize_pool: form.prize_pool || null,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        start_time: form.start_time || null,
        status: form.status,
        venue_name: form.venue_name || null,
        venue_address: form.venue_address || null,
        city: form.city || null,
        banner_url: form.banner_url || null,
        entry_fee: form.entry_fee || null,
        team_size: form.team_size ? parseInt(form.team_size) : 1,
        format: form.format || null,
        organizer_name: form.organizer_name || null,
        organizer_phone: form.organizer_phone || null,
        rules: form.rules || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('sports_tournaments')
          .update(tournamentData)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Tournament updated successfully');
      } else {
        const { error } = await supabase
          .from('sports_tournaments')
          .insert([tournamentData]);
        if (error) throw error;
        toast.success('Tournament created successfully');
      }

      resetForm();
      loadTournaments();
    } catch (error: any) {
      console.error('Failed to save tournament:', error);
      toast.error(error.message || 'Failed to save tournament');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;

    try {
      const { error } = await supabase
        .from('sports_tournaments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Tournament deleted successfully');
      loadTournaments();
    } catch (error: any) {
      console.error('Failed to delete tournament:', error);
      toast.error(error.message || 'Failed to delete tournament');
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="ml-2 text-gray-400">Loading tournaments...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-emerald-400" />
          Sports Tournaments ({tournaments.length})
        </h2>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Tournament
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              {editingId ? 'Edit Tournament' : 'Create Tournament'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Tournament name"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Sport Type *</label>
                <Select value={form.sport_type} onValueChange={(v) => setForm({ ...form, sport_type: v })}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {sportTypes.map(sport => (
                      <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Prize Pool</label>
                <Input
                  value={form.prize_pool}
                  onChange={(e) => setForm({ ...form, prize_pool: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="₹50,000"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Entry Fee</label>
                <Input
                  value={form.entry_fee}
                  onChange={(e) => setForm({ ...form, entry_fee: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="500 or Free"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Max Participants</label>
                <Input
                  type="number"
                  value={form.max_participants}
                  onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="16"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Team Size</label>
                <Input
                  type="number"
                  value={form.team_size}
                  onChange={(e) => setForm({ ...form, team_size: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="11"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Start Time</label>
                <Input
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="9:00 AM"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Format</label>
                <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="Knockout">Knockout</SelectItem>
                    <SelectItem value="League">League</SelectItem>
                    <SelectItem value="Round Robin">Round Robin</SelectItem>
                    <SelectItem value="Group Stage">Group Stage</SelectItem>
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
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">City</label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Mumbai"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Venue Name</label>
                <Input
                  value={form.venue_name}
                  onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Municipal Stadium"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Venue Address</label>
                <Input
                  value={form.venue_address}
                  onChange={(e) => setForm({ ...form, venue_address: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Stadium Road, Andheri"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Organizer Name</label>
                <Input
                  value={form.organizer_name}
                  onChange={(e) => setForm({ ...form, organizer_name: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Sports Club"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Organizer Phone</label>
                <Input
                  value={form.organizer_phone}
                  onChange={(e) => setForm({ ...form, organizer_phone: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Tournament description..."
                rows={3}
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Rules</label>
              <Textarea
                value={form.rules}
                onChange={(e) => setForm({ ...form, rules: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Tournament rules (one per line)..."
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
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

      {/* Tournaments List */}
      <div className="space-y-4">
        {tournaments.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-8 text-center">
              <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg text-gray-400 mb-2">No tournaments yet</h3>
              <p className="text-gray-500">Create your first sports tournament to get started.</p>
            </CardContent>
          </Card>
        ) : (
          tournaments.map((tournament) => (
            <Card key={tournament.id} className="bg-gray-800/50 border-gray-700 hover:border-emerald-500/50 transition-all">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-white">{tournament.name}</h3>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        {tournament.sport_type}
                      </Badge>
                      <Badge className={
                        tournament.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' :
                        tournament.status === 'ongoing' ? 'bg-green-500/20 text-green-400' :
                        tournament.status === 'completed' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-red-500/20 text-red-400'
                      }>
                        {tournament.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      {tournament.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {tournament.venue_name}, {tournament.city}
                        </span>
                      )}
                      <span>Prize: {tournament.prize_pool || 'TBA'}</span>
                      <span>Entry: {tournament.entry_fee ? `₹${tournament.entry_fee}` : 'Free'}</span>
                      <span>Teams: {tournament.current_participants || 0}/{tournament.max_participants || '∞'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(tournament)}
                      className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(tournament.id)}
                    >
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

export default SportsTournamentsAdmin;
