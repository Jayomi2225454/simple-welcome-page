import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, Menu, X, LogOut, Settings, MessageCircle, Phone, Mail, Home, Shield, Headphones } from 'lucide-react';
import LiveSupportChat from '@/components/chat/LiveSupportChat';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const { mode, isEsports, isSports } = useMode();

  // Esports navigation
  const esportsNavigation = [
    { name: 'Tournaments', href: '/tournaments' },
    { name: 'Leaderboards', href: '/leaderboards' },
    { name: 'Live Matches', href: '/live-matches' },
    { name: 'Wallet', href: '/wallet' },
  ];

  // Sports navigation
  const sportsNavigation = [
    { name: 'Tournaments', href: '/sports/tournaments' },
    { name: 'Leaderboards', href: '/sports/leaderboards' },
    { name: 'Live Matches', href: '/sports/live-matches' },
    { name: 'Wallet', href: '/wallet' },
  ];

  const navigation = isEsports ? esportsNavigation : sportsNavigation;
  const homeLink = isEsports ? '/' : '/sports';

  const isActive = (path: string) => location.pathname === path;

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (!error && data === true) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      }
    };

    checkAdminRole();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const handleWhatsAppSupport = () => {
    window.open('https://wa.me/919876543210', '_blank');
  };

  const handleCallSupport = () => {
    window.location.href = 'tel:+919876543210';
  };

  const handleEmailSupport = () => {
    window.location.href = 'mailto:support@battlemitra.com';
  };

  const brandGradientClass = isEsports 
    ? "from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
    : "from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600";

  const borderAccentClass = isEsports
    ? "border-purple-500/20"
    : "border-emerald-500/20";

  const activeTextClass = isEsports
    ? "text-purple-400 border-b-2 border-purple-400"
    : "text-emerald-400 border-b-2 border-emerald-400";

  const activeMobileClass = isEsports
    ? "text-purple-400 bg-purple-500/10"
    : "text-emerald-400 bg-emerald-500/10";

  return (
    <header className={`bg-gray-900/95 backdrop-blur-sm border-b ${borderAccentClass} sticky top-0 z-50`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to={homeLink} className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/b263082d-907f-4305-88f6-cda9b8e2ecac.png" 
              alt="Battle Mitra Logo" 
              className="w-12 h-12 object-contain"
            />
            <span className="text-white font-bold text-xl">Battle Mitra</span>
          </Link>

          {/* Multiverse Home Button - Desktop */}
          <Link 
            to="/" 
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm font-medium transition-all duration-300"
          >
            <Home className="w-4 h-4" />
            <span>Multiverse</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`transition-colors duration-200 ${
                  isActive(item.href)
                    ? activeTextClass
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
              <Search className="w-5 h-5" />
            </Button>
            
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
            ) : user ? (
              <>
                {/* Admin Badge */}
                {isAdmin && (
                  <Badge 
                    variant="outline" 
                    className="hidden sm:flex items-center gap-1 border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  >
                    <Shield className="w-3 h-3" />
                    <span className="text-xs font-medium">Admin</span>
                  </Badge>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      {isAdmin && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                      )}
                      <Avatar className="h-9 w-9">
                        <AvatarImage 
                          src={user.user_metadata?.avatar_url || ''} 
                          alt={user.user_metadata?.name || user.email || 'User'} 
                        />
                        <AvatarFallback className={`bg-gradient-to-r ${brandGradientClass} text-white`}>
                          {(user.user_metadata?.name || user.email || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-gray-800 border-gray-700" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal text-white">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none">
                          {user.user_metadata?.name || 'User'}
                        </p>
                        {isAdmin && (
                          <Badge 
                            variant="outline" 
                            className="text-[10px] px-1.5 py-0 border-amber-500/50 bg-amber-500/10 text-amber-400"
                          >
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs leading-none text-gray-400">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem 
                    className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                    onClick={() => navigate('/profile')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuItem 
                        className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                        onClick={() => navigate('/admin')}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Esports Admin</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                        onClick={() => navigate('/sports/admin')}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Sports Admin</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem 
                    className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                    onClick={() => setShowLiveChat(true)}
                  >
                    <Headphones className="mr-2 h-4 w-4" />
                    <span>Live Support</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                    onClick={handleWhatsAppSupport}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    <span>WhatsApp Support</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                    onClick={handleCallSupport}
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    <span>Call Support</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                    onClick={handleEmailSupport}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    <span>Email Support</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem 
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            ) : (
              /* Login/Signup buttons for non-authenticated users */
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-300 hover:text-white"
                  onClick={() => navigate('/auth')}
                >
                  Login
                </Button>
                <Button 
                  className={`bg-gradient-to-r ${brandGradientClass}`}
                  onClick={() => navigate('/auth')}
                >
                  Sign Up
                </Button>
              </>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-gray-300"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className={`md:hidden py-4 border-t ${borderAccentClass}`}>
            {/* Multiverse Home Button - Mobile */}
            <Link 
              to="/" 
              className="flex items-center gap-2 mx-3 mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 rounded-full text-white text-sm font-medium transition-all duration-300 w-fit"
              onClick={() => setIsMenuOpen(false)}
            >
              <Home className="w-4 h-4" />
              <span>Back to Multiverse</span>
            </Link>
            <nav className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2 rounded-md transition-colors duration-200 ${
                    isActive(item.href)
                      ? activeMobileClass
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
      {showLiveChat && (
        <LiveSupportChat isOpen={showLiveChat} onClose={() => setShowLiveChat(false)} />
      )}
    </header>
  );
};

export default Header;
