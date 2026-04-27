import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import StickyCTA from '../components/StickyCTA';
import Seo from '../components/Seo';
import JsonLd from '../components/JsonLd';
import AITaxiBackground from '../components/AITaxiBackground';
import { supabase } from '../lib/supabase';
import { Shield, CheckCircle, TrendingUp, Briefcase, Users, Car, Clock, Ligature as FileSignature, CreditCard, Award, Zap, AlertCircle } from 'lucide-react';

interface ProductFeature {
  key: string;
  title: string;
  value: string;
  description: string;
  formula_availability: string;
}

interface Formula {
  name: string;
  level: string;
  rc_pro: string;
  driver_protection: string;
  key_features: string[];
}

interface BrokerAdvantage {
  title: string;
  description: string;
}

interface SollyAzarData {
  description: string | null;
  target_profile: string[];
  product_features: ProductFeature[];
  formulas: Formula[];
  broker_advantages: BrokerAdvantage[];
}

const AssuranceTaxiSollyAzar: React.FC = () => {
  const [data, setData] = useState<SollyAzarData | null>(null);

  useEffect(() => {
    supabase
      .from('insurance_companies')
      .select('description, target_profile, product_features, formulas, broker_advantages')
      .eq('code', 'SOLLY_AZAR')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setData(data as SollyAzarData);
      });
  }, []);

  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Assurance Taxi Solly Azar', url: '/assurance-taxi-solly-azar' },
  ];

  const featureIcons: Record<string, React.ElementType> = {
    valeur_majoree: TrendingUp,
    rc_pro: Briefcase,
    effets_personnels: Shield,
    bagages_marchandises: Shield,
    protection_conducteur: Users,
    assistance_sans_franchise: Car,
    immobilisation: Clock,
  };

  const features = data?.product_features || [];
  const formulas = data?.formulas || [];
  const brokerAdvantages = data?.broker_advantages || [];
  const targetProfile = data?.target_profile || [];

  const faqItems = [
    {
      question: 'Qui peut souscrire au contrat taxi Solly Azar ?',
      answer:
        "Les artisans taxis et conducteurs de VSL indépendants ou gérants de société, âgés d'au moins 25 ans, titulaires d'un permis de plus de 5 ans, avec un coefficient bonus-malus (CRM) entre 0,50 et 1,50 et au moins 12 mois d'assurance au cours des 36 derniers mois.",
    },
    {
      question: 'Que couvre la valeur majorée Solly Azar ?',
      answer:
        "Pour tout véhicule de moins de 36 mois, en cas de sinistre, la valeur déterminée par l'expert est automatiquement majorée de 25%. Cette option permet de mieux compenser la dépréciation rapide d'un véhicule professionnel.",
    },
    {
      question: 'La RC professionnelle est-elle incluse ?',
      answer:
        "La Responsabilité Civile professionnelle est disponible en option dans la formule 1 et systématiquement incluse à partir de la formule 2.",
    },
    {
      question: 'Quel est le plafond de la garantie protection du conducteur ?',
      answer:
        "Comprise dans les 3 formules, la protection du conducteur indemnise jusqu'à 250 000€. Une extension en option permet de monter jusqu'à 500 000€.",
    },
    {
      question: 'Comment fonctionne l\'assistance sans franchise kilométrique ?',
      answer:
        "L'assistance Solly Azar est disponible dès le premier kilomètre, sans franchise. En cas d'immobilisation, un véhicule de remplacement à usage privé est mis à votre disposition.",
    },
    {
      question: 'Que se passe-t-il en cas d\'immobilisation du véhicule ?',
      answer:
        "Vous bénéficiez d'une indemnisation jusqu'à 150€ par jour ou d'un véhicule relais à usage professionnel pour continuer votre activité.",
    },
  ];

  return (
    <>
      <Seo
        title="Assurance Taxi Solly Azar — Garanties, formules et tarifs 2026"
        description="Contrat taxi Solly Azar : valeur majorée 25%, RC pro incluse, protection conducteur jusqu'à 500 000€, assistance 0 km. Devis gratuit en 2 minutes."
        keywords="assurance taxi solly azar, contrat taxi solly azar, formules solly azar, valeur majoree taxi, rc pro taxi, protection conducteur taxi"
        canonical="/assurance-taxi-solly-azar"
      />
      <JsonLd type="breadcrumb" data={breadcrumbs} />
      <JsonLd
        type="faq"
        data={faqItems.map((f) => ({ question: f.question, answer: f.answer }))}
      />
      <JsonLd
        type="product"
        data={{
          name: 'Assurance Taxi Solly Azar',
          description:
            data?.description ||
            "Contrat d'assurance taxi Solly Azar avec valeur majorée, RC pro et protection conducteur étendue.",
          brand: 'Solly Azar',
          category: 'Assurance professionnelle taxi',
        }}
      />

      <div className="min-h-screen bg-white">
        <Header />
        <AITaxiBackground />

        <main className="relative z-10">
          <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white py-20">
            <div className="container-max">
              <nav className="mb-6">
                <ol className="flex items-center gap-2 text-sm text-slate-300">
                  <li>
                    <a href="/" className="hover:text-amber-400">
                      Accueil
                    </a>
                  </li>
                  <li>/</li>
                  <li className="text-white font-medium">Assurance Taxi Solly Azar</li>
                </ol>
              </nav>

              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                    <Award className="w-4 h-4" />
                    Partenaire officiel TaxiAssur
                  </div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                    Assurance Taxi <span className="text-amber-400">Solly Azar</span>
                  </h1>
                  <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                    Un contrat taxi conçu pour les professionnels exigeants : valeur majorée 25%,
                    RC pro incluse, protection conducteur jusqu'à 500 000€ et assistance sans
                    franchise kilométrique.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <a
                      href="#devis"
                      className="bg-amber-500 hover:bg-amber-600 text-black font-bold py-4 px-8 rounded-lg transition-all shadow-xl hover:shadow-2xl"
                    >
                      Obtenir mon devis
                    </a>
                    <a
                      href="#garanties"
                      className="border-2 border-white/30 hover:border-amber-400 hover:text-amber-400 text-white font-semibold py-4 px-8 rounded-lg transition-all"
                    >
                      Voir les garanties
                    </a>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
                  <h2 className="text-lg font-semibold text-amber-400 mb-4">
                    Profil éligible
                  </h2>
                  <ul className="space-y-3">
                    {(targetProfile.length > 0
                      ? targetProfile
                      : [
                          'Artisans Taxis ou conducteurs VSL',
                          'Gérants de société Taxi/VSL',
                          "Conducteurs d'au moins 25 ans",
                          'Permis de plus de 5 ans',
                          'CRM entre 0,50 et 1,50',
                          '12 mois d\'assurance dans les 36 derniers mois',
                        ]
                    ).map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-200">
                        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section id="garanties" className="py-20 bg-slate-50">
            <div className="container-max">
              <div className="max-w-3xl mx-auto text-center mb-14">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                  Les 7 garanties phares du contrat Solly Azar
                </h2>
                <p className="text-lg text-slate-600">
                  Une protection professionnelle complète avec des plafonds parmi les plus élevés
                  du marché taxi.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(features.length > 0
                  ? features
                  : ([
                      {
                        key: 'valeur_majoree',
                        title: 'Indemnisation valeur majorée',
                        value: '+25%',
                        description:
                          'Sur véhicule de moins de 36 mois, la valeur experte est majorée de 25%.',
                        formula_availability: 'option',
                      },
                      {
                        key: 'rc_pro',
                        title: 'RC professionnelle',
                        value: 'Incluse dès F2',
                        description: "En option F1, incluse à partir de la formule 2.",
                        formula_availability: 'included_from_f2',
                      },
                      {
                        key: 'effets_personnels',
                        title: 'Effets personnels',
                        value: '1 500€',
                        description:
                          'Couverture des effets et objets personnels du conducteur.',
                        formula_availability: 'included',
                      },
                      {
                        key: 'bagages_marchandises',
                        title: 'Bagages et marchandises',
                        value: '5 000€',
                        description:
                          'Option pour bagages et marchandises transportés.',
                        formula_availability: 'option',
                      },
                      {
                        key: 'protection_conducteur',
                        title: 'Protection du conducteur',
                        value: '250 000€ (500 000€ option)',
                        description:
                          'Indemnisation incluse dans les 3 formules, extension possible.',
                        formula_availability: 'included',
                      },
                      {
                        key: 'assistance_sans_franchise',
                        title: 'Assistance 0 km',
                        value: 'Sans franchise',
                        description:
                          'Assistance sans franchise kilométrique, véhicule de remplacement privé.',
                        formula_availability: 'option',
                      },
                      {
                        key: 'immobilisation',
                        title: 'Immobilisation véhicule',
                        value: '150€/jour',
                        description:
                          "150€/jour ou véhicule relais professionnel en cas d'immobilisation.",
                        formula_availability: 'included',
                      },
                    ] as ProductFeature[])
                ).map((feature) => {
                  const Icon = featureIcons[feature.key] || Shield;
                  return (
                    <article
                      key={feature.key}
                      className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                      <div className="text-2xl font-black text-amber-600 mb-3">
                        {feature.value}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="py-20 bg-white">
            <div className="container-max">
              <div className="max-w-3xl mx-auto text-center mb-14">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                  Comparatif des 3 formules
                </h2>
                <p className="text-lg text-slate-600">
                  Trois niveaux de couverture pour s'adapter à chaque profil de chauffeur.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {(formulas.length > 0
                  ? formulas
                  : ([
                      {
                        name: 'Formule 1',
                        level: 'Tiers',
                        rc_pro: 'Option',
                        driver_protection: '250 000€',
                        key_features: [
                          'Responsabilité Civile',
                          'Protection conducteur',
                          'Effets personnels',
                        ],
                      },
                      {
                        name: 'Formule 2',
                        level: 'Tiers Plus',
                        rc_pro: 'Incluse',
                        driver_protection: '250 000€',
                        key_features: [
                          'RC pro incluse',
                          'Vol/Incendie',
                          'Bris de glace',
                          'Catastrophes naturelles',
                        ],
                      },
                      {
                        name: 'Formule 3',
                        level: 'Tous Risques',
                        rc_pro: 'Incluse',
                        driver_protection: '500 000€ (option)',
                        key_features: [
                          'Tous accidents',
                          'Valeur majorée 25%',
                          'Assistance 0 km',
                          'Véhicule relais',
                        ],
                      },
                    ] as Formula[])
                ).map((formula, idx) => (
                  <article
                    key={formula.name}
                    className={`rounded-2xl p-8 border transition-all ${
                      idx === 2
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-black border-amber-600 shadow-2xl scale-105'
                        : 'bg-white text-slate-900 border-slate-200 shadow-sm hover:shadow-lg'
                    }`}
                  >
                    <div className="text-sm font-semibold uppercase tracking-wide mb-2 opacity-80">
                      {formula.level}
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{formula.name}</h3>
                    <dl className="space-y-3 mb-6 text-sm">
                      <div className="flex justify-between items-center pb-2 border-b border-current/10">
                        <dt className="font-medium opacity-80">RC professionnelle</dt>
                        <dd className="font-bold">{formula.rc_pro}</dd>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-current/10">
                        <dt className="font-medium opacity-80">Protection conducteur</dt>
                        <dd className="font-bold">{formula.driver_protection}</dd>
                      </div>
                    </dl>
                    <ul className="space-y-2">
                      {formula.key_features.map((kf) => (
                        <li key={kf} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{kf}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="py-20 bg-slate-900 text-white">
            <div className="container-max">
              <div className="max-w-3xl mx-auto text-center mb-14">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Pourquoi souscrire avec TaxiAssur
                </h2>
                <p className="text-lg text-slate-300">
                  Des avantages exclusifs pour une souscription rapide et sécurisée.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {(brokerAdvantages.length > 0
                  ? brokerAdvantages
                  : ([
                      {
                        title: 'Prise de garantie immédiate',
                        description:
                          "Si le profil le permet, prise de garantie immédiate avec carte verte temporaire éditée sur le champ.",
                      },
                      {
                        title: 'Loi Hamon simplifiée',
                        description:
                          "Parcours adapté pour les reprises à la concurrence, démarches facilitées.",
                      },
                      {
                        title: 'Paiement en ligne sécurisé',
                        description:
                          'Régularisation des impayés par CB sur plateforme sécurisée.',
                      },
                      {
                        title: 'Signature électronique + CB',
                        description:
                          'Souscription en ligne immédiate avec signature électronique et paiement carte.',
                      },
                    ] as BrokerAdvantage[])
                ).map((adv, i) => {
                  const icons = [Zap, FileSignature, CreditCard, FileSignature];
                  const Icon = icons[i % icons.length];
                  return (
                    <article
                      key={adv.title}
                      className="flex gap-4 bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur hover:bg-white/10 transition-all"
                    >
                      <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold mb-2">{adv.title}</h3>
                        <p className="text-slate-300 text-sm leading-relaxed">
                          {adv.description}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="devis" className="py-20 bg-gradient-to-br from-slate-50 to-amber-50/30">
            <div className="container-max">
              <div className="grid lg:grid-cols-2 gap-12 items-start">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                    Devis Solly Azar gratuit en 2 minutes
                  </h2>
                  <p className="text-lg text-slate-600 mb-8">
                    Notre équipe TaxiAssur étudie votre profil et vous transmet une proposition
                    Solly Azar adaptée — sans engagement.
                  </p>
                  <div className="space-y-4">
                    {[
                      'Réponse sous 24h ouvrées',
                      'Conseiller dédié taxi/VTC',
                      'Comparaison avec les autres assureurs partenaires',
                      'Aucun frais de courtage',
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-slate-700 font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
                  <LeadForm />
                </div>
              </div>
            </div>
          </section>

          <section className="py-20 bg-white">
            <div className="container-max max-w-4xl">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                  Questions fréquentes
                </h2>
                <p className="text-lg text-slate-600">
                  Tout savoir sur le contrat taxi Solly Azar.
                </p>
              </div>

              <div className="space-y-4">
                {faqItems.map((item, idx) => (
                  <details
                    key={idx}
                    className="group bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-6 transition-all"
                  >
                    <summary className="flex items-start gap-3 cursor-pointer list-none">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="font-semibold text-slate-900 flex-1">
                        {item.question}
                      </span>
                    </summary>
                    <p className="mt-4 ml-8 text-slate-700 leading-relaxed">{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </main>

        <StickyCTA />
        <Footer />
      </div>
    </>
  );
};

export default AssuranceTaxiSollyAzar;
