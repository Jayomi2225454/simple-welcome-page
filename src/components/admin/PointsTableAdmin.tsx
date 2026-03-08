import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, Edit, Users, Trophy, Shuffle, Upload, Camera, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useGameStore } from '@/store/gameStore';
import PlayerPointsAdmin from './PlayerPointsAdmin';
interface PointEntry {
  id?: string;
  team_id: string;
  team_name: string;
  group_name: string | null;
  points: number;
  kills: number;
  wins: number;
  position: number;
  position_in_group: number | null;
}

interface OCRMatchedTeam {
  teamId: string;
  teamName: string;
  playerName: string;
  matchedPlayerName: string;
  kills: number;
  points: number;
  position: number;
  confidence: number;
  selected: boolean;
}

interface OCRUnmatchedPlayer {
  playerName: string;
  kills?: number;
  points?: number;
  position?: number;
}

const PointsTableAdmin = () => {
  const { toast } = useToast();
  const { tournaments } = useGameStore();
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [groupMode, setGroupMode] = useState<'single' | 'multiple'>('single');
  const [numberOfGroups, setNumberOfGroups] = useState<number>(2);
  const [teamsPerGroup, setTeamsPerGroup] = useState<number>(4);
  const [pointsEntries, setPointsEntries] = useState<PointEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [tableSaveStatus, setTableSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const tableDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableDirtyRef = useRef(false);
  const pointsEntriesRef = useRef(pointsEntries);

  // OCR states
  const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrImagePreview, setOcrImagePreview] = useState<string | null>(null);
  const [ocrMatchedTeams, setOcrMatchedTeams] = useState<OCRMatchedTeam[]>([]);
  const [ocrUnmatchedPlayers, setOcrUnmatchedPlayers] = useState<OCRUnmatchedPlayer[]>([]);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);

  // New entry form
  const [newEntry, setNewEntry] = useState<PointEntry>({
    team_id: '',
    team_name: '',
    group_name: null,
    points: 0,
    kills: 0,
    wins: 0,
    position: 1,
    position_in_group: null,
  });

  // Load existing points when tournament is selected
  useEffect(() => {
    if (selectedTournament) {
      loadPointsTable();
    }
  }, [selectedTournament]);

  const loadPointsTable = async () => {
    if (!selectedTournament) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournament_points')
        .select('*')
        .eq('tournament_id', selectedTournament)
        .order('position', { ascending: true });

      if (error) throw error;
      
      setPointsEntries(data || []);
      
      // Detect group mode from existing data
      const hasGroups = data?.some(entry => entry.group_name);
      setGroupMode(hasGroups ? 'multiple' : 'single');
    } catch (error: any) {
      console.error('Error loading points:', error);
      toast({
        title: "Error",
        description: "Failed to load points table",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePositions = (entries: PointEntry[]): PointEntry[] => {
    // Sort by points descending
    const sorted = [...entries].sort((a, b) => b.points - a.points);
    
    if (groupMode === 'single') {
      return sorted.map((entry, index) => ({
        ...entry,
        position: index + 1,
        position_in_group: null,
        group_name: null,
      }));
    } else {
      // Calculate positions within each group
      const groups = new Map<string, PointEntry[]>();
      sorted.forEach(entry => {
        const group = entry.group_name || 'A';
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group)!.push(entry);
      });

      const result: PointEntry[] = [];
      let globalPosition = 1;
      
      // Sort groups and assign positions
      const allGrouped = Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .flatMap(([groupName, groupEntries]) => {
          return groupEntries
            .sort((a, b) => b.points - a.points)
            .map((entry, idx) => ({
              ...entry,
              group_name: groupName,
              position_in_group: idx + 1,
            }));
        });

      // Assign global positions based on points
      allGrouped
        .sort((a, b) => b.points - a.points)
        .forEach((entry, idx) => {
          result.push({ ...entry, position: idx + 1 });
        });

      return result;
    }
  };

  const handleAddEntry = async () => {
    if (!selectedTournament || !newEntry.team_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a tournament and enter team name",
        variant: "destructive",
      });
      return;
    }

    try {
      const teamId = crypto.randomUUID();
      const entryToAdd = {
        ...newEntry,
        team_id: teamId,
        tournament_id: selectedTournament,
        group_name: groupMode === 'multiple' ? (newEntry.group_name || 'A') : null,
        position_in_group: groupMode === 'multiple' ? 1 : null,
      };

      const { data, error } = await supabase
        .from('tournament_points')
        .insert(entryToAdd)
        .select()
        .single();

      if (error) throw error;

      const updatedEntries = [...pointsEntries, data];
      const recalculated = calculatePositions(updatedEntries);
      
      // Update all positions in database
      await updateAllPositions(recalculated);
      
      setPointsEntries(recalculated);
      setNewEntry({
        team_id: '',
        team_name: '',
        group_name: groupMode === 'multiple' ? 'A' : null,
        points: 0,
        kills: 0,
        wins: 0,
        position: 1,
        position_in_group: null,
      });

      toast({
        title: "Success",
        description: "Team added to points table",
      });
    } catch (error: any) {
      console.error('Error adding entry:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add entry",
        variant: "destructive",
      });
    }
  };

  const updateAllPositions = async (entries: PointEntry[]) => {
    for (const entry of entries) {
      if (entry.id) {
        await supabase
          .from('tournament_points')
          .update({
            position: entry.position,
            position_in_group: entry.position_in_group,
            group_name: entry.group_name,
          })
          .eq('id', entry.id);
      }
    }
  };

  const handleUpdateEntry = async (entryId: string, updates: Partial<PointEntry>) => {
    try {
      const { error } = await supabase
        .from('tournament_points')
        .update(updates)
        .eq('id', entryId);

      if (error) throw error;

      const updatedEntries = pointsEntries.map(e => 
        e.id === entryId ? { ...e, ...updates } : e
      );
      
      const recalculated = calculatePositions(updatedEntries);
      await updateAllPositions(recalculated);
      
      setPointsEntries(recalculated);
      setEditingEntry(null);

      toast({
        title: "Success",
        description: "Entry updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update entry",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('tournament_points')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      const remaining = pointsEntries.filter(e => e.id !== entryId);
      const recalculated = calculatePositions(remaining);
      await updateAllPositions(recalculated);
      
      setPointsEntries(recalculated);

      toast({
        title: "Success",
        description: "Entry deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  const handleDistributeTeams = () => {
    if (pointsEntries.length === 0) {
      toast({
        title: "No Teams",
        description: "Add teams first before distributing",
        variant: "destructive",
      });
      return;
    }

    const shuffled = [...pointsEntries].sort(() => Math.random() - 0.5);
    const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, numberOfGroups);
    
    const distributed = shuffled.map((entry, index) => ({
      ...entry,
      group_name: groups[index % numberOfGroups],
    }));

    const recalculated = calculatePositions(distributed);
    setPointsEntries(recalculated);

    toast({
      title: "Teams Distributed",
      description: `Teams distributed equally across ${numberOfGroups} groups`,
    });
  };

  // Keep ref in sync
  useEffect(() => {
    pointsEntriesRef.current = pointsEntries;
  }, [pointsEntries]);

  const autoSaveTable = useCallback(async () => {
    if (!tableDirtyRef.current) return;
    const entries = pointsEntriesRef.current;
    setTableSaveStatus('saving');
    try {
      for (const entry of entries) {
        if (entry.id) {
          await supabase
            .from('tournament_points')
            .update({
              team_name: entry.team_name,
              group_name: entry.group_name,
              points: entry.points,
              kills: entry.kills,
              wins: entry.wins,
              position: entry.position,
              position_in_group: entry.position_in_group,
            })
            .eq('id', entry.id);
        }
      }
      tableDirtyRef.current = false;
      setTableSaveStatus('saved');
      setTimeout(() => setTableSaveStatus('idle'), 2000);
    } catch (error: any) {
      setTableSaveStatus('idle');
      toast({
        title: "Auto-save failed",
        description: error.message || "Failed to save changes",
        variant: "destructive",
      });
    }
  }, [toast]);

  const triggerTableAutoSave = useCallback(() => {
    tableDirtyRef.current = true;
    setTableSaveStatus('idle');
    if (tableDebounceRef.current) clearTimeout(tableDebounceRef.current);
    tableDebounceRef.current = setTimeout(() => {
      autoSaveTable();
    }, 1500);
  }, [autoSaveTable]);

  useEffect(() => {
    return () => {
      if (tableDebounceRef.current) clearTimeout(tableDebounceRef.current);
    };
  }, []);

  const handleInlineEdit = (entryId: string, field: keyof PointEntry, value: string | number) => {
    setPointsEntries(prev => {
      const updated = prev.map(p => p.id === entryId ? { ...p, [field]: value } : p);
      return calculatePositions(updated);
    });
    triggerTableAutoSave();
  };

  // Get unique groups from entries
  const uniqueGroups = [...new Set(pointsEntries.map(e => e.group_name).filter(Boolean))].sort();

  // OCR Functions
  const handleOCRFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image under 10MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setOcrImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Convert to base64 and process
    await processOCRImage(file);
  };

  const processOCRImage = async (file: File) => {
    setOcrLoading(true);
    setOcrError(null);
    setOcrMatchedTeams([]);
    setOcrUnmatchedPlayers([]);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Call the OCR edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-points-extract`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            imageBase64: base64,
            tournamentId: selectedTournament,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OCR processing failed');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Set matched teams with selection state
      setOcrMatchedTeams(
        (data.matchedTeams || []).map((team: OCRMatchedTeam) => ({
          ...team,
          selected: true,
        }))
      );
      setOcrUnmatchedPlayers(data.unmatchedPlayers || []);

      if (data.matchedTeams?.length === 0 && data.unmatchedPlayers?.length === 0) {
        setOcrError('No player data could be extracted from the image. Please try a clearer screenshot.');
      } else {
        setOcrDialogOpen(true);
      }

      toast({
        title: "OCR Complete",
        description: `Found ${data.matchedTeams?.length || 0} matched teams, ${data.unmatchedPlayers?.length || 0} unmatched players`,
      });
    } catch (error: any) {
      console.error('OCR error:', error);
      setOcrError(error.message || 'Failed to process image');
      toast({
        title: "OCR Failed",
        description: error.message || "Failed to extract data from image",
        variant: "destructive",
      });
    } finally {
      setOcrLoading(false);
    }
  };

  const toggleOCRTeamSelection = (teamId: string) => {
    setOcrMatchedTeams(prev =>
      prev.map(team =>
        team.teamId === teamId ? { ...team, selected: !team.selected } : team
      )
    );
  };

  const applyOCRPoints = async () => {
    const selectedTeams = ocrMatchedTeams.filter(t => t.selected);
    
    if (selectedTeams.length === 0) {
      toast({
        title: "No Teams Selected",
        description: "Please select at least one team to update",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      for (const team of selectedTeams) {
        // Find the existing entry and update it
        const existingEntry = pointsEntries.find(e => e.id === team.teamId);
        
        if (existingEntry) {
          // Add the OCR points/kills to existing values
          const newPoints = existingEntry.points + team.points;
          const newKills = existingEntry.kills + team.kills;
          
          await supabase
            .from('tournament_points')
            .update({
              points: newPoints,
              kills: newKills,
            })
            .eq('id', team.teamId);
        }
      }

      // Reload the points table
      await loadPointsTable();

      toast({
        title: "Points Updated",
        description: `Updated points for ${selectedTeams.length} teams`,
      });

      // Close dialog and reset state
      setOcrDialogOpen(false);
      setOcrImagePreview(null);
      setOcrMatchedTeams([]);
      setOcrUnmatchedPlayers([]);
      
      // Reset file input
      if (ocrFileInputRef.current) {
        ocrFileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update points",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Points Table Management</h2>
      </div>

      {/* Tournament Selection */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Select Tournament
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select a tournament" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedTournament && (
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Group Mode</label>
                <Select value={groupMode} onValueChange={(v: 'single' | 'multiple') => setGroupMode(v)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="single">Single Group</SelectItem>
                    <SelectItem value="multiple">Multiple Groups</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {groupMode === 'multiple' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Number of Groups</label>
                    <Input
                      type="number"
                      min={2}
                      max={8}
                      value={numberOfGroups}
                      onChange={(e) => setNumberOfGroups(parseInt(e.target.value) || 2)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleDistributeTeams}
                      className="bg-blue-500 hover:bg-blue-600 w-full"
                    >
                      <Shuffle className="w-4 h-4 mr-2" />
                      Auto Distribute Teams
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registered Teams & Player Points */}
      {selectedTournament && (
        <PlayerPointsAdmin tournamentId={selectedTournament} />
      )}

      {/* Add New Team */}
      {selectedTournament && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-6 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Team Name</label>
                <Input
                  value={newEntry.team_name}
                  onChange={(e) => setNewEntry({ ...newEntry, team_name: e.target.value })}
                  placeholder="Enter team name"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              {groupMode === 'multiple' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Group</label>
                  <Select 
                    value={newEntry.group_name || 'A'} 
                    onValueChange={(v) => setNewEntry({ ...newEntry, group_name: v })}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, numberOfGroups).map(g => (
                        <SelectItem key={g} value={g}>Group {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Points</label>
                <Input
                  type="number"
                  value={newEntry.points}
                  onChange={(e) => setNewEntry({ ...newEntry, points: parseInt(e.target.value) || 0 })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Kills</label>
                <Input
                  type="number"
                  value={newEntry.kills}
                  onChange={(e) => setNewEntry({ ...newEntry, kills: parseInt(e.target.value) || 0 })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Wins</label>
                <Input
                  type="number"
                  value={newEntry.wins}
                  onChange={(e) => setNewEntry({ ...newEntry, wins: parseInt(e.target.value) || 0 })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <Button onClick={handleAddEntry} className="bg-green-500 hover:bg-green-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Team
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* OCR Screenshot Upload */}
      {selectedTournament && pointsEntries.length > 0 && (
        <Card className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Auto-Add Points from Screenshot (OCR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                Upload a game results screenshot and the AI will automatically extract player names and points, 
                then match them with your existing teams.
              </p>
              
              <div className="flex items-center gap-4">
                <input
                  ref={ocrFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleOCRFileSelect}
                  className="hidden"
                  id="ocr-file-input"
                />
                <Button
                  onClick={() => ocrFileInputRef.current?.click()}
                  disabled={ocrLoading}
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  {ocrLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Screenshot
                    </>
                  )}
                </Button>
                
                {ocrImagePreview && !ocrLoading && (
                  <div className="relative">
                    <img 
                      src={ocrImagePreview} 
                      alt="OCR Preview" 
                      className="h-16 w-auto rounded border border-gray-600"
                    />
                    <button
                      onClick={() => {
                        setOcrImagePreview(null);
                        if (ocrFileInputRef.current) ocrFileInputRef.current.value = '';
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
              </div>

              {ocrError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {ocrError}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Points Table */}
      {selectedTournament && pointsEntries.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Points Table ({pointsEntries.length} Teams)
            </CardTitle>
            <div className="flex items-center gap-2">
              {tableSaveStatus === 'saving' && (
                <span className="text-xs text-gray-400 animate-pulse flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </span>
              )}
              {tableSaveStatus === 'saved' && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {groupMode === 'multiple' && uniqueGroups.length > 0 ? (
              // Multiple groups - show separate tables
              <div className="space-y-6">
                {uniqueGroups.map(group => (
                  <div key={group} className="space-y-2">
                    <h3 className="text-lg font-semibold text-purple-400">Group {group}</h3>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700">
                          <TableHead className="text-gray-300">#</TableHead>
                          <TableHead className="text-gray-300">Team Name</TableHead>
                          <TableHead className="text-gray-300">Points</TableHead>
                          <TableHead className="text-gray-300">Kills</TableHead>
                          <TableHead className="text-gray-300">Wins</TableHead>
                          <TableHead className="text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pointsEntries
                          .filter(e => e.group_name === group)
                          .sort((a, b) => (a.position_in_group || 0) - (b.position_in_group || 0))
                          .map((entry) => (
                            <TableRow key={entry.id} className="border-gray-700">
                              <TableCell className="text-white font-bold">{entry.position_in_group}</TableCell>
                              <TableCell>
                                {editingEntry === entry.id ? (
                                  <Input
                                    value={entry.team_name}
                                    onChange={(e) => {
                                      setPointsEntries(prev => prev.map(p => 
                                        p.id === entry.id ? { ...p, team_name: e.target.value } : p
                                      ));
                                    }}
                                    className="bg-gray-700 border-gray-600 text-white"
                                  />
                                ) : (
                                  <span className="text-white">{entry.team_name}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {editingEntry === entry.id ? (
                                  <Input
                                    type="number"
                                    value={entry.points}
                                    onChange={(e) => {
                                      setPointsEntries(prev => prev.map(p => 
                                        p.id === entry.id ? { ...p, points: parseInt(e.target.value) || 0 } : p
                                      ));
                                    }}
                                    className="bg-gray-700 border-gray-600 text-white w-20"
                                  />
                                ) : (
                                  <span className="text-green-400 font-semibold">{entry.points}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {editingEntry === entry.id ? (
                                  <Input
                                    type="number"
                                    value={entry.kills}
                                    onChange={(e) => {
                                      setPointsEntries(prev => prev.map(p => 
                                        p.id === entry.id ? { ...p, kills: parseInt(e.target.value) || 0 } : p
                                      ));
                                    }}
                                    className="bg-gray-700 border-gray-600 text-white w-20"
                                  />
                                ) : (
                                  <span className="text-red-400">{entry.kills}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {editingEntry === entry.id ? (
                                  <Input
                                    type="number"
                                    value={entry.wins}
                                    onChange={(e) => {
                                      setPointsEntries(prev => prev.map(p => 
                                        p.id === entry.id ? { ...p, wins: parseInt(e.target.value) || 0 } : p
                                      ));
                                    }}
                                    className="bg-gray-700 border-gray-600 text-white w-20"
                                  />
                                ) : (
                                  <span className="text-yellow-400">{entry.wins}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {editingEntry === entry.id ? (
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateEntry(entry.id!, {
                                        team_name: entry.team_name,
                                        points: entry.points,
                                        kills: entry.kills,
                                        wins: entry.wins,
                                      })}
                                      className="bg-green-500 hover:bg-green-600"
                                    >
                                      <Save className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => setEditingEntry(entry.id!)}
                                      className="bg-blue-500 hover:bg-blue-600"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    onClick={() => handleDeleteEntry(entry.id!)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                  {groupMode === 'multiple' && (
                                    <Select
                                      value={entry.group_name || 'A'}
                                      onValueChange={(v) => handleUpdateEntry(entry.id!, { group_name: v })}
                                    >
                                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-24">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-gray-700 border-gray-600">
                                        {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, numberOfGroups).map(g => (
                                          <SelectItem key={g} value={g}>Group {g}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            ) : (
              // Single group - show one table
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Position</TableHead>
                    <TableHead className="text-gray-300">Team Name</TableHead>
                    <TableHead className="text-gray-300">Points</TableHead>
                    <TableHead className="text-gray-300">Kills</TableHead>
                    <TableHead className="text-gray-300">Wins</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pointsEntries
                    .sort((a, b) => a.position - b.position)
                    .map((entry) => (
                      <TableRow key={entry.id} className="border-gray-700">
                        <TableCell className="text-white font-bold">#{entry.position}</TableCell>
                        <TableCell>
                          <Input
                            value={entry.team_name}
                            onChange={(e) => handleInlineEdit(entry.id!, 'team_name', e.target.value)}
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={entry.points}
                            onChange={(e) => handleInlineEdit(entry.id!, 'points', parseInt(e.target.value) || 0)}
                            className="bg-gray-700 border-gray-600 text-white w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={entry.kills}
                            onChange={(e) => handleInlineEdit(entry.id!, 'kills', parseInt(e.target.value) || 0)}
                            className="bg-gray-700 border-gray-600 text-white w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={entry.wins}
                            onChange={(e) => handleInlineEdit(entry.id!, 'wins', parseInt(e.target.value) || 0)}
                            className="bg-gray-700 border-gray-600 text-white w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleDeleteEntry(entry.id!)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {selectedTournament && pointsEntries.length === 0 && !loading && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-8 text-center">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No teams in points table yet. Add teams above.</p>
          </CardContent>
        </Card>
      )}

      {/* OCR Results Dialog */}
      <Dialog open={ocrDialogOpen} onOpenChange={setOcrDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Camera className="w-5 h-5" />
              OCR Results - Match Players to Teams
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Matched Teams */}
            {ocrMatchedTeams.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-green-400 font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Matched Teams ({ocrMatchedTeams.length})
                </h3>
                <p className="text-gray-400 text-sm">
                  Select which teams should have their points updated. Points and kills will be added to existing values.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300 w-12">Select</TableHead>
                      <TableHead className="text-gray-300">Team Name</TableHead>
                      <TableHead className="text-gray-300">Extracted Player</TableHead>
                      <TableHead className="text-gray-300">Points</TableHead>
                      <TableHead className="text-gray-300">Kills</TableHead>
                      <TableHead className="text-gray-300">Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ocrMatchedTeams.map((team) => (
                      <TableRow key={team.teamId} className="border-gray-700">
                        <TableCell>
                          <Checkbox
                            checked={team.selected}
                            onCheckedChange={() => toggleOCRTeamSelection(team.teamId)}
                          />
                        </TableCell>
                        <TableCell className="text-white font-medium">{team.teamName}</TableCell>
                        <TableCell className="text-gray-300">{team.playerName}</TableCell>
                        <TableCell className="text-green-400 font-semibold">+{team.points}</TableCell>
                        <TableCell className="text-red-400">+{team.kills}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={team.confidence >= 0.8 ? "default" : "secondary"}
                            className={team.confidence >= 0.8 ? "bg-green-500" : "bg-yellow-500"}
                          >
                            {Math.round(team.confidence * 100)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Unmatched Players */}
            {ocrUnmatchedPlayers.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-yellow-400 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Unmatched Players ({ocrUnmatchedPlayers.length})
                </h3>
                <p className="text-gray-400 text-sm">
                  These players couldn't be matched to any existing team. You may need to add them manually.
                </p>
                <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                  {ocrUnmatchedPlayers.map((player, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-white">{player.playerName}</span>
                      <div className="flex gap-4 text-gray-400">
                        <span>Points: {player.points || 0}</span>
                        <span>Kills: {player.kills || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ocrMatchedTeams.length === 0 && ocrUnmatchedPlayers.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                <p>No data could be extracted from the image.</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOcrDialogOpen(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={applyOCRPoints}
              disabled={loading || ocrMatchedTeams.filter(t => t.selected).length === 0}
              className="bg-green-500 hover:bg-green-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Apply Points ({ocrMatchedTeams.filter(t => t.selected).length} teams)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PointsTableAdmin;
