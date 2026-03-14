import React, { useState, useEffect } from 'react';
import { Clock, Timer } from 'lucide-react';
import { Tournament } from '@/types';

interface TournamentCardTimerProps {
  tournament: Tournament;
}

const TournamentCardTimer: React.FC<TournamentCardTimerProps> = ({ tournament }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timerType, setTimerType] = useState<'countdown' | 'duration' | 'none'>('none');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const checkTimer = () => {
      const now = new Date();
      const currentTime = now.getTime();
      
      // Check if tournament has specific start/end times
      if (tournament.start_time && tournament.end_time) {
        const startDate = new Date(tournament.start_date);
        const endDate = new Date(tournament.end_date);
        
        const [startHour, startMinute] = tournament.start_time.split(':');
        const [endHour, endMinute] = tournament.end_time.split(':');
        
        const tournamentStart = new Date(startDate);
        tournamentStart.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
        
        const tournamentEnd = new Date(endDate);
        tournamentEnd.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
        
        const startTime = tournamentStart.getTime();
        const endTime = tournamentEnd.getTime();
        
        if (currentTime < startTime) {
          const remaining = Math.floor((startTime - currentTime) / 1000);
          if (remaining > 0) {
            setTimeLeft(remaining);
            setTimerType('countdown');
            setIsActive(true);
            return;
          }
        } else if (currentTime >= startTime && currentTime < endTime) {
          const remaining = Math.floor((endTime - currentTime) / 1000);
          if (remaining > 0) {
            setTimeLeft(remaining);
            setTimerType('duration');
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
          setIsActive(true);
          return;
        }
      }

      // Show countdown to start date for upcoming tournaments
      if (tournament.status === 'upcoming') {
        const startDate = new Date(tournament.start_date);
        const remaining = Math.floor((startDate.getTime() - currentTime) / 1000);
        if (remaining > 0) {
          setTimeLeft(remaining);
          setTimerType('countdown');
          setIsActive(true);
          return;
        }
      }
      
      setIsActive(false);
      setTimerType('none');
    };

    checkTimer();
    interval = setInterval(checkTimer, 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [tournament]);

  if (!isActive || timeLeft <= 0 || tournament.status === 'completed') {
    return null;
  }

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold ${
      timerType === 'countdown' 
        ? 'bg-blue-500/90 text-white' 
        : 'bg-red-500/90 text-white animate-pulse'
    }`}>
      {timerType === 'countdown' ? (
        <Clock className="w-3 h-3" />
      ) : (
        <Timer className="w-3 h-3" />
      )}
      <span>{formatTime(timeLeft)}</span>
    </div>
  );
};

export default TournamentCardTimer;
