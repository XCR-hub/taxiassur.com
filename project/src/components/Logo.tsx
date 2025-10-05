import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon' | 'text';
}

const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  variant = 'full' 
}) => {
  const sizeClasses = {
    sm: 'w-24 h-10',
    md: 'w-32 h-12', 
    lg: 'w-48 h-20'
  };

  if (variant === 'icon') {
    return (
      <div className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
        <svg width="80" height="24" viewBox="0 0 200 60" className="w-full h-full">
          <defs>
            <linearGradient id="taxiIconGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor:'#f59e0b'}} />
              <stop offset="50%" style={{stopColor:'#fbbf24'}} />
              <stop offset="100%" style={{stopColor:'#d97706'}} />
            </linearGradient>
          </defs>
          <rect x="10" y="15" width="180" height="30" rx="8" ry="8" 
                fill="url(#taxiIconGradient)" 
                stroke="#d97706" 
                strokeWidth="1.5"/>
          <text x="100" y="35" 
                fontFamily="Arial, sans-serif" 
                fontSize="12" 
                fontWeight="900" 
                textAnchor="middle" 
                fill="#000000"
                letterSpacing="0.5px">TAXIASSUR</text>
        </svg>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`${className} flex flex-col`}>
        <span className="text-2xl font-bold text-white drop-shadow-lg">
          TaxiAssur
        </span>
        <span className="text-xs text-gray-600 tracking-wider">
          EXCELLENCE COVERAGE RISKS
        </span>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <img 
        src="/logo.svg" 
        alt="TaxiAssur - Assurance Taxi Professionnelle" 
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default Logo;