import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Target, Award, Users, Search, Filter, Download, Image } from 'lucide-react';
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
      
      // Detect display mode from data
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

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`points-updates-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_points',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
          console.log('Points table update received:', payload);
          loadPointsTable();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const getPositionBadge = (position: number) => {
    switch (position) {
      case 1:
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="text-yellow-400 font-bold">1st</span>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center shadow-lg">
              <Award className="w-4 h-4 text-white" />
            </div>
            <span className="text-gray-300 font-bold">2nd</span>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center shadow-lg">
              <Award className="w-4 h-4 text-white" />
            </div>
            <span className="text-amber-500 font-bold">3rd</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">{position}</span>
            </div>
            <span className="text-gray-400">{position}th</span>
          </div>
        );
    }
  };

  // Get unique groups
  const uniqueGroups = [...new Set(pointsEntries.map(e => e.group_name).filter(Boolean))].sort() as string[];

  // Filter entries based on search and group
  const filteredEntries = pointsEntries.filter(entry => {
    const matchesSearch = entry.team_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || entry.group_name === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  // Export as image
  const exportAsImage = async () => {
    if (!tableRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 2,
      });
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
        <CardContent className="py-8 text-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-700 rounded-full mb-4"></div>
            <div className="h-4 w-32 bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pointsEntries.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="py-8 text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">Points table will be available once the tournament begins.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Export Controls */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search team..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              {/* Group Filter */}
              {displayMode === 'grouped' && uniqueGroups.length > 0 && (
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="w-[140px] bg-gray-700 border-gray-600 text-white">
                    <Filter className="w-4 h-4 mr-2" />
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
            </div>
            
            {/* Export Button */}
            <Button
              onClick={exportAsImage}
              disabled={exporting}
              variant="outline"
              className="bg-purple-600/20 border-purple-500/30 text-purple-300 hover:bg-purple-600/40"
            >
              <Image className="w-4 h-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export Image'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Points Table Content */}
      <div ref={tableRef}>
        {displayMode === 'grouped' && uniqueGroups.length > 0 && selectedGroup === 'all' ? (
        // Multiple groups display
        <div className="grid md:grid-cols-2 gap-6">
          {uniqueGroups.map(group => (
            <Card key={group} className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-purple-500/30 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-gray-700/50 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
                <CardTitle className="text-white flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{group}</span>
                  </div>
                  Group {group}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-transparent">
                      <TableHead className="text-gray-400 font-semibold">#</TableHead>
                      <TableHead className="text-gray-400 font-semibold">Team</TableHead>
                      <TableHead className="text-gray-400 font-semibold text-center">Points</TableHead>
                      <TableHead className="text-gray-400 font-semibold text-center">Kills</TableHead>
                      <TableHead className="text-gray-400 font-semibold text-center">Wins</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries
                      .filter(e => e.group_name === group)
                      .sort((a, b) => (a.position_in_group || 0) - (b.position_in_group || 0))
                      .map((entry, idx) => (
                        <TableRow 
                          key={entry.id} 
                          className={`border-gray-700/50 transition-colors ${
                            idx === 0 ? 'bg-yellow-500/10' :
                            idx === 1 ? 'bg-gray-400/10' :
                            idx === 2 ? 'bg-amber-600/10' : 'hover:bg-gray-700/30'
                          }`}
                        >
                          <TableCell className="font-bold">
                            {getPositionBadge(entry.position_in_group || idx + 1)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <Users className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-white font-semibold">{entry.team_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-lg font-bold px-3">
                              {entry.points}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Target className="w-4 h-4 text-red-400" />
                              <span className="text-red-400 font-semibold">{entry.kills}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Trophy className="w-4 h-4 text-yellow-400" />
                              <span className="text-yellow-400 font-semibold">{entry.wins}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Single table display
        <Card className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-purple-500/30 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b border-gray-700/50 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
            <CardTitle className="text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              Tournament Standings
              <Badge className="ml-auto bg-purple-500/20 text-purple-300 border-purple-500/30">
                {pointsEntries.length} Teams
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-transparent">
                  <TableHead className="text-gray-400 font-semibold">Position</TableHead>
                  <TableHead className="text-gray-400 font-semibold">Team</TableHead>
                  <TableHead className="text-gray-400 font-semibold text-center">Points</TableHead>
                  <TableHead className="text-gray-400 font-semibold text-center">Kills</TableHead>
                  <TableHead className="text-gray-400 font-semibold text-center">Wins</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries
                  .sort((a, b) => a.position - b.position)
                  .map((entry, idx) => (
                    <TableRow 
                      key={entry.id} 
                      className={`border-gray-700/50 transition-colors ${
                        idx === 0 ? 'bg-yellow-500/10' :
                        idx === 1 ? 'bg-gray-400/10' :
                        idx === 2 ? 'bg-amber-600/10' : 'hover:bg-gray-700/30'
                      }`}
                    >
                      <TableCell className="font-bold">
                        {getPositionBadge(entry.position)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-white font-semibold text-lg">{entry.team_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-lg font-bold px-4 py-1">
                          {entry.points}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Target className="w-5 h-5 text-red-400" />
                          <span className="text-red-400 font-bold text-lg">{entry.kills}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Trophy className="w-5 h-5 text-yellow-400" />
                          <span className="text-yellow-400 font-bold text-lg">{entry.wins}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Overall Standings (when grouped) */}
      {displayMode === 'grouped' && uniqueGroups.length > 0 && (
        <Card className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-yellow-500/30 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b border-gray-700/50 bg-gradient-to-r from-yellow-900/30 to-orange-900/30">
            <CardTitle className="text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              Overall Standings
              <Badge className="ml-auto bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                All Groups Combined
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-transparent">
                  <TableHead className="text-gray-400 font-semibold">Position</TableHead>
                  <TableHead className="text-gray-400 font-semibold">Team</TableHead>
                  <TableHead className="text-gray-400 font-semibold text-center">Group</TableHead>
                  <TableHead className="text-gray-400 font-semibold text-center">Points</TableHead>
                  <TableHead className="text-gray-400 font-semibold text-center">Kills</TableHead>
                  <TableHead className="text-gray-400 font-semibold text-center">Wins</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries
                  .sort((a, b) => a.position - b.position)
                  .slice(0, 10)
                  .map((entry, idx) => (
                    <TableRow 
                      key={entry.id} 
                      className={`border-gray-700/50 transition-colors ${
                        idx === 0 ? 'bg-yellow-500/10' :
                        idx === 1 ? 'bg-gray-400/10' :
                        idx === 2 ? 'bg-amber-600/10' : 'hover:bg-gray-700/30'
                      }`}
                    >
                      <TableCell className="font-bold">
                        {getPositionBadge(entry.position)}
                      </TableCell>
                      <TableCell>
                        <span className="text-white font-semibold">{entry.team_name}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                          Group {entry.group_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-400 font-bold">{entry.points}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-red-400 font-semibold">{entry.kills}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-yellow-400 font-semibold">{entry.wins}</span>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
};

export default TournamentPointsTable;
