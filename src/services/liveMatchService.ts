import { supabase } from '@/integrations/supabase/client';

export interface LiveMatchAdmin {
  id: string;
  tournament_id?: string;
  banner_url?: string;
  title: string;
  description?: string;
  youtube_live_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const liveMatchService = {
  async getActiveLiveMatches(): Promise<LiveMatchAdmin[]> {
    const { data, error } = await supabase
      .from('live_match_admin')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching active live matches:', error);
      return [];
    }
    return data || [];
  },

  async getAllLiveMatches(): Promise<LiveMatchAdmin[]> {
    const { data, error } = await supabase
      .from('live_match_admin')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching all live matches:', error);
      return [];
    }
    return data || [];
  },

  async createLiveMatch(liveMatch: Omit<LiveMatchAdmin, 'id' | 'created_at' | 'updated_at'>): Promise<LiveMatchAdmin> {
    const { data, error } = await supabase
      .from('live_match_admin')
      .insert([liveMatch])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating live match:', error);
      throw error;
    }
    return data;
  },

  async updateLiveMatch(id: string, liveMatch: Partial<LiveMatchAdmin>): Promise<LiveMatchAdmin> {
    const { data, error } = await supabase
      .from('live_match_admin')
      .update({ ...liveMatch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating live match:', error);
      throw error;
    }
    return data;
  },

  async deleteLiveMatch(id: string): Promise<void> {
    const { error } = await supabase
      .from('live_match_admin')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting live match:', error);
      throw error;
    }
  }
};