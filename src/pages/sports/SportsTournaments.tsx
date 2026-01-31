import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Search, MapPin, Calendar, Users, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Layout from '@/components/layout/Layout';
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
}

const SportsTournaments = () => {
  const [tournaments, setTournaments] = useState<SportsTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  const sportTypes = ['Cricket', 'Football', 'Badminton', 'Basketball', 'Kabaddi', 'Chess', 'Athletics', 'Tennis', 'Volleyball', 'Hockey'];

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('sports_tournaments')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTournaments = tournaments.filter(tournament => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tournament.sport_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tournament.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport = sportFilter === 'all' || tournament.sport_type === sportFilter;
    const matchesStatus = statusFilter === 'all' || tournament.status === statusFilter;
    const matchesCity = cityFilter === 'all' || tournament.city === cityFilter;
    
    return matchesSearch && matchesSport && matchesStatus && matchesCity;
  });

  const uniqueCities = [...new Set(tournaments.map(t => t.city).filter(Boolean))];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center space-x-3">
            <Trophy className="w-10 h-10 text-emerald-400" />
            <div>
              <h1 className="text-4xl font-bold text-white">Sports Tournaments</h1>
              <p className="text-gray-400">Find and join local sports competitions</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search tournaments, sports, or cities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800/50 border-gray-700 text-white"
            />
          </div>
          
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
              <SelectValue placeholder="Sport Type" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Sports</SelectItem>
              {sportTypes.map(sport => (
                <SelectItem key={sport} value={sport}>{sport}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Cities</SelectItem>
              {uniqueCities.map(city => (
                <SelectItem key={city} value={city!}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tournaments Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="bg-gray-800/50 border-gray-700 animate-pulse">
                <div className="aspect-video bg-gray-700" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-6 bg-gray-700 rounded w-3/4" />
                  <div className="h-4 bg-gray-700 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTournaments.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => (
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
                    <span className={`px-2 py-1 text-white text-xs font-medium rounded-full ${
                      tournament.status === 'upcoming' ? 'bg-blue-500/90' :
                      tournament.status === 'ongoing' ? 'bg-green-500/90' :
                      'bg-gray-500/90'
                    }`}>
                      {tournament.status}
                    </span>
                  </div>
                  {tournament.entry_fee && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-1 bg-yellow-500/90 text-black text-xs font-bold rounded-full">
                        {tournament.entry_fee === 'Free' ? 'Free' : `₹${tournament.entry_fee}`}
                      </span>
                    </div>
                  )}
                </div>
                
                <CardContent className="p-4">
                  <h3 className="text-white font-bold text-lg mb-2 group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {tournament.name}
                  </h3>
                  
                  {tournament.venue_name && (
                    <div className="flex items-center text-sm text-gray-400 mb-2">
                      <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span className="line-clamp-1">{tournament.venue_name}, {tournament.city}</span>
                    </div>
                  )}
                  
                  {tournament.start_date && (
                    <div className="flex items-center text-sm text-gray-400 mb-2">
                      <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                      {new Date(tournament.start_date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                  )}

                  {tournament.team_size && (
                    <div className="flex items-center text-sm text-gray-400 mb-3">
                      <Users className="w-4 h-4 mr-1 flex-shrink-0" />
                      {tournament.team_size === 1 ? 'Singles' : `${tournament.team_size}v${tournament.team_size}`}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <div className="text-sm text-gray-400">Prize Pool</div>
                      <div className="text-lg font-bold text-yellow-400">{tournament.prize_pool || 'TBA'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Slots</div>
                      <div className="text-lg font-bold text-white">
                        {tournament.current_participants || 0}/{tournament.max_participants || '∞'}
                      </div>
                    </div>
                  </div>
                  
                  <Button asChild className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
                    <Link to={`/sports/tournaments/${tournament.id}`}>
                      {tournament.status === 'upcoming' ? 'Register Now' : 'View Details'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Dumbbell className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <h3 className="text-2xl text-gray-400 mb-2">No tournaments found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or check back later for new tournaments.</p>
            <Button onClick={() => {
              setSearchTerm('');
              setSportFilter('all');
              setStatusFilter('all');
              setCityFilter('all');
            }} variant="outline" className="border-emerald-500 text-emerald-400">
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SportsTournaments;
