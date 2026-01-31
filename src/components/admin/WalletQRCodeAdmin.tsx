import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, QrCode, Loader2, Image } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/ui/file-upload';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WalletQRCode {
  id: string;
  name: string;
  qr_image_url: string;
  upi_id: string | null;
  description: string | null;
  is_active: boolean;
  display_order: number;
  mode: string;
  created_at: string;
  updated_at: string;
}

const WalletQRCodeAdmin = () => {
  const { toast } = useToast();
  const [qrCodes, setQrCodes] = useState<WalletQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingQR, setEditingQR] = useState<WalletQRCode | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    qr_image_url: '',
    upi_id: '',
    description: '',
    is_active: true,
    display_order: 0,
    mode: 'esports'
  });

  useEffect(() => {
    loadQRCodes();
  }, []);

  const loadQRCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_qr_codes')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setQrCodes(data || []);
    } catch (error) {
      console.error('Error loading QR codes:', error);
      toast({
        title: "Error",
        description: "Failed to load QR codes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      qr_image_url: '',
      upi_id: '',
      description: '',
      is_active: true,
      display_order: 0,
      mode: 'esports'
    });
    setEditingQR(null);
    setShowAddForm(false);
  };

  const handleEdit = (qr: WalletQRCode) => {
    setFormData({
      name: qr.name,
      qr_image_url: qr.qr_image_url,
      upi_id: qr.upi_id || '',
      description: qr.description || '',
      is_active: qr.is_active,
      display_order: qr.display_order,
      mode: qr.mode
    });
    setEditingQR(qr);
    setShowAddForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a name for the QR code",
        variant: "destructive"
      });
      return;
    }

    if (!formData.qr_image_url.trim()) {
      toast({
        title: "Validation Error",
        description: "Please upload a QR code image",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      const dataToSave = {
        name: formData.name,
        qr_image_url: formData.qr_image_url,
        upi_id: formData.upi_id || null,
        description: formData.description || null,
        is_active: formData.is_active,
        display_order: formData.display_order,
        mode: formData.mode
      };

      if (editingQR) {
        const { error } = await supabase
          .from('wallet_qr_codes')
          .update(dataToSave)
          .eq('id', editingQR.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "QR code updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('wallet_qr_codes')
          .insert([dataToSave]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "QR code added successfully"
        });
      }

      resetForm();
      loadQRCodes();
    } catch (error) {
      console.error('Error saving QR code:', error);
      toast({
        title: "Error",
        description: "Failed to save QR code",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this QR code?')) return;

    try {
      const { error } = await supabase
        .from('wallet_qr_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "QR code deleted successfully"
      });
      loadQRCodes();
    } catch (error) {
      console.error('Error deleting QR code:', error);
      toast({
        title: "Error",
        description: "Failed to delete QR code",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (qr: WalletQRCode) => {
    try {
      const { error } = await supabase
        .from('wallet_qr_codes')
        .update({ is_active: !qr.is_active })
        .eq('id', qr.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `QR code ${qr.is_active ? 'deactivated' : 'activated'} successfully`
      });
      loadQRCodes();
    } catch (error) {
      console.error('Error toggling QR code:', error);
      toast({
        title: "Error",
        description: "Failed to update QR code status",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <span className="ml-2 text-gray-400">Loading QR codes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Wallet QR Codes</h2>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="bg-purple-500 hover:bg-purple-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add QR Code
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <QrCode className="w-5 h-5 mr-2" />
              {editingQR ? 'Edit QR Code' : 'Add New QR Code'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Google Pay, PhonePe"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">UPI ID</Label>
                <Input
                  value={formData.upi_id}
                  onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                  placeholder="e.g., user@gpay"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">Mode</Label>
                <Select
                  value={formData.mode}
                  onValueChange={(value) => setFormData({ ...formData, mode: value })}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="esports">Esports</SelectItem>
                    <SelectItem value="sports">Offline Sports</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Display Order</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description or payment instructions"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">QR Code Image *</Label>
              <FileUpload
                onUpload={(url) => setFormData({ ...formData, qr_image_url: url })}
                bucket="tournament-banners"
                accept="image/*"
              />
              {formData.qr_image_url && (
                <div className="mt-2 flex items-center gap-4">
                  <img 
                    src={formData.qr_image_url} 
                    alt="QR Preview" 
                    className="w-32 h-32 object-contain bg-white rounded-lg p-2"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, qr_image_url: '' })}
                    className="text-red-400 border-red-400 hover:bg-red-400/10"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label className="text-gray-300">Active (visible to users)</Label>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="bg-green-500 hover:bg-green-600"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingQR ? 'Update' : 'Add'} QR Code
              </Button>
              <Button 
                variant="outline" 
                onClick={resetForm}
                className="border-gray-600 text-gray-300"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Codes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {qrCodes.map((qr) => (
          <Card key={qr.id} className={`bg-gray-800 border-gray-700 ${!qr.is_active ? 'opacity-50' : ''}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-white">{qr.name}</h3>
                  {qr.upi_id && <p className="text-sm text-gray-400">{qr.upi_id}</p>}
                  <span className={`inline-block px-2 py-0.5 text-xs rounded mt-1 ${
                    qr.mode === 'esports' ? 'bg-purple-500/20 text-purple-400' :
                    qr.mode === 'sports' ? 'bg-green-500/20 text-green-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {qr.mode === 'both' ? 'All Modes' : qr.mode}
                  </span>
                </div>
                <Switch
                  checked={qr.is_active}
                  onCheckedChange={() => toggleActive(qr)}
                />
              </div>

              <div className="bg-white rounded-lg p-2 mb-3">
                <img 
                  src={qr.qr_image_url} 
                  alt={qr.name} 
                  className="w-full h-40 object-contain"
                />
              </div>

              {qr.description && (
                <p className="text-sm text-gray-400 mb-3">{qr.description}</p>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(qr)}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(qr.id)}
                  className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {qrCodes.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No QR codes added yet</p>
            <p className="text-sm">Click "Add QR Code" to create your first payment QR code</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletQRCodeAdmin;
