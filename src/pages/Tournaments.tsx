
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar, Users, Trophy, Gamepad, Loader2, X, PlayCircle, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';
import TournamentCardTimer from '@/components/tournament/TournamentCardTimer';
import LiveMatchScoreBadge from '@/components/tournament/LiveMatchScoreBadge';
import { useGameStore } from '@/store/gameStore';

const Tournaments = () => {
  const navigate = useNavigate();
  const { tournaments, isLoading, error, initialize } = useGameStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gameFilter, setGameFilter] = useState('all');
  const [feeFilter, setFeeFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    initialize();
  }, [initialize]);

  const filteredTournaments = tournaments.filter((tournament) => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tournament.game.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tournament.status === statusFilter;
    const matchesGame = gameFilter === 'all' || tournament.game.toLowerCase() === gameFilter.toLowerCase();
    const matchesFee = feeFilter === 'all' || 
      (feeFilter === 'free' && (!tournament.entry_fee || tournament.entry_fee === '₹0')) ||
      (feeFilter === 'paid' && tournament.entry_fee && tournament.entry_fee !== '₹0');
    const matchesRegion = regionFilter === 'all' || tournament.region === regionFilter;
    
    return matchesSearch && matchesStatus && matchesGame && matchesFee && matchesRegion;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'prize':
        return (parseInt((b.prize_pool || '0').replace(/[^\d]/g, '')) || 0) - (parseInt((a.prize_pool || '0').replace(/[^\d]/g, '')) || 0);
      case 'participants':
        return (b.current_participants || 0) - (a.current_participants || 0);
      case 'date':
        return new Date(a.start_date || '').getTime() - new Date(b.start_date || '').getTime();
      case 'newest':
      default:
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    }
  });

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setGameFilter('all');
    setFeeFilter('all');
    setRegionFilter('all');
    setSortBy('newest');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || gameFilter !== 'all' || 
                          feeFilter !== 'all' || regionFilter !== 'all' || sortBy !== 'newest';

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <span className="ml-2 text-gray-400">Loading tournaments...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-400 mb-2">Error Loading Tournaments</h3>
            <p className="text-gray-500">{error}</p>
            <Button onClick={() => initialize()} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-4">Tournaments</h1>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-2">
            Browse through our wide range of tournaments across various games and regions. Find the perfect competition to showcase your skills and win amazing prizes.
          </p>
        </div>

        {/* Filters Section */}
        <Card className="bg-gray-800 border-gray-700 mb-6 sm:mb-8">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Filter className="w-5 h-5 text-purple-400 mr-2" />
                <h2 className="text-white font-semibold">Filters</h2>
              </div>
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reset Filters
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tournaments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={gameFilter} onValueChange={setGameFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="All Games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  <SelectItem value="free fire">Free Fire</SelectItem>
                  <SelectItem value="valorant">Valorant</SelectItem>
                  <SelectItem value="apex legends">Apex Legends</SelectItem>
                  <SelectItem value="league of legends">League of Legends</SelectItem>
                  <SelectItem value="moba">MOBA</SelectItem>
                  <SelectItem value="battle royale">Battle Royale</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={feeFilter} onValueChange={setFeeFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="All Fees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fees</SelectItem>
                  <SelectItem value="free">Free Entry</SelectItem>
                  <SelectItem value="paid">Paid Entry</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="Global">Global</SelectItem>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="North America">North America</SelectItem>
                  <SelectItem value="Europe">Europe</SelectItem>
                  <SelectItem value="Asia">Asia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">
                {filteredTournaments.length} tournament{filteredTournaments.length !== 1 ? 's' : ''} found
              </p>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="date">Start Date</SelectItem>
                  <SelectItem value="prize">Prize Pool</SelectItem>
                  <SelectItem value="participants">Participants</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tournament Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredTournaments.map((tournament) => (
            <Card key={tournament.id} className="bg-gray-800 border-gray-700 hover:border-purple-500/50 transition-all duration-300 group cursor-pointer">
              <div className="aspect-video relative overflow-hidden rounded-t-lg">
                {tournament.banner ? (
                  <img 
                    src={tournament.banner} 
                    alt={tournament.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-900/30 to-blue-900/30"></div>
                )}
                <div className="absolute inset-0 bg-black/20"></div>
                
                {/* Status and Game Tags */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge className={`flex items-center gap-1.5 px-3 py-1 text-sm font-bold
                    ${tournament.status === 'ongoing' ? 'bg-green-500 text-white animate-pulse' : 
                      tournament.status === 'upcoming' ? 'bg-blue-500 text-white' : 
                      'bg-gray-500 text-white'}
                  `}>
                    {tournament.status === 'ongoing' && <PlayCircle className="w-3.5 h-3.5" />}
                    {tournament.status === 'upcoming' && <Clock className="w-3.5 h-3.5" />}
                    {tournament.status === 'completed' && <CheckCircle className="w-3.5 h-3.5" />}
                    {tournament.status === 'ongoing' ? '🔴 LIVE' : tournament.status.toUpperCase()}
                  </Badge>
                  <Badge variant="secondary" className="bg-purple-500 text-white">
                    {tournament.game || 'battle-royale'}
                  </Badge>
                </div>
                
                {/* Entry Fee */}
                {tournament.entry_fee && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-green-500 text-white">
                      Entry: {tournament.entry_fee}
                    </Badge>
                  </div>
                )}

                {/* Live 1v1 Scores */}
                <div className="absolute bottom-4 left-4">
                  <LiveMatchScoreBadge tournamentId={tournament.id} />
                  <TournamentCardTimer tournament={tournament} />
                </div>
                
                {/* Prize Pool */}
                
                {/* Prize Pool */}
                <div className="absolute bottom-4 right-4">
                  <Badge className="bg-yellow-500 text-black font-bold">
                    {tournament.prize_pool}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="p-4 sm:p-5 md:p-6">
                <h3 className="text-white font-bold text-lg mb-2 group-hover:text-purple-400 transition-colors line-clamp-1">
                  {tournament.name}
                </h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {tournament.status === 'ongoing' ? (
                    <span className="text-green-400 font-medium">🔴 Currently in progress</span>
                  ) : tournament.status === 'completed' ? (
                    <span className="text-gray-500">Ended {new Date(tournament.end_date).toLocaleDateString()}</span>
                  ) : (
                    <>Starts {new Date(tournament.start_date).toLocaleDateString()}</>
                  )}
                </p>
                
                <div className="grid grid-cols-3 gap-2 mb-4 text-center text-sm">
                  <div>
                    <p className="text-gray-400">Prize Pool</p>
                    <p className="text-white font-semibold">{tournament.prize_pool}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Participants</p>
                    <p className="text-white font-semibold">{tournament.current_participants}/{tournament.max_participants}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Region</p>
                    <p className="text-white font-semibold">{tournament.region || 'Global'}</p>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                  onClick={() => navigate(`/tournaments/${tournament.id}`)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTournaments.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No tournaments found</h3>
            <p className="text-gray-500">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tournaments;
