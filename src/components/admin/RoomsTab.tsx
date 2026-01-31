import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { tournamentService } from '@/services/supabaseService';
import { tournamentRegistrationService, TournamentRoom } from '@/services/tournamentRegistrationService';
import { Tournament } from '@/types';
import { Lock, Key, Save, Users } from 'lucide-react';

const RoomsTab: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [rooms, setRooms] = useState<Record<string, TournamentRoom>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [roomData, setRoomData] = useState({ room_id: '', room_password: '' });
  
  const { toast } = useToast();

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const tournamentsData = await tournamentService.getAll();
      setTournaments(tournamentsData);
      
      // Load existing rooms for all tournaments
      const roomsData: Record<string, TournamentRoom> = {};
      await Promise.all(
        tournamentsData.map(async (tournament) => {
          const room = await tournamentRegistrationService.getTournamentRoom(tournament.id);
          if (room) {
            roomsData[tournament.id] = room;
          }
        })
      );
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    }
  };

  const handleEditRoom = (tournamentId: string) => {
    const existingRoom = rooms[tournamentId];
    setEditingRoom(tournamentId);
    setRoomData({
      room_id: existingRoom?.room_id || '',
      room_password: existingRoom?.room_password || ''
    });
  };

  const handleSaveRoom = async (tournamentId: string) => {
    setIsLoading(true);
    try {
      const updatedRoom = await tournamentRegistrationService.upsertTournamentRoom(
        tournamentId,
        roomData
      );
      
      setRooms(prev => ({
        ...prev,
        [tournamentId]: updatedRoom
      }));
      
      setEditingRoom(null);
      setRoomData({ room_id: '', room_password: '' });
      
      toast({
        title: "Room Updated",
        description: "Tournament room details have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update room details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingRoom(null);
    setRoomData({ room_id: '', room_password: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tournament Rooms</h2>
          <p className="text-muted-foreground">
            Manage room IDs and passwords for tournaments
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {tournaments.map((tournament) => {
          const room = rooms[tournament.id];
          const isEditing = editingRoom === tournament.id;
          
          return (
            <Card key={tournament.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      {tournament.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tournament.game} • {tournament.status}
                    </p>
                  </div>
                  <Badge variant={room?.room_id || room?.room_password ? "default" : "outline"}>
                    {room?.room_id || room?.room_password ? "Configured" : "Not Set"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`room-id-${tournament.id}`}>Room ID</Label>
                        <div className="relative">
                          <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id={`room-id-${tournament.id}`}
                            placeholder="Enter room ID"
                            className="pl-10"
                            value={roomData.room_id}
                            onChange={(e) => setRoomData(prev => ({ ...prev, room_id: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`room-password-${tournament.id}`}>Room Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id={`room-password-${tournament.id}`}
                            type="password"
                            placeholder="Enter room password"
                            className="pl-10"
                            value={roomData.room_password}
                            onChange={(e) => setRoomData(prev => ({ ...prev, room_password: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleSaveRoom(tournament.id)}
                        disabled={isLoading}
                        size="sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isLoading ? 'Saving...' : 'Save'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleCancelEdit}
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Room ID</p>
                        <p className="font-mono text-sm mt-1">
                          {room?.room_id || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Room Password</p>
                        <p className="font-mono text-sm mt-1">
                          {room?.room_password ? '••••••••' : 'Not set'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditRoom(tournament.id)}
                    >
                      {room?.room_id || room?.room_password ? 'Edit Room' : 'Set Room Details'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tournaments.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No tournaments found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RoomsTab;