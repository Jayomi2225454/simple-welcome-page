import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, Users, Settings2, Image, ExternalLink, Loader2, MessageSquare, Edit, Save, Crown, UserMinus, UserCheck, ShieldAlert, AlertTriangle, RefreshCw, Trash2, Shield, Info, Copy, UserX, Search, Key, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import TournamentCustomFieldsAdmin from './TournamentCustomFieldsAdmin';

interface Registration {
  id: string;
  user_id: string;
  tournament_id: string;
  player_name: string;
  game_id: string;
  status: string | null;
  payment_status: string | null;
  payment_amount: number | null;
  payment_screenshot_url: string | null;
  custom_fields_data: Record<string, any> | null;
  created_at: string | null;
}

interface Tournament {
  id: string;
  name: string;
  game: string;
  entry_fee: string | null;
}

interface AdminTeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    in_game_name?: string | null;
    game_id: string | null;
    avatar_url?: string | null;
    phone_number?: string | null;
    email?: string | null;
  } | null;
  registration?: {
    id: string;
    player_name: string;
    game_id: string;
    payment_status: string | null;
    payment_amount: number | null;
  } | null;
}

interface AdminTeam {
  id: string;
  tournament_id: string;
  team_name: string;
  captain_user_id: string;
  max_members: number;
  current_members: number;
  is_full: boolean;
  status: string;
  created_at: string;
  team_code?: string | null;
  password?: string | null;
  captain?: {
    user_id: string;
    name: string;
    game_id: string;
    profile?: any;
    registration?: any;
  };
  members: AdminTeamMember[];
}

const TournamentRegistrationsAdmin = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null);
  const [screenshotUrls, setScreenshotUrls] = useState<Record<string, string>>({});
  
  // Teams management state
  const [adminViewTab, setAdminViewTab] = useState<'registrations' | 'teams'>('registrations');
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [teamStatusFilter, setTeamStatusFilter] = useState<'all' | 'full' | 'recruiting'>('all');

  // Dialog states for team administration
  const [changeCaptainDialog, setChangeCaptainDialog] = useState<AdminTeam | null>(null);
  const [selectedNewCaptainId, setSelectedNewCaptainId] = useState<string>('');
  const [processingCaptainChange, setProcessingCaptainChange] = useState(false);

  const [removeCaptainDialog, setRemoveCaptainDialog] = useState<AdminTeam | null>(null);
  const [replacementCaptainId, setReplacementCaptainId] = useState<string>('');
  const [processingCaptainRemoval, setProcessingCaptainRemoval] = useState(false);

  const [removeMemberData, setRemoveMemberData] = useState<{ team: AdminTeam; member: AdminTeamMember } | null>(null);
  const [processingMemberRemoval, setProcessingMemberRemoval] = useState(false);

  const [disbandTeamDialog, setDisbandTeamDialog] = useState<AdminTeam | null>(null);
  const [processingDisband, setProcessingDisband] = useState(false);
  
  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRegistration, setRejectingRegistration] = useState<Registration | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, string>>({});
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editGameId, setEditGameId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [customFieldDefs, setCustomFieldDefs] = useState<{ field_name: string; field_label: string; field_type: string }[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadRegistrations();
      loadTeams();
    }
  }, [selectedTournament]);

  // Load signed URLs for payment screenshots
  useEffect(() => {
    const loadScreenshotUrls = async () => {
      const urlMap: Record<string, string> = {};
      
      for (const reg of registrations) {
        if (reg.payment_screenshot_url) {
          try {
            // Check if it's already a full URL (public bucket) or needs signing
            if (reg.payment_screenshot_url.startsWith('http')) {
              urlMap[reg.id] = reg.payment_screenshot_url;
            } else {
              // Get signed URL from private bucket
              const { data } = await supabase.storage
                .from('payment-screenshots')
                .createSignedUrl(reg.payment_screenshot_url, 3600); // 1 hour expiry
              
              if (data?.signedUrl) {
                urlMap[reg.id] = data.signedUrl;
              }
            }
          } catch (error) {
            console.error('Error getting signed URL:', error);
          }
        }
      }
      
      setScreenshotUrls(urlMap);
    };

    if (registrations.length > 0) {
      loadScreenshotUrls();
    }
  }, [registrations]);

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, game, entry_fee')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
      if (data && data.length > 0) {
        setSelectedTournament(data[0].id);
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
    }
  };

  const loadRegistrations = async () => {
    if (!selectedTournament) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', selectedTournament)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations((data || []) as Registration[]);
    } catch (error) {
      console.error('Error loading registrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load registrations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (registrationId: string) => {
    setProcessingId(registrationId);
    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ 
          payment_status: 'completed',
          status: 'confirmed'
        })
        .eq('id', registrationId);

      if (error) throw error;

      toast({
        title: 'Payment Approved',
        description: 'Registration has been approved successfully'
      });
      loadRegistrations();
    } catch (error) {
      console.error('Error approving payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve payment',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (registration: Registration) => {
    setRejectingRegistration(registration);
    setRejectComment('');
    setRejectDialogOpen(true);
  };

  const handleRejectPayment = async () => {
    if (!rejectingRegistration) return;
    
    setProcessingId(rejectingRegistration.id);
    try {
      // Update registration with rejection - store comment in custom_fields_data
      const existingData = rejectingRegistration.custom_fields_data || {};
      const updatedData = {
        ...existingData,
        rejection_comment: rejectComment,
        rejection_date: new Date().toISOString()
      };

      const { error } = await supabase
        .from('tournament_registrations')
        .update({ 
          payment_status: 'rejected',
          status: 'registered',
          custom_fields_data: updatedData
        })
        .eq('id', rejectingRegistration.id);

      if (error) throw error;

      toast({
        title: 'Payment Rejected',
        description: rejectComment ? 'Registration rejected with comment' : 'User can re-submit payment'
      });
      
      setRejectDialogOpen(false);
      setRejectingRegistration(null);
      setRejectComment('');
      loadRegistrations();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject payment',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (paymentStatus: string | null) => {
    switch (paymentStatus) {
      case 'completed':
        return <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      default:
        return <Badge variant="outline">{paymentStatus || 'Unknown'}</Badge>;
    }
  };

  const getScreenshotUrl = (registration: Registration): string | null => {
    return screenshotUrls[registration.id] || null;
  };

  const openEditDialog = async (registration: Registration) => {
    setEditingRegistration(registration);
    setEditPlayerName(registration.player_name);
    setEditGameId(registration.game_id);
    
    // Extract custom fields data (excluding rejection_ keys)
    const cfData = registration.custom_fields_data || {};
    const cleanData: Record<string, string> = {};
    Object.entries(cfData).forEach(([key, value]) => {
      if (!key.startsWith('rejection_')) {
        cleanData[key] = String(value);
      }
    });
    setEditFormData(cleanData);
    
    // Load custom field definitions for labels
    if (selectedTournament) {
      const { data } = await supabase
        .from('tournament_custom_fields')
        .select('field_name, field_label, field_type')
        .eq('tournament_id', selectedTournament)
        .order('display_order', { ascending: true });
      setCustomFieldDefs(data || []);
    }
    
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRegistration) return;
    setSavingEdit(true);
    try {
      // Preserve rejection data
      const existingData = editingRegistration.custom_fields_data || {};
      const rejectionData: Record<string, any> = {};
      Object.entries(existingData).forEach(([key, value]) => {
        if (key.startsWith('rejection_')) {
          rejectionData[key] = value;
        }
      });

      const updatedCustomFields = { ...editFormData, ...rejectionData };

      const { error } = await supabase
        .from('tournament_registrations')
        .update({
          player_name: editPlayerName,
          game_id: editGameId,
          custom_fields_data: updatedCustomFields
        })
        .eq('id', editingRegistration.id);

      if (error) throw error;

      toast({ title: 'Updated', description: 'Registration updated successfully' });
      setEditDialogOpen(false);
      setEditingRegistration(null);
      loadRegistrations();
    } catch (error) {
      console.error('Error updating registration:', error);
      toast({ title: 'Error', description: 'Failed to update registration', variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  const loadTeams = async () => {
    if (!selectedTournament) return;
    setLoadingTeams(true);
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', selectedTournament)
        .order('created_at', { ascending: false });

      if (teamsError) throw teamsError;

      if (!teamsData || teamsData.length === 0) {
        setTeams([]);
        return;
      }

      const teamIds = teamsData.map(t => t.id);
      const { data: membersData, error: membersError } = await supabase
        .from('tournament_team_members')
        .select('*')
        .in('team_id', teamIds)
        .order('joined_at', { ascending: true });

      if (membersError) console.error('Error loading team members:', membersError);

      const memberList = membersData || [];
      const userIds = Array.from(new Set([
        ...memberList.map(m => m.user_id),
        ...teamsData.map(t => t.captain_user_id).filter(Boolean)
      ]));

      const [profilesRes, regRes] = await Promise.all([
        userIds.length > 0 ? supabase
          .from('profiles')
          .select('user_id, username, display_name, in_game_name, game_id, avatar_url, phone_number, email')
          .in('user_id', userIds) : Promise.resolve({ data: [] }),
        userIds.length > 0 ? supabase
          .from('tournament_registrations')
          .select('id, user_id, player_name, game_id, payment_status, payment_amount')
          .eq('tournament_id', selectedTournament)
          .in('user_id', userIds) : Promise.resolve({ data: [] })
      ]);

      const profilesMap: Record<string, any> = {};
      if (profilesRes.data) {
        profilesRes.data.forEach(p => { profilesMap[p.user_id] = p; });
      }

      const regMap: Record<string, any> = {};
      if (regRes.data) {
        regRes.data.forEach(r => { regMap[r.user_id] = r; });
      }

      const mappedTeams: AdminTeam[] = teamsData.map(team => {
        let teamMembers: AdminTeamMember[] = memberList
          .filter(m => m.team_id === team.id)
          .map(member => ({
            ...member,
            profile: profilesMap[member.user_id] || null,
            registration: regMap[member.user_id] || null
          }));

        // Ensure captain is included in the member list if not already present
        if (team.captain_user_id && !teamMembers.some(m => m.user_id === team.captain_user_id)) {
          const capProfile = profilesMap[team.captain_user_id];
          const capReg = regMap[team.captain_user_id];
          teamMembers.unshift({
            id: `cap-${team.id}`,
            team_id: team.id,
            user_id: team.captain_user_id,
            role: 'captain',
            joined_at: team.created_at || new Date().toISOString(),
            profile: capProfile || null,
            registration: capReg || null
          });
        }

        // Sort so captain is always first
        teamMembers.sort((a, b) => {
          if (a.role === 'captain' || a.user_id === team.captain_user_id) return -1;
          if (b.role === 'captain' || b.user_id === team.captain_user_id) return 1;
          return 0;
        });

        const capProfile = profilesMap[team.captain_user_id];
        const capReg = regMap[team.captain_user_id];
        const capName = capProfile?.in_game_name || capProfile?.display_name || capProfile?.username || capReg?.player_name || 'Team Captain';

        return {
          ...team,
          captain: {
            user_id: team.captain_user_id,
            name: capName,
            game_id: capProfile?.game_id || capReg?.game_id || 'N/A',
            profile: capProfile,
            registration: capReg
          },
          members: teamMembers
        };
      });

      setTeams(mappedTeams);
    } catch (error: any) {
      console.error('Error loading teams:', error);
      toast({ title: 'Error', description: 'Failed to load tournament teams', variant: 'destructive' });
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleAdminChangeCaptain = async () => {
    if (!changeCaptainDialog || !selectedNewCaptainId) return;
    setProcessingCaptainChange(true);
    try {
      const teamId = changeCaptainDialog.id;

      // Update tournament_teams captain_user_id
      const { error: teamError } = await supabase
        .from('tournament_teams')
        .update({ captain_user_id: selectedNewCaptainId })
        .eq('id', teamId);

      if (teamError) throw teamError;

      // Update roles in tournament_team_members
      await supabase
        .from('tournament_team_members')
        .update({ role: 'member' })
        .eq('team_id', teamId);

      await supabase
        .from('tournament_team_members')
        .update({ role: 'captain' })
        .eq('team_id', teamId)
        .eq('user_id', selectedNewCaptainId);

      toast({
        title: "Captain Reassigned",
        description: "New team captain has been successfully assigned."
      });

      setChangeCaptainDialog(null);
      setSelectedNewCaptainId('');
      loadTeams();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reassign captain",
        variant: "destructive"
      });
    } finally {
      setProcessingCaptainChange(false);
    }
  };

  const handleAdminRemoveCaptain = async () => {
    if (!removeCaptainDialog) return;
    setProcessingCaptainRemoval(true);
    try {
      const team = removeCaptainDialog;
      const captainUserId = team.captain_user_id;
      const remainingMembers = team.members.filter(m => m.user_id !== captainUserId);

      // 1. Remove captain from tournament_team_members
      await supabase
        .from('tournament_team_members')
        .delete()
        .eq('team_id', team.id)
        .eq('user_id', captainUserId);

      // 2. Remove captain registration
      await supabase
        .from('tournament_registrations')
        .delete()
        .eq('tournament_id', team.tournament_id)
        .eq('user_id', captainUserId);

      // 3. Handle succession
      if (remainingMembers.length > 0) {
        const nextCaptainId = replacementCaptainId || remainingMembers[0].user_id;

        await supabase
          .from('tournament_teams')
          .update({
            captain_user_id: nextCaptainId,
            current_members: Math.max(1, remainingMembers.length),
            is_full: false
          })
          .eq('id', team.id);

        await supabase
          .from('tournament_team_members')
          .update({ role: 'captain' })
          .eq('team_id', team.id)
          .eq('user_id', nextCaptainId);

        const newCaptainMember = remainingMembers.find(m => m.user_id === nextCaptainId);
        const newCapName = newCaptainMember?.profile?.in_game_name || newCaptainMember?.profile?.display_name || 'Successor';

        toast({
          title: "Captain Removed & Replacement Assigned",
          description: `Previous captain removed. ${newCapName} is now the new captain.`
        });
      } else {
        // No remaining members -> disband team
        await supabase
          .from('tournament_teams')
          .delete()
          .eq('id', team.id);

        toast({
          title: "Captain Removed & Team Disbanded",
          description: "Captain removed and empty team was disbanded."
        });
      }

      setRemoveCaptainDialog(null);
      setReplacementCaptainId('');
      loadTeams();
      loadRegistrations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove captain",
        variant: "destructive"
      });
    } finally {
      setProcessingCaptainRemoval(false);
    }
  };

  const handleAdminRemoveMember = async () => {
    if (!removeMemberData) return;
    setProcessingMemberRemoval(true);
    try {
      const { team, member } = removeMemberData;

      await supabase
        .from('tournament_team_members')
        .delete()
        .eq('id', member.id);

      await supabase
        .from('tournament_registrations')
        .delete()
        .eq('tournament_id', team.tournament_id)
        .eq('user_id', member.user_id);

      const updatedCount = Math.max(1, team.current_members - 1);
      await supabase
        .from('tournament_teams')
        .update({
          current_members: updatedCount,
          is_full: false
        })
        .eq('id', team.id);

      toast({
        title: "Player Removed",
        description: "Player has been removed from the team roster."
      });

      setRemoveMemberData(null);
      loadTeams();
      loadRegistrations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive"
      });
    } finally {
      setProcessingMemberRemoval(false);
    }
  };

  const handleAdminDisbandTeam = async () => {
    if (!disbandTeamDialog) return;
    setProcessingDisband(true);
    try {
      const teamId = disbandTeamDialog.id;

      await supabase
        .from('tournament_team_members')
        .delete()
        .eq('team_id', teamId);

      await supabase
        .from('tournament_teams')
        .delete()
        .eq('id', teamId);

      toast({
        title: "Team Disbanded",
        description: `Team "${disbandTeamDialog.team_name}" has been deleted.`
      });

      setDisbandTeamDialog(null);
      loadTeams();
      loadRegistrations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disband team",
        variant: "destructive"
      });
    } finally {
      setProcessingDisband(false);
    }
  };

  const selectedTournamentData = tournaments.find(t => t.id === selectedTournament);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`
    });
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = 
      !teamSearchQuery ||
      team.team_name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
      team.team_code.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
      team.members.some(m => 
        (m.profile?.in_game_name && m.profile.in_game_name.toLowerCase().includes(teamSearchQuery.toLowerCase())) ||
        (m.profile?.display_name && m.profile.display_name.toLowerCase().includes(teamSearchQuery.toLowerCase())) ||
        (m.profile?.username && m.profile.username.toLowerCase().includes(teamSearchQuery.toLowerCase())) ||
        (m.profile?.game_id && m.profile.game_id.toLowerCase().includes(teamSearchQuery.toLowerCase()))
      );

    const matchesStatus = 
      teamStatusFilter === 'all' ? true :
      teamStatusFilter === 'full' ? team.is_full :
      !team.is_full;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Tournament Selector & Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="w-80 bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Select a tournament" />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map(tournament => (
                <SelectItem key={tournament.id} value={tournament.id}>
                  {tournament.name} ({tournament.game})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedTournament && (
            <>
              <Button
                onClick={() => setShowCustomFields(true)}
                variant="outline"
                className="border-purple-500 text-purple-400 hover:bg-purple-500/20"
              >
                <Settings2 className="w-4 h-4 mr-2" />
                Custom Fields
              </Button>
              <Button
                onClick={() => { loadRegistrations(); loadTeams(); }}
                variant="outline"
                size="icon"
                className="border-gray-700 text-gray-400 hover:text-white"
                title="Refresh registrations and teams"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {selectedTournament && (
          <div className="flex items-center bg-gray-800 p-1 rounded-lg border border-gray-700">
            <button
              onClick={() => setAdminViewTab('registrations')}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${
                adminViewTab === 'registrations'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Registrations</span>
              <Badge variant="secondary" className="ml-1 bg-black/40 text-[11px] px-1.5 py-0 h-4 text-gray-200">
                {registrations.length}
              </Badge>
            </button>
            <button
              onClick={() => setAdminViewTab('teams')}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${
                adminViewTab === 'teams'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Crown className="w-4 h-4 text-yellow-400" />
              <span>Teams & Captains</span>
              <Badge variant="secondary" className="ml-1 bg-black/40 text-[11px] px-1.5 py-0 h-4 text-gray-200">
                {teams.length}
              </Badge>
            </button>
          </div>
        )}
      </div>

      {/* Individual Registrations View */}
      {adminViewTab === 'registrations' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-500/30">
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {registrations.length}
            </div>
            <div className="text-blue-300 text-sm">Total Registrations</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 border-yellow-500/30">
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {registrations.filter(r => r.payment_status === 'pending').length}
            </div>
            <div className="text-yellow-300 text-sm">Pending Approvals</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-500/30">
          <CardContent className="p-6 text-center">
            <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {registrations.filter(r => r.payment_status === 'completed').length}
            </div>
            <div className="text-green-300 text-sm">Confirmed Players</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-900/50 to-red-800/50 border-red-500/30">
          <CardContent className="p-6 text-center">
            <X className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {registrations.filter(r => r.payment_status === 'rejected').length}
            </div>
            <div className="text-red-300 text-sm">Rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Registrations List */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Tournament Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : registrations.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No registrations found for this tournament
            </div>
          ) : (
            <div className="space-y-4">
              {registrations.map(registration => (
                <Card key={registration.id} className={`border ${
                  registration.payment_status === 'pending' 
                    ? 'bg-yellow-900/20 border-yellow-500/30' 
                    : registration.payment_status === 'rejected'
                    ? 'bg-red-900/20 border-red-500/30'
                    : 'bg-gray-700 border-gray-600'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 rounded-xl bg-purple-500">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-semibold text-lg">
                            {registration.player_name}
                          </div>
                          <div className="text-gray-400 text-sm">
                            Game ID: <span className="text-purple-400">{registration.game_id}</span>
                          </div>
                          {registration.payment_amount && registration.payment_amount > 0 && (
                            <div className="text-gray-400 text-sm">
                              Amount: <span className="text-green-400">₹{registration.payment_amount}</span>
                            </div>
                          )}
                          <div className="text-gray-500 text-xs">
                            {new Date(registration.created_at || '').toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(registration.payment_status)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(registration)}
                          className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                    
                    {/* Rejection Comment Display */}
                    {registration.payment_status === 'rejected' && registration.custom_fields_data?.rejection_comment && (
                      <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-1">
                          <MessageSquare className="w-4 h-4" />
                          Rejection Reason:
                        </div>
                        <p className="text-red-200 text-sm">{registration.custom_fields_data.rejection_comment}</p>
                        {registration.custom_fields_data.rejection_date && (
                          <p className="text-red-400/60 text-xs mt-1">
                            Rejected on: {new Date(registration.custom_fields_data.rejection_date).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Custom Fields Data */}
                    {registration.custom_fields_data && Object.keys(registration.custom_fields_data).filter(k => !k.startsWith('rejection_')).length > 0 && (
                      <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                        <span className="text-gray-500 text-sm font-medium">Additional Information:</span>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {Object.entries(registration.custom_fields_data)
                            .filter(([key]) => !key.startsWith('rejection_'))
                            .map(([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="text-gray-500">{key.replace(/_/g, ' ')}:</span>
                              <span className="text-white ml-2">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Payment Screenshot */}
                    {registration.payment_screenshot_url && (
                      <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                        <span className="text-gray-500 text-sm font-medium">Payment Screenshot:</span>
                        <div className="mt-2">
                          {getScreenshotUrl(registration) ? (
                            <button
                              onClick={() => setScreenshotModal(getScreenshotUrl(registration))}
                              className="relative group"
                            >
                              <img 
                                src={getScreenshotUrl(registration)!} 
                                alt="Payment Screenshot" 
                                className="w-32 h-24 object-cover rounded border border-gray-600 hover:border-purple-500 transition-colors"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                                <ExternalLink className="w-5 h-5 text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-400">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">Loading screenshot...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Actions for pending payments */}
                    {registration.payment_status === 'pending' && registration.payment_amount && registration.payment_amount > 0 && (
                      <div className="mt-4 flex space-x-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprovePayment(registration.id)}
                          disabled={processingId === registration.id}
                        >
                          {processingId === registration.id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 mr-1" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openRejectDialog(registration)}
                          disabled={processingId === registration.id}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      )}

      {/* Teams & Captains View */}
      {adminViewTab === 'teams' && (
        <div className="space-y-6">
          {/* Teams Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-500/30">
              <CardContent className="p-4 sm:p-6 text-center">
                <Users className="w-7 h-7 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">
                  {teams.length}
                </div>
                <div className="text-purple-300 text-xs sm:text-sm">Total Teams</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 border-yellow-500/30">
              <CardContent className="p-4 sm:p-6 text-center">
                <Crown className="w-7 h-7 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">
                  {teams.filter(t => t.captain_user_id).length}
                </div>
                <div className="text-yellow-300 text-xs sm:text-sm">Active Captains</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-500/30">
              <CardContent className="p-4 sm:p-6 text-center">
                <Check className="w-7 h-7 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">
                  {teams.filter(t => t.is_full).length}
                </div>
                <div className="text-green-300 text-xs sm:text-sm">Full Rosters</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-500/30">
              <CardContent className="p-4 sm:p-6 text-center">
                <Users className="w-7 h-7 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">
                  {teams.reduce((acc, t) => acc + (t.members?.length || 0), 0)}
                </div>
                <div className="text-blue-300 text-xs sm:text-sm">Total Players</div>
              </CardContent>
            </Card>
          </div>

          {/* Teams List Container */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-white text-lg sm:text-xl flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-400" />
                  Teams &amp; Captain Management
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search team, captain, code..."
                      value={teamSearchQuery}
                      onChange={(e) => setTeamSearchQuery(e.target.value)}
                      className="pl-9 bg-gray-900 border-gray-700 text-white text-sm h-9"
                    />
                  </div>
                  <Select value={teamStatusFilter} onValueChange={(v: any) => setTeamStatusFilter(v)}>
                    <SelectTrigger className="w-32 bg-gray-900 border-gray-700 text-white text-xs h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      <SelectItem value="full">Full Teams</SelectItem>
                      <SelectItem value="recruiting">Recruiting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
              {loadingTeams ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
                  <p className="text-gray-400 text-sm">Loading team rosters and captain records...</p>
                </div>
              ) : filteredTeams.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-700 rounded-lg">
                  <Users className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
                  <p className="text-gray-300 font-medium">No teams found</p>
                  <p className="text-gray-500 text-sm mt-1">
                    {teams.length === 0
                      ? "No teams have been created for this tournament yet."
                      : "No teams matched your search criteria."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTeams.map((team) => {
                    const captainMember = team.members.find(m => m.user_id === team.captain_user_id) ||
                                          team.members.find(m => m.role === 'captain');
                    const isFull = team.is_full || team.members.length >= team.max_members;

                    return (
                      <Card key={team.id} className="bg-gray-900 border-gray-700 overflow-hidden shadow-md">
                        {/* Team Header */}
                        <div className="p-4 bg-gray-800/80 border-b border-gray-700 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                              {team.team_name}
                            </h3>
                            {(() => {
                              const code = team.team_code || team.id.substring(0, 8).toUpperCase();
                              return (
                                <button
                                  onClick={() => copyToClipboard(code, "Team Code")}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-mono hover:bg-purple-900/60 transition-colors"
                                  title="Click to copy team code"
                                >
                                  <span>Code: {code}</span>
                                  <Copy className="w-3 h-3 text-purple-400" />
                                </button>
                              );
                            })()}
                            {team.password ? (
                              <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-300 text-xs flex items-center gap-1" title={`Password: ${team.password}`}>
                                <Key className="w-3 h-3 text-amber-400" />
                                Protected: <code className="font-mono text-white font-bold ml-0.5">{team.password}</code>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-1">
                                <Globe className="w-3 h-3 text-emerald-400" />
                                Open
                              </Badge>
                            )}
                            {isFull ? (
                              <Badge className="bg-emerald-600/90 text-white text-xs">
                                Full Roster ({team.members.length}/{team.max_members})
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-600/90 text-white text-xs">
                                Open Slots ({team.members.length}/{team.max_members})
                              </Badge>
                            )}
                          </div>

                          {/* Top Team Actions */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setChangeCaptainDialog(team);
                                setSelectedNewCaptainId('');
                              }}
                              className="border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 text-xs h-8"
                              title="Reassign Captain"
                            >
                              <Crown className="w-3.5 h-3.5 mr-1.5 text-yellow-400" />
                              Change Captain
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRemoveCaptainDialog(team);
                                setReplacementCaptainId('');
                              }}
                              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs h-8"
                              title="Remove current captain"
                            >
                              <UserMinus className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                              Remove Captain
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDisbandTeamDialog(team)}
                              className="text-xs h-8 bg-red-600/80 hover:bg-red-600"
                              title="Delete this team and remove registrations"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                              Disband Team
                            </Button>
                          </div>
                        </div>

                        {/* Captain Highlight Box */}
                        <div className="px-4 py-3 bg-yellow-950/20 border-b border-yellow-500/20 flex flex-wrap items-center justify-between gap-3 text-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center shrink-0">
                              <Crown className="w-4 h-4 text-yellow-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-yellow-200">
                                  {captainMember?.profile?.in_game_name || captainMember?.profile?.display_name || captainMember?.registration?.player_name || 'Assigned Captain'}
                                </span>
                                {captainMember?.profile?.username && (
                                  <span className="text-gray-400 text-xs">(@{captainMember.profile.username})</span>
                                )}
                                <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-[10px] py-0 px-1.5">
                                  Team Leader
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                                <span>Game ID: <strong className="text-gray-200 font-mono">{captainMember?.profile?.game_id || captainMember?.registration?.game_id || 'N/A'}</strong></span>
                                {captainMember?.profile?.phone_number && (
                                  <span>Phone: <strong className="text-gray-300">{captainMember.profile.phone_number}</strong></span>
                                )}
                                {captainMember?.profile?.email && (
                                  <span>Email: <strong className="text-gray-300">{captainMember.profile.email}</strong></span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {getStatusBadge(captainMember?.registration?.payment_status || null)}
                          </div>
                        </div>

                        {/* Roster Table */}
                        <div className="p-4">
                          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center justify-between">
                            <span>Roster Members ({team.members.length})</span>
                            <span className="text-gray-500 normal-case font-normal text-xs">
                              {team.max_members - team.members.length > 0 
                                ? `${team.max_members - team.members.length} open slot(s) remaining`
                                : "Roster is full"}
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-300">
                              <thead className="bg-gray-800 text-xs text-gray-400 uppercase">
                                <tr>
                                  <th className="px-3 py-2 rounded-l">Player</th>
                                  <th className="px-3 py-2">Role</th>
                                  <th className="px-3 py-2">Game ID</th>
                                  <th className="px-3 py-2">Contact</th>
                                  <th className="px-3 py-2">Fee Status</th>
                                  <th className="px-3 py-2 text-right rounded-r">Admin Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800">
                                {team.members.map((member) => {
                                  const isCaptain = member.user_id === team.captain_user_id || member.role === 'captain';
                                  const playerName = member.profile?.in_game_name || 
                                                     member.profile?.display_name || 
                                                     member.profile?.username || 
                                                     member.registration?.player_name || 
                                                     'Player';
                                  const gameId = member.profile?.game_id || member.registration?.game_id || 'N/A';

                                  return (
                                    <tr key={member.id} className="hover:bg-gray-800/40 transition-colors">
                                      <td className="px-3 py-2.5 font-medium text-white">
                                        <div className="flex items-center gap-2">
                                          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-200 shrink-0">
                                            {playerName.charAt(0).toUpperCase()}
                                          </div>
                                          <div>
                                            <div>{playerName}</div>
                                            {member.profile?.username && (
                                              <div className="text-xs text-gray-400">@{member.profile.username}</div>
                                            )}
                                          </div>
                                        </div>
                                      </td>

                                      <td className="px-3 py-2.5">
                                        {isCaptain ? (
                                          <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-xs flex items-center gap-1 w-fit">
                                            <Crown className="w-3 h-3" /> Captain
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-gray-400 border-gray-600 text-xs">
                                            Member
                                          </Badge>
                                        )}
                                      </td>

                                      <td className="px-3 py-2.5 font-mono text-xs text-gray-300">
                                        <div className="flex items-center gap-1.5">
                                          <span>{gameId}</span>
                                          {gameId !== 'N/A' && (
                                            <button
                                              onClick={() => copyToClipboard(gameId, "Game ID")}
                                              className="text-gray-500 hover:text-white"
                                              title="Copy Game ID"
                                            >
                                              <Copy className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      </td>

                                      <td className="px-3 py-2.5 text-xs text-gray-400">
                                        <div>{member.profile?.phone_number || 'No phone'}</div>
                                        <div className="text-gray-500">{member.profile?.email || 'No email'}</div>
                                      </td>

                                      <td className="px-3 py-2.5">
                                        {getStatusBadge(member.registration?.payment_status || null)}
                                      </td>

                                      <td className="px-3 py-2.5 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          {isCaptain ? (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                setRemoveCaptainDialog(team);
                                                setReplacementCaptainId('');
                                              }}
                                              className="h-7 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/20 px-2"
                                            >
                                              <UserMinus className="w-3 h-3 mr-1" />
                                              Remove Captain
                                            </Button>
                                          ) : (
                                            <>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                  setChangeCaptainDialog(team);
                                                  setSelectedNewCaptainId(member.user_id);
                                                }}
                                                className="h-7 text-xs border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/20 px-2"
                                                title="Make this player the team captain"
                                              >
                                                <Crown className="w-3 h-3 mr-1 text-yellow-400" />
                                                Make Captain
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setRemoveMemberData({ team, member })}
                                                className="h-7 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300 px-2"
                                                title="Remove this player from the team"
                                              >
                                                <UserX className="w-3 h-3 mr-1" />
                                                Remove
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reject Dialog with Comment */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-gray-900 border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <X className="w-5 h-5 mr-2 text-red-500" />
              Reject Registration
            </DialogTitle>
          </DialogHeader>
          
          {rejectingRegistration && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-white font-medium">{rejectingRegistration.player_name}</p>
                <p className="text-gray-400 text-sm">Game ID: {rejectingRegistration.game_id}</p>
                {rejectingRegistration.payment_amount && (
                  <p className="text-gray-400 text-sm">Amount: ₹{rejectingRegistration.payment_amount}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reject-comment" className="text-white">
                  Rejection Reason (Optional)
                </Label>
                <Textarea
                  id="reject-comment"
                  placeholder="Enter reason for rejection... (e.g., Payment not received, Screenshot unclear, etc.)"
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                />
                <p className="text-gray-500 text-xs">
                  This comment will be visible to the user so they know why their registration was rejected.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectPayment}
              disabled={processingId === rejectingRegistration?.id}
            >
              {processingId === rejectingRegistration?.id ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-1" />
              )}
              Reject Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Fields Dialog */}
      <Dialog open={showCustomFields} onOpenChange={setShowCustomFields}>
        <DialogContent className="bg-gray-900 border border-gray-700 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Custom Registration Fields
            </DialogTitle>
          </DialogHeader>
          {selectedTournamentData && (
            <TournamentCustomFieldsAdmin 
              tournamentId={selectedTournament}
              tournamentName={selectedTournamentData.name}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Screenshot Modal */}
      <Dialog open={!!screenshotModal} onOpenChange={() => setScreenshotModal(null)}>
        <DialogContent className="bg-gray-900 border border-gray-700 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <Image className="w-5 h-5 mr-2" />
              Payment Screenshot
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {screenshotModal && (
              <img 
                src={screenshotModal} 
                alt="Payment Screenshot" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Registration Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-gray-900 border border-gray-700 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <Edit className="w-5 h-5 mr-2 text-blue-500" />
              Edit Registration
            </DialogTitle>
          </DialogHeader>
          
          {editingRegistration && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Player Name</Label>
                <Input
                  value={editPlayerName}
                  onChange={(e) => setEditPlayerName(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Game ID</Label>
                <Input
                  value={editGameId}
                  onChange={(e) => setEditGameId(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              {/* Custom Fields */}
              {(customFieldDefs.length > 0 || Object.keys(editFormData).length > 0) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-px flex-1 bg-gray-700" />
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Custom Fields</span>
                    <div className="h-px flex-1 bg-gray-700" />
                  </div>
                  
                  {/* Render fields from definitions first */}
                  {customFieldDefs.map((def) => (
                    <div key={def.field_name} className="space-y-1">
                      <Label className="text-gray-300 text-sm">{def.field_label}</Label>
                      <Input
                        value={editFormData[def.field_name] || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, [def.field_name]: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                  ))}
                  
                  {/* Render any extra fields not in definitions */}
                  {Object.keys(editFormData)
                    .filter(key => !customFieldDefs.some(d => d.field_name === key))
                    .map((key) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-gray-300 text-sm">{key.replace(/_/g, ' ')}</Label>
                        <Input
                          value={editFormData[key] || ''}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, [key]: e.target.value }))}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savingEdit ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin: Change Captain Dialog */}
      <Dialog open={!!changeCaptainDialog} onOpenChange={(open) => { if (!open) setChangeCaptainDialog(null); }}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-400">
              <Crown className="w-5 h-5" />
              Reassign Team Captain
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              Assign a new captain for team &quot;{changeCaptainDialog?.team_name}&quot;.
            </DialogDescription>
          </DialogHeader>

          {changeCaptainDialog && (
            <div className="space-y-4 py-2">
              <div className="bg-gray-800/80 p-3 rounded-lg border border-gray-700">
                <div className="text-xs text-gray-400">Current Captain:</div>
                <div className="text-sm font-semibold text-white mt-0.5">
                  {changeCaptainDialog.members.find(m => m.user_id === changeCaptainDialog.captain_user_id)?.profile?.in_game_name ||
                   changeCaptainDialog.members.find(m => m.user_id === changeCaptainDialog.captain_user_id)?.profile?.display_name ||
                   'Current Captain'}
                </div>
              </div>

              {changeCaptainDialog.members.filter(m => m.user_id !== changeCaptainDialog.captain_user_id).length === 0 ? (
                <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-3 text-amber-300 text-sm flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    This team currently has no other members. A player must join the team before captaincy can be transferred.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Select New Captain from Roster</Label>
                  <Select value={selectedNewCaptainId} onValueChange={setSelectedNewCaptainId}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Choose a member to promote" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      {changeCaptainDialog.members
                        .filter(m => m.user_id !== changeCaptainDialog.captain_user_id)
                        .map(m => {
                          const name = m.profile?.in_game_name || m.profile?.display_name || m.profile?.username || m.registration?.player_name || 'Member';
                          const gid = m.profile?.game_id || m.registration?.game_id || 'N/A';
                          return (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              {name} (Game ID: {gid})
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setChangeCaptainDialog(null)}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdminChangeCaptain}
              disabled={!selectedNewCaptainId || processingCaptainChange}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {processingCaptainChange ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Crown className="w-4 h-4 mr-1.5" />
              )}
              Assign as Captain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin: Remove Captain Dialog */}
      <Dialog open={!!removeCaptainDialog} onOpenChange={(open) => { if (!open) setRemoveCaptainDialog(null); }}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <UserMinus className="w-5 h-5" />
              Remove Team Captain
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              Remove the current captain of team &quot;{removeCaptainDialog?.team_name}&quot;.
            </DialogDescription>
          </DialogHeader>

          {removeCaptainDialog && (() => {
            const otherMembers = removeCaptainDialog.members.filter(m => m.user_id !== removeCaptainDialog.captain_user_id);
            const currentCap = removeCaptainDialog.members.find(m => m.user_id === removeCaptainDialog.captain_user_id);
            const capName = currentCap?.profile?.in_game_name || currentCap?.profile?.display_name || currentCap?.registration?.player_name || 'Current Captain';

            return (
              <div className="space-y-4 py-2">
                <div className="bg-red-950/30 border border-red-500/30 p-3 rounded-lg text-sm">
                  <div className="text-red-300 font-medium">Captain to be removed:</div>
                  <div className="text-white font-semibold mt-0.5">{capName}</div>
                  <p className="text-gray-400 text-xs mt-1">
                    Their team membership and tournament registration will be removed.
                  </p>
                </div>

                {otherMembers.length > 0 ? (
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">
                      Assign Replacement Captain ({otherMembers.length} member{otherMembers.length > 1 ? 's' : ''} available)
                    </Label>
                    <Select value={replacementCaptainId} onValueChange={setReplacementCaptainId}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder={`Default: ${otherMembers[0]?.profile?.in_game_name || otherMembers[0]?.profile?.display_name || 'First member in roster'}`} />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        {otherMembers.map(m => {
                          const name = m.profile?.in_game_name || m.profile?.display_name || m.profile?.username || m.registration?.player_name || 'Member';
                          return (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              {name} (Game ID: {m.profile?.game_id || m.registration?.game_id || 'N/A'})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-gray-400 text-xs">
                      If left unselected, the first member in the roster will automatically be promoted to captain.
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-lg text-amber-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      This captain is the only member in this team. Removing the captain will automatically <strong>disband and delete</strong> this team.
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRemoveCaptainDialog(null)}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleAdminRemoveCaptain}
              disabled={processingCaptainRemoval}
              className="bg-red-600 hover:bg-red-700"
            >
              {processingCaptainRemoval ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <UserMinus className="w-4 h-4 mr-1.5" />
              )}
              Confirm Remove Captain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin: Remove Member Dialog */}
      <Dialog open={!!removeMemberData} onOpenChange={(open) => { if (!open) setRemoveMemberData(null); }}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <UserX className="w-5 h-5" />
              Remove Player from Team
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              Remove this player from team &quot;{removeMemberData?.team.team_name}&quot;.
            </DialogDescription>
          </DialogHeader>

          {removeMemberData && (
            <div className="space-y-3 py-2">
              <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 space-y-1">
                <div className="text-white font-medium">
                  {removeMemberData.member.profile?.in_game_name ||
                   removeMemberData.member.profile?.display_name ||
                   removeMemberData.member.registration?.player_name ||
                   'Member'}
                </div>
                <div className="text-xs text-gray-400 font-mono">
                  Game ID: {removeMemberData.member.profile?.game_id || removeMemberData.member.registration?.game_id || 'N/A'}
                </div>
                {removeMemberData.member.profile?.email && (
                  <div className="text-xs text-gray-400">
                    Email: {removeMemberData.member.profile.email}
                  </div>
                )}
              </div>

              <div className="bg-red-950/30 border border-red-500/30 p-3 rounded-lg text-xs text-red-300">
                This will remove the player from the team roster and cancel their tournament registration. A slot will open up for another player.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRemoveMemberData(null)}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleAdminRemoveMember}
              disabled={processingMemberRemoval}
            >
              {processingMemberRemoval ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <UserX className="w-4 h-4 mr-1.5" />
              )}
              Remove Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin: Disband Team Dialog */}
      <Dialog open={!!disbandTeamDialog} onOpenChange={(open) => { if (!open) setDisbandTeamDialog(null); }}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="w-5 h-5" />
              Disband Team
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              Permanently disband and delete team &quot;{disbandTeamDialog?.team_name}&quot;.
            </DialogDescription>
          </DialogHeader>

          {disbandTeamDialog && (
            <div className="space-y-3 py-2">
              <div className="bg-red-950/40 border border-red-500/40 p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-red-300 font-semibold text-sm">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <span>Warning: Destructive Action</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  This will completely remove team <strong>{disbandTeamDialog.team_name}</strong> (Code: {disbandTeamDialog.team_code || disbandTeamDialog.id.substring(0, 8).toUpperCase()}) and remove its {disbandTeamDialog.members.length} member(s) from this team.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDisbandTeamDialog(null)}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleAdminDisbandTeam}
              disabled={processingDisband}
              className="bg-red-600 hover:bg-red-700"
            >
              {processingDisband ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1.5" />
              )}
              Disband &amp; Delete Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentRegistrationsAdmin;
