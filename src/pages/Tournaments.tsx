
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Calendar, Users, Trophy, Gamepad, Loader2, X, PlayCircle, Clock, CheckCircle, ChevronRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';
import TournamentCardTimer from '@/components/tournament/TournamentCardTimer';
import LiveMatchScoreBadge from '@/components/tournament/LiveMatchScoreBadge';
import { useGameStore } from '@/store/gameStore';
import { isTournamentRegistrationClosed } from '@/types';

type TournamentStatusTab = 'upcoming' | 'live' | 'past';

const Tournaments = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tournaments, isLoading, error, initialize } = useGameStore();

  // Status Tab: Upcoming (1st) | Live (2nd) | Past (3rd) in exact requested order
  const [statusTab, setStatusTab] = useState<TournamentStatusTab>(() => {
    const tabParam = searchParams.get('tab') || searchParams.get('status');
    if (tabParam === 'live' || tabParam === 'ongoing') return 'live';
    if (tabParam === 'past' || tabParam === 'completed') return 'past';
    return 'upcoming';
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [gameFilter, setGameFilter] = useState('all');
  const [feeFilter, setFeeFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Sync tab with URL query parameter
  const handleTabChange = (newTab: TournamentStatusTab) => {
    setStatusTab(newTab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', newTab);
        return next;
      },
      { replace: true }
    );
  };

  // Helper functions for tournament status classification
  const isUpcoming = (status?: string | null) => {
    if (!status) return true;
    const s = status.toLowerCase();
    return s === 'upcoming' || s === 'closed' || s === 'full';
  };

  const isLive = (status?: string | null) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return s === 'ongoing' || s === 'live';
  };

  const isPast = (status?: string | null) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return s === 'completed' || s === 'past' || s === 'finished' || s === 'ended';
  };

  // Live counts for the 3 tabs
  const upcomingCount = tournaments.filter((t) => isUpcoming(t.status)).length;
  const liveCount = tournaments.filter((t) => isLive(t.status)).length;
  const pastCount = tournaments.filter((t) => isPast(t.status)).length;

  // Extract unique games
  const availableGames = Array.from(
    new Set([
      'Free Fire',
      'BGMI',
      'Valorant',
      'Apex Legends',
      'League of Legends',
      ...tournaments.map((t) => t.game).filter(Boolean),
    ])
  );

  const filteredTournaments = tournaments
    .filter((tournament) => {
      // 1. Status Filter by Tab
      let matchesStatus = false;
      if (statusTab === 'upcoming') {
        matchesStatus = isUpcoming(tournament.status);
      } else if (statusTab === 'live') {
        matchesStatus = isLive(tournament.status);
      } else if (statusTab === 'past') {
        matchesStatus = isPast(tournament.status);
      }

      // 2. Search Filter
      const matchesSearch =
        tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tournament.game.toLowerCase().includes(searchTerm.toLowerCase());

      // 3. Game Filter
      const matchesGame =
        gameFilter === 'all' ||
        tournament.game.toLowerCase() === gameFilter.toLowerCase();

      // 4. Entry Fee Filter
      const matchesFee =
        feeFilter === 'all' ||
        (feeFilter === 'free' &&
          (!tournament.entry_fee ||
            tournament.entry_fee === '₹0' ||
            tournament.entry_fee === '0' ||
            tournament.entry_fee.toLowerCase() === 'free')) ||
        (feeFilter === 'paid' &&
          tournament.entry_fee &&
          tournament.entry_fee !== '₹0' &&
          tournament.entry_fee !== '0' &&
          tournament.entry_fee.toLowerCase() !== 'free');

      // 5. Region Filter
      const matchesRegion =
        regionFilter === 'all' || tournament.region === regionFilter;

      return (
        matchesStatus &&
        matchesSearch &&
        matchesGame &&
        matchesFee &&
        matchesRegion
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'prize':
          return (
            (parseInt((b.prize_pool || '0').replace(/[^\d]/g, '')) || 0) -
            (parseInt((a.prize_pool || '0').replace(/[^\d]/g, '')) || 0)
          );
        case 'participants':
          return (b.current_participants || 0) - (a.current_participants || 0);
        case 'date':
          if (statusTab === 'past') {
            return (
              new Date(b.end_date || b.start_date || '').getTime() -
              new Date(a.end_date || a.start_date || '').getTime()
            );
          }
          return (
            new Date(a.start_date || '').getTime() -
            new Date(b.start_date || '').getTime()
          );
        case 'newest':
        default:
          if (statusTab === 'past') {
            return (
              new Date(b.end_date || b.start_date || b.created_at || '').getTime() -
              new Date(a.end_date || a.start_date || a.created_at || '').getTime()
            );
          }
          return (
            new Date(b.created_at || '').getTime() -
            new Date(a.created_at || '').getTime()
          );
      }
    });

  const clearFilters = () => {
    setSearchTerm('');
    setGameFilter('all');
    setFeeFilter('all');
    setRegionFilter('all');
    setSortBy('newest');
  };

  const hasActiveFilters =
    searchTerm ||
    gameFilter !== 'all' ||
    feeFilter !== 'all' ||
    regionFilter !== 'all' ||
    sortBy !== 'newest';

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
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">
            Tournaments
          </h1>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-2">
            Browse through our wide range of tournaments. Switch between upcoming events, watch live competitions, or explore past champions.
          </p>
        </div>

        {/* =========================================================================
            STATUS TABS (Upcoming -> Live -> Past in exact requested order)
            ========================================================================= */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-900/90 p-1.5 rounded-2xl border border-gray-700/80 shadow-2xl backdrop-blur-md w-full max-w-2xl">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {/* 1. Upcoming (first tab) – Tournaments scheduled for the future */}
              <button
                type="button"
                onClick={() => handleTabChange('upcoming')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2.5 py-3 px-2 sm:px-5 rounded-xl font-bold text-xs sm:text-base transition-all duration-300 ${
                  statusTab === 'upcoming'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-400/40'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <Clock
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    statusTab === 'upcoming' ? 'text-blue-200' : 'text-gray-400'
                  }`}
                />
                <span>Upcoming</span>
                <span
                  className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                    statusTab === 'upcoming'
                      ? 'bg-blue-400/30 text-white'
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}
                >
                  {upcomingCount}
                </span>
              </button>

              {/* 2. Live (second tab) – Tournaments currently in progress */}
              <button
                type="button"
                onClick={() => handleTabChange('live')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2.5 py-3 px-2 sm:px-5 rounded-xl font-bold text-xs sm:text-base transition-all duration-300 ${
                  statusTab === 'live'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/30 ring-1 ring-red-400/40'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-red-500"></span>
                </span>
                <span>Live</span>
                <span
                  className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                    statusTab === 'live'
                      ? 'bg-red-400/30 text-white'
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}
                >
                  {liveCount}
                </span>
              </button>

              {/* 3. Past (third tab) – Completed tournaments */}
              <button
                type="button"
                onClick={() => handleTabChange('past')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2.5 py-3 px-2 sm:px-5 rounded-xl font-bold text-xs sm:text-base transition-all duration-300 ${
                  statusTab === 'past'
                    ? 'bg-gradient-to-r from-purple-600 to-slate-700 text-white shadow-lg shadow-purple-500/30 ring-1 ring-purple-400/40'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <CheckCircle
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    statusTab === 'past' ? 'text-purple-200' : 'text-gray-400'
                  }`}
                />
                <span>Past</span>
                <span
                  className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                    statusTab === 'past'
                      ? 'bg-purple-400/30 text-white'
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}
                >
                  {pastCount}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Context Banner */}
        <div className="text-center mb-6 text-xs sm:text-sm text-gray-400 flex items-center justify-center gap-2">
          {statusTab === 'upcoming' && (
            <>
              <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>
                Showing <strong className="text-blue-300">Upcoming Tournaments</strong> scheduled for the future — open for registrations.
              </span>
            </>
          )}
          {statusTab === 'live' && (
            <>
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span>
                Showing <strong className="text-red-400">Live Tournaments</strong> currently in progress with active matches and standings.
              </span>
            </>
          )}
          {statusTab === 'past' && (
            <>
              <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span>
                Showing <strong className="text-purple-300">Past Tournaments</strong> completed — view final match results and champions.
              </span>
            </>
          )}
        </div>

        {/* Filters Section */}
        <Card className="bg-gray-800/90 border-gray-700 mb-6 sm:mb-8 backdrop-blur-sm shadow-xl">
          <CardContent className="p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Filter className="w-5 h-5 text-purple-400 mr-2" />
                <h2 className="text-white font-semibold capitalize">Filter {statusTab} Tournaments</h2>
              </div>
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="text-gray-400 hover:text-white hover:bg-gray-700/50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reset Filters
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or game..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-gray-700/80 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                />
              </div>
              
              {/* Game Filter */}
              <Select value={gameFilter} onValueChange={setGameFilter}>
                <SelectTrigger className="bg-gray-700/80 border-gray-600 text-white">
                  <SelectValue placeholder="All Games" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="all">All Games</SelectItem>
                  {availableGames.map((game) => (
                    <SelectItem key={game} value={game.toLowerCase()}>{game}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Fee Filter */}
              <Select value={feeFilter} onValueChange={setFeeFilter}>
                <SelectTrigger className="bg-gray-700/80 border-gray-600 text-white">
                  <SelectValue placeholder="All Fees" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="all">All Fees</SelectItem>
                  <SelectItem value="free">Free Entry</SelectItem>
                  <SelectItem value="paid">Paid Entry</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Region Filter */}
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="bg-gray-700/80 border-gray-600 text-white">
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="Global">Global</SelectItem>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="North America">North America</SelectItem>
                  <SelectItem value="Europe">Europe</SelectItem>
                  <SelectItem value="Asia">Asia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
              <p className="text-gray-400 text-sm">
                Showing <span className="text-white font-semibold">{filteredTournaments.length}</span> {statusTab} tournament{filteredTournaments.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs sm:text-sm hidden sm:inline">Sort:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 bg-gray-700/80 border-gray-600 text-white text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="date">{statusTab === 'past' ? 'Recently Ended' : 'Start Date'}</SelectItem>
                    <SelectItem value="prize">Prize Pool</SelectItem>
                    <SelectItem value="participants">Participants</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tournament Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredTournaments.map((tournament) => {
            const isTournamentLive = isLive(tournament.status);
            const isTournamentPast = isPast(tournament.status);
            const isTournamentClosed = !isTournamentLive && !isTournamentPast && isTournamentRegistrationClosed(tournament);

            return (
              <Card 
                key={tournament.id} 
                className="bg-gray-800 border-gray-700 hover:border-purple-500/50 transition-all duration-300 group cursor-pointer flex flex-col justify-between overflow-hidden shadow-lg hover:shadow-purple-500/10"
              >
                <div>
                  <div className="aspect-video relative overflow-hidden rounded-t-lg bg-gray-900">
                    {(tournament.banner || tournament.banner_url || tournament.image || tournament.image_url) ? (
                      <img 
                        key={tournament.banner || tournament.banner_url || tournament.image || tournament.image_url}
                        src={tournament.banner || tournament.banner_url || tournament.image || tournament.image_url} 
                        alt={tournament.name}
                        loading="eager"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-900/30 to-blue-900/30 flex items-center justify-center">
                        <Trophy className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/25"></div>
                    
                    {/* Status and Game Tags */}
                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex gap-2 flex-wrap">
                      <Badge className={`flex items-center gap-1.5 px-3 py-1 text-xs sm:text-sm font-bold shadow-md
                        ${isTournamentLive ? 'bg-red-600 text-white animate-pulse ring-1 ring-white/30' : 
                          isTournamentPast ? 'bg-gray-700/90 text-gray-200 backdrop-blur-sm' : 
                          isTournamentClosed ? 'bg-amber-600 text-white border border-amber-400/40 shadow-amber-500/20' :
                          'bg-blue-600 text-white'}
                      `}>
                        {isTournamentLive && (
                          <>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            LIVE NOW
                          </>
                        )}
                        {isTournamentPast && (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            COMPLETED
                          </>
                        )}
                        {!isTournamentLive && !isTournamentPast && isTournamentClosed && (
                          <>
                            <Lock className="w-3.5 h-3.5 text-amber-200" />
                            FULL / CLOSED
                          </>
                        )}
                        {!isTournamentLive && !isTournamentPast && !isTournamentClosed && (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            UPCOMING
                          </>
                        )}
                      </Badge>
                      <Badge variant="secondary" className="bg-purple-600/90 text-white backdrop-blur-sm text-xs font-semibold">
                        {tournament.game || 'Esports'}
                      </Badge>
                    </div>
                    
                    {/* Entry Fee */}
                    {tournament.entry_fee && (
                      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                        <Badge className="bg-emerald-600 text-white font-bold shadow-md">
                          Entry: {tournament.entry_fee}
                        </Badge>
                      </div>
                    )}

                    {/* Live 1v1 Scores */}
                    <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
                      <LiveMatchScoreBadge tournamentId={tournament.id} />
                      <TournamentCardTimer tournament={tournament} />
                    </div>

                    {/* Prize Pool */}
                    <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4">
                      <Badge className="bg-yellow-500 text-black font-extrabold shadow-md">
                        {tournament.prize_pool || '₹0'}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardContent className="p-4 sm:p-5 md:p-6 pb-4">
                    <h3 className="text-white font-bold text-lg mb-2 group-hover:text-purple-400 transition-colors line-clamp-1">
                      {tournament.name}
                    </h3>
                    <p className="text-sm mb-4 line-clamp-2">
                      {isTournamentLive ? (
                        <span className="text-red-400 font-semibold flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                          Currently in progress
                        </span>
                      ) : isTournamentPast ? (
                        <span className="text-gray-400 font-medium">
                          Ended {tournament.end_date ? new Date(tournament.end_date).toLocaleDateString() : 'Recently'}
                        </span>
                      ) : (
                        <span className="text-blue-400 font-medium flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Starts {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : 'TBA'}
                          {tournament.start_time ? ` at ${tournament.start_time}` : ''}
                        </span>
                      )}
                    </p>
                    
                    <div className="grid grid-cols-3 gap-2 mb-2 text-center text-sm bg-gray-900/40 p-2.5 rounded-lg border border-gray-700/50">
                      <div>
                        <p className="text-gray-400 text-xs">Prize Pool</p>
                        <p className="text-white font-semibold text-xs sm:text-sm truncate">{tournament.prize_pool || '₹0'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Participants</p>
                        <p className={`font-semibold text-xs sm:text-sm ${isTournamentClosed ? 'text-amber-400 font-bold' : 'text-white'}`}>
                          {tournament.current_participants || 0}/{tournament.max_participants || 0}
                          {isTournamentClosed && <span className="ml-1 text-[10px] text-amber-300 font-extrabold uppercase">(Full)</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Region</p>
                        <p className="text-white font-semibold text-xs sm:text-sm truncate">{tournament.region || 'Global'}</p>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 sm:p-5 md:p-6 pt-0">
                  <Button 
                    className={`w-full font-bold transition-all shadow-md ${
                      isTournamentLive
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-red-500/20'
                        : isTournamentPast
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-100 hover:text-white'
                        : isTournamentClosed
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-500/20'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-blue-500/20'
                    }`}
                    onClick={() => navigate(`/tournaments/${tournament.id}`)}
                  >
                    <span>
                      {isTournamentLive
                        ? 'Watch & View Details'
                        : isTournamentPast
                        ? 'View Final Standings'
                        : isTournamentClosed
                        ? 'View Details (Full)'
                        : 'View Details & Register'}
                    </span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Empty State Tailored to Active Tab */}
        {filteredTournaments.length === 0 && (
          <div className="text-center py-16 px-4 bg-gray-800/40 border border-gray-700/60 rounded-2xl my-8">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4 border border-gray-700 shadow-inner">
              {statusTab === 'upcoming' && <Clock className="w-8 h-8 text-blue-400" />}
              {statusTab === 'live' && <PlayCircle className="w-8 h-8 text-red-400" />}
              {statusTab === 'past' && <Trophy className="w-8 h-8 text-purple-400" />}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {statusTab === 'upcoming' && 'No Upcoming Tournaments Found'}
              {statusTab === 'live' && 'No Live Tournaments Right Now'}
              {statusTab === 'past' && 'No Past Tournaments Found'}
            </h3>
            <p className="text-gray-400 max-w-md mx-auto mb-6 text-sm">
              {hasActiveFilters
                ? `No ${statusTab} tournaments match your current search and filter criteria. Try resetting your filters.`
                : statusTab === 'upcoming'
                ? 'There are currently no upcoming tournaments scheduled. Check back soon for new announcements!'
                : statusTab === 'live'
                ? 'There are currently no live tournaments running right now. Switch over to the Upcoming tab to register for next events!'
                : 'Completed tournaments and winner archives will appear here once matches finish.'}
            </p>
            {hasActiveFilters ? (
              <Button
                onClick={clearFilters}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <X className="w-4 h-4 mr-1" />
                Reset Filters
              </Button>
            ) : statusTab === 'live' ? (
              <Button
                onClick={() => handleTabChange('upcoming')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Clock className="w-4 h-4 mr-2" />
                View Upcoming Tournaments
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tournaments;
