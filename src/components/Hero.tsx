import { Link } from 'react-router-dom';
import { Shield, CheckCircle, Phone } from 'lucide-react';
import LeadForm from './LeadForm';
import { ACQUISITION_PAGES } from '../../shared/acquisition-pages.js';

export default function Hero() {
  const page = ACQUISITION_PAGES['/'];
  return (
    <section className="bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white py-8 sm:py-12">
      <div className="container-max grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
        <div className="space-y-5">
          <p className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 px-3 py-2 text-xs font-bold text-amber-300"><Shield size={16} /> COURTIER SPÉCIALISÉ TAXI · ORIAS</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">{page.h1}</h1>
          <p className="text-gray-200 leading-relaxed">{page.intro}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-200">
            {['Gratuit et sans engagement', 'Sans documents pour démarrer', 'Conseiller spécialisé'].map(text => <li key={text} className="flex items-center gap-2"><CheckCircle size={16} className="text-green-400" />{text}</li>)}
          </ul>
          <div className="flex flex-wrap gap-3">
            <a href="#devis-form" className="rounded-xl bg-amber-400 text-gray-950 px-5 py-3 font-bold">Demander mon devis gratuit</a>
            <a href="tel:0180855786" className="inline-flex items-center gap-2 rounded-xl border border-gray-500 px-4 py-3 font-semibold"><Phone size={18} />01 80 85 57 86</a>
          </div>
          <nav className="hidden lg:flex flex-wrap gap-4 text-sm text-amber-300" aria-label="Comparer votre assurance taxi">
            <Link to="/assurance-taxi" className="underline">Garanties taxi</Link><Link to="/prix-assurance-taxi" className="underline">Prix assurance taxi</Link><Link to="/rc-professionnelle" className="underline">RC professionnelle</Link>
          </nav>
        </div>
        <LeadForm compact />
      </div>
    </section>
  );
}
