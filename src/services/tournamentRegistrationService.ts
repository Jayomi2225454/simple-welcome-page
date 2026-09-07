import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { isNewTournamentWithCap } from '@/types';

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
  /**
   * Checks if registration is permitted for the tournament.
   * On new tournaments with a max_participants limit, throws an error if slots are full,
   * and automatically updates tournament status to 'closed'.
   */
  async assertCanRegister(tournamentId: string, userId: string): Promise<void> {
    const { data: tourney, error } = await supabase
      .from('tournaments')
      .select('id, name, max_participants, current_participants, status, created_at, overview_content')
      .eq('id', tournamentId)
      .single();

    if (error || !tourney) return;

    // Updating an existing registration is always permitted
    const existing = await this.checkUserRegistration(userId, tournamentId);
    if (existing) return;

    // Only apply hard cap checks strictly to new tournaments (leaves legacy records untouched)
    if (!isNewTournamentWithCap(tourney)) return;

    const maxParticipants = tourney.max_participants;
    if (!maxParticipants || maxParticipants <= 0) return;

    const currentStatus = (tourney.status || '').toLowerCase();
    if (currentStatus === 'closed' || currentStatus === 'full') {
      throw new Error(`Registration Full / Closed: This tournament has reached its maximum limit of ${maxParticipants} participants.`);
    }

    // Get live registered count from tournament_registrations (excluding rejected payments)
    const { count } = await supabase
      .from('tournament_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .neq('payment_status', 'rejected');

    const liveCount = Math.max(tourney.current_participants || 0, count || 0);

    if (liveCount >= maxParticipants) {
      // Auto-lock tournament status to closed immediately
      await supabase
        .from('tournaments')
        .update({ status: 'closed', current_participants: liveCount })
        .eq('id', tournamentId);

      throw new Error(`Registration Full / Closed: This tournament has reached its maximum limit of ${maxParticipants} participants.`);
    }
  },

  /**
   * After a successful registration, updates tournament participant count and auto-locks status if cap reached.
   */
  async syncTournamentParticipantCount(tournamentId: string): Promise<void> {
    try {
      const { data: tourney } = await supabase
        .from('tournaments')
        .select('id, max_participants, current_participants, status, created_at, overview_content')
        .eq('id', tournamentId)
        .single();

      if (!tourney) return;

      const { count } = await supabase
        .from('tournament_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .neq('payment_status', 'rejected');

      const newCount = count || 0;
      const maxParticipants = tourney.max_participants;
      const isCapEnforced = isNewTournamentWithCap(tourney);
      const shouldClose = isCapEnforced && maxParticipants && maxParticipants > 0 && newCount >= maxParticipants;

      await supabase
        .from('tournaments')
        .update({
          current_participants: newCount,
          ...(shouldClose ? { status: 'closed' } : {})
        })
        .eq('id', tournamentId);
    } catch (syncErr) {
      console.error('Failed to sync tournament participant count:', syncErr);
    }
  },

  async registerForTournament(registration: TournamentRegistrationInput): Promise<TournamentRegistration> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Enforce participant cap on new tournaments
    await this.assertCanRegister(registration.tournament_id, user.id);

    const isPaid = registration.payment_amount && registration.payment_amount > 0;

    // Check if user is already registered for this tournament to avoid duplicate key constraint errors
    const existing = await this.checkUserRegistration(user.id, registration.tournament_id);
    if (existing) {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .update({
          player_name: registration.player_name,
          game_id: registration.game_id,
          payment_amount: registration.payment_amount !== undefined ? registration.payment_amount : existing.payment_amount,
          payment_screenshot_url: registration.payment_screenshot_url !== undefined ? registration.payment_screenshot_url : existing.payment_screenshot_url,
          custom_fields_data: registration.custom_fields_data ? (registration.custom_fields_data as unknown as Json) : existing.custom_fields_data,
          payment_status: isPaid ? (existing.payment_status === 'completed' ? 'completed' : 'pending') : 'completed',
          status: isPaid ? (existing.payment_status === 'completed' ? 'confirmed' : 'registered') : 'confirmed'
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      await this.syncTournamentParticipantCount(registration.tournament_id);
      return data as TournamentRegistration;
    }

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
    await this.syncTournamentParticipantCount(registration.tournament_id);
    return data as TournamentRegistration;
  },

  async registerForTournamentWithWallet(registration: TournamentRegistrationInput): Promise<TournamentRegistration> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Enforce participant cap on new tournaments
    await this.assertCanRegister(registration.tournament_id, user.id);

    // Check if user is already registered for this tournament to avoid duplicate key constraint errors
    const existing = await this.checkUserRegistration(user.id, registration.tournament_id);
    if (existing) {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .update({
          player_name: registration.player_name,
          game_id: registration.game_id,
          payment_amount: registration.payment_amount !== undefined ? registration.payment_amount : existing.payment_amount,
          payment_screenshot_url: null,
          custom_fields_data: registration.custom_fields_data ? (registration.custom_fields_data as unknown as Json) : existing.custom_fields_data,
          payment_status: 'completed',
          status: 'confirmed'
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      await this.syncTournamentParticipantCount(registration.tournament_id);
      return data as TournamentRegistration;
    }

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
    await this.syncTournamentParticipantCount(registration.tournament_id);
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

  async updateRegistrationDetails(
    registrationId: string, 
    updates: { game_id?: string; custom_fields_data?: Record<string, string> }
  ): Promise<void> {
    const updatePayload: any = {};
    if (updates.game_id !== undefined) updatePayload.game_id = updates.game_id;
    if (updates.custom_fields_data !== undefined) updatePayload.custom_fields_data = updates.custom_fields_data;

    const { error } = await supabase
      .from('tournament_registrations')
      .update(updatePayload)
      .eq('id', registrationId);

    if (error) throw error;
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