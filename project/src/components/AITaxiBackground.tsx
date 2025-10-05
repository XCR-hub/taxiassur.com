import React from 'react';

interface AITaxiBackgroundProps {
  intensity?: 'low' | 'medium' | 'high';
  section?: 'hero' | 'content' | 'footer';
  className?: string;
}

const AITaxiBackground: React.FC<AITaxiBackgroundProps> = ({ 
  intensity = 'medium',
  section = 'content',
  className = ''
}) => {
  const getOpacity = () => {
    switch (intensity) {
      case 'low': return 'opacity-40';
      case 'high': return 'opacity-70';
      default: return 'opacity-60';
    }
  };

  const getTaxiCount = () => {
    switch (intensity) {
      case 'low': return 5;
      case 'high': return 12;
      default: return 8;
    }
  };

  return (
    <div className={`absolute inset-0 pointer-events-none z-0 ${getOpacity()} ${className}`}>
      {/* Animated taxi background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-yellow-500/5"></div>
      
      {/* Animated taxis */}
      {[...Array(getTaxiCount())].map((_, i) => (
        <div
          key={i}
          className="absolute w-8 h-4 opacity-60"
          style={{
            animation: `taxiMove${(i % 8) + 1} ${12 + i * 2}s linear infinite`,
            animationDelay: `${i * 2}s`
          }}
        >
          <div className="w-full h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-sm flex items-center justify-center shadow-lg">
            <span className="text-black text-xs font-bold drop-shadow-md">🚖</span>
          </div>
        </div>
      ))}
      
      {/* Animated lines */}
      <div className="absolute inset-0">
        {[...Array(3)].map((_, i) => (
          <div
            key={`line-${i}`}
            className="absolute h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"
            style={{
              top: `${20 + i * 30}%`,
              width: '100%',
              animation: `taxiLineFlow ${6 + i}s ease-in-out infinite`,
              animationDelay: `${i * 1.5}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AITaxiBackground;