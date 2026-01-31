import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldX, Loader2, Search, UserPlus, UserMinus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
}

const AdminRolesManager = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    action: 'grant' | 'revoke';
  }>({ open: false, userId: '', userName: '', action: 'grant' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, email, name')
        .order('email');

      if (profilesError) throw profilesError;

      // Fetch all admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        email: profile.email || 'No email',
        name: profile.name,
        isAdmin: adminUserIds.has(profile.user_id),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users list.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleGrantAdmin = async (userId: string) => {
    setProcessingUserId(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already Admin',
            description: 'This user already has admin access.',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Admin Access Granted',
          description: 'User now has admin privileges.',
        });
        await fetchUsers();
      }
    } catch (error) {
      console.error('Error granting admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to grant admin access.',
        variant: 'destructive',
      });
    } finally {
      setProcessingUserId(null);
      setConfirmDialog({ open: false, userId: '', userName: '', action: 'grant' });
    }
  };

  const handleRevokeAdmin = async (userId: string) => {
    setProcessingUserId(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      toast({
        title: 'Admin Access Revoked',
        description: 'User no longer has admin privileges.',
      });
      await fetchUsers();
    } catch (error) {
      console.error('Error revoking admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke admin access.',
        variant: 'destructive',
      });
    } finally {
      setProcessingUserId(null);
      setConfirmDialog({ open: false, userId: '', userName: '', action: 'revoke' });
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const adminUsers = filteredUsers.filter(u => u.isAdmin);
  const regularUsers = filteredUsers.filter(u => !u.isAdmin);

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-8">
          <div className="flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            <span className="ml-2 text-gray-400">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            Admin Role Management
          </CardTitle>
          <CardDescription className="text-gray-400">
            Grant or revoke admin access for registered users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* Current Admins */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              Current Administrators ({adminUsers.length})
            </h3>
            {adminUsers.length === 0 ? (
              <p className="text-gray-500 text-sm">No administrators found.</p>
            ) : (
              <div className="space-y-2">
                {adminUsers.map(user => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-green-500/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{user.name || 'Unnamed User'}</p>
                        <p className="text-gray-400 text-xs">{user.email}</p>
                      </div>
                      <Badge variant="outline" className="border-green-500/50 text-green-400">
                        Admin
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      onClick={() => setConfirmDialog({
                        open: true,
                        userId: user.user_id,
                        userName: user.name || user.email,
                        action: 'revoke'
                      })}
                      disabled={processingUserId === user.user_id}
                    >
                      {processingUserId === user.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserMinus className="w-4 h-4 mr-1" />
                          Revoke
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Regular Users */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <ShieldX className="w-4 h-4 text-gray-400" />
              Regular Users ({regularUsers.length})
            </h3>
            {regularUsers.length === 0 ? (
              <p className="text-gray-500 text-sm">No regular users found.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {regularUsers.map(user => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-gray-300 text-xs font-medium">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{user.name || 'Unnamed User'}</p>
                        <p className="text-gray-400 text-xs">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                      onClick={() => setConfirmDialog({
                        open: true,
                        userId: user.user_id,
                        userName: user.name || user.email,
                        action: 'grant'
                      })}
                      disabled={processingUserId === user.user_id}
                    >
                      {processingUserId === user.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-1" />
                          Make Admin
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
        <AlertDialogContent className="bg-gray-800 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {confirmDialog.action === 'grant' ? 'Grant Admin Access?' : 'Revoke Admin Access?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {confirmDialog.action === 'grant' 
                ? `This will give "${confirmDialog.userName}" full admin access to manage tournaments, players, and other administrative functions.`
                : `This will remove admin access from "${confirmDialog.userName}". They will no longer be able to access the admin panel.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={confirmDialog.action === 'grant' 
                ? 'bg-purple-500 hover:bg-purple-600' 
                : 'bg-red-500 hover:bg-red-600'
              }
              onClick={() => {
                if (confirmDialog.action === 'grant') {
                  handleGrantAdmin(confirmDialog.userId);
                } else {
                  handleRevokeAdmin(confirmDialog.userId);
                }
              }}
            >
              {confirmDialog.action === 'grant' ? 'Grant Access' : 'Revoke Access'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminRolesManager;
