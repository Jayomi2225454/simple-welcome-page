import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Trophy, 
  ClipboardList, 
  Ticket, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  RefreshCw, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  DollarSign,
  Layers,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserDetail {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  created_at: string;
  available_balance: number;
  total_deposited: number;
  total_withdrawn: number;
}

interface TournamentStat {
  id: string;
  name: string;
  game: string;
  status: string;
  prize_pool: string;
  entry_fee: number | null;
  registrations_count: number;
}

interface CodeStat {
  id: string;
  code: string;
  bonus_amount: number;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  mode: string;
}

interface TransactionStat {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  status: string;
  payment_method?: string;
  created_at: string;
  user_name?: string;
}

interface AdminAllDetailsProps {
  onNavigateTab?: (tabValue: string) => void;
}

const AdminAllDetails = ({ onNavigateTab }: AdminAllDetailsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Metrics
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalTournaments, setTotalTournaments] = useState<number>(0);
  const [upcomingTournaments, setUpcomingTournaments] = useState<number>(0);
  const [ongoingTournaments, setOngoingTournaments] = useState<number>(0);
  const [completedTournaments, setCompletedTournaments] = useState<number>(0);

  const [totalRegistrations, setTotalRegistrations] = useState<number>(0);
  const [paidRegistrations, setPaidRegistrations] = useState<number>(0);

  const [totalCodes, setTotalCodes] = useState<number>(0);
  const [activeCodes, setActiveCodes] = useState<number>(0);
  const [totalRedemptions, setTotalRedemptions] = useState<number>(0);
  const [totalBonusGiven, setTotalBonusGiven] = useState<number>(0);

  const [totalDeposits, setTotalDeposits] = useState<number>(0);
  const [pendingDepositsCount, setPendingDepositsCount] = useState<number>(0);
  const [pendingDepositsAmount, setPendingDepositsAmount] = useState<number>(0);

  const [totalWithdrawals, setTotalWithdrawals] = useState<number>(0);
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState<number>(0);
  const [pendingWithdrawalsAmount, setPendingWithdrawalsAmount] = useState<number>(0);

  const [totalUserBalances, setTotalUserBalances] = useState<number>(0);

  // Drilldown lists
  const [usersList, setUsersList] = useState<UserDetail[]>([]);
  const [tournamentsList, setTournamentsList] = useState<TournamentStat[]>([]);
  const [codesList, setCodesList] = useState<CodeStat[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionStat[]>([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAllDetails();
  }, []);

  const fetchAllDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users (profiles) & Wallets
      const [profilesRes, balancesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('wallet_balances').select('*'),
      ]);

      const profiles = profilesRes.data || [];
      const balances = balancesRes.data || [];

      setTotalUsers(profiles.length);

      // Map balances by user_id
      const balanceMap: Record<string, { available: number; deposited: number; withdrawn: number }> = {};
      let totalPlatformBalance = 0;

      balances.forEach(b => {
        const available = Number(b.available_balance || 0);
        const deposited = Number(b.total_deposited || 0);
        const withdrawn = Number(b.total_withdrawn || 0);
        totalPlatformBalance += available;

        if (!balanceMap[b.user_id]) {
          balanceMap[b.user_id] = { available: 0, deposited: 0, withdrawn: 0 };
        }
        balanceMap[b.user_id].available += available;
        balanceMap[b.user_id].deposited += deposited;
        balanceMap[b.user_id].withdrawn += withdrawn;
      });

      setTotalUserBalances(totalPlatformBalance);

      const detailedUsers: UserDetail[] = profiles.map(p => ({
        id: p.id,
        username: p.username,
        full_name: p.full_name,
        email: p.email,
        created_at: p.created_at,
        available_balance: balanceMap[p.id]?.available || 0,
        total_deposited: balanceMap[p.id]?.deposited || 0,
        total_withdrawn: balanceMap[p.id]?.withdrawn || 0,
      }));
      setUsersList(detailedUsers);

      // 2. Fetch Tournaments
      const { data: tournamentsData } = await supabase
        .from('tournaments')
        .select('id, name, game, status, prize_pool, entry_fee')
        .order('created_at', { ascending: false });

      const tournaments = tournamentsData || [];
      setTotalTournaments(tournaments.length);
      setUpcomingTournaments(tournaments.filter(t => t.status === 'upcoming').length);
      setOngoingTournaments(tournaments.filter(t => t.status === 'ongoing').length);
      setCompletedTournaments(tournaments.filter(t => t.status === 'completed').length);

      // 3. Fetch Tournament Registrations
      const { data: registrationsData } = await supabase
        .from('tournament_registrations')
        .select('id, tournament_id, user_id, payment_status');

      const registrations = registrationsData || [];
      setTotalRegistrations(registrations.length);
      setPaidRegistrations(registrations.filter(r => r.payment_status === 'paid' || r.payment_status === 'completed').length);

      // Count registrations per tournament
      const regCountMap: Record<string, number> = {};
      registrations.forEach(r => {
        regCountMap[r.tournament_id] = (regCountMap[r.tournament_id] || 0) + 1;
      });

      const detailedTournaments: TournamentStat[] = tournaments.map(t => ({
        id: t.id,
        name: t.name,
        game: t.game,
        status: t.status,
        prize_pool: t.prize_pool,
        entry_fee: t.entry_fee,
        registrations_count: regCountMap[t.id] || 0,
      }));
      setTournamentsList(detailedTournaments);

      // 4. Fetch Battle Codes & Redemptions
      const [codesRes, redemptionsRes] = await Promise.all([
        supabase.from('battle_codes').select('*').order('created_at', { ascending: false }),
        supabase.from('battle_code_redemptions').select('*'),
      ]);

      const codes = codesRes.data || [];
      const redemptions = redemptionsRes.data || [];

      setTotalCodes(codes.length);
      setActiveCodes(codes.filter(c => c.is_active).length);
      setTotalRedemptions(redemptions.length || codes.reduce((acc, c) => acc + (c.current_uses || 0), 0));
      setTotalBonusGiven(redemptions.reduce((acc, r) => acc + Number(r.amount || 0), 0));

      setCodesList(codes.map(c => ({
        id: c.id,
        code: c.code,
        bonus_amount: Number(c.bonus_amount || 0),
        max_uses: c.max_uses || 1,
        current_uses: c.current_uses || 0,
        is_active: !!c.is_active,
        mode: c.mode || 'esports',
      })));

      // 5. Fetch Wallet Transactions (Deposits, Withdrawals)
      const { data: transactionsData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      const transactions = transactionsData || [];

      // Calculate Total Approved Deposits
      const approvedDeposits = transactions.filter(t => t.transaction_type === 'deposit' && t.status === 'approved');
      const totalDep = approvedDeposits.reduce((acc, t) => acc + Number(t.amount || 0), 0);
      setTotalDeposits(totalDep);

      // Pending Deposits
      const pendingDep = transactions.filter(t => t.transaction_type === 'deposit' && t.status === 'pending');
      setPendingDepositsCount(pendingDep.length);
      setPendingDepositsAmount(pendingDep.reduce((acc, t) => acc + Number(t.amount || 0), 0));

      // Calculate Total Approved Withdrawals
      const approvedWithdrawals = transactions.filter(t => t.transaction_type === 'withdrawal' && t.status === 'approved');
      const totalWth = approvedWithdrawals.reduce((acc, t) => acc + Number(t.amount || 0), 0);
      setTotalWithdrawals(totalWth);

      // Pending Withdrawals
      const pendingWth = transactions.filter(t => t.transaction_type === 'withdrawal' && t.status === 'pending');
      setPendingWithdrawalsCount(pendingWth.length);
      setPendingWithdrawalsAmount(pendingWth.reduce((acc, t) => acc + Number(t.amount || 0), 0));

      // Create profile map for transaction user names
      const profileNameMap: Record<string, string> = {};
      profiles.forEach(p => {
        profileNameMap[p.id] = p.username || p.full_name || p.email || 'User';
      });

      setRecentTransactions(transactions.slice(0, 30).map(t => ({
        id: t.id,
        user_id: t.user_id,
        transaction_type: t.transaction_type,
        amount: Number(t.amount || 0),
        status: t.status,
        payment_method: t.payment_method,
        created_at: t.created_at,
        user_name: profileNameMap[t.user_id] || `${t.user_id.slice(0, 8)}...`,
      })));

    } catch (err: any) {
      console.error('Error fetching admin all details:', err);
      toast({
        title: 'Error loading details',
        description: err.message || 'Could not fetch platform statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllDetails();
  };

  // Filtered lists based on search query
  const filteredUsers = usersList.filter(u => 
    !searchQuery ||
    (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredTournaments = tournamentsList.filter(t =>
    !searchQuery ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.game.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = recentTransactions.filter(t =>
    !searchQuery ||
    (t.user_name && t.user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    t.transaction_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-950/60 via-gray-900/80 to-blue-950/60 p-6 rounded-2xl border border-purple-500/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40">
              Overview & Analytics
            </Badge>
            <span className="text-xs text-gray-400">Live Platform Metrics</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            All Details & Platform Summary
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Complete snapshot of registered users, tournaments, registrations, battle codes, and wallet finances.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            variant="outline"
            className="border-gray-700 bg-gray-800/80 text-gray-200 hover:bg-gray-700 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 7 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Users */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/80 border-gray-700/80 shadow-md hover:border-blue-500/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">{loading ? '...' : totalUsers}</div>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="text-blue-400 font-semibold">{totalUsers}</span> registered user accounts
            </p>
          </CardContent>
        </Card>

        {/* 2. Total Tournaments */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/80 border-gray-700/80 shadow-md hover:border-yellow-500/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Tournaments</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              <Trophy className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">{loading ? '...' : totalTournaments}</div>
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <Badge variant="secondary" className="bg-blue-500/15 text-blue-300 text-[10px] px-1.5 py-0">
                {upcomingTournaments} Upcoming
              </Badge>
              <Badge variant="secondary" className="bg-green-500/15 text-green-300 text-[10px] px-1.5 py-0">
                {ongoingTournaments} Live
              </Badge>
              <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-[10px] px-1.5 py-0">
                {completedTournaments} Done
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 3. Registrations */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/80 border-gray-700/80 shadow-md hover:border-purple-500/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Registrations</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ClipboardList className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">{loading ? '...' : totalRegistrations}</div>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="text-purple-400 font-semibold">{paidRegistrations}</span> paid / confirmed registrations
            </p>
          </CardContent>
        </Card>

        {/* 4. Codes / Redemptions */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/80 border-gray-700/80 shadow-md hover:border-pink-500/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Codes / Redemptions</CardTitle>
            <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Ticket className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">
              {loading ? '...' : `${totalCodes} / ${totalRedemptions}`}
            </div>
            <p className="text-xs text-gray-400">
              <span className="text-green-400 font-semibold">{activeCodes} active</span> codes • ₹{totalBonusGiven.toLocaleString('en-IN')} bonus
            </p>
          </CardContent>
        </Card>

        {/* 5. Total Deposits */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/80 border-gray-700/80 shadow-md hover:border-green-500/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Deposits</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400 mb-1">
              ₹{loading ? '...' : totalDeposits.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-gray-400">
              {pendingDepositsCount > 0 ? (
                <span className="text-yellow-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 inline" /> {pendingDepositsCount} pending (₹{pendingDepositsAmount.toLocaleString('en-IN')})
                </span>
              ) : (
                <span className="text-green-400/80">All deposit requests processed</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* 6. Total Withdrawals */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/80 border-gray-700/80 shadow-md hover:border-orange-500/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Withdrawals</CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <TrendingDown className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-400 mb-1">
              ₹{loading ? '...' : totalWithdrawals.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-gray-400">
              {pendingWithdrawalsCount > 0 ? (
                <span className="text-yellow-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 inline" /> {pendingWithdrawalsCount} pending (₹{pendingWithdrawalsAmount.toLocaleString('en-IN')})
                </span>
              ) : (
                <span className="text-orange-400/80">All payout requests processed</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* 7. User Balances */}
        <Card className="bg-gradient-to-br from-purple-950/40 via-gray-900/90 to-gray-800/80 border-purple-500/40 shadow-md col-span-1 sm:col-span-2 lg:col-span-2 hover:border-purple-400 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-purple-300">Total User Balances</CardTitle>
              <span className="text-xs text-gray-400">Sum of available wallet funds across all players</span>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/40">
              <Wallet className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div className="text-3xl sm:text-4xl font-extrabold text-white">
                ₹{loading ? '...' : totalUserBalances.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-gray-400">
                Net Cash Flow: <strong className={totalDeposits - totalWithdrawals >= 0 ? "text-green-400" : "text-red-400"}>
                  ₹{(totalDeposits - totalWithdrawals).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Action Alerts (if any) */}
      {(pendingDepositsCount > 0 || pendingWithdrawalsCount > 0) && (
        <div className="p-4 bg-yellow-950/30 border border-yellow-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-400 shrink-0" />
            <div>
              <h4 className="text-white font-semibold text-sm">Pending Financial Approvals</h4>
              <p className="text-xs text-yellow-300/80">
                {pendingDepositsCount} pending deposit(s) totaling ₹{pendingDepositsAmount.toLocaleString('en-IN')} and {pendingWithdrawalsCount} pending withdrawal(s) totaling ₹{pendingWithdrawalsAmount.toLocaleString('en-IN')} need review.
              </p>
            </div>
          </div>
          {onNavigateTab && (
            <Button
              onClick={() => onNavigateTab('wallet')}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-xs shrink-0 h-9"
            >
              Open Wallet Tab <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      )}

      {/* Detailed Drilldown Tabs */}
      <Card className="bg-gray-800 border-gray-700 shadow-xl">
        <CardHeader className="pb-3 border-b border-gray-700/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                Detailed Breakdowns
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Inspect users with balances, tournament registrations, battle codes, and transactions.
              </p>
            </div>

            {/* Universal search input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Search by name, email, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white text-xs pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList className="bg-gray-900/80 border border-gray-700 p-1 flex-wrap h-auto gap-1">
              <TabsTrigger value="users" className="text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <Users className="w-3.5 h-3.5 mr-1.5" />
                Users & Balances ({filteredUsers.length})
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <Trophy className="w-3.5 h-3.5 mr-1.5" />
                Tournaments ({filteredTournaments.length})
              </TabsTrigger>
              <TabsTrigger value="codes" className="text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <Ticket className="w-3.5 h-3.5 mr-1.5" />
                Codes ({codesList.length})
              </TabsTrigger>
              <TabsTrigger value="transactions" className="text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                Recent Transactions ({filteredTransactions.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Users & Balances */}
            <TabsContent value="users">
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 bg-gray-900/60">
                      <TableHead className="text-gray-300 text-xs">User / Player</TableHead>
                      <TableHead className="text-gray-300 text-xs">Email</TableHead>
                      <TableHead className="text-gray-300 text-xs text-right">Available Balance</TableHead>
                      <TableHead className="text-gray-300 text-xs text-right">Total Deposited</TableHead>
                      <TableHead className="text-gray-300 text-xs text-right">Total Withdrawn</TableHead>
                      <TableHead className="text-gray-300 text-xs">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500 text-sm">
                          No users found matching your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map(user => (
                        <TableRow key={user.id} className="border-gray-700/60 hover:bg-gray-700/40">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center border border-purple-500/30">
                                {(user.username || user.full_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-white font-medium text-sm">
                                  {user.username || user.full_name || 'Anonymous User'}
                                </div>
                                <div className="text-gray-500 text-[11px] font-mono">
                                  {user.id.slice(0, 10)}...
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-300 text-xs">
                            {user.email || '—'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-purple-300 text-sm">
                            ₹{user.available_balance.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-400 text-xs">
                            ₹{user.total_deposited.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-medium text-orange-400 text-xs">
                            ₹{user.total_withdrawn.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tab 2: Tournaments */}
            <TabsContent value="tournaments">
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 bg-gray-900/60">
                      <TableHead className="text-gray-300 text-xs">Tournament Name</TableHead>
                      <TableHead className="text-gray-300 text-xs">Game</TableHead>
                      <TableHead className="text-gray-300 text-xs">Status</TableHead>
                      <TableHead className="text-gray-300 text-xs">Entry Fee</TableHead>
                      <TableHead className="text-gray-300 text-xs">Prize Pool</TableHead>
                      <TableHead className="text-gray-300 text-xs text-right">Total Registrations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTournaments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500 text-sm">
                          No tournaments found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTournaments.map(t => (
                        <TableRow key={t.id} className="border-gray-700/60 hover:bg-gray-700/40">
                          <TableCell className="text-white font-medium text-sm">
                            {t.name}
                          </TableCell>
                          <TableCell className="text-gray-300 text-xs">
                            {t.game}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${
                              t.status === 'ongoing' ? 'bg-green-500 text-white' :
                              t.status === 'upcoming' ? 'bg-blue-500 text-white' : 'bg-gray-600 text-gray-200'
                            }`}>
                              {t.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300 text-xs">
                            {t.entry_fee ? `₹${t.entry_fee}` : 'Free'}
                          </TableCell>
                          <TableCell className="text-yellow-400 font-semibold text-xs">
                            ₹{t.prize_pool}
                          </TableCell>
                          <TableCell className="text-right font-bold text-white text-sm">
                            {t.registrations_count}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tab 3: Codes */}
            <TabsContent value="codes">
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 bg-gray-900/60">
                      <TableHead className="text-gray-300 text-xs">Code</TableHead>
                      <TableHead className="text-gray-300 text-xs">Bonus Amount</TableHead>
                      <TableHead className="text-gray-300 text-xs">Uses / Limit</TableHead>
                      <TableHead className="text-gray-300 text-xs">Status</TableHead>
                      <TableHead className="text-gray-300 text-xs">Mode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codesList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500 text-sm">
                          No battle codes created yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      codesList.map(c => (
                        <TableRow key={c.id} className="border-gray-700/60 hover:bg-gray-700/40">
                          <TableCell className="font-mono font-bold text-purple-300 text-sm">
                            {c.code}
                          </TableCell>
                          <TableCell className="text-green-400 font-semibold text-sm">
                            ₹{c.bonus_amount}
                          </TableCell>
                          <TableCell className="text-gray-300 text-xs">
                            {c.current_uses} / {c.max_uses} uses
                          </TableCell>
                          <TableCell>
                            <Badge className={c.is_active ? 'bg-green-500' : 'bg-gray-600'}>
                              {c.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs uppercase">
                            {c.mode}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tab 4: Transactions */}
            <TabsContent value="transactions">
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 bg-gray-900/60">
                      <TableHead className="text-gray-300 text-xs">User</TableHead>
                      <TableHead className="text-gray-300 text-xs">Type</TableHead>
                      <TableHead className="text-gray-300 text-xs">Amount</TableHead>
                      <TableHead className="text-gray-300 text-xs">Status</TableHead>
                      <TableHead className="text-gray-300 text-xs">Method</TableHead>
                      <TableHead className="text-gray-300 text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500 text-sm">
                          No transactions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map(tx => (
                        <TableRow key={tx.id} className="border-gray-700/60 hover:bg-gray-700/40">
                          <TableCell className="text-white font-medium text-sm">
                            {tx.user_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`capitalize text-xs ${
                              tx.transaction_type === 'deposit' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                              tx.transaction_type === 'withdrawal' ? 'border-orange-500/50 text-orange-400 bg-orange-500/10' :
                              'border-purple-500/50 text-purple-400 bg-purple-500/10'
                            }`}>
                              {tx.transaction_type}
                            </Badge>
                          </TableCell>
                          <TableCell className={`font-bold text-sm ${
                            tx.transaction_type === 'deposit' ? 'text-green-400' :
                            tx.transaction_type === 'withdrawal' ? 'text-orange-400' : 'text-white'
                          }`}>
                            ₹{tx.amount.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${
                              tx.status === 'approved' ? 'bg-green-500' :
                              tx.status === 'pending' ? 'bg-yellow-500 text-black font-semibold' : 'bg-red-500'
                            }`}>
                              {tx.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs">
                            {tx.payment_method || '—'}
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs">
                            {new Date(tx.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAllDetails;
