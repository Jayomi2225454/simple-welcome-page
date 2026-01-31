import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Save, X, Trophy, Star, Award, Crown, Wallet, Users, History, Clock } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { PrizesContent } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PrizeDistributionAdminProps {
  tournamentId?: string;
}

interface TournamentWinner {
  id: string;
  tournament_id: string;
  user_id: string;
  player_name: string;
  position: number;
  prize_amount: string | null;
  created_at: string | null;
}

interface RegisteredPlayer {
  id: string;
  user_id: string;
  player_name: string;
  game_id: string;
  type: 'solo';
}

interface RegisteredTeam {
  id: string;
  team_name: string;
  captain_user_id: string;
  members: TeamMember[];
  type: 'team';
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  profile?: {
    username: string | null;
    display_name: string | null;
  };
}

type RegisteredParticipant = RegisteredPlayer | RegisteredTeam;

interface PrizeCreditLog {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  status: string;
  tournament_id: string | null;
  tournament_name: string | null;
  admin_notes: string | null;
  created_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
  };
}

const PrizeDistributionAdmin = ({ tournamentId }: PrizeDistributionAdminProps) => {
  const { tournaments, updateTournament } = useGameStore();
  const { toast } = useToast();
  
  const [selectedTournamentId, setSelectedTournamentId] = useState(tournamentId || '');
  const [editingPrize, setEditingPrize] = useState<number | null>(null);
  const [showAddPrize, setShowAddPrize] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const [editingReward, setEditingReward] = useState<number | null>(null);
  const [showAddWinner, setShowAddWinner] = useState(false);
  const [editingWinner, setEditingWinner] = useState<TournamentWinner | null>(null);
  const [winners, setWinners] = useState<TournamentWinner[]>([]);
  const [loadingWinners, setLoadingWinners] = useState(false);
  const [registeredParticipants, setRegisteredParticipants] = useState<RegisteredParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<string>('');
  const [prizeCreditLogs, setPrizeCreditLogs] = useState<PrizeCreditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [creditingPrize, setCreditingPrize] = useState(false);

  const [prizeForm, setPrizeForm] = useState({
    position: '',
    title: '',
    amount: '',
    description: '',
  });

  const [rewardForm, setRewardForm] = useState({
    title: '',
    description: '',
  });

  const [winnerForm, setWinnerForm] = useState({
    player_name: '',
    position: '',
    prize_amount: '',
    user_id: '',
  });

  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId);
  const prizesContent = selectedTournament?.prizes_content as PrizesContent | null;
  const currentPrizes: PrizesContent = {
    positions: prizesContent?.positions || [],
    additional_rewards: prizesContent?.additional_rewards || []
  };

  // Determine team mode
  const teamSize = typeof selectedTournament?.team_size === 'number' ? selectedTournament.team_size : parseInt(selectedTournament?.team_size || '1') || 1;
  const isTeamMode = teamSize > 1;

  // Fetch winners, participants, and logs when tournament changes
  useEffect(() => {
    if (selectedTournamentId) {
      fetchWinners();
      fetchRegisteredParticipants();
      fetchPrizeCreditLogs();
    } else {
      setWinners([]);
      setRegisteredParticipants([]);
      setPrizeCreditLogs([]);
    }
  }, [selectedTournamentId]);

  const fetchWinners = async () => {
    if (!selectedTournamentId) return;
    
    setLoadingWinners(true);
    try {
      const { data, error } = await supabase
        .from('tournament_winners')
        .select('*')
        .eq('tournament_id', selectedTournamentId)
        .order('position', { ascending: true });

      if (error) throw error;
      setWinners(data || []);
    } catch (error) {
      console.error('Error fetching winners:', error);
    } finally {
      setLoadingWinners(false);
    }
  };

  const fetchPrizeCreditLogs = async () => {
    if (!selectedTournamentId) return;
    
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select(`
          id,
          user_id,
          amount,
          transaction_type,
          status,
          tournament_id,
          tournament_name,
          admin_notes,
          created_at
        `)
        .eq('tournament_id', selectedTournamentId)
        .eq('transaction_type', 'prize')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for user names
      const userIds = [...new Set((data || []).map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name')
        .in('user_id', userIds);

      const logsWithProfiles = (data || []).map(log => ({
        ...log,
        profile: profiles?.find(p => p.user_id === log.user_id)
      }));

      setPrizeCreditLogs(logsWithProfiles);
    } catch (error) {
      console.error('Error fetching prize credit logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchRegisteredParticipants = async () => {
    if (!selectedTournamentId) return;
    
    setLoadingParticipants(true);
    try {
      if (isTeamMode) {
        // Fetch teams with members
        const { data: teams, error: teamsError } = await supabase
          .from('tournament_teams')
          .select(`
            id,
            team_name,
            captain_user_id,
            tournament_team_members (
              id,
              user_id,
              role
            )
          `)
          .eq('tournament_id', selectedTournamentId);

        if (teamsError) throw teamsError;

        const formattedTeams: RegisteredTeam[] = (teams || []).map(team => ({
          id: team.id,
          team_name: team.team_name,
          captain_user_id: team.captain_user_id,
          members: team.tournament_team_members || [],
          type: 'team' as const
        }));

        setRegisteredParticipants(formattedTeams);
      } else {
        // Fetch solo registrations
        const { data: registrations, error: regError } = await supabase
          .from('tournament_registrations')
          .select('id, user_id, player_name, game_id')
          .eq('tournament_id', selectedTournamentId);

        if (regError) throw regError;

        const formattedPlayers: RegisteredPlayer[] = (registrations || []).map(reg => ({
          id: reg.id,
          user_id: reg.user_id,
          player_name: reg.player_name,
          game_id: reg.game_id,
          type: 'solo' as const
        }));

        setRegisteredParticipants(formattedPlayers);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // Initialize empty prizes_content if it doesn't exist
  useEffect(() => {
    if (selectedTournament && !selectedTournament.prizes_content) {
      updateTournament(selectedTournamentId, {
        prizes_content: { positions: [], additional_rewards: [] }
      });
    }
  }, [selectedTournament, selectedTournamentId, updateTournament]);

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return "from-yellow-400 to-yellow-600";
      case 2: return "from-gray-300 to-gray-500";
      case 3: return "from-orange-400 to-orange-600";
      default: return "from-purple-400 to-purple-600";
    }
  };

  const resetPrizeForm = () => {
    setPrizeForm({
      position: '',
      title: '',
      amount: '',
      description: '',
    });
    setEditingPrize(null);
    setShowAddPrize(false);
  };

  const resetRewardForm = () => {
    setRewardForm({
      title: '',
      description: '',
    });
    setEditingReward(null);
    setShowAddReward(false);
  };

  const resetWinnerForm = () => {
    setWinnerForm({
      player_name: '',
      position: '',
      prize_amount: '',
      user_id: '',
    });
    setEditingWinner(null);
    setShowAddWinner(false);
    setSelectedParticipant('');
  };

  // Parse prize amount string to number (e.g., "₹5000" -> 5000)
  const parsePrizeAmount = (amount: string): number => {
    const numericString = amount.replace(/[^0-9.]/g, '');
    return parseFloat(numericString) || 0;
  };

  // Credit prize to user's wallet
  const creditPrizeToWallet = async (userId: string, amount: number, playerName: string) => {
    try {
      // Create a wallet transaction for the prize
      const { error } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          amount: amount,
          transaction_type: 'prize',
          status: 'approved',
          tournament_id: selectedTournamentId,
          tournament_name: selectedTournament?.name || 'Tournament Prize',
          payment_method: 'tournament_prize',
          transaction_reference: `PRIZE-${selectedTournamentId}-${Date.now()}`,
          admin_notes: `Prize credited for ${playerName} - Position in ${selectedTournament?.name}`
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error crediting prize to wallet:', error);
      return false;
    }
  };

  // Handle participant selection
  const handleParticipantSelect = (participantId: string) => {
    setSelectedParticipant(participantId);
    
    const participant = registeredParticipants.find(p => p.id === participantId);
    if (!participant) return;

    if (participant.type === 'solo') {
      setWinnerForm({
        ...winnerForm,
        player_name: participant.player_name,
        user_id: participant.user_id,
      });
    } else {
      setWinnerForm({
        ...winnerForm,
        player_name: participant.team_name,
        user_id: participant.captain_user_id,
      });
    }
  };

  const handleSaveWinner = async () => {
    try {
      if (!selectedTournamentId) {
        toast({
          title: "Error",
          description: "Please select a tournament first.",
          variant: "destructive",
        });
        return;
      }

      if (!winnerForm.player_name || !winnerForm.position) {
        toast({
          title: "Validation Error",
          description: "Player/Team name and position are required.",
          variant: "destructive",
        });
        return;
      }

      setCreditingPrize(true);

      // Generate a valid UUID for manual entries if user_id is not provided
      const isValidUUID = (str: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };
      
      const userId = winnerForm.user_id && isValidUUID(winnerForm.user_id) 
        ? winnerForm.user_id 
        : crypto.randomUUID();

      const winnerData = {
        tournament_id: selectedTournamentId,
        player_name: winnerForm.player_name,
        position: parseInt(winnerForm.position),
        prize_amount: winnerForm.prize_amount || null,
        user_id: userId,
      };

      // Credit prize to wallets
      const prizeAmount = parsePrizeAmount(winnerForm.prize_amount);
      
      if (prizeAmount > 0 && selectedParticipant) {
        const participant = registeredParticipants.find(p => p.id === selectedParticipant);
        
        if (participant) {
          if (participant.type === 'team') {
            // Credit to all team members
            const prizePerMember = prizeAmount / participant.members.length;
            
            for (const member of participant.members) {
              await creditPrizeToWallet(
                member.user_id, 
                prizePerMember, 
                `${participant.team_name} - Team Member`
              );
            }
            
            toast({
              title: "Prize Credited",
              description: `₹${prizePerMember.toFixed(2)} credited to each of ${participant.members.length} team members.`,
            });
          } else {
            // Credit to solo player
            await creditPrizeToWallet(participant.user_id, prizeAmount, participant.player_name);
            
            toast({
              title: "Prize Credited",
              description: `₹${prizeAmount} credited to ${participant.player_name}'s wallet.`,
            });
          }
        }
      }

      if (editingWinner) {
        const { error } = await supabase
          .from('tournament_winners')
          .update(winnerData)
          .eq('id', editingWinner.id);

        if (error) throw error;

        toast({
          title: "Winner Updated",
          description: "Winner information has been updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('tournament_winners')
          .insert(winnerData);

        if (error) throw error;

        toast({
          title: "Winner Added",
          description: "New winner has been added and prize credited successfully.",
        });
      }

      resetWinnerForm();
      fetchWinners();
      fetchPrizeCreditLogs(); // Refresh the logs after crediting prize
    } catch (error) {
      console.error('Error saving winner:', error);
      toast({
        title: "Error",
        description: "Failed to save winner. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreditingPrize(false);
    }
  };

  const handleSavePrize = async () => {
    try {
      if (!selectedTournamentId) {
        toast({
          title: "Error",
          description: "Please select a tournament first.",
          variant: "destructive",
        });
        return;
      }

      if (!prizeForm.position || !prizeForm.title || !prizeForm.amount) {
        toast({
          title: "Validation Error",
          description: "Position, title, and amount are required.",
          variant: "destructive",
        });
        return;
      }

      const newPrize = {
        position: parseInt(prizeForm.position),
        title: prizeForm.title,
        amount: prizeForm.amount,
        description: prizeForm.description,
        color: getPositionColor(parseInt(prizeForm.position)),
      };

      let updatedPositions = [...(currentPrizes.positions || [])];

      if (editingPrize !== null) {
        updatedPositions[editingPrize] = newPrize;
      } else {
        updatedPositions.push(newPrize);
      }

      updatedPositions.sort((a, b) => a.position - b.position);

      const updatedPrizesContent: PrizesContent = {
        ...currentPrizes,
        positions: updatedPositions,
      };

      await updateTournament(selectedTournamentId, {
        prizes_content: updatedPrizesContent,
      });

      toast({
        title: "Prize Updated",
        description: "Prize information has been updated successfully.",
      });

      resetPrizeForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update prize. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveReward = async () => {
    try {
      if (!selectedTournamentId) {
        toast({
          title: "Error",
          description: "Please select a tournament first.",
          variant: "destructive",
        });
        return;
      }

      if (!rewardForm.title || !rewardForm.description) {
        toast({
          title: "Validation Error",
          description: "Title and description are required.",
          variant: "destructive",
        });
        return;
      }

      const newReward = {
        title: rewardForm.title,
        description: rewardForm.description,
      };

      let updatedRewards = [...(currentPrizes.additional_rewards || [])];

      if (editingReward !== null) {
        updatedRewards[editingReward] = newReward;
      } else {
        updatedRewards.push(newReward);
      }

      const updatedPrizesContent: PrizesContent = {
        ...currentPrizes,
        additional_rewards: updatedRewards,
      };

      await updateTournament(selectedTournamentId, {
        prizes_content: updatedPrizesContent,
      });

      toast({
        title: "Reward Updated",
        description: "Additional reward has been updated successfully.",
      });

      resetRewardForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update reward. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditPrize = (index: number) => {
    const prize = currentPrizes.positions[index];
    setPrizeForm({
      position: prize.position.toString(),
      title: prize.title,
      amount: prize.amount,
      description: prize.description || '',
    });
    setEditingPrize(index);
    setShowAddPrize(true);
  };

  const handleEditReward = (index: number) => {
    const reward = currentPrizes.additional_rewards[index];
    setRewardForm({
      title: reward.title,
      description: reward.description,
    });
    setEditingReward(index);
    setShowAddReward(true);
  };

  const handleEditWinner = (winner: TournamentWinner) => {
    setWinnerForm({
      player_name: winner.player_name,
      position: winner.position.toString(),
      prize_amount: winner.prize_amount || '',
      user_id: winner.user_id,
    });
    setEditingWinner(winner);
    setShowAddWinner(true);
  };

  const handleDeletePrize = async (index: number) => {
    try {
      if (!selectedTournamentId) return;

      const updatedPositions = currentPrizes.positions.filter((_, i) => i !== index);
      const updatedPrizesContent: PrizesContent = {
        ...currentPrizes,
        positions: updatedPositions,
      };

      await updateTournament(selectedTournamentId, {
        prizes_content: updatedPrizesContent,
      });

      toast({
        title: "Prize Deleted",
        description: "Prize has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete prize. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReward = async (index: number) => {
    try {
      if (!selectedTournamentId) return;

      const updatedRewards = currentPrizes.additional_rewards.filter((_, i) => i !== index);
      const updatedPrizesContent: PrizesContent = {
        ...currentPrizes,
        additional_rewards: updatedRewards,
      };

      await updateTournament(selectedTournamentId, {
        prizes_content: updatedPrizesContent,
      });

      toast({
        title: "Reward Deleted",
        description: "Additional reward has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete reward. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWinner = async (winnerId: string) => {
    try {
      const { error } = await supabase
        .from('tournament_winners')
        .delete()
        .eq('id', winnerId);

      if (error) throw error;

      toast({
        title: "Winner Deleted",
        description: "Winner has been removed successfully.",
      });

      fetchWinners();
    } catch (error) {
      console.error('Error deleting winner:', error);
      toast({
        title: "Error",
        description: "Failed to delete winner. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getPositionBadge = (position: number) => {
    switch (position) {
      case 1:
        return <span className="bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold">🥇 1st</span>;
      case 2:
        return <span className="bg-gray-400 text-black px-2 py-1 rounded-full text-xs font-bold">🥈 2nd</span>;
      case 3:
        return <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">🥉 3rd</span>;
      default:
        return <span className="bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-bold">#{position}</span>;
    }
  };

  const getTeamModeLabel = () => {
    const size = typeof selectedTournament?.team_size === 'number' ? selectedTournament.team_size : parseInt(selectedTournament?.team_size || '1') || 1;
    if (size === 1) return 'Solo';
    if (size === 2) return 'Duo';
    if (size === 4) return 'Squad';
    return `Team (${size} players)`;
  };

  return (
    <div className="space-y-6">
      {/* Tournament Selection */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Select Tournament</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedTournamentId || "none"}
            onChange={(e) => setSelectedTournamentId(e.target.value === "none" ? "" : e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 text-white rounded"
          >
            <option value="none">Select a tournament</option>
            {tournaments.map((tournament) => {
              const tSize = typeof tournament.team_size === 'number' ? tournament.team_size : parseInt(tournament.team_size || '1') || 1;
              return (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name} ({tournament.status}) - {tSize === 1 ? 'Solo' : tSize === 2 ? 'Duo' : `Squad (${tSize})`}
                </option>
              );
            })}
          </select>
        </CardContent>
      </Card>

      {selectedTournamentId && (
        <>
          {/* Tournament Info */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-400">Mode:</span>
                  <span className="text-white font-medium">{getTeamModeLabel()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-400">Registered:</span>
                  <span className="text-white font-medium">{registeredParticipants.length} {isTeamMode ? 'teams' : 'players'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tournament Winners Section */}
          <Card className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-yellow-500/30">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white flex items-center">
                  <Crown className="w-5 h-5 mr-2 text-yellow-400" />
                  Tournament Winners
                  {selectedTournament?.status === 'completed' && (
                    <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded">Completed</span>
                  )}
                </CardTitle>
                <Button onClick={() => setShowAddWinner(true)} className="bg-yellow-600 hover:bg-yellow-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Winner
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-blue-200 font-medium">Auto Prize Credit</p>
                    <p className="text-gray-400 text-sm">
                      When you select a winner from registered {isTeamMode ? 'teams' : 'players'} and enter a prize amount, 
                      the prize will be automatically credited to their wallet{isTeamMode ? ' (split equally among team members)' : ''}.
                    </p>
                  </div>
                </div>
              </div>

              {(showAddWinner || editingWinner) && (
                <div className="mb-6 p-4 bg-gray-700 rounded">
                  <h4 className="text-white font-medium mb-3">
                    {editingWinner ? 'Edit Winner' : 'Add New Winner'}
                  </h4>
                  
                  {/* Select from registered participants */}
                  <div className="mb-4">
                    <label className="block text-sm text-gray-300 mb-2">
                      Select from registered {isTeamMode ? 'teams' : 'players'}
                    </label>
                    <Select value={selectedParticipant} onValueChange={handleParticipantSelect}>
                      <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
                        <SelectValue placeholder={`Select a ${isTeamMode ? 'team' : 'player'}...`} />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {loadingParticipants ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : registeredParticipants.length === 0 ? (
                          <SelectItem value="empty" disabled>No {isTeamMode ? 'teams' : 'players'} registered</SelectItem>
                        ) : (
                          registeredParticipants.map((participant) => (
                            <SelectItem key={participant.id} value={participant.id} className="text-white">
                              {participant.type === 'team' 
                                ? `${participant.team_name} (${participant.members.length} members)`
                                : `${participant.player_name} (${participant.game_id})`
                              }
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        {isTeamMode ? 'Team' : 'Player'} Name
                      </label>
                      <Input
                        placeholder={isTeamMode ? 'Team Name' : 'Player Name'}
                        value={winnerForm.player_name}
                        onChange={(e) => setWinnerForm({...winnerForm, player_name: e.target.value})}
                        className="bg-gray-600 border-gray-500 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Position</label>
                      <Input
                        placeholder="Position (1, 2, 3...)"
                        type="number"
                        min="1"
                        value={winnerForm.position}
                        onChange={(e) => setWinnerForm({...winnerForm, position: e.target.value})}
                        className="bg-gray-600 border-gray-500 text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm text-gray-300 mb-2">
                      Prize Amount (will be credited to wallet{isTeamMode ? ' - split among members' : ''})
                    </label>
                    <Input
                      placeholder="Prize Amount (e.g., ₹5000)"
                      value={winnerForm.prize_amount}
                      onChange={(e) => setWinnerForm({...winnerForm, prize_amount: e.target.value})}
                      className="bg-gray-600 border-gray-500 text-white"
                    />
                    {isTeamMode && selectedParticipant && winnerForm.prize_amount && (
                      <p className="text-sm text-green-400 mt-2">
                        Each team member will receive: ₹{(parsePrizeAmount(winnerForm.prize_amount) / 
                          ((registeredParticipants.find(p => p.id === selectedParticipant) as RegisteredTeam)?.members.length || 1)).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleSaveWinner} 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={creditingPrize}
                    >
                      {creditingPrize ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save & Credit Prize
                        </>
                      )}
                    </Button>
                    <Button onClick={resetWinnerForm} variant="outline" className="border-gray-500 text-gray-300">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {loadingWinners ? (
                  <div className="text-center text-gray-400 py-4">Loading winners...</div>
                ) : winners.length === 0 ? (
                  <div className="text-center text-gray-400 py-4">
                    No winners added yet. Add winners after the tournament ends.
                  </div>
                ) : (
                  winners.map((winner) => (
                    <div key={winner.id} className="flex items-center justify-between p-4 bg-gray-700 rounded">
                      <div className="flex items-center space-x-4">
                        {getPositionBadge(winner.position)}
                        <div>
                          <div className="text-white font-medium">{winner.player_name}</div>
                          {winner.prize_amount && (
                            <div className="text-yellow-400 font-bold">{winner.prize_amount}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => handleEditWinner(winner)} className="bg-blue-600 hover:bg-blue-700">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteWinner(winner.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prize Credit History Log */}
          <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <History className="w-5 h-5 mr-2 text-green-400" />
                Prize Credit History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loadingLogs ? (
                  <div className="text-center text-gray-400 py-4">Loading prize credit history...</div>
                ) : prizeCreditLogs.length === 0 ? (
                  <div className="text-center text-gray-400 py-4">
                    No prize credits recorded yet for this tournament.
                  </div>
                ) : (
                  prizeCreditLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded border border-green-500/20">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {log.profile?.display_name || log.profile?.username || 'Unknown User'}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {log.admin_notes || 'Prize credited'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold text-lg">+₹{log.amount.toFixed(2)}</div>
                        <div className="flex items-center text-gray-400 text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(log.created_at).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          log.status === 'approved' ? 'bg-green-500/20 text-green-400' : 
                          log.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prize Positions */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white flex items-center">
                  <Trophy className="w-5 h-5 mr-2" />
                  Prize Positions
                </CardTitle>
                <Button onClick={() => setShowAddPrize(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Prize
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(showAddPrize || editingPrize !== null) && (
                <div className="mb-6 p-4 bg-gray-700 rounded">
                  <h4 className="text-white font-medium mb-3">
                    {editingPrize !== null ? 'Edit Prize' : 'Add New Prize'}
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <Input
                      placeholder="Position (1, 2, 3...)"
                      value={prizeForm.position}
                      onChange={(e) => setPrizeForm({...prizeForm, position: e.target.value})}
                      className="bg-gray-600 border-gray-500 text-white"
                    />
                    <Input
                      placeholder="Title (e.g., 1st Place)"
                      value={prizeForm.title}
                      onChange={(e) => setPrizeForm({...prizeForm, title: e.target.value})}
                      className="bg-gray-600 border-gray-500 text-white"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <Input
                      placeholder="Amount (e.g., ₹5000)"
                      value={prizeForm.amount}
                      onChange={(e) => setPrizeForm({...prizeForm, amount: e.target.value})}
                      className="bg-gray-600 border-gray-500 text-white"
                    />
                    <Input
                      placeholder="Description"
                      value={prizeForm.description}
                      onChange={(e) => setPrizeForm({...prizeForm, description: e.target.value})}
                      className="bg-gray-600 border-gray-500 text-white"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleSavePrize} className="bg-green-600 hover:bg-green-700">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={resetPrizeForm} variant="outline" className="border-gray-500 text-gray-300">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {currentPrizes.positions.length === 0 ? (
                  <div className="text-center text-gray-400 py-4">
                    No prizes defined yet. Add your first prize!
                  </div>
                ) : (
                  currentPrizes.positions.map((prize, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-700 rounded">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold">
                          {prize.position}
                        </div>
                        <div>
                          <div className="text-white font-medium">{prize.title}</div>
                          <div className="text-yellow-400 font-bold">{prize.amount}</div>
                          {prize.description && (
                            <div className="text-gray-400 text-sm">{prize.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => handleEditPrize(index)} className="bg-blue-600 hover:bg-blue-700">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeletePrize(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Rewards */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  Additional Rewards
                </CardTitle>
                <Button onClick={() => setShowAddReward(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Reward
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(showAddReward || editingReward !== null) && (
                <div className="mb-6 p-4 bg-gray-700 rounded">
                  <h4 className="text-white font-medium mb-3">
                    {editingReward !== null ? 'Edit Reward' : 'Add New Reward'}
                  </h4>
                  <div className="space-y-4">
                    <Input
                      placeholder="Reward title"
                      value={rewardForm.title}
                      onChange={(e) => setRewardForm({...rewardForm, title: e.target.value})}
                      className="bg-gray-600 border-gray-500 text-white"
                    />
                    <Textarea
                      placeholder="Reward description"
                      value={rewardForm.description}
                      onChange={(e) => setRewardForm({...rewardForm, description: e.target.value})}
                      className="bg-gray-600 border-gray-500 text-white"
                    />
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Button onClick={handleSaveReward} className="bg-green-600 hover:bg-green-700">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={resetRewardForm} variant="outline" className="border-gray-500 text-gray-300">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {currentPrizes.additional_rewards.length === 0 ? (
                  <div className="text-center text-gray-400 py-4">
                    No additional rewards defined yet.
                  </div>
                ) : (
                  currentPrizes.additional_rewards.map((reward, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-700 rounded">
                      <div className="flex items-center space-x-4">
                        <Award className="w-6 h-6 text-purple-400" />
                        <div>
                          <div className="text-white font-medium">{reward.title}</div>
                          <div className="text-gray-400 text-sm">{reward.description}</div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => handleEditReward(index)} className="bg-blue-600 hover:bg-blue-700">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteReward(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default PrizeDistributionAdmin;
