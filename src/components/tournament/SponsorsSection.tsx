import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Globe, ExternalLink, Users, Trophy, Target, Sparkles } from 'lucide-react';
import { sponsorService, Sponsor } from '@/services/sponsorService';

interface SponsorsSectionProps {
  className?: string;
}

const SponsorsSection: React.FC<SponsorsSectionProps> = ({ className = "" }) => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSponsors = async () => {
      try {
        const sponsorsData = await sponsorService.getSponsors();
        setSponsors(sponsorsData);
      } catch (error) {
        console.error('Failed to load sponsors:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSponsors();
  }, []);

  if (loading) {
    return (
      <section className={`py-16 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-700 rounded w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-700 rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (sponsors.length === 0) {
    return null;
  }

  return (
    <section className={`py-20 relative overflow-hidden bg-gradient-to-b from-gray-900/50 to-black/50 ${className}`}>
      {/* Ultra Modern Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/15 via-blue-500/15 to-indigo-500/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-500/15 via-pink-500/15 to-rose-500/15 rounded-full blur-3xl animate-pulse animation-delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-full blur-2xl animate-pulse animation-delay-500"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Ultra Modern Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-3xl mb-8 shadow-2xl hover:shadow-cyan-500/25 transition-all duration-500 hover:scale-110 hover:rotate-3">
            <Sparkles className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
          
          <h2 className="text-5xl md:text-6xl font-extrabold mb-8">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
              Our Amazing Sponsors
            </span>
          </h2>
          
          <div className="w-32 h-1 bg-gradient-to-r from-cyan-400 via-blue-400 via-purple-400 to-pink-400 mx-auto rounded-full mb-6 shadow-lg" />
          
          <p className="text-gray-300 text-xl max-w-3xl mx-auto leading-relaxed font-medium">
            Partnering with visionary companies that fuel the future of competitive gaming and esports excellence
          </p>
        </div>

        {/* Ultra Modern Sponsors Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          {sponsors.map((sponsor, index) => (
            <div key={sponsor.id} className="group relative">
              {/* Ultra Modern Card with Enhanced Animation */}
              <div className="relative bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-2xl border border-white/20 rounded-3xl p-8 h-48 flex flex-col items-center justify-center hover:bg-gradient-to-br hover:from-cyan-500/20 hover:via-blue-500/20 hover:to-purple-500/20 hover:border-white/40 transition-all duration-700 hover:scale-110 hover:rotate-1 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/20">
                {/* Enhanced Glow Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-indigo-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 animation-delay-200"></div>
                
                <div className="relative z-10 flex flex-col items-center justify-center h-full w-full text-center">
                  {/* Enhanced Sponsor Logo */}
                  <div className="flex items-center justify-center mb-4 transform group-hover:scale-110 transition-transform duration-500">
                    {sponsor.logo ? (
                      <div className="relative">
                        <img 
                          src={sponsor.logo} 
                          alt={sponsor.name}
                          className="max-h-16 w-auto object-contain filter brightness-90 group-hover:brightness-125 transition-all duration-500 drop-shadow-lg"
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/0 to-purple-400/0 group-hover:from-cyan-400/20 group-hover:to-purple-400/20 rounded-lg transition-all duration-500 blur-sm"></div>
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-600 via-gray-500 to-gray-700 rounded-3xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-500 group-hover:scale-110">
                        <Building className="w-8 h-8 text-white/90" />
                      </div>
                    )}
                  </div>
                  
                  {/* Enhanced Sponsor Details */}
                  <div className="text-center space-y-3">
                    <h4 className="text-white font-bold text-base tracking-wide group-hover:text-cyan-200 transition-colors duration-500">{sponsor.name}</h4>
                    
                    {sponsor.description && (
                      <p className="text-white/80 text-sm leading-relaxed group-hover:text-white transition-colors duration-500">
                        {sponsor.description.length > 40 
                          ? `${sponsor.description.substring(0, 40)}...` 
                          : sponsor.description}
                      </p>
                    )}
                    
                    {sponsor.website && (
                      <a 
                        href={sponsor.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-white/70 hover:text-cyan-300 text-sm font-medium transition-colors duration-300 group-hover:scale-105 transform mt-3 bg-white/10 px-3 py-1 rounded-full hover:bg-white/20"
                      >
                        <Globe className="w-4 h-4 mr-1" />
                        Visit Site
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </a>
                    )}
                  </div>
                  
                  {/* Enhanced Premium Badge */}
                  {index < 2 && (
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-black text-xs px-3 py-1 font-bold shadow-2xl border-0 rounded-full animate-pulse">
                        ⭐ Premium Partner
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modern Call to Action */}
        <div className="text-center mt-16">
          <div className="inline-block bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-2xl">
            <h3 className="text-2xl font-bold text-white mb-4">Interested in Sponsoring?</h3>
            <p className="text-gray-400 mb-6">
              Join our growing list of sponsors and reach thousands of passionate gamers in the esports community.
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
  );
};

export default SponsorsSection;