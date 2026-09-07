import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Trophy, Users, PlayCircle, Medal, DollarSign, Ticket } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SportsTournamentsAdmin from '@/components/sports/admin/SportsTournamentsAdmin';
import SportsLiveMatchesAdmin from '@/components/sports/admin/SportsLiveMatchesAdmin';
import SportsLeaderboardsAdmin from '@/components/sports/admin/SportsLeaderboardsAdmin';
import SportsRegistrationsAdmin from '@/components/sports/admin/SportsRegistrationsAdmin';
import WalletAdmin from '@/components/admin/WalletAdmin';
import BattleCodeAdmin from '@/components/admin/BattleCodeAdmin';

const SportsAdmin = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin: authIsAdmin } = useAuth();
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('bm_is_admin') === 'true';
  });
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setCheckingAdmin(false);
        return;
      }

      const cachedAdmin = authIsAdmin || localStorage.getItem(`bm_admin_${user.id}`) === 'true';
      if (cachedAdmin) {
        setIsAdmin(true);
        setCheckingAdmin(false);
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (!error && data === true) {
          setIsAdmin(true);
          localStorage.setItem(`bm_admin_${user.id}`, 'true');
          localStorage.setItem('bm_is_admin', 'true');
        } else if (!error && data === false) {
          setIsAdmin(false);
          localStorage.setItem(`bm_admin_${user.id}`, 'false');
          localStorage.setItem('bm_is_admin', 'false');
          toast.error('Access denied. Admin privileges required.');
          navigate('/sports');
        } else if (error && !cachedAdmin) {
          toast.error('Failed to verify admin access');
          navigate('/sports');
        }
      } catch {
        if (!cachedAdmin) {
          toast.error('Failed to verify admin access');
          navigate('/sports');
        }
      } finally {
        setCheckingAdmin(false);
      }
    };

    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else {
        checkAdminRole();
      }
    }
  }, [user, loading, authIsAdmin, navigate]);

  if (loading || checkingAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">Sports Admin Panel</h1>
            <p className="text-gray-400">Manage offline sports tournaments, matches, athletes, and finances</p>
          </div>
        </div>

        <Tabs defaultValue="tournaments" className="w-full">
          <TabsList className="bg-gray-800/50 border border-gray-700 mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="tournaments" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Trophy className="w-4 h-4 mr-2" />
              Tournaments
            </TabsTrigger>
            <TabsTrigger value="registrations" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Users className="w-4 h-4 mr-2" />
              Registrations
            </TabsTrigger>
            <TabsTrigger value="live-matches" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <PlayCircle className="w-4 h-4 mr-2" />
              Live Matches
            </TabsTrigger>
            <TabsTrigger value="leaderboards" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Medal className="w-4 h-4 mr-2" />
              Leaderboards
            </TabsTrigger>
            <TabsTrigger value="wallet" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <DollarSign className="w-4 h-4 mr-2" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="battle-codes" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Ticket className="w-4 h-4 mr-2" />
              Battle Codes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tournaments">
            <SportsTournamentsAdmin />
          </TabsContent>

          <TabsContent value="registrations">
            <SportsRegistrationsAdmin />
          </TabsContent>

          <TabsContent value="live-matches">
            <SportsLiveMatchesAdmin />
          </TabsContent>

          <TabsContent value="leaderboards">
            <SportsLeaderboardsAdmin />
          </TabsContent>

          <TabsContent value="wallet">
            <WalletAdmin />
          </TabsContent>

          <TabsContent value="battle-codes">
            <BattleCodeAdmin />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SportsAdmin;
