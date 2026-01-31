import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Image, Loader2, AlertTriangle, QrCode, ChevronLeft, ChevronRight, CheckCircle, Copy, Download, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMode } from '@/contexts/ModeContext';

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

interface PaymentRetryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (screenshotUrl: string) => void;
  isLoading?: boolean;
  tournamentId: string;
  entryFee: number;
  rejectionReason?: string;
}

const PaymentRetryDialog: React.FC<PaymentRetryDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  tournamentId,
  entryFee,
  rejectionReason
}) => {
  const { mode } = useMode();
  const { toast } = useToast();
  const walletMode = mode === 'sports' ? 'sports' : 'esports';
  
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  
  // QR Code state
  const [qrCodes, setQrCodes] = useState<WalletQRCode[]>([]);
  const [currentQRIndex, setCurrentQRIndex] = useState(0);
  const [loadingQRCodes, setLoadingQRCodes] = useState(false);

  useEffect(() => {
    if (open) {
      loadQRCodes();
    }
  }, [open]);

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

  const nextQRCode = () => {
    setCurrentQRIndex((prev) => (prev + 1) % qrCodes.length);
  };

  const prevQRCode = () => {
    setCurrentQRIndex((prev) => (prev - 1 + qrCodes.length) % qrCodes.length);
  };

  const copyUpiId = async (upiId: string) => {
    try {
      await navigator.clipboard.writeText(upiId);
      toast({
        title: "Copied!",
        description: "UPI ID copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy manually",
        variant: "destructive"
      });
    }
  };

  const openQRCode = (url: string) => {
    window.open(url, '_blank');
  };

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
      toast({
        title: "Downloaded!",
        description: "QR code saved to your device",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Please try opening and saving manually",
        variant: "destructive"
      });
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!screenshot) return;

    setUploadingScreenshot(true);
    try {
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `tournament-${tournamentId}-retry-${Date.now()}.${fileExt}`;
      const filePath = `registrations/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(filePath, screenshot);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-screenshots')
        .getPublicUrl(filePath);

      onSubmit(publicUrl);
      
      // Reset form
      setScreenshot(null);
      setScreenshotPreview('');
    } catch (error) {
      console.error('Error uploading screenshot:', error);
    } finally {
      setUploadingScreenshot(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Retry Payment
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {rejectionReason && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-300">
                  <strong>Previous rejection reason:</strong> {rejectionReason}
                </p>
              </div>
            )}

            <div className="space-y-4 p-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-200">
                <QrCode className="w-5 h-5" />
                <Label className="text-yellow-200 font-semibold">
                  Payment - Entry Fee: ₹{entryFee}
                </Label>
              </div>
              
              {/* Payment Instructions */}
              <div className="space-y-2 p-3 bg-blue-500/10 border border-blue-400/20 rounded-lg">
                <p className="text-sm font-medium text-blue-300">How to complete payment:</p>
                <ol className="text-xs text-blue-200/80 space-y-1.5 list-decimal list-inside">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-0.5 text-blue-400 flex-shrink-0" />
                    <span>Scan the QR code using any UPI app (GPay, PhonePe, Paytm)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-0.5 text-blue-400 flex-shrink-0" />
                    <span>Pay exactly ₹{entryFee} as entry fee</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-0.5 text-blue-400 flex-shrink-0" />
                    <span>Take a screenshot of the successful payment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-0.5 text-blue-400 flex-shrink-0" />
                    <span>Upload the screenshot below for verification</span>
                  </li>
                </ol>
              </div>
              
              {/* QR Code Display */}
              {loadingQRCodes ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
                </div>
              ) : qrCodes.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-yellow-300">
                    Scan the QR code below to make payment:
                  </p>
                  
                  {/* QR Code Carousel */}
                  <div className="relative bg-white rounded-lg p-4 mx-auto max-w-xs">
                    <img 
                      src={qrCodes[currentQRIndex]?.qr_image_url} 
                      alt={qrCodes[currentQRIndex]?.name}
                      className="w-full h-auto rounded-lg"
                    />
                    
                    {/* QR Code Navigation */}
                    {qrCodes.length > 1 && (
                      <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={prevQRCode}
                          className="bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={nextQRCode}
                          className="bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* QR Code Info */}
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium text-white">{qrCodes[currentQRIndex]?.name}</p>
                    {qrCodes[currentQRIndex]?.upi_id && (
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-xs text-gray-400">UPI: {qrCodes[currentQRIndex]?.upi_id}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => copyUpiId(qrCodes[currentQRIndex]?.upi_id || '')}
                          className="h-6 w-6 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    {qrCodes.length > 1 && (
                      <p className="text-xs text-gray-500">{currentQRIndex + 1} / {qrCodes.length}</p>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openQRCode(qrCodes[currentQRIndex]?.qr_image_url || '')}
                        className="text-xs bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => downloadQRCode(qrCodes[currentQRIndex]?.qr_image_url || '', qrCodes[currentQRIndex]?.name || 'QR')}
                        className="text-xs bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-yellow-300 text-center py-2">
                  Contact admin for payment details
                </p>
              )}
              
              {/* Payment Screenshot Upload */}
              <div className="space-y-2 pt-3 border-t border-yellow-400/20">
                <Label className="text-yellow-200">
                  Upload New Payment Screenshot <span className="text-red-500">*</span>
                </Label>
                <div className="flex flex-col gap-3">
                  <label className="cursor-pointer">
                    <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-600 rounded-lg hover:border-blue-500 transition-colors bg-gray-800/50">
                      {screenshotPreview ? (
                        <img 
                          src={screenshotPreview} 
                          alt="Payment screenshot" 
                          className="max-h-40 rounded-lg"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <Upload className="w-8 h-8" />
                          <span className="text-sm">Click to upload screenshot</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="hidden"
                    />
                  </label>
                  {screenshot && (
                    <p className="text-sm text-green-400 flex items-center gap-1">
                      <Image className="w-4 h-4" />
                      {screenshot.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!screenshot || isLoading || uploadingScreenshot}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading || uploadingScreenshot ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploadingScreenshot ? 'Uploading...' : 'Submitting...'}
                </>
              ) : (
                'Submit Payment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentRetryDialog;