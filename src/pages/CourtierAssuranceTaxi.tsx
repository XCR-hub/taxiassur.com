import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import StickyCTA from '../components/StickyCTA';
import SEOHead from '../components/SEOHead';
import JsonLd from '../components/JsonLd';
import AITaxiBackground from '../components/AITaxiBackground';
import { Shield, Award, CheckCircle, Users, TrendingDown, Clock, Star, FileText, Search, Handshake } from 'lucide-react';

const CourtierAssuranceTaxi: React.FC = () => {
  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Courtier Assurance Taxi', url: '/courtier-assurance-taxi' }
  ];

  const faqItems = [
    {
      question: "Qu'est-ce qu'un courtier en assurance taxi ?",
      answer: "Un courtier en assurance taxi est un professionnel indépendant mandaté par ses clients — et non par les assureurs — pour comparer les offres du marché et négocier les meilleures conditions. Contrairement à un agent exclusif, le courtier travaille avec plusieurs compagnies (AXA, Generali, MFA, Zephir, Solly Azar...) et peut ainsi vous proposer le tarif le plus compétitif pour votre profil."
    },
    {
      question: "Pourquoi passer par un courtier plutôt que directement chez un assureur ?",
      answer: "Un courtier professionnel taxi vous fait économiser en moyenne 35% par rapport à une souscription directe. Il négocie des tarifs de groupe, analyse votre situation (zone, expérience, sinistralité) et sélectionne la compagnie la mieux adaptée. Vous bénéficiez aussi d'un accompagnement unique en cas de sinistre."
    },
    {
      question: "TaxiAssur est-il un courtier agréé ORIAS ?",
      answer: "Oui, TaxiAssur est inscrit au registre ORIAS (Organisme pour le Registre des Intermédiaires en Assurance), gage de sérieux et de conformité réglementaire. Notre numéro ORIAS est vérifiable sur le site officiel orias.fr."
    },
    {
      question: "Combien coûtent les services d'un courtier assurance taxi ?",
      answer: "Les services de courtage sont gratuits pour vous. Le courtier est rémunéré par une commission versée par la compagnie d'assurance choisie, sans surcoût sur votre prime. Vous bénéficiez d'un service expert sans frais supplémentaires."
    },
    {
      question: "Quels assureurs travaillent avec TaxiAssur ?",
      answer: "TaxiAssur travaille avec les principaux assureurs spécialisés taxi : MFA, Zephir Assurances, Solly Azar, Generali, et d'autres compagnies partenaires. Ce réseau nous permet de comparer 15+ offres et de vous obtenir le meilleur tarif."
    }
  ];

  return (
    <>
      <SEOHead
        title="Courtier Assurance Taxi - Expert Professionnel Agréé ORIAS | TaxiAssur"
        description="Courtier assurance taxi professionnel agréé ORIAS. Comparez 15+ assureurs, économisez 35% sur votre prime. Devis gratuit en 2 min, réponse en 15 min. Expert taxi depuis 15 ans."
        canonical="/courtier-assurance-taxi"
        keywords="courtier assurance taxi, courtier professionnel taxi, courtier en assurance taxi, cabinet courtage assurance taxi, intermédiaire assurance taxi, ORIAS assurance taxi, courtier agréé taxi"
      />
      <JsonLd type="breadcrumb" data={breadcrumbs} />
      <JsonLd type="organization" />
      <JsonLd type="faq" data={faqItems} />
      <JsonLd type="insurance-product" data={{
        name: "Courtier Assurance Taxi Spécialisé",
        description: "Courtier spécialisé assurance taxi agréé ORIAS. Accès à 15 assureurs partenaires, tarifs négociés, économisez jusqu'à 35% sur votre prime annuelle. RC Pro incluse.",
        url: "/courtier-assurance-taxi",
        lowPrice: 890,
        highPrice: 1800,
        ratingValue: "4.9",
        reviewCount: 127,
        offerCount: 15
      }} />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <Header />
        <main>

          {/* Hero */}
          <section className="relative py-20 bg-gradient-to-br from-gray-950 via-gray-900 to-black overflow-hidden">
            <AITaxiBackground section="hero" intensity="medium" />
            <div
              className="absolute inset-0 bg-cover bg-center opacity-25"
              style={{ backgroundImage: `url('https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop')` }}
            />
            <div className="container-max relative z-20">
              <div className="max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 rounded-full px-4 py-2 mb-6">
                  <Award size={16} className="text-amber-400" />
                  <span className="text-amber-300 text-sm font-semibold">Courtier Agréé ORIAS — Indépendant &amp; Impartial</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight drop-shadow-lg">
                  Courtier <span className="text-gradient">Assurance Taxi</span>
                  <br />Professionnel
                </h1>
                <p className="text-xl text-gray-200 mb-8 leading-relaxed max-w-3xl mx-auto">
                  TaxiAssur est votre <strong className="text-amber-400">courtier spécialisé taxi</strong> agréé ORIAS. Nous comparons <strong className="text-white">15+ compagnies d'assurance</strong> pour vous obtenir la meilleure offre. Économisez en moyenne <strong className="text-green-400">35% sur votre prime</strong> — service 100% gratuit.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="#devis" className="btn-primary">
                    Obtenir Mon Devis Gratuit
                  </a>
                  <a href="tel:0180855786" className="btn-outline">
                    01 80 85 57 86 — Conseil Immédiat
                  </a>
                </div>
                <div className="flex flex-wrap justify-center gap-6 mt-10">
                  {[
                    { value: '35%', label: 'Économie Moyenne' },
                    { value: '15+', label: 'Assureurs Partenaires' },
                    { value: '2 min', label: 'Devis en Ligne' },
                    { value: 'ORIAS', label: 'Agréé Officiel' },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <div className="text-3xl font-black text-amber-400">{s.value}</div>
                      <div className="text-sm text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Courtier vs Assureur Direct */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="container-max">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                  Courtier vs Assureur Direct : Quelle Différence ?
                </h2>
                <p className="text-gray-300 max-w-2xl mx-auto">
                  Un courtier professionnel travaille pour vous, pas pour une compagnie. Voici pourquoi c'est décisif.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                <div className="ai-card p-8 border border-red-500/20">
                  <h3 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-sm font-bold">✗</span>
                    Assureur en Direct
                  </h3>
                  <ul className="space-y-4">
                    {[
                      'Une seule compagnie proposée',
                      'Tarifs non négociés — prix catalogue',
                      'Commercial motivé à vendre ses propres produits',
                      'Accompagnement limité en cas de sinistre',
                      'Aucune comparaison de marché',
                      'Conseil non spécialisé taxi',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-gray-300">
                        <span className="text-red-400 mt-1 flex-shrink-0">✗</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="ai-card p-8 border border-green-500/30 taxi-glow">
                  <h3 className="text-xl font-bold text-green-400 mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-sm font-bold">✓</span>
                    Courtier TaxiAssur
                  </h3>
                  <ul className="space-y-4">
                    {[
                      '15+ compagnies comparées en simultané',
                      'Tarifs négociés grâce au volume de contrats',
                      'Conseiller indépendant, mandaté par vous',
                      'Assistance prioritaire et défense en sinistre',
                      'Sélection objective de la meilleure offre',
                      'Expert taxi depuis 15 ans — spécialiste métier',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-gray-200">
                        <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Ce que fait un courtier */}
          <section className="section-padding bg-gradient-to-br from-black via-gray-950 to-gray-900">
            <div className="container-max">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                  Le Rôle Complet de Votre Courtier Taxi
                </h2>
                <p className="text-gray-300 max-w-2xl mx-auto">
                  De la recherche du contrat à la gestion des sinistres, TaxiAssur est à vos côtés à chaque étape.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    icon: <Search size={32} className="text-amber-400" />,
                    title: 'Analyse de Votre Profil',
                    desc: 'Étude de votre zone d\'activité, ancienneté, type de véhicule, sinistralité passée pour cibler les assureurs les plus adaptés.'
                  },
                  {
                    icon: <TrendingDown size={32} className="text-green-400" />,
                    title: 'Négociation des Tarifs',
                    desc: 'Grâce à notre volume de contrats (plus de 500 taxis assurés), nous obtenons des remises impossibles à obtenir en direct.'
                  },
                  {
                    icon: <FileText size={32} className="text-amber-400" />,
                    title: 'Montage du Dossier',
                    desc: 'Nous préparons votre dossier complet, vérifions les garanties et vous expliquons chaque clause en langage clair.'
                  },
                  {
                    icon: <Shield size={32} className="text-blue-400" />,
                    title: 'Défense en Cas de Sinistre',
                    desc: 'En cas d\'accident, votre courtier représente vos intérêts face à la compagnie pour accélérer l\'indemnisation.'
                  },
                  {
                    icon: <Clock size={32} className="text-amber-400" />,
                    title: 'Réponse Rapide Garantie',
                    desc: 'Devis sous 15 minutes, attestation provisoire immédiate, contrat définitif en 24h. Vous ne restez jamais sans couverture.'
                  },
                  {
                    icon: <Handshake size={32} className="text-green-400" />,
                    title: 'Suivi Annuel Continu',
                    desc: 'À chaque renouvellement, nous renegocions votre contrat pour vous garantir les meilleures conditions du marché.'
                  },
                ].map((item) => (
                  <div key={item.title} className="ai-card p-6 hover:shadow-amber-500/20 transition-all duration-300 group">
                    <div className="mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ORIAS & Crédibilité */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="container-max">
              <div className="max-w-4xl mx-auto">
                <div className="ai-card p-8 md:p-12 taxi-glow">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                    <div>
                      <h2 className="text-3xl font-black text-white mb-4">
                        Un Courtier <span className="text-gradient">Agréé &amp; Réglementé</span>
                      </h2>
                      <p className="text-gray-300 mb-6 leading-relaxed">
                        TaxiAssur est inscrit au registre <strong className="text-white">ORIAS</strong> (Organisme pour le Registre des Intermédiaires en Assurance), conformément à la Directive Européenne sur la Distribution d'Assurances (DDA).
                      </p>
                      <ul className="space-y-3">
                        {[
                          'Inscription ORIAS vérifiable sur orias.fr',
                          'Couverture Responsabilité Civile Professionnelle',
                          'Formation continue obligatoire (15h/an)',
                          'Devoir de conseil formalisé par écrit',
                          'Soumis au contrôle de l\'ACPR (Banque de France)',
                        ].map((item) => (
                          <li key={item} className="flex items-center gap-3 text-gray-200">
                            <CheckCircle size={16} className="text-amber-400 flex-shrink-0" />
                            <span className="text-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { icon: <Award size={28} className="text-amber-400" />, label: 'Agréé ORIAS', sub: 'Registre officiel' },
                        { icon: <Shield size={28} className="text-blue-400" />, label: 'RC Pro', sub: 'Courtier couvert' },
                        { icon: <Users size={28} className="text-green-400" />, label: '500+ Taxis', sub: 'Assurés en France' },
                        { icon: <Star size={28} className="text-amber-400" />, label: '15 ans', sub: 'Expertise taxi' },
                      ].map((item) => (
                        <div key={item.label} className="bg-gray-800/60 rounded-xl p-4 text-center border border-gray-700/50">
                          <div className="flex justify-center mb-2">{item.icon}</div>
                          <div className="font-bold text-white text-sm">{item.label}</div>
                          <div className="text-gray-400 text-xs">{item.sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Comparatif Tarifs */}
          <section className="section-padding bg-gradient-to-br from-black via-gray-950 to-gray-900">
            <div className="container-max">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                  Économies Réalisées Grâce au Courtage
                </h2>
                <p className="text-gray-300">Tarifs moyens constatés — votre devis personnalisé peut être inférieur</p>
              </div>

              <div className="overflow-x-auto max-w-4xl mx-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-4 px-4 text-gray-400 font-semibold">Profil Taxi</th>
                      <th className="text-right py-4 px-4 text-gray-400 font-semibold">Prix Marché Direct</th>
                      <th className="text-right py-4 px-4 text-amber-400 font-bold">Via TaxiAssur</th>
                      <th className="text-right py-4 px-4 text-green-400 font-semibold">Économie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {[
                      { profil: 'Taxi Province — Profil Standard', direct: '1 800 €/an', courtier: '1 170 €/an', eco: '-35%' },
                      { profil: 'Taxi Paris — Expérimenté', direct: '3 200 €/an', courtier: '2 080 €/an', eco: '-35%' },
                      { profil: 'Taxi Lyon — Jeune Conducteur', direct: '2 800 €/an', courtier: '1 960 €/an', eco: '-30%' },
                      { profil: 'Taxi Marseille — Tous Risques', direct: '2 400 €/an', courtier: '1 560 €/an', eco: '-35%' },
                      { profil: 'Flotte 3 Taxis — Province', direct: '5 400 €/an', courtier: '3 240 €/an', eco: '-40%' },
                    ].map((row) => (
                      <tr key={row.profil} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-4 px-4 text-white font-medium">{row.profil}</td>
                        <td className="py-4 px-4 text-right text-gray-400 line-through">{row.direct}</td>
                        <td className="py-4 px-4 text-right text-amber-400 font-bold">{row.courtier}</td>
                        <td className="py-4 px-4 text-right text-green-400 font-bold">{row.eco}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-center text-gray-500 text-xs mt-4">Tarifs indicatifs — économies réelles variables selon profil et compagnie retenue</p>
            </div>
          </section>

          {/* Processus */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="container-max">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-black text-white mb-10 text-center">
                  Comment Fonctionne Notre Service de Courtage ?
                </h2>
                <div className="space-y-6">
                  {[
                    {
                      num: '1',
                      title: 'Remplissez le Formulaire (2 min)',
                      desc: 'Décrivez votre activité, votre véhicule, votre zone géographique et vos besoins en garanties. 100% en ligne, sans papier.'
                    },
                    {
                      num: '2',
                      title: 'Analyse par Nos Experts (15 min)',
                      desc: 'Notre équipe étudie votre profil, consulte 15+ compagnies partenaires et sélectionne les 3 meilleures offres pour vous.'
                    },
                    {
                      num: '3',
                      title: 'Présentation des Offres',
                      desc: 'Vous recevez une comparaison claire avec les prix, les garanties et nos recommandations. Aucun jargon, que du concret.'
                    },
                    {
                      num: '4',
                      title: 'Souscription &amp; Attestation Immédiate',
                      desc: 'Vous choisissez, nous gérons tout. Attestation provisoire disponible le jour même, contrat définitif sous 24h.'
                    },
                  ].map((step) => (
                    <div key={step.num} className="flex items-start gap-5">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 text-black font-black shadow-lg shadow-amber-500/30">
                        {step.num}
                      </div>
                      <div className="ai-card flex-1 p-5">
                        <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                        <p className="text-gray-300 text-sm leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="section-padding bg-gradient-to-br from-black via-gray-950 to-gray-900">
            <div className="container-max">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-black text-white mb-10 text-center">
                  Questions sur le Courtage en Assurance Taxi
                </h2>
                <div className="space-y-4">
                  {faqItems.map((item, idx) => (
                    <div key={idx} className="ai-card p-6">
                      <h3 className="text-lg font-bold text-amber-400 mb-3">{item.question}</h3>
                      <p className="text-gray-300 leading-relaxed text-sm">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* CTA final avant formulaire */}
          <section className="py-12 bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="container-max">
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-3xl font-black text-white mb-4">
                  Votre Courtier Taxi Vous Attend
                </h2>
                <p className="text-gray-300 mb-8">
                  Service gratuit, sans engagement. Obtenez votre devis personnalisé en 2 minutes et économisez sur votre assurance taxi dès cette année.
                </p>
                <a href="#devis" className="btn-primary text-lg px-10 py-4">
                  Devis Gratuit — Réponse en 15 min
                </a>
              </div>
            </div>
          </section>

          <LeadForm />
        </main>
        <Footer />
        <StickyCTA />
      </div>
    </>
  );
};

export default CourtierAssuranceTaxi;
