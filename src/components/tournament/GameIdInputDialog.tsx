import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gamepad } from 'lucide-react';

interface GameIdInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (gameId: string) => void;
  isLoading?: boolean;
}

const GameIdInputDialog: React.FC<GameIdInputDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false
}) => {
  const [gameId, setGameId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameId.trim()) {
      onSubmit(gameId.trim());
      setGameId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Gamepad className="w-5 h-5" />
            Enter Your Game ID
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="gameId" className="text-gray-300">
                Game ID (In-Game Username)
              </Label>
              <Input
                id="gameId"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Enter your in-game username"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                required
              />
              <p className="text-sm text-gray-400">
                This will be displayed in the registered players list
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!gameId.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Registering...' : 'Complete Registration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GameIdInputDialog;