import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { tournamentRegistrationService, TournamentRegistration, TournamentRoom } from '@/services/tournamentRegistrationService';
import { supabase } from '@/integrations/supabase/client';
import { Tournament } from '@/types';
import { Users, Lock, CheckCircle, Clock, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import RegistrationFormDialog from './RegistrationFormDialog';
import PaymentRetryDialog from './PaymentRetryDialog';
import TournamentTimer from './TournamentTimer';
import TeamRegistration from './TeamRegistration';
import { Link } from 'react-router-dom';

interface TournamentRegistrationProps {
  tournament: Tournament;
}

const TournamentRegistrationComponent: React.FC<TournamentRegistrationProps> = ({ tournament }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [userRegistration, setUserRegistration] = useState<TournamentRegistration | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [roomDetails, setRoomDetails] = useState<TournamentRoom | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [showPaymentRetryDialog, setShowPaymentRetryDialog] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const isFree = !tournament.entry_fee || tournament.entry_fee === 'Free' || tournament.entry_fee === '0' || tournament.entry_fee === '₹0';
  const entryFeeAmount = isFree ? 0 : parseInt(tournament.entry_fee?.replace(/[^0-9]/g, '') || '0');
  
  // Determine team size - default to 1 (solo) if not set
  const teamSize = typeof tournament.team_size === 'number' 
    ? tournament.team_size 
    : parseInt(tournament.team_size || '1') || 1;
  
  const isTeamMode = teamSize > 1;

  useEffect(() => {
    if (user) {
      loadUserData();
      loadRegistrations();
    }
  }, [user, tournament.id]);

  // Real-time subscription for room and registration updates
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

    // Subscribe to real-time room updates
    const roomChannel = supabase
      .channel(`room-updates-${tournament.id}-${user.id}`)
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

    // Subscribe to registration status updates
    const regChannel = supabase
      .channel(`reg-updates-${tournament.id}-${user.id}`)
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
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(regChannel);
    };
  }, [user, tournament.id]);

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

      if (registration && registration.payment_status === 'completed') {
        const room = await tournamentRegistrationService.getTournamentRoom(tournament.id);
        setRoomDetails(room);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadRegistrations = async () => {
    try {
      const regs = await tournamentRegistrationService.getTournamentRegistrations(tournament.id);
      setRegistrations(regs);
    } catch (error) {
      console.error('Error loading registrations:', error);
    }
  };

  const handleRegister = async () => {
    if (!user || !userProfile) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile first.",
        variant: "destructive"
      });
      return;
    }

    setShowRegistrationDialog(true);
  };

  const handleRegistrationSubmit = async (data: { gameId: string; customFields: Record<string, string>; screenshotUrl?: string; paidViaWallet?: boolean }) => {
    setIsLoading(true);
    setShowRegistrationDialog(false);

    try {
      // If paying via wallet, deduct balance first
      if (!isFree && data.paidViaWallet && user) {
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
        player_name: userProfile.display_name || userProfile.username || user?.email || 'Unknown Player',
        game_id: data.gameId,
        payment_amount: entryFeeAmount,
        payment_screenshot_url: data.screenshotUrl,
        custom_fields_data: data.customFields
      };

      // If paid via wallet, mark as completed directly
      const registration = data.paidViaWallet
        ? await tournamentRegistrationService.registerForTournamentWithWallet(registrationData)
        : await tournamentRegistrationService.registerForTournament(registrationData);
      
      setUserRegistration(registration);
      
      toast({
        title: "Registration Submitted!",
        description: data.paidViaWallet
          ? `₹${entryFeeAmount} deducted from wallet. You're registered!`
          : isFree 
            ? "You've been registered for the tournament." 
            : "Your registration is pending payment verification by admin.",
      });
      
      loadRegistrations();
      loadUserData();

    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register for tournament",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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

  const getRegistrationStatus = () => {
    if (!userRegistration) return null;
    
    switch (userRegistration.payment_status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Registered
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            Payment Pending Approval
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Payment Rejected
          </Badge>
        );
      case 'failed':
        return <Badge variant="destructive">Payment Failed</Badge>;
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

  if (isTeamMode) {
    return (
      <div className="space-y-6">
        {tournament.timer_duration && tournament.timer_duration > 0 && (
          <TournamentTimer tournament={tournament} />
        )}
        <TeamRegistration tournament={tournament} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tournament.timer_duration && tournament.timer_duration > 0 && (
        <TournamentTimer tournament={tournament} />
      )}

      {/* Registration Status Card */}
      <Card className="bg-gradient-to-br from-purple-900/40 via-blue-900/30 to-indigo-900/40 border-purple-500/30 backdrop-blur-sm shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-3 text-white text-xl drop-shadow-lg">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 text-white drop-shadow-sm" />
            </div>
            Tournament Registration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
          <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-purple-500/20">
            <div className="space-y-1">
              <p className="font-bold text-white text-lg drop-shadow-sm">Entry Fee: {tournament.entry_fee || 'Free'}</p>
              <p className="text-sm text-purple-200 font-medium">
                {registrations.length} / {tournament.max_participants} participants
              </p>
            </div>
            {getRegistrationStatus()}
          </div>

          {/* Payment Pending Message */}
          {userRegistration?.payment_status === 'pending' && (
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
          {userRegistration?.payment_status === 'rejected' && (
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

          {/* Register Button - Show only if not registered */}
          {!userRegistration && (
            <Button 
              onClick={handleRegister} 
              disabled={isLoading || registrations.length >= tournament.max_participants}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-bold py-3 text-lg shadow-xl"
            >
              {isLoading ? 'Processing...' : 
               registrations.length >= tournament.max_participants ? 'Tournament Full' :
               isFree ? 'Register Now' : `Register (₹${entryFeeAmount})`}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Room Details Card - Only for approved registrations */}
      {userRegistration?.payment_status === 'completed' && (
        <Card className="bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-teal-900/40 border-green-500/30 backdrop-blur-sm shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-3 text-white text-xl drop-shadow-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <Lock className="w-5 h-5 text-white drop-shadow-sm" />
              </div>
              Room Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            {roomDetails && (roomDetails.room_id || roomDetails.room_password) ? (
              <>
                {roomDetails.room_id && (
                  <div className="p-4 bg-black/20 rounded-lg border border-green-500/20">
                    <p className="text-sm font-bold text-green-200 mb-2">Room ID</p>
                    <p className="font-mono text-xl text-white font-bold drop-shadow-sm">{roomDetails.room_id}</p>
                  </div>
                )}
                {roomDetails.room_password && (
                  <div className="p-4 bg-black/20 rounded-lg border border-emerald-500/20">
                    <p className="text-sm font-bold text-emerald-200 mb-2">Password</p>
                    <p className="font-mono text-xl text-white font-bold drop-shadow-sm">{roomDetails.room_password}</p>
                  </div>
                )}
                <div className="p-3 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                  <p className="text-sm text-yellow-200 font-medium drop-shadow-sm">
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

      {/* Registered Players Card */}
      {registrations.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5" />
              Registered Players ({registrations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {registrations.map((reg, index) => (
                <div key={reg.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-white">{reg.player_name}</p>
                      <p className="text-sm text-gray-400">Game ID: {reg.game_id}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                    Confirmed
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registration Form Dialog */}
      <RegistrationFormDialog
        open={showRegistrationDialog}
        onOpenChange={setShowRegistrationDialog}
        onSubmit={handleRegistrationSubmit}
        isLoading={isLoading}
        tournamentId={tournament.id}
        isPaid={!isFree}
        entryFee={entryFeeAmount}
      />

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
};

export default TournamentRegistrationComponent;