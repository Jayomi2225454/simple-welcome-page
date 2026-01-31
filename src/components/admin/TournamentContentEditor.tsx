import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, Calendar, Trophy, Clock } from 'lucide-react';
import { Tournament, OverviewContent, ScheduleContent, PrizesContent } from '@/types';

interface TournamentContentEditorProps {
  tournament: Tournament;
  onUpdate?: () => void;
}

const TournamentContentEditor: React.FC<TournamentContentEditorProps> = ({
  tournament,
  onUpdate
}) => {
  const [overviewContent, setOverviewContent] = useState<OverviewContent>({
    highlights: [],
    timeline: []
  });
  const [scheduleContent, setScheduleContent] = useState<ScheduleContent>({
    phases: []
  });
  const [prizesContent, setPrizesContent] = useState<PrizesContent>({
    positions: [],
    additional_rewards: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (tournament.overview_content && typeof tournament.overview_content === 'object') {
      const content = tournament.overview_content as OverviewContent;
      setOverviewContent({
        highlights: Array.isArray(content.highlights) ? content.highlights : [],
        timeline: Array.isArray(content.timeline) ? content.timeline : []
      });
    }
    if (tournament.schedule_content && typeof tournament.schedule_content === 'object') {
      const content = tournament.schedule_content as ScheduleContent;
      setScheduleContent({
        phases: Array.isArray(content.phases) ? content.phases : []
      });
    }
    if (tournament.prizes_content && typeof tournament.prizes_content === 'object') {
      const content = tournament.prizes_content as PrizesContent;
      setPrizesContent({
        positions: Array.isArray(content.positions) ? content.positions : [],
        additional_rewards: Array.isArray(content.additional_rewards) ? content.additional_rewards : []
      });
    }
  }, [tournament]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          overview_content: overviewContent as any,
          schedule_content: scheduleContent as any,
          prizes_content: prizesContent as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournament.id);

      if (error) throw error;

      toast({
        title: "Content Updated",
        description: "Tournament content has been successfully updated",
      });

      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update tournament content",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Tournament Content Editor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="prizes">Prizes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Key Highlights</Label>
                {overviewContent.highlights.map((highlight, index) => (
                  <div key={index} className="flex gap-2 mt-2">
                    <Input
                      value={highlight}
                      onChange={(e) => {
                        const newHighlights = [...overviewContent.highlights];
                        newHighlights[index] = e.target.value;
                        setOverviewContent({...overviewContent, highlights: newHighlights});
                      }}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Enter highlight"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const newHighlights = overviewContent.highlights.filter((_, i) => i !== index);
                        setOverviewContent({...overviewContent, highlights: newHighlights});
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOverviewContent({
                      ...overviewContent,
                      highlights: [...overviewContent.highlights, '']
                    });
                  }}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Highlight
                </Button>
              </div>

              <div>
                <Label className="text-gray-300">Timeline Events</Label>
                {overviewContent.timeline.map((event, index) => (
                  <div key={index} className="space-y-2 mt-2 p-3 bg-gray-700 rounded">
                    <Input
                      value={event.title}
                      onChange={(e) => {
                        const newTimeline = [...overviewContent.timeline];
                        newTimeline[index] = {...event, title: e.target.value};
                        setOverviewContent({...overviewContent, timeline: newTimeline});
                      }}
                      className="bg-gray-600 border-gray-500 text-white"
                      placeholder="Event title"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={event.date}
                        onChange={(e) => {
                          const newTimeline = [...overviewContent.timeline];
                          newTimeline[index] = {...event, date: e.target.value};
                          setOverviewContent({...overviewContent, timeline: newTimeline});
                        }}
                        className="bg-gray-600 border-gray-500 text-white"
                      />
                      <Input
                        type="time"
                        value={event.time || ''}
                        onChange={(e) => {
                          const newTimeline = [...overviewContent.timeline];
                          newTimeline[index] = {...event, time: e.target.value};
                          setOverviewContent({...overviewContent, timeline: newTimeline});
                        }}
                        className="bg-gray-600 border-gray-500 text-white"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const newTimeline = overviewContent.timeline.filter((_, i) => i !== index);
                        setOverviewContent({...overviewContent, timeline: newTimeline});
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOverviewContent({
                      ...overviewContent,
                      timeline: [...overviewContent.timeline, { title: '', date: '', time: '' }]
                    });
                  }}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Timeline Event
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <div>
              <Label className="text-gray-300">Tournament Phases</Label>
              {scheduleContent.phases.map((phase, phaseIndex) => (
                <div key={phaseIndex} className="space-y-3 mt-3 p-4 bg-gray-700 rounded">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={phase.title}
                      onChange={(e) => {
                        const newPhases = [...scheduleContent.phases];
                        newPhases[phaseIndex] = {...phase, title: e.target.value};
                        setScheduleContent({...scheduleContent, phases: newPhases});
                      }}
                      className="bg-gray-600 border-gray-500 text-white"
                      placeholder="Phase title"
                    />
                    <Input
                      value={phase.color}
                      onChange={(e) => {
                        const newPhases = [...scheduleContent.phases];
                        newPhases[phaseIndex] = {...phase, color: e.target.value};
                        setScheduleContent({...scheduleContent, phases: newPhases});
                      }}
                      className="bg-gray-600 border-gray-500 text-white"
                      placeholder="Color (e.g., purple-400)"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-400 text-sm">Rounds</Label>
                    {phase.rounds.map((round, roundIndex) => (
                      <div key={roundIndex} className="grid grid-cols-2 gap-2 mt-2">
                        <Input
                          value={round.title}
                          onChange={(e) => {
                            const newPhases = [...scheduleContent.phases];
                            newPhases[phaseIndex].rounds[roundIndex] = {...round, title: e.target.value};
                            setScheduleContent({...scheduleContent, phases: newPhases});
                          }}
                          className="bg-gray-600 border-gray-500 text-white"
                          placeholder="Round title"
                        />
                        <Input
                          type="date"
                          value={round.date}
                          onChange={(e) => {
                            const newPhases = [...scheduleContent.phases];
                            newPhases[phaseIndex].rounds[roundIndex] = {...round, date: e.target.value};
                            setScheduleContent({...scheduleContent, phases: newPhases});
                          }}
                          className="bg-gray-600 border-gray-500 text-white"
                        />
                        <Textarea
                          value={round.description}
                          onChange={(e) => {
                            const newPhases = [...scheduleContent.phases];
                            newPhases[phaseIndex].rounds[roundIndex] = {...round, description: e.target.value};
                            setScheduleContent({...scheduleContent, phases: newPhases});
                          }}
                          className="bg-gray-600 border-gray-500 text-white col-span-2"
                          placeholder="Round description"
                          rows={2}
                        />
                        <Input
                          value={round.time}
                          onChange={(e) => {
                            const newPhases = [...scheduleContent.phases];
                            newPhases[phaseIndex].rounds[roundIndex] = {...round, time: e.target.value};
                            setScheduleContent({...scheduleContent, phases: newPhases});
                          }}
                          className="bg-gray-600 border-gray-500 text-white"
                          placeholder="Time (e.g., 2:00 PM - 6:00 PM)"
                        />
                        <Input
                          value={round.matches}
                          onChange={(e) => {
                            const newPhases = [...scheduleContent.phases];
                            newPhases[phaseIndex].rounds[roundIndex] = {...round, matches: e.target.value};
                            setScheduleContent({...scheduleContent, phases: newPhases});
                          }}
                          className="bg-gray-600 border-gray-500 text-white"
                          placeholder="Matches info"
                        />
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPhases = [...scheduleContent.phases];
                        newPhases[phaseIndex].rounds.push({
                          title: '',
                          date: '',
                          description: '',
                          time: '',
                          matches: ''
                        });
                        setScheduleContent({...scheduleContent, phases: newPhases});
                      }}
                      className="mt-2"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Round
                    </Button>
                  </div>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const newPhases = scheduleContent.phases.filter((_, i) => i !== phaseIndex);
                      setScheduleContent({...scheduleContent, phases: newPhases});
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Phase
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScheduleContent({
                    ...scheduleContent,
                    phases: [...scheduleContent.phases, {
                      title: '',
                      color: 'purple-400',
                      rounds: []
                    }]
                  });
                }}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Phase
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="prizes" className="space-y-4">
            <div>
              <Label className="text-gray-300">Prize Positions</Label>
              {prizesContent.positions.map((position, index) => (
                <div key={index} className="space-y-2 mt-2 p-3 bg-gray-700 rounded">
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      value={position.position}
                      onChange={(e) => {
                        const newPositions = [...prizesContent.positions];
                        newPositions[index] = {...position, position: parseInt(e.target.value)};
                        setPrizesContent({...prizesContent, positions: newPositions});
                      }}
                      className="bg-gray-600 border-gray-500 text-white"
                      placeholder="Position"
                    />
                    <Input
                      value={position.title}
                      onChange={(e) => {
                        const newPositions = [...prizesContent.positions];
                        newPositions[index] = {...position, title: e.target.value};
                        setPrizesContent({...prizesContent, positions: newPositions});
                      }}
                      className="bg-gray-600 border-gray-500 text-white"
                      placeholder="Title (e.g., 1st Place)"
                    />
                    <Input
                      value={position.amount}
                      onChange={(e) => {
                        const newPositions = [...prizesContent.positions];
                        newPositions[index] = {...position, amount: e.target.value};
                        setPrizesContent({...prizesContent, positions: newPositions});
                      }}
                      className="bg-gray-600 border-gray-500 text-white"
                      placeholder="Amount (e.g., ₹6000)"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={position.description}
                      onChange={(e) => {
                        const newPositions = [...prizesContent.positions];
                        newPositions[index] = {...position, description: e.target.value};
                        setPrizesContent({...prizesContent, positions: newPositions});
                      }}
                      className="bg-gray-600 border-gray-500 text-white"
                      placeholder="Description"
                    />
                    <Input
                      value={position.color}
                      onChange={(e) => {
                        const newPositions = [...prizesContent.positions];
                        newPositions[index] = {...position, color: e.target.value};
                        setPrizesContent({...prizesContent, positions: newPositions});
                      }}
                      className="bg-gray-600 border-gray-500 text-white"
                      placeholder="Color (e.g., yellow-500)"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const newPositions = prizesContent.positions.filter((_, i) => i !== index);
                      setPrizesContent({...prizesContent, positions: newPositions});
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPrizesContent({
                    ...prizesContent,
                    positions: [...prizesContent.positions, {
                      position: prizesContent.positions.length + 1,
                      title: '',
                      amount: '',
                      description: '',
                      color: 'yellow-500'
                    }]
                  });
                }}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Prize Position
              </Button>
            </div>

            <div>
              <Label className="text-gray-300">Additional Rewards</Label>
              {prizesContent.additional_rewards.map((reward, index) => (
                <div key={index} className="space-y-2 mt-2 p-3 bg-gray-700 rounded">
                  <Input
                    value={reward.title}
                    onChange={(e) => {
                      const newRewards = [...prizesContent.additional_rewards];
                      newRewards[index] = {...reward, title: e.target.value};
                      setPrizesContent({...prizesContent, additional_rewards: newRewards});
                    }}
                    className="bg-gray-600 border-gray-500 text-white"
                    placeholder="Reward title"
                  />
                  <Textarea
                    value={reward.description}
                    onChange={(e) => {
                      const newRewards = [...prizesContent.additional_rewards];
                      newRewards[index] = {...reward, description: e.target.value};
                      setPrizesContent({...prizesContent, additional_rewards: newRewards});
                    }}
                    className="bg-gray-600 border-gray-500 text-white"
                    placeholder="Reward description"
                    rows={2}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const newRewards = prizesContent.additional_rewards.filter((_, i) => i !== index);
                      setPrizesContent({...prizesContent, additional_rewards: newRewards});
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPrizesContent({
                    ...prizesContent,
                    additional_rewards: [...prizesContent.additional_rewards, {
                      title: '',
                      description: ''
                    }]
                  });
                }}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Additional Reward
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Content'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TournamentContentEditor;