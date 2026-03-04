import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, Users, Settings2, Image, ExternalLink, Loader2, MessageSquare, Edit, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import TournamentCustomFieldsAdmin from './TournamentCustomFieldsAdmin';

interface Registration {
  id: string;
  user_id: string;
  tournament_id: string;
  player_name: string;
  game_id: string;
  status: string | null;
  payment_status: string | null;
  payment_amount: number | null;
  payment_screenshot_url: string | null;
  custom_fields_data: Record<string, any> | null;
  created_at: string | null;
}

interface Tournament {
  id: string;
  name: string;
  game: string;
  entry_fee: string | null;
}

const TournamentRegistrationsAdmin = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null);
  const [screenshotUrls, setScreenshotUrls] = useState<Record<string, string>>({});
  
  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRegistration, setRejectingRegistration] = useState<Registration | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadRegistrations();
    }
  }, [selectedTournament]);

  // Load signed URLs for payment screenshots
  useEffect(() => {
    const loadScreenshotUrls = async () => {
      const urlMap: Record<string, string> = {};
      
      for (const reg of registrations) {
        if (reg.payment_screenshot_url) {
          try {
            // Check if it's already a full URL (public bucket) or needs signing
            if (reg.payment_screenshot_url.startsWith('http')) {
              urlMap[reg.id] = reg.payment_screenshot_url;
            } else {
              // Get signed URL from private bucket
              const { data } = await supabase.storage
                .from('payment-screenshots')
                .createSignedUrl(reg.payment_screenshot_url, 3600); // 1 hour expiry
              
              if (data?.signedUrl) {
                urlMap[reg.id] = data.signedUrl;
              }
            }
          } catch (error) {
            console.error('Error getting signed URL:', error);
          }
        }
      }
      
      setScreenshotUrls(urlMap);
    };

    if (registrations.length > 0) {
      loadScreenshotUrls();
    }
  }, [registrations]);

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, game, entry_fee')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
      if (data && data.length > 0) {
        setSelectedTournament(data[0].id);
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
    }
  };

  const loadRegistrations = async () => {
    if (!selectedTournament) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', selectedTournament)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations((data || []) as Registration[]);
    } catch (error) {
      console.error('Error loading registrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load registrations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (registrationId: string) => {
    setProcessingId(registrationId);
    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ 
          payment_status: 'completed',
          status: 'confirmed'
        })
        .eq('id', registrationId);

      if (error) throw error;

      toast({
        title: 'Payment Approved',
        description: 'Registration has been approved successfully'
      });
      loadRegistrations();
    } catch (error) {
      console.error('Error approving payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve payment',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (registration: Registration) => {
    setRejectingRegistration(registration);
    setRejectComment('');
    setRejectDialogOpen(true);
  };

  const handleRejectPayment = async () => {
    if (!rejectingRegistration) return;
    
    setProcessingId(rejectingRegistration.id);
    try {
      // Update registration with rejection - store comment in custom_fields_data
      const existingData = rejectingRegistration.custom_fields_data || {};
      const updatedData = {
        ...existingData,
        rejection_comment: rejectComment,
        rejection_date: new Date().toISOString()
      };

      const { error } = await supabase
        .from('tournament_registrations')
        .update({ 
          payment_status: 'rejected',
          status: 'registered',
          custom_fields_data: updatedData
        })
        .eq('id', rejectingRegistration.id);

      if (error) throw error;

      toast({
        title: 'Payment Rejected',
        description: rejectComment ? 'Registration rejected with comment' : 'User can re-submit payment'
      });
      
      setRejectDialogOpen(false);
      setRejectingRegistration(null);
      setRejectComment('');
      loadRegistrations();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject payment',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (paymentStatus: string | null) => {
    switch (paymentStatus) {
      case 'completed':
        return <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      default:
        return <Badge variant="outline">{paymentStatus || 'Unknown'}</Badge>;
    }
  };

  const getScreenshotUrl = (registration: Registration): string | null => {
    return screenshotUrls[registration.id] || null;
  };

  const selectedTournamentData = tournaments.find(t => t.id === selectedTournament);

  return (
    <div className="space-y-6">
      {/* Tournament Selector */}
      <div className="flex items-center gap-4">
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="w-80 bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Select a tournament" />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map(tournament => (
              <SelectItem key={tournament.id} value={tournament.id}>
                {tournament.name} ({tournament.game})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedTournament && (
          <Button
            onClick={() => setShowCustomFields(true)}
            variant="outline"
            className="border-purple-500 text-purple-400 hover:bg-purple-500/20"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Custom Fields
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-500/30">
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {registrations.length}
            </div>
            <div className="text-blue-300 text-sm">Total Registrations</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 border-yellow-500/30">
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {registrations.filter(r => r.payment_status === 'pending').length}
            </div>
            <div className="text-yellow-300 text-sm">Pending Approvals</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-500/30">
          <CardContent className="p-6 text-center">
            <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {registrations.filter(r => r.payment_status === 'completed').length}
            </div>
            <div className="text-green-300 text-sm">Confirmed Players</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-900/50 to-red-800/50 border-red-500/30">
          <CardContent className="p-6 text-center">
            <X className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {registrations.filter(r => r.payment_status === 'rejected').length}
            </div>
            <div className="text-red-300 text-sm">Rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Registrations List */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Tournament Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : registrations.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No registrations found for this tournament
            </div>
          ) : (
            <div className="space-y-4">
              {registrations.map(registration => (
                <Card key={registration.id} className={`border ${
                  registration.payment_status === 'pending' 
                    ? 'bg-yellow-900/20 border-yellow-500/30' 
                    : registration.payment_status === 'rejected'
                    ? 'bg-red-900/20 border-red-500/30'
                    : 'bg-gray-700 border-gray-600'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 rounded-xl bg-purple-500">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-semibold text-lg">
                            {registration.player_name}
                          </div>
                          <div className="text-gray-400 text-sm">
                            Game ID: <span className="text-purple-400">{registration.game_id}</span>
                          </div>
                          {registration.payment_amount && registration.payment_amount > 0 && (
                            <div className="text-gray-400 text-sm">
                              Amount: <span className="text-green-400">₹{registration.payment_amount}</span>
                            </div>
                          )}
                          <div className="text-gray-500 text-xs">
                            {new Date(registration.created_at || '').toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(registration.payment_status)}
                      </div>
                    </div>
                    
                    {/* Rejection Comment Display */}
                    {registration.payment_status === 'rejected' && registration.custom_fields_data?.rejection_comment && (
                      <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-1">
                          <MessageSquare className="w-4 h-4" />
                          Rejection Reason:
                        </div>
                        <p className="text-red-200 text-sm">{registration.custom_fields_data.rejection_comment}</p>
                        {registration.custom_fields_data.rejection_date && (
                          <p className="text-red-400/60 text-xs mt-1">
                            Rejected on: {new Date(registration.custom_fields_data.rejection_date).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Custom Fields Data */}
                    {registration.custom_fields_data && Object.keys(registration.custom_fields_data).filter(k => !k.startsWith('rejection_')).length > 0 && (
                      <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                        <span className="text-gray-500 text-sm font-medium">Additional Information:</span>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {Object.entries(registration.custom_fields_data)
                            .filter(([key]) => !key.startsWith('rejection_'))
                            .map(([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="text-gray-500">{key.replace(/_/g, ' ')}:</span>
                              <span className="text-white ml-2">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Payment Screenshot */}
                    {registration.payment_screenshot_url && (
                      <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                        <span className="text-gray-500 text-sm font-medium">Payment Screenshot:</span>
                        <div className="mt-2">
                          {getScreenshotUrl(registration) ? (
                            <button
                              onClick={() => setScreenshotModal(getScreenshotUrl(registration))}
                              className="relative group"
                            >
                              <img 
                                src={getScreenshotUrl(registration)!} 
                                alt="Payment Screenshot" 
                                className="w-32 h-24 object-cover rounded border border-gray-600 hover:border-purple-500 transition-colors"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                                <ExternalLink className="w-5 h-5 text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-400">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">Loading screenshot...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Actions for pending payments */}
                    {registration.payment_status === 'pending' && registration.payment_amount && registration.payment_amount > 0 && (
                      <div className="mt-4 flex space-x-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprovePayment(registration.id)}
                          disabled={processingId === registration.id}
                        >
                          {processingId === registration.id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 mr-1" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openRejectDialog(registration)}
                          disabled={processingId === registration.id}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog with Comment */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-gray-900 border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <X className="w-5 h-5 mr-2 text-red-500" />
              Reject Registration
            </DialogTitle>
          </DialogHeader>
          
          {rejectingRegistration && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-white font-medium">{rejectingRegistration.player_name}</p>
                <p className="text-gray-400 text-sm">Game ID: {rejectingRegistration.game_id}</p>
                {rejectingRegistration.payment_amount && (
                  <p className="text-gray-400 text-sm">Amount: ₹{rejectingRegistration.payment_amount}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reject-comment" className="text-white">
                  Rejection Reason (Optional)
                </Label>
                <Textarea
                  id="reject-comment"
                  placeholder="Enter reason for rejection... (e.g., Payment not received, Screenshot unclear, etc.)"
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                />
                <p className="text-gray-500 text-xs">
                  This comment will be visible to the user so they know why their registration was rejected.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectPayment}
              disabled={processingId === rejectingRegistration?.id}
            >
              {processingId === rejectingRegistration?.id ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-1" />
              )}
              Reject Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Fields Dialog */}
      <Dialog open={showCustomFields} onOpenChange={setShowCustomFields}>
        <DialogContent className="bg-gray-900 border border-gray-700 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Custom Registration Fields
            </DialogTitle>
          </DialogHeader>
          {selectedTournamentData && (
            <TournamentCustomFieldsAdmin 
              tournamentId={selectedTournament}
              tournamentName={selectedTournamentData.name}
            />
          )}
        </DialogContent>
      </Dialog>

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
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentRegistrationsAdmin;
