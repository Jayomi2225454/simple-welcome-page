import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2, MessageCircle, Headphones, Shield } from 'lucide-react';
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

interface LiveSupportChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const LiveSupportChat = ({ isOpen, onClose }: LiveSupportChatProps) => {
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

  useEffect(() => {
    if (!isOpen || !user) return;

    const loadConversation = async () => {
      setLoading(true);
      try {
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

      const { error: msgErr } = await supabase.from('support_messages').insert({
        conversation_id: convoId,
        sender_id: user.id,
        sender_role: 'user',
        message: trimmedMsg,
      });

      if (msgErr) throw msgErr;

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

  if (!user || !isOpen) return null;

  const chatWidget = (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="fixed bottom-6 right-6 z-50 w-[360px] sm:w-[400px] h-[520px] bg-gray-950 border border-gray-800 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-5 py-4 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Headphones className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base tracking-tight">Live Support</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-white/70 text-xs">Online · Typically replies instantly</p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-950 to-gray-900">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                <p className="text-gray-500 text-xs">Loading conversation...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-white font-semibold text-lg">Hey there! 👋</p>
              <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                We're here to help. Send us a message and we'll get back to you as soon as possible.
              </p>
              <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-full bg-gray-800/50 border border-gray-700/50">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-gray-400 text-xs">Support team is online</span>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.sender_role === 'user';
              const showTimestamp = index === messages.length - 1 ||
                messages[index + 1]?.sender_role !== msg.sender_role;

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 mb-5">
                      <Shield className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    {msg.sender_role === 'admin' && (
                      <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider ml-1">
                        Support Agent
                      </span>
                    )}
                    <div
                      className={`max-w-[260px] px-4 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-2xl rounded-br-md shadow-lg shadow-purple-500/10'
                          : 'bg-gray-800 text-gray-100 rounded-2xl rounded-bl-md border border-gray-700/50'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    </div>
                    {showTimestamp && (
                      <p className={`text-[10px] text-gray-500 mt-0.5 ${isUser ? 'text-right mr-1' : 'ml-1'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-gray-950 border-t border-gray-800/80">
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-1.5 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="border-0 bg-transparent text-white text-sm placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-10"
              maxLength={1000}
              disabled={sending}
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              size="icon"
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-30 shrink-0 transition-all shadow-lg shadow-purple-500/20"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-center text-[10px] text-gray-600 mt-2">
            Powered by Battle Mitra Support
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(chatWidget, document.body);
};

export default LiveSupportChat;
