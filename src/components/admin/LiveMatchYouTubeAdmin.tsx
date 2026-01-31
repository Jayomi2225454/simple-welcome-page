import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Save, X, Youtube, ExternalLink, Image } from 'lucide-react';
import { liveMatchService, LiveMatchAdmin } from '@/services/liveMatchService';
import { useGameStore } from '@/store/gameStore';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/ui/file-upload';

const LiveMatchYouTubeAdmin = () => {
  const [liveMatches, setLiveMatches] = useState<LiveMatchAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<LiveMatchAdmin | null>(null);
  const { tournaments } = useGameStore();
  const { toast } = useToast();

  const [form, setForm] = useState({
    tournament_id: "none",
    banner_url: '',
    title: '',
    description: '',
    youtube_live_url: '',
    is_active: false,
  });

  useEffect(() => {
    loadLiveMatches();
  }, []);

  const loadLiveMatches = async () => {
    try {
      const data = await liveMatchService.getAllLiveMatches();
      setLiveMatches(data);
    } catch (error) {
      console.error('Failed to load live matches:', error);
      toast({
        title: "Error",
        description: "Failed to load live matches. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      tournament_id: "none",
      banner_url: '',
      title: '',
      description: '',
      youtube_live_url: '',
      is_active: false,
    });
    setEditingMatch(null);
    setShowAddForm(false);
  };

  const handleSave = async () => {
    try {
      if (!form.title.trim()) {
        toast({
          title: "Validation Error",
          description: "Title is required.",
          variant: "destructive",
        });
        return;
      }

      const matchData = {
        ...form,
        tournament_id: form.tournament_id === "none" ? undefined : form.tournament_id,
        banner_url: form.banner_url || undefined,
        description: form.description || undefined,
        youtube_live_url: form.youtube_live_url || undefined,
      };

      if (editingMatch) {
        await liveMatchService.updateLiveMatch(editingMatch.id, matchData);
        toast({
          title: "Live Match Updated",
          description: "Live match has been updated successfully.",
        });
      } else {
        await liveMatchService.createLiveMatch(matchData);
        toast({
          title: "Live Match Created",
          description: "New live match has been created successfully.",
        });
      }
      
      resetForm();
      loadLiveMatches();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save live match. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (match: LiveMatchAdmin) => {
    setForm({
      tournament_id: match.tournament_id || "none",
      banner_url: match.banner_url || '',
      title: match.title,
      description: match.description || '',
      youtube_live_url: match.youtube_live_url || '',
      is_active: match.is_active,
    });
    setEditingMatch(match);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await liveMatchService.deleteLiveMatch(id);
      toast({
        title: "Live Match Deleted",
        description: "Live match has been deleted successfully.",
      });
      loadLiveMatches();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete live match. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getTournamentName = (tournamentId?: string) => {
    if (!tournamentId) return 'General';
    const tournament = tournaments.find(t => t.id === tournamentId);
    return tournament ? tournament.name : 'Unknown Tournament';
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="text-center text-gray-400">Loading live matches...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">YouTube Live Match Admin</h2>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="bg-red-600 hover:bg-red-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Live Match
        </Button>
      </div>

      {(showAddForm || editingMatch) && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Youtube className="w-5 h-5 mr-2" />
              {editingMatch ? 'Edit Live Match' : 'Add New Live Match'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tournament (Optional)
                </label>
                <Select value={form.tournament_id} onValueChange={(value) => setForm({...form, tournament_id: value === "none" ? "" : value})}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select tournament" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General (No specific tournament)</SelectItem>
                    {tournaments.map((tournament) => (
                      <SelectItem key={tournament.id} value={tournament.id}>
                        {tournament.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  placeholder="Live match title"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                placeholder="Describe the live match..."
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Image className="w-4 h-4 inline mr-2" />
                Banner Image
              </label>
              <FileUpload
                onUpload={(url) => setForm({...form, banner_url: url})}
                bucket="match-thumbnails"
                currentUrl={form.banner_url}
                accept="image/*"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Youtube className="w-4 h-4 inline mr-2" />
                YouTube Live URL
              </label>
              <Input
                value={form.youtube_live_url}
                onChange={(e) => setForm({...form, youtube_live_url: e.target.value})}
                placeholder="https://youtube.com/watch?v=..."
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({...form, is_active: checked})}
              />
              <label className="text-sm font-medium text-gray-300">
                Active (visible to users)
              </label>
            </div>

            <div className="flex space-x-2">
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button onClick={resetForm} variant="outline" className="border-gray-600 text-gray-300">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {liveMatches.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6 text-center text-gray-400">
              No live matches found. Create your first one!
            </CardContent>
          </Card>
        ) : (
          liveMatches.map((match) => (
            <Card key={match.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{match.title}</h3>
                      <Badge className={match.is_active ? "bg-green-500" : "bg-gray-500"}>
                        {match.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div className="text-gray-400 text-sm mb-2">
                      Tournament: {getTournamentName(match.tournament_id)}
                    </div>
                    
                    {match.description && (
                      <p className="text-gray-300 mb-3">{match.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      {match.youtube_live_url && (
                        <a
                          href={match.youtube_live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-red-400 hover:text-red-300 text-sm"
                        >
                          <Youtube className="w-4 h-4 mr-1" />
                          Watch Live
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {match.banner_url && (
                    <div className="ml-4">
                      <img 
                        src={match.banner_url} 
                        alt={match.title}
                        className="w-32 h-20 object-cover rounded"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleEdit(match)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(match.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default LiveMatchYouTubeAdmin;