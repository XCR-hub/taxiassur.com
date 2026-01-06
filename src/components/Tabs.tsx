import { ReactNode, useState, createContext, useContext } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
  orientation: 'horizontal' | 'vertical';
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within Tabs');
  }
  return context;
};

interface TabsProps {
  children: ReactNode;
  defaultValue: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  onChange?: (value: string) => void;
}

export function Tabs({
  children,
  defaultValue,
  orientation = 'horizontal',
  className = '',
  onChange
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    onChange?.(value);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange, orientation }}>
      <div className={`${orientation === 'vertical' ? 'flex gap-6' : ''} ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ children, className = '' }: TabsListProps) {
  const { orientation } = useTabsContext();

  return (
    <div
      className={`
        ${orientation === 'horizontal'
          ? 'flex gap-1 border-b border-gray-800 mb-6'
          : 'flex flex-col gap-1 border-r border-gray-800 pr-6'
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  children: ReactNode;
  value: string;
  className?: string;
  icon?: ReactNode;
  badge?: number | string;
  disabled?: boolean;
}

export function TabsTrigger({
  children,
  value,
  className = '',
  icon,
  badge,
  disabled = false
}: TabsTriggerProps) {
  const { activeTab, setActiveTab, orientation } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => !disabled && setActiveTab(value)}
      disabled={disabled}
      className={`
        relative px-4 py-3 font-medium transition-all
        ${orientation === 'horizontal' ? 'border-b-2' : 'border-r-2 text-left'}
        ${isActive
          ? orientation === 'horizontal'
            ? 'border-blue-500 text-blue-500'
            : 'border-blue-500 text-blue-500 bg-blue-500/5'
          : 'border-transparent text-gray-400 hover:text-gray-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <div className="flex items-center gap-2">
        {icon && <span className={isActive ? 'text-blue-500' : 'text-gray-500'}>{icon}</span>}
        <span>{children}</span>
        {badge !== undefined && (
          <span className={`
            px-2 py-0.5 rounded-full text-xs font-semibold
            ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}
          `}>
            {badge}
          </span>
        )}
      </div>
    </button>
  );
}

interface TabsContentProps {
  children: ReactNode;
  value: string;
  className?: string;
}

export function TabsContent({ children, value, className = '' }: TabsContentProps) {
  const { activeTab } = useTabsContext();

  if (activeTab !== value) return null;

  return (
    <div className={`animate-in fade-in duration-200 ${className}`}>
      {children}
    </div>
  );
}
