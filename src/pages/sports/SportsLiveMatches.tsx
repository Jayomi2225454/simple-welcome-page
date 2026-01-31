import { useState, useEffect } from 'react';
import { PlayCircle, MapPin, Clock, Users, Dumbbell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';

interface SportsLiveMatch {
  id: string;
  tournament_id: string | null;
  tournament_name: string;
  sport_type: string;
  team_1: string;
  team_2: string;
  score_1: number | null;
  score_2: number | null;
  status: string | null;
  venue_name: string | null;
  city: string | null;
  start_time: string | null;
  match_phase: string | null;
}

const SportsLiveMatches = () => {
  const [matches, setMatches] = useState<SportsLiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sportFilter, setSportFilter] = useState('all');

  const sportTypes = ['Cricket', 'Football', 'Badminton', 'Basketball', 'Kabaddi', 'Chess'];

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('sports_live_matches')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Failed to load matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter(match => {
    const matchesStatus = statusFilter === 'all' || match.status === statusFilter;
    const matchesSport = sportFilter === 'all' || match.sport_type === sportFilter;
    return matchesStatus && matchesSport;
  });

  const liveMatches = filteredMatches.filter(m => m.status === 'live');
  const upcomingMatches = filteredMatches.filter(m => m.status === 'upcoming');
  const completedMatches = filteredMatches.filter(m => m.status === 'completed');

  const MatchCard = ({ match }: { match: SportsLiveMatch }) => (
    <Card className={`bg-gray-800/50 border-gray-700 hover:border-emerald-500/50 transition-all ${
      match.status === 'live' ? 'border-red-500/50' : ''
    }`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            {match.sport_type}
          </Badge>
          {match.status === 'live' && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 text-sm font-semibold">LIVE</span>
            </div>
          )}
          {match.status === 'upcoming' && (
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              Upcoming
            </Badge>
          )}
          {match.status === 'completed' && (
            <Badge variant="outline" className="text-gray-400 border-gray-500">
              Completed
            </Badge>
          )}
        </div>

        <h3 className="text-white font-semibold mb-2">{match.tournament_name}</h3>

        {/* Teams & Score */}
        <div className="flex items-center justify-between my-6">
          <div className="text-center flex-1">
            <div className="w-12 h-12 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-white font-semibold">{match.team_1}</div>
          </div>

          <div className="text-center px-4">
            <div className="text-3xl font-bold text-white">
              {match.score_1 ?? 0} - {match.score_2 ?? 0}
            </div>
            {match.match_phase && (
              <div className="text-sm text-emerald-400 mt-1">{match.match_phase}</div>
            )}
          </div>

          <div className="text-center flex-1">
            <div className="w-12 h-12 mx-auto bg-teal-500/20 rounded-full flex items-center justify-center mb-2">
              <Users className="w-6 h-6 text-teal-400" />
            </div>
            <div className="text-white font-semibold">{match.team_2}</div>
          </div>
        </div>

        {/* Match Info */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
          {match.venue_name && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {match.venue_name}, {match.city}
            </div>
          )}
          {match.start_time && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {new Date(match.start_time).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center space-x-3">
            <PlayCircle className="w-10 h-10 text-red-400" />
            <div>
              <h1 className="text-4xl font-bold text-white">Live Matches</h1>
              <p className="text-gray-400">Follow live scores and match updates</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-gray-800/50 border-gray-700 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Matches</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="w-[180px] bg-gray-800/50 border-gray-700 text-white">
              <SelectValue placeholder="Sport" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Sports</SelectItem>
              {sportTypes.map(sport => (
                <SelectItem key={sport} value={sport}>{sport}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-gray-800/50 border-gray-700 animate-pulse">
                <CardContent className="p-6 space-y-4">
                  <div className="h-6 bg-gray-700 rounded w-1/3" />
                  <div className="h-20 bg-gray-700 rounded" />
                  <div className="h-4 bg-gray-700 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMatches.length > 0 ? (
          <div className="space-y-8">
            {/* Live Matches */}
            {liveMatches.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  Live Now
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {liveMatches.map(match => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Matches */}
            {upcomingMatches.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Upcoming</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {upcomingMatches.map(match => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Matches */}
            {completedMatches.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Recent Results</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {completedMatches.map(match => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <Dumbbell className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <h3 className="text-2xl text-gray-400 mb-2">No matches found</h3>
            <p className="text-gray-500">Check back during match times for live score updates!</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SportsLiveMatches;
