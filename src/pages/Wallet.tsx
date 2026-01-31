import { useState, useEffect, useMemo, useRef, forwardRef } from 'react';
import { Plus, Minus, DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, History, CreditCard, X, QrCode, User, Phone, FileText, Ticket, Eye, ChevronLeft, ChevronRight, Loader2, Upload, Image } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { walletService, WalletTransaction, WalletBalance, WalletMode } from '@/services/walletService';
import { battleCodeService } from '@/services/battleCodeService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
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
}

const Wallet = forwardRef<HTMLDivElement>((_, ref) => {
  const { user } = useAuth();
  const { mode } = useMode();
  const { toast } = useToast();
  
  const walletMode: WalletMode = mode === 'sports' ? 'sports' : 'esports';
  
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // QR Codes state
  const [qrCodes, setQrCodes] = useState<WalletQRCode[]>([]);
  const [currentQRIndex, setCurrentQRIndex] = useState(0);
  const [loadingQRCodes, setLoadingQRCodes] = useState(true);
  
  // Deposit flow states
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentName, setPaymentName] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Payment screenshot state
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentScreenshotPreview, setPaymentScreenshotPreview] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  
  // Withdraw flow states
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawUpiId, setWithdrawUpiId] = useState('');
  const [withdrawName, setWithdrawName] = useState('');
  const [withdrawMobile, setWithdrawMobile] = useState('');
  
  // Battle Code states
  const [showBattleCodeDialog, setShowBattleCodeDialog] = useState(false);
  const [battleCode, setBattleCode] = useState('');
  const [isRedeemingCode, setIsRedeemingCode] = useState(false);
  
  // Transaction details modal
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);

  useEffect(() => {
    if (user) {
      loadWalletData();
    }
    loadQRCodes();
  }, [user, walletMode]);

  const loadQRCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_qr_codes')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      // Filter by mode - show QR codes that match the current mode or are set to 'both'
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

  const loadWalletData = async () => {
    if (!user) return;
    
    try {
      const [balance, userTransactions] = await Promise.all([
        walletService.getUserBalance(user.id, walletMode),
        walletService.getUserTransactions(user.id, walletMode)
      ]);
      
      setWalletBalance(balance);
      setTransactions(userTransactions);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextQRCode = () => {
    setCurrentQRIndex((prev) => (prev + 1) % qrCodes.length);
  };

  const prevQRCode = () => {
    setCurrentQRIndex((prev) => (prev - 1 + qrCodes.length) % qrCodes.length);
  };

  const handleProceedToPayment = () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive"
      });
      return;
    }
    setShowDepositDialog(false);
    setShowPaymentDialog(true);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Too Large",
          description: "Please select an image under 5MB",
          variant: "destructive"
        });
        return;
      }
      setPaymentScreenshot(file);
      setPaymentScreenshotPreview(URL.createObjectURL(file));
    }
  };

  const uploadScreenshot = async (): Promise<string | null> => {
    if (!paymentScreenshot || !user) return null;
    
    setUploadingScreenshot(true);
    try {
      const fileExt = paymentScreenshot.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(fileName, paymentScreenshot);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('payment-screenshots')
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      return null;
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!user) return;
    
    if (!paymentName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name as in payment",
        variant: "destructive"
      });
      return;
    }
    
    if (!transactionId.trim()) {
      toast({
        title: "Transaction ID Required",
        description: "Please enter the transaction ID",
        variant: "destructive"
      });
      return;
    }
    
    if (!mobileNumber.trim() || mobileNumber.length < 10) {
      toast({
        title: "Mobile Number Required",
        description: "Please enter a valid mobile number",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Upload screenshot if provided
      let screenshotUrl: string | null = null;
      if (paymentScreenshot) {
        screenshotUrl = await uploadScreenshot();
      }
      
      await walletService.createTransaction({
        user_id: user.id,
        transaction_type: 'deposit',
        amount: parseFloat(depositAmount),
        status: 'pending',
        payment_method: 'Google Pay',
        transaction_reference: `Name: ${paymentName}, Mobile: ${mobileNumber}, TxnID: ${transactionId}`,
        mode: walletMode,
        payment_screenshot_url: screenshotUrl
      });
      
      toast({
        title: "Payment Submitted",
        description: "Your deposit request has been submitted for verification. It will be processed within 24 hours.",
      });
      
      // Reset form and close dialog
      setShowPaymentDialog(false);
      setDepositAmount('');
      setPaymentName('');
      setTransactionId('');
      setMobileNumber('');
      setPaymentScreenshot(null);
      setPaymentScreenshotPreview(null);
      
      // Reload wallet data
      loadWalletData();
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user) return;
    
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive"
      });
      return;
    }
    
    if (walletBalance && amount > walletBalance.available_balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance to withdraw this amount",
        variant: "destructive"
      });
      return;
    }
    
    if (!withdrawUpiId.trim()) {
      toast({
        title: "UPI ID Required",
        description: "Please enter your UPI ID",
        variant: "destructive"
      });
      return;
    }
    
    if (!withdrawName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive"
      });
      return;
    }
    
    if (!withdrawMobile.trim() || withdrawMobile.length < 10) {
      toast({
        title: "Mobile Number Required",
        description: "Please enter a valid mobile number",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await walletService.createWithdrawalTransaction({
        user_id: user.id,
        amount: amount,
        upi_id: withdrawUpiId,
        account_holder_name: withdrawName,
        mobile_number: withdrawMobile,
        mode: walletMode
      });
      
      toast({
        title: "Withdrawal Requested",
        description: "Your withdrawal request has been submitted. It will be processed within 24-48 hours.",
      });
      
      setShowWithdrawDialog(false);
      setWithdrawAmount('');
      setWithdrawUpiId('');
      setWithdrawName('');
      setWithdrawMobile('');
      loadWalletData();
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      toast({
        title: "Request Failed",
        description: "Failed to submit withdrawal request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRedeemBattleCode = async () => {
    if (!user) return;
    
    if (!battleCode.trim()) {
      toast({
        title: "Code Required",
        description: "Please enter a battle code",
        variant: "destructive"
      });
      return;
    }
    
    setIsRedeemingCode(true);
    
    try {
      const result = await battleCodeService.redeemCode(battleCode, user.id, walletMode);
      
      if (result.success) {
        toast({
          title: "Code Redeemed!",
          description: result.message,
        });
        setShowBattleCodeDialog(false);
        setBattleCode('');
        loadWalletData();
      } else {
        toast({
          title: "Redemption Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to redeem code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRedeemingCode(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  const getTransactionTitle = (type: string) => {
    return type === 'deposit' ? 'Money Added' : 'Money Withdrawn';
  };

  const availableBalance = walletBalance?.available_balance || 0;
  const totalDeposited = walletBalance?.total_deposited || 0;
  
  // Calculate actual withdrawals (approved withdrawal requests, NOT tournament entry fees)
  const actualWithdrawn = useMemo(() => {
    return transactions
      .filter(t => 
        t.transaction_type === 'withdrawal' && 
        t.status === 'approved' && 
        t.payment_method === 'UPI'
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const handleViewTransaction = (transaction: WalletTransaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white">Loading wallet...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen py-8 sm:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-10 sm:mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 mb-4 sm:mb-6 shadow-lg shadow-purple-500/30">
              <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 mb-3 sm:mb-4">
              My Wallet
            </h1>
            <p className="text-gray-400 text-sm sm:text-base lg:text-lg max-w-xl mx-auto">
              Manage your gaming funds with ease. Add money, track transactions, and withdraw your winnings seamlessly.
            </p>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {/* Available Balance Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/30 border border-green-500/30 p-5 sm:p-6">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-400/10 rounded-full -translate-y-8 translate-x-8" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-500 mb-3 sm:mb-4 shadow-lg shadow-green-500/30">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-400 mb-1">
                  ₹{availableBalance.toFixed(0)}
                </div>
                <div className="text-green-400/80 text-sm sm:text-base font-medium">Available Balance</div>
                <div className="text-green-500/60 text-xs sm:text-sm">Ready to use</div>
              </div>
            </div>

            {/* Total Deposited Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/30 border border-blue-500/30 p-5 sm:p-6">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/10 rounded-full -translate-y-8 translate-x-8" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500 mb-3 sm:mb-4 shadow-lg shadow-blue-500/30">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-400 mb-1">
                  ₹{totalDeposited.toFixed(0)}
                </div>
                <div className="text-blue-400/80 text-sm sm:text-base font-medium">Total Deposited</div>
                <div className="text-blue-500/60 text-xs sm:text-sm">All time</div>
              </div>
            </div>

            {/* Total Withdrawn Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-600/30 border border-orange-500/30 p-5 sm:p-6">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-400/10 rounded-full -translate-y-8 translate-x-8" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-500 mb-3 sm:mb-4 shadow-lg shadow-orange-500/30">
                  <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-orange-400 mb-1">
                  ₹{actualWithdrawn.toFixed(0)}
                </div>
                <div className="text-orange-400/80 text-sm sm:text-base font-medium">Total Withdrawn</div>
                <div className="text-orange-500/60 text-xs sm:text-sm">Approved withdrawals</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8">
            <Button 
              onClick={() => setShowDepositDialog(true)}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-xl shadow-lg shadow-green-500/30 transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Money
            </Button>
            <Button 
              onClick={() => setShowBattleCodeDialog(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white font-semibold px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-xl shadow-lg shadow-purple-500/30 transition-all hover:scale-105"
            >
              <Ticket className="w-5 h-5 mr-2" />
              Battle Code
            </Button>
            <Button 
              onClick={() => setShowWithdrawDialog(true)}
              variant="outline"
              className="border-2 border-pink-500/50 text-pink-400 hover:bg-pink-500/10 font-semibold px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-xl transition-all hover:scale-105"
              disabled={availableBalance <= 0}
            >
              <Minus className="w-5 h-5 mr-2" />
              Withdraw Funds
            </Button>
          </div>

          {/* Transaction History */}
          <div className="rounded-2xl bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-700/50 backdrop-blur-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-gray-700/50">
              <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/20 mr-3">
                  <History className="w-4 h-4 text-purple-400" />
                </div>
                Transaction History
              </h2>
            </div>
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {transactions.map((transaction) => (
                <div 
                  key={transaction.id}
                  onClick={() => handleViewTransaction(transaction)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl border border-gray-700/30 transition-colors gap-3 sm:gap-4 cursor-pointer group"
                >
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${
                      transaction.transaction_type === 'deposit'
                        ? 'bg-green-500' 
                        : 'bg-orange-500'
                    }`}>
                      {transaction.transaction_type === 'deposit'
                        ? <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        : <Minus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      }
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm sm:text-base">
                        {getTransactionTitle(transaction.transaction_type)}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                        <span className="text-gray-400">{formatDate(transaction.created_at)}</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-purple-400">{transaction.payment_method || 'Wallet'}</span>
                      </div>
                      {transaction.status === 'rejected' && transaction.admin_notes && (
                        <div className="mt-1 text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-1 rounded">
                          Rejection Reason: {transaction.admin_notes}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4 pl-14 sm:pl-0">
                    <div className={`font-bold text-base sm:text-lg ${
                      transaction.transaction_type === 'deposit'
                        ? 'text-green-400' 
                        : 'text-red-400'
                    }`}>
                      {transaction.transaction_type === 'deposit' ? '+' : '-'}₹{transaction.amount.toFixed(0)}
                    </div>
                    <div className="flex items-center space-x-2">
                      {transaction.status === 'approved' && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                      {transaction.status === 'pending' && (
                        <Clock className="w-4 h-4 text-yellow-400" />
                      )}
                      {transaction.status === 'rejected' && (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <Badge 
                        className={`text-xs px-2 py-0.5 ${
                          transaction.status === 'approved' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : transaction.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {transaction.status === 'approved' ? 'Approved' : 
                         transaction.status === 'pending' ? 'Pending' : 'Rejected'}
                      </Badge>
                      <Eye className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              ))}
              
              {transactions.length === 0 && (
                <div className="text-center py-12 sm:py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/50 mb-4">
                    <DollarSign className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">No transactions yet</h3>
                  <p className="text-gray-500 text-sm">Your transaction history will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: Enter Amount Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-green-500 mr-3">
                <Plus className="w-5 h-5 text-white" />
              </div>
              Add Money to Wallet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (₹)
              </label>
              <Input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Enter amount"
                className="bg-gray-800 border-green-500/50 text-white text-lg py-6 focus:border-green-400"
                min="1"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleProceedToPayment}
                className="flex-1 bg-green-500 hover:bg-green-600 py-6 text-base font-semibold"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Proceed to Payment
              </Button>
              <Button 
                variant="outline" 
                onClick={() => { setShowDepositDialog(false); setDepositAmount(''); }}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 py-6"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 2: Payment Details Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500 mr-3">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              Complete Payment
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 mt-4">
            {/* Amount Display */}
            <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-4 text-center">
              <span className="text-gray-300">Amount: </span>
              <span className="text-green-400 font-bold text-xl">₹{depositAmount}</span>
            </div>
            
            {/* Dynamic QR Code */}
            {loadingQRCodes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : qrCodes.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-4">
                  {qrCodes.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={prevQRCode}
                      className="text-gray-400 hover:text-white"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                  )}
                  
                  <div className="bg-white p-4 rounded-xl shadow-lg">
                    <img 
                      src={qrCodes[currentQRIndex]?.qr_image_url} 
                      alt={qrCodes[currentQRIndex]?.name} 
                      className="w-40 h-40 object-contain"
                    />
                  </div>
                  
                  {qrCodes.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextQRCode}
                      className="text-gray-400 hover:text-white"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  )}
                </div>
                
                <div className="text-center">
                  <p className="text-white font-medium">{qrCodes[currentQRIndex]?.name}</p>
                  {qrCodes[currentQRIndex]?.upi_id && (
                    <p className="text-purple-400 text-sm">{qrCodes[currentQRIndex]?.upi_id}</p>
                  )}
                  {qrCodes[currentQRIndex]?.description && (
                    <p className="text-gray-400 text-xs mt-1">{qrCodes[currentQRIndex]?.description}</p>
                  )}
                </div>
                
                {qrCodes.length > 1 && (
                  <div className="flex justify-center gap-1">
                    {qrCodes.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentQRIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentQRIndex ? 'bg-purple-500' : 'bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <QrCode className="w-12 h-12 mx-auto text-gray-500 mb-2" />
                <p className="text-gray-400 text-sm">No payment QR codes available</p>
                <p className="text-gray-500 text-xs">Please contact support</p>
              </div>
            )}
            
            {/* Payment Details Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <User className="w-4 h-4 mr-2 text-purple-400" />
                  Name as in Payment
                </label>
                <Input
                  type="text"
                  value={paymentName}
                  onChange={(e) => setPaymentName(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-gray-800 border-purple-500/50 text-white focus:border-purple-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-purple-400" />
                  Transaction ID
                </label>
                <Input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter transaction ID"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-purple-400" />
                  Mobile Number
                </label>
                <Input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="Enter mobile number"
                  className="bg-gray-800 border-gray-600 text-white"
                  maxLength={10}
                />
              </div>
              
              {/* Payment Screenshot Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Image className="w-4 h-4 mr-2 text-purple-400" />
                  Payment Screenshot (Optional)
                </label>
                <input
                  ref={screenshotInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="hidden"
                />
                {paymentScreenshotPreview ? (
                  <div className="relative">
                    <img 
                      src={paymentScreenshotPreview} 
                      alt="Payment Screenshot" 
                      className="w-full h-32 object-cover rounded-lg border border-gray-600"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 h-6 w-6"
                      onClick={() => {
                        setPaymentScreenshot(null);
                        setPaymentScreenshotPreview(null);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed border-gray-600 text-gray-400 hover:bg-gray-800 py-8"
                    onClick={() => screenshotInputRef.current?.click()}
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Screenshot
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={handleSubmitPayment}
                disabled={isSubmitting}
                className="flex-1 bg-green-500 hover:bg-green-600 py-6 text-base font-semibold"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit Payment'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => { 
                  setShowPaymentDialog(false); 
                  setDepositAmount('');
                  setPaymentName('');
                  setTransactionId('');
                  setMobileNumber('');
                  setPaymentScreenshot(null);
                  setPaymentScreenshotPreview(null);
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 py-6"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500 mr-3">
                <Minus className="w-5 h-5 text-white" />
              </div>
              Withdraw Funds
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (₹) - Max: ₹{availableBalance.toFixed(0)}
              </label>
              <Input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount"
                className="bg-gray-800 border-orange-500/50 text-white text-lg py-6 focus:border-orange-400"
                max={availableBalance}
                min="1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                UPI ID
              </label>
              <Input
                value={withdrawUpiId}
                onChange={(e) => setWithdrawUpiId(e.target.value)}
                placeholder="Enter your UPI ID"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name
              </label>
              <Input
                value={withdrawName}
                onChange={(e) => setWithdrawName(e.target.value)}
                placeholder="Enter your name"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mobile Number
              </label>
              <Input
                value={withdrawMobile}
                onChange={(e) => setWithdrawMobile(e.target.value)}
                placeholder="Enter your mobile number"
                className="bg-gray-800 border-gray-600 text-white"
                maxLength={10}
              />
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={handleWithdraw}
                disabled={isSubmitting}
                className="flex-1 bg-orange-500 hover:bg-orange-600 py-6 text-base font-semibold"
              >
                <Minus className="w-5 h-5 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit Withdrawal Request'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => { 
                  setShowWithdrawDialog(false); 
                  setWithdrawAmount(''); 
                  setWithdrawUpiId('');
                  setWithdrawName('');
                  setWithdrawMobile('');
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 py-6"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Battle Code Dialog */}
      <Dialog open={showBattleCodeDialog} onOpenChange={setShowBattleCodeDialog}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500 mr-3">
                <Ticket className="w-5 h-5 text-white" />
              </div>
              Redeem Battle Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <p className="text-gray-400 text-sm">
              Enter your battle code to add bonus money to your wallet instantly!
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Battle Code
              </label>
              <Input
                value={battleCode}
                onChange={(e) => setBattleCode(e.target.value.toUpperCase())}
                placeholder="Enter your code"
                className="bg-gray-800 border-purple-500/50 text-white text-lg py-6 focus:border-purple-400 uppercase"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleRedeemBattleCode}
                disabled={isRedeemingCode}
                className="flex-1 bg-purple-500 hover:bg-purple-600 py-6 text-base font-semibold"
              >
                <Ticket className="w-5 h-5 mr-2" />
                {isRedeemingCode ? 'Redeeming...' : 'Redeem Code'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => { setShowBattleCodeDialog(false); setBattleCode(''); }}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 py-6"
                disabled={isRedeemingCode}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Details Modal */}
      <Dialog open={showTransactionDetails} onOpenChange={setShowTransactionDetails}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mr-3 ${
                selectedTransaction?.transaction_type === 'deposit' ? 'bg-green-500' : 'bg-orange-500'
              }`}>
                {selectedTransaction?.transaction_type === 'deposit' 
                  ? <Plus className="w-5 h-5 text-white" />
                  : <Minus className="w-5 h-5 text-white" />
                }
              </div>
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 mt-4">
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border ${
                selectedTransaction.status === 'approved'
                  ? 'bg-green-500/10 border-green-500/30'
                  : selectedTransaction.status === 'pending'
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center gap-2">
                  {selectedTransaction.status === 'approved' && <CheckCircle className="w-5 h-5 text-green-400" />}
                  {selectedTransaction.status === 'pending' && <Clock className="w-5 h-5 text-yellow-400" />}
                  {selectedTransaction.status === 'rejected' && <XCircle className="w-5 h-5 text-red-400" />}
                  <span className={`font-semibold ${
                    selectedTransaction.status === 'approved' ? 'text-green-400' :
                    selectedTransaction.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {selectedTransaction.status === 'approved' ? 'Approved' :
                     selectedTransaction.status === 'pending' ? 'Pending Review' : 'Rejected'}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/30">
                <p className="text-sm text-gray-400 mb-1">Amount</p>
                <p className={`text-2xl font-bold ${
                  selectedTransaction.transaction_type === 'deposit' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {selectedTransaction.transaction_type === 'deposit' ? '+' : '-'}₹{selectedTransaction.amount.toFixed(0)}
                </p>
              </div>

              {/* Transaction Type */}
              <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/30">
                <p className="text-sm text-gray-400 mb-1">Type</p>
                <p className="text-white font-medium">
                  {selectedTransaction.transaction_type === 'deposit' ? 'Money Added' : 'Money Withdrawn'}
                </p>
              </div>

              {/* Payment Method */}
              {selectedTransaction.payment_method && (
                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/30">
                  <p className="text-sm text-gray-400 mb-1">Payment Method</p>
                  <p className="text-white font-medium">{selectedTransaction.payment_method}</p>
                </div>
              )}

              {/* UPI Details (for withdrawals) */}
              {selectedTransaction.transaction_type === 'withdrawal' && selectedTransaction.upi_id && (
                <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/30 space-y-3">
                  <p className="text-sm font-medium text-purple-400">Payment Details</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">UPI ID:</span>
                      <span className="text-white font-mono">{selectedTransaction.upi_id}</span>
                    </div>
                    {selectedTransaction.account_holder_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Name:</span>
                        <span className="text-white">{selectedTransaction.account_holder_name}</span>
                      </div>
                    )}
                    {selectedTransaction.mobile_number && (
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Mobile:</span>
                        <span className="text-white">{selectedTransaction.mobile_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Date */}
              <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/30">
                <p className="text-sm text-gray-400 mb-1">Date</p>
                <p className="text-white font-medium">{formatDate(selectedTransaction.created_at)}</p>
              </div>

              {/* Admin Notes (for rejected transactions) */}
              {selectedTransaction.status === 'rejected' && selectedTransaction.admin_notes && (
                <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                  <p className="text-sm font-medium text-red-400 mb-1">Admin Note</p>
                  <p className="text-red-200">{selectedTransaction.admin_notes}</p>
                </div>
              )}

              {/* Transaction Reference */}
              {selectedTransaction.transaction_reference && (
                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/30">
                  <p className="text-sm text-gray-400 mb-1">Reference</p>
                  <p className="text-white text-sm break-all">{selectedTransaction.transaction_reference}</p>
                </div>
              )}

              <Button 
                onClick={() => setShowTransactionDetails(false)}
                className="w-full bg-gray-700 hover:bg-gray-600 py-6"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
});

Wallet.displayName = 'Wallet';

export default Wallet;
