import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, Edit, Users, Trophy, Shuffle, Upload, Camera, Loader2, Check, X, AlertCircle, Hash, Layers, Split, ArrowRightLeft, Settings2, Sparkles, Filter, CheckCircle2, ChevronRight, LayoutGrid, ListFilter, Search } from 'lucide-react';
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
  match_number: number;
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

  // Multi-table / Group distribution states
  const [showDistributionDialog, setShowDistributionDialog] = useState(false);
  const [distributionTargetCount, setDistributionTargetCount] = useState<number>(2);
  const [distributionChoice, setDistributionChoice] = useState<'auto' | 'manual'>('auto');
  const [showManualAssignDialog, setShowManualAssignDialog] = useState(false);
  const [tempManualAssignments, setTempManualAssignments] = useState<Record<string, string | null>>({});
  const [activeTableFilter, setActiveTableFilter] = useState<string>('all');
  const [tableViewMode, setTableViewMode] = useState<'split' | 'consolidated'>('split');
  const [manualSearchQuery, setManualSearchQuery] = useState('');

  // Match management
  const [selectedMatch, setSelectedMatch] = useState<number>(1);
  const [totalMatches, setTotalMatches] = useState<number>(1);

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
    match_number: 1,
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
        .order('match_number', { ascending: true })
        .order('position', { ascending: true });

      if (error) throw error;
      
      setPointsEntries(data || []);
      
      // Detect group mode from existing data
      const existingGroups = [...new Set(data?.map(e => e.group_name).filter(Boolean))] as string[];
      if (existingGroups.length > 0) {
        setGroupMode('multiple');
        const detectedCount = Math.max(2, existingGroups.length);
        setNumberOfGroups(detectedCount);
        setDistributionTargetCount(detectedCount);
      } else {
        setGroupMode('single');
      }

      // Detect max match number
      const maxMatch = Math.max(...(data || []).map(e => e.match_number || 1), 1);
      setTotalMatches(maxMatch);
      if (selectedMatch > maxMatch) setSelectedMatch(maxMatch);
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

  // Get entries for the selected match
  const currentMatchEntries = pointsEntries.filter(e => (e.match_number || 1) === selectedMatch);

  const calculatePositions = (entries: PointEntry[]): PointEntry[] => {
    const sorted = [...entries].sort((a, b) => b.points - a.points);
    
    if (groupMode === 'single') {
      return sorted.map((entry, index) => ({
        ...entry,
        position: index + 1,
        position_in_group: null,
        group_name: null,
      }));
    } else {
      const groups = new Map<string, PointEntry[]>();
      sorted.forEach(entry => {
        const group = entry.group_name || 'unassigned';
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group)!.push(entry);
      });

      const result: PointEntry[] = [];
      const allGrouped = Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .flatMap(([groupName, groupEntries]) => {
          return groupEntries
            .sort((a, b) => b.points - a.points)
            .map((entry, idx) => ({
              ...entry,
              group_name: groupName === 'unassigned' ? null : groupName,
              position_in_group: groupName === 'unassigned' ? null : idx + 1,
            }));
        });

      allGrouped
        .sort((a, b) => b.points - a.points)
        .forEach((entry, idx) => {
          result.push({ ...entry, position: idx + 1 });
        });

      return result;
    }
  };

  const handleAddMatch = async () => {
    const newMatchNum = totalMatches + 1;
    
    setLoading(true);
    try {
      // Always fetch teams from the database tournament_teams table
      const { data: dbTeams, error: teamsError } = await supabase
        .from('tournament_teams')
        .select('id, team_name, group_name')
        .eq('tournament_id', selectedTournament)
        .order('team_name');

      if (teamsError) throw teamsError;

      if (dbTeams && dbTeams.length > 0) {
        // Carry forward previous match group assignments if any
        const prevMatchEntries = pointsEntries.filter(e => (e.match_number || 1) === totalMatches);
        const groupMap: Record<string, string | null> = {};
        prevMatchEntries.forEach(e => {
          if (e.group_name) groupMap[e.team_id] = e.group_name;
        });

        for (const team of dbTeams) {
          const assignedGroup = groupMap[team.id] || (team as any).group_name || null;
          await supabase.from('tournament_points').insert({
            tournament_id: selectedTournament,
            team_id: team.id,
            team_name: team.team_name,
            group_name: assignedGroup,
            points: 0,
            kills: 0,
            wins: 0,
            position: 1,
            position_in_group: assignedGroup ? 1 : null,
            match_number: newMatchNum,
          });
        }
        await loadPointsTable();
        toast({ title: `Match ${newMatchNum} Created`, description: `Added ${dbTeams.length} registered teams with zero scores.` });
      } else {
        toast({ title: `Match ${newMatchNum} Created`, description: 'No registered teams found. You can add teams manually.' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
    
    setTotalMatches(newMatchNum);
    setSelectedMatch(newMatchNum);
  };

  const handleDeleteMatch = async (matchNum: number) => {
    if (totalMatches <= 1) return;
    
    const matchEntries = pointsEntries.filter(e => (e.match_number || 1) === matchNum);
    if (matchEntries.length > 0) {
      try {
        for (const entry of matchEntries) {
          if (entry.id) {
            await supabase.from('tournament_points').delete().eq('id', entry.id);
          }
        }
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
        return;
      }
    }

    // Renumber matches above
    const entriesToUpdate = pointsEntries.filter(e => (e.match_number || 1) > matchNum);
    for (const entry of entriesToUpdate) {
      if (entry.id) {
        await supabase.from('tournament_points').update({ match_number: (entry.match_number || 1) - 1 }).eq('id', entry.id);
      }
    }

    setTotalMatches(prev => prev - 1);
    setSelectedMatch(prev => Math.min(prev, totalMatches - 1));
    await loadPointsTable();
    toast({ title: 'Match Deleted' });
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
        match_number: selectedMatch,
      };

      const { data, error } = await supabase
        .from('tournament_points')
        .insert(entryToAdd)
        .select()
        .single();

      if (error) throw error;

      const updatedEntries = [...pointsEntries, data];
      const matchEntries = updatedEntries.filter(e => (e.match_number || 1) === selectedMatch);
      const otherEntries = updatedEntries.filter(e => (e.match_number || 1) !== selectedMatch);
      const recalculated = calculatePositions(matchEntries);
      
      await updateAllPositions(recalculated);
      
      setPointsEntries([...otherEntries, ...recalculated]);
      setNewEntry({
        team_id: '',
        team_name: '',
        group_name: groupMode === 'multiple' ? 'A' : null,
        points: 0,
        kills: 0,
        wins: 0,
        position: 1,
        position_in_group: null,
        match_number: selectedMatch,
      });

      toast({ title: "Success", description: "Team added to points table" });
    } catch (error: any) {
      console.error('Error adding entry:', error);
      toast({ title: "Error", description: error.message || "Failed to add entry", variant: "destructive" });
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
      
      const matchEntries = updatedEntries.filter(e => (e.match_number || 1) === selectedMatch);
      const otherEntries = updatedEntries.filter(e => (e.match_number || 1) !== selectedMatch);
      const recalculated = calculatePositions(matchEntries);
      await updateAllPositions(recalculated);
      
      setPointsEntries([...otherEntries, ...recalculated]);
      setEditingEntry(null);

      toast({ title: "Success", description: "Entry updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update entry", variant: "destructive" });
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
      const matchEntries = remaining.filter(e => (e.match_number || 1) === selectedMatch);
      const otherEntries = remaining.filter(e => (e.match_number || 1) !== selectedMatch);
      const recalculated = calculatePositions(matchEntries);
      await updateAllPositions(recalculated);
      
      setPointsEntries([...otherEntries, ...recalculated]);

      toast({ title: "Success", description: "Entry deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete entry", variant: "destructive" });
    }
  };

  // Automatic equal distribution with uneven remainder handled
  const handleAutoDistributeTeams = async (targetCount?: number) => {
    const count = targetCount || distributionTargetCount || numberOfGroups || 2;
    if (currentMatchEntries.length === 0) {
      toast({ title: "No Teams", description: "Add teams first before distributing", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, count);
      const total = currentMatchEntries.length;
      const base = Math.floor(total / count);
      const remainder = total % count;

      // Distribute evenly: first `remainder` tables get base + 1, rest get base
      const distributed: PointEntry[] = [];
      let currentIndex = 0;
      for (let i = 0; i < count; i++) {
        const groupLetter = groups[i];
        const groupSize = i < remainder ? base + 1 : base;
        const groupSlice = currentMatchEntries.slice(currentIndex, currentIndex + groupSize);
        groupSlice.forEach((entry, idx) => {
          distributed.push({
            ...entry,
            group_name: groupLetter,
            position_in_group: idx + 1,
          });
        });
        currentIndex += groupSize;
      }

      const recalculated = calculatePositions(distributed);
      const otherEntries = pointsEntries.filter(e => (e.match_number || 1) !== selectedMatch);
      setPointsEntries([...otherEntries, ...recalculated]);
      setGroupMode('multiple');
      setNumberOfGroups(count);

      // Persist to Supabase tournament_points
      for (const entry of recalculated) {
        if (entry.id) {
          await supabase
            .from('tournament_points')
            .update({
              group_name: entry.group_name,
              position: entry.position,
              position_in_group: entry.position_in_group,
            })
            .eq('id', entry.id);
        }
        // Also sync tournament_teams so subsequent matches remember group assignments
        if (entry.team_id) {
          await supabase
            .from('tournament_teams')
            .update({ group_name: entry.group_name })
            .eq('id', entry.team_id);
        }
      }

      setShowDistributionDialog(false);
      toast({
        title: "Teams Distributed Successfully",
        description: `Divided ${total} teams across ${count} tables (${base}${remainder > 0 ? `-${base + 1}` : ''} teams per table)`,
      });
    } catch (error: any) {
      console.error('Error distributing teams:', error);
      toast({ title: "Distribution Failed", description: error.message || "Failed to save table distribution", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Move a single team to a different table/group
  const handleMoveTeamToGroup = async (entryId: string, targetGroup: string | null) => {
    try {
      const updatedEntries = pointsEntries.map(e =>
        e.id === entryId ? { ...e, group_name: targetGroup } : e
      );
      const matchEntries = updatedEntries.filter(e => (e.match_number || 1) === selectedMatch);
      const otherEntries = updatedEntries.filter(e => (e.match_number || 1) !== selectedMatch);
      const recalculated = calculatePositions(matchEntries);
      setPointsEntries([...otherEntries, ...recalculated]);

      const movedEntry = recalculated.find(e => e.id === entryId);
      if (movedEntry) {
        await supabase
          .from('tournament_points')
          .update({
            group_name: movedEntry.group_name,
            position: movedEntry.position,
            position_in_group: movedEntry.position_in_group,
          })
          .eq('id', entryId);

        if (movedEntry.team_id) {
          await supabase
            .from('tournament_teams')
            .update({ group_name: movedEntry.group_name })
            .eq('id', movedEntry.team_id);
        }
      }

      // Update positions of all teams in the affected match
      await updateAllPositions(recalculated);

      toast({
        title: "Table Updated",
        description: targetGroup ? `Moved team to Table ${targetGroup}` : "Moved team to unassigned",
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to move team", variant: "destructive" });
    }
  };

  // Open manual assignment modal
  const openManualAssignmentModal = (count?: number) => {
    const targetCount = count || distributionTargetCount || numberOfGroups || 2;
    const initialMap: Record<string, string | null> = {};
    currentMatchEntries.forEach(entry => {
      initialMap[entry.id || entry.team_name] = entry.group_name || 'A';
    });
    setTempManualAssignments(initialMap);
    setDistributionTargetCount(targetCount);
    setShowDistributionDialog(false);
    setShowManualAssignDialog(true);
  };

  // Save manual assignments
  const handleSaveManualAssignments = async () => {
    setLoading(true);
    try {
      const updatedMatchEntries = currentMatchEntries.map(entry => {
        const key = entry.id || entry.team_name;
        const assignedGroup = tempManualAssignments[key] ?? entry.group_name;
        return {
          ...entry,
          group_name: assignedGroup,
        };
      });

      const recalculated = calculatePositions(updatedMatchEntries);
      const otherEntries = pointsEntries.filter(e => (e.match_number || 1) !== selectedMatch);
      setPointsEntries([...otherEntries, ...recalculated]);
      setGroupMode('multiple');

      for (const entry of recalculated) {
        if (entry.id) {
          await supabase
            .from('tournament_points')
            .update({
              group_name: entry.group_name,
              position: entry.position,
              position_in_group: entry.position_in_group,
            })
            .eq('id', entry.id);
        }
        if (entry.team_id) {
          await supabase
            .from('tournament_teams')
            .update({ group_name: entry.group_name })
            .eq('id', entry.team_id);
        }
      }

      setShowManualAssignDialog(false);
      toast({ title: "Assignments Saved", description: "Manual table assignments updated successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save assignments", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Reset all teams in current match to a single table
  const handleResetToSingleTable = async () => {
    if (currentMatchEntries.length === 0) return;
    setLoading(true);
    try {
      const clearedEntries = currentMatchEntries.map(e => ({
        ...e,
        group_name: null,
        position_in_group: null,
      }));
      const recalculated = calculatePositions(clearedEntries);
      const otherEntries = pointsEntries.filter(e => (e.match_number || 1) !== selectedMatch);
      setPointsEntries([...otherEntries, ...recalculated]);
      setGroupMode('single');

      for (const entry of recalculated) {
        if (entry.id) {
          await supabase
            .from('tournament_points')
            .update({
              group_name: null,
              position: entry.position,
              position_in_group: null,
            })
            .eq('id', entry.id);
        }
        if (entry.team_id) {
          await supabase
            .from('tournament_teams')
            .update({ group_name: null })
            .eq('id', entry.team_id);
        }
      }
      toast({ title: "Reset Complete", description: "All teams combined into a single unified table" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to reset table", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Keep ref in sync
  useEffect(() => {
    pointsEntriesRef.current = pointsEntries;
  }, [pointsEntries]);

  const autoSaveTable = useCallback(async () => {
    if (!tableDirtyRef.current) return;
    const entries = pointsEntriesRef.current.filter(e => (e.match_number || 1) === selectedMatch);
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
      toast({ title: "Auto-save failed", description: error.message || "Failed to save changes", variant: "destructive" });
    }
  }, [toast, selectedMatch]);

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
      const matchEntries = updated.filter(e => (e.match_number || 1) === selectedMatch);
      const otherEntries = updated.filter(e => (e.match_number || 1) !== selectedMatch);
      return [...otherEntries, ...calculatePositions(matchEntries)];
    });
    triggerTableAutoSave();
  };

  // Get unique groups and unassigned teams from current match entries
  const uniqueGroups = [...new Set(currentMatchEntries.map(e => e.group_name).filter(Boolean))].sort() as string[];
  const availableGroups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, Math.max(numberOfGroups, uniqueGroups.length, 2));
  const unassignedEntries = currentMatchEntries.filter(e => !e.group_name);

  // OCR Functions
  const handleOCRFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid File", description: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Please select an image under 10MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setOcrImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    await processOCRImage(file);
  };

  const processOCRImage = async (file: File) => {
    setOcrLoading(true);
    setOcrError(null);
    setOcrMatchedTeams([]);
    setOcrUnmatchedPlayers([]);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

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
      
      if (data.error) throw new Error(data.error);

      setOcrMatchedTeams(
        (data.matchedTeams || []).map((team: OCRMatchedTeam) => ({
          ...team,
          selected: true,
        }))
      );
      setOcrUnmatchedPlayers(data.unmatchedPlayers || []);

      if (data.matchedTeams?.length === 0 && data.unmatchedPlayers?.length === 0) {
        setOcrError('No player data could be extracted from the image.');
      } else {
        setOcrDialogOpen(true);
      }

      toast({
        title: "OCR Complete",
        description: `Found ${data.matchedTeams?.length || 0} matched, ${data.unmatchedPlayers?.length || 0} unmatched`,
      });
    } catch (error: any) {
      console.error('OCR error:', error);
      setOcrError(error.message || 'Failed to process image');
      toast({ title: "OCR Failed", description: error.message || "Failed to extract data", variant: "destructive" });
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
      toast({ title: "No Teams Selected", description: "Please select at least one team to update", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      for (const team of selectedTeams) {
        const existingEntry = currentMatchEntries.find(e => e.id === team.teamId);
        
        if (existingEntry) {
          const newPoints = existingEntry.points + team.points;
          const newKills = existingEntry.kills + team.kills;
          
          await supabase
            .from('tournament_points')
            .update({ points: newPoints, kills: newKills })
            .eq('id', team.teamId);
        }
      }

      await loadPointsTable();
      toast({ title: "Points Updated", description: `Updated points for ${selectedTeams.length} teams` });

      setOcrDialogOpen(false);
      setOcrImagePreview(null);
      setOcrMatchedTeams([]);
      setOcrUnmatchedPlayers([]);
      if (ocrFileInputRef.current) ocrFileInputRef.current.value = '';
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update points", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Copy teams from another match
  const handleCopyTeamsFromMatch = async (sourceMatch: number) => {
    const sourceEntries = pointsEntries.filter(e => (e.match_number || 1) === sourceMatch);
    if (sourceEntries.length === 0) {
      toast({ title: 'No Teams', description: `Match ${sourceMatch} has no teams to copy`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      for (const entry of sourceEntries) {
        await supabase.from('tournament_points').insert({
          tournament_id: selectedTournament,
          team_id: entry.team_id,
          team_name: entry.team_name,
          group_name: entry.group_name,
          points: 0,
          kills: 0,
          wins: 0,
          position: entry.position,
          position_in_group: entry.position_in_group,
          match_number: selectedMatch,
        });
      }
      await loadPointsTable();
      toast({ title: 'Teams Copied', description: `Copied ${sourceEntries.length} teams from Match ${sourceMatch} with zero scores` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
            <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-700/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Split className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-base">Table & Group Structure</h3>
                    <p className="text-xs text-gray-400">
                      Divide teams into 2, 3, or 4 separate tables/pools, or manage as one unified table.
                    </p>
                  </div>
                </div>
                
                {/* Active structure badge */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {groupMode === 'single' ? (
                    <Badge variant="outline" className="border-blue-500/40 text-blue-300 bg-blue-500/10 px-2.5 py-1 text-xs">
                      1 Unified Table ({currentMatchEntries.length} Teams)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-purple-500/40 text-purple-300 bg-purple-500/10 px-2.5 py-1 text-xs">
                      {uniqueGroups.length || numberOfGroups} Tables Active ({currentMatchEntries.length} Teams)
                    </Badge>
                  )}
                </div>
              </div>

              {/* Quick Select Table Presets & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs text-gray-400 font-medium mr-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-purple-400" /> Presets:
                </span>

                {/* 1 Table (Unified) Button */}
                <Button
                  type="button"
                  size="sm"
                  variant={groupMode === 'single' ? 'default' : 'outline'}
                  onClick={handleResetToSingleTable}
                  className={groupMode === 'single'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                    : 'border-gray-600 text-gray-300 hover:bg-gray-800'}
                >
                  1 Table (Unified)
                </Button>

                {/* 2, 3, 4 Tables Presets */}
                {[2, 3, 4].map(num => (
                  <Button
                    key={num}
                    type="button"
                    size="sm"
                    variant={groupMode === 'multiple' && (uniqueGroups.length === num || numberOfGroups === num) ? 'default' : 'outline'}
                    onClick={() => {
                      setDistributionTargetCount(num);
                      setShowDistributionDialog(true);
                    }}
                    className={groupMode === 'multiple' && (uniqueGroups.length === num || numberOfGroups === num)
                      ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                      : 'border-gray-600 text-gray-300 hover:bg-gray-800'}
                  >
                    {num} Tables
                  </Button>
                ))}

                <div className="h-5 w-px bg-gray-700 mx-1 hidden sm:block" />

                {/* Split / Distribute Teams modal trigger */}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowDistributionDialog(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <Split className="w-3.5 h-3.5" />
                  Divide / Distribute Teams
                </Button>

                {/* Manual Table Assignment */}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openManualAssignmentModal()}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800 flex items-center gap-1.5"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Manual Assignment
                </Button>
              </div>

              {/* Status / Breakdown row */}
              {currentMatchEntries.length > 0 && groupMode === 'multiple' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-400 bg-gray-800/60 px-3 py-2 rounded-lg border border-gray-700/50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    <span>
                      {uniqueGroups.length > 0
                        ? uniqueGroups.map(g => `Table ${g}: ${currentMatchEntries.filter(e => e.group_name === g).length} teams`).join(' • ')
                        : `${numberOfGroups} tables configured`}
                      {unassignedEntries.length > 0 && ` • ⚠️ ${unassignedEntries.length} unassigned`}
                    </span>
                  </div>
                  {unassignedEntries.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAutoDistributeTeams(numberOfGroups)}
                      className="text-xs text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 h-6 px-2 self-start sm:self-auto"
                    >
                      Auto-distribute all {currentMatchEntries.length} teams
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Match Selector */}
      {selectedTournament && (
        <Card className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-blue-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Hash className="w-5 h-5" />
              Match Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              {Array.from({ length: totalMatches }, (_, i) => i + 1).map(matchNum => {
                const matchEntryCount = pointsEntries.filter(e => (e.match_number || 1) === matchNum).length;
                return (
                  <Button
                    key={matchNum}
                    variant={selectedMatch === matchNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedMatch(matchNum)}
                    className={selectedMatch === matchNum
                      ? "bg-primary hover:bg-primary/90"
                      : "border-gray-600 text-gray-300 hover:bg-gray-700"
                    }
                  >
                    Match {matchNum}
                    {matchEntryCount > 0 && (
                      <Badge className="ml-1.5 bg-white/20 text-white text-[10px] px-1.5 py-0">{matchEntryCount}</Badge>
                    )}
                  </Button>
                );
              })}
              <Button
                size="sm"
                onClick={handleAddMatch}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Match
              </Button>
            </div>

            {totalMatches > 1 && (
              <div className="flex flex-wrap gap-2 items-center">
                {currentMatchEntries.length === 0 && totalMatches > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Copy teams from:</span>
                    {Array.from({ length: totalMatches }, (_, i) => i + 1)
                      .filter(m => m !== selectedMatch && pointsEntries.filter(e => (e.match_number || 1) === m).length > 0)
                      .map(m => (
                        <Button key={m} size="sm" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700" onClick={() => handleCopyTeamsFromMatch(m)}>
                          Match {m}
                        </Button>
                      ))
                    }
                  </div>
                )}
                {totalMatches > 1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteMatch(selectedMatch)}
                    className="ml-auto border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete Match {selectedMatch}
                  </Button>
                )}
              </div>
            )}

            {/* Aggregate summary */}
            {totalMatches > 1 && (
              <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50">
                <p className="text-xs text-gray-400 mb-2">📊 Users will see aggregated totals across all {totalMatches} matches automatically.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Registered Teams & Player Points */}
      {selectedTournament && (
        <PlayerPointsAdmin tournamentId={selectedTournament} selectedMatch={selectedMatch} totalMatches={totalMatches} />
      )}

      {/* Add New Team */}
      {selectedTournament && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Team to Match {selectedMatch}
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
      {selectedTournament && currentMatchEntries.length > 0 && (
        <Card className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Auto-Add Points from Screenshot (OCR) - Match {selectedMatch}
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
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" />Upload Screenshot</>
                  )}
                </Button>
                
                {ocrImagePreview && !ocrLoading && (
                  <div className="relative">
                    <img src={ocrImagePreview} alt="OCR Preview" className="h-16 w-auto rounded border border-gray-600" />
                    <button
                      onClick={() => { setOcrImagePreview(null); if (ocrFileInputRef.current) ocrFileInputRef.current.value = ''; }}
                      className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
              </div>

              {ocrError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />{ocrError}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Points Table for Current Match */}
      {selectedTournament && currentMatchEntries.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-700/60">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Match {selectedMatch} Points Table
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 ml-2">
                  {currentMatchEntries.length} Teams
                </Badge>
              </CardTitle>
              <p className="text-xs text-gray-400 mt-1">
                Edit scores inline (auto-saved), or reassign teams between tables using the table dropdowns.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Save status */}
              {tableSaveStatus === 'saving' && (
                <span className="text-xs text-gray-400 animate-pulse flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /> Saving...
                </span>
              )}
              {tableSaveStatus === 'saved' && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Saved
                </span>
              )}

              {/* View mode toggle for multiple groups */}
              {groupMode === 'multiple' && (
                <div className="flex items-center bg-gray-900/80 p-1 rounded-lg border border-gray-700">
                  <Button
                    type="button"
                    size="sm"
                    variant={tableViewMode === 'split' ? 'default' : 'ghost'}
                    onClick={() => setTableViewMode('split')}
                    className={`h-7 px-2.5 text-xs ${
                      tableViewMode === 'split'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                    Separate Cards
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={tableViewMode === 'consolidated' ? 'default' : 'ghost'}
                    onClick={() => setTableViewMode('consolidated')}
                    className={`h-7 px-2.5 text-xs ${
                      tableViewMode === 'consolidated'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <ListFilter className="w-3.5 h-3.5 mr-1.5" />
                    Consolidated
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-5">
            {/* Filter Tabs if multiple groups */}
            {groupMode === 'multiple' && (
              <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-gray-700/40">
                <span className="text-xs text-gray-400 font-medium mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-gray-400" /> Filter Table:
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant={activeTableFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setActiveTableFilter('all')}
                  className={`h-7 text-xs ${
                    activeTableFilter === 'all'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  All Tables ({currentMatchEntries.length})
                </Button>
                {availableGroups.map(group => {
                  const count = currentMatchEntries.filter(e => e.group_name === group).length;
                  return (
                    <Button
                      key={group}
                      type="button"
                      size="sm"
                      variant={activeTableFilter === group ? 'default' : 'outline'}
                      onClick={() => setActiveTableFilter(group)}
                      className={`h-7 text-xs ${
                        activeTableFilter === group
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Table {group} ({count})
                    </Button>
                  );
                })}
                {unassignedEntries.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant={activeTableFilter === 'unassigned' ? 'default' : 'outline'}
                    onClick={() => setActiveTableFilter('unassigned')}
                    className={`h-7 text-xs ${
                      activeTableFilter === 'unassigned'
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'border-yellow-600/60 text-yellow-400 hover:bg-yellow-950/40'
                    }`}
                  >
                    ⚠️ Unassigned ({unassignedEntries.length})
                  </Button>
                )}
              </div>
            )}

            {/* Unassigned Warning Banner (if multiple groups & unassigned exist & not filtered out) */}
            {groupMode === 'multiple' && unassignedEntries.length > 0 && activeTableFilter === 'all' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-yellow-950/20 border border-yellow-600/40">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-300">
                      {unassignedEntries.length} team{unassignedEntries.length > 1 ? 's are' : ' is'} not assigned to any table
                    </p>
                    <p className="text-xs text-yellow-400/80">
                      You can auto-distribute them equally across tables or assign them manually.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAutoDistributeTeams(numberOfGroups)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs h-8"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Distribute All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openManualAssignmentModal()}
                    className="border-yellow-600/60 text-yellow-300 hover:bg-yellow-950/40 text-xs h-8"
                  >
                    Assign Manually
                  </Button>
                </div>
              </div>
            )}

            {/* Render Multiple Groups: Separate Cards View */}
            {groupMode === 'multiple' && tableViewMode === 'split' ? (
              <div className="space-y-6">
                {availableGroups
                  .filter(group => activeTableFilter === 'all' || activeTableFilter === group)
                  .map(group => {
                    const groupEntries = currentMatchEntries
                      .filter(e => e.group_name === group)
                      .sort((a, b) => (a.position_in_group || 0) - (b.position_in_group || 0));
                    const totalPoints = groupEntries.reduce((sum, e) => sum + (e.points || 0), 0);
                    const totalKills = groupEntries.reduce((sum, e) => sum + (e.kills || 0), 0);

                    return (
                      <Card key={group} className="bg-gray-900/60 border-purple-900/50 shadow-md">
                        <CardHeader className="py-3 px-4 bg-gray-900/90 border-b border-gray-700/60 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="h-6 w-6 rounded bg-purple-600/20 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center justify-center">
                              {group}
                            </span>
                            <h3 className="text-base font-semibold text-white">Table {group}</h3>
                            <Badge variant="outline" className="border-purple-500/40 text-purple-300 bg-purple-500/10 text-xs">
                              {groupEntries.length} Teams
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-400 flex items-center gap-3">
                            <span>Points: <strong className="text-purple-300">{totalPoints}</strong></span>
                            <span>Kills: <strong className="text-red-400">{totalKills}</strong></span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          {groupEntries.length === 0 ? (
                            <div className="py-6 text-center text-xs text-gray-500">
                              No teams assigned to Table {group} yet.
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                  <TableHead className="text-gray-400 w-12 text-center text-xs">#</TableHead>
                                  <TableHead className="text-gray-400 text-xs">Team Name</TableHead>
                                  <TableHead className="text-gray-400 text-xs w-24">Points</TableHead>
                                  <TableHead className="text-gray-400 text-xs w-24">Kills</TableHead>
                                  <TableHead className="text-gray-400 text-xs w-24">Wins</TableHead>
                                  <TableHead className="text-gray-400 text-xs w-32">Move Table</TableHead>
                                  <TableHead className="text-gray-400 text-xs w-16 text-right">Delete</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {groupEntries.map((entry) => (
                                  <TableRow key={entry.id} className="border-gray-800/80 hover:bg-gray-800/40">
                                    <TableCell className="text-purple-300 font-bold text-center text-sm">
                                      #{entry.position_in_group || entry.position}
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={entry.team_name}
                                        onChange={(e) => handleInlineEdit(entry.id!, 'team_name', e.target.value)}
                                        className="bg-gray-800/80 border-gray-700 text-white h-8 text-sm focus:border-purple-500"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        value={entry.points}
                                        onChange={(e) => handleInlineEdit(entry.id!, 'points', parseInt(e.target.value) || 0)}
                                        className="bg-gray-800/80 border-gray-700 text-white h-8 text-sm w-20 text-center focus:border-purple-500"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        value={entry.kills}
                                        onChange={(e) => handleInlineEdit(entry.id!, 'kills', parseInt(e.target.value) || 0)}
                                        className="bg-gray-800/80 border-gray-700 text-white h-8 text-sm w-20 text-center focus:border-purple-500"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        value={entry.wins}
                                        onChange={(e) => handleInlineEdit(entry.id!, 'wins', parseInt(e.target.value) || 0)}
                                        className="bg-gray-800/80 border-gray-700 text-white h-8 text-sm w-20 text-center focus:border-purple-500"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Select
                                        value={entry.group_name || 'none'}
                                        onValueChange={(v) => handleMoveTeamToGroup(entry.id!, v === 'none' ? null : v)}
                                      >
                                        <SelectTrigger className="bg-gray-800/80 border-gray-700 text-gray-200 h-8 text-xs w-28">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-800 border-gray-700">
                                          {availableGroups.map(g => (
                                            <SelectItem key={g} value={g} className="text-xs">
                                              Table {g}
                                            </SelectItem>
                                          ))}
                                          <SelectItem value="none" className="text-xs text-yellow-400">
                                            Unassigned
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteEntry(entry.id!)}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                {/* Unassigned Teams Card (in split mode) */}
                {unassignedEntries.length > 0 && (activeTableFilter === 'all' || activeTableFilter === 'unassigned') && (
                  <Card className="bg-gray-900/60 border-yellow-800/50 shadow-md">
                    <CardHeader className="py-3 px-4 bg-yellow-950/30 border-b border-yellow-700/40 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        <h3 className="text-base font-semibold text-yellow-300">Unassigned Teams</h3>
                        <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 bg-yellow-500/10 text-xs">
                          {unassignedEntries.length} Teams
                        </Badge>
                      </div>
                      <span className="text-xs text-yellow-400/80">Assign them to a table using the dropdown</span>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-800 hover:bg-transparent">
                            <TableHead className="text-gray-400 text-xs">Team Name</TableHead>
                            <TableHead className="text-gray-400 text-xs w-24">Points</TableHead>
                            <TableHead className="text-gray-400 text-xs w-24">Kills</TableHead>
                            <TableHead className="text-gray-400 text-xs w-24">Wins</TableHead>
                            <TableHead className="text-gray-400 text-xs w-36">Assign to Table</TableHead>
                            <TableHead className="text-gray-400 text-xs w-16 text-right">Delete</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {unassignedEntries.map((entry) => (
                            <TableRow key={entry.id} className="border-gray-800/80 hover:bg-gray-800/40">
                              <TableCell>
                                <Input
                                  value={entry.team_name}
                                  onChange={(e) => handleInlineEdit(entry.id!, 'team_name', e.target.value)}
                                  className="bg-gray-800/80 border-gray-700 text-white h-8 text-sm"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={entry.points}
                                  onChange={(e) => handleInlineEdit(entry.id!, 'points', parseInt(e.target.value) || 0)}
                                  className="bg-gray-800/80 border-gray-700 text-white h-8 text-sm w-20 text-center"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={entry.kills}
                                  onChange={(e) => handleInlineEdit(entry.id!, 'kills', parseInt(e.target.value) || 0)}
                                  className="bg-gray-800/80 border-gray-700 text-white h-8 text-sm w-20 text-center"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={entry.wins}
                                  onChange={(e) => handleInlineEdit(entry.id!, 'wins', parseInt(e.target.value) || 0)}
                                  className="bg-gray-800/80 border-gray-700 text-white h-8 text-sm w-20 text-center"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={entry.group_name || 'none'}
                                  onValueChange={(v) => handleMoveTeamToGroup(entry.id!, v === 'none' ? null : v)}
                                >
                                  <SelectTrigger className="bg-gray-800/80 border-yellow-600/50 text-yellow-300 h-8 text-xs w-32">
                                    <SelectValue placeholder="Assign..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-800 border-gray-700">
                                    {availableGroups.map(g => (
                                      <SelectItem key={g} value={g} className="text-xs">
                                        Assign to Table {g}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteEntry(entry.id!)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : groupMode === 'multiple' && tableViewMode === 'consolidated' ? (
              /* Render Multiple Groups: Consolidated View */
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300 w-12">#</TableHead>
                      <TableHead className="text-gray-300 w-32">Table / Group</TableHead>
                      <TableHead className="text-gray-300">Team Name</TableHead>
                      <TableHead className="text-gray-300 w-24">Points</TableHead>
                      <TableHead className="text-gray-300 w-24">Kills</TableHead>
                      <TableHead className="text-gray-300 w-24">Wins</TableHead>
                      <TableHead className="text-gray-300 w-16 text-right">Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentMatchEntries
                      .filter(e => activeTableFilter === 'all' || (activeTableFilter === 'unassigned' ? !e.group_name : e.group_name === activeTableFilter))
                      .sort((a, b) => (b.points || 0) - (a.points || 0) || (b.kills || 0) - (a.kills || 0))
                      .map((entry, idx) => (
                        <TableRow key={entry.id} className="border-gray-700 hover:bg-gray-700/30">
                          <TableCell className="text-white font-bold">#{idx + 1}</TableCell>
                          <TableCell>
                            <Select
                              value={entry.group_name || 'none'}
                              onValueChange={(v) => handleMoveTeamToGroup(entry.id!, v === 'none' ? null : v)}
                            >
                              <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-8 text-xs w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-700 border-gray-600">
                                {availableGroups.map(g => (
                                  <SelectItem key={g} value={g} className="text-xs">
                                    Table {g}
                                  </SelectItem>
                                ))}
                                <SelectItem value="none" className="text-xs text-yellow-400">
                                  Unassigned
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={entry.team_name}
                              onChange={(e) => handleInlineEdit(entry.id!, 'team_name', e.target.value)}
                              className="bg-gray-700 border-gray-600 text-white h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={entry.points}
                              onChange={(e) => handleInlineEdit(entry.id!, 'points', parseInt(e.target.value) || 0)}
                              className="bg-gray-700 border-gray-600 text-white h-8 text-sm w-20 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={entry.kills}
                              onChange={(e) => handleInlineEdit(entry.id!, 'kills', parseInt(e.target.value) || 0)}
                              className="bg-gray-700 border-gray-600 text-white h-8 text-sm w-20 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={entry.wins}
                              onChange={(e) => handleInlineEdit(entry.id!, 'wins', parseInt(e.target.value) || 0)}
                              className="bg-gray-700 border-gray-600 text-white h-8 text-sm w-20 text-center"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteEntry(entry.id!)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              /* Single Unified Table View */
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300 w-16">Position</TableHead>
                      <TableHead className="text-gray-300">Team Name</TableHead>
                      <TableHead className="text-gray-300 w-24">Points</TableHead>
                      <TableHead className="text-gray-300 w-24">Kills</TableHead>
                      <TableHead className="text-gray-300 w-24">Wins</TableHead>
                      <TableHead className="text-gray-300 w-16 text-right">Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentMatchEntries
                      .sort((a, b) => a.position - b.position)
                      .map((entry) => (
                        <TableRow key={entry.id} className="border-gray-700 hover:bg-gray-700/30">
                          <TableCell className="text-white font-bold">#{entry.position}</TableCell>
                          <TableCell>
                            <Input
                              value={entry.team_name}
                              onChange={(e) => handleInlineEdit(entry.id!, 'team_name', e.target.value)}
                              className="bg-gray-700 border-gray-600 text-white h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={entry.points}
                              onChange={(e) => handleInlineEdit(entry.id!, 'points', parseInt(e.target.value) || 0)}
                              className="bg-gray-700 border-gray-600 text-white h-8 text-sm w-20 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={entry.kills}
                              onChange={(e) => handleInlineEdit(entry.id!, 'kills', parseInt(e.target.value) || 0)}
                              className="bg-gray-700 border-gray-600 text-white h-8 text-sm w-20 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={entry.wins}
                              onChange={(e) => handleInlineEdit(entry.id!, 'wins', parseInt(e.target.value) || 0)}
                              className="bg-gray-700 border-gray-600 text-white h-8 text-sm w-20 text-center"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteEntry(entry.id!)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedTournament && currentMatchEntries.length === 0 && !loading && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-8 text-center">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No teams in Match {selectedMatch} yet. Add teams above or copy from another match.</p>
          </CardContent>
        </Card>
      )}

      {/* OCR Results Dialog */}
      <Dialog open={ocrDialogOpen} onOpenChange={setOcrDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Camera className="w-5 h-5" />
              OCR Results - Match {selectedMatch}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {ocrMatchedTeams.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-green-400 font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Matched Teams ({ocrMatchedTeams.length})
                </h3>
                <p className="text-gray-400 text-sm">Points and kills will be added to existing values for Match {selectedMatch}.</p>
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
                        <TableCell><Checkbox checked={team.selected} onCheckedChange={() => toggleOCRTeamSelection(team.teamId)} /></TableCell>
                        <TableCell className="text-white font-medium">{team.teamName}</TableCell>
                        <TableCell className="text-gray-300">{team.playerName}</TableCell>
                        <TableCell className="text-green-400 font-semibold">+{team.points}</TableCell>
                        <TableCell className="text-red-400">+{team.kills}</TableCell>
                        <TableCell>
                          <Badge variant={team.confidence >= 0.8 ? "default" : "secondary"} className={team.confidence >= 0.8 ? "bg-green-500" : "bg-yellow-500"}>
                            {Math.round(team.confidence * 100)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {ocrUnmatchedPlayers.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-yellow-400 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Unmatched Players ({ocrUnmatchedPlayers.length})
                </h3>
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
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOcrDialogOpen(false)} className="border-gray-600 text-gray-300">Cancel</Button>
            <Button onClick={applyOCRPoints} disabled={loading} className="bg-green-500 hover:bg-green-600">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Apply Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribution Prompt Dialog: Auto vs Manual */}
      <Dialog open={showDistributionDialog} onOpenChange={setShowDistributionDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-lg">
              <Split className="w-5 h-5 text-purple-400" />
              Divide Teams into Tables / Groups
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-300">
              Divide <span className="text-white font-bold">{currentMatchEntries.length} teams</span> of Match {selectedMatch} equally into separate tables/pools.
            </p>

            {/* Number of Tables selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Select Number of Tables
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 3, 4, 5].map(num => (
                  <Button
                    key={num}
                    type="button"
                    variant={distributionTargetCount === num ? "default" : "outline"}
                    onClick={() => setDistributionTargetCount(num)}
                    className={distributionTargetCount === num
                      ? "bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm"
                      : "border-gray-600 text-gray-300 hover:bg-gray-700"}
                  >
                    {num} Tables
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-gray-400">Custom count (2-8):</span>
                <Input
                  type="number"
                  min={2}
                  max={8}
                  value={distributionTargetCount}
                  onChange={(e) => setDistributionTargetCount(Math.max(2, Math.min(8, parseInt(e.target.value) || 2)))}
                  className="bg-gray-700 border-gray-600 text-white w-20 h-8 text-sm text-center"
                />
              </div>
            </div>

            {/* Distribution Calculation Preview */}
            <div className="bg-gray-900/80 p-3.5 rounded-lg border border-purple-500/30 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-purple-300">
                <span>Equal Distribution Preview</span>
                <span>{currentMatchEntries.length} Total Teams</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Array.from({ length: distributionTargetCount }, (_, i) => {
                  const groupLetter = String.fromCharCode(65 + i);
                  const base = Math.floor(currentMatchEntries.length / distributionTargetCount);
                  const remainder = currentMatchEntries.length % distributionTargetCount;
                  const size = i < remainder ? base + 1 : base;
                  return (
                    <div key={groupLetter} className="flex items-center justify-between bg-gray-800/90 px-3 py-2 rounded border border-gray-700/80">
                      <span className="text-gray-200 font-medium">Table {groupLetter}</span>
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 text-xs font-semibold">
                        {size} teams
                      </Badge>
                    </div>
                  );
                })}
              </div>
              {currentMatchEntries.length > 0 && currentMatchEntries.length % distributionTargetCount !== 0 && (
                <p className="text-[11px] text-gray-400 pt-0.5">
                  ⚡ Uneven teams ({currentMatchEntries.length % distributionTargetCount} extra) are placed into the first tables automatically.
                </p>
              )}
            </div>

            {/* Method Selection: Auto vs Manual */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Distribution Method
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setDistributionChoice('auto')}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    distributionChoice === 'auto'
                      ? 'border-purple-500 bg-purple-950/40 text-white ring-1 ring-purple-500'
                      : 'border-gray-700 bg-gray-900/40 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium text-sm text-white mb-1">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Auto Distribute
                  </div>
                  <p className="text-xs text-gray-400">
                    Evenly distributes all teams across {distributionTargetCount} tables instantly.
                  </p>
                </div>

                <div
                  onClick={() => setDistributionChoice('manual')}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    distributionChoice === 'manual'
                      ? 'border-purple-500 bg-purple-950/40 text-white ring-1 ring-purple-500'
                      : 'border-gray-700 bg-gray-900/40 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium text-sm text-white mb-1">
                    <Settings2 className="w-4 h-4 text-blue-400" />
                    Manual Assignment
                  </div>
                  <p className="text-xs text-gray-400">
                    Hand-pick which table each team is assigned to.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-gray-700">
            <Button variant="outline" onClick={() => setShowDistributionDialog(false)} className="border-gray-600 text-gray-300">
              Cancel
            </Button>
            {distributionChoice === 'auto' ? (
              <Button
                onClick={() => handleAutoDistributeTeams(distributionTargetCount)}
                disabled={loading || currentMatchEntries.length === 0}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Auto Distribute Equally
              </Button>
            ) : (
              <Button
                onClick={() => openManualAssignmentModal(distributionTargetCount)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <Settings2 className="w-4 h-4 mr-2" />
                Open Manual Assignment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Team Assignment Dialog */}
      <Dialog open={showManualAssignDialog} onOpenChange={setShowManualAssignDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-lg">
              <Settings2 className="w-5 h-5 text-blue-400" />
              Manual Team Table Assignment ({currentMatchEntries.length} Teams)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
            {/* Table count selector & helper buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-900/80 rounded-lg border border-gray-700/60">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300 font-medium">Tables:</span>
                {[2, 3, 4, 5].map(num => (
                  <Button
                    key={num}
                    type="button"
                    size="sm"
                    variant={distributionTargetCount === num ? "default" : "outline"}
                    onClick={() => setDistributionTargetCount(num)}
                    className={`h-7 px-2.5 text-xs ${
                      distributionTargetCount === num
                        ? "bg-purple-600 text-white font-semibold"
                        : "border-gray-700 text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    {num}
                  </Button>
                ))}
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, distributionTargetCount);
                  const total = currentMatchEntries.length;
                  const base = Math.floor(total / distributionTargetCount);
                  const remainder = total % distributionTargetCount;
                  const newMap: Record<string, string> = {};
                  let currentIndex = 0;
                  for (let i = 0; i < distributionTargetCount; i++) {
                    const groupLetter = groups[i];
                    const groupSize = i < remainder ? base + 1 : base;
                    const groupSlice = currentMatchEntries.slice(currentIndex, currentIndex + groupSize);
                    groupSlice.forEach((entry) => {
                      newMap[entry.id || entry.team_name] = groupLetter;
                    });
                    currentIndex += groupSize;
                  }
                  setTempManualAssignments(newMap);
                }}
                className="border-purple-500/40 text-purple-300 hover:bg-purple-950/40 text-xs h-7 self-start sm:self-auto"
              >
                <Shuffle className="w-3 h-3 mr-1" />
                Fill Evenly First
              </Button>
            </div>

            {/* Live table count pills */}
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: distributionTargetCount }, (_, i) => {
                const letter = String.fromCharCode(65 + i);
                const count = currentMatchEntries.filter(e => (tempManualAssignments[e.id || e.team_name] || e.group_name) === letter).length;
                return (
                  <Badge key={letter} variant="outline" className="bg-purple-950/40 border-purple-600/50 text-purple-300 px-2.5 py-1 text-xs">
                    Table {letter}: <strong className="ml-1 text-white">{count}</strong>
                  </Badge>
                );
              })}
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Search team name..."
                value={manualSearchQuery}
                onChange={(e) => setManualSearchQuery(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white text-sm pl-9 h-9"
              />
            </div>

            {/* Team assignment rows */}
            <div className="space-y-2">
              {currentMatchEntries
                .filter(e => !manualSearchQuery || e.team_name.toLowerCase().includes(manualSearchQuery.toLowerCase()))
                .map((entry) => {
                  const key = entry.id || entry.team_name;
                  const currentSelectedGroup = tempManualAssignments[key] || entry.group_name || 'A';
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2.5 bg-gray-700/40 hover:bg-gray-700/60 rounded-lg border border-gray-600/40 gap-2"
                    >
                      <span className="text-white font-medium text-sm truncate max-w-[220px]">
                        {entry.team_name}
                      </span>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {Array.from({ length: distributionTargetCount }, (_, i) => {
                          const letter = String.fromCharCode(65 + i);
                          const isSelected = currentSelectedGroup === letter;
                          return (
                            <Button
                              key={letter}
                              type="button"
                              size="sm"
                              variant={isSelected ? "default" : "outline"}
                              onClick={() => setTempManualAssignments(prev => ({ ...prev, [key]: letter }))}
                              className={`h-7 px-2.5 text-xs ${
                                isSelected
                                  ? "bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                                  : "border-gray-600 text-gray-300 hover:bg-gray-700"
                              }`}
                            >
                              Table {letter}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-gray-700">
            <Button variant="outline" onClick={() => setShowManualAssignDialog(false)} className="border-gray-600 text-gray-300">
              Cancel
            </Button>
            <Button
              onClick={handleSaveManualAssignments}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Table Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PointsTableAdmin;
