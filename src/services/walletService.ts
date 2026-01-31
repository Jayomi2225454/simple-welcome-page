import { supabase } from '@/integrations/supabase/client';

export type WalletMode = 'esports' | 'sports';

export interface WalletTransaction {
  id: string;
  user_id: string;
  transaction_type: 'deposit' | 'withdrawal' | 'tournament_entry' | 'prize_winning' | 'battle_code';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  payment_method?: string;
  transaction_reference?: string;
  admin_notes?: string;
  approved_by?: string;
  approved_at?: string;
  upi_id?: string;
  account_holder_name?: string;
  mobile_number?: string;
  payment_screenshot_url?: string | null;
  mode: WalletMode;
  created_at: string;
  updated_at: string;
}

export interface WalletBalance {
  id: string;
  user_id: string;
  available_balance: number;
  pending_balance: number;
  total_deposited: number;
  total_withdrawn: number;
  mode: WalletMode;
  created_at: string;
  updated_at: string;
}

export const walletService = {
  async getTransactions(mode: WalletMode): Promise<WalletTransaction[]> {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('mode', mode)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
    return (data || []) as WalletTransaction[];
  },

  async getUserTransactions(userId: string, mode: WalletMode): Promise<WalletTransaction[]> {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('mode', mode)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user transactions:', error);
      return [];
    }
    return (data || []) as WalletTransaction[];
  },

  async getUserBalance(userId: string, mode: WalletMode): Promise<WalletBalance | null> {
    const { data, error } = await supabase
      .from('wallet_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('mode', mode)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching user balance:', error);
      return null;
    }
    return data as WalletBalance | null;
  },

  async createTransaction(transaction: Omit<WalletTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<WalletTransaction> {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .insert([transaction])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
    return data as WalletTransaction;
  },

  async createWithdrawalTransaction(withdrawal: {
    user_id: string;
    amount: number;
    upi_id: string;
    account_holder_name: string;
    mobile_number: string;
    mode: WalletMode;
  }): Promise<WalletTransaction> {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .insert([{
        user_id: withdrawal.user_id,
        transaction_type: 'withdrawal',
        amount: withdrawal.amount,
        status: 'pending',
        payment_method: 'UPI',
        upi_id: withdrawal.upi_id,
        account_holder_name: withdrawal.account_holder_name,
        mobile_number: withdrawal.mobile_number,
        transaction_reference: `UPI: ${withdrawal.upi_id}, Name: ${withdrawal.account_holder_name}, Mobile: ${withdrawal.mobile_number}`,
        mode: withdrawal.mode
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating withdrawal:', error);
      throw error;
    }
    return data as WalletTransaction;
  },

  async updateTransactionStatus(id: string, status: 'approved' | 'rejected', adminNotes?: string): Promise<WalletTransaction> {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .update({
        status,
        admin_notes: adminNotes,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    }
    return data as WalletTransaction;
  }
};
