import React from 'react';
import { cn } from '../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  hover = false,
  padding = 'md'
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div className={cn(
      'bg-white border border-gray-200 rounded-xl shadow-lg',
      hover && 'hover:shadow-xl hover:border-gray-300 transition-all duration-300 transform hover:scale-[1.02]',
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
};

export default Card;