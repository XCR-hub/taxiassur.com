import { ReactNode, useState, createContext, useContext } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionContextValue {
  openItems: string[];
  toggleItem: (value: string) => void;
  type: 'single' | 'multiple';
}

const AccordionContext = createContext<AccordionContextValue | undefined>(undefined);

const useAccordionContext = () => {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within Accordion');
  }
  return context;
};

interface AccordionProps {
  children: ReactNode;
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  className?: string;
  onChange?: (value: string | string[]) => void;
}

export function Accordion({
  children,
  type = 'single',
  defaultValue,
  className = '',
  onChange
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>(() => {
    if (!defaultValue) return [];
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  });

  const toggleItem = (value: string) => {
    setOpenItems(prev => {
      let newOpenItems: string[];

      if (type === 'single') {
        newOpenItems = prev.includes(value) ? [] : [value];
      } else {
        newOpenItems = prev.includes(value)
          ? prev.filter(item => item !== value)
          : [...prev, value];
      }

      onChange?.(type === 'single' ? newOpenItems[0] || '' : newOpenItems);
      return newOpenItems;
    });
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={`space-y-2 ${className}`}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  children: ReactNode;
  value: string;
  className?: string;
}

export function AccordionItem({ children, value, className = '' }: AccordionItemProps) {
  const { openItems } = useAccordionContext();
  const isOpen = openItems.includes(value);

  return (
    <div
      className={`
        bg-gray-900 rounded-lg border border-gray-800
        ${isOpen ? 'border-blue-500/30' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface AccordionTriggerProps {
  children: ReactNode;
  value: string;
  className?: string;
  icon?: ReactNode;
}

export function AccordionTrigger({
  children,
  value,
  className = '',
  icon
}: AccordionTriggerProps) {
  const { openItems, toggleItem } = useAccordionContext();
  const isOpen = openItems.includes(value);

  return (
    <button
      onClick={() => toggleItem(value)}
      className={`
        w-full px-6 py-4 flex items-center justify-between
        text-left font-semibold transition-colors
        ${isOpen ? 'text-blue-500' : 'text-white hover:text-blue-400'}
        ${className}
      `}
    >
      <div className="flex items-center gap-3">
        {icon && <span className={isOpen ? 'text-blue-500' : 'text-gray-500'}>{icon}</span>}
        <span>{children}</span>
      </div>
      <ChevronDown
        className={`
          w-5 h-5 transition-transform duration-200
          ${isOpen ? 'rotate-180 text-blue-500' : 'text-gray-500'}
        `}
      />
    </button>
  );
}

interface AccordionContentProps {
  children: ReactNode;
  value: string;
  className?: string;
}

export function AccordionContent({ children, value, className = '' }: AccordionContentProps) {
  const { openItems } = useAccordionContext();
  const isOpen = openItems.includes(value);

  if (!isOpen) return null;

  return (
    <div
      className={`
        px-6 pb-4 text-gray-400
        animate-in slide-in-from-top-2 fade-in duration-200
        ${className}
      `}
    >
      {children}
    </div>
  );
}
