import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Trophy, MapPin, Calendar, Users, Phone, Clock, ArrowLeft, Dumbbell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import SportsRegistrationForm from '@/components/sports/SportsRegistrationForm';
import { supabase } from '@/integrations/supabase/client';

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

const SportsTournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<SportsTournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (id) {
      loadTournament();
      if (user) {
        checkRegistration();
      }
    }
  }, [id, user]);

  const loadTournament = async () => {
    try {
      const { data, error } = await supabase
        .from('sports_tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (data) {
        setTournament(data);
      } else {
        toast.error('Tournament not found');
        navigate('/sports/tournaments');
      }
    } catch (error) {
      console.error('Failed to load tournament:', error);
      toast.error('Tournament not found');
      navigate('/sports/tournaments');
    } finally {
      setLoading(false);
    }
  };

  const checkRegistration = async () => {
    if (!user || !id) return;
    
    try {
      const { data, error } = await supabase
        .from('sports_registrations')
        .select('id')
        .eq('tournament_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setIsRegistered(true);
      }
    } catch (error) {
      console.error('Failed to check registration:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-64 bg-gray-800 rounded-lg" />
            <div className="h-8 bg-gray-800 rounded w-1/2" />
            <div className="h-4 bg-gray-800 rounded w-1/3" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!tournament) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <Dumbbell className="w-20 h-20 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl text-gray-400">Tournament not found</h2>
          <Button asChild className="mt-4">
            <Link to="/sports/tournaments">Back to Tournaments</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Banner */}
      <div className="relative h-64 md:h-80">
        {tournament.banner_url ? (
          <img 
            src={tournament.banner_url} 
            alt={tournament.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-900/60 to-teal-900/60 flex items-center justify-center">
            <Dumbbell className="w-24 h-24 text-emerald-400 opacity-50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-7xl mx-auto">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/sports/tournaments')}
              className="text-white mb-4 hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Tournaments
            </Button>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge className="bg-emerald-500 text-white">{tournament.sport_type}</Badge>
              <Badge className={
                tournament.status === 'upcoming' ? 'bg-blue-500' :
                tournament.status === 'ongoing' ? 'bg-green-500' :
                'bg-gray-500'
              }>
                {tournament.status}
              </Badge>
              {tournament.entry_fee && (
                <Badge className="bg-yellow-500 text-black">
                  {tournament.entry_fee === 'Free' ? 'Free Entry' : `₹${tournament.entry_fee} Entry`}
                </Badge>
              )}
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold text-white">{tournament.name}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-gray-800/50 border border-gray-700 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="rules">Rules</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">About this Tournament</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-300">
                      {tournament.description || 'No description provided.'}
                    </p>

                    <div className="grid md:grid-cols-2 gap-4 pt-4">
                      <div className="flex items-center gap-3 text-gray-300">
                        <Calendar className="w-5 h-5 text-emerald-400" />
                        <div>
                          <div className="text-sm text-gray-400">Date</div>
                          <div>{tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('en-IN', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          }) : 'TBA'}</div>
                        </div>
                      </div>

                      {tournament.start_time && (
                        <div className="flex items-center gap-3 text-gray-300">
                          <Clock className="w-5 h-5 text-emerald-400" />
                          <div>
                            <div className="text-sm text-gray-400">Time</div>
                            <div>{tournament.start_time}</div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-gray-300">
                        <Users className="w-5 h-5 text-emerald-400" />
                        <div>
                          <div className="text-sm text-gray-400">Team Size</div>
                          <div>{tournament.team_size === 1 ? 'Singles' : `${tournament.team_size}v${tournament.team_size}`}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-gray-300">
                        <Trophy className="w-5 h-5 text-emerald-400" />
                        <div>
                          <div className="text-sm text-gray-400">Format</div>
                          <div>{tournament.format || 'Standard'}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rules">
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Tournament Rules</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-gray-300 whitespace-pre-wrap">
                      {tournament.rules || 'Rules will be announced soon.'}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedule">
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Match Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">Schedule will be updated after registration closes.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info Card */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Prize Pool</span>
                  <span className="text-2xl font-bold text-yellow-400">{tournament.prize_pool || 'TBA'}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Entry Fee</span>
                  <span className="text-lg font-semibold text-white">
                    {tournament.entry_fee === 'Free' || !tournament.entry_fee ? 'Free' : `₹${tournament.entry_fee}`}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Participants</span>
                  <span className="text-lg font-semibold text-white">
                    {tournament.current_participants || 0}/{tournament.max_participants || '∞'}
                  </span>
                </div>

                {!user ? (
                  <Button asChild className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
                    <Link to="/auth">Login to Register</Link>
                  </Button>
                ) : isRegistered ? (
                  <Button disabled className="w-full bg-green-600">
                    ✓ Already Registered
                  </Button>
                ) : tournament.status === 'upcoming' ? (
                  <SportsRegistrationForm
                    tournamentId={tournament.id}
                    tournamentName={tournament.name}
                    entryFee={tournament.entry_fee || 'Free'}
                    onRegistrationComplete={() => setIsRegistered(true)}
                  />
                ) : (
                  <Button disabled className="w-full">
                    Registration Closed
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Venue Card */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  Venue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-white font-semibold">{tournament.venue_name || 'TBA'}</p>
                {tournament.venue_address && (
                  <p className="text-gray-400 text-sm">{tournament.venue_address}</p>
                )}
                <p className="text-emerald-400">{tournament.city}</p>
              </CardContent>
            </Card>

            {/* Organizer Card */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-400" />
                  Organizer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-white font-semibold">{tournament.organizer_name || 'Battle Mitra'}</p>
                {tournament.organizer_phone && (
                  <a 
                    href={`tel:${tournament.organizer_phone}`}
                    className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
                  >
                    <Phone className="w-4 h-4" />
                    {tournament.organizer_phone}
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SportsTournamentDetail;
