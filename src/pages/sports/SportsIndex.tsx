import { Link } from 'react-router-dom';
import { Trophy, Users, DollarSign, Dumbbell, ArrowRight, PlayCircle, MapPin, Calendar, Target, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { sponsorService, Sponsor } from '@/services/sponsorService';
import { useState, useEffect } from 'react';
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
  status: string | null;
  venue_name: string | null;
  city: string | null;
  banner_url: string | null;
  entry_fee: string | null;
}

const SportsIndex = () => {
  const { user } = useAuth();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [tournaments, setTournaments] = useState<SportsTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const sponsorsData = await sponsorService.getSponsors();
        setSponsors(sponsorsData);

        // Fetch upcoming tournaments from database
        const { data, error } = await supabase
          .from('sports_tournaments')
          .select('*')
          .eq('status', 'upcoming')
          .order('start_date', { ascending: true })
          .limit(4);

        if (error) throw error;
        setTournaments(data || []);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const stats = [
    {
      label: 'Local Matches',
      value: '200+',
      icon: Trophy,
      color: 'text-emerald-400',
    },
    {
      label: 'Athletes',
      value: '5k+',
      icon: Users,
      color: 'text-teal-400',
    },
    {
      label: 'Prize Pool',
      value: '₹500k+',
      icon: DollarSign,
      color: 'text-green-400',
    },
    {
      label: 'Sport Categories',
      value: '10+',
      icon: Dumbbell,
      color: 'text-cyan-400',
    },
  ];

  const sportCategories = [
    { name: 'Cricket', icon: '🏏', matches: 85 },
    { name: 'Football', icon: '⚽', matches: 64 },
    { name: 'Badminton', icon: '🏸', matches: 42 },
    { name: 'Basketball', icon: '🏀', matches: 28 },
    { name: 'Kabaddi', icon: '🤼', matches: 21 },
    { name: 'Chess', icon: '♟️', matches: 35 },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-teal-900/20" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d')] bg-cover bg-center opacity-10" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Play. Sweat.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                Glory.
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Join local tournaments for Cricket, Football, Badminton, and more. 
              Compete with real players, win real prizes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <>
                  <Button 
                    asChild
                    size="lg" 
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-lg px-8 py-6"
                  >
                    <Link to="/sports/tournaments">Join a Tournament Now!</Link>
                  </Button>
                  <Button 
                    asChild
                    variant="outline" 
                    size="lg" 
                    className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 text-lg px-8 py-6"
                  >
                    <Link to="/sports/tournaments">Browse Tournaments</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    asChild
                    size="lg" 
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-lg px-8 py-6"
                  >
                    <Link to="/auth">Sign Up Now!</Link>
                  </Button>
                  <Button 
                    asChild
                    variant="outline" 
                    size="lg" 
                    className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 text-lg px-8 py-6"
                  >
                    <Link to="/auth">Login</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <Card key={stat.label} className="bg-gray-800/50 border-gray-700 hover:border-emerald-500/50 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <stat.icon className={`w-12 h-12 mx-auto mb-4 ${stat.color}`} />
                  <div className={`text-3xl font-bold mb-2 ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sport Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Popular Sports</h2>
            <p className="text-gray-400">Choose your sport and start competing</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {sportCategories.map((sport) => (
              <Card key={sport.name} className="bg-gray-800/50 border-gray-700 hover:border-emerald-500/50 transition-all duration-300 cursor-pointer group">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">{sport.icon}</div>
                  <h3 className="text-white font-semibold mb-1 group-hover:text-emerald-400 transition-colors">{sport.name}</h3>
                  <div className="text-sm text-gray-400">{sport.matches} matches</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Tournaments */}
      <section className="py-16 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center space-x-3">
              <Trophy className="w-8 h-8 text-emerald-400" />
              <h2 className="text-4xl font-bold text-white">Upcoming Tournaments</h2>
            </div>
            <Button asChild variant="outline" className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10">
              <Link to="/sports/tournaments" className="inline-flex items-center">
                View All <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
          
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-gray-800/50 border-gray-700 animate-pulse">
                  <div className="aspect-video bg-gray-700" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-6 bg-gray-700 rounded w-3/4" />
                    <div className="h-4 bg-gray-700 rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tournaments.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {tournaments.map((tournament) => (
                <Card key={tournament.id} className="bg-gray-800/50 border-gray-700 hover:border-emerald-500/50 transition-all duration-300 group overflow-hidden">
                  <div className="relative aspect-video overflow-hidden">
                    {tournament.banner_url ? (
                      <img 
                        src={tournament.banner_url} 
                        alt={tournament.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-900/40 to-teal-900/40 flex items-center justify-center">
                        <Dumbbell className="w-12 h-12 text-emerald-400" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-emerald-500/90 text-white text-xs font-medium rounded-full">
                        {tournament.sport_type}
                      </span>
                      {tournament.entry_fee && tournament.entry_fee !== 'Free' && (
                        <span className="px-2 py-1 bg-teal-500/90 text-white text-xs font-medium rounded-full">
                          ₹{tournament.entry_fee}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="text-white font-bold text-lg mb-2 group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {tournament.name}
                    </h3>
                    
                    {tournament.venue_name && (
                      <div className="flex items-center text-sm text-gray-400 mb-2">
                        <MapPin className="w-4 h-4 mr-1" />
                        {tournament.venue_name}, {tournament.city}
                      </div>
                    )}
                    
                    {tournament.start_date && (
                      <div className="flex items-center text-sm text-gray-400 mb-3">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(tournament.start_date).toLocaleDateString()}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <div className="text-sm text-gray-400">Prize Pool</div>
                        <div className="text-lg font-bold text-yellow-400">{tournament.prize_pool || 'TBA'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Participants</div>
                        <div className="text-lg font-bold text-white">
                          {tournament.current_participants || 0}/{tournament.max_participants || '∞'}
                        </div>
                      </div>
                    </div>
                    
                    <Button asChild className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
                      <Link to={`/sports/tournaments/${tournament.id}`}>Register Now</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Dumbbell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl text-gray-400 mb-2">No upcoming tournaments</h3>
              <p className="text-gray-500">Check back soon for new sports tournaments!</p>
            </div>
          )}
        </div>
      </section>

      {/* Live Matches */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center space-x-3">
              <PlayCircle className="w-8 h-8 text-red-400" />
              <h2 className="text-4xl font-bold text-white">Live Matches</h2>
            </div>
            <Button asChild variant="outline" className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10">
              <Link to="/sports/live-matches" className="inline-flex items-center">
                View All <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
          
          <div className="text-center py-12 bg-gray-800/30 rounded-lg">
            <PlayCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl text-gray-400 mb-2">No live matches right now</h3>
            <p className="text-gray-500">Check back during match times for live score updates!</p>
          </div>
        </div>
      </section>

      {/* Top Athletes */}
      <section className="py-16 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center space-x-3">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <h2 className="text-4xl font-bold text-white">Top Athletes</h2>
            </div>
            <Button asChild variant="outline" className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10">
              <Link to="/sports/leaderboards" className="inline-flex items-center">
                View Full Leaderboards <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
          
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl text-gray-400 mb-2">Leaderboards coming soon</h3>
            <p className="text-gray-500">Compete in tournaments to appear on the leaderboards!</p>
          </div>
        </div>
      </section>

      {/* Sponsors */}
      {sponsors.length > 0 && (
        <section className="py-20 relative overflow-hidden bg-gradient-to-b from-gray-900/50 to-black/50">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl mb-6 shadow-lg">
                <Building className="w-6 h-6 text-white" />
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                  Our Partners
                </span>
              </h2>
              
              <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                Partnering with leading sports brands to bring you the best experience
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {sponsors.map((sponsor) => (
                <div key={sponsor.id} className="bg-gray-800/50 border-2 border-emerald-500/30 rounded-2xl p-6 h-24 flex items-center justify-center hover:border-emerald-400/50 transition-all duration-300">
                  {sponsor.logo ? (
                    <img src={sponsor.logo} alt={sponsor.name} className="max-h-12 max-w-full object-contain" />
                  ) : (
                    <span className="text-white font-semibold">{sponsor.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
};

export default SportsIndex;
