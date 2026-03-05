import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Target, Award, Users, Search, Filter, Image, Crown, Flame, Swords, ChevronUp, ChevronDown, Medal } from 'lucide-react';
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
}

interface TournamentPointsTableProps {
  tournamentId: string;
}

// Top 3 Podium Component
const TopThreePodium = ({ entries }: { entries: PointEntry[] }) => {
  const top3 = entries.slice(0, 3);
  if (top3.length === 0) return null;

  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podiumHeights = ['h-28', 'h-36', 'h-24'];
  const podiumColors = [
    'from-gray-400 to-gray-500',
    'from-yellow-400 to-amber-500',
    'from-amber-600 to-amber-700',
  ];
  const borderColors = ['border-gray-400/50', 'border-yellow-400/50', 'border-amber-600/50'];
  const glowColors = ['shadow-gray-400/20', 'shadow-yellow-400/30', 'shadow-amber-600/20'];
  const icons = [
    <Medal key="2nd" className="w-5 h-5" />,
    <Crown key="1st" className="w-6 h-6" />,
    <Medal key="3rd" className="w-5 h-5" />,
  ];
  const sizes = ['w-16 h-16', 'w-20 h-20', 'w-14 h-14'];
  const textSizes = ['text-lg', 'text-2xl', 'text-base'];

  return (
    <div className="flex items-end justify-center gap-3 md:gap-6 mb-8 px-4">
      {podiumOrder.map((entry, idx) => {
        if (!entry) return null;
        const actualPos = entry.position;
        const podiumIdx = top3.length >= 3 ? idx : idx;
        const isFirst = actualPos === 1;

        return (
          <div key={entry.id} className="flex flex-col items-center animate-fade-in" style={{ animationDelay: `${idx * 150}ms` }}>
            {/* Avatar */}
            <div className={`relative ${sizes[podiumIdx]} rounded-full bg-gradient-to-br ${podiumColors[podiumIdx]} p-[3px] mb-3 shadow-xl ${glowColors[podiumIdx]} ${isFirst ? 'ring-2 ring-yellow-400/40 ring-offset-2 ring-offset-gray-900' : ''}`}>
              <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center">
                <span className="text-white font-bold">{icons[podiumIdx]}</span>
              </div>
              {isFirst && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Crown className="w-6 h-6 text-yellow-400 drop-shadow-lg animate-bounce" style={{ animationDuration: '2s' }} />
                </div>
              )}
            </div>

            {/* Team Name */}
            <p className={`text-white font-bold ${textSizes[podiumIdx]} text-center mb-1 max-w-[100px] md:max-w-[140px] truncate`}>
              {entry.team_name}
            </p>

            {/* Points */}
            <Badge className={`bg-gradient-to-r ${podiumColors[podiumIdx]} text-white border-0 font-bold text-sm mb-3 shadow-lg`}>
              {entry.points} pts
            </Badge>

            {/* Stats Row */}
            <div className="flex gap-3 text-xs mb-3">
              <span className="flex items-center gap-1 text-red-400">
                <Target className="w-3 h-3" />{entry.kills}
              </span>
              <span className="flex items-center gap-1 text-yellow-400">
                <Trophy className="w-3 h-3" />{entry.wins}
              </span>
            </div>

            {/* Podium Bar */}
            <div className={`w-20 md:w-28 ${podiumHeights[podiumIdx]} bg-gradient-to-t ${podiumColors[podiumIdx]} rounded-t-xl border-t-2 border-x-2 ${borderColors[podiumIdx]} flex items-start justify-center pt-3 shadow-inner`}>
              <span className="text-white/90 font-extrabold text-2xl">{actualPos}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Stat Card for summary
const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r ${color} border border-white/5`}>
    <div className="p-2 rounded-lg bg-white/10">{icon}</div>
    <div>
      <p className="text-white/60 text-xs uppercase tracking-wider">{label}</p>
      <p className="text-white font-bold text-lg">{value}</p>
    </div>
  </div>
);

const TournamentPointsTable = ({ tournamentId }: TournamentPointsTableProps) => {
  const [pointsEntries, setPointsEntries] = useState<PointEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<'single' | 'grouped'>('single');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [exporting, setExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const loadPointsTable = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_points')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('position', { ascending: true });

      if (error) throw error;
      setPointsEntries(data || []);
      const hasGroups = data?.some(entry => entry.group_name);
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
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tournament_points',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => loadPointsTable())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tournamentId]);

  const uniqueGroups = [...new Set(pointsEntries.map(e => e.group_name).filter(Boolean))].sort() as string[];

  const filteredEntries = pointsEntries.filter(entry => {
    const matchesSearch = entry.team_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || entry.group_name === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const sortedEntries = [...filteredEntries].sort((a, b) => a.position - b.position);

  const totalKills = pointsEntries.reduce((sum, e) => sum + e.kills, 0);
  const totalWins = pointsEntries.reduce((sum, e) => sum + e.wins, 0);
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
      toast.success('Points table exported as image!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export image');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="py-12 text-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-gray-700 rounded-full" />
            <div className="h-4 w-40 bg-gray-700 rounded" />
            <div className="h-3 w-24 bg-gray-700/60 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pointsEntries.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-400 text-lg font-medium">No standings yet</p>
          <p className="text-gray-500 text-sm mt-1">Points table will appear once the tournament begins.</p>
        </CardContent>
      </Card>
    );
  }

  const renderStandingsRow = (entry: PointEntry, idx: number) => {
    const isTop3 = entry.position <= 3;
    const barWidth = (entry.points / maxPoints) * 100;

    return (
      <div
        key={entry.id}
        className={`group relative flex items-center gap-3 md:gap-4 px-3 md:px-5 py-3 md:py-4 rounded-xl transition-all duration-300 hover:scale-[1.01] ${
          entry.position === 1 ? 'bg-gradient-to-r from-yellow-500/15 to-transparent border border-yellow-500/20' :
          entry.position === 2 ? 'bg-gradient-to-r from-gray-400/10 to-transparent border border-gray-400/15' :
          entry.position === 3 ? 'bg-gradient-to-r from-amber-600/10 to-transparent border border-amber-600/15' :
          'bg-gray-800/30 border border-gray-700/30 hover:bg-gray-700/40 hover:border-gray-600/40'
        }`}
        style={{ animationDelay: `${idx * 50}ms` }}
      >
        {/* Position */}
        <div className="flex-shrink-0 w-8 md:w-10 text-center">
          {entry.position === 1 ? (
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30">
              <Crown className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
          ) : entry.position === 2 ? (
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">2</span>
            </div>
          ) : entry.position === 3 ? (
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">3</span>
            </div>
          ) : (
            <span className="text-gray-400 font-bold text-base md:text-lg">{entry.position}</span>
          )}
        </div>

        {/* Team Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 md:gap-3">
            <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center ${
              isTop3 ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gray-700'
            }`}>
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm md:text-base truncate">{entry.team_name}</p>
              {entry.group_name && (
                <p className="text-purple-400 text-xs">Group {entry.group_name}</p>
              )}
            </div>
          </div>
          {/* Points Progress Bar */}
          <div className="mt-2 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                entry.position === 1 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                entry.position === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-400' :
                entry.position === 3 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                'bg-gradient-to-r from-purple-500 to-blue-500'
              }`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <div className="text-center hidden sm:block">
            <div className="flex items-center gap-1 text-red-400">
              <Target className="w-3.5 h-3.5" />
              <span className="font-bold text-sm">{entry.kills}</span>
            </div>
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">Kills</p>
          </div>
          <div className="text-center hidden sm:block">
            <div className="flex items-center gap-1 text-emerald-400">
              <Swords className="w-3.5 h-3.5" />
              <span className="font-bold text-sm">{entry.wins}</span>
            </div>
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">Wins</p>
          </div>
          <div className="text-center min-w-[50px]">
            <p className={`font-extrabold text-base md:text-lg ${
              entry.position === 1 ? 'text-yellow-400' :
              entry.position === 2 ? 'text-gray-300' :
              entry.position === 3 ? 'text-amber-500' : 'text-white'
            }`}>
              {entry.points}
            </p>
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">Points</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" ref={tableRef}>
      {/* Header with Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-purple-400" />}
          label="Teams"
          value={pointsEntries.length}
          color="from-purple-900/40 to-purple-800/20"
        />
        <StatCard
          icon={<Target className="w-5 h-5 text-red-400" />}
          label="Total Kills"
          value={totalKills}
          color="from-red-900/40 to-red-800/20"
        />
        <StatCard
          icon={<Swords className="w-5 h-5 text-emerald-400" />}
          label="Total Wins"
          value={totalWins}
          color="from-emerald-900/40 to-emerald-800/20"
        />
      </div>

      {/* Search, Filters, Export */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800/60 border-gray-700/50 text-white placeholder:text-gray-500 rounded-xl focus:border-purple-500/50 focus:ring-purple-500/20"
          />
        </div>

        {displayMode === 'grouped' && uniqueGroups.length > 0 && (
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-full sm:w-[150px] bg-gray-800/60 border-gray-700/50 text-white rounded-xl">
              <Filter className="w-4 h-4 mr-2 text-gray-400" />
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Groups</SelectItem>
              {uniqueGroups.map(group => (
                <SelectItem key={group} value={group}>Group {group}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          onClick={exportAsImage}
          disabled={exporting}
          size="sm"
          className="bg-gray-800/60 border border-gray-700/50 text-gray-300 hover:bg-gray-700/60 hover:text-white rounded-xl"
        >
          <Image className="w-4 h-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export'}
        </Button>
      </div>

      {/* Top 3 Podium (only in single/filtered view) */}
      {(displayMode === 'single' || selectedGroup !== 'all') && sortedEntries.length >= 3 && (
        <Card className="bg-gradient-to-b from-gray-800/60 to-gray-900/40 border-gray-700/30 overflow-hidden">
          <CardContent className="pt-8 pb-0 px-2">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                <Flame className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-semibold text-sm">Top Performers</span>
              </div>
            </div>
            <TopThreePodium entries={sortedEntries} />
          </CardContent>
        </Card>
      )}

      {/* Standings List */}
      {displayMode === 'grouped' && uniqueGroups.length > 0 && selectedGroup === 'all' ? (
        <div className="grid md:grid-cols-2 gap-6">
          {uniqueGroups.map(group => {
            const groupEntries = filteredEntries
              .filter(e => e.group_name === group)
              .sort((a, b) => (a.position_in_group || 0) - (b.position_in_group || 0));

            return (
              <Card key={group} className="bg-gradient-to-b from-gray-800/60 to-gray-900/40 border-gray-700/30 overflow-hidden">
                <CardHeader className="pb-3 border-b border-gray-700/30">
                  <CardTitle className="text-white flex items-center gap-3 text-lg">
                    <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{group}</span>
                    </div>
                    Group {group}
                    <Badge className="ml-auto bg-gray-700/50 text-gray-300 border-gray-600/30 text-xs">
                      {groupEntries.length} teams
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {groupEntries.map((entry, idx) => renderStandingsRow(
                    { ...entry, position: entry.position_in_group || idx + 1 }, idx
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-gradient-to-b from-gray-800/60 to-gray-900/40 border-gray-700/30 overflow-hidden">
          <CardHeader className="pb-3 border-b border-gray-700/30">
            <CardTitle className="text-white flex items-center gap-3 text-lg">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              Tournament Standings
              <Badge className="ml-auto bg-gray-700/50 text-gray-300 border-gray-600/30 text-xs">
                {sortedEntries.length} teams
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {sortedEntries.map((entry, idx) => renderStandingsRow(entry, idx))}
          </CardContent>
        </Card>
      )}

      {/* Overall Combined (when grouped) */}
      {displayMode === 'grouped' && uniqueGroups.length > 0 && (
        <Card className="bg-gradient-to-b from-gray-800/60 to-gray-900/40 border-yellow-500/20 overflow-hidden">
          <CardHeader className="pb-3 border-b border-yellow-500/10">
            <CardTitle className="text-white flex items-center gap-3 text-lg">
              <div className="w-9 h-9 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              Overall Standings
              <Badge className="ml-auto bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">
                All Groups
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {sortedEntries.slice(0, 10).map((entry, idx) => renderStandingsRow(entry, idx))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TournamentPointsTable;
