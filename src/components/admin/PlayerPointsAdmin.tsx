import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, ChevronDown, ChevronRight, Save, Loader2, RefreshCw, User, Trophy, Crosshair, Award, Hash, Settings, Gamepad, Phone, Mail, Info, Plus, Trash2, Medal, Check, CloudUpload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlayerProfile {
  username?: string;
  display_name?: string;
  name?: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
  game_id?: string;
}

interface RegistrationData {
  game_id?: string;
  player_name?: string;
  custom_fields_data?: Record<string, any>;
  payment_status?: string;
}

interface TeamMember {
  user_id: string;
  player_name: string;
  role: string;
  points: number;
  kills: number;
  wins: number;
  profile?: PlayerProfile;
  registration?: RegistrationData;
}

interface RegisteredTeam {
  id: string;
  team_name: string;
  members: TeamMember[];
  totalPoints: number;
  totalKills: number;
  totalWins: number;
}

// Aggregated team for final table
interface AggregatedTeam {
  id: string;
  team_name: string;
  members: { user_id: string; player_name: string; totalKills: number; totalPoints: number; bestPosition: number }[];
  totalPoints: number;
  totalKills: number;
}

interface PlayerPointsAdminProps {
  tournamentId: string;
  selectedMatch: number;
  totalMatches: number;
}

const PlayerPointsAdmin = ({ tournamentId, selectedMatch, totalMatches }: PlayerPointsAdminProps) => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<RegisteredTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [showFinalTable, setShowFinalTable] = useState(false);
  const [aggregatedTeams, setAggregatedTeams] = useState<AggregatedTeam[]>([]);
  const [killPointsValue, setKillPointsValue] = useState(1);
  const [winPointsValue, setWinPointsValue] = useState(1);
  const [positionPoints, setPositionPoints] = useState<{ position: number; points: number }[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  const teamsRef = useRef(teams);

  useEffect(() => {
    if (tournamentId) {
      loadPointSettings();
    }
  }, [tournamentId]);

  useEffect(() => {
    if (tournamentId) {
      loadTeamsAndPlayers();
    }
  }, [tournamentId, selectedMatch]);

  const loadPointSettings = async () => {
    try {
      const { data } = await supabase
        .from('tournaments')
        .select('kill_points_value, win_points_value, position_points')
        .eq('id', tournamentId)
        .single();
      if (data) {
        setKillPointsValue((data as any).kill_points_value ?? 1);
        setWinPointsValue((data as any).win_points_value ?? 1);
        const pp = (data as any).position_points;
        if (Array.isArray(pp) && pp.length > 0) {
          setPositionPoints(pp);
        }
      }
    } catch (e) {
      console.error('Error loading point settings:', e);
    }
  };

  const savePointSettings = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          kill_points_value: killPointsValue,
          win_points_value: winPointsValue,
          position_points: positionPoints,
        } as any)
        .eq('id', tournamentId);
      if (error) throw error;
      toast({ title: 'Settings Saved', description: `1 Kill = ${killPointsValue} pts` });
      recalculateAllPoints();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  const addPositionPoint = () => {
    const nextPos = positionPoints.length > 0 ? Math.max(...positionPoints.map(p => p.position)) + 1 : 1;
    setPositionPoints([...positionPoints, { position: nextPos, points: 0 }]);
  };

  const removePositionPoint = (index: number) => {
    setPositionPoints(positionPoints.filter((_, i) => i !== index));
  };

  const updatePositionPoint = (index: number, field: 'position' | 'points', value: number) => {
    setPositionPoints(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const getPositionBonus = (position: number) => {
    const entry = positionPoints.find(p => p.position === position);
    return entry ? entry.points : 0;
  };

  const recalculateAllPoints = () => {
    setTeams(prev => prev.map(team => {
      const members = team.members.map(m => ({
        ...m,
        points: m.kills * killPointsValue + getPositionBonus(m.wins),
      }));
      return {
        ...team,
        members,
        totalPoints: members.reduce((s, m) => s + m.points, 0),
        totalKills: members.reduce((s, m) => s + m.kills, 0),
        totalWins: members.reduce((s, m) => s + m.wins, 0),
      };
    }));
  };

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
      let profilesMap: Record<string, PlayerProfile> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, name, email, phone_number, avatar_url, game_id')
          .in('user_id', userIds);

        (profiles || []).forEach(p => {
          profilesMap[p.user_id] = {
            username: p.username || undefined,
            display_name: p.display_name || undefined,
            name: p.name || undefined,
            email: p.email || undefined,
            phone_number: p.phone_number || undefined,
            avatar_url: p.avatar_url || undefined,
            game_id: p.game_id || undefined,
          };
        });
      }

      let registrationMap: Record<string, RegistrationData> = {};
      if (userIds.length > 0) {
        const { data: regs } = await supabase
          .from('tournament_registrations')
          .select('user_id, game_id, player_name, custom_fields_data, payment_status')
          .eq('tournament_id', tournamentId)
          .in('user_id', userIds);

        (regs || []).forEach(r => {
          registrationMap[r.user_id] = {
            game_id: r.game_id,
            player_name: r.player_name,
            custom_fields_data: r.custom_fields_data as Record<string, any> || undefined,
            payment_status: r.payment_status || undefined,
          };
        });
      }

      // Load player points for the SELECTED MATCH only
      const { data: playerPoints } = await supabase
        .from('tournament_player_points')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('match_number', selectedMatch) as any;

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
            const profile = profilesMap[m.user_id];
            const playerName = profile?.display_name || profile?.username || profile?.name || profile?.email || 'Unknown Player';
            return {
              user_id: m.user_id,
              player_name: playerName,
              role: m.role,
              points: existing?.points || 0,
              kills: existing?.kills || 0,
              wins: existing?.wins || 0,
              profile: profile,
              registration: registrationMap[m.user_id],
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

  // Load aggregated data across all matches for the final table
  const loadAggregatedData = async () => {
    try {
      const { data: allPoints } = await supabase
        .from('tournament_player_points')
        .select('*')
        .eq('tournament_id', tournamentId);

      const { data: teamsData } = await supabase
        .from('tournament_teams')
        .select('id, team_name')
        .eq('tournament_id', tournamentId);

      if (!teamsData || !allPoints) return;

      const aggTeams: AggregatedTeam[] = teamsData.map(team => {
        const teamPoints = allPoints.filter(p => p.team_id === team.id);
        const playerMap = new Map<string, { user_id: string; player_name: string; totalKills: number; totalPoints: number; bestPosition: number }>();

        teamPoints.forEach(pp => {
          const existing = playerMap.get(pp.user_id);
          if (existing) {
            existing.totalKills += pp.kills;
            existing.totalPoints += pp.points;
            if (pp.wins > 0 && (existing.bestPosition === 0 || pp.wins < existing.bestPosition)) {
              existing.bestPosition = pp.wins;
            }
          } else {
            playerMap.set(pp.user_id, {
              user_id: pp.user_id,
              player_name: pp.player_name,
              totalKills: pp.kills,
              totalPoints: pp.points,
              bestPosition: pp.wins || 0,
            });
          }
        });

        const members = Array.from(playerMap.values());
        return {
          id: team.id,
          team_name: team.team_name,
          members,
          totalPoints: members.reduce((s, m) => s + m.totalPoints, 0),
          totalKills: members.reduce((s, m) => s + m.totalKills, 0),
        };
      });

      // Sort by total points descending
      aggTeams.sort((a, b) => b.totalPoints - a.totalPoints);
      setAggregatedTeams(aggTeams);
    } catch (error: any) {
      console.error('Error loading aggregated data:', error);
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

  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  const autoSave = useCallback(async () => {
    if (!isDirtyRef.current) return;
    const currentTeams = teamsRef.current;
    setSaveStatus('saving');
    try {
      for (const team of currentTeams) {
        for (const member of team.members) {
          // Check if record exists for this specific match
          const { data: existingPlayer } = await supabase
            .from('tournament_player_points')
            .select('id')
            .eq('tournament_id', tournamentId)
            .eq('team_id', team.id)
            .eq('user_id', member.user_id)
            .eq('match_number', selectedMatch)
            .maybeSingle();

          if (existingPlayer) {
            const { error } = await supabase
              .from('tournament_player_points')
              .update({
                player_name: member.player_name,
                points: member.points,
                kills: member.kills,
                wins: member.wins,
              })
              .eq('id', existingPlayer.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('tournament_player_points')
              .insert({
                tournament_id: tournamentId,
                team_id: team.id,
                user_id: member.user_id,
                player_name: member.player_name,
                points: member.points,
                kills: member.kills,
                wins: member.wins,
                match_number: selectedMatch,
              });
            if (error) throw error;
          }
        }
      }
      // Sync aggregated totals to tournament_points so user-facing table shows correct data
      await syncTeamTotalsToTournamentPoints(currentTeams);

      isDirtyRef.current = false;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
      console.error('Auto-save error:', error);
      setSaveStatus('idle');
      toast({ title: 'Auto-save failed', description: error.message, variant: 'destructive' });
    }
  }, [tournamentId, selectedMatch, toast]);

  // Sync team totals from player points to tournament_points table
  const syncTeamTotalsToTournamentPoints = async (currentTeams: RegisteredTeam[]) => {
    try {
      for (const team of currentTeams) {
        const teamKills = team.members.reduce((s, m) => s + m.kills, 0);
        const teamPoints = team.members.reduce((s, m) => s + m.points, 0);
        const teamWins = team.members.reduce((s, m) => s + m.wins, 0);

        // Check if tournament_points entry exists for this team+match
        const { data: existing } = await supabase
          .from('tournament_points')
          .select('id')
          .eq('tournament_id', tournamentId)
          .eq('team_id', team.id)
          .eq('match_number', selectedMatch)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('tournament_points')
            .update({
              kills: teamKills,
              points: teamPoints,
              wins: teamWins,
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('tournament_points')
            .insert({
              tournament_id: tournamentId,
              team_id: team.id,
              team_name: team.team_name,
              kills: teamKills,
              points: teamPoints,
              wins: teamWins,
              position: 1,
              match_number: selectedMatch,
            });
        }
      }

      // Now recalculate positions for this match
      const { data: matchEntries } = await supabase
        .from('tournament_points')
        .select('id, points')
        .eq('tournament_id', tournamentId)
        .eq('match_number', selectedMatch)
        .order('points', { ascending: false });

      if (matchEntries) {
        for (let i = 0; i < matchEntries.length; i++) {
          await supabase
            .from('tournament_points')
            .update({ position: i + 1 })
            .eq('id', matchEntries[i].id);
        }
      }
    } catch (error: any) {
      console.error('Error syncing team totals:', error);
    }
  };

  const triggerAutoSave = useCallback(() => {
    isDirtyRef.current = true;
    setSaveStatus('idle');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      autoSave();
    }, 1500);
  }, [autoSave]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const updatePlayerField = (teamId: string, userId: string, field: 'kills' | 'wins', value: number) => {
    setTeams(prev => prev.map(team => {
      if (team.id !== teamId) return team;
      const members = team.members.map(m => {
        if (m.user_id !== userId) return m;
        const updated = { ...m, [field]: value };
        updated.points = updated.kills * killPointsValue + getPositionBonus(updated.wins);
        return updated;
      });
      return {
        ...team,
        members,
        totalPoints: members.reduce((s, m) => s + m.points, 0),
        totalKills: members.reduce((s, m) => s + m.kills, 0),
        totalWins: members.reduce((s, m) => s + m.wins, 0),
      };
    }));
    triggerAutoSave();
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
  const totalPlayers = teams.reduce((s, t) => s + t.members.length, 0);

  return (
    <div className="space-y-4">
      {/* Point Multiplier Settings */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2 text-base">
              <Settings className="w-4 h-4 text-primary" />
              Point Multiplier Settings
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className="text-xs">
              {showSettings ? 'Hide' : 'Configure'}
            </Button>
          </div>
          {!showSettings && (
            <p className="text-xs text-muted-foreground mt-1">
              1 Kill = <span className="text-primary font-bold">{killPointsValue}</span> pts
              {positionPoints.length > 0 && (
                <> · <span className="text-amber-400 font-bold">{positionPoints.length}</span> position bonuses configured</>
              )}
            </p>
          )}
        </CardHeader>
        {showSettings && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-red-400" /> Points per Kill
              </Label>
              <Input
                type="number"
                min={0}
                value={killPointsValue}
                onChange={e => setKillPointsValue(parseInt(e.target.value) || 0)}
                className="bg-secondary border-border text-foreground h-9"
              />
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Medal className="w-3.5 h-3.5 text-amber-400" /> Points per Position
                </Label>
                <Button onClick={addPositionPoint} variant="outline" size="sm" className="h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Add Position
                </Button>
              </div>
              {positionPoints.length > 0 ? (
                <div className="space-y-2">
                  {positionPoints
                    .sort((a, b) => a.position - b.position)
                    .map((pp, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 min-w-[80px]">
                          <span className="text-xs text-muted-foreground w-4">#{pp.position}</span>
                          <Input
                            type="number"
                            min={1}
                            value={pp.position}
                            onChange={e => updatePositionPoint(index, 'position', parseInt(e.target.value) || 1)}
                            className="bg-secondary border-border text-foreground h-7 w-16 text-xs"
                            placeholder="Pos"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">=</span>
                        <Input
                          type="number"
                          min={0}
                          value={pp.points}
                          onChange={e => updatePositionPoint(index, 'points', parseInt(e.target.value) || 0)}
                          className="bg-secondary border-border text-foreground h-7 w-20 text-xs"
                          placeholder="Points"
                        />
                        <span className="text-xs text-muted-foreground">pts</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePositionPoint(index)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No position points configured.</p>
              )}
            </div>

            <div className="flex items-center gap-3 mt-4">
              <Button onClick={savePointSettings} disabled={savingSettings} size="sm" className="bg-primary hover:bg-primary/90">
                {savingSettings ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                Save & Recalculate
              </Button>
              <p className="text-xs text-muted-foreground">
                Formula: <span className="text-foreground font-mono">(Kills × {killPointsValue}) + Position Bonus = Total Points</span>
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{teams.length}</p><p className="text-xs text-muted-foreground">Teams</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><User className="w-5 h-5 text-blue-400" /></div>
            <div><p className="text-2xl font-bold text-foreground">{totalPlayers}</p><p className="text-xs text-muted-foreground">Players</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><Trophy className="w-5 h-5 text-green-400" /></div>
            <div><p className="text-2xl font-bold text-foreground">{totalAllPoints}</p><p className="text-xs text-muted-foreground">Match {selectedMatch} Points</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><Crosshair className="w-5 h-5 text-red-400" /></div>
            <div><p className="text-2xl font-bold text-foreground">{totalAllKills}</p><p className="text-xs text-muted-foreground">Match {selectedMatch} Kills</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Match Teams Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-primary" />
                Match {selectedMatch} — Player Points
              </CardTitle>
              <CardDescription className="mt-1">
                Manage kills & position for Match {selectedMatch}. Points auto-calculate: (Kills × {killPointsValue}) + Position Bonus
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {saveStatus === 'saving' && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
                  <CloudUpload className="w-3.5 h-3.5" /><span>Saving...</span>
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="flex items-center gap-1.5 text-xs text-green-400">
                  <Check className="w-3.5 h-3.5" /><span>Saved</span>
                </div>
              )}
              <Button onClick={expandAll} variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground">Expand All</Button>
              <Button onClick={collapseAll} variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground">Collapse All</Button>
              <Button onClick={loadTeamsAndPlayers} variant="outline" size="sm" className="h-8">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
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
                      {expandedTeams.has(team.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
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
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 sm:ml-10 mt-1 mb-2 border border-border rounded-lg overflow-hidden bg-card/50">
                  {team.members.map(member => (
                    <div key={member.user_id} className="border-b border-border last:border-b-0">
                      <div className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {member.profile?.avatar_url ? (
                              <img src={member.profile.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                            ) : (
                              <User className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-foreground text-sm font-semibold truncate">{member.player_name}</span>
                              <Badge
                                variant="outline"
                                className={
                                  member.role === 'captain'
                                    ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400 text-[10px] h-4 px-1'
                                    : 'border-border text-muted-foreground text-[10px] h-4 px-1'
                                }
                              >
                                {member.role === 'captain' ? '👑 Captain' : member.role}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                              {member.registration?.game_id && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Gamepad className="w-3 h-3" /> {member.registration.game_id}
                                </span>
                              )}
                              {member.profile?.email && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Mail className="w-3 h-3" /> {member.profile.email}
                                </span>
                              )}
                              {member.profile?.phone_number && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {member.profile.phone_number}
                                </span>
                              )}
                            </div>
                            {member.registration?.custom_fields_data && Object.keys(member.registration.custom_fields_data).filter(k => !k.startsWith('rejection_')).length > 0 && (
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                {Object.entries(member.registration.custom_fields_data)
                                  .filter(([key]) => !key.startsWith('rejection_'))
                                  .map(([key, value]) => (
                                    <span key={key} className="text-[11px] text-muted-foreground flex items-center gap-1">
                                      <Info className="w-3 h-3" />
                                      <span className="capitalize">{key.replace(/_/g, ' ')}:</span> <span className="text-foreground">{String(value)}</span>
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-center">
                            <label className="text-[10px] text-red-400 flex items-center gap-0.5 justify-center mb-0.5">
                              <Crosshair className="w-2.5 h-2.5" /> Kills
                            </label>
                            <Input
                              type="number"
                              value={member.kills}
                              onChange={e => updatePlayerField(team.id, member.user_id, 'kills', parseInt(e.target.value) || 0)}
                              className="bg-secondary border-border text-foreground w-16 h-8 text-sm text-center"
                            />
                          </div>
                          <div className="text-center">
                            <label className="text-[10px] text-amber-400 flex items-center gap-0.5 justify-center mb-0.5">
                              <Medal className="w-2.5 h-2.5" /> Position
                            </label>
                            <Select
                              value={String(member.wins || 0)}
                              onValueChange={(v) => updatePlayerField(team.id, member.user_id, 'wins', parseInt(v))}
                            >
                              <SelectTrigger className="bg-secondary border-border text-foreground w-20 h-8 text-sm">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border-border max-h-60">
                                <SelectItem value="0">-</SelectItem>
                                {Array.from({ length: Math.max(teams.length, 30) }, (_, i) => i + 1).map(pos => (
                                  <SelectItem key={pos} value={String(pos)}>
                                    #{pos} {getPositionBonus(pos) > 0 ? `(+${getPositionBonus(pos)})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="text-center">
                            <label className="text-[10px] text-green-400 flex items-center gap-0.5 justify-center mb-0.5">
                              <Trophy className="w-2.5 h-2.5" /> Points
                            </label>
                            <div className="bg-green-500/10 border border-green-500/20 rounded-md w-16 h-8 flex items-center justify-center">
                              <span className="text-green-400 font-bold text-sm">{member.points}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="bg-primary/5 px-3 py-2.5 flex items-center justify-between">
                    <span className="text-primary font-bold text-sm flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" /> Team Total (Match {selectedMatch})
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-red-400 font-bold text-sm">{team.totalKills} kills</span>
                      <span className="text-green-400 font-bold text-base">{team.totalPoints} pts</span>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Final Aggregated Table - show when multiple matches */}
      {totalMatches > 1 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2 text-lg">
                <Trophy className="w-5 h-5 text-amber-400" />
                Final Aggregated Points (All {totalMatches} Matches)
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowFinalTable(!showFinalTable);
                  if (!showFinalTable) loadAggregatedData();
                }}
              >
                {showFinalTable ? 'Hide' : 'Show Final Table'}
              </Button>
            </div>
            <CardDescription>Combined totals across all matches — this is what users see.</CardDescription>
          </CardHeader>
          {showFinalTable && (
            <CardContent className="pt-0">
              {aggregatedTeams.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No data yet. Add points in individual matches first.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">#</TableHead>
                        <TableHead className="text-muted-foreground">Team</TableHead>
                        <TableHead className="text-muted-foreground text-center">Total Kills</TableHead>
                        <TableHead className="text-muted-foreground text-center">Total Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aggregatedTeams.map((team, idx) => (
                        <TableRow key={team.id} className="border-border">
                          <TableCell className="text-foreground font-bold">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="text-foreground font-semibold">{team.team_name}</span>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {team.members.map(m => m.player_name).join(', ')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-red-400 font-bold">{team.totalKills}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-green-400 font-bold text-lg">{team.totalPoints}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};

export default PlayerPointsAdmin;
