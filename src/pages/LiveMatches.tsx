
import { useState, useEffect } from 'react';
import { Play, Clock, CheckCircle, Users, Calendar, Youtube, ExternalLink, Image } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';
import { useGameStore } from '@/store/gameStore';
import { liveMatchService, LiveMatchAdmin } from '@/services/liveMatchService';

const LiveMatches = () => {
  const { matches } = useGameStore();
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [liveStreams, setLiveStreams] = useState<LiveMatchAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  // Load live YouTube streams
  useEffect(() => {
    const loadLiveStreams = async () => {
      try {
        const streams = await liveMatchService.getActiveLiveMatches();
        setLiveStreams(streams);
      } catch (error) {
        console.error('Failed to load live streams:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLiveStreams();
  }, []);

  const filteredMatches = matches.filter(match => 
    selectedStatus === 'all' || match.status === selectedStatus
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live':
        return <Play className="w-4 h-4" />;
      case 'upcoming':
        return <Clock className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-red-500';
      case 'upcoming':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Live Matches</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Watch exciting matches happening right now or catch up on recent games
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {['all', 'live', 'upcoming', 'completed'].map((status) => (
            <Button
              key={status}
              variant={selectedStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus(status)}
              className={selectedStatus === status 
                ? 'bg-purple-500 hover:bg-purple-600' 
                : 'border-gray-600 text-gray-300 hover:bg-gray-800'
              }
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>

        {/* YouTube Live Streams Section */}
        {liveStreams.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Youtube className="w-8 h-8 text-red-500" />
              <h2 className="text-3xl font-bold text-white">Live Streams</h2>
              <Badge className="bg-red-500 text-white animate-pulse">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  LIVE
                </div>
              </Badge>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {liveStreams.map((stream) => (
                <Card key={stream.id} className="bg-gradient-to-br from-red-900/30 via-purple-900/30 to-blue-900/30 border-2 border-red-500/50 hover:border-red-400/70 transition-all duration-300 group overflow-hidden">
                  <CardContent className="p-0">
                    {/* Stream Banner */}
                    <div className="relative aspect-video overflow-hidden">
                      {stream.banner_url ? (
                        <img 
                          src={stream.banner_url} 
                          alt={stream.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-900/40 to-purple-900/40 flex items-center justify-center">
                          <Youtube className="w-16 h-16 text-red-400" />
                        </div>
                      )}
                      
                      {/* Live indicator */}
                      <div className="absolute top-3 left-3 flex items-center space-x-2">
                        <div className="flex items-center space-x-1 bg-red-500/90 text-white px-2 py-1 rounded-full text-xs font-bold">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          LIVE
                        </div>
                      </div>
                      
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="w-16 h-16 bg-red-500/80 rounded-full flex items-center justify-center">
                          <Play className="w-8 h-8 text-white ml-1" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Stream Info */}
                    <div className="p-4">
                      <h3 className="text-white font-bold text-lg mb-2 line-clamp-2 group-hover:text-red-400 transition-colors">
                        {stream.title}
                      </h3>
                      
                      {stream.description && (
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                          {stream.description}
                        </p>
                      )}
                      
                      {/* Watch Button */}
                      {stream.youtube_live_url && (
                        <a
                          href={stream.youtube_live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button className="w-full bg-red-500 hover:bg-red-600 text-white font-bold">
                            <Youtube className="w-4 h-4 mr-2" />
                            Watch Live Stream
                            <ExternalLink className="w-3 h-3 ml-2" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Live Match Banner */}
        {(matches.some(match => match.status === 'live') || liveStreams.length > 0) && (
          <Card className="bg-gradient-to-r from-red-900/50 to-purple-900/50 border-red-500/50 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-400 font-semibold">LIVE NOW</span>
                  </div>
                  <span className="text-white text-lg font-bold">
                    {matches.filter(match => match.status === 'live').length + liveStreams.length} live content available
                  </span>
                </div>
                <div className="flex gap-2">
                  {liveStreams.length > 0 && liveStreams[0].youtube_live_url && (
                    <a
                      href={liveStreams[0].youtube_live_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="bg-red-500 hover:bg-red-600">
                        <Youtube className="w-4 h-4 mr-2" />
                        Watch Stream
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Matches Grid */}
        <div className="space-y-6">
          {filteredMatches.map((match) => (
            <Card key={match.id} className="bg-gray-800 border-gray-700 hover:border-purple-500/50 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Match Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className={`${getStatusColor(match.status)} text-white`}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(match.status)}
                          {match.status.toUpperCase()}
                        </div>
                      </Badge>
                      <span className="text-gray-400 text-sm">{match.game}</span>
                    </div>
                    
                    {/* Players */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-center flex-1">
                        <div className="text-white font-bold text-lg">{match.player1}</div>
                        <div className="text-gray-400 text-sm">Player 1</div>
                      </div>
                      
                      <div className="mx-8 text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {match.player1_score} - {match.player2_score}
                        </div>
                        {match.status === 'live' && (
                          <div className="text-green-400 text-sm font-medium">LIVE</div>
                        )}
                      </div>
                      
                      <div className="text-center flex-1">
                        <div className="text-white font-bold text-lg">{match.player2}</div>
                        <div className="text-gray-400 text-sm">Player 2</div>
                      </div>
                    </div>
                    
                    {/* Match Details */}
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(match.start_time).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    {match.status === 'live' && (
                      <Button className="bg-red-500 hover:bg-red-600">
                        <Play className="w-4 h-4 mr-2" />
                        Watch Live
                      </Button>
                    )}
                    {match.status === 'upcoming' && (
                      <Button variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500/10">
                        Set Reminder
                      </Button>
                    )}
                    {match.status === 'completed' && (
                      <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                        View Replay
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredMatches.length === 0 && liveStreams.length === 0 && !loading && (
          <div className="text-center py-12">
            <Play className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No live content found</h3>
            <p className="text-gray-500">No matches or live streams are currently available. Check back later!</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading live content...</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LiveMatches;
