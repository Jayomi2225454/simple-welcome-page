import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Users, MapPin, Clock, Trophy, ArrowLeft, Gamepad, Crown, Medal, Award, PlayCircle, CheckCircle, Timer, TableIcon, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';
import TournamentRegistrationComponent from '@/components/tournament/TournamentRegistration';
import TournamentTimer from '@/components/tournament/TournamentTimer';
import PrizeDistribution from '@/components/tournament/PrizeDistribution';
import SponsorsSection from '@/components/tournament/SponsorsSection';
import TournamentPointsTable from '@/components/tournament/TournamentPointsTable';
import TournamentMatchScores from '@/components/tournament/TournamentMatchScores';
import { useGameStore } from '@/store/gameStore';
import { supabase } from '@/integrations/supabase/client';

interface TournamentWinner {
  id: string;
  tournament_id: string;
  user_id: string;
  player_name: string;
  position: number;
  prize_amount: string | null;
  created_at: string | null;
}

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tournaments, initialize } = useGameStore();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [winners, setWinners] = useState<TournamentWinner[]>([]);
  const [loadingWinners, setLoadingWinners] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const tournament = tournaments.find(t => t.id === id);

  // Fetch winners from database
  useEffect(() => {
    if (!id) return;
    
    const fetchWinners = async () => {
      setLoadingWinners(true);
      try {
        const { data, error } = await supabase
          .from('tournament_winners')
          .select('*')
          .eq('tournament_id', id)
          .order('position', { ascending: true });

        if (error) throw error;
        setWinners(data || []);
      } catch (error) {
        console.error('Error fetching winners:', error);
      } finally {
        setLoadingWinners(false);
      }
    };

    fetchWinners();
  }, [id]);

  useEffect(() => {
    if (!tournament) return;

    const calculateTimeLeft = () => {
      const targetDate = new Date(tournament.start_date).getTime();
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [tournament]);

  if (!tournament) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Tournament not found</h1>
            <Button onClick={() => navigate('/tournaments')}>
              Back to Tournaments
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="relative h-[250px] sm:h-[350px] md:h-[450px] lg:h-[500px] overflow-hidden animate-fade-in">
          {tournament.banner ? (
            <img 
              src={tournament.banner} 
              alt={tournament.name}
              className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-blue-900/50"></div>
          )}
          <div className="absolute inset-0 bg-black/50"></div>
          
          <div className="absolute inset-0 flex flex-col justify-between">
            <div className="p-3 sm:p-4 md:p-6 animate-slide-in-right">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/tournaments')}
                className="text-white hover:bg-white/20 transform hover:scale-105 transition-transform duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tournaments
              </Button>
            </div>
            
            <div className="p-3 sm:p-4 md:p-6 animate-slide-in-right animation-delay-300">
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                <Badge variant="secondary" className="bg-purple-500 text-white transform hover:scale-105 transition-transform duration-200">
                  {tournament.game || 'battle-royale'}
                </Badge>
                <Badge 
                  variant="secondary" 
                  className={
                    tournament.status === 'upcoming' ? 'bg-blue-500 text-white' :
                    tournament.status === 'ongoing' ? 'bg-green-500 text-white' :
                    'bg-gray-500 text-white'
                  }
                >
                  {tournament.status.toUpperCase()}
                </Badge>
                {tournament.entry_fee && (
                  <Badge variant="secondary" className="bg-green-500 text-white">
                    Entry: {tournament.entry_fee}
                  </Badge>
                )}
              </div>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                {tournament.name}
              </h1>
              
              <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-white">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">
                    {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">
                    {tournament.current_participants}/{tournament.max_participants}
                  </span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{tournament.region || 'Global'}</span>
                </div>
                <div className="flex items-center">
                  <Gamepad className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{tournament.format || 'Battle Royale'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Prize Pool Card */}
          <div className="absolute top-6 right-6">
            <Card className="bg-black/20 border-gray-600 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <p className="text-white text-sm mb-1">Prize Pool</p>
                <p className="text-yellow-400 text-2xl font-bold">{tournament.prize_pool}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tournament Status Banner */}
        <div className={`py-4 ${
          tournament.status === 'upcoming' ? 'bg-gradient-to-r from-blue-600 to-blue-800' :
          tournament.status === 'ongoing' ? 'bg-gradient-to-r from-green-600 to-green-800 animate-pulse' :
          'bg-gradient-to-r from-gray-600 to-gray-800'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center gap-4">
              {tournament.status === 'upcoming' && (
                <>
                  <Timer className="w-6 h-6 text-white" />
                  <span className="text-white text-lg font-bold">UPCOMING - Registration Open</span>
                </>
              )}
              {tournament.status === 'ongoing' && (
                <>
                  <PlayCircle className="w-6 h-6 text-white animate-bounce" />
                  <span className="text-white text-lg font-bold">🔴 LIVE - Tournament In Progress</span>
                </>
              )}
              {tournament.status === 'completed' && (
                <>
                  <CheckCircle className="w-6 h-6 text-white" />
                  <span className="text-white text-lg font-bold">✅ COMPLETED - See Results Below</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tournament Countdown */}
        {tournament.status === 'upcoming' && (
          <div className="bg-gray-900 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="flex items-center justify-center mb-4">
                <Clock className="w-5 h-5 mr-2 text-purple-400" />
                <h2 className="text-white text-lg">Tournament starts in</h2>
              </div>
              
              <div className="grid grid-cols-4 gap-4 max-w-md mx-auto mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{timeLeft.days}</div>
                  <div className="text-gray-400 text-sm">DAYS</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{timeLeft.hours}</div>
                  <div className="text-gray-400 text-sm">HOURS</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{timeLeft.minutes}</div>
                  <div className="text-gray-400 text-sm">MINUTES</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{timeLeft.seconds}</div>
                  <div className="text-gray-400 text-sm">SECONDS</div>
                </div>
              </div>
              
              <p className="text-gray-400 text-sm mt-2">
                Registration closes 1 hour before the tournament starts
              </p>
            </div>
          </div>
        )}

        {/* Ongoing Tournament Alert */}
        {tournament.status === 'ongoing' && (
          <div className="bg-green-900/30 border-y border-green-500/50 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                <span className="text-green-400 text-xl font-bold">Tournament is LIVE!</span>
              </div>
              <p className="text-gray-400 mt-2">Check below for room credentials and match updates</p>
            </div>
          </div>
        )}

        {/* Completed Tournament Alert */}
        {tournament.status === 'completed' && winners.length > 0 && (
          <div className="bg-yellow-900/30 border-y border-yellow-500/50 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="flex items-center justify-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <span className="text-yellow-400 text-xl font-bold">Tournament Completed!</span>
              </div>
              <p className="text-gray-400 mt-2">Winners have been announced. Check the results below!</p>
            </div>
          </div>
        )}

        {/* Tournament Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 animate-slide-in-right">
              {/* Tournament Timer */}
              <TournamentTimer tournament={tournament} />
              
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className={`flex flex-wrap w-full bg-gray-800 hover-scale gap-1`}>
                  <TabsTrigger value="overview" className="transition-all duration-200 hover:scale-105">Overview</TabsTrigger>
                  <TabsTrigger value="register" className="transition-all duration-200 hover:scale-105">Register</TabsTrigger>
                  {(tournament as any).team_mode === '1v1' && (
                    <TabsTrigger value="matches" className="transition-all duration-200 hover:scale-105">
                      <Swords className="w-4 h-4 mr-1" />
                      Matches
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="points" className="transition-all duration-200 hover:scale-105">
                    <TableIcon className="w-4 h-4 mr-1" />
                    Points
                  </TabsTrigger>
                  <TabsTrigger value="rules" className="transition-all duration-200 hover:scale-105">Rules</TabsTrigger>
                  <TabsTrigger value="schedule" className="transition-all duration-200 hover:scale-105">Schedule</TabsTrigger>
                  <TabsTrigger value="prizes" className="transition-all duration-200 hover:scale-105">Prizes</TabsTrigger>
                </TabsList>
                
                <TabsContent value="register" className="mt-6">
                  <TournamentRegistrationComponent tournament={tournament} />
                </TabsContent>

                {(tournament as any).team_mode === '1v1' && (
                  <TabsContent value="matches" className="mt-6">
                    <TournamentMatchScores tournamentId={tournament.id} />
                  </TabsContent>
                )}
                
                <TabsContent value="overview" className="mt-6">
                  <div className="space-y-6">
                    {/* Hero Description */}
                    <Card className="bg-gradient-to-br from-purple-900/50 via-blue-900/30 to-indigo-900/50 border-purple-500/30 backdrop-blur-sm overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10" />
                      {/* Dark overlay for better text readability */}
                      <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" />
                      <CardContent className="relative p-8 z-10">
                        <div className="flex items-center mb-6">
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mr-4 shadow-xl">
                            <Gamepad className="w-7 h-7 text-white drop-shadow-lg" />
                          </div>
                          <h3 className="text-3xl font-bold text-white drop-shadow-lg text-shadow-lg">About the Tournament</h3>
                        </div>
                        <p className="text-white text-lg leading-relaxed font-medium drop-shadow-md">
                          {tournament.description || 'Join the ultimate Free Fire tournament and compete against the best players from around the world! Show your skills, strategy, and teamwork to win the grand prize.'}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Tournament Details Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-400/30 hover:border-blue-400/50 transition-all duration-300 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
                        <CardContent className="p-6 text-center relative z-10">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                            <Gamepad className="w-7 h-7 text-white drop-shadow-lg" />
                          </div>
                          <h4 className="text-white font-bold mb-2 text-base uppercase tracking-wide drop-shadow-lg">Format</h4>
                          <p className="text-white font-bold text-xl drop-shadow-md">{tournament.format || 'Battle Royale'}</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-400/30 hover:border-green-400/50 transition-all duration-300 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
                        <CardContent className="p-6 text-center relative z-10">
                          <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                            <Trophy className="w-7 h-7 text-white drop-shadow-lg" />
                          </div>
                          <h4 className="text-white font-bold mb-2 text-base uppercase tracking-wide drop-shadow-lg">Entry Fee</h4>
                          <p className="text-white font-bold text-xl drop-shadow-md">{tournament.entry_fee || '₹10'}</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-orange-600/20 to-red-600/20 border-orange-400/30 hover:border-orange-400/50 transition-all duration-300 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
                        <CardContent className="p-6 text-center relative z-10">
                          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                            <MapPin className="w-7 h-7 text-white drop-shadow-lg" />
                          </div>
                          <h4 className="text-white font-bold mb-2 text-base uppercase tracking-wide drop-shadow-lg">Region</h4>
                          <p className="text-white font-bold text-xl drop-shadow-md">{tournament.region || 'Global'}</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-400/30 hover:border-purple-400/50 transition-all duration-300 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
                        <CardContent className="p-6 text-center relative z-10">
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                            <Users className="w-7 h-7 text-white drop-shadow-lg" />
                          </div>
                          <h4 className="text-white font-bold mb-2 text-base uppercase tracking-wide drop-shadow-lg">Organizer</h4>
                          <p className="text-white font-bold text-xl drop-shadow-md">{tournament.organizer || 'Battle Mitra Official'}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Key Highlights */}
                    {tournament.highlights && (
                      <Card className="bg-gradient-to-br from-yellow-600/20 via-orange-600/20 to-red-600/20 border-yellow-400/30 backdrop-blur-sm">
                        <CardContent className="p-8">
                          <div className="flex items-center mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mr-4">
                              <Trophy className="w-6 h-6 text-white" />
                            </div>
                            <h4 className="text-2xl font-bold text-white">Key Highlights</h4>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            {tournament.highlights.map((highlight, index) => (
                              <div key={index} className="flex items-center p-4 bg-black/20 rounded-lg border-l-4 border-yellow-400">
                                <div className="w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mr-4 flex-shrink-0"></div>
                                <span className="text-gray-200 font-medium">{highlight}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="points" className="mt-6">
                  <TournamentPointsTable tournamentId={tournament.id} />
                </TabsContent>
                
                <TabsContent value="rules" className="mt-6">
                  <Card className="bg-gradient-to-br from-red-900/30 via-orange-900/20 to-yellow-900/30 border-red-500/30 backdrop-blur-sm overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-orange-600/5" />
                    <CardContent className="relative p-8">
                      <div className="flex items-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center mr-6 shadow-lg">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold text-white mb-2">Tournament Rules</h3>
                          <p className="text-gray-300">Important guidelines for all participants</p>
                        </div>
                      </div>
                      
                      <div className="bg-black/30 rounded-xl p-8 border border-red-500/20">
                        <div className="prose prose-invert max-w-none">
                          <div className="text-gray-200 text-lg leading-relaxed whitespace-pre-line">
                            {tournament.rules || `📋 Tournament Rules

🎯 General Guidelines:
• All participants must follow fair play rules
• No cheating, hacking, or exploiting allowed
• Respect all players and organizers
• Use only approved devices and software

⏰ Match Rules:
• Be present 15 minutes before match time
• Late arrivals may result in disqualification
• Match settings will be announced beforehand
• Screenshots required for dispute resolution

🏆 Prize Distribution:
• Winners will be announced after verification
• Prize money will be distributed within 7 days
• Valid ID proof required for prize claim
• Organizers' decision is final in all disputes

📱 Communication:
• Join our official Discord/WhatsApp group
• Check announcements regularly
• Contact support for any queries

⚠️ Violations may lead to immediate disqualification.`}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="schedule" className="mt-6">
                  <Card className="bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-blue-900/30 border-indigo-500/30 backdrop-blur-sm overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-blue-600/5" />
                    <CardContent className="relative p-8">
                      <div className="flex items-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center mr-6 shadow-lg">
                          <Clock className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold text-white mb-2">Tournament Schedule</h3>
                          <p className="text-gray-300">Complete timeline and match schedule</p>
                        </div>
                      </div>
                      
                      <div className="bg-black/30 rounded-xl p-8 border border-indigo-500/20">
                        <div className="space-y-6">
                          {tournament.schedule ? (
                            <div className="text-gray-200 text-lg leading-relaxed whitespace-pre-line">
                              {tournament.schedule}
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-indigo-600/20 to-blue-600/20 rounded-lg border-l-4 border-indigo-400">
                                <div className="w-3 h-3 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                  <h4 className="text-indigo-300 font-semibold text-lg mb-2">Registration Phase</h4>
                                  <p className="text-gray-300">Open registration for all participants</p>
                                  <span className="text-sm text-indigo-400">{new Date(tournament.start_date).toLocaleDateString()}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg border-l-4 border-purple-400">
                                <div className="w-3 h-3 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                  <h4 className="text-purple-300 font-semibold text-lg mb-2">Qualification Rounds</h4>
                                  <p className="text-gray-300">Initial screening and team formation</p>
                                  <span className="text-sm text-purple-400">Day 1-2</span>
                                </div>
                              </div>
                              
                              <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-lg border-l-4 border-blue-400">
                                <div className="w-3 h-3 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                  <h4 className="text-blue-300 font-semibold text-lg mb-2">Semi-Finals</h4>
                                  <p className="text-gray-300">Top teams compete for final spots</p>
                                  <span className="text-sm text-blue-400">Day 3</span>
                                </div>
                              </div>
                              
                              <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-lg border-l-4 border-yellow-400">
                                <div className="w-3 h-3 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                  <h4 className="text-yellow-300 font-semibold text-lg mb-2">Grand Finals</h4>
                                  <p className="text-gray-300">Ultimate showdown for the championship</p>
                                  <span className="text-sm text-yellow-400">{new Date(tournament.end_date).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="prizes" className="mt-6">
                  <div className="space-y-6">
                    <PrizeDistribution prizesContent={tournament.prizes_content} />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Winners Announcement for Completed Tournaments */}
              {winners.length > 0 && (
                <div className="mt-8">
                  {/* Celebration Banner */}
                  <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 p-1 rounded-xl mb-6 shadow-2xl">
                    <Card className="bg-gray-900 border-0 rounded-lg overflow-hidden">
                      <CardContent className="p-0">
                        {/* Header Section */}
                        <div className="bg-gradient-to-br from-yellow-500/30 via-orange-500/30 to-red-500/30 p-8 text-center relative overflow-hidden">
                          {/* Animated background elements */}
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_hsl(45,100%,70%,0.1)_0%,_transparent_50%)]" />
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_hsl(25,100%,60%,0.1)_0%,_transparent_50%)]" />
                          
                          <div className="relative z-10">
                            {/* Trophy Icon */}
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-6 shadow-xl animate-bounce">
                              <Trophy className="w-10 h-10 text-white drop-shadow-lg" />
                            </div>
                            
                            {/* Title */}
                            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-300 via-orange-300 to-red-300 bg-clip-text text-transparent mb-4 drop-shadow-lg">
                              🏆 TOURNAMENT CHAMPIONS 🏆
                            </h2>
                            
                            {/* Subtitle */}
                            <p className="text-xl text-yellow-200 font-semibold mb-2">
                              {tournament.name}
                            </p>
                            
                            {/* Decorative line */}
                            <div className="flex justify-center mb-4">
                              <div className="w-32 h-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-full shadow-lg" />
                            </div>
                          </div>
                        </div>
                        
                        {/* Winners Content */}
                        <div className="p-8 bg-gradient-to-br from-gray-800 via-gray-900 to-black">
                          <div className="bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 rounded-xl p-6 border-2 border-yellow-400/40 shadow-inner">
                            <div className="text-center mb-6">
                              <h3 className="text-2xl font-bold text-yellow-300 mb-2">🥇 Winners List 🥇</h3>
                            </div>
                            
                            {/* Winners Grid */}
                            <div className="grid gap-4 md:grid-cols-3 mb-6">
                              {winners.slice(0, 3).map((winner) => {
                                const getWinnerStyle = (position: number) => {
                                  switch (position) {
                                    case 1:
                                      return {
                                        bg: 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/30',
                                        border: 'border-yellow-400',
                                        icon: <Crown className="w-8 h-8 text-yellow-400" />,
                                        badge: '🥇',
                                        textColor: 'text-yellow-300'
                                      };
                                    case 2:
                                      return {
                                        bg: 'bg-gradient-to-br from-gray-400/30 to-gray-500/30',
                                        border: 'border-gray-400',
                                        icon: <Medal className="w-8 h-8 text-gray-300" />,
                                        badge: '🥈',
                                        textColor: 'text-gray-300'
                                      };
                                    case 3:
                                      return {
                                        bg: 'bg-gradient-to-br from-orange-500/30 to-orange-600/30',
                                        border: 'border-orange-400',
                                        icon: <Award className="w-8 h-8 text-orange-400" />,
                                        badge: '🥉',
                                        textColor: 'text-orange-300'
                                      };
                                    default:
                                      return {
                                        bg: 'bg-gradient-to-br from-purple-500/30 to-purple-600/30',
                                        border: 'border-purple-400',
                                        icon: <Trophy className="w-8 h-8 text-purple-400" />,
                                        badge: `#${position}`,
                                        textColor: 'text-purple-300'
                                      };
                                  }
                                };
                                
                                const style = getWinnerStyle(winner.position);
                                
                                return (
                                  <div 
                                    key={winner.id} 
                                    className={`${style.bg} ${style.border} border-2 rounded-xl p-6 text-center transform hover:scale-105 transition-all duration-300`}
                                  >
                                    <div className="mb-3">
                                      <span className="text-4xl">{style.badge}</span>
                                    </div>
                                    <div className="mb-3">{style.icon}</div>
                                    <h4 className={`text-xl font-bold ${style.textColor} mb-2`}>{winner.player_name}</h4>
                                    {winner.prize_amount && (
                                      <p className="text-white font-bold text-lg">{winner.prize_amount}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Additional Winners */}
                            {winners.length > 3 && (
                              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {winners.slice(3).map((winner) => (
                                  <div 
                                    key={winner.id} 
                                    className="bg-black/30 border border-purple-400/30 rounded-lg p-4 flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                                        #{winner.position}
                                      </span>
                                      <span className="text-white font-medium">{winner.player_name}</span>
                                    </div>
                                    {winner.prize_amount && (
                                      <span className="text-yellow-400 font-bold">{winner.prize_amount}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Celebration Footer */}
                            <div className="text-center mt-8 space-y-2">
                              <p className="text-2xl font-bold text-yellow-300">
                                🎉 CONGRATULATIONS! 🎉
                              </p>
                              <p className="text-lg text-orange-200 font-medium">
                                Amazing performance by our champions!
                              </p>
                              <div className="flex justify-center space-x-4 mt-4 text-2xl">
                                <span>🏆</span>
                                <span>🥇</span>
                                <span>🎊</span>
                                <span>🔥</span>
                                <span>⭐</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6 animate-fade-in animation-delay-500">
              <Card className="bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-indigo-900/40 border-blue-500/30 backdrop-blur-sm shadow-xl relative overflow-hidden hover-scale">
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
                <CardContent className="p-6 relative z-10">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center drop-shadow-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mr-3 shadow-lg animate-pulse">
                      <Clock className="w-4 h-4 text-white drop-shadow-sm" />
                    </div>
                    Tournament Format
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
                      <span className="text-blue-200 font-semibold text-sm">Format:</span>
                      <span className="text-white font-bold drop-shadow-sm">{tournament.format || 'Battle Royale'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-green-500/20 hover:border-green-500/40 transition-all duration-300">
                      <span className="text-green-200 font-semibold text-sm">Entry Fee:</span>
                      <span className="text-white font-bold drop-shadow-sm">{tournament.entry_fee || '₹10'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300">
                      <span className="text-purple-200 font-semibold text-sm">Team Size:</span>
                      <span className="text-white font-bold drop-shadow-sm">{tournament.team_size || 'Solo'}</span>
                    </div>
                    {tournament.start_time && tournament.end_time && (
                      <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300">
                        <span className="text-orange-200 font-semibold text-sm">Time:</span>
                        <span className="text-white font-bold drop-shadow-sm">{tournament.start_time} - {tournament.end_time}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-900/40 via-blue-900/30 to-teal-900/40 border-green-500/30 backdrop-blur-sm shadow-xl relative overflow-hidden hover-scale">
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
                <CardContent className="p-6 relative z-10">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center drop-shadow-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-teal-500 rounded-full flex items-center justify-center mr-3 shadow-lg animate-pulse">
                      <Clock className="w-4 h-4 text-white drop-shadow-sm" />
                    </div>
                    Timeline
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-black/20 rounded-lg border-l-4 border-blue-400 transform hover:translate-x-2 transition-transform duration-200">
                      <p className="text-white font-bold text-base mb-1 drop-shadow-sm">Registration Opens</p>
                      <p className="text-blue-200 font-medium">
                        {tournament.registration_opens ? 
                          new Date(tournament.registration_opens).toLocaleDateString() : 
                          new Date(tournament.start_date).toLocaleDateString()
                        }
                      </p>
                    </div>
                    <div className="p-4 bg-black/20 rounded-lg border-l-4 border-yellow-400 transform hover:translate-x-2 transition-transform duration-200">
                      <p className="text-white font-bold text-base mb-1 drop-shadow-sm">Registration Closes</p>
                      <p className="text-yellow-200 font-medium">
                        {tournament.registration_closes ? 
                          new Date(tournament.registration_closes).toLocaleDateString() : 
                          new Date(tournament.start_date).toLocaleDateString()
                        }
                      </p>
                    </div>
                    <div className="p-4 bg-black/20 rounded-lg border-l-4 border-green-400 transform hover:translate-x-2 transition-transform duration-200">
                      <p className="text-white font-bold text-base mb-1 drop-shadow-sm">Tournament Starts</p>
                      <p className="text-green-200 font-medium">
                        {new Date(tournament.start_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Sponsors Section */}
        <SponsorsSection className="bg-gray-900/50" />
      </div>
    </Layout>
  );
};

export default TournamentDetail;