import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, X, DollarSign, TrendingUp, TrendingDown, Clock, Image, ExternalLink } from 'lucide-react';
import { walletService, WalletTransaction, WalletMode } from '@/services/walletService';
import { useToast } from '@/hooks/use-toast';

interface WalletAdminProps {
  mode?: WalletMode;
}

const WalletAdmin = ({ mode = 'esports' }: WalletAdminProps) => {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTransactions();
  }, [mode]);

  const loadTransactions = async () => {
    try {
      const data = await walletService.getTransactions(mode);
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTransaction = async (id: string) => {
    setProcessingId(id);
    try {
      await walletService.updateTransactionStatus(id, 'approved', adminNotes[id]);
      toast({
        title: "Transaction Approved",
        description: "The transaction has been approved and the user's balance has been updated.",
      });
      loadTransactions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectTransaction = async (id: string) => {
    setProcessingId(id);
    try {
      await walletService.updateTransactionStatus(id, 'rejected', adminNotes[id]);
      toast({
        title: "Transaction Rejected",
        description: "The transaction has been rejected.",
      });
      loadTransactions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTransactionIcon = (type: string) => {
    return type === 'deposit' ? 
      <TrendingUp className="w-5 h-5 text-green-400" /> : 
      <TrendingDown className="w-5 h-5 text-red-400" />;
  };

  const modeLabel = mode === 'esports' ? 'Esports' : 'Offline Sports';
  const modeColor = mode === 'esports' ? 'purple' : 'emerald';

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="text-center text-gray-400">Loading {modeLabel} transactions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode Indicator */}
      <div className={`inline-flex items-center px-4 py-2 rounded-full bg-${modeColor}-500/20 border border-${modeColor}-500/30`}>
        <div className={`w-2 h-2 rounded-full bg-${modeColor}-400 mr-2 animate-pulse`} />
        <span className={`text-${modeColor}-400 font-medium`}>{modeLabel} Wallet</span>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-500/30">
          <CardContent className="p-6 text-center">
            <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {transactions.filter(t => t.status === 'pending').length}
            </div>
            <div className="text-green-300 text-sm">Pending Transactions</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-500/30">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {transactions.filter(t => t.transaction_type === 'deposit' && t.status === 'approved').length}
            </div>
            <div className="text-blue-300 text-sm">Approved Deposits</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 border-orange-500/30">
          <CardContent className="p-6 text-center">
            <TrendingDown className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {transactions.filter(t => t.transaction_type === 'withdrawal' && t.status === 'approved').length}
            </div>
            <div className="text-orange-300 text-sm">Approved Withdrawals</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            {modeLabel} Wallet Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No {modeLabel.toLowerCase()} transactions found
              </div>
            ) : (
              transactions.map((transaction) => (
                <Card key={transaction.id} className={`border ${
                  transaction.status === 'pending' 
                    ? 'bg-yellow-900/20 border-yellow-500/30' 
                    : 'bg-gray-700 border-gray-600'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-xl ${
                          transaction.transaction_type === 'deposit' ? 'bg-green-500' : 'bg-orange-500'
                        }`}>
                          {getTransactionIcon(transaction.transaction_type)}
                        </div>
                        <div>
                          <div className="text-white font-semibold text-lg">
                            {transaction.transaction_type === 'deposit' ? 'Deposit' : 'Withdrawal'} - ₹{transaction.amount}
                          </div>
                          <div className="text-gray-400 text-sm">
                            User: <span className="text-purple-400 font-mono text-xs">{transaction.user_id.slice(0, 8)}...</span>
                          </div>
                          <div className="text-gray-500 text-xs">
                            {new Date(transaction.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                    
                    {/* Payment Details Section */}
                    <div className="bg-gray-800/50 rounded-lg p-3 mb-3 space-y-2">
                      {transaction.payment_method && (
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 w-32">Payment Method:</span>
                          <span className="text-blue-400 font-medium">{transaction.payment_method}</span>
                        </div>
                      )}
                      
                      {/* Show UPI details for withdrawals */}
                      {transaction.transaction_type === 'withdrawal' && (
                        <>
                          {transaction.upi_id && (
                            <div className="flex items-center text-sm">
                              <span className="text-gray-500 w-32">UPI ID:</span>
                              <span className="text-yellow-400 font-medium">{transaction.upi_id}</span>
                            </div>
                          )}
                          {transaction.account_holder_name && (
                            <div className="flex items-center text-sm">
                              <span className="text-gray-500 w-32">Account Name:</span>
                              <span className="text-green-400 font-medium">{transaction.account_holder_name}</span>
                            </div>
                          )}
                          {transaction.mobile_number && (
                            <div className="flex items-center text-sm">
                              <span className="text-gray-500 w-32">Mobile:</span>
                              <span className="text-purple-400 font-medium">{transaction.mobile_number}</span>
                            </div>
                          )}
                        </>
                      )}
                      
                      {transaction.transaction_reference && (
                        <div className="text-sm">
                          <span className="text-gray-500">Payment Details:</span>
                          <div className="mt-1 p-2 bg-gray-700/50 rounded text-yellow-300 text-xs font-mono break-all">
                            {transaction.transaction_reference}
                          </div>
                        </div>
                      )}
                      
                      {/* Payment Screenshot */}
                      {transaction.payment_screenshot_url && (
                        <div className="text-sm">
                          <span className="text-gray-500">Payment Screenshot:</span>
                          <div className="mt-1">
                            <button
                              onClick={() => setScreenshotModal(transaction.payment_screenshot_url || null)}
                              className="relative group"
                            >
                              <img 
                                src={transaction.payment_screenshot_url} 
                                alt="Payment Screenshot" 
                                className="w-32 h-24 object-cover rounded border border-gray-600 hover:border-purple-500 transition-colors"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                                <ExternalLink className="w-5 h-5 text-white" />
                              </div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {transaction.status === 'pending' && (
                      <div className="mt-4 space-y-3">
                        <Textarea
                          placeholder="Add admin notes (optional)"
                          value={adminNotes[transaction.id] || ''}
                          onChange={(e) => setAdminNotes({
                            ...adminNotes,
                            [transaction.id]: e.target.value
                          })}
                          className="bg-gray-600 border-gray-500 text-white"
                        />
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveTransaction(transaction.id)}
                            disabled={processingId === transaction.id}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectTransaction(transaction.id)}
                            disabled={processingId === transaction.id}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {transaction.admin_notes && (
                      <div className="mt-3 p-3 bg-gray-600 rounded">
                        <div className="text-gray-300 text-sm">
                          <strong>Admin Notes:</strong> {transaction.admin_notes}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Screenshot Modal */}
      <Dialog open={!!screenshotModal} onOpenChange={() => setScreenshotModal(null)}>
        <DialogContent className="bg-gray-900 border border-gray-700 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <Image className="w-5 h-5 mr-2" />
              Payment Screenshot
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {screenshotModal && (
              <img 
                src={screenshotModal} 
                alt="Payment Screenshot" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletAdmin;
