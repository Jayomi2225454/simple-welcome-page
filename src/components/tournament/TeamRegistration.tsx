import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tournament, isNewTournamentWithCap, isTournamentRegistrationClosed } from '@/types';
import { Users, Crown, UserPlus, Copy, CheckCircle, Clock, Lock, Hash, XCircle, AlertTriangle, RefreshCw, Trash2, Wallet, Edit3, UserMinus, Info, Phone, Mail, Shield, Eye, EyeOff, Key, Globe, ShieldCheck, CreditCard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { tournamentRegistrationService, TournamentRoom } from '@/services/tournamentRegistrationService';
import RegistrationFormDialog from './RegistrationFormDialog';
import PaymentRetryDialog from './PaymentRetryDialog';
import EditRegistrationDialog from './EditRegistrationDialog';
import { Link } from 'react-router-dom';

interface TeamRegistrationProps {
  tournament: Tournament;
}

interface Team {
  id: string;
  team_name: string;
  captain_user_id: string;
  tournament_id: string;
  max_members: number;
  current_members: number;
  is_full: boolean;
  status: string;
  created_at: string;
  team_code?: string | null;
  password?: string | null;
  payment_mode?: 'leader_pays' | 'each_pays' | null;
  members?: TeamMember[];
}

interface TeamMember {
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
    created_at?: string | null;
  };
  registration?: {
    id?: string;
    player_name?: string | null;
    game_id?: string | null;
    payment_status?: string | null;
    payment_amount?: number | null;
    custom_fields_data?: Record<string, any> | null;
    created_at?: string | null;
  };
}

const TeamRegistration: React.FC<TeamRegistrationProps> = ({ tournament }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [teamName, setTeamName] = useState('');
  const [joinTeamCode, setJoinTeamCode] = useState('');
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);
  const [roomDetails, setRoomDetails] = useState<TournamentRoom | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRegistration, setUserRegistration] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [totalTeamsCount, setTotalTeamsCount] = useState<number>(tournament.current_participants || 0);

  // Participant cap check (enforced strictly on new tournaments)
  const effectiveCount = Math.max(totalTeamsCount, tournament.current_participants || 0);
  const isRegistrationFull = isTournamentRegistrationClosed(tournament, effectiveCount);
  
  // Dialog states for registration flow
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [showPaymentRetryDialog, setShowPaymentRetryDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [pendingTeamAction, setPendingTeamAction] = useState<{ type: 'create' | 'join' | 'join_by_code'; teamId?: string } | null>(null);
  
  // Team Password & Privacy states
  const [teamPassword, setTeamPassword] = useState<string>('');
  const [showPasswordInput, setShowPasswordInput] = useState<boolean>(false);
  const [teamPasswordPromptDialog, setTeamPasswordPromptDialog] = useState<{ team: Team; pendingAction: () => Promise<void> } | null>(null);
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [showEnteredPassword, setShowEnteredPassword] = useState<boolean>(false);
  const [verifyingPassword, setVerifyingPassword] = useState<boolean>(false);

  // Member details and captain management dialog states
  const [selectedMemberForDetails, setSelectedMemberForDetails] = useState<TeamMember | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [memberToMakeCaptain, setMemberToMakeCaptain] = useState<TeamMember | null>(null);
  
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const teamSize = typeof tournament.team_size === 'number' 
    ? tournament.team_size 
    : parseInt(tournament.team_size || '1') || 1;

  const isFree = !tournament.entry_fee || tournament.entry_fee === 'Free' || tournament.entry_fee === '0' || tournament.entry_fee === '₹0';
  const entryFeeAmount = isFree ? 0 : parseInt(tournament.entry_fee?.replace(/[^0-9]/g, '') || '0');
  
  // Choice made by team leader at registration checkout: 'leader_pays' (full team fee) vs 'each_pays' (divided per slot)
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<'leader_pays' | 'each_pays'>('leader_pays');

  // Total entry fee for the entire squad
  const totalTeamFee = entryFeeAmount;
  // Per slot fee (divided per slot)
  const perSlotFee = teamSize > 1 ? Math.ceil(entryFeeAmount / teamSize) : entryFeeAmount;

  // Helper to check if a specific team was paid upfront by its leader
  const isTeamLeaderPaid = (team?: Team | null): boolean => {
    if (isFree) return true;
    if (!team) return false;
    if (team.payment_mode === 'leader_pays') return true;
    if (team.payment_mode === 'each_pays') return false;
    // Fallback: Check captain's registration
    const captainMember = team.members?.find(m => m.role === 'captain' || m.user_id === team.captain_user_id);
    const captainReg = captainMember?.registration;
    if (captainReg) {
      if ((captainReg.custom_fields_data as any)?.team_payment_mode === 'leader_pays') return true;
      if (captainReg.payment_amount && captainReg.payment_amount >= totalTeamFee && totalTeamFee > perSlotFee) return true;
    }
    // Fallback for older tournaments created before this update
    if ((tournament as any).team_payment_mode === 'leader_pays') return true;
    return false;
  };

  const getTeamModeLabel = () => {
    if (teamSize === 1) return 'Solo';
    if (teamSize === 2) return 'Duo';
    if (teamSize === 4) return 'Squad';
    if (teamSize === 5) return '5-Man Squad';
    return `Team (${teamSize} players)`;
  };

  // Generate collision-free unique team code
  const generateUniqueTeamCode = async (tournamentId: string): Promise<string> => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    for (let attempt = 0; attempt < 10; attempt++) {
      let code = 'TM-';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      try {
        const { data: existing } = await supabase
          .from('tournament_teams')
          .select('id, team_code')
          .eq('tournament_id', tournamentId);
        
        const hasCollision = existing?.some(t => 
          (t.team_code && t.team_code.toUpperCase() === code) ||
          t.id.substring(0, 8).toUpperCase() === code
        );
        if (!hasCollision) {
          return code;
        }
      } catch (err) {
        return code;
      }
    }
    return `TM-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  };

  const loadTotalTeamsCount = async () => {
    try {
      const { count } = await supabase
        .from('tournament_teams')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id);
      if (count !== null && count !== undefined) {
        setTotalTeamsCount(count);
      }
    } catch (error) {
      console.error('Error loading teams count:', error);
    }
  };

  useEffect(() => {
    loadAvailableTeams();
    loadTotalTeamsCount();
    if (user) {
      loadUserData();
      loadWalletBalance();
    }
  }, [user, tournament.id]);

  // Real-time subscription for room updates
  useEffect(() => {
    if (!user) return;
    
    const loadRoomDetails = async () => {
      try {
        const room = await tournamentRegistrationService.getTournamentRoom(tournament.id);
        setRoomDetails(room);
      } catch (error) {
        console.error('Error loading room details:', error);
      }
    };

    const channel = supabase
      .channel(`room-updates-team-${tournament.id}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_rooms',
          filter: `tournament_id=eq.${tournament.id}`
        },
        () => loadRoomDetails()
      )
      .subscribe();

    const regChannel = supabase
      .channel(`reg-updates-team-${tournament.id}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournament_registrations',
          filter: `user_id=eq.${user.id}`
        },
        () => loadUserData()
      )
      .subscribe();

    const teamsChannel = supabase
      .channel(`team-changes-${tournament.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_teams',
          filter: `tournament_id=eq.${tournament.id}`
        },
        () => {
          loadAvailableTeams();
          loadUserData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_team_members'
        },
        () => {
          loadAvailableTeams();
          loadUserData();
        }
      )
      .subscribe();

    loadRoomDetails();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(regChannel);
      supabase.removeChannel(teamsChannel);
    };
  }, [user, tournament.id]);

  const loadWalletBalance = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('wallet_balances')
        .select('available_balance')
        .eq('user_id', user.id)
        .eq('mode', 'esports')
        .maybeSingle();
      setWalletBalance(data?.available_balance || 0);
    } catch (error) {
      console.error('Error loading wallet balance:', error);
    }
  };

  const loadUserData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setUserProfile(profile);

      const registration = await tournamentRegistrationService.checkUserRegistration(user.id, tournament.id);
      setUserRegistration(registration);

      const { data: memberData } = await supabase
        .from('tournament_team_members')
        .select(`
          *,
          tournament_teams!inner(*)
        `)
        .eq('user_id', user.id)
        .eq('tournament_teams.tournament_id', tournament.id)
        .maybeSingle();

      if (memberData && (memberData as any).tournament_teams) {
        const team = (memberData as any).tournament_teams as Team;
        setUserTeam(team);
        loadTeamMembers(team.id);
        
        if (team.is_full && registration?.payment_status === 'completed') {
          const room = await tournamentRegistrationService.getTournamentRoom(tournament.id);
          setRoomDetails(room);
        }
      } else {
        // Self-heal & mapping check: Check if user is recorded as captain in tournament_teams
        const { data: captainTeam } = await supabase
          .from('tournament_teams')
          .select('*')
          .eq('tournament_id', tournament.id)
          .eq('captain_user_id', user.id)
          .maybeSingle();

        if (captainTeam) {
          // Auto-repair missing membership in tournament_team_members
          await supabase
            .from('tournament_team_members')
            .upsert({
              team_id: captainTeam.id,
              user_id: user.id,
              role: 'captain'
            }, { onConflict: 'team_id,user_id' });

          const team = captainTeam as Team;
          setUserTeam(team);
          loadTeamMembers(team.id);

          if (team.is_full && registration?.payment_status === 'completed') {
            const room = await tournamentRegistrationService.getTournamentRoom(tournament.id);
            setRoomDetails(room);
          }
        } else {
          setUserTeam(null);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const { data: members, error: membersError } = await supabase
        .from('tournament_team_members')
        .select('*')
        .eq('team_id', teamId)
        .order('joined_at', { ascending: true });

      if (membersError) throw membersError;

      if (members) {
        const userIds = members.map(m => m.user_id);
        const [profilesRes, regRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('user_id, username, display_name, in_game_name, game_id, avatar_url, phone_number, email, created_at')
            .in('user_id', userIds),
          supabase
            .from('tournament_registrations')
            .select('*')
            .eq('tournament_id', tournament.id)
            .in('user_id', userIds)
        ]);

        const profilesMap: Record<string, any> = {};
        if (profilesRes.data) {
          profilesRes.data.forEach(p => { profilesMap[p.user_id] = p; });
        }

        const regMap: Record<string, any> = {};
        if (regRes.data) {
          regRes.data.forEach(r => { regMap[r.user_id] = r; });
        }

        const membersWithDetails = members.map(member => ({
          ...member,
          profile: profilesMap[member.user_id] || null,
          registration: regMap[member.user_id] || null
        }));

        // Sort so captain is always first
        membersWithDetails.sort((a, b) => {
          if (a.role === 'captain' || (userTeam && a.user_id === userTeam.captain_user_id)) return -1;
          if (b.role === 'captain' || (userTeam && b.user_id === userTeam.captain_user_id)) return 1;
          return 0;
        });

        setTeamMembers(membersWithDetails as TeamMember[]);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const loadAvailableTeams = async () => {
    try {
      const { data: teams, error: teamsError } = await supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', tournament.id)
        .eq('is_full', false)
        .order('created_at', { ascending: false });

      if (teamsError) throw teamsError;

      if (!teams || teams.length === 0) {
        setAvailableTeams([]);
        return;
      }

      const teamIds = teams.map(t => t.id);

      // Load all members for these teams
      const { data: members, error: membersError } = await supabase
        .from('tournament_team_members')
        .select('*')
        .in('team_id', teamIds)
        .order('joined_at', { ascending: true });

      if (membersError) {
        console.error('Error loading team members for available teams:', membersError);
      }

      const memberList = members || [];
      const userIds = Array.from(new Set([
        ...memberList.map(m => m.user_id),
        ...teams.map(t => t.captain_user_id).filter(Boolean)
      ]));

      let profilesMap: Record<string, any> = {};
      let registrationsMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const [profilesRes, registrationsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('user_id, username, display_name, in_game_name, game_id, avatar_url')
            .in('user_id', userIds),
          supabase
            .from('tournament_registrations')
            .select('user_id, player_name, game_id, payment_amount, custom_fields_data')
            .eq('tournament_id', tournament.id)
            .in('user_id', userIds)
        ]);

        if (profilesRes.data) {
          profilesRes.data.forEach(p => {
            profilesMap[p.user_id] = p;
          });
        }
        if (registrationsRes.data) {
          registrationsRes.data.forEach(r => {
            registrationsMap[r.user_id] = r;
          });
        }
      }

      const teamsWithRosters = teams.map(team => {
        let teamMembersList = memberList
          .filter(m => m.team_id === team.id)
          .map(member => {
            const profile = profilesMap[member.user_id];
            const reg = registrationsMap[member.user_id];
            return {
              ...member,
              registration: reg || null,
              profile: {
                username: profile?.username || null,
                display_name: profile?.display_name || reg?.player_name || null,
                in_game_name: profile?.in_game_name || reg?.player_name || null,
                game_id: profile?.game_id || reg?.game_id || null,
                avatar_url: profile?.avatar_url || null,
              }
            };
          });

        // Ensure captain is in the member list if not present
        if (team.captain_user_id && !teamMembersList.some(m => m.user_id === team.captain_user_id)) {
          const capProfile = profilesMap[team.captain_user_id];
          const capReg = registrationsMap[team.captain_user_id];
          teamMembersList.unshift({
            id: `cap-${team.id}`,
            team_id: team.id,
            user_id: team.captain_user_id,
            role: 'captain',
            joined_at: team.created_at || new Date().toISOString(),
            registration: capReg || null,
            profile: {
              username: capProfile?.username || null,
              display_name: capProfile?.display_name || capReg?.player_name || 'Team Captain',
              in_game_name: capProfile?.in_game_name || capReg?.player_name || null,
              game_id: capProfile?.game_id || capReg?.game_id || null,
              avatar_url: capProfile?.avatar_url || null,
            }
          });
        }

        // Sort so captain is always first in roster
        teamMembersList.sort((a, b) => {
          if (a.role === 'captain' || a.user_id === team.captain_user_id) return -1;
          if (b.role === 'captain' || b.user_id === team.captain_user_id) return 1;
          return 0;
        });

        return {
          ...team,
          members: teamMembersList,
          current_members: teamMembersList.length || team.current_members || 1
        };
      });

      // Filter out teams that are actually already full
      const openTeams = teamsWithRosters.filter(team => {
        const max = team.max_members || teamSize;
        const count = team.members ? team.members.length : team.current_members;
        return count < max;
      });

      setAvailableTeams(openTeams as Team[]);
    } catch (error) {
      console.error('Error loading available teams:', error);
    }
  };

  // Open registration dialog for creating team
  const handleCreateTeam = async () => {
    if (isRegistrationFull) {
      toast({
        title: "Registration Full / Closed",
        description: `This tournament has reached its maximum limit of ${tournament.max_participants} teams.`,
        variant: "destructive"
      });
      return;
    }

    if (!user || !userProfile) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile first.",
        variant: "destructive"
      });
      return;
    }

    if (!teamName.trim()) {
      toast({
        title: "Team Name Required",
        description: "Please enter a team name.",
        variant: "destructive"
      });
      return;
    }

    const amountToDeduct = selectedPaymentMode === 'leader_pays' ? totalTeamFee : perSlotFee;

    // For paid tournaments: if wallet balance is sufficient, auto-deduct and create immediately
    if (!isFree) {
      if (walletBalance >= amountToDeduct) {
        // Direct wallet flow - no manual payment dialog needed
        await createTeamWithWallet();
        return;
      }
      // Insufficient balance - fall through to show registration dialog with manual payment
    }

    setPendingTeamAction({ type: 'create' });
    setShowRegistrationDialog(true);
  };

  // Create team with wallet payment (leader_pays mode)
  // Helper to match team by team_code, 8-char short code, or UUID
  const findMatchingTeamByCode = (teamList: Team[], code: string): Team | undefined => {
    const clean = code.trim().toUpperCase();
    if (!clean) return undefined;
    return teamList.find(team => {
      const dbCode = team.team_code ? team.team_code.toUpperCase() : null;
      const shortId = team.id.substring(0, 8).toUpperCase();
      const fullId = team.id.toUpperCase();
      return (
        dbCode === clean ||
        shortId === clean ||
        fullId === clean ||
        (dbCode && dbCode.replace('TM-', '') === clean.replace('TM-', ''))
      );
    });
  };

  // Password authorization check before joining protected team
  const requireTeamPasswordIfProtected = (team: Team, onAuthorized: () => Promise<void>) => {
    if (team.password && team.password.trim() !== '') {
      setEnteredPassword('');
      setShowEnteredPassword(false);
      setVerifyingPassword(false);
      setTeamPasswordPromptDialog({ team, pendingAction: onAuthorized });
    } else {
      onAuthorized();
    }
  };

  const handleVerifyTeamPassword = async () => {
    if (!teamPasswordPromptDialog) return;
    const { team, pendingAction } = teamPasswordPromptDialog;

    if (enteredPassword.trim() !== (team.password || '').trim()) {
      toast({
        title: "Incorrect Password",
        description: `The password for team "${team.team_name}" is incorrect. Please try again.`,
        variant: "destructive"
      });
      return;
    }

    setVerifyingPassword(true);
    try {
      const action = pendingAction;
      setTeamPasswordPromptDialog(null);
      setEnteredPassword('');
      await action();
    } finally {
      setVerifyingPassword(false);
    }
  };

  // Helper to safely check if user is already in a team for this tournament
  const checkUserAlreadyInTeam = async (): Promise<boolean> => {
    if (!user) return false;
    const { data: existingMember } = await supabase
      .from('tournament_team_members')
      .select('id, team_id, tournament_teams!inner(tournament_id, team_name)')
      .eq('user_id', user.id)
      .eq('tournament_teams.tournament_id', tournament.id)
      .maybeSingle();

    if (existingMember) {
      toast({
        title: "Already in a Team",
        description: `You are already a member of team "${(existingMember as any).tournament_teams?.team_name}". Please leave that team first.`,
        variant: "destructive"
      });
      return true;
    }
    return false;
  };

  // Create team with wallet payment
  const createTeamWithWallet = async () => {
    if (!user || !userProfile) return;
    setIsLoading(true);

    const amountToDeduct = selectedPaymentMode === 'leader_pays' ? totalTeamFee : perSlotFee;

    try {
      // Deduct wallet balance
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          amount: amountToDeduct,
          transaction_type: 'tournament_entry',
          status: 'approved',
          mode: 'esports',
          tournament_id: tournament.id,
          tournament_name: tournament.name,
          payment_method: 'wallet',
        });
      if (txError) throw new Error('Failed to deduct wallet balance: ' + txError.message);

      // Create registration (safe upsert inside service)
      const registrationData = {
        tournament_id: tournament.id,
        player_name: userProfile.display_name || userProfile.username || user.email || 'Unknown Player',
        game_id: userProfile.game_id || 'N/A',
        payment_amount: amountToDeduct,
        custom_fields_data: {
          team_payment_mode: selectedPaymentMode
        }
      };
      const registration = await tournamentRegistrationService.registerForTournamentWithWallet(registrationData);
      setUserRegistration(registration);

      // Generate unique collision-free team code
      const uniqueCode = await generateUniqueTeamCode(tournament.id);

      // Create team
      const teamPayload: any = {
        team_name: teamName.trim(),
        captain_user_id: user.id,
        tournament_id: tournament.id,
        max_members: teamSize,
        current_members: 1,
        is_full: teamSize === 1,
        status: 'active',
        team_code: uniqueCode,
        payment_mode: selectedPaymentMode
      };
      if (teamPassword.trim()) {
        teamPayload.password = teamPassword.trim();
      }

      let createdTeam: any = null;
      const { data: teamRes, error: teamErr } = await supabase
        .from('tournament_teams')
        .insert(teamPayload)
        .select()
        .single();

      if (teamErr) {
        // Fallback in case payment_mode/password/team_code columns not yet in DB schema
        const fallbackPayload: any = {
          team_name: teamName.trim(),
          captain_user_id: user.id,
          tournament_id: tournament.id,
          max_members: teamSize,
          current_members: 1,
          is_full: teamSize === 1
        };
        if (teamPassword.trim()) {
          fallbackPayload.password = teamPassword.trim();
        }
        const { data: fallbackTeam, error: fallbackErr } = await supabase
          .from('tournament_teams')
          .insert(fallbackPayload)
          .select()
          .single();
        if (fallbackErr) throw fallbackErr;
        createdTeam = fallbackTeam;
      } else {
        createdTeam = teamRes;
      }

      createdTeam.payment_mode = selectedPaymentMode;

      // CRITICAL: Insert captain into tournament_team_members!
      await supabase
        .from('tournament_team_members')
        .upsert({
          team_id: createdTeam.id,
          user_id: user.id,
          role: 'captain'
        }, { onConflict: 'team_id,user_id' });

      setUserTeam(createdTeam as Team);
      setTeamName('');
      setTeamPassword('');
      loadTeamMembers(createdTeam.id);
      loadWalletBalance();

      const shareCode = createdTeam.team_code || createdTeam.id.substring(0, 8).toUpperCase();
      toast({
        title: "Team Created!",
        description: selectedPaymentMode === 'leader_pays'
          ? `₹${totalTeamFee} deducted for entire squad. Team code is ${shareCode}. Teammates join free!`
          : `₹${perSlotFee} deducted for your slot. Team code is ${shareCode}. Teammates will pay ₹${perSlotFee} when joining.`,
      });

      loadUserData();
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Join team by code (for leader_pays, members join free)
  const handleJoinByCode = async () => {
    if (!user || !userProfile) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile first.",
        variant: "destructive"
      });
      return;
    }

    if (!joinTeamCode.trim()) {
      toast({
        title: "Team Code Required",
        description: "Please enter a team code.",
        variant: "destructive"
      });
      return;
    }

    if (await checkUserAlreadyInTeam()) return;

    setIsLoading(true);
    try {
      const { data: teams, error: teamsError } = await supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', tournament.id)
        .eq('is_full', false);

      if (teamsError) throw teamsError;

      const matchingTeam = findMatchingTeamByCode((teams || []) as Team[], joinTeamCode);

      if (!matchingTeam) {
        toast({
          title: "Team Not Found",
          description: "Invalid team code or team is already full.",
          variant: "destructive"
        });
        return;
      }

      // Check if password required
      requireTeamPasswordIfProtected(matchingTeam, async () => {
        if (isFree || isTeamLeaderPaid(matchingTeam)) {
          await joinTeamByCodeFree(matchingTeam);
        } else {
          setPendingTeamAction({ type: 'join_by_code', teamId: matchingTeam.id });
          setShowRegistrationDialog(true);
        }
      });
    } catch (error: any) {
      toast({
        title: "Search Failed",
        description: error.message || "Failed to find team.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Join team free (leader already paid)
  const joinTeamByCodeFree = async (targetTeam: Team) => {
    if (!user || !userProfile) return;
    setIsLoading(true);

    try {
      // Create registration (safe upsert in service)
      const registrationData = {
        tournament_id: tournament.id,
        player_name: userProfile.display_name || userProfile.username || user.email || 'Unknown Player',
        game_id: userProfile.game_id || 'N/A',
        payment_amount: 0,
        custom_fields_data: {}
      };
      const registration = await tournamentRegistrationService.registerForTournamentWithWallet(registrationData);
      setUserRegistration(registration);

      // Join team
      const { error } = await supabase
        .from('tournament_team_members')
        .insert({
          team_id: targetTeam.id,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;

      // Update current_members and is_full
      const newCount = (targetTeam.current_members || 1) + 1;
      const isFull = newCount >= (targetTeam.max_members || teamSize);
      await supabase
        .from('tournament_teams')
        .update({
          current_members: newCount,
          is_full: isFull
        })
        .eq('id', targetTeam.id);

      toast({
        title: "Joined Team!",
        description: `You've joined team "${targetTeam.team_name}" for free! Leader has already paid.`,
      });

      setJoinTeamCode('');
      loadUserData();
      loadAvailableTeams();
    } catch (error: any) {
      toast({
        title: "Join Failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Open registration dialog for joining team from list
  const handleJoinTeam = async (teamId: string) => {
    if (!user || !userProfile) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile first.",
        variant: "destructive"
      });
      return;
    }

    if (await checkUserAlreadyInTeam()) return;

    const targetTeam = availableTeams.find(t => t.id === teamId);
    if (!targetTeam) return;

    requireTeamPasswordIfProtected(targetTeam, async () => {
      if (isFree || isTeamLeaderPaid(targetTeam)) {
        // Members join free in leader_pays mode or free tournament
        await joinTeamDirectFree(targetTeam);
      } else {
        setPendingTeamAction({ type: 'join', teamId: targetTeam.id });
        setShowRegistrationDialog(true);
      }
    });
  };

  const joinTeamDirectFree = async (targetTeam: Team) => {
    if (!user || !userProfile) return;
    setIsLoading(true);

    try {
      const registrationData = {
        tournament_id: tournament.id,
        player_name: userProfile.display_name || userProfile.username || user.email || 'Unknown Player',
        game_id: userProfile.game_id || 'N/A',
        payment_amount: 0,
        custom_fields_data: {}
      };
      await tournamentRegistrationService.registerForTournamentWithWallet(registrationData);

      const { error } = await supabase
        .from('tournament_team_members')
        .insert({
          team_id: targetTeam.id,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;

      // Update current_members and is_full
      const newCount = (targetTeam.current_members || 1) + 1;
      const isFull = newCount >= (targetTeam.max_members || teamSize);
      await supabase
        .from('tournament_teams')
        .update({
          current_members: newCount,
          is_full: isFull
        })
        .eq('id', targetTeam.id);

      toast({
        title: "Joined Team!",
        description: "You've joined the team for free! Leader has already paid.",
      });

      loadUserData();
      loadAvailableTeams();
    } catch (error: any) {
      toast({
        title: "Join Failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle registration submission with custom fields (each_pays mode)
  const handleRegistrationSubmit = async (data: { gameId: string; customFields: Record<string, string>; screenshotUrl?: string; paidViaWallet?: boolean }) => {
    if (!pendingTeamAction || !user) return;

    setIsLoading(true);
    setShowRegistrationDialog(false);

    try {
      const feeToPay = pendingTeamAction.type === 'create'
        ? (selectedPaymentMode === 'leader_pays' ? totalTeamFee : perSlotFee)
        : perSlotFee;

      // If paying via wallet, deduct balance first
      if (!isFree && data.paidViaWallet) {
        const { error: txError } = await supabase
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            amount: feeToPay,
            transaction_type: 'tournament_entry',
            status: 'approved',
            mode: 'esports',
            tournament_id: tournament.id,
            tournament_name: tournament.name,
            payment_method: 'wallet',
          });
        if (txError) throw new Error('Failed to deduct wallet balance: ' + txError.message);
      }

      const registrationData = {
        tournament_id: tournament.id,
        player_name: userProfile?.display_name || userProfile?.username || user?.email || 'Unknown Player',
        game_id: data.gameId,
        payment_amount: isFree ? 0 : feeToPay,
        payment_screenshot_url: data.screenshotUrl,
        custom_fields_data: {
          ...data.customFields,
          team_payment_mode: pendingTeamAction.type === 'create' ? selectedPaymentMode : 'member_share'
        }
      };

      const registration = data.paidViaWallet
        ? await tournamentRegistrationService.registerForTournamentWithWallet(registrationData)
        : await tournamentRegistrationService.registerForTournament(registrationData);
      setUserRegistration(registration);

      // Proceed with team action
      if (pendingTeamAction.type === 'create') {
        const uniqueCode = await generateUniqueTeamCode(tournament.id);

        const teamPayload: any = {
          team_name: teamName.trim(),
          captain_user_id: user.id,
          tournament_id: tournament.id,
          max_members: teamSize,
          current_members: 1,
          is_full: teamSize === 1,
          status: 'active',
          team_code: uniqueCode,
          payment_mode: selectedPaymentMode
        };
        if (teamPassword.trim()) {
          teamPayload.password = teamPassword.trim();
        }

        let createdTeam: any = null;
        const { data: teamRes, error: teamErr } = await supabase
          .from('tournament_teams')
          .insert(teamPayload)
          .select()
          .single();

        if (teamErr) {
          // Fallback if password, payment_mode, or team_code not in schema
          const fallbackPayload: any = {
            team_name: teamName.trim(),
            captain_user_id: user.id,
            tournament_id: tournament.id,
            max_members: teamSize,
            current_members: 1,
            is_full: teamSize === 1
          };
          if (teamPassword.trim()) {
            fallbackPayload.password = teamPassword.trim();
          }
          const { data: fallbackTeam, error: fallbackErr } = await supabase
            .from('tournament_teams')
            .insert(fallbackPayload)
            .select()
            .single();
          if (fallbackErr) throw fallbackErr;
          createdTeam = fallbackTeam;
        } else {
          createdTeam = teamRes;
        }

        createdTeam.payment_mode = selectedPaymentMode;

        // CRITICAL: Insert captain into tournament_team_members!
        await supabase
          .from('tournament_team_members')
          .upsert({
            team_id: createdTeam.id,
            user_id: user.id,
            role: 'captain'
          }, { onConflict: 'team_id,user_id' });

        setUserTeam(createdTeam as Team);
        setTeamName('');
        setTeamPassword('');
        loadTeamMembers(createdTeam.id);

        const shareCode = createdTeam.team_code || createdTeam.id.substring(0, 8).toUpperCase();
        toast({
          title: "Team Created!",
          description: data.paidViaWallet
            ? (selectedPaymentMode === 'leader_pays'
                ? `₹${totalTeamFee} deducted for entire squad. Team code: ${shareCode}. Teammates join free!`
                : `₹${perSlotFee} deducted for your slot. Team code: ${shareCode}. Teammates pay ₹${perSlotFee} when joining.`)
            : isFree 
              ? `Your team "${createdTeam.team_name}" has been created. Team code: ${shareCode}.`
              : `Your team "${createdTeam.team_name}" has been created. Payment is pending admin approval.`,
        });
      } else if (pendingTeamAction.type === 'join' && pendingTeamAction.teamId) {
        const targetTeamId = pendingTeamAction.teamId;
        const { error } = await supabase
          .from('tournament_team_members')
          .insert({
            team_id: targetTeamId,
            user_id: user.id,
            role: 'member'
          });

        if (error) throw error;

        // Update team count & is_full
        const { data: tData } = await supabase
          .from('tournament_teams')
          .select('current_members, max_members')
          .eq('id', targetTeamId)
          .single();

        const newCount = (tData?.current_members || 1) + 1;
        const isFull = newCount >= (tData?.max_members || teamSize);
        await supabase
          .from('tournament_teams')
          .update({
            current_members: newCount,
            is_full: isFull
          })
          .eq('id', targetTeamId);

        toast({
          title: "Joined Team!",
          description: data.paidViaWallet
            ? `₹${entryFeeAmount} deducted from wallet. You've joined the team!`
            : isFree 
              ? "You have successfully joined the team."
              : "You have joined the team. Payment is pending admin approval.",
        });

        loadAvailableTeams();
      } else if (pendingTeamAction.type === 'join_by_code') {
        const targetTeamId = pendingTeamAction.teamId;
        let matchedTeamId = targetTeamId;

        if (!matchedTeamId) {
          const { data: teams } = await supabase
            .from('tournament_teams')
            .select('*')
            .eq('tournament_id', tournament.id)
            .eq('is_full', false);

          const matchingTeam = findMatchingTeamByCode((teams || []) as Team[], joinTeamCode);
          if (!matchingTeam) {
            toast({
              title: "Team Not Found",
              description: "Invalid team code or team is already full.",
              variant: "destructive"
            });
            return;
          }
          matchedTeamId = matchingTeam.id;
        }

        const { error } = await supabase
          .from('tournament_team_members')
          .insert({
            team_id: matchedTeamId,
            user_id: user.id,
            role: 'member'
          });

        if (error) throw error;

        // Update team count & is_full
        const { data: tData } = await supabase
          .from('tournament_teams')
          .select('current_members, max_members')
          .eq('id', matchedTeamId)
          .single();

        const newCount = (tData?.current_members || 1) + 1;
        const isFull = newCount >= (tData?.max_members || teamSize);
        await supabase
          .from('tournament_teams')
          .update({
            current_members: newCount,
            is_full: isFull
          })
          .eq('id', matchedTeamId);

        toast({
          title: "Joined Team!",
          description: "You have successfully joined the team!",
        });

        setJoinTeamCode('');
        loadAvailableTeams();
      }

      loadUserData();
      loadWalletBalance();
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setPendingTeamAction(null);
    }
  };

  const handlePaymentRetry = async (screenshotUrl: string) => {
    if (!userRegistration) return;
    
    setIsLoading(true);
    setShowPaymentRetryDialog(false);

    try {
      await tournamentRegistrationService.updatePaymentScreenshot(userRegistration.id, screenshotUrl);
      
      toast({
        title: "Payment Resubmitted",
        description: "Your payment is pending verification by admin.",
      });
      
      loadUserData();
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit payment",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Captain or Admin can remove a team member
  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (!userTeam) return;
    const isCaptain = userTeam.captain_user_id === user?.id;
    if (!isCaptain && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only team captains or admins can remove players.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Remove from team members
      const { error: memberError } = await supabase
        .from('tournament_team_members')
        .delete()
        .eq('id', memberId);

      if (memberError) throw memberError;

      // Also remove their registration if present
      await supabase
        .from('tournament_registrations')
        .delete()
        .eq('user_id', memberUserId)
        .eq('tournament_id', tournament.id);

      // Decrement team member count & update is_full status
      const updatedCount = Math.max(1, (userTeam.current_members || teamMembers.length) - 1);
      await supabase
        .from('tournament_teams')
        .update({
          current_members: updatedCount,
          is_full: false
        })
        .eq('id', userTeam.id);

      toast({
        title: "Player Removed",
        description: "The player has been removed from your team roster.",
      });

      setMemberToRemove(null);
      setSelectedMemberForDetails(null);
      loadTeamMembers(userTeam.id);
      loadUserData();
      loadAvailableTeams();
    } catch (error: any) {
      toast({
        title: "Failed to Remove Player",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Transfer captain role to another team member
  const handleTransferCaptaincy = async (newCaptainUserId: string) => {
    if (!userTeam) return;
    const isCaptain = userTeam.captain_user_id === user?.id;
    if (!isCaptain && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only the captain or an admin can transfer captaincy.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Update tournament_teams captain_user_id
      const { error: teamError } = await supabase
        .from('tournament_teams')
        .update({ captain_user_id: newCaptainUserId })
        .eq('id', userTeam.id);

      if (teamError) throw teamError;

      // 2. Set all members in team to 'member' role
      await supabase
        .from('tournament_team_members')
        .update({ role: 'member' })
        .eq('team_id', userTeam.id);

      // 3. Set new captain to 'captain' role
      await supabase
        .from('tournament_team_members')
        .update({ role: 'captain' })
        .eq('team_id', userTeam.id)
        .eq('user_id', newCaptainUserId);

      toast({
        title: "Captain Reassigned",
        description: "Team captaincy has been successfully updated.",
      });

      setMemberToMakeCaptain(null);
      setUserTeam(prev => prev ? { ...prev, captain_user_id: newCaptainUserId } : null);
      loadTeamMembers(userTeam.id);
      loadUserData();
      loadAvailableTeams();
    } catch (error: any) {
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to transfer captaincy.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Remaining member claims captaincy if current captain is absent/removed
  const handleClaimCaptaincy = async () => {
    if (!userTeam || !user) return;
    setIsLoading(true);
    try {
      await handleTransferCaptaincy(user.id);
      toast({
        title: "You are now Captain!",
        description: "You have taken leadership of the team.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to Claim Captaincy",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyTeamId = () => {
    if (userTeam) {
      const codeToCopy = userTeam.team_code || userTeam.id.substring(0, 8).toUpperCase();
      navigator.clipboard.writeText(codeToCopy);
      toast({
        title: "Copied!",
        description: "Team Code copied to clipboard. Share with your teammates!",
      });
    }
  };

  const getRegistrationStatus = () => {
    if (!userRegistration) return null;
    
    switch (userRegistration.payment_status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Payment Approved
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            Payment Pending
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Payment Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6 text-center">
          <p className="text-gray-300">Please log in to register for this tournament.</p>
        </CardContent>
      </Card>
    );
  }

  // User is already in a team
  if (userTeam) {
    const isCaptain = userTeam.captain_user_id === user.id;
    const hasActiveCaptain = teamMembers.some(m => m.role === 'captain' || m.user_id === userTeam.captain_user_id);

    return (
      <div className="space-y-6">
        {/* Team Status Card */}
        <Card className="bg-gradient-to-br from-purple-900/40 via-blue-900/30 to-indigo-900/40 border-purple-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              Your Team: {userTeam.team_name}
              <div className="ml-auto flex items-center gap-2">
                {userTeam.password ? (
                  <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-300 text-xs">
                    <Key className="w-3 h-3 mr-1 text-amber-400" /> Protected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-300 text-xs">
                    <Globe className="w-3 h-3 mr-1 text-emerald-400" /> Open Team
                  </Badge>
                )}
                {getRegistrationStatus()}
                <Badge variant={userTeam.is_full ? "default" : "outline"}>
                  {userTeam.is_full ? (
                    <><CheckCircle className="w-3 h-3 mr-1" />Ready</>
                  ) : (
                    <><Clock className="w-3 h-3 mr-1" />{userTeam.current_members}/{userTeam.max_members} Members</>
                  )}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Team Payment Mode Info */}
            {!isFree && (
              isTeamLeaderPaid(userTeam) ? (
                <div className="p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-300">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <p className="font-medium">Full Team Fee Paid</p>
                  </div>
                  <p className="text-sm text-blue-200/80 mt-1">
                    {isCaptain
                      ? `You paid ₹${totalTeamFee} upfront for the entire squad. Teammates can join 100% free with your team code.`
                      : 'The team captain paid the entire squad registration fee upfront. You joined for free!'}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                  <div className="flex items-center gap-2 text-purple-300">
                    <Users className="w-5 h-5 text-purple-400" />
                    <p className="font-medium">Individual Pay Mode</p>
                  </div>
                  <p className="text-sm text-purple-200/80 mt-1">
                    {isCaptain
                      ? `You paid your individual share of ₹${perSlotFee}. Teammates will pay their own share (₹${perSlotFee} per slot) when joining.`
                      : `Individual Pay Mode: Each member pays their own ₹${perSlotFee} slot fee.`}
                  </p>
                </div>
              )
            )}

            {/* Payment Pending Message */}
            {userRegistration?.payment_status === 'pending' && !isFree && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-300">
                  <Clock className="w-5 h-5" />
                  <p className="font-medium">Your payment is being verified by admin</p>
                </div>
                <p className="text-sm text-yellow-200/80 mt-1">
                  You'll be notified once your payment is approved.
                </p>
              </div>
            )}

            {/* Payment Rejected - Retry Option */}
            {userRegistration?.payment_status === 'rejected' && !isFree && (
              <div className="p-4 bg-red-500/10 border border-red-400/30 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-red-300">
                  <AlertTriangle className="w-5 h-5" />
                  <p className="font-medium">Your payment was rejected</p>
                </div>
                <p className="text-sm text-red-200/80">
                  Please submit a valid payment screenshot to complete registration.
                </p>
                <Button 
                  onClick={() => setShowPaymentRetryDialog(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Payment
                </Button>
              </div>
            )}

            {/* Share Team Code */}
            {!userTeam.is_full && isCaptain && (
              <div className="p-4 bg-black/20 rounded-lg border border-purple-500/20">
                <p className="text-sm text-purple-200 mb-2 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Share this Team Code with your teammates:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg text-white font-mono text-lg font-bold tracking-wider text-center border border-purple-500/30">
                    {userTeam.team_code || userTeam.id.substring(0, 8).toUpperCase()}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyTeamId} className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                {userTeam.password ? (
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="text-[11px] text-amber-300 font-semibold uppercase tracking-wider block">Team Password</span>
                        <code className="text-white font-mono font-bold tracking-wider">{userTeam.password}</code>
                      </div>
                    </div>
                    <span className="text-xs text-amber-300/80">Teammates must enter this password to join</span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                    <Globe className="w-3.5 h-3.5" />
                    <span>This is an open team (players can join without a password).</span>
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-2">
                  {isTeamLeaderPaid(userTeam) && !isFree 
                    ? "Members can join for free using this code since you've already paid for the team."
                    : `Teammates can join using this code and pay their individual share (₹${perSlotFee}).`}
                </p>
              </div>
            )}

            {/* Team Members Roster */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-200">
                  Team Members ({teamMembers.length}/{teamSize})
                </p>
                <span className="text-xs text-gray-400">
                  {isCaptain ? 'You are team captain' : 'Roster member'}
                </span>
              </div>

              {/* Notice if team has no active captain */}
              {!hasActiveCaptain && (
                <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-amber-300 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>This team has no active captain. Any remaining member can claim leadership.</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleClaimCaptaincy}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-semibold text-xs shadow-sm"
                  >
                    <Crown className="w-3.5 h-3.5 mr-1" />
                    Claim Captain Role
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                {teamMembers.map((member) => {
                  const isMemberCaptain = member.role === 'captain' || member.user_id === userTeam.captain_user_id;
                  const isSelf = member.user_id === user?.id;
                  const canManage = (isCaptain || isAdmin) && !isMemberCaptain && !isSelf;
                  const memberName = member.profile?.in_game_name || 
                                     member.profile?.display_name || 
                                     member.profile?.username || 
                                     member.registration?.player_name || 
                                     (isMemberCaptain ? 'Team Captain' : 'Player');
                  const gameId = member.profile?.game_id || member.registration?.game_id;

                  return (
                    <div 
                      key={member.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-700/60 border border-gray-600/70 rounded-xl hover:border-purple-500/40 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          isMemberCaptain 
                            ? 'bg-gradient-to-br from-yellow-500 to-amber-600 shadow-md' 
                            : 'bg-gradient-to-br from-purple-600 to-blue-600'
                        }`}>
                          {isMemberCaptain ? (
                            <Crown className="w-4 h-4 text-white" />
                          ) : (
                            <Users className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-white text-sm truncate">
                              {memberName}
                            </p>
                            {isMemberCaptain && (
                              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40 text-[10px] px-1.5 py-0 h-4">
                                Captain
                              </Badge>
                            )}
                            {isSelf && (
                              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px] px-1.5 py-0 h-4">
                                You
                              </Badge>
                            )}
                            {member.registration?.payment_status && (
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${
                                member.registration.payment_status === 'completed' 
                                  ? 'border-green-500/40 text-green-400'
                                  : member.registration.payment_status === 'pending'
                                  ? 'border-yellow-500/40 text-yellow-400'
                                  : 'border-red-500/40 text-red-400'
                              }`}>
                                {member.registration.payment_status}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <span>Game ID: <span className="font-mono text-gray-300 font-medium">{gameId || 'N/A'}</span></span>
                            <span>•</span>
                            <span>Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedMemberForDetails(member)}
                          className="h-8 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white text-xs"
                        >
                          <Info className="w-3.5 h-3.5 mr-1 text-blue-400" />
                          View Details
                        </Button>

                        {canManage && tournament.status !== 'completed' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setMemberToMakeCaptain(member)}
                              disabled={isLoading}
                              className="h-8 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/20 text-xs"
                              title="Transfer team leadership to this member"
                            >
                              <Crown className="w-3.5 h-3.5 mr-1 text-yellow-400" />
                              Make Captain
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setMemberToRemove(member)}
                              disabled={isLoading}
                              className="h-8 bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
                            >
                              <UserMinus className="w-3.5 h-3.5 mr-1" />
                              Remove Player
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Edit Registration Details Button */}
            {userRegistration && (
              <Button
                onClick={() => setShowEditDialog(true)}
                variant="outline"
                className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Registration Details
              </Button>
            )}

            {!userTeam.is_full && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                <p className="text-sm text-yellow-200">
                  ⏳ Waiting for {teamSize - userTeam.current_members} more player(s) to join...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Room Details Card - Show only when payment approved */}
        {userRegistration?.payment_status === 'completed' && (
          <Card className="bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-teal-900/40 border-green-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                Room Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {roomDetails && (roomDetails.room_id || roomDetails.room_password) ? (
                <>
                  {roomDetails.room_id && (
                    <div className="p-4 bg-black/20 rounded-lg border border-green-500/20 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-green-200 mb-2">Room ID</p>
                        <p className="font-mono text-xl text-white font-bold">{roomDetails.room_id}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-green-300 hover:text-white hover:bg-green-500/20"
                        onClick={() => {
                          navigator.clipboard.writeText(roomDetails.room_id!);
                          toast({ title: "Copied!", description: "Room ID copied to clipboard." });
                        }}
                      >
                        <Copy className="w-5 h-5" />
                      </Button>
                    </div>
                  )}
                  {roomDetails.room_password && (
                    <div className="p-4 bg-black/20 rounded-lg border border-emerald-500/20 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-emerald-200 mb-2">Password</p>
                        <p className="font-mono text-xl text-white font-bold">{roomDetails.room_password}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-emerald-300 hover:text-white hover:bg-emerald-500/20"
                        onClick={() => {
                          navigator.clipboard.writeText(roomDetails.room_password!);
                          toast({ title: "Copied!", description: "Password copied to clipboard." });
                        }}
                      >
                        <Copy className="w-5 h-5" />
                      </Button>
                    </div>
                  )}
                  <div className="p-3 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                    <p className="text-sm text-yellow-200">
                      ⚠️ Keep these details safe. You'll need them to join the tournament room.
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                  <p className="text-gray-300 text-center">
                    🕐 Room details will be shared by admin before the tournament starts. Check back later!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Retry Dialog */}
        <PaymentRetryDialog
          open={showPaymentRetryDialog}
          onOpenChange={setShowPaymentRetryDialog}
          onSubmit={handlePaymentRetry}
          isLoading={isLoading}
          tournamentId={tournament.id}
          entryFee={entryFeeAmount}
        />

        {/* Member Details Dialog */}
        {selectedMemberForDetails && (
          <Dialog open={!!selectedMemberForDetails} onOpenChange={(open) => !open && setSelectedMemberForDetails(null)}>
            <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5 text-lg">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shrink-0">
                    {selectedMemberForDetails.role === 'captain' || selectedMemberForDetails.user_id === userTeam.captain_user_id ? (
                      <Crown className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <Users className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span>Player Profile & Information</span>
                </DialogTitle>
                <DialogDescription className="text-gray-400 text-xs">
                  Full details for this roster member in {userTeam.team_name}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 py-2">
                {/* Basic Info Card */}
                <div className="p-3 bg-gray-800/80 rounded-xl border border-gray-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Player Name:</span>
                    <span className="font-semibold text-white text-sm">
                      {selectedMemberForDetails.profile?.in_game_name || 
                       selectedMemberForDetails.profile?.display_name || 
                       selectedMemberForDetails.profile?.username || 
                       selectedMemberForDetails.registration?.player_name || 'N/A'}
                    </span>
                  </div>
                  {selectedMemberForDetails.profile?.username && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Username:</span>
                      <span className="text-xs text-gray-300">
                        @{selectedMemberForDetails.profile.username}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Team Role:</span>
                    <Badge 
                      variant={selectedMemberForDetails.role === 'captain' || selectedMemberForDetails.user_id === userTeam.captain_user_id ? 'default' : 'outline'} 
                      className={selectedMemberForDetails.role === 'captain' || selectedMemberForDetails.user_id === userTeam.captain_user_id ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 text-xs' : 'text-xs text-gray-300'}
                    >
                      {selectedMemberForDetails.role === 'captain' || selectedMemberForDetails.user_id === userTeam.captain_user_id ? 'Team Captain' : 'Team Member'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Joined Team On:</span>
                    <span className="text-xs text-gray-300">
                      {new Date(selectedMemberForDetails.joined_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Game ID Info */}
                <div className="p-3 bg-gray-800/80 rounded-xl border border-gray-700/80 space-y-2">
                  <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Game Credentials</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">In-Game ID (UID):</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm bg-black/50 px-2 py-0.5 rounded text-purple-200 border border-purple-500/30">
                        {selectedMemberForDetails.profile?.game_id || selectedMemberForDetails.registration?.game_id || 'Not specified'}
                      </code>
                      {(selectedMemberForDetails.profile?.game_id || selectedMemberForDetails.registration?.game_id) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-gray-400 hover:text-white"
                          onClick={() => {
                            const idToCopy = selectedMemberForDetails.profile?.game_id || selectedMemberForDetails.registration?.game_id || '';
                            navigator.clipboard.writeText(idToCopy);
                            toast({ title: "Copied!", description: "Game ID copied to clipboard." });
                          }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Info (if available) */}
                {(selectedMemberForDetails.profile?.email || selectedMemberForDetails.profile?.phone_number) && (
                  <div className="p-3 bg-gray-800/80 rounded-xl border border-gray-700/80 space-y-2">
                    <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Contact Details</p>
                    {selectedMemberForDetails.profile?.email && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-blue-400" /> Email:</span>
                        <span className="text-gray-200 font-mono">{selectedMemberForDetails.profile.email}</span>
                      </div>
                    )}
                    {selectedMemberForDetails.profile?.phone_number && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-green-400" /> Phone:</span>
                        <span className="text-gray-200 font-mono">{selectedMemberForDetails.profile.phone_number}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Tournament Custom Registration Details */}
                {selectedMemberForDetails.registration?.custom_fields_data && Object.keys(selectedMemberForDetails.registration.custom_fields_data).filter(k => !k.startsWith('rejection_')).length > 0 && (
                  <div className="p-3 bg-gray-800/80 rounded-xl border border-gray-700/80 space-y-2">
                    <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Tournament Form Answers</p>
                    <div className="space-y-1.5">
                      {Object.entries(selectedMemberForDetails.registration.custom_fields_data)
                        .filter(([key]) => !key.startsWith('rejection_'))
                        .map(([key, val]) => (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="font-medium text-white">{String(val)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex items-center justify-between gap-2 border-t border-gray-800 pt-3">
                {(isCaptain || isAdmin) && selectedMemberForDetails.role !== 'captain' && selectedMemberForDetails.user_id !== userTeam.captain_user_id && selectedMemberForDetails.user_id !== user?.id && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setMemberToRemove(selectedMemberForDetails);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs"
                  >
                    <UserMinus className="w-3.5 h-3.5 mr-1" />
                    Remove Player
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMemberForDetails(null)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800 ml-auto"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Remove Player Confirmation Dialog */}
        {memberToRemove && (
          <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
            <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-400 text-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Remove Player from Team
                </DialogTitle>
                <DialogDescription className="text-gray-300 text-sm mt-2">
                  Are you sure you want to remove <strong className="text-white">{memberToRemove.profile?.in_game_name || memberToRemove.profile?.display_name || memberToRemove.profile?.username || 'this player'}</strong> from <strong className="text-purple-300">{userTeam?.team_name}</strong>?
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 text-xs text-gray-400 space-y-1.5 bg-gray-800/60 p-3 rounded-lg border border-gray-700/60">
                <p className="flex items-center gap-2">• The player will be removed from your team roster.</p>
                <p className="flex items-center gap-2">• Their slot will reopen for another teammate to join.</p>
              </div>
              <DialogFooter className="flex gap-2 justify-end pt-3 border-t border-gray-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMemberToRemove(null)}
                  disabled={isLoading}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveMember(memberToRemove.id, memberToRemove.user_id)}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <UserMinus className="w-3.5 h-3.5 mr-1" />
                  {isLoading ? 'Removing...' : 'Confirm Removal'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Make Captain Confirmation Dialog */}
        {memberToMakeCaptain && (
          <Dialog open={!!memberToMakeCaptain} onOpenChange={(open) => !open && setMemberToMakeCaptain(null)}>
            <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-yellow-400 text-lg">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Transfer Team Captaincy
                </DialogTitle>
                <DialogDescription className="text-gray-300 text-sm mt-2">
                  Are you sure you want to transfer captaincy to <strong className="text-white">{memberToMakeCaptain.profile?.in_game_name || memberToMakeCaptain.profile?.display_name || memberToMakeCaptain.profile?.username || 'this member'}</strong>?
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 text-xs text-gray-400 space-y-1.5 bg-gray-800/60 p-3 rounded-lg border border-gray-700/60">
                <p className="flex items-center gap-2">• They will become the team captain with full roster management permissions.</p>
                <p className="flex items-center gap-2">• You will remain on the team roster as a team member.</p>
              </div>
              <DialogFooter className="flex gap-2 justify-end pt-3 border-t border-gray-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMemberToMakeCaptain(null)}
                  disabled={isLoading}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleTransferCaptaincy(memberToMakeCaptain.user_id)}
                  disabled={isLoading}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                >
                  <Crown className="w-3.5 h-3.5 mr-1" />
                  {isLoading ? 'Transferring...' : 'Confirm Transfer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // User not in a team - show create/join options
  return (
    <div className="space-y-6">
      {/* Tournament Info */}
      <Card className="bg-gradient-to-br from-purple-900/40 via-blue-900/30 to-indigo-900/40 border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            {getTeamModeLabel()} Tournament Registration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-black/20 rounded-lg border border-purple-500/20">
            <p className="font-bold text-white text-lg">Entry Fee: {tournament.entry_fee || 'Free'}</p>
            <p className="text-sm text-purple-200">
              Team Size: {teamSize} players • {availableTeams.length} teams looking for members
            </p>
            {!isFree && (
              <p className="text-xs sm:text-sm text-purple-300/90 mt-1.5 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Full Team Fee: <strong>₹{totalTeamFee}</strong> • Individual Slot: <strong>₹{perSlotFee}</strong> (divided per slot)</span>
              </p>
            )}
          </div>

          {/* Create Team Section */}
          <div className="p-4 bg-black/20 rounded-lg border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between gap-2 text-white font-medium">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span>Create Your Team</span>
              </div>
              {!isFree && (
                <span className="text-sm font-bold text-purple-300">
                  {selectedPaymentMode === 'leader_pays' ? `Total: ₹${totalTeamFee}` : `Your Share: ₹${perSlotFee}`}
                </span>
              )}
            </div>

            {/* Payment Option Selector for Leader */}
            {!isFree && (
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                  Choose Payment Option
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: Pay Full Team Fee */}
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMode('leader_pays')}
                    disabled={isRegistrationFull}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      selectedPaymentMode === 'leader_pays'
                        ? 'bg-purple-600/20 border-purple-400 ring-1 ring-purple-400/50 shadow-md shadow-purple-500/10'
                        : 'bg-gray-800/60 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-yellow-400" />
                        Pay Full Team Fee
                      </span>
                      <span className="font-extrabold text-sm text-purple-300">
                        ₹{totalTeamFee}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 leading-snug">
                      Pay entire registration amount upfront for the whole squad. Teammates join <strong>FREE</strong> with your team code.
                    </p>
                  </button>

                  {/* Option 2: Pay Individually */}
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMode('each_pays')}
                    disabled={isRegistrationFull}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      selectedPaymentMode === 'each_pays'
                        ? 'bg-blue-600/20 border-blue-400 ring-1 ring-blue-400/50 shadow-md shadow-blue-500/10'
                        : 'bg-gray-800/60 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-400" />
                        Pay Individually
                      </span>
                      <span className="font-extrabold text-sm text-blue-300">
                        ₹{perSlotFee} / slot
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 leading-snug">
                      Fee divided per slot (₹{totalTeamFee} ÷ {teamSize}). You pay <strong>₹{perSlotFee}</strong> now; teammates pay their own <strong>₹{perSlotFee}</strong> share upon joining.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {isRegistrationFull && !userTeam && (
              <div className="p-4 bg-amber-500/15 border border-amber-400/40 rounded-xl space-y-1 text-center mb-3 animate-fade-in">
                <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-base">
                  <Lock className="w-5 h-5 text-amber-400" />
                  <span>Registration Full / Closed</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-200/90">
                  All {tournament.max_participants} team slots for this tournament have been filled. Creating new teams is closed.
                </p>
              </div>
            )}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name..."
                  disabled={isRegistrationFull}
                  className="bg-gray-700 border-gray-600 text-white flex-1 disabled:opacity-60"
                />
                <div className="relative flex-1">
                  <Input
                    type={showPasswordInput ? "text" : "password"}
                    value={teamPassword}
                    onChange={(e) => setTeamPassword(e.target.value)}
                    placeholder="Team Password (Optional - leave blank for open team)"
                    disabled={isRegistrationFull}
                    className="bg-gray-700 border-gray-600 text-white pr-10 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordInput(!showPasswordInput)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    tabIndex={-1}
                    aria-label={showPasswordInput ? "Hide password" : "Show password"}
                  >
                    {showPasswordInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  onClick={handleCreateTeam}
                  disabled={isLoading || !teamName.trim() || isRegistrationFull}
                  className={`shrink-0 font-bold transition-all ${
                    isRegistrationFull
                      ? 'bg-gray-700/80 text-gray-400 cursor-not-allowed border border-gray-600 hover:bg-gray-700/80'
                      : 'bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700'
                  }`}
                >
                  {isRegistrationFull ? (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Full / Closed
                    </>
                  ) : isFree ? (
                    <>
                      <Crown className="w-4 h-4 mr-2" />
                      Create Team
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4 mr-2" />
                      {selectedPaymentMode === 'leader_pays' ? `Create & Pay ₹${totalTeamFee}` : `Create & Pay ₹${perSlotFee}`}
                    </>
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {teamPassword.trim() ? (
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <strong>Protected Team:</strong> Only teammates who enter this password can join your team.
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <strong>Open Team:</strong> Any player can join open slots without entering a password.
                  </span>
                )}
              </div>
            </div>
            {!isFree && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  Wallet Balance: <span className={walletBalance >= (selectedPaymentMode === 'leader_pays' ? totalTeamFee : perSlotFee) ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>₹{walletBalance}</span>
                </span>
                {walletBalance < (selectedPaymentMode === 'leader_pays' ? totalTeamFee : perSlotFee) && (
                  <Link to="/wallet" className="text-purple-400 hover:underline">
                    Add funds →
                  </Link>
                )}
              </div>
            )}
            <p className="text-xs text-gray-400">
              {!isFree
                ? (selectedPaymentMode === 'leader_pays'
                    ? `You'll pay ₹${totalTeamFee} upfront for the entire squad. Teammates join 100% free with your team code!`
                    : `You'll pay your ₹${perSlotFee} slot share. Teammates will pay ₹${perSlotFee} each when joining.`)
                : "As captain, you'll get a Team Code to share with your teammates."}
            </p>
          </div>

          {/* Join with Team Code Section */}
          <div className="p-4 bg-black/20 rounded-lg border border-green-500/20 space-y-3">
            <div className="flex items-center gap-2 text-white font-medium">
              <Hash className="w-5 h-5 text-green-400" />
              Join with Team Code
              {!isFree && (
                <span className="text-xs text-gray-300 font-normal">
                  (Free if leader paid all, or ₹{perSlotFee} share)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={joinTeamCode}
                onChange={(e) => setJoinTeamCode(e.target.value.toUpperCase())}
                placeholder="Enter team code..."
                className="bg-gray-700 border-gray-600 text-white uppercase tracking-wider"
                maxLength={25}
              />
              <Button
                onClick={handleJoinByCode}
                disabled={isJoiningByCode || isLoading || !joinTeamCode.trim()}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {isLoading ? 'Joining...' : 'Join'}
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              {!isFree
                ? `Got a team code from your captain? Enter it here to join. If your captain paid the full squad fee, you join free! Otherwise you'll pay your ₹${perSlotFee} slot fee.`
                : "Got a team code from your captain? Enter it here to join their team."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Teams Looking for Members */}
      <Card className="bg-gray-800/90 border-gray-700 backdrop-blur-sm shadow-xl">
        <CardHeader className="pb-3 border-b border-gray-700/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-white text-lg">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <span>Teams Looking for Members ({availableTeams.length})</span>
              {availableTeams.length > 0 && (
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                  {availableTeams.length} {availableTeams.length === 1 ? 'team available' : 'teams available'}
                </Badge>
              )}
            </CardTitle>
            {availableTeams.length > 0 && (
              <p className="text-xs text-gray-400">
                Click any open slot or the Join button to team up
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {availableTeams.length === 0 ? (
            <div className="text-center py-6 px-4 rounded-lg bg-gray-900/40 border border-dashed border-gray-700/60">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-500 opacity-60" />
              <p className="text-sm font-medium text-gray-300">No teams currently looking for members</p>
              <p className="text-xs text-gray-500 mt-1">Create your team above or join using a private team code.</p>
            </div>
          ) : (
            availableTeams.map((team) => {
              const maxSlots = team.max_members || teamSize;
              const members = team.members || [];
              const filledCount = members.length > 0 ? members.length : Math.max(1, team.current_members || 1);
              const openSlotsCount = Math.max(0, maxSlots - filledCount);

              return (
                <div
                  key={team.id}
                  className="p-4 rounded-xl bg-gray-900/70 border border-gray-700/80 hover:border-purple-500/40 transition-all space-y-3.5"
                >
                  {/* Team Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Users className="w-4 h-4 text-purple-400" />
                        <h4 className="font-semibold text-white text-base">
                          {team.team_name}
                        </h4>
                        {team.password ? (
                          <Badge 
                            variant="outline" 
                            className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-xs flex items-center gap-1"
                          >
                            <Key className="w-3 h-3 text-amber-400" />
                            Protected
                          </Badge>
                        ) : (
                          <Badge 
                            variant="outline" 
                            className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-xs flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3 text-emerald-400" />
                            Open
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className="border-blue-500/40 text-blue-300 bg-blue-500/10 text-xs"
                        >
                          {filledCount}/{maxSlots} Members
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={openSlotsCount > 0 
                            ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-xs"
                            : "border-gray-600 text-gray-400 text-xs"
                          }
                        >
                          {openSlotsCount > 0 ? `${openSlotsCount} ${openSlotsCount === 1 ? 'slot' : 'slots'} open` : 'Full'}
                        </Badge>
                        {!isFree && (
                          <Badge 
                            variant="outline" 
                            className={isTeamLeaderPaid(team)
                              ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-xs"
                              : "border-cyan-500/40 text-cyan-300 bg-cyan-500/10 text-xs"
                            }
                          >
                            {isTeamLeaderPaid(team) ? 'Leader Paid (Free)' : `Individual (₹${perSlotFee})`}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1.5">
                        <span>Team Code:</span>
                        <code className="font-mono text-gray-300 bg-black/40 px-2 py-0.5 rounded border border-gray-700/60 text-xs font-semibold tracking-wider">
                          {team.team_code || team.id.substring(0, 8).toUpperCase()}
                        </code>
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleJoinTeam(team.id)}
                      disabled={isLoading || openSlotsCount === 0}
                      className={team.password 
                        ? "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-medium shadow-md"
                        : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-medium shadow-md"
                      }
                    >
                      {team.password ? (
                        <Key className="w-4 h-4 mr-1.5 text-amber-200" />
                      ) : (
                        <UserPlus className="w-4 h-4 mr-1.5" />
                      )}
                      {team.password ? 'Join with Password' : (isFree || isTeamLeaderPaid(team) ? 'Join Free' : `Join (₹${perSlotFee})`)}
                    </Button>
                  </div>

                  {/* Current Roster and Open Slots */}
                  <div className="pt-2.5 border-t border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Current Roster & Open Slots
                      </p>
                      <span className="text-[11px] text-gray-500">
                        {openSlotsCount} {openSlotsCount === 1 ? 'open slot' : 'open slots'} available
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                      {/* Current Roster Members */}
                      {members.map((member, idx) => {
                        const isCap = member.role === 'captain' || member.user_id === team.captain_user_id;
                        const playerName = member.profile?.in_game_name || 
                                           member.profile?.display_name || 
                                           member.profile?.username || 
                                           (isCap ? 'Captain' : `Player ${idx + 1}`);
                        const gameId = member.profile?.game_id;

                        return (
                          <div
                            key={member.id || idx}
                            className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-800/90 border border-purple-500/20 shadow-sm"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              isCap 
                                ? 'bg-gradient-to-br from-yellow-500 to-amber-600 shadow-md' 
                                : 'bg-gradient-to-br from-purple-600 to-blue-600'
                            }`}>
                              {isCap ? (
                                <Crown className="w-4 h-4 text-white" />
                              ) : (
                                <Users className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-semibold text-white truncate" title={playerName}>
                                  {playerName}
                                </p>
                                {isCap && (
                                  <Badge className="text-[10px] px-1 py-0 h-4 bg-yellow-500/20 text-yellow-300 border-yellow-500/40">
                                    Cap
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-400 truncate">
                                {gameId ? `ID: ${gameId}` : (isCap ? 'Team Captain' : 'Member')}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {/* Open Slots */}
                      {Array.from({ length: openSlotsCount }).map((_, slotIdx) => (
                        <div
                          key={`open-${slotIdx}`}
                          onClick={() => handleJoinTeam(team.id)}
                          className="flex items-center gap-2.5 p-2.5 rounded-lg border-2 border-dashed border-emerald-500/40 bg-emerald-950/15 hover:bg-emerald-900/30 hover:border-emerald-400/80 cursor-pointer transition-all group"
                          role="button"
                          title="Click to join this open slot"
                        >
                          <div className="w-8 h-8 rounded-full border border-dashed border-emerald-400/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform bg-emerald-500/10">
                            <UserPlus className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
                                Open Slot
                              </p>
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            </div>
                            <p className="text-[11px] text-gray-400 group-hover:text-gray-300">
                              Available to join
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Registration Form Dialog (only used in each_pays mode) */}
      <RegistrationFormDialog
        open={showRegistrationDialog}
        onOpenChange={(open) => {
          setShowRegistrationDialog(open);
          if (!open) setPendingTeamAction(null);
        }}
        onSubmit={handleRegistrationSubmit}
        isLoading={isLoading}
        tournamentId={tournament.id}
        isPaid={!isFree}
        entryFee={pendingTeamAction?.type === 'create' ? (selectedPaymentMode === 'leader_pays' ? totalTeamFee : perSlotFee) : perSlotFee}
      />

      {/* Edit Registration Dialog */}
      {userRegistration && (
        <EditRegistrationDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          registration={userRegistration}
          tournamentId={tournament.id}
          onUpdated={() => {
            loadUserData();
            loadAvailableTeams();
          }}
        />
      )}

      {/* Team Password Verification Dialog */}
      {teamPasswordPromptDialog && (
        <Dialog 
          open={!!teamPasswordPromptDialog} 
          onOpenChange={(open) => {
            if (!open) {
              setTeamPasswordPromptDialog(null);
              setEnteredPassword('');
              setShowEnteredPassword(false);
            }
          }}
        >
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <Key className="w-4 h-4 text-amber-400" />
                </div>
                <span>Password Protected Team</span>
              </DialogTitle>
              <DialogDescription className="text-gray-300 text-xs">
                Team <strong className="text-purple-300 font-semibold">"{teamPasswordPromptDialog.team.team_name}"</strong> requires a password to join.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyTeamPassword();
              }}
              className="space-y-4 py-2"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-300">Enter Team Password</label>
                <div className="relative">
                  <Input
                    type={showEnteredPassword ? "text" : "password"}
                    value={enteredPassword}
                    onChange={(e) => setEnteredPassword(e.target.value)}
                    placeholder="Enter password..."
                    autoFocus
                    className="bg-gray-800 border-gray-600 text-white pr-10 focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEnteredPassword(!showEnteredPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    tabIndex={-1}
                    aria-label={showEnteredPassword ? "Hide password" : "Show password"}
                  >
                    {showEnteredPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTeamPasswordPromptDialog(null);
                    setEnteredPassword('');
                  }}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={verifyingPassword || !enteredPassword.trim()}
                  className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white"
                >
                  {verifyingPassword ? 'Verifying...' : 'Unlock & Join Team'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TeamRegistration;
