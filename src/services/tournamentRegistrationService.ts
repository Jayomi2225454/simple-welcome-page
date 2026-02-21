import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface TournamentRegistration {
  id: string;
  user_id: string;
  tournament_id: string;
  player_name: string;
  game_id: string;
  status: string | null;
  payment_status: string | null;
  payment_amount: number | null;
  payment_screenshot_url: string | null;
  custom_fields_data: Json | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TournamentRegistrationInput {
  tournament_id: string;
  player_name: string;
  game_id: string;
  payment_amount?: number;
  payment_screenshot_url?: string;
  custom_fields_data?: Record<string, string>;
}

export interface TournamentRoom {
  id: string;
  tournament_id: string;
  room_id?: string;
  room_password?: string;
  created_at: string;
  updated_at: string;
}

export const tournamentRegistrationService = {
  async registerForTournament(registration: TournamentRegistrationInput): Promise<TournamentRegistration> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const isPaid = registration.payment_amount && registration.payment_amount > 0;

    const { data, error } = await supabase
      .from('tournament_registrations')
      .insert([{
        tournament_id: registration.tournament_id,
        player_name: registration.player_name,
        game_id: registration.game_id,
        payment_amount: registration.payment_amount,
        payment_screenshot_url: registration.payment_screenshot_url,
        custom_fields_data: registration.custom_fields_data as unknown as Json,
        user_id: user.id,
        payment_status: isPaid ? 'pending' : 'completed',
        status: isPaid ? 'registered' : 'confirmed'
      }])
      .select()
      .single();

    if (error) throw error;
    return data as TournamentRegistration;
  },

  async registerForTournamentWithWallet(registration: TournamentRegistrationInput): Promise<TournamentRegistration> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('tournament_registrations')
      .insert([{
        tournament_id: registration.tournament_id,
        player_name: registration.player_name,
        game_id: registration.game_id,
        payment_amount: registration.payment_amount,
        payment_screenshot_url: null,
        custom_fields_data: registration.custom_fields_data as unknown as Json,
        user_id: user.id,
        payment_status: 'completed',
        status: 'confirmed'
      }])
      .select()
      .single();

    if (error) throw error;
    return data as TournamentRegistration;
  },

  async getUserRegistrations(userId: string): Promise<TournamentRegistration[]> {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as TournamentRegistration[];
  },

  async getTournamentRegistrations(tournamentId: string): Promise<TournamentRegistration[]> {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as TournamentRegistration[];
  },

  async checkUserRegistration(userId: string, tournamentId: string): Promise<TournamentRegistration | null> {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select('*')
      .eq('user_id', userId)
      .eq('tournament_id', tournamentId)
      .maybeSingle();

    if (error) throw error;
    return data as TournamentRegistration | null;
  },

  async updatePaymentStatus(registrationId: string, status: 'completed' | 'failed' | 'pending' | 'rejected'): Promise<void> {
    const updateData: { payment_status: string; status?: string } = { 
      payment_status: status 
    };
    
    // Use valid status values per check constraint: 'registered', 'confirmed', 'disqualified'
    if (status === 'completed') {
      updateData.status = 'confirmed';
    } else if (status === 'rejected' || status === 'pending') {
      updateData.status = 'registered';
    }

    const { error } = await supabase
      .from('tournament_registrations')
      .update(updateData)
      .eq('id', registrationId);

    if (error) throw error;
  },

  async updatePaymentScreenshot(registrationId: string, screenshotUrl: string): Promise<void> {
    const { error } = await supabase
      .from('tournament_registrations')
      .update({ 
        payment_screenshot_url: screenshotUrl,
        payment_status: 'pending',
        status: 'registered'
      })
      .eq('id', registrationId);

    if (error) throw error;
  },

  async getTournamentRoom(tournamentId: string): Promise<TournamentRoom | null> {
    const { data, error } = await supabase
      .from('tournament_rooms')
      .select('*')
      .eq('tournament_id', tournamentId)
      .maybeSingle();

    if (error) throw error;
    return data as TournamentRoom | null;
  },

  async upsertTournamentRoom(tournamentId: string, roomData: Partial<Pick<TournamentRoom, 'room_id' | 'room_password'>>): Promise<TournamentRoom> {
    const { data, error } = await supabase
      .from('tournament_rooms')
      .upsert({
        tournament_id: tournamentId,
        ...roomData
      }, {
        onConflict: 'tournament_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data as TournamentRoom;
  }
};