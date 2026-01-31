import { Gamepad2, Dumbbell, Home } from 'lucide-react';
import { useMode } from '@/contexts/ModeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const ModeSwitcher = () => {
  const { mode, setMode } = useMode();
  const navigate = useNavigate();
  const location = useLocation();

  const handleModeChange = (newMode: 'esports' | 'sports') => {
    setMode(newMode);
    // Navigate to the appropriate home page
    if (newMode === 'esports') {
      navigate('/esports');
    } else {
      navigate('/sports');
    }
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Home/Multiverse Button */}
      <button
        onClick={handleHomeClick}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
          "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10"
        )}
        title="Back to Multiverse"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Multiverse</span>
      </button>

      {/* Mode Toggle */}
      <div className="flex items-center bg-secondary/50 rounded-full p-1 border border-border">
        <button
          onClick={() => handleModeChange('esports')}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
            mode === 'esports'
              ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Gamepad2 className="w-4 h-4" />
          <span className="hidden sm:inline">Esports</span>
        </button>
        <button
          onClick={() => handleModeChange('sports')}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
            mode === 'sports'
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Dumbbell className="w-4 h-4" />
          <span className="hidden sm:inline">Sports</span>
        </button>
      </div>
    </div>
  );
};

export default ModeSwitcher;
