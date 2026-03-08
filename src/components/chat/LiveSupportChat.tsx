import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  created_at: string;
}

interface Conversation {
  id: string;
  user_id: string;
  status: string;
}

const LiveSupportChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load or create conversation when chat opens
  useEffect(() => {
    if (!isOpen || !user) return;

    const loadConversation = async () => {
      setLoading(true);
      try {
        // Find existing open conversation
        const { data: existing, error: fetchErr } = await supabase
          .from('support_conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchErr) throw fetchErr;

        if (existing) {
          setConversation(existing as Conversation);
          await loadMessages(existing.id);
        }
      } catch (err) {
        console.error('Error loading conversation:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [isOpen, user]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!conversation) return;

    const channel = supabase
      .channel(`support_messages_${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation]);

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !user || sending) return;

    const trimmedMsg = message.trim();
    if (trimmedMsg.length > 1000) {
      toast({ title: 'Message too long', description: 'Max 1000 characters.', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      let convoId = conversation?.id;

      // Create conversation if needed
      if (!convoId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, username, email')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data: newConvo, error: convoErr } = await supabase
          .from('support_conversations')
          .insert({
            user_id: user.id,
            user_name: profile?.display_name || profile?.username || 'User',
            user_email: profile?.email || user.email || '',
            status: 'open',
          })
          .select()
          .single();

        if (convoErr) throw convoErr;
        setConversation(newConvo as Conversation);
        convoId = newConvo.id;
      }

      // Send message
      const { error: msgErr } = await supabase.from('support_messages').insert({
        conversation_id: convoId,
        sender_id: user.id,
        sender_role: 'user',
        message: trimmedMsg,
      });

      if (msgErr) throw msgErr;

      // Update last_message_at
      await supabase
        .from('support_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', convoId);

      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-200"
          aria-label="Open live support chat"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[340px] sm:w-[380px] h-[480px] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-white" />
              <div>
                <h3 className="text-white font-semibold text-sm">Live Support</h3>
                <p className="text-white/70 text-xs">We typically reply quickly</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm mt-8">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                <p className="font-medium text-gray-400">Hello! 👋</p>
                <p className="mt-1">How can we help you today?</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      msg.sender_role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-700 text-gray-200 rounded-bl-md'
                    }`}
                  >
                    {msg.sender_role === 'admin' && (
                      <p className="text-xs text-purple-400 font-medium mb-0.5">Admin</p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    <p className="text-[10px] mt-1 opacity-60">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-700">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="bg-gray-800 border-gray-600 text-white text-sm"
                maxLength={1000}
                disabled={sending}
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sending}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700 shrink-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveSupportChat;
