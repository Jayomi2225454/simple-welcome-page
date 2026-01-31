import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type AppMode = 'esports' | 'sports';

interface ModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  isEsports: boolean;
  isSports: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const useMode = () => {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};

interface ModeProviderProps {
  children: ReactNode;
}

export const ModeProvider: React.FC<ModeProviderProps> = ({ children }) => {
  const [mode, setModeState] = useState<AppMode>(() => {
    // Get saved mode from localStorage or default to 'esports'
    const savedMode = localStorage.getItem('battle-mitra-mode');
    return (savedMode === 'sports' ? 'sports' : 'esports') as AppMode;
  });

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem('battle-mitra-mode', newMode);
  };

  const toggleMode = () => {
    const newMode = mode === 'esports' ? 'sports' : 'esports';
    setMode(newMode);
  };

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.remove('esports-mode', 'sports-mode');
    document.documentElement.classList.add(`${mode}-mode`);
  }, [mode]);

  const value: ModeContextType = {
    mode,
    setMode,
    toggleMode,
    isEsports: mode === 'esports',
    isSports: mode === 'sports',
  };

  return (
    <ModeContext.Provider value={value}>
      {children}
    </ModeContext.Provider>
  );
};
