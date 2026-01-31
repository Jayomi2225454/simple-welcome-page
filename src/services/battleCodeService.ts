import { supabase } from '@/integrations/supabase/client';

export type BattleCodeMode = 'esports' | 'sports';

export interface BattleCode {
  id: string;
  code: string;
  bonus_amount: number;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  mode: BattleCodeMode;
  created_at: string;
  updated_at: string;
}

export interface BattleCodeRedemption {
  id: string;
  code_id: string;
  user_id: string;
  amount: number;
  mode: BattleCodeMode;
  redeemed_at: string;
}

export const battleCodeService = {
  async getAllCodes(mode: BattleCodeMode): Promise<BattleCode[]> {
    const { data, error } = await supabase
      .from('battle_codes')
      .select('*')
      .eq('mode', mode)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching battle codes:', error);
      throw error;
    }
    return data as BattleCode[];
  },

  async createCode(code: Omit<BattleCode, 'id' | 'current_uses' | 'created_at' | 'updated_at'>): Promise<BattleCode> {
    const { data, error } = await supabase
      .from('battle_codes')
      .insert([code])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating battle code:', error);
      throw error;
    }
    return data as BattleCode;
  },

  async updateCode(id: string, updates: Partial<BattleCode>): Promise<BattleCode> {
    const { data, error } = await supabase
      .from('battle_codes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating battle code:', error);
      throw error;
    }
    return data as BattleCode;
  },

  async deleteCode(id: string): Promise<void> {
    const { error } = await supabase
      .from('battle_codes')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting battle code:', error);
      throw error;
    }
  },

  async redeemCode(code: string, userId: string, mode: BattleCodeMode): Promise<{ success: boolean; amount?: number; message: string }> {
    // Rate limiting: Check recent attempts (max 5 per hour)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: recentAttempts } = await supabase
      .from('battle_code_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('mode', mode)
      .gte('attempted_at', oneHourAgo);

    if (recentAttempts !== null && recentAttempts >= 5) {
      return { success: false, message: 'Too many attempts. Please try again later.' };
    }

    // First check if code exists, is valid, and matches the mode
    const { data: codeData, error: codeError } = await supabase
      .from('battle_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .eq('mode', mode)
      .maybeSingle();
    
    // Log the attempt
    await supabase
      .from('battle_code_attempts')
      .insert([{
        user_id: userId,
        code_attempted: code.toUpperCase(),
        mode: mode,
        success: !!(codeData && !codeError)
      }]);

    if (codeError || !codeData) {
      return { success: false, message: 'Invalid or expired code for this mode' };
    }

    const battleCode = codeData as BattleCode;

    // Check if code has expired
    if (battleCode.expires_at && new Date(battleCode.expires_at) < new Date()) {
      return { success: false, message: 'This code has expired' };
    }

    // Check if code has reached max uses
    if (battleCode.current_uses >= battleCode.max_uses) {
      return { success: false, message: 'This code has reached its usage limit' };
    }

    // Check if user already redeemed this code
    const { data: existingRedemption } = await supabase
      .from('battle_code_redemptions')
      .select('*')
      .eq('code_id', battleCode.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingRedemption) {
      return { success: false, message: 'You have already redeemed this code' };
    }

    // Create redemption record
    const { error: redemptionError } = await supabase
      .from('battle_code_redemptions')
      .insert([{
        code_id: battleCode.id,
        user_id: userId,
        amount: battleCode.bonus_amount,
        mode: mode
      }]);

    if (redemptionError) {
      console.error('Error creating redemption:', redemptionError);
      return { success: false, message: 'Failed to redeem code' };
    }

    // Update code usage count
    await supabase
      .from('battle_codes')
      .update({ current_uses: battleCode.current_uses + 1 })
      .eq('id', battleCode.id);

    // Create wallet transaction for the bonus with the correct mode
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert([{
        user_id: userId,
        transaction_type: 'deposit',
        amount: battleCode.bonus_amount,
        status: 'approved',
        payment_method: 'Battle Code',
        transaction_reference: `Battle Code: ${battleCode.code}`,
        mode: mode
      }]);

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      return { success: false, message: 'Failed to add bonus to wallet' };
    }

    // Update the attempt to show success
    await supabase
      .from('battle_code_attempts')
      .update({ success: true })
      .eq('user_id', userId)
      .eq('code_attempted', code.toUpperCase())
      .order('attempted_at', { ascending: false })
      .limit(1);

    return { 
      success: true, 
      amount: battleCode.bonus_amount,
      message: `Successfully redeemed! ₹${battleCode.bonus_amount} added to your wallet.`
    };
  },

  async getRedemptions(codeId: string): Promise<BattleCodeRedemption[]> {
    const { data, error } = await supabase
      .from('battle_code_redemptions')
      .select('*')
      .eq('code_id', codeId)
      .order('redeemed_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching redemptions:', error);
      return [];
    }
    return data as BattleCodeRedemption[];
  }
};
