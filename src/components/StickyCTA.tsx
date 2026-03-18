import React, { useState, useEffect } from 'react';
import { Phone, ArrowDown } from 'lucide-react';

const StickyCTA: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    const formObserver = new IntersectionObserver(
      ([entry]) => {
        setIsFormVisible(entry.isIntersecting);
      },
      { threshold: 0.3 }
    );

    // Defer DOM query to avoid blocking initial paint
    const setupObserver = () => {
      const formElement = document.querySelector('#devis');
      if (formElement) formObserver.observe(formElement);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const tid = setTimeout(setupObserver, 1000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(tid);
      formObserver.disconnect();
    };
  }, []);

  const scrollToForm = () => {
    // Try multiple selectors to find the form - more comprehensive
    const formSelectors = [
      '#devis', 
      'section[id="devis"]', 
      '[data-form="devis"]', 
      '.lead-form', 
      'form[data-form="devis"]',
      '.ai-card',
      'form',
      '.enhanced-form-lead'
    ];
    let formElement = null;
    
    for (const selector of formSelectors) {
      formElement = document.querySelector(selector);
      if (formElement) break;
    }
    
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Focus on first form field after scroll
      setTimeout(() => {
        const firstInput = formElement.querySelector('input[name="name"], input[type="text"], input[id="name"]') as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
        }
      }, 800);
    } else {
      // Fallback: scroll to bottom of page where form usually is
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }

    // Track CTA click
    if (typeof gtag !== 'undefined') {
      gtag('event', 'sticky_cta_click', {
        event_category: 'engagement',
        event_label: 'sticky_button'
      });
    }
  };

  // Don't show if form is already visible or if not scrolled enough
  if (!isVisible || isFormVisible) return null;

  return (
    <>
      {/* Desktop Sticky CTA */}
      <div className="hidden md:block fixed bottom-8 right-8 z-40">
        <button
          onClick={scrollToForm}
          className="group bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-4 px-6 rounded-2xl shadow-2xl hover:shadow-amber-500/40 transition-all duration-300 transform hover:scale-105 border-2 border-amber-600/30"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center">
              <ArrowDown className="group-hover:animate-bounce" size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">Devis Assurance Taxi</div>
              <div className="text-xs opacity-80">Gratuit • 2 min • -35%</div>
            </div>
          </div>
        </button>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-black/90 to-transparent backdrop-blur-sm">
        <button
          onClick={scrollToForm}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-4 px-6 rounded-xl shadow-xl transition-all duration-300 flex items-center justify-center space-x-2"
        >
          <Phone size={20} />
          <span>Devis assurance taxi gratuit</span>
          <ArrowDown className="animate-bounce" size={16} />
        </button>
      </div>
    </>
  );
};

export default StickyCTA;