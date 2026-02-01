import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles, Wallet, Trophy, Users, Gamepad2, CheckCircle, AlertCircle, Info, Zap, TrendingUp, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface QuickAction {
  label: string;
  icon: React.ElementType;
  message: string;
  category: 'main' | 'info' | 'action';
}

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [showAllActions, setShowAllActions] = useState(true);
  const [showCostInfo, setShowCostInfo] = useState(false);
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
    clearMessages,
    lastUsage,
    costInfo
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

  const allQuickActions: QuickAction[] = [
    // Main actions (always visible)
    { label: 'My Wallet', icon: Wallet, message: 'Show me my wallet balance', category: 'main' },
    { label: 'Tournaments', icon: Trophy, message: 'Show me available tournaments', category: 'main' },
    { label: 'Quick Register', icon: Gamepad2, message: 'Register me for the next free tournament', category: 'main' },
    { label: 'Leaderboards', icon: Users, message: 'Show me the leaderboards', category: 'main' },
    // Info actions
    { label: 'Live Matches', icon: Zap, message: 'Show me live matches', category: 'info' },
    { label: 'My Profile', icon: User, message: 'Show my profile details', category: 'info' },
    { label: 'My Stats', icon: TrendingUp, message: 'Show my gaming statistics and rankings', category: 'info' },
    { label: 'Help', icon: HelpCircle, message: 'What can you help me with?', category: 'info' },
  ];

  const handleQuickAction = (message: string) => {
    sendMessage(message);
    setShowAllActions(false);
  };

  const handleClear = () => {
    clearMessages();
    setShowAllActions(true);
    setShowCostInfo(false);
  };

  const mainActions = allQuickActions.filter(a => a.category === 'main');
  const infoActions = allQuickActions.filter(a => a.category === 'info');

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110",
          "bg-gradient-to-r from-orange-500 to-red-600 text-white",
          isOpen && "rotate-90"
        )}
        aria-label="Open Battle Mitra AI"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[400px] max-w-[calc(100vw-3rem)] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <Bot size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white flex items-center gap-2">
                Battle Mitra AI
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">BETA</span>
              </h3>
              <p className="text-xs text-white/80">Your gaming companion 🎮</p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCostInfo(!showCostInfo)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-2"
                title="View API costs"
              >
                <Info size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Cost Info Panel */}
          {showCostInfo && (
            <div className="bg-gray-800/90 border-b border-gray-700 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Model:</span>
                <span className="text-orange-400 font-medium">{costInfo?.modelDisplayName || 'Gemini 3 Flash'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Cost per 1K tokens:</span>
                <span className="text-gray-300">
                  Input: {costInfo?.costPer1kTokens?.input || '$0.00015'} | Output: {costInfo?.costPer1kTokens?.output || '$0.0006'}
                </span>
              </div>
              {lastUsage && (
                <>
                  <div className="border-t border-gray-700 pt-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Last request:</span>
                      <span className="text-green-400">{lastUsage.totalTokens} tokens</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Estimated cost:</span>
                      <span className="text-green-400">{lastUsage.estimatedCost}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Response time:</span>
                      <span className="text-blue-400">{lastUsage.responseTimeMs}ms</span>
                    </div>
                  </div>
                </>
              )}
              <p className="text-gray-500 text-[10px] mt-1">
                💡 Free tier includes monthly usage. Costs are approximate.
              </p>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 h-[380px] p-4" ref={scrollRef}>
            {messages.length === 0 && showAllActions ? (
              <div className="space-y-4">
                <div className="text-center py-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/20 to-red-600/20 mb-2">
                    <Sparkles className="text-orange-400" size={24} />
                  </div>
                  <p className="text-gray-300 text-sm font-medium">
                    Namaste{user ? `, ${user.email?.split('@')[0]}` : ''}! 👋
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    I'm Battle Mitra AI - your esports companion!
                  </p>
                </div>
                
                {/* Main Quick Actions */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 px-1">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    {mainActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickAction(action.message)}
                        className="flex items-center gap-2 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left border border-gray-700 hover:border-orange-500/50"
                      >
                        <action.icon size={16} className="text-orange-400 shrink-0" />
                        <span className="text-xs text-gray-300">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info Actions */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 px-1">More Options</p>
                  <div className="grid grid-cols-2 gap-2">
                    {infoActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickAction(action.message)}
                        className="flex items-center gap-2 p-2.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors text-left border border-gray-700/50 hover:border-gray-600"
                      >
                        <action.icon size={14} className="text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-400">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Suggestions */}
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                  <p className="text-xs text-gray-400 mb-2">💡 Try asking:</p>
                  <div className="space-y-1">
                    {[
                      "Register me for BGMI tournament",
                      "What's my wallet balance?",
                      "Show upcoming Free Fire tournaments",
                    ].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickAction(suggestion)}
                        className="block w-full text-left text-xs text-gray-500 hover:text-orange-400 transition-colors py-1"
                      >
                        "{suggestion}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Show quick actions button when in conversation */}
                {messages.length > 0 && (
                  <button
                    onClick={() => setShowAllActions(!showAllActions)}
                    className="w-full text-xs text-gray-500 hover:text-gray-400 py-1 flex items-center justify-center gap-1"
                  >
                    <Sparkles size={12} />
                    {showAllActions ? 'Hide' : 'Show'} quick actions
                  </button>
                )}

                {/* Collapsed quick actions in conversation */}
                {showAllActions && messages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-2 border-b border-gray-800">
                    {allQuickActions.slice(0, 6).map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickAction(action.message)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800/80 hover:bg-gray-700 rounded-full transition-colors text-xs text-gray-400 hover:text-gray-200 border border-gray-700/50"
                      >
                        <action.icon size={12} />
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-2",
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="p-1.5 bg-orange-600/20 rounded-full h-fit shrink-0">
                        <Bot size={14} className="text-orange-400" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] p-3 rounded-2xl text-sm",
                        msg.role === 'user'
                          ? 'bg-orange-600 text-white rounded-tr-none'
                          : 'bg-gray-800 text-gray-200 rounded-tl-none'
                      )}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>p:last-child]:mb-0">
                          <ReactMarkdown>
                            {msg.content.replace(/\[ACTION:[^\]]+\]/g, '')}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="p-1.5 bg-gray-700 rounded-full h-fit shrink-0">
                        <User size={14} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-2 items-center">
                    <div className="p-1.5 bg-orange-600/20 rounded-full">
                      <Bot size={14} className="text-orange-400" />
                    </div>
                    <div className="bg-gray-800 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-orange-400" />
                      <span className="text-xs text-gray-400">Thinking...</span>
                    </div>
                  </div>
                )}

                {/* Pending Registration Confirmation */}
                {pendingRegistration && (
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-lg border border-green-500/30 space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium">Ready to Register</p>
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          Tournament: <span className="text-green-400">{pendingRegistration.tournamentName}</span>
                        </p>
                        {pendingRegistration.userProfile && (
                          <p className="text-xs text-gray-400 truncate">
                            As: {pendingRegistration.userProfile.name} ({pendingRegistration.userProfile.gameId})
                          </p>
                        )}
                        {pendingRegistration.entryFee && pendingRegistration.entryFee !== '0' && pendingRegistration.entryFee !== 'FREE' && (
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
                        className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Pending Action Confirmation (legacy) */}
                {pendingAction?.action === 'register_tournament' && !pendingRegistration && (
                  <div className="bg-gray-800 p-4 rounded-lg border border-orange-500/30">
                    <p className="text-sm text-gray-300 mb-3">
                      Ready to register for <span className="text-orange-400 font-semibold">{pendingAction.tournamentName || 'this tournament'}</span>?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={confirmAction}
                        className="flex-1 bg-orange-600 hover:bg-orange-700"
                      >
                        Yes, take me there
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelAction}
                        className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
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
                placeholder="Ask Battle Mitra anything..."
                className="flex-1 bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 focus:border-orange-500"
                disabled={isLoading || isRegistering}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading || isRegistering}
                className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
              >
                <Send size={18} />
              </Button>
            </div>
            <div className="flex justify-between items-center mt-2 px-1">
              {!user ? (
                <p className="text-xs text-gray-500">
                  Log in for instant registration
                </p>
              ) : (
                <p className="text-xs text-gray-600">
                  Powered by AI ⚡
                </p>
              )}
              {lastUsage && (
                <p className="text-[10px] text-gray-600">
                  {lastUsage.totalTokens} tokens • {lastUsage.estimatedCost}
                </p>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
