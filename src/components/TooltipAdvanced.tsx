import { useState, useRef, useEffect, ReactNode, type HTMLAttributes } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
type TooltipTrigger = 'hover' | 'click' | 'focus';

interface TooltipAdvancedProps {
  children: ReactNode;
  content: ReactNode;
  position?: TooltipPosition;
  trigger?: TooltipTrigger;
  delay?: number;
  className?: string;
  maxWidth?: string;
  disabled?: boolean;
}

export function TooltipAdvanced({
  children,
  content,
  position = 'top',
  trigger = 'hover',
  delay = 200,
  className = '',
  maxWidth = '300px',
  disabled = false
}: TooltipAdvancedProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 8;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + gap;
        break;
    }

    const padding = 10;
    if (left < padding) left = padding;
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipRect.height > window.innerHeight - padding) {
      top = window.innerHeight - tooltipRect.height - padding;
    }

    setTooltipPosition({ top, left });
  };

  const showTooltip = () => {
    if (disabled) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const toggleTooltip = () => {
    if (disabled) return;
    setIsVisible(!isVisible);
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      window.addEventListener('scroll', calculatePosition);
      window.addEventListener('resize', calculatePosition);

      return () => {
        window.removeEventListener('scroll', calculatePosition);
        window.removeEventListener('resize', calculatePosition);
      };
    }
  }, [isVisible, position]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getTriggerProps = () => {
    const props: Pick<HTMLAttributes<HTMLElement>, 'onMouseEnter' | 'onMouseLeave' | 'onClick' | 'onFocus' | 'onBlur'> = {};

    if (trigger === 'hover') {
      props.onMouseEnter = showTooltip;
      props.onMouseLeave = hideTooltip;
    } else if (trigger === 'click') {
      props.onClick = toggleTooltip;
    } else if (trigger === 'focus') {
      props.onFocus = showTooltip;
      props.onBlur = hideTooltip;
    }

    return props;
  };

  const getArrowStyle = (): string => {
    switch (position) {
      case 'top':
        return 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-gray-800 border-l-transparent border-r-transparent border-b-transparent';
      case 'bottom':
        return 'top-[-4px] left-1/2 -translate-x-1/2 border-b-gray-800 border-l-transparent border-r-transparent border-t-transparent';
      case 'left':
        return 'right-[-4px] top-1/2 -translate-y-1/2 border-l-gray-800 border-t-transparent border-b-transparent border-r-transparent';
      case 'right':
        return 'left-[-4px] top-1/2 -translate-y-1/2 border-r-gray-800 border-t-transparent border-b-transparent border-l-transparent';
      default:
        return '';
    }
  };

  return (
    <>
      <div ref={triggerRef} className="inline-block" {...getTriggerProps()}>
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`
            fixed z-[9999] bg-gray-800 text-white text-sm px-3 py-2 rounded-lg shadow-2xl
            border border-gray-700 pointer-events-none
            animate-in fade-in duration-200
            ${className}
          `}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            maxWidth
          }}
        >
          {content}
          <div
            className={`absolute w-0 h-0 border-[4px] ${getArrowStyle()}`}
          />
        </div>
      )}
    </>
  );
}
