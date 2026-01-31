import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles, Wallet, Trophy, Users, Gamepad2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { 
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
  } = useAIAssistant();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pendingRegistration]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  const quickActions = [
    { label: 'Show my wallet', icon: Wallet, message: 'Show me my wallet balance' },
    { label: 'Browse tournaments', icon: Trophy, message: 'Show me available tournaments' },
    { label: 'Quick register', icon: Gamepad2, message: 'Register me for the next free tournament' },
    { label: 'Leaderboards', icon: Users, message: 'Show me the leaderboards' },
  ];

  const handleQuickAction = (message: string) => {
    sendMessage(message);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110",
          "bg-gradient-to-r from-purple-600 to-blue-600 text-white",
          isOpen && "rotate-90"
        )}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <Bot size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">AI Assistant</h3>
              <p className="text-xs text-white/80">I can register you instantly!</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              Clear
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 h-[350px] p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <Sparkles className="mx-auto mb-2 text-purple-400" size={32} />
                  <p className="text-gray-400 text-sm">
                    Hi{user ? ` ${user.email?.split('@')[0]}` : ''}! 👋
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    I can register you for tournaments instantly - just ask!
                  </p>
                </div>
                
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickAction(action.message)}
                      className="flex items-center gap-2 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <action.icon size={16} className="text-purple-400" />
                      <span className="text-xs text-gray-300">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-2",
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="p-1.5 bg-purple-600/20 rounded-full h-fit">
                        <Bot size={14} className="text-purple-400" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap",
                        msg.role === 'user'
                          ? 'bg-purple-600 text-white rounded-tr-none'
                          : 'bg-gray-800 text-gray-200 rounded-tl-none'
                      )}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div className="p-1.5 bg-gray-700 rounded-full h-fit">
                        <User size={14} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-2 items-center">
                    <div className="p-1.5 bg-purple-600/20 rounded-full">
                      <Bot size={14} className="text-purple-400" />
                    </div>
                    <div className="bg-gray-800 p-3 rounded-2xl rounded-tl-none">
                      <Loader2 size={16} className="animate-spin text-purple-400" />
                    </div>
                  </div>
                )}

                {/* Pending Registration Confirmation */}
                {pendingRegistration && (
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-lg border border-green-500/30 space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-white font-medium">Ready to Register</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Tournament: <span className="text-green-400">{pendingRegistration.tournamentName}</span>
                        </p>
                        {pendingRegistration.userProfile && (
                          <p className="text-xs text-gray-400">
                            As: {pendingRegistration.userProfile.name} ({pendingRegistration.userProfile.gameId})
                          </p>
                        )}
                        {pendingRegistration.entryFee && pendingRegistration.entryFee !== '0' && (
                          <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                            <AlertCircle size={12} />
                            Entry fee: ₹{pendingRegistration.entryFee}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={confirmRegistration}
                        disabled={isRegistering}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {isRegistering ? (
                          <>
                            <Loader2 size={14} className="mr-1 animate-spin" />
                            Registering...
                          </>
                        ) : (
                          'Confirm & Register'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelAction}
                        disabled={isRegistering}
                        className="flex-1 border-gray-600 text-gray-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Pending Action Confirmation (legacy) */}
                {pendingAction?.action === 'register_tournament' && !pendingRegistration && (
                  <div className="bg-gray-800 p-4 rounded-lg border border-purple-500/30">
                    <p className="text-sm text-gray-300 mb-3">
                      Ready to register for <span className="text-purple-400 font-semibold">{pendingAction.tournamentName || 'this tournament'}</span>?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={confirmAction}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        Yes, take me there
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelAction}
                        className="flex-1 border-gray-600 text-gray-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-700 bg-gray-800/50">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                disabled={isLoading || isRegistering}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading || isRegistering}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send size={18} />
              </Button>
            </div>
            {!user && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Log in for instant registration
              </p>
            )}
          </form>
        </div>
      )}
    </>
  );
};

export default AIChatbot;