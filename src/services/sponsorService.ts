import { supabase } from '@/integrations/supabase/client';

export interface Sponsor {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SponsorInput {
  name: string;
  logo?: string;
  website?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export const sponsorService = {
  async getSponsors(): Promise<Sponsor[]> {
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getAllSponsors(): Promise<Sponsor[]> {
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createSponsor(sponsor: SponsorInput): Promise<Sponsor> {
    const { data, error } = await supabase
      .from('sponsors')
      .insert([sponsor])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSponsor(id: string, sponsor: Partial<SponsorInput>): Promise<Sponsor> {
    const { data, error } = await supabase
      .from('sponsors')
      .update(sponsor)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSponsor(id: string): Promise<void> {
    const { error } = await supabase
      .from('sponsors')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async toggleSponsorStatus(id: string, isActive: boolean): Promise<Sponsor> {
    const { data, error } = await supabase
      .from('sponsors')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};