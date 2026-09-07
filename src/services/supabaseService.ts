
import { supabase } from '@/integrations/supabase/client';
import { Tournament, Player, Match, OverviewContent, ScheduleContent, PrizesContent } from '@/types';

// Helper function to convert database row to Tournament
export const convertToTournament = (dbRow: any): Tournament => {
  const banner = dbRow?.banner_url || dbRow?.banner || '';
  const image = dbRow?.image_url || dbRow?.image || banner || '';
  let overview = dbRow?.overview_content;
  if (typeof overview === 'string') {
    try {
      overview = JSON.parse(overview);
    } catch {
      // ignore
    }
  }
  return {
    ...dbRow,
    banner,
    banner_url: banner,
    image,
    image_url: image,
    enforce_cap: dbRow?.enforce_cap ?? (typeof overview === 'object' && overview ? (overview as any).enforce_cap : undefined),
    registration_status: dbRow?.registration_status ?? (typeof overview === 'object' && overview ? (overview as any).registration_status : undefined),
    overview_content: overview ? (overview as OverviewContent) : undefined,
    schedule_content: dbRow?.schedule_content ? (dbRow.schedule_content as ScheduleContent) : undefined,
    prizes_content: dbRow?.prizes_content ? (dbRow.prizes_content as PrizesContent) : undefined,
  };
};

// Helper function to convert Tournament to database format
const convertToDbFormat = (tournament: any) => {
  const dbTournament = { ...tournament };
  
  // If enforce_cap is provided, also embed it inside overview_content for resilience
  if (dbTournament.enforce_cap !== undefined) {
    let ov = dbTournament.overview_content || {};
    if (typeof ov === 'string') {
      try { ov = JSON.parse(ov); } catch {}
    }
    dbTournament.overview_content = {
      ...(typeof ov === 'object' && ov ? ov : {}),
      enforce_cap: dbTournament.enforce_cap,
    };
  }

  // Convert content objects to JSON
  if (dbTournament.overview_content) {
    dbTournament.overview_content = JSON.stringify(dbTournament.overview_content);
  }
  if (dbTournament.schedule_content) {
    dbTournament.schedule_content = JSON.stringify(dbTournament.schedule_content);
  }
  if (dbTournament.prizes_content) {
    dbTournament.prizes_content = JSON.stringify(dbTournament.prizes_content);
  }
  
  return dbTournament;
};

// Tournament operations
export const tournamentService = {
  async getAll(): Promise<Tournament[]> {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching tournaments:', error);
      return [];
    }
    return (data || []).map(convertToTournament);
  },

  async getById(id: string): Promise<Tournament | null> {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching tournament by id:', error);
      return null;
    }
    return data ? convertToTournament(data) : null;
  },

  async create(tournament: Omit<Tournament, 'id' | 'created_at' | 'updated_at'>): Promise<Tournament> {
    // Clean up the tournament data - remove empty strings and undefined values
    let tournamentData = { ...tournament };

    // Ensure banner_url and image_url are set from banner and image if provided
    if (tournamentData.banner && !tournamentData.banner_url) {
      tournamentData.banner_url = tournamentData.banner;
    }
    if (tournamentData.image && !tournamentData.image_url) {
      tournamentData.image_url = tournamentData.image;
    }
    
    // Remove fields that don't exist in the database
    const invalidFields = ['image', 'banner', 'highlights', 'winners', 'prizes', 'start_time', 'end_time', 'registration_opens', 'registration_closes', 'entry_fee_type'];
    invalidFields.forEach(field => {
      delete tournamentData[field];
    });
    
    // Remove empty string values to prevent database errors
    Object.keys(tournamentData).forEach(key => {
      if (tournamentData[key] === '' || tournamentData[key] === undefined || tournamentData[key] === null) {
        delete tournamentData[key];
      }
    });

    // Ensure required dates are present and properly formatted
    if (!tournamentData.start_date) {
      tournamentData.start_date = new Date().toISOString();
    } else {
      tournamentData.start_date = new Date(tournamentData.start_date).toISOString();
    }
    
    if (!tournamentData.end_date) {
      tournamentData.end_date = new Date().toISOString();
    } else {
      tournamentData.end_date = new Date(tournamentData.end_date).toISOString();
    }

    // Note: registration_start_time and registration_end_time are the correct DB column names

    // Convert to database format
    const dbData = convertToDbFormat(tournamentData);

    console.log('Creating tournament with cleaned data:', dbData);

    let { data, error } = await supabase
      .from('tournaments')
      .insert([dbData])
      .select()
      .single();
    
    if (error && (error.message?.includes('enforce_cap') || error.message?.includes('registration_status') || error.code === 'PGRST204')) {
      console.warn('Retrying insert without enforce_cap/registration_status columns:', error.message);
      const fallbackData = { ...dbData };
      delete fallbackData.enforce_cap;
      delete fallbackData.registration_status;
      const retryResult = await supabase
        .from('tournaments')
        .insert([fallbackData])
        .select()
        .single();
      data = retryResult.data;
      error = retryResult.error;
    }
    
    if (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }
    return convertToTournament(data);
  },

  async update(id: string, tournament: Partial<Tournament>): Promise<Tournament> {
    // Clean up the tournament data - remove empty strings and undefined values
    let updateData = { ...tournament };

    // Ensure banner_url and image_url are set from banner and image if provided
    if (updateData.banner && !updateData.banner_url) {
      updateData.banner_url = updateData.banner;
    }
    if (updateData.image && !updateData.image_url) {
      updateData.image_url = updateData.image;
    }
    
    // Remove fields that don't exist in the database
    const invalidFields = ['image', 'banner', 'highlights', 'winners', 'prizes', 'start_time', 'end_time', 'registration_opens', 'registration_closes', 'entry_fee_type'];
    invalidFields.forEach(field => {
      delete updateData[field];
    });
    
    // Remove empty string values to prevent database errors
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '' || updateData[key] === undefined || updateData[key] === null) {
        delete updateData[key];
      }
    });

    // Format date fields if they exist
    if (updateData.start_date) {
      updateData.start_date = new Date(updateData.start_date).toISOString();
    }
    if (updateData.end_date) {
      updateData.end_date = new Date(updateData.end_date).toISOString();
    }

    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    // Convert to database format
    const dbData = convertToDbFormat(updateData);

    console.log('Updating tournament with cleaned data:', dbData);
    
    let { data, error } = await supabase
      .from('tournaments')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();
    
    if (error && (error.message?.includes('enforce_cap') || error.message?.includes('registration_status') || error.code === 'PGRST204')) {
      console.warn('Retrying update without enforce_cap/registration_status columns:', error.message);
      const fallbackData = { ...dbData };
      delete fallbackData.enforce_cap;
      delete fallbackData.registration_status;
      const retryResult = await supabase
        .from('tournaments')
        .update(fallbackData)
        .eq('id', id)
        .select()
        .single();
      data = retryResult.data;
      error = retryResult.error;
    }
    
    if (error) {
      console.error('Error updating tournament:', error);
      throw error;
    }
    return convertToTournament(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting tournament:', error);
      throw error;
    }
  }
};

// Player operations
export const playerService = {
  async getAll(): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('rank', { ascending: true });
    
    if (error) {
      console.error('Error fetching players:', error);
      return [];
    }
    return (data || []) as Player[];
  },

  async create(player: Omit<Player, 'id' | 'created_at' | 'updated_at'>): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .insert([player])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating player:', error);
      throw error;
    }
    return data as Player;
  },

  async update(id: string, player: Partial<Player>): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .update({ ...player, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating player:', error);
      throw error;
    }
    return data as Player;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting player:', error);
      throw error;
    }
  }
};

// Match operations
export const matchService = {
  async getAll(): Promise<Match[]> {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('start_time', { ascending: true });
    
    if (error) {
      console.error('Error fetching matches:', error);
      return [];
    }
    return (data || []) as Match[];
  },

  async create(match: Omit<Match, 'id' | 'created_at' | 'updated_at'>): Promise<Match> {
    // Ensure start_time is properly formatted
    const matchData = {
      ...match,
      start_time: match.start_time || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('matches')
      .insert([matchData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating match:', error);
      throw error;
    }
    return data as Match;
  },

  async update(id: string, match: Partial<Match>): Promise<Match> {
    // Filter out empty string dates
    const updateData = { ...match };
    if (updateData.start_time === '') delete updateData.start_time;
    
    const { data, error } = await supabase
      .from('matches')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating match:', error);
      throw error;
    }
    return data as Match;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting match:', error);
      throw error;
    }
  }
};
