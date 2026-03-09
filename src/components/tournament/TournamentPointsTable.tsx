import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Target, Users, Search, Filter, Image, Crown, Flame, Swords, Medal, ChevronDown, ChevronUp, User, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

interface PointEntry {
  id: string;
  team_id: string;
  team_name: string;
  group_name: string | null;
  points: number;
  kills: number;
  wins: number;
  position: number;
  position_in_group: number | null;
  match_number: number;
}

interface AggregatedEntry {
  team_id: string;
  team_name: string;
  group_name: string | null;
  points: number;
  kills: number;
  wins: number;
  position: number;
  position_in_group: number | null;
  matchBreakdown: { match_number: number; points: number; kills: number; wins: number }[];
}

interface PlayerPoint {
  id: string;
  player_name: string;
  kills: number;
  wins: number;
  points: number;
  team_id: string;
  user_id: string;
}

interface TournamentPointsTableProps {
  tournamentId: string;
}

// Top 3 Podium
const TopThreePodium = ({ entries }: { entries: AggregatedEntry[] }) => {
  const top3 = entries.slice(0, 3);
  if (top3.length === 0) return null;

  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podiumHeights = ['h-24', 'h-32', 'h-20'];
  const podiumColors = ['from-gray-400 to-gray-500', 'from-yellow-400 to-amber-500', 'from-amber-600 to-amber-700'];
  const borderColors = ['border-gray-400/50', 'border-yellow-400/50', 'border-amber-600/50'];
  const sizes = ['w-14 h-14', 'w-18 h-18 md:w-20 md:h-20', 'w-12 h-12'];
  const textSizes = ['text-base', 'text-xl', 'text-sm'];

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4 md:gap-6 mb-6 px-2">
      {podiumOrder.map((entry, idx) => {
        if (!entry) return null;
        const actualPos = entry.position;
        const isFirst = actualPos === 1;
        return (
          <div key={entry.team_id} className="flex flex-col items-center">
            <div className={`relative ${sizes[idx]} rounded-full bg-gradient-to-br ${podiumColors[idx]} p-[2px] mb-2 shadow-lg ${isFirst ? 'ring-2 ring-yellow-400/40 ring-offset-2 ring-offset-gray-900' : ''}`}>
              <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center">
                {isFirst ? <Crown className="w-5 h-5 text-yellow-400" /> : <Medal className="w-4 h-4 text-white" />}
              </div>
            </div>
            <p className={`text-white font-bold ${textSizes[idx]} text-center mb-1 max-w-[80px] sm:max-w-[120px] truncate`}>
              {entry.team_name}
            </p>
            <Badge className={`bg-gradient-to-r ${podiumColors[idx]} text-white border-0 font-bold text-xs mb-2`}>
              {entry.points} pts
            </Badge>
            <div className="flex gap-2 text-[10px] sm:text-xs mb-2">
              <span className="flex items-center gap-0.5 text-red-400"><Target className="w-3 h-3" />{entry.kills}</span>
              <span className="flex items-center gap-0.5 text-yellow-400"><Trophy className="w-3 h-3" />{entry.wins}</span>
            </div>
            <div className={`w-16 sm:w-20 md:w-24 ${podiumHeights[idx]} bg-gradient-to-t ${podiumColors[idx]} rounded-t-xl border-t-2 border-x-2 ${borderColors[idx]} flex items-start justify-center pt-2`}>
              <span className="text-white/90 font-extrabold text-xl">{actualPos}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TournamentPointsTable = ({ tournamentId }: TournamentPointsTableProps) => {
  const [rawEntries, setRawEntries] = useState<PointEntry[]>([]);
  const [playerPoints, setPlayerPoints] = useState<PlayerPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<'single' | 'grouped'>('single');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'total' | number>('total');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const loadPointsTable = async () => {
    try {
      const [teamsRes, playersRes] = await Promise.all([
        supabase.from('tournament_points').select('*').eq('tournament_id', tournamentId).order('match_number', { ascending: true }).order('position', { ascending: true }),
        supabase.from('tournament_player_points').select('*').eq('tournament_id', tournamentId).order('kills', { ascending: false }),
      ]);

      if (teamsRes.error) throw teamsRes.error;
      setRawEntries(teamsRes.data || []);
      setPlayerPoints(playersRes.data || []);
      const hasGroups = teamsRes.data?.some(entry => entry.group_name);
      setDisplayMode(hasGroups ? 'grouped' : 'single');
    } catch (error) {
      console.error('Error loading points:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPointsTable();
    const channel = supabase
      .channel(`points-updates-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_points', filter: `tournament_id=eq.${tournamentId}` }, () => loadPointsTable())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_player_points', filter: `tournament_id=eq.${tournamentId}` }, () => loadPointsTable())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tournamentId]);

  // Determine unique match numbers
  const matchNumbers = useMemo(() => {
    const nums = [...new Set(rawEntries.map(e => e.match_number || 1))].sort((a, b) => a - b);
    return nums;
  }, [rawEntries]);

  const hasMultipleMatches = matchNumbers.length > 1;

  // Aggregate entries across matches or show single match
  const pointsEntries: AggregatedEntry[] = useMemo(() => {
    if (viewMode === 'total') {
      // Aggregate by team_id
      const teamMap = new Map<string, AggregatedEntry>();
      for (const entry of rawEntries) {
        const key = entry.team_id;
        if (!teamMap.has(key)) {
          teamMap.set(key, {
            team_id: entry.team_id,
            team_name: entry.team_name,
            group_name: entry.group_name,
            points: 0,
            kills: 0,
            wins: 0,
            position: 0,
            position_in_group: null,
            matchBreakdown: [],
          });
        }
        const agg = teamMap.get(key)!;
        agg.points += entry.points;
        agg.kills += entry.kills;
        agg.wins += entry.wins;
        agg.matchBreakdown.push({
          match_number: entry.match_number || 1,
          points: entry.points,
          kills: entry.kills,
          wins: entry.wins,
        });
      }
      // Sort and assign positions
      const sorted = Array.from(teamMap.values()).sort((a, b) => b.points - a.points);
      sorted.forEach((entry, idx) => { entry.position = idx + 1; });
      
      // Assign group positions if grouped
      if (displayMode === 'grouped') {
        const groups = new Map<string, AggregatedEntry[]>();
        sorted.forEach(e => {
          const g = e.group_name || 'A';
          if (!groups.has(g)) groups.set(g, []);
          groups.get(g)!.push(e);
        });
        groups.forEach((entries) => {
          entries.sort((a, b) => b.points - a.points).forEach((e, idx) => {
            e.position_in_group = idx + 1;
          });
        });
      }
      return sorted;
    } else {
      // Show single match
      const matchEntries = rawEntries.filter(e => (e.match_number || 1) === viewMode);
      return matchEntries
        .sort((a, b) => a.position - b.position)
        .map(e => ({
          ...e,
          matchBreakdown: [{ match_number: e.match_number || 1, points: e.points, kills: e.kills, wins: e.wins }],
        }));
    }
  }, [rawEntries, viewMode, displayMode]);

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId); else next.add(teamId);
      return next;
    });
  };

  const uniqueGroups = [...new Set(pointsEntries.map(e => e.group_name).filter(Boolean))].sort() as string[];

  const filteredEntries = pointsEntries.filter(entry => {
    const matchesSearch = entry.team_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || entry.group_name === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const sortedEntries = [...filteredEntries].sort((a, b) => a.position - b.position);
  const totalKills = pointsEntries.reduce((s, e) => s + e.kills, 0);
  const totalWins = pointsEntries.reduce((s, e) => s + e.wins, 0);
  const maxPoints = Math.max(...pointsEntries.map(e => e.points), 1);

  const exportAsImage = async () => {
    if (!tableRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(tableRef.current, { backgroundColor: '#0f1019', scale: 2 });
      const link = document.createElement('a');
      link.download = `tournament-standings-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Exported!');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="py-12 text-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-gray-700 rounded-full" />
            <div className="h-4 w-40 bg-gray-700 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rawEntries.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="py-12 text-center">
          <Trophy className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No standings yet</p>
          <p className="text-gray-500 text-sm mt-1">Points table will appear once the tournament begins.</p>
        </CardContent>
      </Card>
    );
  }

  const getTeamPlayers = (teamId: string) => playerPoints.filter(p => p.team_id === teamId);

  const renderStandingsRow = (entry: AggregatedEntry, idx: number) => {
    const barWidth = (entry.points / maxPoints) * 100;
    const isExpanded = expandedTeams.has(entry.team_id);
    const teamPlayers = getTeamPlayers(entry.team_id);
    const hasPlayers = teamPlayers.length > 0;
    const showMatchBreakdown = hasMultipleMatches && viewMode === 'total' && entry.matchBreakdown.length > 1;

    return (
      <div key={entry.team_id + '-' + viewMode} className="animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
        {/* Main Row */}
        <div
          onClick={() => (hasPlayers || showMatchBreakdown) && toggleTeam(entry.team_id)}
          className={`grid grid-cols-[36px_1fr_repeat(3,56px)_24px] sm:grid-cols-[44px_1fr_repeat(3,72px)_28px] items-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 rounded-xl transition-all duration-200 ${(hasPlayers || showMatchBreakdown) ? 'cursor-pointer' : ''} ${
            entry.position === 1 ? 'bg-gradient-to-r from-yellow-500/15 to-transparent border border-yellow-500/20' :
            entry.position === 2 ? 'bg-gradient-to-r from-gray-400/10 to-transparent border border-gray-400/15' :
            entry.position === 3 ? 'bg-gradient-to-r from-amber-600/10 to-transparent border border-amber-600/15' :
            'bg-gray-800/30 border border-gray-700/30 hover:bg-gray-700/40'
          }`}
        >
          {/* Position */}
          <div className="flex items-center justify-center">
            {entry.position === 1 ? (
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30">
                <Crown className="w-4 h-4 text-white" />
              </div>
            ) : entry.position === 2 ? (
              <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">2</span>
              </div>
            ) : entry.position === 3 ? (
              <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">3</span>
              </div>
            ) : (
              <span className="text-gray-400 font-bold text-sm">{entry.position}</span>
            )}
          </div>

          {/* Team Name */}
          <div className="min-w-0 pl-1 sm:pl-2">
            <p className="text-white font-semibold text-xs sm:text-sm truncate">{entry.team_name}</p>
            {entry.group_name && <p className="text-purple-400 text-[10px]">Group {entry.group_name}</p>}
            {hasMultipleMatches && viewMode === 'total' && (
              <p className="text-gray-500 text-[10px]">{entry.matchBreakdown.length} matches</p>
            )}
            <div className="mt-1 h-1 bg-gray-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  entry.position === 1 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                  entry.position === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-400' :
                  entry.position === 3 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                  'bg-gradient-to-r from-purple-500 to-blue-500'
                }`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>

          {/* Kills */}
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-red-400">
              <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
              <span className="font-bold text-xs sm:text-sm">{entry.kills}</span>
            </div>
            <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Kills</span>
          </div>

          {/* Wins */}
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-emerald-400">
              <Swords className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
              <span className="font-bold text-xs sm:text-sm">{entry.wins}</span>
            </div>
            <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Wins</span>
          </div>

          {/* Points */}
          <div className="flex flex-col items-center justify-center">
            <span className={`font-extrabold text-sm sm:text-base ${
              entry.position === 1 ? 'text-yellow-400' :
              entry.position === 2 ? 'text-gray-300' :
              entry.position === 3 ? 'text-amber-500' : 'text-white'
            }`}>
              {entry.points}
            </span>
            <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase">Pts</span>
          </div>

          {/* Expand Icon */}
          <div className="flex items-center justify-center">
            {(hasPlayers || showMatchBreakdown) ? (
              isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : <div className="w-4" />}
          </div>
        </div>

        {/* Expanded: Match Breakdown + Players */}
        {isExpanded && (
          <div className="ml-4 sm:ml-10 mr-2 mt-1 mb-2 border-l-2 border-purple-500/30 pl-3 sm:pl-4 space-y-1 animate-fade-in">
            {/* Match Breakdown */}
            {showMatchBreakdown && (
              <>
                <div className="grid grid-cols-[1fr_repeat(3,56px)] sm:grid-cols-[1fr_repeat(3,72px)] items-center gap-1 sm:gap-2 px-2 py-1">
                  <span className="text-gray-500 text-[10px] sm:text-xs uppercase font-medium">Match</span>
                  <span className="text-gray-500 text-[10px] sm:text-xs uppercase font-medium text-center">Kills</span>
                  <span className="text-gray-500 text-[10px] sm:text-xs uppercase font-medium text-center">Wins</span>
                  <span className="text-gray-500 text-[10px] sm:text-xs uppercase font-medium text-center">Pts</span>
                </div>
                {entry.matchBreakdown
                  .sort((a, b) => a.match_number - b.match_number)
                  .map(mb => (
                    <div
                      key={mb.match_number}
                      className="grid grid-cols-[1fr_repeat(3,56px)] sm:grid-cols-[1fr_repeat(3,72px)] items-center gap-1 sm:gap-2 px-2 py-2 rounded-lg bg-blue-900/20 hover:bg-blue-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-blue-600/30 flex items-center justify-center flex-shrink-0">
                          <Hash className="w-3 h-3 text-blue-400" />
                        </div>
                        <span className="text-white text-xs sm:text-sm">Match {mb.match_number}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-red-400">
                        <Target className="w-3 h-3 flex-shrink-0" />
                        <span className="font-semibold text-xs sm:text-sm">{mb.kills}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-emerald-400">
                        <Swords className="w-3 h-3 flex-shrink-0" />
                        <span className="font-semibold text-xs sm:text-sm">{mb.wins}</span>
                      </div>
                      <div className="text-center">
                        <span className="font-bold text-xs sm:text-sm text-white">{mb.points}</span>
                      </div>
                    </div>
                  ))}
              </>
            )}
            
            {/* Players */}
            {hasPlayers && (
              <>
                <div className="grid grid-cols-[1fr_repeat(3,56px)] sm:grid-cols-[1fr_repeat(3,72px)] items-center gap-1 sm:gap-2 px-2 py-1 mt-1">
                  <span className="text-gray-500 text-[10px] sm:text-xs uppercase font-medium">Player</span>
                  <span className="text-gray-500 text-[10px] sm:text-xs uppercase font-medium text-center">Kills</span>
                  <span className="text-gray-500 text-[10px] sm:text-xs uppercase font-medium text-center">Wins</span>
                  <span className="text-gray-500 text-[10px] sm:text-xs uppercase font-medium text-center">Pts</span>
                </div>
                {teamPlayers.map(player => (
                  <div
                    key={player.id}
                    className="grid grid-cols-[1fr_repeat(3,56px)] sm:grid-cols-[1fr_repeat(3,72px)] items-center gap-1 sm:gap-2 px-2 py-2 rounded-lg bg-gray-800/40 hover:bg-gray-700/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-purple-400" />
                      </div>
                      <span className="text-white text-xs sm:text-sm truncate">{player.player_name}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-red-400">
                      <Target className="w-3 h-3 flex-shrink-0" />
                      <span className="font-semibold text-xs sm:text-sm">{player.kills}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-emerald-400">
                      <Swords className="w-3 h-3 flex-shrink-0" />
                      <span className="font-semibold text-xs sm:text-sm">{player.wins}</span>
                    </div>
                    <div className="text-center">
                      <span className="font-bold text-xs sm:text-sm text-white">{player.points}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderStandingsCard = (entries: AggregatedEntry[], title: string, icon: React.ReactNode, badgeText: string, borderColor: string = 'border-gray-700/30') => (
    <Card className={`bg-gradient-to-b from-gray-800/60 to-gray-900/40 ${borderColor} overflow-hidden`}>
      <CardHeader className="pb-3 border-b border-gray-700/30">
        <CardTitle className="text-white flex items-center gap-3 text-base sm:text-lg">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <span className="truncate">{title}</span>
          <Badge className="ml-auto bg-gray-700/50 text-gray-300 border-gray-600/30 text-xs flex-shrink-0">
            {badgeText}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-3 space-y-1.5">
        {entries.map((entry, idx) => renderStandingsRow(entry, idx))}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6" ref={tableRef}>
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { icon: <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />, label: 'Teams', value: pointsEntries.length, color: 'from-purple-900/40 to-purple-800/20' },
          { icon: <Target className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />, label: 'Kills', value: totalKills, color: 'from-red-900/40 to-red-800/20' },
          { icon: <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />, label: 'Wins', value: totalWins, color: 'from-emerald-900/40 to-emerald-800/20' },
        ].map(stat => (
          <div key={stat.label} className={`flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-gradient-to-r ${stat.color} border border-white/5`}>
            <div className="p-1.5 sm:p-2 rounded-lg bg-white/10">{stat.icon}</div>
            <div>
              <p className="text-white/60 text-[10px] sm:text-xs uppercase">{stat.label}</p>
              <p className="text-white font-bold text-sm sm:text-lg">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Match View Selector + Search & Filters */}
      <div className="flex flex-col gap-3">
        {/* Match tabs */}
        {hasMultipleMatches && (
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={viewMode === 'total' ? 'default' : 'outline'}
              onClick={() => setViewMode('total')}
              className={viewMode === 'total'
                ? 'bg-yellow-500 hover:bg-yellow-600 text-black font-bold'
                : 'border-gray-600 text-gray-300 hover:bg-gray-700'
              }
            >
              <Trophy className="w-3.5 h-3.5 mr-1" />
              Total
            </Button>
            {matchNumbers.map(num => (
              <Button
                key={num}
                size="sm"
                variant={viewMode === num ? 'default' : 'outline'}
                onClick={() => setViewMode(num)}
                className={viewMode === num
                  ? 'bg-primary hover:bg-primary/90'
                  : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                }
              >
                Match {num}
              </Button>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800/60 border-gray-700/50 text-white placeholder:text-gray-500 rounded-xl text-sm"
            />
          </div>
          {displayMode === 'grouped' && uniqueGroups.length > 0 && (
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-full sm:w-[140px] bg-gray-800/60 border-gray-700/50 text-white rounded-xl text-sm">
                <Filter className="w-4 h-4 mr-1 text-gray-400" />
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all">All Groups</SelectItem>
                {uniqueGroups.map(g => <SelectItem key={g} value={g}>Group {g}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button onClick={exportAsImage} disabled={exporting} size="sm" className="bg-gray-800/60 border border-gray-700/50 text-gray-300 hover:bg-gray-700/60 rounded-xl text-sm">
            <Image className="w-4 h-4 mr-1" />
            {exporting ? '...' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Top 3 Podium */}
      {(displayMode === 'single' || selectedGroup !== 'all') && sortedEntries.length >= 3 && (
        <Card className="bg-gradient-to-b from-gray-800/60 to-gray-900/40 border-gray-700/30 overflow-hidden">
          <CardContent className="pt-6 pb-0 px-2">
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                <Flame className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-400 font-semibold text-xs sm:text-sm">
                  {viewMode === 'total' ? 'Top Performers' : `Match ${viewMode} Top Performers`}
                </span>
              </div>
            </div>
            <TopThreePodium entries={sortedEntries} />
          </CardContent>
        </Card>
      )}

      {/* Standings */}
      {displayMode === 'grouped' && uniqueGroups.length > 0 && selectedGroup === 'all' ? (
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {uniqueGroups.map(group => {
            const groupEntries = filteredEntries
              .filter(e => e.group_name === group)
              .sort((a, b) => (a.position_in_group || 0) - (b.position_in_group || 0))
              .map((e, i) => ({ ...e, position: e.position_in_group || i + 1 }));
            return (
              <div key={group}>
                {renderStandingsCard(groupEntries, `Group ${group}`, <span className="text-white font-bold text-sm">{group}</span>, `${groupEntries.length} teams`)}
              </div>
            );
          })}
        </div>
      ) : (
        renderStandingsCard(
          sortedEntries,
          viewMode === 'total' ? 'Tournament Standings' : `Match ${viewMode} Standings`,
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
          `${sortedEntries.length} teams`
        )
      )}

      {/* Overall (grouped mode) */}
      {displayMode === 'grouped' && uniqueGroups.length > 0 && (
        <Card className="bg-gradient-to-b from-gray-800/60 to-gray-900/40 border-yellow-500/20 overflow-hidden">
          <CardHeader className="pb-3 border-b border-yellow-500/10">
            <CardTitle className="text-white flex items-center gap-3 text-base sm:text-lg">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              Overall Standings
              <Badge className="ml-auto bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs flex-shrink-0">All Groups</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 space-y-1.5">
            {sortedEntries.slice(0, 10).map((entry, idx) => renderStandingsRow(entry, idx))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TournamentPointsTable;
