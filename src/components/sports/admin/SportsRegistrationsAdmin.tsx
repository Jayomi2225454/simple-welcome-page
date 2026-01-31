import { useState, useEffect } from 'react';
import { Users, Check, X, Loader2, Phone, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SportsRegistration {
  id: string;
  tournament_id: string;
  user_id: string;
  captain_name: string;
  phone_number: string;
  team_name: string | null;
  player_count: number | null;
  city: string | null;
  status: string | null;
  payment_status: string | null;
  payment_amount: number | null;
  created_at: string;
  tournament?: {
    name: string;
    sport_type: string;
  };
}

const SportsRegistrationsAdmin = () => {
  const [registrations, setRegistrations] = useState<SportsRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [tournamentFilter, setTournamentFilter] = useState('all');
  const [tournaments, setTournaments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load tournaments for filter
      const { data: tournamentsData } = await supabase
        .from('sports_tournaments')
        .select('id, name')
        .order('name');
      setTournaments(tournamentsData || []);

      // Load registrations with tournament info
      const { data, error } = await supabase
        .from('sports_registrations')
        .select(`
          *,
          tournament:sports_tournaments(name, sport_type)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Failed to load registrations:', error);
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('sports_registrations')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Registration ${status}`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update registration');
    } finally {
      setProcessingId(null);
    }
  };

  const updatePaymentStatus = async (id: string, payment_status: string) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('sports_registrations')
        .update({ payment_status })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Payment ${payment_status}`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update payment status');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRegistrations = registrations.filter(reg => {
    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
    const matchesTournament = tournamentFilter === 'all' || reg.tournament_id === tournamentFilter;
    return matchesStatus && matchesTournament;
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'registered':
        return <Badge className="bg-blue-500/20 text-blue-400">Registered</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-500/20 text-green-400">Confirmed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400">Cancelled</Badge>;
      case 'checked_in':
        return <Badge className="bg-purple-500/20 text-purple-400">Checked In</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const getPaymentBadge = (status: string | null) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>;
      case 'paid':
        return <Badge className="bg-green-500/20 text-green-400">Paid</Badge>;
      case 'refunded':
        return <Badge className="bg-gray-500/20 text-gray-400">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status || 'N/A'}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="ml-2 text-gray-400">Loading registrations...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">{registrations.length}</div>
            <div className="text-blue-300 text-sm">Total Registrations</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {registrations.filter(r => r.status === 'confirmed').length}
            </div>
            <div className="text-green-300 text-sm">Confirmed</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 border-yellow-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {registrations.filter(r => r.payment_status === 'pending').length}
            </div>
            <div className="text-yellow-300 text-sm">Pending Payment</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {registrations.filter(r => r.status === 'checked_in').length}
            </div>
            <div className="text-purple-300 text-sm">Checked In</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-gray-800/50 border-gray-700 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
          <SelectTrigger className="w-[220px] bg-gray-800/50 border-gray-700 text-white">
            <SelectValue placeholder="Tournament" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Tournaments</SelectItem>
            {tournaments.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Registrations List */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Registrations ({filteredRegistrations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRegistrations.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No registrations found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRegistrations.map((reg) => (
                <Card key={reg.id} className="bg-gray-700/50 border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-white">
                            {reg.team_name || reg.captain_name}
                          </h4>
                          {getStatusBadge(reg.status)}
                          {getPaymentBadge(reg.payment_status)}
                        </div>
                        <div className="text-sm text-gray-400 space-y-1">
                          <div className="text-emerald-400">
                            {reg.tournament?.name} ({reg.tournament?.sport_type})
                          </div>
                          <div className="flex flex-wrap gap-4">
                            <span>Captain: {reg.captain_name}</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {reg.phone_number}
                            </span>
                            {reg.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {reg.city}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Registered: {new Date(reg.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {reg.status !== 'confirmed' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => updateStatus(reg.id, 'confirmed')}
                            disabled={processingId === reg.id}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Confirm
                          </Button>
                        )}
                        {reg.status !== 'checked_in' && reg.status === 'confirmed' && (
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => updateStatus(reg.id, 'checked_in')}
                            disabled={processingId === reg.id}
                          >
                            Check In
                          </Button>
                        )}
                        {reg.payment_status === 'pending' && (
                          <Button
                            size="sm"
                            className="bg-yellow-600 hover:bg-yellow-700"
                            onClick={() => updatePaymentStatus(reg.id, 'paid')}
                            disabled={processingId === reg.id}
                          >
                            Mark Paid
                          </Button>
                        )}
                        {reg.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateStatus(reg.id, 'cancelled')}
                            disabled={processingId === reg.id}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SportsRegistrationsAdmin;
