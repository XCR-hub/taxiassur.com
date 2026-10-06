import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowDown } from 'lucide-react';
import { trackEvent } from '../hooks/useAnalytics';

export default function StickyCTA() {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  useEffect(() => {
    setFormVisible(false);
    const onScroll = () => setVisible(window.scrollY > 250);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const observer = new IntersectionObserver(entries => setFormVisible(entries.some(entry => entry.isIntersecting)), { threshold: 0.15 });
    const setup = () => { const form = document.querySelector('form[data-form="devis"], #devis-form, [data-form="devis"] form, #devis form'); if (form) observer.observe(form); };
    setup();
    const timer = setTimeout(setup, 1000);
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(timer); observer.disconnect(); };
  }, [location.pathname]);
  const openForm = () => {
    trackEvent('sticky_cta_click', { event_category: 'engagement', event_label: location.pathname });
    const form = document.querySelector<HTMLElement>('form[data-form="devis"], #devis-form, [data-form="devis"] form, #devis form');
    if (!form) { navigate('/devis-assurance-taxi#devis-form'); return; }
    form.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => form.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true }), 500);
  };
  if (!visible || formVisible) return null;
  return <div className="fixed bottom-0 inset-x-0 z-40 bg-gray-950/95 p-3 md:inset-x-auto md:bottom-6 md:right-6 md:rounded-2xl">
    <button onClick={openForm} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-4 font-bold text-gray-950 shadow-xl"><span>Demander mon devis gratuit</span><ArrowDown size={18} /></button>
  </div>;
}
