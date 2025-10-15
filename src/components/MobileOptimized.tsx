/**
 * Composant Wrapper Mobile-Optimized
 *
 * Améliore automatiquement la lisibilité et l'UX mobile
 * pour toutes les pages du site
 */

import { ReactNode } from 'react';

interface MobileOptimizedProps {
  children: ReactNode;
  className?: string;
}

export default function MobileOptimized({ children, className = '' }: MobileOptimizedProps) {
  return (
    <div className={`
      mobile-optimized

      /* Espacement mobile amélioré */
      px-4 sm:px-6 lg:px-8

      /* Typographie mobile optimisée */
      [&_h1]:text-3xl [&_h1]:sm:text-4xl [&_h1]:md:text-5xl
      [&_h2]:text-2xl [&_h2]:sm:text-3xl [&_h2]:md:text-4xl
      [&_h3]:text-xl [&_h3]:sm:text-2xl [&_h3]:md:text-3xl
      [&_h4]:text-lg [&_h4]:sm:text-xl [&_h4]:md:text-2xl
      [&_p]:text-base [&_p]:sm:text-lg [&_p]:leading-relaxed

      /* Liens tactiles optimisés */
      [&_a]:inline-flex [&_a]:items-center [&_a]:min-h-[44px] [&_a]:min-w-[44px]
      [&_a]:justify-center [&_a]:px-3 [&_a]:py-2

      /* Boutons tactiles optimisés */
      [&_button]:min-h-[48px] [&_button]:min-w-[48px]
      [&_button]:px-6 [&_button]:py-3
      [&_button]:text-base [&_button]:sm:text-lg

      /* Images responsives */
      [&_img]:w-full [&_img]:h-auto [&_img]:max-w-full

      /* Espacement des sections */
      [&_section]:py-12 [&_section]:sm:py-16 [&_section]:md:py-20

      /* Grilles responsives */
      [&_.grid]:grid-cols-1 [&_.grid]:sm:grid-cols-2 [&_.grid]:lg:grid-cols-3
      [&_.grid]:gap-6 [&_.grid]:sm:gap-8

      /* Cards touch-friendly */
      [&_.card]:p-6 [&_.card]:sm:p-8
      [&_.card]:rounded-xl [&_.card]:shadow-md
      [&_.card]:hover:shadow-lg [&_.card]:transition-shadow

      /* Formulaires mobiles */
      [&_input]:min-h-[48px] [&_input]:text-base
      [&_textarea]:min-h-[120px] [&_textarea]:text-base
      [&_select]:min-h-[48px] [&_select]:text-base

      /* Lecture confortable */
      [&_.prose]:max-w-none [&_.prose]:text-base [&_.prose]:sm:text-lg
      [&_.prose]:leading-relaxed

      ${className}
    `}>
      {children}
    </div>
  );
}

/**
 * Composant Section Mobile-Optimized
 */
interface SectionProps {
  children: ReactNode;
  className?: string;
  bgColor?: 'white' | 'gray' | 'blue' | 'gradient';
}

export function MobileSection({ children, className = '', bgColor = 'white' }: SectionProps) {
  const bgClasses = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    blue: 'bg-yellow-50',
    gradient: 'bg-gradient-to-br from-blue-50 to-white'
  };

  return (
    <section className={`
      py-12 sm:py-16 md:py-20
      ${bgClasses[bgColor]}
      ${className}
    `}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  );
}

/**
 * Composant Grid Mobile-Optimized
 */
interface GridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MobileGrid({ children, cols = 3, gap = 'md', className = '' }: GridProps) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  const gapClasses = {
    sm: 'gap-4 sm:gap-6',
    md: 'gap-6 sm:gap-8',
    lg: 'gap-8 sm:gap-10'
  };

  return (
    <div className={`
      grid
      ${colClasses[cols]}
      ${gapClasses[gap]}
      ${className}
    `}>
      {children}
    </div>
  );
}

/**
 * Composant Card Mobile-Optimized
 */
interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function MobileCard({ children, className = '', hover = true }: CardProps) {
  return (
    <div className={`
      bg-white
      p-6 sm:p-8
      rounded-xl
      shadow-md
      ${hover ? 'hover:shadow-lg hover:scale-[1.02] transition-all duration-300' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}

/**
 * Composant Button Mobile-Optimized
 */
interface ButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MobileButton({
  children,
  href,
  onClick,
  variant = 'primary',
  size = 'md',
  className = ''
}: ButtonProps) {
  const variantClasses = {
    primary: 'bg-yellow-500 text-white hover:bg-yellow-600',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50'
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm min-h-[40px]',
    md: 'px-6 py-3 text-base min-h-[48px]',
    lg: 'px-8 py-4 text-lg min-h-[56px]'
  };

  const baseClasses = `
    inline-flex items-center justify-center
    font-semibold rounded-lg
    transition-all duration-300
    min-w-[120px]
    touch-manipulation
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
  `;

  if (href) {
    return (
      <a href={href} className={baseClasses}>
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={baseClasses}>
      {children}
    </button>
  );
}

/**
 * Composant Heading Mobile-Optimized
 */
interface HeadingProps {
  children: ReactNode;
  level: 1 | 2 | 3 | 4;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function MobileHeading({ children, level, className = '', align = 'left' }: HeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  const sizeClasses = {
    1: 'text-3xl sm:text-4xl md:text-5xl font-bold',
    2: 'text-2xl sm:text-3xl md:text-4xl font-bold',
    3: 'text-xl sm:text-2xl md:text-3xl font-semibold',
    4: 'text-lg sm:text-xl md:text-2xl font-semibold'
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  return (
    <Tag className={`
      ${sizeClasses[level]}
      ${alignClasses[align]}
      leading-tight
      mb-4 sm:mb-6
      ${className}
    `}>
      {children}
    </Tag>
  );
}

/**
 * Composant Text Mobile-Optimized
 */
interface TextProps {
  children: ReactNode;
  size?: 'sm' | 'base' | 'lg' | 'xl';
  className?: string;
}

export function MobileText({ children, size = 'base', className = '' }: TextProps) {
  const sizeClasses = {
    sm: 'text-sm sm:text-base',
    base: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
    xl: 'text-xl sm:text-2xl'
  };

  return (
    <p className={`
      ${sizeClasses[size]}
      leading-relaxed
      text-gray-700
      ${className}
    `}>
      {children}
    </p>
  );
}
