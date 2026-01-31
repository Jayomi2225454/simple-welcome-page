import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAction {
  action: string;
  tournamentId?: string;
  tournamentName?: string;
  entryFee?: string;
  path?: string;
}

interface PendingRegistration {
  tournamentId: string;
  tournamentName: string;
  entryFee?: string;
  userProfile?: {
    name: string;
    gameId: string;
  };
}

export const useAIAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
  const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const executeAction = useCallback(async (action: AIAction) => {
    switch (action.action) {
      case 'show_wallet':
        navigate('/wallet');
        toast.success('Opening your wallet...');
        break;
      case 'show_tournaments':
        navigate('/tournaments');
        toast.success('Showing tournaments...');
        break;
      case 'show_leaderboards':
        navigate('/leaderboards');
        toast.success('Opening leaderboards...');
        break;
      case 'show_live_matches':
        navigate('/live-matches');
        toast.success('Showing live matches...');
        break;
      case 'show_profile':
        navigate('/profile');
        toast.success('Opening your profile...');
        break;
      case 'navigate':
        if (action.path) {
          navigate(action.path);
          toast.success('Navigating...');
        }
        break;
      default:
        console.log('Unknown action:', action);
    }
    setPendingAction(null);
  }, [navigate]);

  const executeRegistration = useCallback(async (registration: PendingRegistration) => {
    if (!user?.id) {
      toast.error('Please log in to register');
      return;
    }

    setIsRegistering(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          executeRegistration: true,
          registrationData: {
            tournamentId: registration.tournamentId,
          },
          userId: user.id
        }
      });

      if (error) throw error;

      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ ${data.message}\n\n📋 Details:\n• Tournament: ${data.details.tournamentName}\n• Player: ${data.details.playerName}\n• Game ID: ${data.details.gameId}\n• Game: ${data.details.game}`
        }]);
        toast.success(data.message);
      } else if (data.requiresPayment) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `💰 ${data.message}`
        }]);
        // Navigate to tournament for payment
        navigate(`/tournaments/${data.tournamentId}`);
        toast.info('Redirecting to complete payment...');
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ ${data.error || 'Registration failed'}`
        }]);
        toast.error(data.error || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Registration failed: ${error.message}`
      }]);
      toast.error('Registration failed');
    } finally {
      setIsRegistering(false);
      setPendingRegistration(null);
    }
  }, [user?.id, navigate]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          userId: user?.id
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message || "I'm here to help!"
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Handle action if present
      if (data.action) {
        if (data.action.action === 'auto_register' && data.action.tournamentId) {
          // Set up pending registration for confirmation
          setPendingRegistration({
            tournamentId: data.action.tournamentId,
            tournamentName: data.action.tournamentName || 'Tournament',
            entryFee: data.action.entryFee,
            userProfile: data.userProfile
          });
        } else if (['show_wallet', 'show_tournaments', 'show_leaderboards', 'show_live_matches', 'show_profile', 'navigate'].includes(data.action.action)) {
          executeAction(data.action);
        } else {
          setPendingAction(data.action);
        }
      }

    } catch (error: any) {
      console.error('AI assistant error:', error);
      const errorMessage = error?.message || 'Something went wrong. Please try again.';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, ${errorMessage}`
      }]);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [messages, user?.id, executeAction]);

  const confirmAction = useCallback(() => {
    if (pendingAction) {
      executeAction(pendingAction);
    }
  }, [pendingAction, executeAction]);

  const confirmRegistration = useCallback(() => {
    if (pendingRegistration) {
      executeRegistration(pendingRegistration);
    }
  }, [pendingRegistration, executeRegistration]);

  const cancelAction = useCallback(() => {
    setPendingAction(null);
    setPendingRegistration(null);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'Action cancelled. How else can I help you?'
    }]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setPendingAction(null);
    setPendingRegistration(null);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    pendingAction,
    pendingRegistration,
    isRegistering,
    confirmAction,
    confirmRegistration,
    cancelAction,
    clearMessages
  };
};