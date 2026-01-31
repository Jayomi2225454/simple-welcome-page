import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Play, Pause, Square, Timer } from 'lucide-react';

interface TournamentTimerAdminProps {
  tournamentId: string;
  currentDuration?: number;
  isRunning?: boolean;
  onTimerUpdate?: () => void;
}

const TournamentTimerAdmin: React.FC<TournamentTimerAdminProps> = ({
  tournamentId,
  currentDuration = 0,
  isRunning = false,
  onTimerUpdate
}) => {
  const [duration, setDuration] = useState(Math.floor(currentDuration / 60)); // Convert to minutes
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSetTimer = async () => {
    if (duration <= 0) {
      toast({
        title: "Invalid Duration",
        description: "Please enter a valid duration in minutes",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          timer_duration: duration * 60, // Convert to seconds
          timer_start_time: new Date().toISOString(),
          timer_is_running: false
        })
        .eq('id', tournamentId);

      if (error) throw error;

      toast({
        title: "Timer Set",
        description: `Tournament timer set to ${duration} minutes`,
      });

      onTimerUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to set timer",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTimer = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          timer_start_time: new Date().toISOString(),
          timer_is_running: true
        })
        .eq('id', tournamentId);

      if (error) throw error;

      toast({
        title: "Timer Started",
        description: "Tournament timer has been started",
      });

      onTimerUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start timer",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseTimer = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          timer_is_running: false
        })
        .eq('id', tournamentId);

      if (error) throw error;

      toast({
        title: "Timer Paused",
        description: "Tournament timer has been paused",
      });

      onTimerUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to pause timer",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTimer = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          timer_duration: 0,
          timer_start_time: null,
          timer_is_running: false
        })
        .eq('id', tournamentId);

      if (error) throw error;

      toast({
        title: "Timer Stopped",
        description: "Tournament timer has been stopped and reset",
      });

      onTimerUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to stop timer",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Timer className="w-5 h-5" />
          Tournament Timer Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="duration" className="text-gray-300">
            Timer Duration (minutes)
          </Label>
          <Input
            id="duration"
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="Enter duration in minutes"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSetTimer}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Clock className="w-4 h-4 mr-2" />
            Set Timer
          </Button>

          {currentDuration > 0 && (
            <>
              {!isRunning ? (
                <Button
                  onClick={handleStartTimer}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </Button>
              ) : (
                <Button
                  onClick={handlePauseTimer}
                  disabled={isLoading}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}

              <Button
                onClick={handleStopTimer}
                disabled={isLoading}
                variant="destructive"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop & Reset
              </Button>
            </>
          )}
        </div>

        {currentDuration > 0 && (
          <div className="text-sm text-gray-400">
            Current timer: {Math.floor(currentDuration / 60)} minutes ({currentDuration} seconds)
            {isRunning && " - Running"}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TournamentTimerAdmin;