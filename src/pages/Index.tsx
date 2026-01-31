
import { Link } from 'react-router-dom';
import { Trophy, Users, DollarSign, Gamepad2, ArrowRight, PlayCircle, Clock, Zap, UserCheck, Building, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Layout from '@/components/layout/Layout';
import { useGameStore } from '@/store/gameStore';
import { useAuth } from '@/contexts/AuthContext';
import { sponsorService, Sponsor } from '@/services/sponsorService';
import { useState, useEffect } from 'react';

const Index = () => {
  const { tournaments, players, matches } = useGameStore();
  const { user } = useAuth();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffect(() => {
    const loadSponsors = async () => {
      try {
        const sponsorsData = await sponsorService.getSponsors();
        setSponsors(sponsorsData);
      } catch (error) {
        console.error('Failed to load sponsors:', error);
      }
    };
    loadSponsors();
  }, []);

  const stats = [
    {
      label: 'Tournaments',
      value: '500+',
      icon: Trophy,
      color: 'text-purple-400',
    },
    {
      label: 'Players',
      value: '50k+',
      icon: Users,
      color: 'text-blue-400',
    },
    {
      label: 'Prize Pool',
      value: '₹1M+',
      icon: DollarSign,
      color: 'text-green-400',
    },
    {
      label: 'Games',
      value: '20+',
      icon: Gamepad2,
      color: 'text-orange-400',
    },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e')] bg-cover bg-center opacity-10" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Compete. Dominate.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                Conquer.
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Join the ultimate esports tournament platform. Participate in competitions,
              climb the leaderboards, and win amazing prizes.
            </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <>
                <Button 
                  asChild
                  size="lg" 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-lg px-8 py-6"
                >
                  <Link to="/tournaments">Join a Tournament Now!</Link>
                </Button>
                <Button 
                  asChild
                  variant="outline" 
                  size="lg" 
                  className="border-purple-500 text-purple-400 hover:bg-purple-500/10 text-lg px-8 py-6"
                >
                  <Link to="/tournaments">Browse Tournaments</Link>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  asChild
                  size="lg" 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-lg px-8 py-6"
                >
                  <Link to="/auth">Sign Up Now!</Link>
                </Button>
                <Button 
                  asChild
                  variant="outline" 
                  size="lg" 
                  className="border-purple-500 text-purple-400 hover:bg-purple-500/10 text-lg px-8 py-6"
                >
                  <Link to="/auth">Login</Link>
                </Button>
              </>
            )}
          </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <Card key={stat.label} className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <stat.icon className={`w-12 h-12 mx-auto mb-4 ${stat.color}`} />
                  <div className={`text-3xl font-bold mb-2 ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Tournaments */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center space-x-3">
              <Trophy className="w-8 h-8 text-purple-400" />
              <h2 className="text-4xl font-bold text-white">Upcoming Tournaments</h2>
            </div>
            <Button asChild variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500/10">
              <Link to="/tournaments" className="inline-flex items-center">
                View All <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tournaments.slice(0, 4).map((tournament) => (
              <Card key={tournament.id} className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all duration-300 group overflow-hidden">
                {/* Tournament Banner */}
                <div className="relative aspect-video overflow-hidden">
                  {tournament.banner ? (
                    <img 
                      src={tournament.banner} 
                      alt={tournament.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-900/40 to-blue-900/40 flex items-center justify-center">
                      <Gamepad2 className="w-12 h-12 text-purple-400" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex space-x-2">
                    <span className="px-2 py-1 bg-purple-500/90 text-white text-xs font-medium rounded-full">
                      {tournament.game.toLowerCase()}
                    </span>
                    <span className="px-2 py-1 bg-blue-500/90 text-white text-xs font-medium rounded-full">
                      Entry: Free
                    </span>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <h3 className="text-white font-bold text-lg mb-2 group-hover:text-purple-400 transition-colors line-clamp-1">
                    {tournament.name}
                  </h3>
                  <div className="text-sm text-gray-400 mb-3">
                    Starts {new Date(tournament.start_date).toLocaleDateString()}
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <div className="text-sm text-gray-400">Prize Pool</div>
                      <div className="text-lg font-bold text-yellow-400">{tournament.prize_pool}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Participants</div>
                      <div className="text-lg font-bold text-white">{tournament.current_participants}/{tournament.max_participants}</div>
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                    Register Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Live Matches */}
      <section className="py-16 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center space-x-3">
              <PlayCircle className="w-8 h-8 text-red-400" />
              <h2 className="text-4xl font-bold text-white">Live Matches</h2>
            </div>
            <Button asChild variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500/10">
              <Link to="/live-matches" className="inline-flex items-center">
                View All <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.filter(match => match.status === 'live').slice(0, 3).map((match) => (
              <Card key={match.id} className="bg-gray-800/50 border-gray-700 hover:border-red-500/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-400">{match.game}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-400 text-sm font-medium">LIVE</span>
                    </div>
                  </div>
                  
                  <div className="text-center mb-6">
                    <h3 className="text-white font-bold text-lg mb-2">Apex Legends Showdown</h3>
                    <div className="text-sm text-gray-400">{new Date(match.start_time).toLocaleTimeString()}</div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-500/20 rounded border border-blue-500/30 flex items-center justify-center mb-2">
                        <UserCheck className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="text-white font-medium">{match.player1}</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white mb-1">
                        {match.player1_score} : {match.player2_score}
                      </div>
                      <div className="text-sm text-purple-400">battle-royale</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-500/20 rounded border border-blue-500/30 flex items-center justify-center mb-2">
                        <UserCheck className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="text-white font-medium">{match.player2}</div>
                    </div>
                  </div>
                  
                  <Button className="w-full bg-red-500 hover:bg-red-600">
                    Watch Stream
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboards Preview */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center space-x-3">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <h2 className="text-4xl font-bold text-white">Top Players</h2>
            </div>
            <Button asChild variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500/10">
              <Link to="/leaderboards" className="inline-flex items-center">
                View Full Leaderboards <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {players.slice(0, 4).map((player, index) => (
              <Card key={player.id} className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="relative mb-4">
                    <img 
                      src={player.avatar} 
                      alt={player.name}
                      className="w-16 h-16 rounded-full mx-auto border-2 border-purple-500/30"
                    />
                    <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-purple-500 text-white'
                    }`}>
                      #{player.rank}
                    </div>
                  </div>
                  
                  <h3 className="text-white font-bold text-lg mb-1">{player.name}</h3>
                  <div className="text-gray-400 text-sm mb-3">{player.country}</div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Points:</span>
                      <span className="text-purple-400 font-medium">{player.points.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Win Rate:</span>
                      <span className="text-green-400 font-medium">{player.win_rate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Earnings:</span>
                      <span className="text-yellow-400 font-medium">₹{player.earnings?.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Our Sponsors */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-b from-gray-900/50 to-black/50">
        {/* Modern Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Modern Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
              <Building className="w-6 h-6 text-white" />
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                Trusted by Industry Leaders
              </span>
            </h2>
            
            <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Partnering with the world's most innovative companies to bring you the best gaming experience
            </p>
          </div>
          
          {/* Colorful Sponsor Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {sponsors.map((sponsor, index) => {
              // Dynamic gradient colors for each sponsor
              const gradientColors = [
                'from-purple-500/30 via-purple-400/20 to-blue-500/30 border-purple-400/50',
                'from-blue-500/30 via-blue-400/20 to-cyan-500/30 border-blue-400/50',
                'from-green-500/30 via-green-400/20 to-emerald-500/30 border-green-400/50',
                'from-orange-500/30 via-orange-400/20 to-red-500/30 border-orange-400/50',
                'from-pink-500/30 via-pink-400/20 to-purple-500/30 border-pink-400/50',
                'from-yellow-500/30 via-yellow-400/20 to-orange-500/30 border-yellow-400/50',
                'from-indigo-500/30 via-indigo-400/20 to-purple-500/30 border-indigo-400/50',
                'from-teal-500/30 via-teal-400/20 to-blue-500/30 border-teal-400/50'
              ];
              
              const colorClass = gradientColors[index % gradientColors.length];
              
              return (
                <div key={sponsor.id} className="group relative">
                  {/* Colorful Card */}
                  <div className={`relative bg-gradient-to-br ${colorClass} backdrop-blur-sm border-2 rounded-3xl p-6 h-32 flex flex-col items-center justify-center hover:scale-[1.02] transition-all duration-300 shadow-xl overflow-hidden`}>
                    {/* Animated background glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Floating decorative elements */}
                    <div className="absolute top-2 right-2 w-4 h-4 bg-white/20 rounded-full animate-pulse"></div>
                    <div className="absolute bottom-2 left-2 w-3 h-3 bg-white/10 rounded-full animate-pulse delay-500"></div>
                    
                    {sponsor.website ? (
                      <a 
                        href={sponsor.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="relative z-10 flex flex-col items-center justify-center h-full w-full text-center transform hover:scale-110 transition-transform duration-300"
                      >
                        {sponsor.logo ? (
                          <div className="flex flex-col items-center">
                            <img 
                              src={sponsor.logo} 
                              alt={sponsor.name}
                              className="h-10 w-auto object-contain mb-2 filter brightness-100 group-hover:brightness-125 transition-all duration-300 drop-shadow-lg"
                            />
                            <span className="text-white text-xs font-bold tracking-wide drop-shadow-lg">{sponsor.name}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-white/30 to-white/10 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                              <Building className="w-5 h-5 text-white drop-shadow-lg" />
                            </div>
                            <span className="text-white text-xs font-bold tracking-wide drop-shadow-lg">{sponsor.name}</span>
                          </div>
                        )}
                      </a>
                    ) : (
                      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full text-center">
                        {sponsor.logo ? (
                          <div className="flex flex-col items-center">
                            <img 
                              src={sponsor.logo} 
                              alt={sponsor.name}
                              className="h-10 w-auto object-contain mb-2 filter brightness-100 group-hover:brightness-125 transition-all duration-300 drop-shadow-lg"
                            />
                            <span className="text-white text-xs font-bold tracking-wide drop-shadow-lg">{sponsor.name}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-white/30 to-white/10 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                              <Building className="w-5 h-5 text-white drop-shadow-lg" />
                            </div>
                            <span className="text-white text-xs font-bold tracking-wide drop-shadow-lg">{sponsor.name}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modern CTA */}
          <div className="text-center mt-16">
            <div className="inline-block bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-2xl">
              <h3 className="text-2xl font-bold text-white mb-4">Join Our Partner Network</h3>
              <p className="text-gray-400 mb-6">
                Interested in partnering with us? Connect with thousands of passionate gamers and grow your brand.
              </p>
              <div className="flex flex-wrap gap-4 justify-center text-sm">
                <div className="flex items-center text-gray-300">
                  <Users className="w-4 h-4 mr-2 text-blue-400" />
                  10K+ Active Players
                </div>
                <div className="flex items-center text-gray-300">
                  <Trophy className="w-4 h-4 mr-2 text-purple-400" />
                  50+ Tournaments
                </div>
                <div className="flex items-center text-gray-300">
                  <Target className="w-4 h-4 mr-2 text-green-400" />
                  Global Reach
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Join the Battle Mitra Community */}
      <section className="py-16 bg-gradient-to-br from-purple-900/20 to-blue-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Join the Battle Mitra Community</h2>
          <p className="text-gray-300 text-lg mb-12 max-w-3xl mx-auto">
            Be part of an active community of gamers, compete in tournaments, win prizes, and make friends along the way.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Connect with Gamers</h3>
                <p className="text-gray-400 mb-6">
                  Find teammates, make friends, and build your network in the gaming community.
                </p>
                <Button asChild className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                  <Link to="/tournaments">Join Tournaments</Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Win Prizes</h3>
                <p className="text-gray-400 mb-6">
                  Compete in tournaments with cash prizes, gaming gear, and more exclusive rewards.
                </p>
                <Button asChild className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                  <Link to="/tournaments">View Tournaments</Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Improve Your Skills</h3>
                <p className="text-gray-400 mb-6">
                  Compete against the best and learn from top players to enhance your gameplay.
                </p>
                <Button asChild className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                  <Link to="/leaderboards">View Leaderboards</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <>
                <Button asChild size="lg" className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                  <Link to="/tournaments">Join Tournaments</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-purple-500 text-purple-400 hover:bg-purple-500/10">
                  <Link to="/leaderboards">View Leaderboards</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                  <Link to="/auth">Create Account</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-purple-500 text-purple-400 hover:bg-purple-500/10">
                  <Link to="/auth">Join Tournaments</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
