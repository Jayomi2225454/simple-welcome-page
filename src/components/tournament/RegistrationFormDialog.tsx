import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Gamepad, Upload, Image, Loader2, QrCode, ChevronLeft, ChevronRight, CheckCircle, Copy, Download, ExternalLink, Trophy, CreditCard, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMode } from '@/contexts/ModeContext';

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  placeholder: string | null;
  options: string[] | null;
  display_order: number;
}

interface WalletQRCode {
  id: string;
  name: string;
  qr_image_url: string;
  upi_id: string | null;
  description: string | null;
  is_active: boolean;
  display_order: number;
  mode: string;
}

interface RegistrationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { gameId: string; customFields: Record<string, string>; screenshotUrl?: string }) => void;
  isLoading?: boolean;
  tournamentId: string;
  isPaid: boolean;
  entryFee: number;
}

const RegistrationFormDialog: React.FC<RegistrationFormDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  tournamentId,
  isPaid,
  entryFee
}) => {
  const { mode } = useMode();
  const { toast } = useToast();
  const walletMode = mode === 'sports' ? 'sports' : 'esports';
  
  const [gameId, setGameId] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [loadingFields, setLoadingFields] = useState(true);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  
  const [qrCodes, setQrCodes] = useState<WalletQRCode[]>([]);
  const [currentQRIndex, setCurrentQRIndex] = useState(0);
  const [loadingQRCodes, setLoadingQRCodes] = useState(false);

  useEffect(() => {
    if (open) {
      loadCustomFields();
      if (isPaid) {
        loadQRCodes();
      }
    }
  }, [open, tournamentId, isPaid]);

  const loadCustomFields = async () => {
    setLoadingFields(true);
    try {
      const { data, error } = await supabase
        .from('tournament_custom_fields')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCustomFields(data || []);
    } catch (error) {
      console.error('Error loading custom fields:', error);
    } finally {
      setLoadingFields(false);
    }
  };

  const loadQRCodes = async () => {
    setLoadingQRCodes(true);
    try {
      const { data, error } = await supabase
        .from('wallet_qr_codes')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      const filteredQRs = (data || []).filter(qr => 
        qr.mode === walletMode || qr.mode === 'both'
      );
      setQrCodes(filteredQRs);
    } catch (error) {
      console.error('Error loading QR codes:', error);
    } finally {
      setLoadingQRCodes(false);
    }
  };

  const nextQRCode = () => setCurrentQRIndex((prev) => (prev + 1) % qrCodes.length);
  const prevQRCode = () => setCurrentQRIndex((prev) => (prev - 1 + qrCodes.length) % qrCodes.length);

  const copyUpiId = async (upiId: string) => {
    try {
      await navigator.clipboard.writeText(upiId);
      toast({ title: "Copied!", description: "UPI ID copied to clipboard" });
    } catch {
      toast({ title: "Copy Failed", description: "Please copy manually", variant: "destructive" });
    }
  };

  const openQRCode = (url: string) => window.open(url, '_blank');

  const downloadQRCode = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${name.replace(/\s+/g, '-')}-QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast({ title: "Downloaded!", description: "QR code saved to your device" });
    } catch {
      toast({ title: "Download Failed", description: "Please try opening and saving manually", variant: "destructive" });
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => setScreenshotPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadScreenshot = async (): Promise<string | undefined> => {
    if (!screenshot) return undefined;
    setUploadingScreenshot(true);
    try {
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `tournament-${tournamentId}-${Date.now()}.${fileExt}`;
      const filePath = `registrations/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('payment-screenshots').upload(filePath, screenshot);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('payment-screenshots').getPublicUrl(filePath);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      return undefined;
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameId.trim()) return;
    for (const field of customFields) {
      if (field.is_required && !customFieldValues[field.field_name]?.trim()) return;
    }
    if (isPaid && !screenshot) return;

    let screenshotUrl: string | undefined;
    if (screenshot) screenshotUrl = await uploadScreenshot();

    onSubmit({ gameId: gameId.trim(), customFields: customFieldValues, screenshotUrl });
    setGameId('');
    setCustomFieldValues({});
    setScreenshot(null);
    setScreenshotPreview('');
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const renderCustomField = (field: CustomField) => {
    const value = customFieldValues[field.field_name] || '';

    switch (field.field_type) {
      case 'select': {
        const validOptions = field.options?.filter(option => option && option.trim() !== '') || [];
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.field_name, val)}>
            <SelectTrigger className="bg-gray-800/60 border-gray-600 text-white h-11 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
              <SelectValue placeholder={field.placeholder || `Select ${field.field_label}`} />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 z-50">
              {validOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
            placeholder={field.placeholder || ''}
            className="bg-gray-800/60 border-gray-600 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 min-h-[80px]"
            required={field.is_required}
          />
        );
      default:
        return (
          <Input
            type={field.field_type === 'number' ? 'number' : field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : 'text'}
            value={value}
            onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
            placeholder={field.placeholder || ''}
            className="bg-gray-800/60 border-gray-600 text-white placeholder-gray-500 h-11 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            required={field.is_required}
          />
        );
    }
  };

  const isFormValid = () => {
    if (!gameId.trim()) return false;
    for (const field of customFields) {
      if (field.is_required && !customFieldValues[field.field_name]?.trim()) return false;
    }
    if (isPaid && !screenshot) return false;
    return true;
  };

  const totalFields = 1 + customFields.length; // gameId + custom fields

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-gray-700/50 max-w-lg max-h-[90vh] overflow-y-auto p-0 rounded-2xl shadow-2xl">
        {/* Header with gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-indigo-600/20" />
          <div className="relative px-6 pt-6 pb-4">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-white text-xl font-bold">
                    Tournament Registration
                  </DialogTitle>
                  <p className="text-gray-400 text-sm mt-0.5">
                    Fill in your details to join
                  </p>
                </div>
              </div>
            </DialogHeader>

            {/* Entry fee badge */}
            <div className="mt-4 flex items-center gap-2">
              <Badge className={`${isPaid ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30'} px-3 py-1 text-sm`}>
                {isPaid ? <CreditCard className="w-3.5 h-3.5 mr-1.5" /> : <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
                {isPaid ? `Entry Fee: ₹${entryFee}` : 'Free Entry'}
              </Badge>
              <Badge variant="outline" className="border-gray-600 text-gray-400 px-3 py-1 text-xs">
                {totalFields} {totalFields === 1 ? 'field' : 'fields'} to fill
              </Badge>
            </div>
          </div>
        </div>
        
        {loadingFields ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-3">
              <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
            </div>
            <p className="text-gray-400 text-sm">Loading registration form...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 px-6 py-4">
              {/* Game ID Field - Always present */}
              <div className="space-y-2">
                <Label htmlFor="gameId" className="text-gray-200 font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-400" />
                  Game ID (In-Game Username) <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="gameId"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  placeholder="Enter your in-game username"
                  className="bg-gray-800/60 border-gray-600 text-white placeholder-gray-500 h-11 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  required
                />
              </div>

              {/* Custom Fields */}
              {customFields.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-px flex-1 bg-gray-700/50" />
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Additional Info</span>
                    <div className="h-px flex-1 bg-gray-700/50" />
                  </div>
                  {customFields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label className="text-gray-200 font-medium">
                        {field.field_label}
                        {field.is_required && <span className="text-red-400 ml-1">*</span>}
                      </Label>
                      {renderCustomField(field)}
                    </div>
                  ))}
                </div>
              )}

              {/* Payment Section */}
              {isPaid && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-px flex-1 bg-amber-500/20" />
                    <span className="text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> Payment
                    </span>
                    <div className="h-px flex-1 bg-amber-500/20" />
                  </div>

                  {/* Payment Instructions */}
                  <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-2">
                    <p className="text-sm font-semibold text-blue-300">How to pay:</p>
                    <ol className="text-xs text-blue-200/80 space-y-2">
                      {['Scan the QR code using any UPI app', `Pay exactly ₹${entryFee}`, 'Take a screenshot of success', 'Upload it below'].map((step, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  
                  {/* QR Code */}
                  {loadingQRCodes ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                    </div>
                  ) : qrCodes.length > 0 ? (
                    <div className="space-y-3">
                      <div className="relative bg-white rounded-xl p-4 mx-auto max-w-[200px] shadow-lg">
                        <img 
                          src={qrCodes[currentQRIndex]?.qr_image_url} 
                          alt={qrCodes[currentQRIndex]?.name}
                          className="w-full h-auto rounded-lg"
                        />
                        {qrCodes.length > 1 && (
                          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-1">
                            <Button type="button" variant="ghost" size="icon" onClick={prevQRCode} className="bg-black/50 hover:bg-black/70 text-white rounded-full h-7 w-7">
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={nextQRCode} className="bg-black/50 hover:bg-black/70 text-white rounded-full h-7 w-7">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-sm font-medium text-white">{qrCodes[currentQRIndex]?.name}</p>
                        {qrCodes[currentQRIndex]?.upi_id && (
                          <div className="flex items-center justify-center gap-2">
                            <code className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">{qrCodes[currentQRIndex]?.upi_id}</code>
                            <Button type="button" variant="ghost" size="icon" onClick={() => copyUpiId(qrCodes[currentQRIndex]?.upi_id || '')} className="h-6 w-6 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20">
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                        {qrCodes.length > 1 && (
                          <p className="text-xs text-gray-500">{currentQRIndex + 1} / {qrCodes.length}</p>
                        )}
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <Button type="button" variant="outline" size="sm" onClick={() => openQRCode(qrCodes[currentQRIndex]?.qr_image_url || '')} className="text-xs bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg h-8">
                            <ExternalLink className="w-3 h-3 mr-1" /> Open
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => downloadQRCode(qrCodes[currentQRIndex]?.qr_image_url || '', qrCodes[currentQRIndex]?.name || 'QR')} className="text-xs bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg h-8">
                            <Download className="w-3 h-3 mr-1" /> Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-300 text-center py-2">Contact admin for payment details</p>
                  )}
                  
                  {/* Screenshot Upload */}
                  <div className="space-y-2">
                    <Label className="text-amber-200 font-medium">
                      Upload Payment Screenshot <span className="text-red-400">*</span>
                    </Label>
                    <label className="cursor-pointer block">
                      <div className={`flex items-center justify-center p-5 border-2 border-dashed rounded-xl transition-all ${screenshotPreview ? 'border-green-500/50 bg-green-500/5' : 'border-gray-600 hover:border-purple-500/50 bg-gray-800/30 hover:bg-gray-800/50'}`}>
                        {screenshotPreview ? (
                          <div className="relative">
                            <img src={screenshotPreview} alt="Payment screenshot" className="max-h-36 rounded-lg shadow-lg" />
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-gray-400">
                            <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center">
                              <Upload className="w-5 h-5" />
                            </div>
                            <span className="text-sm">Tap to upload screenshot</span>
                            <span className="text-xs text-gray-500">JPG, PNG up to 5MB</span>
                          </div>
                        )}
                      </div>
                      <input type="file" accept="image/*" onChange={handleScreenshotChange} className="hidden" />
                    </label>
                    {screenshot && (
                      <p className="text-xs text-green-400 flex items-center gap-1">
                        <Image className="w-3.5 h-3.5" />
                        {screenshot.name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-800 bg-gray-950/50">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800 rounded-xl h-11"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isFormValid() || isLoading || uploadingScreenshot}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl h-11 shadow-lg shadow-purple-500/20 disabled:opacity-50"
                >
                  {isLoading || uploadingScreenshot ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {uploadingScreenshot ? 'Uploading...' : 'Registering...'}
                    </>
                  ) : isPaid ? (
                    'Submit Registration'
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Registration
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationFormDialog;
