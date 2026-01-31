import { useState, useEffect } from 'react';
import { Trophy, Medal, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';

interface SportsLeaderboardEntry {
  id: string;
  player_name: string;
  sport_type: string;
  city: string | null;
  points: number | null;
  wins: number | null;
  matches_played: number | null;
  avatar_url: string | null;
}

const SportsLeaderboards = () => {
  const [leaderboard, setLeaderboard] = useState<SportsLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  const sportTypes = ['Cricket', 'Football', 'Badminton', 'Basketball', 'Kabaddi', 'Chess'];

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('sports_leaderboards')
        .select('*')
        .order('points', { ascending: false });

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeaderboard = leaderboard.filter(entry => {
    const matchesSport = sportFilter === 'all' || entry.sport_type === sportFilter;
    const matchesCity = cityFilter === 'all' || entry.city === cityFilter;
    return matchesSport && matchesCity;
  });

  const uniqueCities = [...new Set(leaderboard.map(e => e.city).filter(Boolean))];

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500 text-black';
    if (rank === 2) return 'bg-gray-400 text-black';
    if (rank === 3) return 'bg-amber-600 text-white';
    return 'bg-gray-700 text-white';
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center space-x-3">
            <Trophy className="w-10 h-10 text-yellow-400" />
            <div>
              <h1 className="text-4xl font-bold text-white">Sports Leaderboards</h1>
              <p className="text-gray-400">Top athletes in local sports competitions</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="w-[180px] bg-gray-800/50 border-gray-700 text-white">
              <SelectValue placeholder="Sport Type" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Sports</SelectItem>
              {sportTypes.map(sport => (
                <SelectItem key={sport} value={sport}>{sport}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-[180px] bg-gray-800/50 border-gray-700 text-white">
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

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-700 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-1/4" />
                    <div className="h-3 bg-gray-700 rounded w-1/6" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredLeaderboard.length > 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Medal className="w-5 h-5 text-emerald-400" />
                Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredLeaderboard.map((entry, index) => {
                  const rank = index + 1;
                  return (
                    <div 
                      key={entry.id}
                      className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                        index < 3 ? 'bg-gray-700/50 border border-emerald-500/30' : 'bg-gray-800/30 hover:bg-gray-700/30'
                      }`}
                    >
                      {/* Rank */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getRankBadgeColor(rank)}`}>
                        {rank}
                      </div>

                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700">
                        {entry.avatar_url ? (
                          <img src={entry.avatar_url} alt={entry.player_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-emerald-400 font-bold">
                            {entry.player_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Player Info */}
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{entry.player_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span className="text-emerald-400">{entry.sport_type}</span>
                          {entry.city && (
                            <>
                              <span>•</span>
                              <span>{entry.city}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="hidden md:flex gap-8 text-center">
                        <div>
                          <div className="text-lg font-bold text-emerald-400">{entry.points || 0}</div>
                          <div className="text-xs text-gray-400">Points</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-green-400">{entry.wins || 0}</div>
                          <div className="text-xs text-gray-400">Wins</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white">{entry.matches_played || 0}</div>
                          <div className="text-xs text-gray-400">Matches</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-16">
            <Target className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <h3 className="text-2xl text-gray-400 mb-2">No athletes found</h3>
            <p className="text-gray-500">Participate in tournaments to appear on the leaderboards!</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SportsLeaderboards;
