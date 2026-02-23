import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, ChevronDown, ChevronRight, Save, Loader2, RefreshCw, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  user_id: string;
  player_name: string;
  role: string;
  points: number;
  kills: number;
  wins: number;
}

interface RegisteredTeam {
  id: string;
  team_name: string;
  members: TeamMember[];
  totalPoints: number;
  totalKills: number;
  totalWins: number;
}

interface PlayerPointsAdminProps {
  tournamentId: string;
}

const PlayerPointsAdmin = ({ tournamentId }: PlayerPointsAdminProps) => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<RegisteredTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (tournamentId) loadTeamsAndPlayers();
  }, [tournamentId]);

  const loadTeamsAndPlayers = async () => {
    setLoading(true);
    try {
      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('tournament_teams')
        .select('id, team_name')
        .eq('tournament_id', tournamentId)
        .order('team_name');

      if (teamsError) throw teamsError;
      if (!teamsData || teamsData.length === 0) {
        setTeams([]);
        setLoading(false);
        return;
      }

      // Fetch members for all teams
      const teamIds = teamsData.map(t => t.id);
      const { data: membersData, error: membersError } = await supabase
        .from('tournament_team_members')
        .select('team_id, user_id, role')
        .in('team_id', teamIds);

      if (membersError) throw membersError;

      // Fetch profiles for all members
      const userIds = [...new Set((membersData || []).map(m => m.user_id))];
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, name, email')
          .in('user_id', userIds);

        (profiles || []).forEach(p => {
          profilesMap[p.user_id] = p.display_name || p.username || p.name || p.email || 'Unknown';
        });
      }

      // Fetch existing player points
      const { data: playerPoints } = await supabase
        .from('tournament_player_points')
        .select('*')
        .eq('tournament_id', tournamentId);

      const pointsMap: Record<string, { points: number; kills: number; wins: number }> = {};
      (playerPoints || []).forEach(pp => {
        pointsMap[`${pp.team_id}_${pp.user_id}`] = {
          points: pp.points,
          kills: pp.kills,
          wins: pp.wins,
        };
      });

      // Build teams with members
      const builtTeams: RegisteredTeam[] = teamsData.map(team => {
        const teamMembers = (membersData || [])
          .filter(m => m.team_id === team.id)
          .map(m => {
            const key = `${team.id}_${m.user_id}`;
            const existing = pointsMap[key];
            return {
              user_id: m.user_id,
              player_name: profilesMap[m.user_id] || 'Unknown Player',
              role: m.role,
              points: existing?.points || 0,
              kills: existing?.kills || 0,
              wins: existing?.wins || 0,
            };
          });

        const totalPoints = teamMembers.reduce((s, m) => s + m.points, 0);
        const totalKills = teamMembers.reduce((s, m) => s + m.kills, 0);
        const totalWins = teamMembers.reduce((s, m) => s + m.wins, 0);

        return {
          id: team.id,
          team_name: team.team_name,
          members: teamMembers,
          totalPoints,
          totalKills,
          totalWins,
        };
      });

      setTeams(builtTeams);
    } catch (error: any) {
      console.error('Error loading teams:', error);
      toast({ title: 'Error', description: 'Failed to load registered teams', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const updatePlayerField = (teamId: string, userId: string, field: 'points' | 'kills' | 'wins', value: number) => {
    setTeams(prev => prev.map(team => {
      if (team.id !== teamId) return team;
      const members = team.members.map(m =>
        m.user_id === userId ? { ...m, [field]: value } : m
      );
      return {
        ...team,
        members,
        totalPoints: members.reduce((s, m) => s + m.points, 0),
        totalKills: members.reduce((s, m) => s + m.kills, 0),
        totalWins: members.reduce((s, m) => s + m.wins, 0),
      };
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Upsert all player points
      for (const team of teams) {
        for (const member of team.members) {
          const { error } = await supabase
            .from('tournament_player_points')
            .upsert({
              tournament_id: tournamentId,
              team_id: team.id,
              user_id: member.user_id,
              player_name: member.player_name,
              points: member.points,
              kills: member.kills,
              wins: member.wins,
            }, { onConflict: 'tournament_id,team_id,user_id' });

          if (error) throw error;
        }

        // Also update team-level tournament_points
        const { data: existing } = await supabase
          .from('tournament_points')
          .select('id')
          .eq('tournament_id', tournamentId)
          .eq('team_id', team.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('tournament_points')
            .update({
              points: team.totalPoints,
              kills: team.totalKills,
              wins: team.totalWins,
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('tournament_points')
            .insert({
              tournament_id: tournamentId,
              team_id: team.id,
              team_name: team.team_name,
              points: team.totalPoints,
              kills: team.totalKills,
              wins: team.totalWins,
              position: 1,
            });
        }
      }

      toast({ title: 'Success', description: 'All player and team points saved!' });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save points', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500 mr-2" />
          <span className="text-gray-400">Loading registered teams...</span>
        </CardContent>
      </Card>
    );
  }

  if (teams.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="py-8 text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No registered teams found for this tournament.</p>
          <p className="text-gray-500 text-sm mt-1">Teams will appear here once players register.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          Registered Teams & Player Points ({teams.length} Teams)
        </CardTitle>
        <div className="flex gap-2">
          <Button onClick={loadTeamsAndPlayers} variant="outline" size="sm" className="border-gray-600 text-gray-300">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button onClick={handleSaveAll} disabled={saving} className="bg-purple-500 hover:bg-purple-600" size="sm">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save All Points
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {teams.map(team => (
          <Collapsible key={team.id} open={expandedTeams.has(team.id)} onOpenChange={() => toggleTeam(team.id)}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700/70 transition-colors">
                <div className="flex items-center gap-3">
                  {expandedTeams.has(team.id) ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <span className="text-white font-semibold">{team.team_name}</span>
                    <span className="text-gray-400 text-sm ml-2">({team.members.length} players)</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Points: {team.totalPoints}
                  </Badge>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    Kills: {team.totalKills}
                  </Badge>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    Wins: {team.totalWins}
                  </Badge>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-8 mt-2 border border-gray-700 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 bg-gray-700/30">
                      <TableHead className="text-gray-300">Player</TableHead>
                      <TableHead className="text-gray-300">Role</TableHead>
                      <TableHead className="text-gray-300 w-28">Points</TableHead>
                      <TableHead className="text-gray-300 w-28">Kills</TableHead>
                      <TableHead className="text-gray-300 w-28">Wins</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.members.map(member => (
                      <TableRow key={member.user_id} className="border-gray-700">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-white">{member.player_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={member.role === 'captain' ? 'border-yellow-500 text-yellow-400' : 'border-gray-600 text-gray-400'}>
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={member.points}
                            onChange={e => updatePlayerField(team.id, member.user_id, 'points', parseInt(e.target.value) || 0)}
                            className="bg-gray-700 border-gray-600 text-white w-24 h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={member.kills}
                            onChange={e => updatePlayerField(team.id, member.user_id, 'kills', parseInt(e.target.value) || 0)}
                            className="bg-gray-700 border-gray-600 text-white w-24 h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={member.wins}
                            onChange={e => updatePlayerField(team.id, member.user_id, 'wins', parseInt(e.target.value) || 0)}
                            className="bg-gray-700 border-gray-600 text-white w-24 h-8"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Team Total Row */}
                    <TableRow className="border-gray-700 bg-gray-700/20">
                      <TableCell colSpan={2}>
                        <span className="text-purple-400 font-bold">Team Total</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-green-400 font-bold text-lg">{team.totalPoints}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-400 font-bold text-lg">{team.totalKills}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-yellow-400 font-bold text-lg">{team.totalWins}</span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
};

export default PlayerPointsAdmin;
