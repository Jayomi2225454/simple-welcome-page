import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { walletService, WalletBalance, WalletTransaction } from '@/services/walletService';
import { 
  User, 
  Mail, 
  Phone, 
  Gamepad2, 
  Loader2, 
  Wallet, 
  Trophy, 
  TrendingUp,
  Edit,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  phone_number: string | null;
  game_id: string | null;
  in_game_name: string | null;
  avatar_url: string | null;
  earnings: number | null;
}

interface TournamentRegistration {
  id: string;
  tournament_id: string;
  player_name: string;
  game_id: string;
  status: string;
  payment_amount: number;
  created_at: string;
  tournaments?: {
    name: string;
  };
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    display_name: '',
    phone_number: '',
    game_id: '',
    in_game_name: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadAllData();
  }, [user]);

  const loadAllData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      await Promise.all([
        loadProfile(),
        loadWalletData(),
        loadTournamentRegistrations(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading profile:', error);
      return;
    }
    
    if (data) {
      setProfile(data as UserProfile);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        display_name: data.display_name || '',
        phone_number: data.phone_number || '',
        game_id: data.game_id || '',
        in_game_name: (data as any).in_game_name || '',
      });
    }
  };

  const loadWalletData = async () => {
    if (!user) return;
    
    // Load esports wallet by default for profile page
    const [balance, txns] = await Promise.all([
      walletService.getUserBalance(user.id, 'esports'),
      walletService.getUserTransactions(user.id, 'esports'),
    ]);
    
    setWalletBalance(balance);
    setTransactions(txns.slice(0, 5));
  };

  const loadTournamentRegistrations = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select(`
        *,
        tournaments:tournament_id (name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error loading registrations:', error);
      return;
    }
    
    setRegistrations(data || []);
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          ...formData,
          email: user.email,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
      
      setEditDialogOpen(false);
      loadProfile();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  const displayName = profile?.display_name || profile?.first_name || user.email?.split('@')[0] || 'User';
  const fullName = profile?.first_name && profile?.last_name 
    ? `${profile.first_name} ${profile.last_name}` 
    : profile?.first_name || displayName;
  const earnings = profile?.earnings || walletBalance?.total_deposited || 0;

  return (
    <Layout>
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              <span className="ml-2 text-gray-400">Loading profile...</span>
            </div>
          ) : (
            <>
              {/* Profile Header - Matching main site style */}
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-2xl" />
                <div className="relative bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    <Avatar className="w-24 h-24 border-4 border-purple-500/30 ring-4 ring-purple-500/10">
                      <AvatarImage src={profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-3xl font-bold">
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center md:text-left flex-1">
                      <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{displayName}</h1>
                      <p className="text-gray-400 mb-4">Esports Player • {user.email}</p>
                      <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        {profile?.game_id && (
                          <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/50 px-4 py-1.5">
                            <Gamepad2 className="w-4 h-4 mr-2" />
                            ID: {profile.game_id}
                          </Badge>
                        )}
                        <Badge className="bg-green-500/20 text-green-400 border border-green-500/50 px-4 py-1.5">
                          <Trophy className="w-4 h-4 mr-2" />
                          ₹{earnings} earned
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Profile Settings Card */}
                <Card className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Settings className="w-5 h-5 text-purple-400" />
                      Profile Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-purple-400 mb-1">Name</p>
                        <p className="text-white font-medium">{fullName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-purple-400 mb-1">Game ID</p>
                        <p className="text-white font-medium">{profile?.game_id || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-purple-400 mb-1">Display Name</p>
                        <p className="text-white font-medium">{profile?.display_name || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-purple-400 mb-1">In Game Name</p>
                        <p className="text-white font-medium">{profile?.in_game_name || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="border-t border-gray-700 pt-4">
                      <p className="text-xs text-purple-400 mb-1">Email</p>
                      <p className="text-white font-medium">{user.email}</p>
                    </div>
                    
                    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-800 border-gray-700">
                        <DialogHeader>
                          <DialogTitle className="text-white">Edit Profile</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="first_name" className="text-gray-400">First Name</Label>
                              <Input
                                id="first_name"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                placeholder="First name"
                                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="last_name" className="text-gray-400">Last Name</Label>
                              <Input
                                id="last_name"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                placeholder="Last name"
                                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="display_name" className="text-gray-400">Display Name</Label>
                            <Input
                              id="display_name"
                              value={formData.display_name}
                              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                              placeholder="Display name"
                              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone_number" className="text-gray-400">Phone Number</Label>
                            <Input
                              id="phone_number"
                              value={formData.phone_number}
                              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                              placeholder="Phone number"
                              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="game_id" className="text-gray-400">Game ID</Label>
                            <Input
                              id="game_id"
                              value={formData.game_id}
                              onChange={(e) => setFormData({ ...formData, game_id: e.target.value })}
                              placeholder="Your game ID"
                              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="in_game_name" className="text-gray-400">In Game Name</Label>
                            <Input
                              id="in_game_name"
                              value={formData.in_game_name}
                              onChange={(e) => setFormData({ ...formData, in_game_name: e.target.value })}
                              placeholder="Your in-game name / IGN"
                              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            />
                          </div>
                          <Button 
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                          >
                            {saving ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                            ) : (
                              'Save Changes'
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>

                {/* Wallet Balance Card */}
                <Card className="bg-gray-800/50 border-gray-700 hover:border-green-500/50 transition-all duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Wallet className="w-5 h-5 text-green-400" />
                      Wallet Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-6 text-center border border-green-500/30">
                      <p className="text-sm text-gray-400 mb-1">Available Balance</p>
                      <p className="text-4xl font-bold text-green-400">₹{walletBalance?.available_balance || 0}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-700/50 rounded-lg p-4 text-center border border-gray-600/50">
                        <p className="text-xs text-gray-400 mb-1">Total Deposited</p>
                        <p className="text-lg font-semibold text-white">₹{walletBalance?.total_deposited || 0}</p>
                      </div>
                      <div className="bg-gray-700/50 rounded-lg p-4 text-center border border-gray-600/50">
                        <p className="text-xs text-gray-400 mb-1">Total Withdrawn</p>
                        <p className="text-lg font-semibold text-white">₹{walletBalance?.total_withdrawn || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tournament History Card */}
                <Card className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Trophy className="w-5 h-5 text-yellow-400" />
                      Tournament History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {registrations.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No tournaments yet</p>
                    ) : (
                      <div className="space-y-3">
                        {registrations.map((reg) => (
                          <div key={reg.id} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30 hover:border-purple-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-medium text-white text-sm">
                                {reg.tournaments?.name || `Tournament #${reg.tournament_id.slice(0, 8)}`}
                              </p>
                              <Badge 
                                className={
                                  reg.status === 'registered' 
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/50 text-xs' 
                                    : 'bg-gray-600/20 text-gray-400 border border-gray-500/50 text-xs'
                                }
                              >
                                {reg.status || 'Registered'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-purple-400">Player</p>
                                <p className="text-white">{reg.player_name}</p>
                              </div>
                              <div>
                                <p className="text-purple-400">Game ID</p>
                                <p className="text-white">{reg.game_id}</p>
                              </div>
                              <div>
                                <p className="text-purple-400">Entry Fee</p>
                                <p className="text-white">₹{reg.payment_amount || 0}</p>
                              </div>
                              <div>
                                <p className="text-purple-400">Date</p>
                                <p className="text-white">
                                  {format(new Date(reg.created_at), 'dd/MM/yyyy')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats Card */}
                <Card className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl p-6 text-center border border-purple-500/30">
                        <Trophy className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">{registrations.length}</p>
                        <p className="text-xs text-purple-400">Tournaments</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-6 text-center border border-green-500/30">
                        <Trophy className="w-6 h-6 text-green-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">₹{earnings}</p>
                        <p className="text-xs text-green-400">Earnings</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Transactions Card */}
                <Card className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all duration-300 lg:col-span-2">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                      Recent Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transactions.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No transactions yet</p>
                    ) : (
                      <div className="space-y-3">
                        {transactions.map((txn) => (
                          <div key={txn.id} className="flex items-center justify-between bg-gray-700/30 rounded-lg p-4 border border-gray-600/30 hover:border-purple-500/30 transition-colors">
                            <div>
                              <p className="font-medium text-white capitalize">{txn.transaction_type.replace('_', ' ')}</p>
                              <p className="text-xs text-gray-400">
                                {format(new Date(txn.created_at), 'dd/MM/yyyy HH:mm')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold ${
                                ['deposit', 'prize_credit'].includes(txn.transaction_type)
                                  ? 'text-green-400' 
                                  : 'text-red-400'
                              }`}>
                                {['deposit', 'prize_credit'].includes(txn.transaction_type) ? '+' : '-'}₹{txn.amount}
                              </p>
                              <Badge 
                                className={
                                  txn.status === 'approved' 
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/50 text-xs' 
                                    : txn.status === 'pending'
                                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50 text-xs'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/50 text-xs'
                                }
                              >
                                {txn.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
