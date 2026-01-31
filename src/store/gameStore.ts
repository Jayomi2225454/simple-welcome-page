import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { Tournament, Player, Match, WalletTransaction } from '../types';
import { tournamentService, playerService, matchService } from '@/services/supabaseService';

interface GameStore {
  tournaments: Tournament[];
  players: Player[];
  matches: Match[];
  walletTransactions: WalletTransaction[];
  walletBalance: number;
  isLoading: boolean;
  error: string | null;
  
  // Loading actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Initialize data
  initialize: () => Promise<void>;
  
  // Tournament actions
  addTournament: (tournament: Omit<Tournament, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTournament: (id: string, tournament: Partial<Tournament>) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  
  // Player actions
  addPlayer: (player: Omit<Player, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePlayer: (id: string, player: Partial<Player>) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  
  // Match actions
  addMatch: (match: Omit<Match, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateMatch: (id: string, match: Partial<Match>) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;
  
  // Wallet actions
  addTransaction: (transaction: WalletTransaction) => void;
  updateBalance: (amount: number) => void;
}

// Enhanced mock data with banners
const mockTournaments: Tournament[] = [
  {
    id: '1',
    name: 'Battle Royale Championship',
    game: 'Battle Royale',
    description: 'Ultimate championship with top players worldwide',
    prize_pool: '$50,000',
    max_participants: 100,
    current_participants: 87,
    start_date: '2024-07-15',
    end_date: '2024-07-20',
    status: 'ongoing',
    image: '/lovable-uploads/feb97539-ef64-4950-81ec-d958016900ac.png',
    banner: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1200&h=400&fit=crop'
  },
  {
    id: '2',
    name: 'FPS Masters Cup',
    game: 'FPS Arena',
    description: 'Fast-paced action tournament for FPS enthusiasts',
    prize_pool: '$25,000',
    max_participants: 64,
    current_participants: 45,
    start_date: '2024-07-25',
    end_date: '2024-07-28',
    status: 'upcoming',
    image: '/lovable-uploads/feb97539-ef64-4950-81ec-d958016900ac.png',
    banner: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=400&fit=crop'
  },
  {
    id: '3',
    name: 'Strategy Masters League',
    game: 'Strategy Game',
    description: 'The ultimate test of strategic thinking and planning',
    prize_pool: '$15,000',
    max_participants: 32,
    current_participants: 28,
    start_date: '2024-08-01',
    end_date: '2024-08-05',
    status: 'upcoming',
    image: '/lovable-uploads/feb97539-ef64-4950-81ec-d958016900ac.png',
    banner: 'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=1200&h=400&fit=crop'
  }
];

const mockPlayers: Player[] = [
  {
    id: '1',
    name: 'ProGamer_X',
    rank: 1,
    points: 2450,
    wins: 89,
    losses: 11,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
    country: 'USA',
    team: 'Team Liquid',
    earnings: 230000,
    win_rate: 88.9,
    tournaments_won: 12
  },
  {
    id: '2',
    name: 'EliteSniper',
    rank: 2,
    points: 2380,
    wins: 76,
    losses: 24,
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop',
    country: 'UK',
    team: 'Cloud9',
    earnings: 180000,
    win_rate: 76.0,
    tournaments_won: 8
  },
  {
    id: '3',
    name: 'DigitalWarrior',
    rank: 3,
    points: 2290,
    wins: 68,
    losses: 32,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    country: 'Canada',
    team: 'T1',
    earnings: 160000,
    win_rate: 68.0,
    tournaments_won: 7
  },
  {
    id: '4',
    name: 'CyberNinja',
    rank: 4,
    points: 2150,
    wins: 55,
    losses: 45,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    country: 'Japan',
    team: 'G2 Esports',
    earnings: 140000,
    win_rate: 55.0,
    tournaments_won: 6
  }
];

const mockMatches: Match[] = [
  {
    id: '1',
    tournament_id: '1',
    player1: 'ProGamer_X',
    player2: 'EliteSniper',
    player1_score: 15,
    player2_score: 12,
    status: 'live',
    start_time: '2024-07-02T14:00:00Z',
    game: 'Battle Royale'
  },
  {
    id: '2',
    tournament_id: '1',
    player1: 'DigitalWarrior',
    player2: 'CyberNinja',
    player1_score: 0,
    player2_score: 0,
    status: 'upcoming',
    start_time: '2024-07-02T16:00:00Z',
    game: 'Battle Royale'
  },
  {
    id: '3',
    tournament_id: '2',
    player1: 'ProGamer_X',
    player2: 'CyberNinja',
    player1_score: 0,
    player2_score: 0,
    status: 'upcoming',
    start_time: '2024-07-25T10:00:00Z',
    game: 'FPS Arena'
  }
];

const mockTransactions: WalletTransaction[] = [
  {
    id: '1',
    type: 'prize',
    amount: 500,
    description: 'Tournament win - Battle Royale',
    date: '2024-07-01',
    status: 'completed'
  },
  {
    id: '2',
    type: 'deposit',
    amount: 100,
    description: 'Wallet top-up',
    date: '2024-06-28',
    status: 'completed'
  }
];

export const useGameStore = create<GameStore>((set, get) => ({
  tournaments: [],
  players: [],
  matches: [],
  walletTransactions: mockTransactions,
  walletBalance: 750,
  isLoading: false,
  error: null,
  
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  initialize: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Load initial data with proper error handling
      const [tournaments, players, matches] = await Promise.all([
        tournamentService.getAll().catch(err => {
          console.error('Failed to load tournaments:', err);
          return [];
        }),
        playerService.getAll().catch(err => {
          console.error('Failed to load players:', err);
          return [];
        }),
        matchService.getAll().catch(err => {
          console.error('Failed to load matches:', err);
          return [];
        })
      ]);
      
      set({ tournaments, players, matches, isLoading: false });
      
      // Set up real-time subscriptions
      const tournamentChannel = supabase
        .channel('tournaments-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, (payload) => {
          console.log('Tournament change:', payload);
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          set((state) => {
            let newTournaments = [...state.tournaments];
            
            switch (eventType) {
              case 'INSERT':
                newTournaments.push(newRecord as Tournament);
                break;
              case 'UPDATE':
                newTournaments = newTournaments.map(t => t.id === newRecord.id ? newRecord as Tournament : t);
                break;
              case 'DELETE':
                newTournaments = newTournaments.filter(t => t.id !== oldRecord.id);
                break;
            }
            
            return { tournaments: newTournaments };
          });
        })
        .subscribe();

      const playerChannel = supabase
        .channel('players-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, (payload) => {
          console.log('Player change:', payload);
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          set((state) => {
            let newPlayers = [...state.players];
            
            switch (eventType) {
              case 'INSERT':
                newPlayers.push(newRecord as Player);
                newPlayers.sort((a, b) => a.rank - b.rank);
                break;
              case 'UPDATE':
                newPlayers = newPlayers.map(p => p.id === newRecord.id ? newRecord as Player : p);
                newPlayers.sort((a, b) => a.rank - b.rank);
                break;
              case 'DELETE':
                newPlayers = newPlayers.filter(p => p.id !== oldRecord.id);
                break;
            }
            
            return { players: newPlayers };
          });
        })
        .subscribe();

      const matchChannel = supabase
        .channel('matches-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (payload) => {
          console.log('Match change:', payload);
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          set((state) => {
            let newMatches = [...state.matches];
            
            switch (eventType) {
              case 'INSERT':
                newMatches.push(newRecord as Match);
                break;
              case 'UPDATE':
                newMatches = newMatches.map(m => m.id === newRecord.id ? newRecord as Match : m);
                break;
              case 'DELETE':
                newMatches = newMatches.filter(m => m.id !== oldRecord.id);
                break;
            }
            
            return { matches: newMatches };
          });
        })
        .subscribe();
        
    } catch (error) {
      console.error('Failed to initialize store:', error);
      set({ error: 'Failed to load data', isLoading: false });
    }
  },
  
  addTournament: async (tournament) => {
    try {
      await tournamentService.create(tournament);
      // Real-time subscription will handle the state update
    } catch (error) {
      console.error('Failed to add tournament:', error);
      set({ error: 'Failed to add tournament' });
    }
  },
  
  updateTournament: async (id, tournament) => {
    try {
      await tournamentService.update(id, tournament);
      // Real-time subscription will handle the state update
    } catch (error) {
      console.error('Failed to update tournament:', error);
      set({ error: 'Failed to update tournament' });
    }
  },
  
  deleteTournament: async (id) => {
    try {
      await tournamentService.delete(id);
      // Real-time subscription will handle the state update
    } catch (error) {
      console.error('Failed to delete tournament:', error);
      set({ error: 'Failed to delete tournament' });
    }
  },
  
  addPlayer: async (player) => {
    try {
      await playerService.create(player);
      // Real-time subscription will handle the state update
    } catch (error) {
      console.error('Failed to add player:', error);
      set({ error: 'Failed to add player' });
    }
  },
  
  updatePlayer: async (id, player) => {
    try {
      await playerService.update(id, player);
      // Real-time subscription will handle the state update
    } catch (error) {
      console.error('Failed to update player:', error);
      set({ error: 'Failed to update player' });
    }
  },
  
  deletePlayer: async (id) => {
    try {
      await playerService.delete(id);
      // Real-time subscription will handle the state update
    } catch (error) {
      console.error('Failed to delete player:', error);
      set({ error: 'Failed to delete player' });
    }
  },
  
  addMatch: async (match) => {
    try {
      await matchService.create(match);
      // Real-time subscription will handle the state update
    } catch (error) {
      console.error('Failed to add match:', error);
      set({ error: 'Failed to add match' });
    }
  },
  
  updateMatch: async (id, match) => {
    try {
      await matchService.update(id, match);
      // Real-time subscription will handle the state update
    } catch (error) {
      console.error('Failed to update match:', error);
      set({ error: 'Failed to update match' });
    }
  },
  
  deleteMatch: async (id) => {
    try {
      await matchService.delete(id);
      // Real-time subscription will handle the state update
    } catch (error) {
      console.error('Failed to delete match:', error);
      set({ error: 'Failed to delete match' });
    }
  },
  
  addTransaction: (transaction) =>
    set((state) => ({
      walletTransactions: [...state.walletTransactions, transaction],
    })),
  
  updateBalance: (amount) =>
    set((state) => ({ walletBalance: state.walletBalance + amount })),
}));
