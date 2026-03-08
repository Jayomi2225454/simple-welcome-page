import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Zap, Trophy, Users } from 'lucide-react';
import { useMode } from '@/contexts/ModeContext';

const Welcome = () => {
  const [hoveredSection, setHoveredSection] = useState<'esports' | 'sports' | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { setMode } = useMode();
  const navigate = useNavigate();

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleEsportsClick = () => {
    setIsTransitioning(true);
    setMode('esports');
    setTimeout(() => navigate('/esports'), 400);
  };

  const handleSportsClick = () => {
    setIsTransitioning(true);
    setMode('sports');
    setTimeout(() => navigate('/sports'), 400);
  };

  return (
    <div className={`min-h-screen bg-black relative overflow-hidden transition-all duration-500 ${
      isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
    }`}>
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
        
        {/* Floating particles - reduced on mobile for performance */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>

        {/* Gradient overlays based on hover */}
        <div 
          className={`absolute inset-0 bg-gradient-to-r from-purple-900/40 via-transparent to-transparent transition-opacity duration-700 ${
            hoveredSection === 'esports' ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div 
          className={`absolute inset-0 bg-gradient-to-l from-emerald-900/40 via-transparent to-transparent transition-opacity duration-700 ${
            hoveredSection === 'sports' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* Header */}
      <header className={`relative z-10 py-4 sm:py-6 px-4 sm:px-8 transition-all duration-700 delay-100 ${
        isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src="/lovable-uploads/2aa9115f-ce05-4d8a-bab3-2cf4f362ef5e.png" 
              alt="Battle Mitra Logo" 
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
            />
            <span className="text-xl sm:text-2xl font-bold text-white">Battle Mitra</span>
          </div>
          <Link 
            to="/auth" 
            className="px-4 sm:px-6 py-2 bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm font-medium transition-all duration-300"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-120px)] px-4 py-6 sm:py-0">
        {/* Title */}
        <div className={`text-center mb-8 sm:mb-12 lg:mb-16 transition-all duration-700 delay-200 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full mb-4 sm:mb-6">
            <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
            <span className="text-xs sm:text-sm text-gray-300">Choose Your Arena</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-3 sm:mb-4">
            <span className="text-white">Welcome to</span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-emerald-400 bg-clip-text text-transparent">
              Battle Mitra Multiverse
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-4">
            Two worlds. One platform. Infinite possibilities.
          </p>
        </div>

        {/* Portal Selection */}
        <div className={`w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 px-2 sm:px-4 transition-all duration-700 delay-300 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}>
          {/* Esports Portal */}
          <button
            onClick={handleEsportsClick}
            onMouseEnter={() => setHoveredSection('esports')}
            onMouseLeave={() => setHoveredSection(null)}
            onTouchStart={() => setHoveredSection('esports')}
            onTouchEnd={() => setHoveredSection(null)}
            className="group relative w-full touch-manipulation"
          >
            <div className={`absolute inset-0 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl sm:rounded-3xl blur-xl transition-all duration-500 ${
              hoveredSection === 'esports' ? 'opacity-60 scale-105' : 'opacity-30'
            }`} />
            
            <div className={`relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border-2 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 lg:p-12 transition-all duration-500 active:scale-[0.98] ${
              hoveredSection === 'esports' 
                ? 'border-purple-500/80 transform scale-[1.02]' 
                : 'border-purple-500/30 hover:border-purple-500/50'
            }`}>
              {/* Icon */}
              <div className={`w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 mx-auto mb-4 sm:mb-6 flex items-center justify-center transition-all duration-500 ${
                hoveredSection === 'esports' ? 'scale-110' : ''
              }`}>
                <img 
                  src="/lovable-uploads/b263082d-907f-4305-88f6-cda9b8e2ecac.png" 
                  alt="Esports Logo" 
                  className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 object-contain"
                />
              </div>

              {/* Title */}
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3 text-center">
                Esports
              </h2>
              <p className="text-sm sm:text-base text-gray-400 text-center mb-4 sm:mb-6">
                Compete in online gaming tournaments. Play BGMI, Free Fire, and more.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="bg-purple-500/10 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 mx-auto mb-1 sm:mb-2" />
                  <div className="text-base sm:text-lg font-bold text-white">10+</div>
                  <div className="text-[9px] sm:text-xs text-gray-400">Tournaments</div>
                </div>
                <div className="bg-blue-500/10 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mx-auto mb-1 sm:mb-2" />
                  <div className="text-base sm:text-lg font-bold text-white">1k+</div>
                  <div className="text-[9px] sm:text-xs text-gray-400">Players</div>
                </div>
                <div className="bg-pink-500/10 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400 mx-auto mb-1 sm:mb-2" />
                  <div className="text-base sm:text-lg font-bold text-white">₹10K+</div>
                  <div className="text-[9px] sm:text-xs text-gray-400">Prize Pool</div>
                </div>
              </div>

              {/* CTA */}
              <div className={`w-full py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-sm sm:text-base text-center transition-all duration-300 ${
                hoveredSection === 'esports' ? 'shadow-lg shadow-purple-500/30' : ''
              }`}>
                Enter Esports Arena →
              </div>
            </div>
          </button>

          {/* Offline Sports Portal */}
          <button
            onClick={handleSportsClick}
            onMouseEnter={() => setHoveredSection('sports')}
            onMouseLeave={() => setHoveredSection(null)}
            onTouchStart={() => setHoveredSection('sports')}
            onTouchEnd={() => setHoveredSection(null)}
            className="group relative w-full touch-manipulation"
          >
            <div className={`absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl sm:rounded-3xl blur-xl transition-all duration-500 ${
              hoveredSection === 'sports' ? 'opacity-60 scale-105' : 'opacity-30'
            }`} />
            
            <div className={`relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border-2 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 lg:p-12 transition-all duration-500 active:scale-[0.98] ${
              hoveredSection === 'sports' 
                ? 'border-emerald-500/80 transform scale-[1.02]' 
                : 'border-emerald-500/30 hover:border-emerald-500/50'
            }`}>
              {/* Icon */}
              <div className={`w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 mx-auto mb-4 sm:mb-6 flex items-center justify-center transition-all duration-500 ${
                hoveredSection === 'sports' ? 'scale-110' : ''
              }`}>
                <img 
                  src="/lovable-uploads/b263082d-907f-4305-88f6-cda9b8e2ecac.png" 
                  alt="Sports Logo" 
                  className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 object-contain"
                />
              </div>

              {/* Title */}
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3 text-center">
                Offline Sports
              </h2>
              <p className="text-sm sm:text-base text-gray-400 text-center mb-4 sm:mb-6">
                Join local sports tournaments. Cricket, Football, Badminton & more.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-emerald-500/10 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-xl font-bold text-white">200+</div>
                  <div className="text-[10px] sm:text-xs text-gray-400">Matches</div>
                </div>
                <div className="bg-teal-500/10 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-xl font-bold text-white">5k+</div>
                  <div className="text-[10px] sm:text-xs text-gray-400">Athletes</div>
                </div>
              </div>

              {/* CTA */}
              <div className={`w-full py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm sm:text-base text-center transition-all duration-300 ${
                hoveredSection === 'sports' ? 'shadow-lg shadow-emerald-500/30' : ''
              }`}>
                Coming Soon
              </div>
            </div>
          </button>
        </div>

        {/* Bottom Text */}
        <p className={`mt-8 sm:mt-12 text-gray-500 text-xs sm:text-sm text-center transition-all duration-700 delay-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}>
          Battle Mitra — Where Champions Are Made
        </p>
      </main>
    </div>
  );
};

export default Welcome;
