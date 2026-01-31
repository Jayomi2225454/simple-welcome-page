import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Ticket, Gift, Users, Calendar } from 'lucide-react';
import { battleCodeService, BattleCode, BattleCodeMode } from '@/services/battleCodeService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BattleCodeAdminProps {
  mode?: BattleCodeMode;
}

const BattleCodeAdmin = ({ mode = 'esports' }: BattleCodeAdminProps) => {
  const [codes, setCodes] = useState<BattleCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCode, setEditingCode] = useState<BattleCode | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    bonus_amount: '',
    max_uses: '1',
    is_active: true,
    expires_at: ''
  });

  useEffect(() => {
    loadCodes();
  }, [mode]);

  const loadCodes = async () => {
    try {
      const data = await battleCodeService.getAllCodes(mode);
      setCodes(data);
    } catch (error) {
      console.error('Failed to load codes:', error);
      toast({
        title: "Error",
        description: "Failed to load battle codes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      bonus_amount: '',
      max_uses: '1',
      is_active: true,
      expires_at: ''
    });
    setEditingCode(null);
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.bonus_amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingCode) {
        await battleCodeService.updateCode(editingCode.id, {
          code: formData.code.toUpperCase(),
          bonus_amount: parseFloat(formData.bonus_amount),
          max_uses: parseInt(formData.max_uses) || 1,
          is_active: formData.is_active,
          expires_at: formData.expires_at || null
        });
        toast({
          title: "Code Updated",
          description: "Battle code has been updated successfully"
        });
      } else {
        await battleCodeService.createCode({
          code: formData.code.toUpperCase(),
          bonus_amount: parseFloat(formData.bonus_amount),
          max_uses: parseInt(formData.max_uses) || 1,
          is_active: formData.is_active,
          expires_at: formData.expires_at || null,
          created_by: null,
          mode: mode
        });
        toast({
          title: "Code Created",
          description: "Battle code has been created successfully"
        });
      }
      
      setShowCreateDialog(false);
      resetForm();
      loadCodes();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save battle code",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (code: BattleCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      bonus_amount: code.bonus_amount.toString(),
      max_uses: code.max_uses.toString(),
      is_active: code.is_active,
      expires_at: code.expires_at ? code.expires_at.split('T')[0] : ''
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this code?')) return;
    
    try {
      await battleCodeService.deleteCode(id);
      toast({
        title: "Code Deleted",
        description: "Battle code has been deleted"
      });
      loadCodes();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete battle code",
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (code: BattleCode) => {
    try {
      await battleCodeService.updateCode(code.id, { is_active: !code.is_active });
      loadCodes();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update code status",
        variant: "destructive"
      });
    }
  };

  const modeLabel = mode === 'esports' ? 'Esports' : 'Offline Sports';
  const modeColor = mode === 'esports' ? 'purple' : 'emerald';

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="text-center text-gray-400">Loading {modeLabel} battle codes...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode Indicator */}
      <div className={`inline-flex items-center px-4 py-2 rounded-full bg-${modeColor}-500/20 border border-${modeColor}-500/30`}>
        <div className={`w-2 h-2 rounded-full bg-${modeColor}-400 mr-2 animate-pulse`} />
        <span className={`text-${modeColor}-400 font-medium`}>{modeLabel} Battle Codes</span>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-500/30">
          <CardContent className="p-6 text-center">
            <Ticket className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{codes.length}</div>
            <div className="text-purple-300 text-sm">Total Codes</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-500/30">
          <CardContent className="p-6 text-center">
            <Gift className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {codes.filter(c => c.is_active).length}
            </div>
            <div className="text-green-300 text-sm">Active Codes</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-500/30">
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {codes.reduce((acc, c) => acc + c.current_uses, 0)}
            </div>
            <div className="text-blue-300 text-sm">Total Redemptions</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center">
            <Ticket className="w-5 h-5 mr-2" />
            {modeLabel} Battle Code Management
          </CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Code
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle>
                  {editingCode ? 'Edit Battle Code' : `Create ${modeLabel} Battle Code`}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Code *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., BONUS100"
                    className="bg-gray-800 border-gray-600 text-white uppercase"
                  />
                </div>
                
                <div>
                  <Label>Bonus Amount (₹) *</Label>
                  <Input
                    type="number"
                    value={formData.bonus_amount}
                    onChange={(e) => setFormData({ ...formData, bonus_amount: e.target.value })}
                    placeholder="e.g., 100"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                
                <div>
                  <Label>Max Uses</Label>
                  <Input
                    type="number"
                    value={formData.max_uses}
                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    placeholder="1"
                    min="1"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                
                <div>
                  <Label>Expires At (Optional)</Label>
                  <Input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Active</Label>
                </div>
                
                <Button 
                  onClick={handleSubmit}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {editingCode ? 'Update Code' : 'Create Code'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent>
          {codes.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No {modeLabel.toLowerCase()} battle codes created yet
            </div>
          ) : (
            <div className="space-y-4">
              {codes.map((code) => (
                <Card key={code.id} className="bg-gray-700 border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 rounded-xl bg-purple-500">
                          <Ticket className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-mono font-bold text-lg">
                              {code.code}
                            </span>
                            <Badge className={code.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                              {code.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="text-green-400 font-semibold">
                            ₹{code.bonus_amount} Bonus
                          </div>
                          <div className="flex flex-wrap gap-2 text-gray-400 text-xs mt-1">
                            <span className="flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              {code.current_uses}/{code.max_uses} uses
                            </span>
                            {code.expires_at && (
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                Expires: {format(new Date(code.expires_at), 'dd/MM/yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={code.is_active}
                          onCheckedChange={() => handleToggleActive(code)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(code)}
                          className="border-gray-500 text-gray-300"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(code.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BattleCodeAdmin;
