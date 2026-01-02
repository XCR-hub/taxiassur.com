import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalOptions {
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
}

interface ModalContextType {
  showModal: (content: React.ReactNode, options?: ModalOptions) => void;
  hideModal: () => void;
  isOpen: boolean;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
};

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<React.ReactNode>(null);
  const [options, setOptions] = useState<ModalOptions>({
    size: 'md',
    closeOnBackdrop: true,
    showCloseButton: true,
  });

  const showModal = useCallback((modalContent: React.ReactNode, modalOptions?: ModalOptions) => {
    setContent(modalContent);
    setOptions({ ...options, ...modalOptions });
    setIsOpen(true);
  }, [options]);

  const hideModal = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setContent(null), 300);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        hideModal();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, hideModal]);

  const getSizeClass = () => {
    switch (options.size) {
      case 'sm': return 'max-w-md';
      case 'md': return 'max-w-2xl';
      case 'lg': return 'max-w-4xl';
      case 'xl': return 'max-w-6xl';
      case 'full': return 'max-w-[95vw]';
      default: return 'max-w-2xl';
    }
  };

  if (!isOpen) return <ModalContext.Provider value={{ showModal, hideModal, isOpen }}>{children}</ModalContext.Provider>;

  return (
    <ModalContext.Provider value={{ showModal, hideModal, isOpen }}>
      {children}
      <div className="fixed inset-0 z-[9998] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => options.closeOnBackdrop && hideModal()}
          aria-hidden="true"
        />
        <div
          className={`relative bg-white rounded-xl shadow-2xl ${getSizeClass()} w-full mx-4 max-h-[90vh] overflow-hidden animate-scale-in`}
          role="dialog"
          aria-modal="true"
        >
          {(options.title || options.showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b">
              {options.title && <h2 className="text-xl font-bold text-gray-900">{options.title}</h2>}
              {options.showCloseButton && (
                <button
                  onClick={hideModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {content}
          </div>
        </div>
      </div>
    </ModalContext.Provider>
  );
};
