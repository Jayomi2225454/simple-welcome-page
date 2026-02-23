import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, ChevronDown, ChevronRight, Save, Loader2, RefreshCw, User, Trophy, Crosshair, Award, Hash } from 'lucide-react';
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

      const teamIds = teamsData.map(t => t.id);
      const { data: membersData, error: membersError } = await supabase
        .from('tournament_team_members')
        .select('team_id, user_id, role')
        .in('team_id', teamIds);

      if (membersError) throw membersError;

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

        return {
          id: team.id,
          team_name: team.team_name,
          members: teamMembers,
          totalPoints: teamMembers.reduce((s, m) => s + m.points, 0),
          totalKills: teamMembers.reduce((s, m) => s + m.kills, 0),
          totalWins: teamMembers.reduce((s, m) => s + m.wins, 0),
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

  const expandAll = () => setExpandedTeams(new Set(teams.map(t => t.id)));
  const collapseAll = () => setExpandedTeams(new Set());

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
      <Card className="bg-card border-border">
        <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading registered teams...</p>
        </CardContent>
      </Card>
    );
  }

  if (teams.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No registered teams found</p>
          <p className="text-muted-foreground text-sm">Teams will appear here once players register for this tournament.</p>
        </CardContent>
      </Card>
    );
  }

  const totalAllPoints = teams.reduce((s, t) => s + t.totalPoints, 0);
  const totalAllKills = teams.reduce((s, t) => s + t.totalKills, 0);
  const totalAllWins = teams.reduce((s, t) => s + t.totalWins, 0);
  const totalPlayers = teams.reduce((s, t) => s + t.members.length, 0);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{teams.length}</p>
              <p className="text-xs text-muted-foreground">Teams</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalPlayers}</p>
              <p className="text-xs text-muted-foreground">Players</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Trophy className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalAllPoints}</p>
              <p className="text-xs text-muted-foreground">Total Points</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Crosshair className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalAllKills}</p>
              <p className="text-xs text-muted-foreground">Total Kills</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-primary" />
                Registered Teams & Player Points
              </CardTitle>
              <CardDescription className="mt-1">
                Manage individual player scores — team totals auto-calculate
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={expandAll} variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground">
                Expand All
              </Button>
              <Button onClick={collapseAll} variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground">
                Collapse All
              </Button>
              <Button onClick={loadTeamsAndPlayers} variant="outline" size="sm" className="h-8">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
              </Button>
              <Button onClick={handleSaveAll} disabled={saving} size="sm" className="h-8 bg-primary hover:bg-primary/90">
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                Save All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {teams.map((team, index) => (
            <Collapsible key={team.id} open={expandedTeams.has(team.id)} onOpenChange={() => toggleTeam(team.id)}>
              <CollapsibleTrigger asChild>
                <div className="group flex items-center justify-between p-3 bg-secondary/50 rounded-lg cursor-pointer hover:bg-secondary/80 transition-all border border-transparent hover:border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary text-xs font-bold">
                      {expandedTeams.has(team.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs font-mono">#{index + 1}</span>
                      <span className="text-foreground font-semibold text-sm">{team.team_name}</span>
                      <Badge variant="secondary" className="text-xs h-5 px-1.5">
                        {team.members.length} {team.members.length === 1 ? 'player' : 'players'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5 bg-green-500/10 rounded-md px-2.5 py-1">
                      <Trophy className="w-3 h-3 text-green-400" />
                      <span className="text-green-400 font-bold text-sm">{team.totalPoints}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 bg-red-500/10 rounded-md px-2.5 py-1">
                      <Crosshair className="w-3 h-3 text-red-400" />
                      <span className="text-red-400 font-bold text-sm">{team.totalKills}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 bg-yellow-500/10 rounded-md px-2.5 py-1">
                      <Award className="w-3 h-3 text-yellow-400" />
                      <span className="text-yellow-400 font-bold text-sm">{team.totalWins}</span>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 sm:ml-10 mt-1 mb-2 border border-border rounded-lg overflow-hidden bg-card/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border bg-secondary/30 hover:bg-secondary/30">
                        <TableHead className="text-muted-foreground text-xs font-semibold">Player</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Role</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold w-24">
                          <div className="flex items-center gap-1"><Trophy className="w-3 h-3 text-green-400" /> Points</div>
                        </TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold w-24">
                          <div className="flex items-center gap-1"><Crosshair className="w-3 h-3 text-red-400" /> Kills</div>
                        </TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold w-24">
                          <div className="flex items-center gap-1"><Award className="w-3 h-3 text-yellow-400" /> Wins</div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {team.members.map(member => (
                        <TableRow key={member.user_id} className="border-border hover:bg-secondary/20">
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <span className="text-foreground text-sm font-medium">{member.player_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge
                              variant="outline"
                              className={
                                member.role === 'captain'
                                  ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400 text-xs'
                                  : 'border-border text-muted-foreground text-xs'
                              }
                            >
                              {member.role === 'captain' ? '👑 Captain' : member.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Input
                              type="number"
                              value={member.points}
                              onChange={e => updatePlayerField(team.id, member.user_id, 'points', parseInt(e.target.value) || 0)}
                              className="bg-secondary border-border text-foreground w-20 h-8 text-sm text-center"
                            />
                          </TableCell>
                          <TableCell className="py-2">
                            <Input
                              type="number"
                              value={member.kills}
                              onChange={e => updatePlayerField(team.id, member.user_id, 'kills', parseInt(e.target.value) || 0)}
                              className="bg-secondary border-border text-foreground w-20 h-8 text-sm text-center"
                            />
                          </TableCell>
                          <TableCell className="py-2">
                            <Input
                              type="number"
                              value={member.wins}
                              onChange={e => updatePlayerField(team.id, member.user_id, 'wins', parseInt(e.target.value) || 0)}
                              className="bg-secondary border-border text-foreground w-20 h-8 text-sm text-center"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Team Total Row */}
                      <TableRow className="border-border bg-primary/5 hover:bg-primary/5">
                        <TableCell colSpan={2} className="py-2.5">
                          <span className="text-primary font-bold text-sm flex items-center gap-1.5">
                            <Hash className="w-3.5 h-3.5" /> Team Total
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span className="text-green-400 font-bold text-base">{team.totalPoints}</span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span className="text-red-400 font-bold text-base">{team.totalKills}</span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span className="text-yellow-400 font-bold text-base">{team.totalWins}</span>
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
    </div>
  );
};

export default PlayerPointsAdmin;
