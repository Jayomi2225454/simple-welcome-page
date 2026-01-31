import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Play, Pause } from 'lucide-react';
import { Tournament } from '@/types';

interface TournamentTimerProps {
  tournament: Tournament;
}

const TournamentTimer: React.FC<TournamentTimerProps> = ({ tournament }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timerType, setTimerType] = useState<'countdown' | 'duration' | 'none'>('none');
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const checkTimer = () => {
      const now = new Date();
      const currentTime = now.getTime();
      
      // Check if tournament has specific start/end times
      if (tournament.start_time && tournament.end_time) {
        const startDate = new Date(tournament.start_date);
        const endDate = new Date(tournament.end_date);
        
        // Create full datetime objects for start and end
        const [startHour, startMinute] = tournament.start_time.split(':');
        const [endHour, endMinute] = tournament.end_time.split(':');
        
        const tournamentStart = new Date(startDate);
        tournamentStart.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
        
        const tournamentEnd = new Date(endDate);
        tournamentEnd.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
        
        const startTime = tournamentStart.getTime();
        const endTime = tournamentEnd.getTime();
        
        if (currentTime < startTime) {
          // Tournament hasn't started yet - show countdown to start
          const remaining = Math.floor((startTime - currentTime) / 1000);
          if (remaining > 0) {
            setTimeLeft(remaining);
            setTimerType('countdown');
            setDisplayText('Tournament starts in');
            setIsActive(true);
            return;
          }
        } else if (currentTime >= startTime && currentTime < endTime) {
          // Tournament is ongoing - show time remaining
          const remaining = Math.floor((endTime - currentTime) / 1000);
          if (remaining > 0) {
            setTimeLeft(remaining);
            setTimerType('duration');
            setDisplayText('Tournament ends in');
            setIsActive(true);
            return;
          }
        }
      }
      
      // Fall back to manual timer if available
      if (tournament.timer_duration && tournament.timer_start_time && tournament.timer_is_running) {
        const startTime = new Date(tournament.timer_start_time).getTime();
        const elapsed = Math.floor((currentTime - startTime) / 1000);
        const remaining = tournament.timer_duration - elapsed;

        if (remaining > 0) {
          setTimeLeft(remaining);
          setTimerType('duration');
          setDisplayText('Tournament Timer');
          setIsActive(true);
          return;
        }
      }
      
      // No active timer
      setIsActive(false);
      setTimerType('none');
    };

    checkTimer();

    if (isActive) {
      interval = setInterval(checkTimer, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [tournament, isActive]);

  if (!isActive || timeLeft <= 0) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColors = () => {
    if (timerType === 'countdown') {
      return {
        bg: 'bg-blue-900/20',
        border: 'border-blue-600/50',
        icon: 'text-blue-400',
        text: 'text-blue-300',
        time: 'text-blue-100'
      };
    } else {
      return {
        bg: 'bg-red-900/20',
        border: 'border-red-600/50', 
        icon: 'text-red-400',
        text: 'text-red-300',
        time: 'text-red-100'
      };
    }
  };

  const colors = getTimerColors();
  const Icon = timerType === 'countdown' ? Clock : (tournament.timer_is_running ? Pause : Play);

  return (
    <Card className={`${colors.bg} ${colors.border} mb-6`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-center gap-3">
          <Icon className={`w-6 h-6 ${colors.icon} ${timerType === 'duration' ? 'animate-pulse' : ''}`} />
          <div className="text-center">
            <p className={`${colors.text} text-sm font-medium`}>{displayText}</p>
            <p className={`${colors.time} text-2xl font-bold font-mono`}>{formatTime(timeLeft)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TournamentTimer;