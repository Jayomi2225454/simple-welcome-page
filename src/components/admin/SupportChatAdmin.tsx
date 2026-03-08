import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Loader2, User, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  user_name: string | null;
  user_email: string | null;
  status: string;
  last_message_at: string;
  created_at: string;
}

const SupportChatAdmin = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
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

  // Load all conversations
  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (!error && data) {
        setConversations(data as Conversation[]);
      }
      setLoading(false);
    };

    loadConversations();

    // Subscribe to new conversations
    const channel = supabase
      .channel('admin_support_conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_conversations' },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConvo) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', selectedConvo.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data as Message[]);
      }
    };

    loadMessages();

    // Realtime for messages
    const channel = supabase
      .channel(`admin_messages_${selectedConvo.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${selectedConvo.id}`,
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
  }, [selectedConvo]);

  const handleSendReply = async () => {
    if (!reply.trim() || !selectedConvo || !user || sending) return;

    const trimmedReply = reply.trim();
    if (trimmedReply.length > 2000) {
      toast({ title: 'Message too long', description: 'Max 2000 characters.', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        conversation_id: selectedConvo.id,
        sender_id: user.id,
        sender_role: 'admin',
        message: trimmedReply,
      });

      if (error) throw error;

      await supabase
        .from('support_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConvo.id);

      setReply('');
    } catch (err) {
      console.error('Error sending reply:', err);
      toast({ title: 'Error', description: 'Failed to send reply.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleCloseConversation = async (convoId: string) => {
    const { error } = await supabase
      .from('support_conversations')
      .update({ status: 'closed' })
      .eq('id', convoId);

    if (!error) {
      setConversations((prev) =>
        prev.map((c) => (c.id === convoId ? { ...c, status: 'closed' } : c))
      );
      if (selectedConvo?.id === convoId) {
        setSelectedConvo((prev) => (prev ? { ...prev, status: 'closed' } : null));
      }
      toast({ title: 'Conversation closed' });
    }
  };

  const handleReopenConversation = async (convoId: string) => {
    const { error } = await supabase
      .from('support_conversations')
      .update({ status: 'open' })
      .eq('id', convoId);

    if (!error) {
      setConversations((prev) =>
        prev.map((c) => (c.id === convoId ? { ...c, status: 'open' } : c))
      );
      if (selectedConvo?.id === convoId) {
        setSelectedConvo((prev) => (prev ? { ...prev, status: 'open' } : null));
      }
      toast({ title: 'Conversation reopened' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
      {/* Conversation List */}
      <Card className="bg-gray-800 border-gray-700 lg:col-span-1 overflow-hidden flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Support Chats ({conversations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No support conversations yet.</p>
          ) : (
            conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => setSelectedConvo(convo)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedConvo?.id === convo.id
                    ? 'bg-purple-600/30 border border-purple-500/50'
                    : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm font-medium truncate">
                    {convo.user_name || 'Unknown User'}
                  </span>
                  <Badge
                    variant={convo.status === 'open' ? 'default' : 'secondary'}
                    className={`text-[10px] ${
                      convo.status === 'open' ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    {convo.status}
                  </Badge>
                </div>
                <p className="text-gray-400 text-xs truncate">{convo.user_email}</p>
                <p className="text-gray-500 text-[10px] mt-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {new Date(convo.last_message_at).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="bg-gray-800 border-gray-700 lg:col-span-2 overflow-hidden flex flex-col">
        {!selectedConvo ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-sm">Select a conversation to start replying</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <h4 className="text-white text-sm font-semibold">
                    {selectedConvo.user_name || 'Unknown User'}
                  </h4>
                  <p className="text-gray-400 text-xs">{selectedConvo.user_email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedConvo.status === 'open' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCloseConversation(selectedConvo.id)}
                    className="text-xs border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Close
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReopenConversation(selectedConvo.id)}
                    className="text-xs border-green-500/50 text-green-400 hover:bg-green-500/10"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Reopen
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-sm text-center mt-8">No messages yet.</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                        msg.sender_role === 'admin'
                          ? 'bg-purple-600 text-white rounded-br-md'
                          : 'bg-gray-700 text-gray-200 rounded-bl-md'
                      }`}
                    >
                      <p className="text-xs font-medium mb-0.5 opacity-70">
                        {msg.sender_role === 'admin' ? 'You (Admin)' : selectedConvo.user_name || 'User'}
                      </p>
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      <p className="text-[10px] mt-1 opacity-60">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <div className="p-3 border-t border-gray-700">
              <div className="flex gap-2">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your reply..."
                  className="bg-gray-700 border-gray-600 text-white text-sm"
                  maxLength={2000}
                  disabled={sending || selectedConvo.status === 'closed'}
                />
                <Button
                  onClick={handleSendReply}
                  disabled={!reply.trim() || sending || selectedConvo.status === 'closed'}
                  size="icon"
                  className="bg-purple-600 hover:bg-purple-700 shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default SupportChatAdmin;
