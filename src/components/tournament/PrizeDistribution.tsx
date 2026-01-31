import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Medal, Award, Crown, Star, Sparkles } from 'lucide-react';
import { PrizesContent } from '@/types';

interface PrizeDistributionProps {
  prizesContent?: PrizesContent;
  isPreview?: boolean;
}

const PrizeDistribution: React.FC<PrizeDistributionProps> = ({ 
  prizesContent, 
  isPreview = false 
}) => {
  // Default prize structure if no content provided
  const defaultPrizes = {
    positions: [
      {
        position: 1,
        title: "1st Place",
        amount: "₹6000",
        description: "60% of Prize Pool + Champion Trophy",
        color: "from-yellow-400 to-yellow-600"
      },
      {
        position: 2,
        title: "2nd Place", 
        amount: "₹3000",
        description: "30% of Prize Pool + Silver Medal",
        color: "from-gray-300 to-gray-500"
      },
      {
        position: 3,
        title: "3rd Place",
        amount: "₹1000", 
        description: "10% of Prize Pool + Bronze Medal",
        color: "from-orange-400 to-orange-600"
      }
    ],
    additional_rewards: [
      {
        title: "MVP Award",
        description: "Special recognition and in-game cosmetic items for the Most Valuable Player."
      },
      {
        title: "Participation Rewards",
        description: "All participants receive exclusive in-game items and Battle Mitra profile badges."
      }
    ]
  };

  const prizes = (prizesContent && prizesContent.positions && prizesContent.positions.length > 0) 
    ? prizesContent 
    : defaultPrizes;

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-10 h-10 text-yellow-400 drop-shadow-lg" />;
      case 2:
        return <Medal className="w-10 h-10 text-gray-300 drop-shadow-lg" />;
      case 3:
        return <Award className="w-10 h-10 text-orange-400 drop-shadow-lg" />;
      default:
        return <Trophy className="w-10 h-10 text-purple-400 drop-shadow-lg" />;
    }
  };

  const getPositionStyles = (position: number) => {
    switch (position) {
      case 1:
        return {
          cardBg: "bg-gradient-to-br from-yellow-500/30 via-yellow-400/20 to-orange-500/30",
          border: "border-2 border-yellow-400/70 shadow-2xl shadow-yellow-500/30",
          numberBg: "bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-xl",
          titleColor: "text-white font-bold",
          amountColor: "text-yellow-100 font-extrabold text-shadow-lg",
          descColor: "text-white/90 font-medium",
          glowEffect: "before:absolute before:inset-0 before:bg-gradient-to-br before:from-yellow-400/20 before:to-transparent before:rounded-xl before:blur-xl"
        };
      case 2:
        return {
          cardBg: "bg-gradient-to-br from-gray-400/40 via-gray-300/30 to-slate-500/40", 
          border: "border-2 border-gray-400/70 shadow-2xl shadow-gray-400/20",
          numberBg: "bg-gradient-to-br from-gray-400 to-gray-600 shadow-xl",
          titleColor: "text-white font-bold",
          amountColor: "text-white font-extrabold text-shadow-lg",
          descColor: "text-white font-medium",
          glowEffect: "before:absolute before:inset-0 before:bg-gradient-to-br before:from-gray-400/20 before:to-transparent before:rounded-xl before:blur-xl"
        };
      case 3:
        return {
          cardBg: "bg-gradient-to-br from-orange-500/30 via-orange-400/20 to-red-500/30",
          border: "border-2 border-orange-400/70 shadow-2xl shadow-orange-400/20", 
          numberBg: "bg-gradient-to-br from-orange-400 to-orange-600 shadow-xl",
          titleColor: "text-white font-bold",
          amountColor: "text-orange-100 font-extrabold text-shadow-lg",
          descColor: "text-white/90 font-medium",
          glowEffect: "before:absolute before:inset-0 before:bg-gradient-to-br before:from-orange-400/20 before:to-transparent before:rounded-xl before:blur-xl"
        };
        default:
        return {
          cardBg: "bg-gradient-to-br from-purple-500/30 via-purple-400/20 to-blue-500/30",
          border: "border-2 border-purple-400/70 shadow-xl shadow-purple-400/20",
          numberBg: "bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg",
          titleColor: "text-white font-bold", 
          amountColor: "text-purple-100 font-extrabold text-shadow-lg",
          descColor: "text-white/90 font-medium",
          glowEffect: "before:absolute before:inset-0 before:bg-gradient-to-br before:from-purple-400/20 before:to-transparent before:rounded-xl before:blur-xl"
        };
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4 shadow-2xl animate-pulse">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent mb-2">
          Prize Distribution
        </h3>
        <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 mx-auto rounded-full shadow-lg" />
      </div>
      
      {/* Main Prize Cards */}
      <div className="grid md:grid-cols-3 gap-8">
        {prizes.positions.slice(0, 3).map((prize, index) => {
          const styles = getPositionStyles(prize.position);
          return (
            <div key={index} className="relative group">
              {/* Glow Effect */}
              <div className={`absolute -inset-1 ${styles.glowEffect} opacity-75 group-hover:opacity-100 transition-opacity duration-300`} />
              
              <Card className={`${styles.cardBg} ${styles.border} backdrop-blur-sm relative overflow-hidden transform hover:scale-[1.02] transition-all duration-300`}>
                {/* Dark overlay for better text contrast */}
                <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px] rounded-xl" />
                
                <CardContent className="p-8 text-center relative z-10">
                  {/* Floating decorative elements */}
                  <div className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full animate-pulse" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 bg-white/5 rounded-full animate-pulse delay-500" />
                  
                  {/* Position number with enhanced styling */}
                  <div className={`w-16 h-16 ${styles.numberBg} rounded-full flex items-center justify-center mx-auto mb-6 transform hover:rotate-12 transition-transform duration-300 shadow-xl`}>
                    <span className="text-white font-bold text-2xl drop-shadow-xl">{prize.position}</span>
                  </div>
                  
                  {/* Prize icon with hover effect */}
                  <div className="mb-6 transform hover:scale-110 transition-transform duration-300 filter drop-shadow-xl">
                    {getPositionIcon(prize.position)}
                  </div>
                  
                  {/* Prize title */}
                  <h4 className={`text-2xl font-bold text-white mb-4 drop-shadow-xl text-shadow-lg`}>
                    {prize.title}
                  </h4>
                  
                  {/* Prize amount with enhanced styling */}
                  <div className={`text-4xl font-extrabold text-white mb-4 drop-shadow-2xl text-shadow-lg`}>
                    {prize.amount}
                  </div>
                  
                  {/* Prize description */}
                  <p className={`text-white text-sm leading-relaxed font-semibold drop-shadow-lg`}>
                    {prize.description}
                  </p>
                  
                  {/* Achievement indicators for top 3 */}
                  {prize.position <= 3 && (
                    <div className="flex justify-center mt-4 space-x-1">
                      {[...Array(4 - prize.position)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current drop-shadow-lg" />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Additional prize positions */}
      {prizes.positions.length > 3 && (
        <div>
          <h4 className="text-2xl font-bold text-white mb-6 text-center">Other Prize Positions</h4>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prizes.positions.slice(3).map((prize, index) => {
              const styles = getPositionStyles(prize.position);
              return (
                <Card key={index + 3} className={`${styles.cardBg} ${styles.border} backdrop-blur-sm hover:scale-[1.02] transition-all duration-300`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${styles.numberBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-bold text-lg">{prize.position}</span>
                      </div>
                      <div className="flex-1">
                        <h5 className={`font-bold ${styles.titleColor} text-lg`}>{prize.title}</h5>
                        <p className={`${styles.amountColor} font-bold text-xl drop-shadow-md`}>{prize.amount}</p>
                        <p className={`${styles.descColor} text-sm`}>{prize.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Additional Rewards */}
      {prizes.additional_rewards && prizes.additional_rewards.length > 0 && (
        <div>
          <h4 className="text-2xl font-bold text-white mb-6 text-center">Additional Rewards</h4>
          <div className="grid md:grid-cols-2 gap-6">
            {prizes.additional_rewards.map((reward, index) => (
              <Card key={index} className="bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-indigo-500/20 border-2 border-purple-400/50 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300 shadow-xl">
                <CardContent className="p-6 relative overflow-hidden">
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-purple-400/10 rounded-full -translate-y-10 translate-x-10" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Star className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h5 className="text-xl font-bold text-white mb-2 drop-shadow-md">{reward.title}</h5>
                        <p className="text-white/90 leading-relaxed font-medium">{reward.description}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrizeDistribution;