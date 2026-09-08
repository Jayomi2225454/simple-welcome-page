
export interface Tournament {
  id: string;
  name: string;
  game: string;
  description: string;
  prize_pool: string;
  max_participants: number;
  current_participants: number;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'closed' | 'full';
  enforce_cap?: boolean;
  registration_status?: 'open' | 'closed' | 'full';
  image: string;
  image_url?: string;
  banner?: string;
  banner_url?: string;
  entry_fee?: string;
  region?: string;
  format?: string;
  team_size?: string;
  organizer?: string;
  rules?: string;
  schedule?: string;
  prizes?: string;
  highlights?: string[];
  registration_opens?: string;
  registration_closes?: string;
  timer_duration?: number;
  timer_start_time?: string;
  timer_is_running?: boolean;
  team_payment_mode?: 'leader_pays' | 'each_pays';
  overview_content?: OverviewContent;
  schedule_content?: ScheduleContent;
  prizes_content?: PrizesContent;
  created_at?: string;
  updated_at?: string;
}

export interface TournamentTeam {
  id: string;
  tournament_id: string;
  team_name: string;
  captain_user_id: string;
  max_members: number;
  current_members: number;
  is_full: boolean;
  status: string;
  team_code?: string | null;
  password?: string | null;
  payment_mode?: 'leader_pays' | 'each_pays' | null;
  group_name?: string | null;
  created_at: string;
  updated_at?: string;
}

// Cutoff timestamp: Only tournaments created from this point onwards enforce participant limits
export const NEW_TOURNAMENT_CUTOFF = '2026-09-06T13:30:00.000Z';

/**
 * Checks if a tournament is a new tournament where the max participant cap must be strictly enforced.
 * Legacy tournaments (created before cutoff without enforce_cap flag) return false to prevent breaking older events.
 */
export const isNewTournamentWithCap = (tournament: any): boolean => {
  if (!tournament) return false;
  // 1. Explicit database column flag
  if (tournament.enforce_cap === true) return true;
  if (tournament.enforce_cap === false) return false;
  // 2. Saved inside existing JSON overview_content metadata
  if (tournament.overview_content?.enforce_cap === true) return true;
  if (tournament.overview_content?.enforce_cap === false) return false;
  // 3. Cutoff by creation date
  if (tournament.created_at) {
    try {
      const createdTime = new Date(tournament.created_at).getTime();
      const cutoffTime = new Date(NEW_TOURNAMENT_CUTOFF).getTime();
      return createdTime >= cutoffTime;
    } catch {
      return false;
    }
  }
  return false;
};

/**
 * Checks if a tournament's registration is full or closed.
 * Respects the "new tournaments only" rule so legacy tournaments with inconsistent counts are not locked.
 */
export const isTournamentRegistrationClosed = (tournament: any, currentCount?: number): boolean => {
  if (!tournament) return false;
  const status = (tournament.status || '').toLowerCase();
  if (status === 'closed' || status === 'full') return true;
  if (tournament.registration_status === 'closed' || tournament.registration_status === 'full') return true;

  // Only enforce participant limit on new tournaments
  if (!isNewTournamentWithCap(tournament)) {
    return false;
  }

  const maxP = typeof tournament.max_participants === 'number'
    ? tournament.max_participants
    : parseInt(tournament.max_participants || '0');

  if (!maxP || maxP <= 0) return false;

  const count = currentCount !== undefined
    ? currentCount
    : (tournament.current_participants || 0);

  return count >= maxP;
};

export interface OverviewContent {
  highlights: string[];
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  title: string;
  date: string;
  time?: string;
}

export interface ScheduleContent {
  phases: TournamentPhase[];
}

export interface TournamentPhase {
  title: string;
  color: string;
  rounds: TournamentRound[];
}

export interface TournamentRound {
  title: string;
  date: string;
  description: string;
  time: string;
  matches: string;
}

export interface PrizesContent {
  positions: PrizePosition[];
  additional_rewards: AdditionalReward[];
}

export interface PrizePosition {
  position: number;
  title: string;
  amount: string;
  description: string;
  color: string;
}

export interface AdditionalReward {
  title: string;
  description: string;
}

export interface Player {
  id: string;
  name: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  avatar: string;
  country: string;
  team?: string;
  earnings: number;
  win_rate: number;
  tournaments_won: number;
  created_at?: string;
  updated_at?: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  player1: string;
  player2: string;
  player1_score: number;
  player2_score: number;
  status: 'live' | 'upcoming' | 'completed';
  start_time: string;
  game: string;
  thumbnail?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'prize';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}
