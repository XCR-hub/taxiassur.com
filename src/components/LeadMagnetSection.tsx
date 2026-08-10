import React, { useState } from 'react';
import { BookOpen, ClipboardList, Download, CheckCircle, AlertCircle, ChevronRight, Lock, Star, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

type GuideType = 'guide-complet' | 'checklist-documents';

interface FormState {
  email: string;
  firstName: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  errorMessage: string;
}

const INITIAL_FORM: FormState = {
  email: '',
  firstName: '',
  status: 'idle',
  errorMessage: '',
};

const DOWNLOADS: Record<GuideType, string> = {
  'guide-complet': '/guides/guide-assurance-taxi-2026.html',
  'checklist-documents': '/guides/checklist-documents-taxi.html',
};


async function sendConfirmationEmail(to: string, firstName: string, guideType: GuideType): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const response = await fetch(`${supabaseUrl}/functions/v1/send-lead-magnet-confirmation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseKey}`,
      Apikey: supabaseKey,
    },
    body: JSON.stringify({ email: to, first_name: firstName, guide_type: guideType }),
  });
  if (!response.ok) throw new Error(`GuideEmailError:${response.status}`);
}

interface MagnetCardProps {
  guideType: GuideType;
  icon: React.ReactNode;
  badge: string;
  title: string;
  description: string;
  items: string[];
  ctaLabel: string;
  accentColor: string;
  sourcePage?: string;
  onSuccess?: () => void;
}

const MagnetCard: React.FC<MagnetCardProps> = ({
  guideType,
  icon,
  badge,
  title,
  description,
  items,
  ctaLabel,
  accentColor,
  sourcePage = '',
  onSuccess,
}) => {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const email = form.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setForm(prev => ({ ...prev, status: 'error', errorMessage: 'Adresse email invalide.' }));
      return;
    }

    setForm(prev => ({ ...prev, status: 'loading' }));

    try {
      const { error } = await supabase
        .from('lead_magnet_downloads')
        .insert({
          email,
          first_name: form.firstName.trim(),
          guide_type: guideType,
          source_page: sourcePage || window.location.pathname,
        });

      if (error) throw error;

      await sendConfirmationEmail(email, form.firstName.trim(), guideType);

      setForm(prev => ({ ...prev, status: 'success' }));
      onSuccess?.();
    } catch {
      setForm(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Une erreur est survenue. Veuillez reessayer.',
      }));
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
      <div className={`h-1 w-full ${accentColor}`} />

      <div className="p-8 flex flex-col flex-1">
        <div className="flex items-start gap-4 mb-5">
          <div className={`p-3 rounded-xl ${accentColor} bg-opacity-20 flex-shrink-0`}>
            {icon}
          </div>
          <div>
            <span className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-2 bg-amber-500/10 text-amber-400">
              {badge}
            </span>
            <h3 className="text-xl font-bold text-white leading-snug">{title}</h3>
          </div>
        </div>

        <p className="text-gray-400 text-sm mb-5 leading-relaxed">{description}</p>

        <ul className="space-y-2 mb-6">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
              <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Lock className="w-3.5 h-3.5" />
          <span>Acces immediat · 100% gratuit · Envoye par email</span>
        </div>

        {form.status === 'success' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4 gap-4">
            <div className="p-3 bg-green-500/20 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Votre guide est pret !</p>
              <p className="text-gray-400 text-sm">Un email vous a ete envoye. Telechargez aussi directement ici :</p>
            </div>
            <a
              href={DOWNLOADS[guideType]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30"
            >
              <Download className="w-4 h-4" />
              Telecharger maintenant
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 mt-auto">
            <input
              type="text"
              placeholder="Votre prenom (optionnel)"
              value={form.firstName}
              onChange={e => setForm(prev => ({ ...prev, firstName: e.target.value }))}
              className="w-full bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
            <input
              type="email"
              required
              placeholder="Votre email professionnel"
              value={form.email}
              onChange={e => setForm(prev => ({ ...prev, email: e.target.value, status: 'idle', errorMessage: '' }))}
              className="w-full bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
            {form.status === 'error' && (
              <div className="flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {form.errorMessage}
              </div>
            )}
            <button
              type="submit"
              disabled={form.status === 'loading'}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-950 font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30"
            >
              {form.status === 'loading' ? (
                <span className="inline-block w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {ctaLabel}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

interface LeadMagnetSectionProps {
  sourcePage?: string;
  variant?: 'full' | 'compact';
}

const LeadMagnetSection: React.FC<LeadMagnetSectionProps> = ({
  sourcePage,
  variant = 'full',
}) => {
  return (
    <section className="py-16 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12">
          {variant === 'full' && (
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full mb-5">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              Ressources gratuites pour chauffeurs de taxi
            </div>
          )}
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Guides Gratuits pour<br />
            <span className="text-amber-400">Mieux vous Assurer</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Nos experts ont redige deux guides pratiques pour vous aider a faire les meilleurs choix d'assurance taxi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MagnetCard
            guideType="guide-complet"
            icon={<BookOpen className="w-6 h-6 text-amber-400" />}
            badge="Guide PDF · 20 pages"
            title="Guide Complet Assurance Taxi 2026"
            description="Tout ce qu'un chauffeur de taxi doit savoir pour choisir la meilleure assurance, negocier son contrat et economiser jusqu'a 35%."
            items={[
              'Les garanties obligatoires vs optionnelles',
              'Comment comparer les offres efficacement',
              'Les 7 erreurs a eviter absolument',
              'Tableau comparatif des assureurs taxi',
              "Simulateur d'economie annuelle",
            ]}
            ctaLabel="Recevoir le guide par email"
            accentColor="bg-amber-500"
            sourcePage={sourcePage}
          />

          <MagnetCard
            guideType="checklist-documents"
            icon={<ClipboardList className="w-6 h-6 text-blue-400" />}
            badge="Checklist PDF · 1 page"
            title="Checklist Documents Obligatoires"
            description="La liste complete de tous les documents a fournir pour assurer votre taxi. A imprimer et cocher au fur et a mesure."
            items={[
              'Carte grise et carte taxi (T3P)',
              "Permis de conduire et releve d'information",
              'Justificatif SIRET / Kbis',
              'Attestation assurance precedente',
              'Bilan kilometrage et sinistralite',
            ]}
            ctaLabel="Recevoir la checklist par email"
            accentColor="bg-blue-500"
            sourcePage={sourcePage}
          />
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          En telechargant, vous acceptez de recevoir des conseils personnalises de TaxiAssur. Desinscription en un clic.
        </p>
      </div>
    </section>
  );
};

export default LeadMagnetSection;
