import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tournament } from '@/types';
import { Users, Crown, UserPlus, Copy, CheckCircle, Clock, Lock, Hash, XCircle, AlertTriangle, RefreshCw, Trash2, Wallet } from 'lucide-react';
import { tournamentRegistrationService, TournamentRoom } from '@/services/tournamentRegistrationService';
import RegistrationFormDialog from './RegistrationFormDialog';
import PaymentRetryDialog from './PaymentRetryDialog';
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
    game_id: string | null;
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
  
  // Dialog states for registration flow
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [showPaymentRetryDialog, setShowPaymentRetryDialog] = useState(false);
  const [pendingTeamAction, setPendingTeamAction] = useState<{ type: 'create' | 'join' | 'join_by_code'; teamId?: string } | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const teamSize = typeof tournament.team_size === 'number' 
    ? tournament.team_size 
    : parseInt(tournament.team_size || '1') || 1;

  const isFree = !tournament.entry_fee || tournament.entry_fee === 'Free' || tournament.entry_fee === '0' || tournament.entry_fee === '₹0';
  const entryFeeAmount = isFree ? 0 : parseInt(tournament.entry_fee?.replace(/[^0-9]/g, '') || '0');
  
  // Check if leader pays for all
  const isLeaderPays = (tournament as any).team_payment_mode === 'leader_pays';
  const totalLeaderAmount = isLeaderPays ? entryFeeAmount * teamSize : entryFeeAmount;

  const getTeamModeLabel = () => {
    if (teamSize === 1) return 'Solo';
    if (teamSize === 2) return 'Duo';
    if (teamSize === 4) return 'Squad';
    if (teamSize === 5) return '5-Man Squad';
    return `Team (${teamSize} players)`;
  };

  useEffect(() => {
    if (user) {
      loadUserData();
      loadAvailableTeams();
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

    loadRoomDetails();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(regChannel);
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

      if (memberData) {
        const team = (memberData as any).tournament_teams as Team;
        setUserTeam(team);
        loadTeamMembers(team.id);
        
        if (team.is_full && registration?.payment_status === 'completed') {
          const room = await tournamentRegistrationService.getTournamentRoom(tournament.id);
          setRoomDetails(room);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const { data: members } = await supabase
        .from('tournament_team_members')
        .select('*')
        .eq('team_id', teamId);

      if (members) {
        const userIds = members.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, game_id')
          .in('user_id', userIds);

        const membersWithProfiles = members.map(member => ({
          ...member,
          profile: profiles?.find(p => p.user_id === member.user_id)
        }));

        setTeamMembers(membersWithProfiles as TeamMember[]);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const loadAvailableTeams = async () => {
    try {
      const { data } = await supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', tournament.id)
        .eq('is_full', false)
        .order('created_at', { ascending: false });

      setAvailableTeams((data || []) as Team[]);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  // Open registration dialog for creating team
  const handleCreateTeam = async () => {
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

    // For leader_pays mode with sufficient wallet balance, auto-deduct
    if (isLeaderPays && !isFree) {
      if (walletBalance >= totalLeaderAmount) {
        // Direct wallet flow - no payment dialog needed
        await createTeamWithWallet();
        return;
      }
      // Insufficient balance - fall through to show registration dialog with manual payment
    }

    setPendingTeamAction({ type: 'create' });
    setShowRegistrationDialog(true);
  };

  // Create team with wallet payment (leader_pays mode)
  const createTeamWithWallet = async () => {
    if (!user || !userProfile) return;
    setIsLoading(true);

    try {
      // Deduct wallet balance
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          amount: totalLeaderAmount,
          transaction_type: 'tournament_entry',
          status: 'approved',
          mode: 'esports',
          tournament_id: tournament.id,
          tournament_name: tournament.name,
          payment_method: 'wallet',
        });
      if (txError) throw new Error('Failed to deduct wallet balance: ' + txError.message);

      // Create registration
      const registrationData = {
        tournament_id: tournament.id,
        player_name: userProfile.display_name || userProfile.username || user.email || 'Unknown Player',
        game_id: userProfile.game_id || 'N/A',
        payment_amount: totalLeaderAmount,
        custom_fields_data: {}
      };
      const registration = await tournamentRegistrationService.registerForTournamentWithWallet(registrationData);
      setUserRegistration(registration);

      // Create team
      const { data: team, error } = await supabase
        .from('tournament_teams')
        .insert({
          team_name: teamName.trim(),
          captain_user_id: user.id,
          tournament_id: tournament.id,
          max_members: teamSize
        })
        .select()
        .single();

      if (error) throw error;

      setUserTeam(team as Team);
      setTeamName('');
      loadTeamMembers(team.id);
      loadWalletBalance();

      toast({
        title: "Team Created!",
        description: `₹${totalLeaderAmount} deducted from wallet (₹${entryFeeAmount} × ${teamSize}). Share your team code for others to join free!`,
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

    // For leader_pays, members join free - no payment dialog
    if (isLeaderPays && !isFree) {
      await joinTeamByCodeFree();
      return;
    }

    setPendingTeamAction({ type: 'join_by_code' });
    setShowRegistrationDialog(true);
  };

  // Join team free (leader already paid)
  const joinTeamByCodeFree = async () => {
    if (!user || !userProfile) return;
    setIsLoading(true);

    try {
      const codeToSearch = joinTeamCode.trim().toLowerCase();
      
      const { data: teams } = await supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', tournament.id)
        .eq('is_full', false);

      const matchingTeam = teams?.find(team => 
        team.id.substring(0, 8).toLowerCase() === codeToSearch
      );

      if (!matchingTeam) {
        toast({
          title: "Team Not Found",
          description: "Invalid team code or team is already full.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Create registration (free for member since leader paid)
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
          team_id: matchingTeam.id,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;

      toast({
        title: "Joined Team!",
        description: `You've joined team "${matchingTeam.team_name}" for free! Leader has already paid.`,
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

    if (isLeaderPays && !isFree) {
      // Members join free in leader_pays mode
      await joinTeamDirectFree(teamId);
      return;
    }

    setPendingTeamAction({ type: 'join', teamId });
    setShowRegistrationDialog(true);
  };

  const joinTeamDirectFree = async (teamId: string) => {
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
          team_id: teamId,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;

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
      // If paying via wallet, deduct balance first
      if (!isFree && data.paidViaWallet) {
        const { error: txError } = await supabase
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            amount: entryFeeAmount,
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
        payment_amount: entryFeeAmount,
        payment_screenshot_url: data.screenshotUrl,
        custom_fields_data: data.customFields
      };

      const registration = data.paidViaWallet
        ? await tournamentRegistrationService.registerForTournamentWithWallet(registrationData)
        : await tournamentRegistrationService.registerForTournament(registrationData);
      setUserRegistration(registration);

      // Proceed with team action
      if (pendingTeamAction.type === 'create') {
        const { data: team, error } = await supabase
          .from('tournament_teams')
          .insert({
            team_name: teamName.trim(),
            captain_user_id: user.id,
            tournament_id: tournament.id,
            max_members: teamSize
          })
          .select()
          .single();

        if (error) throw error;

        setUserTeam(team as Team);
        setTeamName('');
        loadTeamMembers(team.id);
        
        toast({
          title: "Team Created!",
          description: data.paidViaWallet
            ? `₹${entryFeeAmount} deducted from wallet. Share your team code for others to join.`
            : isFree 
              ? `Your team "${team.team_name}" has been created. Share your team code for others to join.`
              : `Your team "${team.team_name}" has been created. Payment is pending admin approval.`,
        });
      } else if (pendingTeamAction.type === 'join' && pendingTeamAction.teamId) {
        const { error } = await supabase
          .from('tournament_team_members')
          .insert({
            team_id: pendingTeamAction.teamId,
            user_id: user.id,
            role: 'member'
          });

        if (error) throw error;

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
        const codeToSearch = joinTeamCode.trim().toLowerCase();
        
        const { data: teams } = await supabase
          .from('tournament_teams')
          .select('*')
          .eq('tournament_id', tournament.id)
          .eq('is_full', false);

        const matchingTeam = teams?.find(team => 
          team.id.substring(0, 8).toLowerCase() === codeToSearch
        );

        if (!matchingTeam) {
          toast({
            title: "Team Not Found",
            description: "Invalid team code or team is already full.",
            variant: "destructive"
          });
          return;
        }

        const { error } = await supabase
          .from('tournament_team_members')
          .insert({
            team_id: matchingTeam.id,
            user_id: user.id,
            role: 'member'
          });

        if (error) throw error;

        toast({
          title: "Joined Team!",
          description: `You have successfully joined team "${matchingTeam.team_name}"!`,
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

  // Leader can remove a team member
  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (!userTeam || userTeam.captain_user_id !== user?.id) return;

    setIsLoading(true);
    try {
      // Remove from team
      const { error: memberError } = await supabase
        .from('tournament_team_members')
        .delete()
        .eq('id', memberId);

      if (memberError) throw memberError;

      // Also remove their registration
      const { error: regError } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('user_id', memberUserId)
        .eq('tournament_id', tournament.id);

      // Don't throw on reg error - member might not have a separate registration

      toast({
        title: "Member Removed",
        description: "Team member has been removed.",
      });

      loadTeamMembers(userTeam.id);
      loadUserData();
      loadAvailableTeams();
    } catch (error: any) {
      toast({
        title: "Failed to Remove",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyTeamId = () => {
    if (userTeam) {
      const shortCode = userTeam.id.substring(0, 8).toUpperCase();
      navigator.clipboard.writeText(shortCode);
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
            {/* Leader Pays Info */}
            {isLeaderPays && !isFree && isCaptain && (
              <div className="p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                <div className="flex items-center gap-2 text-blue-300">
                  <Wallet className="w-5 h-5" />
                  <p className="font-medium">Leader Pays Mode</p>
                </div>
                <p className="text-sm text-blue-200/80 mt-1">
                  You paid ₹{totalLeaderAmount} (₹{entryFeeAmount} × {teamSize}) for the entire team. Members join free with your team code.
                </p>
              </div>
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
                    {userTeam.id.substring(0, 8).toUpperCase()}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyTeamId} className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {isLeaderPays && !isFree 
                    ? "Members can join for free using this code since you've already paid for the team."
                    : "Teammates can join using this code in the 'Join with Team Code' section."}
                </p>
              </div>
            )}

            {/* Team Members */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-300">Team Members ({teamMembers.length}/{teamSize})</p>
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                    {member.role === 'captain' ? (
                      <Crown className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <Users className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {member.profile?.display_name || member.profile?.username || 'Unknown'}
                    </p>
                    {member.profile?.game_id && (
                      <p className="text-sm text-gray-400">Game ID: {member.profile.game_id}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === 'captain' ? 'default' : 'outline'}>
                      {member.role === 'captain' ? 'Captain' : 'Member'}
                    </Badge>
                    {/* Remove button for captain to remove members (not self) */}
                    {isCaptain && member.role !== 'captain' && tournament.status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(member.id, member.user_id)}
                        disabled={isLoading}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

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
                    <div className="p-4 bg-black/20 rounded-lg border border-green-500/20">
                      <p className="text-sm font-bold text-green-200 mb-2">Room ID</p>
                      <p className="font-mono text-xl text-white font-bold">{roomDetails.room_id}</p>
                    </div>
                  )}
                  {roomDetails.room_password && (
                    <div className="p-4 bg-black/20 rounded-lg border border-emerald-500/20">
                      <p className="text-sm font-bold text-emerald-200 mb-2">Password</p>
                      <p className="font-mono text-xl text-white font-bold">{roomDetails.room_password}</p>
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
            {isLeaderPays && !isFree && (
              <p className="text-sm text-blue-300 mt-1 flex items-center gap-1">
                <Wallet className="w-4 h-4" />
                Leader pays ₹{totalLeaderAmount} (₹{entryFeeAmount} × {teamSize}) for entire team. Members join free.
              </p>
            )}
          </div>

          {/* Create Team Section */}
          <div className="p-4 bg-black/20 rounded-lg border border-purple-500/20 space-y-3">
            <div className="flex items-center gap-2 text-white font-medium">
              <Crown className="w-5 h-5 text-yellow-400" />
              Create Your Team 
              {!isFree && (
                <span className="text-sm text-purple-300">
                  {isLeaderPays ? `(₹${totalLeaderAmount} from wallet)` : `(₹${entryFeeAmount})`}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name..."
                className="bg-gray-700 border-gray-600 text-white"
              />
              <Button
                onClick={handleCreateTeam}
                disabled={isLoading || !teamName.trim()}
                className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
              >
                <Crown className="w-4 h-4 mr-2" />
                Create
              </Button>
            </div>
            {isLeaderPays && !isFree && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  Wallet Balance: <span className={walletBalance >= totalLeaderAmount ? 'text-green-400' : 'text-red-400'}>₹{walletBalance}</span>
                </span>
                {walletBalance < totalLeaderAmount && (
                  <Link to="/wallet" className="text-purple-400 hover:underline">
                    Add funds →
                  </Link>
                )}
              </div>
            )}
            <p className="text-xs text-gray-400">
              {isLeaderPays && !isFree
                ? "As captain, you'll pay for the entire team from your wallet and get a Team Code to share."
                : "As captain, you'll get a Team Code to share with your teammates."}
            </p>
          </div>

          {/* Join with Team Code Section */}
          <div className="p-4 bg-black/20 rounded-lg border border-green-500/20 space-y-3">
            <div className="flex items-center gap-2 text-white font-medium">
              <Hash className="w-5 h-5 text-green-400" />
              Join with Team Code
              {!isFree && !isLeaderPays && (
                <span className="text-sm text-green-300">(₹{entryFeeAmount})</span>
              )}
              {isLeaderPays && !isFree && (
                <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">FREE</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={joinTeamCode}
                onChange={(e) => setJoinTeamCode(e.target.value.toUpperCase())}
                placeholder="Enter team code..."
                className="bg-gray-700 border-gray-600 text-white uppercase tracking-wider"
                maxLength={8}
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
              {isLeaderPays && !isFree
                ? "Got a team code from your captain? Join for free — your leader has already paid!"
                : "Got a team code from your captain? Enter it here to join their team."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Available Teams to Join (only show in each_pays or free mode) */}
      {availableTeams.length > 0 && (!isLeaderPays || isFree) && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <UserPlus className="w-5 h-5" />
              Teams Looking for Members ({availableTeams.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {availableTeams.map((team) => (
                <div key={team.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                  <div>
                    <p className="font-medium text-white">{team.team_name}</p>
                    <p className="text-sm text-gray-400">
                      {team.current_members}/{team.max_members} members
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleJoinTeam(team.id)}
                    disabled={isLoading}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {isFree || isLeaderPays ? 'Join Free' : `Join (₹${entryFeeAmount})`}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
        entryFee={entryFeeAmount}
      />
    </div>
  );
};

export default TeamRegistration;
