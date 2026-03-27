import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { Handshake, TrendingUp, Euro, Users, Award, CheckCircle, Phone, Mail, Calculator, FileText, Target, Zap, Shield, Crown, Star, Gift, Clock, Eye, Download, BarChart3, Send, User, Building, Globe } from 'lucide-react';
import Card from '../components/Card';
import AITaxiBackground from '../components/AITaxiBackground';
import StickyCTA from '../components/StickyCTA';
import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';

const PartnershipPage: React.FC = () => {
  const [partnerForm, setPartnerForm] = useState({
    type: 'courtier',
    company: '',
    name: '',
    email: '',
    phone: '',
    website: '',
    description: '',
    audience: '',
    traffic: '',
    experience: '',
    objectives: '',
    honeypot: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [calculatorData, setCalculatorData] = useState({
    leadsPerMonth: 10,
    conversionRate: 15,
    averageCommission: 120
  });

  const monthlyEarnings = Math.round(
    (calculatorData.leadsPerMonth * calculatorData.conversionRate / 100) * calculatorData.averageCommission
  );

  const partnerTypes = [
    {
      icon: Users,
      title: 'Annuaires & Répertoires',
      description: 'Intégrez TaxiAssur dans vos annuaires taxi avec commission sur chaque lead qualifié',
      commission: '50-80€',
      examples: ['Annuaires taxi locaux', 'Répertoires professionnels', 'Pages Jaunes'],
      color: 'from-yellow-400 to-yellow-500'
    },
    {
      icon: FileText,
      title: 'Blogs & Médias Taxi',
      description: 'Monétisez votre audience avec nos articles sponsorisés et liens d\'affiliation',
      commission: '80-150€',
      examples: ['Blogs taxi', 'Magazines transport', 'Sites d\'actualités'],
      color: 'from-gray-800 to-pink-500'
    },
    {
      icon: Handshake,
      title: 'Partenaires Métier',
      description: 'Recommandez TaxiAssur à vos clients taxi et percevez une commission récurrente',
      commission: '100-200€',
      examples: ['Garages taxi', 'Équipementiers', 'Formations taxi'],
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Target,
      title: 'Courtiers Partenaires',
      description: 'Achetez des leads qualifiés TaxiAssur pour développer votre portefeuille',
      commission: '20€ partagé / 70€ exclusif',
      examples: ['Courtiers indépendants', 'Cabinets d\'assurance', 'Agents généraux'],
      color: 'from-amber-500 to-yellow-500'
    }
  ];

  const benefits = [
    'Commission attractive sur chaque lead qualifié',
    'Suivi en temps réel de vos apports',
    'Support marketing et outils personnalisés',
    'Paiement mensuel sécurisé',
    'Formation gratuite sur nos produits',
    'Interface de gestion dédiée'
  ];

  const leadPricing = [
    {
      type: 'Lead Partagé',
      price: '20€',
      description: 'Lead transmis à 2-3 courtiers maximum',
      features: [
        'Coordonnées complètes du prospect',
        'Informations véhicule et besoins',
        'Délai de traitement : 2h maximum',
        'Garantie de fraîcheur < 30min'
      ],
      popular: false
    },
    {
      type: 'Lead Exclusif',
      price: '70€',
      description: 'Lead transmis uniquement à votre cabinet',
      features: [
        'Exclusivité totale garantie',
        'Coordonnées + contexte détaillé',
        'Délai de traitement : 1h maximum',
        'Support de conversion inclus'
      ],
      popular: true
    }
  ];

  const partnershipTypes = [
    {
      id: 'courtier',
      title: '🏢 Courtier en Assurance',
      description: 'Développez votre portefeuille avec nos leads taxi exclusifs',
      benefits: ['Leads qualifiés 20-70€', 'Formation produits', 'Support commercial', 'Outils marketing'],
      commission: '20-70€ par lead',
      color: 'from-yellow-400 to-yellow-500'
    },
    {
      id: 'annuaire',
      title: '📖 Annuaire / Répertoire',
      description: 'Monétisez votre audience taxi avec nos partenariats',
      benefits: ['Commission par clic', 'Contenu exclusif', 'Fiche partenaire', 'Visibilité croisée'],
      commission: '50-120€ par lead',
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'media',
      title: '📰 Blog / Média Taxi',
      description: 'Articles sponsorisés et partenariats éditoriaux',
      benefits: ['Articles invités', 'Liens contextuels', 'Contenu expert', 'Audience qualifiée'],
      commission: '100-200€ par lead',
      color: 'from-gray-800 to-pink-500'
    },
    {
      id: 'service',
      title: '🔧 Service Taxi (Garage, Équipement)',
      description: 'Recommandez TaxiAssur à vos clients taxi',
      benefits: ['Commission récurrente', 'Matériel marketing', 'Formation équipe', 'Support dédié'],
      commission: '150-300€ par lead',
      color: 'from-amber-500 to-yellow-500'
    }
  ];

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Anti-spam check
    if (partnerForm.honeypot) return;
    
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/lead.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          ...partnerForm,
          leadType: 'partnership',
          status: 'partenaire'
        })
      });

      const result = await response.json();
      
      if (response.ok && (result.success || result.ok)) {
        toast.success('✅ Demande de partenariat envoyée ! Nous vous recontactons sous 24h.');
        setPartnerForm({
          type: 'courtier',
          company: '',
          name: '',
          email: '',
          phone: '',
          website: '',
          description: '',
          audience: '',
          traffic: '',
          experience: '',
          objectives: '',
          honeypot: ''
        });
        setShowForm(false);
      } else {
        toast.error(result.error || 'Erreur lors de l\'envoi. Veuillez réessayer.');
      }
    } catch (error) {
      logger.error('Partnership form error:', error);
      toast.error('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPartnerForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <SEOHead
        title="Programme Partenaires TaxiAssur - Monétisez Votre Audience Taxi | Leads Exclusifs Courtiers"
        description="Rejoignez le programme partenaires TaxiAssur : commissions de 50 à 300 euros par lead, leads taxi exclusifs, marketplace B2B et outils marketing dédiés."
        canonical="/programme-partenaires"
        keywords="programme partenaires taxi, affiliation assurance taxi, leads taxi exclusifs, courtiers partenaires, marketplace leads taxi, commission courtier taxi, monétisation audience taxi, partenariat B2B assurance"
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <Header />
        
        <main>
          {/* Hero Section */}
          <section className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white py-20 overflow-hidden">
            <AITaxiBackground section="hero" intensity="medium" />
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 animate-pulse"></div>
            <div className="container-max">
              <div className="max-w-5xl mx-auto text-center relative z-20">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-2xl taxi-glow">
                    <Crown className="text-black drop-shadow-md" size={32} />
                  </div>
                  <h1 className="text-4xl md:text-6xl font-bold drop-shadow-lg">
                    Programme <span className="text-gradient">Partenaires TaxiAssur</span>
                  </h1>
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-2xl taxi-glow">
                    <Euro className="text-black animate-pulse drop-shadow-md" size={32} />
                  </div>
                </div>
                
                <p className="text-2xl text-gray-200 mb-8 leading-relaxed drop-shadow-md">
                  💰 <strong className="text-yellow-500">Monétisez votre audience taxi</strong> avec des commissions jusqu'à 300€/lead ou 
                  <strong className="text-green-400"> développez votre portefeuille</strong> avec nos leads taxi exclusifs. 
                  <strong className="text-yellow-400">+50 partenaires</strong> génèrent déjà des revenus avec TaxiAssur.
                </p>
                
                {/* Stats impressionnantes */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="ai-card p-4 hover:shadow-amber-500/40 transition-all duration-300">
                    <div className="text-3xl font-bold text-yellow-500 drop-shadow-lg">300€</div>
                    <div className="text-sm text-gray-300 drop-shadow-md">Commission max</div>
                  </div>
                  <div className="ai-card p-4 hover:shadow-green-500/40 transition-all duration-300">
                    <div className="text-3xl font-bold text-green-400 drop-shadow-lg">50+</div>
                    <div className="text-sm text-gray-300 drop-shadow-md">Partenaires actifs</div>
                  </div>
                  <div className="ai-card p-4 hover:shadow-yellow-500/40 transition-all duration-300">
                    <div className="text-3xl font-bold text-yellow-400 drop-shadow-lg">500%</div>
                    <div className="text-sm text-gray-300 drop-shadow-md">ROI moyen</div>
                  </div>
                  <div className="ai-card p-4 hover:shadow-yellow-500/40 transition-all duration-300">
                    <div className="text-3xl font-bold text-yellow-400 drop-shadow-lg">24h</div>
                    <div className="text-sm text-gray-300 drop-shadow-md">Activation</div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="#calculator" className="btn-primary">
                    💰 Calculer Mes Revenus Partenaire
                  </a>
                  <a href="mailto:partenariats@taxiassur.com?subject=Demande%20Partenariat%20TaxiAssur%20-%20Leads%20Taxi&body=Bonjour,%0A%0AJe%20souhaite%20rejoindre%20le%20programme%20partenaires%20TaxiAssur%20:%0A%0A-%20Type%20de%20partenariat%20:%20%0A-%20Audience%20taxi%20:%20%0A-%20Trafic%20mensuel%20:%20%0A-%20Objectif%20revenus%20:%20%0A%0AMerci%20de%20me%20recontacter%20rapidement.%0A%0ACordialement" className="btn-outline">
                    🤝 Devenir Partenaire Maintenant
                  </a>
                </div>
                
                <p className="text-sm text-gray-300 mt-6 drop-shadow-md">
                  ⚡ Activation sous 24h • 🎯 Support dédié • 💎 Outils marketing gratuits
                </p>
              </div>
            </div>
          </section>

          {/* Calculator */}
          <section id="calculator" className="section-padding bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
            <AITaxiBackground section="content" intensity="low" />
            <div className="container-max">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">
                    💰 Calculateur de Revenus Partenaire TaxiAssur
                  </h2>
                  <p className="text-xl text-gray-200 drop-shadow-md">
                    Découvrez combien vous pouvez gagner en monétisant votre audience taxi
                  </p>
                </div>
                
                <div className="ai-card p-8 shadow-2xl border border-gray-700/60 taxi-glow">
                  <div className="flex items-center justify-center space-x-3 mb-8">
                    <Calculator className="text-yellow-500 drop-shadow-md" size={32} />
                    <h3 className="text-2xl font-bold text-white drop-shadow-lg">Simulateur de Gains</h3>
                    <BarChart3 className="text-yellow-500 animate-pulse drop-shadow-md" size={32} />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Leads/mois estimés
                      </label>
                      <input
                        type="number"
                        value={calculatorData.leadsPerMonth}
                        onChange={(e) => setCalculatorData(prev => ({ ...prev, leadsPerMonth: parseInt(e.target.value) || 0 }))}
                        min="1"
                        max="100"
                        className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-500 transition-all duration-300"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Taux conversion (%)
                      </label>
                      <input
                        type="number"
                        value={calculatorData.conversionRate}
                        onChange={(e) => setCalculatorData(prev => ({ ...prev, conversionRate: parseInt(e.target.value) || 0 }))}
                        min="5"
                        max="50"
                        className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-500 transition-all duration-300"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Commission moy. (€)
                      </label>
                      <input
                        type="number"
                        value={calculatorData.averageCommission}
                        onChange={(e) => setCalculatorData(prev => ({ ...prev, averageCommission: parseInt(e.target.value) || 0 }))}
                        min="50"
                        max="300"
                        className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-500 transition-all duration-300"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-8 rounded-2xl border border-green-500/40 text-center backdrop-blur-sm taxi-glow">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                      <Gift className="text-green-400 animate-bounce drop-shadow-md" size={32} />
                      <h4 className="text-2xl font-bold text-green-300 drop-shadow-lg">Revenus Mensuels Estimés</h4>
                      <Star className="text-green-400 animate-pulse drop-shadow-md" size={32} />
                    </div>
                    <div className="text-6xl font-bold text-green-400 mb-4 drop-shadow-lg">{monthlyEarnings}€</div>
                    <p className="text-lg text-green-300 drop-shadow-md">
                      Soit <strong>{monthlyEarnings * 12}€/an</strong> de revenus passifs
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-xl font-bold text-yellow-500">{Math.round(monthlyEarnings / 30)}</div>
                        <div className="text-gray-300">€/jour</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-yellow-400">{Math.round(monthlyEarnings * 0.7)}</div>
                        <div className="text-gray-300">€ net estimé</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-yellow-400">500%</div>
                        <div className="text-gray-300">ROI moyen</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Partnership Types */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
            <AITaxiBackground section="content" intensity="medium" />
            <div className="container-max">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
                  🎯 Choisissez Votre Type de Partenariat
                </h2>
                <p className="text-xl text-gray-200 drop-shadow-md">
                  Solutions adaptées à chaque profil professionnel
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {partnershipTypes.map((type, index) => (
                  <div key={type.id} className="ai-card p-8 hover:shadow-amber-500/40 hover:border-amber-500/50 transition-all duration-300 group">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${type.color} mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                      <span className="text-2xl">{type.title.split(' ')[0]}</span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-amber-300 transition-colors drop-shadow-lg">
                      {type.title}
                    </h3>
                    
                    <p className="text-gray-300 mb-4 leading-relaxed drop-shadow-md">
                      {type.description}
                    </p>
                    
                    <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 p-4 rounded-lg border border-amber-500/40 mb-4 backdrop-blur-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-amber-300 drop-shadow-md">Commission</span>
                        <span className="text-lg font-bold text-yellow-500 drop-shadow-lg">{type.commission}</span>
                      </div>
                    </div>
                    
                    <ul className="space-y-2 mb-6">
                      {type.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-center space-x-2 text-sm text-gray-300">
                          <CheckCircle className="text-green-400" size={14} />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <button
                      onClick={() => {
                        setPartnerForm(prev => ({ ...prev, type: type.id }));
                        setShowForm(true);
                      }}
                      className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Devenir Partenaire {type.title.split(' ')[1]}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Partnership Form */}
          {showForm && (
            <section className="section-padding bg-gradient-to-br from-black via-gray-950 to-gray-900 relative overflow-hidden">
              <AITaxiBackground section="content" intensity="low" />
              <div className="container-max">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
                      🤝 Formulaire de Candidature Partenaire
                    </h2>
                    <p className="text-xl text-gray-200 drop-shadow-md">
                      Rejoignez notre réseau et commencez à générer des revenus
                    </p>
                  </div>
                  
                  <div className="ai-card p-8 shadow-2xl border border-gray-700/60 taxi-glow">
                    <form onSubmit={handlePartnerSubmit} className="space-y-6">
                      {/* Honeypot field - hidden */}
                      <input
                        type="text"
                        name="honeypot"
                        value={partnerForm.honeypot}
                        onChange={handleFormChange}
                        style={{ display: 'none' }}
                        tabIndex={-1}
                        autoComplete="off"
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="company" className="block text-sm font-semibold text-white mb-2">
                            <Building size={16} className="inline mr-2" />
                            Nom de l'entreprise *
                          </label>
                          <input
                            type="text"
                            id="company"
                            name="company"
                            value={partnerForm.company}
                            onChange={handleFormChange}
                            required
                            className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-500 transition-all duration-300"
                            placeholder="Votre Société SARL"
                          />
                        </div>

                        <div>
                          <label htmlFor="name" className="block text-sm font-semibold text-white mb-2">
                            <User size={16} className="inline mr-2" />
                            Nom du contact *
                          </label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            value={partnerForm.name}
                            onChange={handleFormChange}
                            required
                            autoComplete="name"
                            className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-500 transition-all duration-300"
                            placeholder="Jean Dupont"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                            <Mail size={16} className="inline mr-2" />
                            Email professionnel *
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={partnerForm.email}
                            onChange={handleFormChange}
                            required
                            autoComplete="email"
                            className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-500 transition-all duration-300"
                            placeholder="contact@votre-societe.com"
                          />
                        </div>

                        <div>
                          <label htmlFor="phone" className="block text-sm font-semibold text-white mb-2">
                            <Phone size={16} className="inline mr-2" />
                            Téléphone *
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={partnerForm.phone}
                            onChange={handleFormChange}
                            required
                            autoComplete="tel"
                            className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-500 transition-all duration-300"
                            placeholder="01 23 45 67 89"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="website" className="block text-sm font-semibold text-white mb-2">
                          <Globe size={16} className="inline mr-2" />
                          Site web (optionnel)
                        </label>
                        <input
                          type="url"
                          id="website"
                          name="website"
                          value={partnerForm.website}
                          onChange={handleFormChange}
                          className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-500 transition-all duration-300"
                          placeholder="https://votre-site.com"
                        />
                      </div>

                      <div>
                        <label htmlFor="description" className="block text-sm font-semibold text-white mb-2">
                          <FileText size={16} className="inline mr-2" />
                          Description de votre activité *
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          value={partnerForm.description}
                          onChange={handleFormChange}
                          required
                          rows={4}
                          className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-500 transition-all duration-300"
                          placeholder="Décrivez votre entreprise, vos services, votre expertise..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="audience" className="block text-sm font-semibold text-white mb-2">
                            <Users size={16} className="inline mr-2" />
                            Audience taxi (nombre de contacts)
                          </label>
                          <input
                            type="text"
                            id="audience"
                            name="audience"
                            value={partnerForm.audience}
                            onChange={handleFormChange}
                            className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-500 transition-all duration-300"
                            placeholder="Ex: 500 chauffeurs, 1200 abonnés..."
                          />
                        </div>

                        <div>
                          <label htmlFor="traffic" className="block text-sm font-semibold text-white mb-2">
                            <TrendingUp size={16} className="inline mr-2" />
                            Trafic mensuel (si site web)
                          </label>
                          <input
                            type="text"
                            id="traffic"
                            name="traffic"
                            value={partnerForm.traffic}
                            onChange={handleFormChange}
                            className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-500 transition-all duration-300"
                            placeholder="Ex: 5000 visiteurs/mois"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="experience" className="block text-sm font-semibold text-white mb-2">
                            <Award size={16} className="inline mr-2" />
                            Expérience secteur taxi/assurance
                          </label>
                          <input
                            type="text"
                            id="experience"
                            name="experience"
                            value={partnerForm.experience}
                            onChange={handleFormChange}
                            className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-500 transition-all duration-300"
                            placeholder="Ex: 5 ans courtage, 10 ans taxi..."
                          />
                        </div>

                        <div>
                          <label htmlFor="objectives" className="block text-sm font-semibold text-white mb-2">
                            <Target size={16} className="inline mr-2" />
                            Objectifs de revenus (€/mois)
                          </label>
                          <input
                            type="text"
                            id="objectives"
                            name="objectives"
                            value={partnerForm.objectives}
                            onChange={handleFormChange}
                            className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-500 transition-all duration-300"
                            placeholder="Ex: 2000€/mois"
                          />
                        </div>
                      </div>

                      {/* Legal consent */}
                      <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 backdrop-blur-sm">
                        <p className="text-xs text-gray-600">
                          En soumettant ce formulaire, j'accepte d'être recontacté par TaxiAssur.com 
                          pour discuter d'un partenariat commercial. Données sécurisées selon notre 
                          <a href="/policy" className="text-amber-600 hover:underline"> politique de confidentialité</a>.
                        </p>
                      </div>

                      {/* Submit button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold text-lg rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl flex items-center justify-center space-x-2"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                            <span>Envoi en cours...</span>
                          </>
                        ) : (
                          <>
                            <Send size={20} />
                            <span>🤝 DEVENIR PARTENAIRE TAXIASSUR</span>
                          </>
                        )}
                      </button>

                      <p className="text-center text-sm text-gray-600 drop-shadow-md">
                        Réponse sous 24h • Activation rapide • Support dédié
                      </p>
                    </form>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Partner Types */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="container-max">
              <h2 className="text-3xl font-bold text-white mb-12 text-center drop-shadow-lg">
                🎯 4 Types de Partenariats Rentables
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                {partnerTypes.map((type, index) => {
                  const IconComponent = type.icon;
                  return (
                    <div key={index} className="ai-card p-8 hover:shadow-amber-500/40 hover:border-amber-500/50 transition-all duration-300 group">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${type.color} mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                        <IconComponent className="text-white" size={24} />
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-amber-300 transition-colors drop-shadow-lg">
                        {type.title}
                      </h3>
                      
                      <p className="text-gray-300 mb-4 leading-relaxed drop-shadow-md">
                        {type.description}
                      </p>
                      
                      <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 p-4 rounded-lg border border-amber-500/40 mb-4 backdrop-blur-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-amber-300 drop-shadow-md">Commission par lead</span>
                          <span className="text-xl font-bold text-yellow-500 drop-shadow-lg">{type.commission}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="font-medium text-white text-sm drop-shadow-md">Exemples :</h5>
                        <ul className="text-sm text-gray-300 space-y-1">
                          {type.examples.map((example, i) => (
                            <li key={i} className="flex items-center space-x-2">
                              <CheckCircle className="text-green-400" size={14} />
                              <span>{example}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Lead Marketplace for Brokers */}
          <section className="section-padding bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
            <AITaxiBackground section="content" intensity="medium" />
            <div className="container-max">
              <div className="text-center mb-12">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-2xl">
                    <Users className="text-white drop-shadow-md" size={24} />
                  </div>
                  <h2 className="text-3xl font-bold text-white drop-shadow-lg">
                    Marketplace de Leads Taxi Exclusifs
                  </h2>
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-2xl">
                    <Euro className="text-white animate-pulse drop-shadow-md" size={24} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 font-semibold mb-4">
                  🏪 Marketplace de Leads Taxi
                </h3>
                <p className="text-xl text-gray-200 max-w-3xl mx-auto drop-shadow-md">
                  🎯 <strong className="text-yellow-400">Courtiers en assurance</strong> : développez votre portefeuille avec nos 
                  <strong className="text-green-400">leads taxi qualifiés exclusifs</strong>. 
                  <strong className="text-yellow-500">Tarification transparente</strong>, accès immédiat, support inclus.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {leadPricing.map((plan, index) => (
                  <div key={index} className={`ai-card p-8 text-center relative hover:shadow-amber-500/40 transition-all duration-300 ${plan.popular ? 'border-2 border-amber-500/60 shadow-2xl taxi-glow' : ''}`}>
                    {plan.popular && (
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-6 py-3 rounded-full text-sm font-bold shadow-2xl border-2 border-amber-400">
                          👑 PLUS POPULAIRE
                        </span>
                      </div>
                    )}
                    
                    <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">{plan.type}</h3>
                    <div className="text-5xl font-bold text-yellow-500 mb-2 drop-shadow-lg">{plan.price}</div>
                    <p className="text-gray-300 mb-6 drop-shadow-md">{plan.description}</p>
                    
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center space-x-2">
                          <CheckCircle className="text-green-400" size={16} />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <a 
                      href="/backoffice/partner-portal"
                      className={`block w-full py-3 px-6 rounded-lg font-bold transition-all duration-300 ${
                        plan.popular 
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black shadow-lg hover:shadow-xl transform hover:scale-105'
                          : 'border-2 border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-black'
                      }`}
                    >
                      Accéder au Portail
                    </a>
                  </div>
                ))}
              </div>
              
              <div className="text-center mt-12">
                <div className="ai-card p-6 inline-block">
                  <h4 className="text-lg font-bold text-white mb-3 drop-shadow-lg">
                    🚀 Démarrage Express Courtiers
                  </h4>
                  <p className="text-gray-300 mb-4 drop-shadow-md">
                    Accès immédiat au portail • Formation incluse • Support dédié
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Clock className="text-yellow-500" size={14} />
                      <span className="text-gray-300">Activation 24h</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Shield className="text-green-400" size={14} />
                      <span className="text-gray-300">Leads garantis</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Target className="text-yellow-400" size={14} />
                      <span className="text-gray-300">ROI 500%+</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits */}
          <section className="section-padding bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="container-max">
              <h2 className="text-3xl font-bold text-white mb-12 text-center drop-shadow-lg">
                Avantages Programme Partenaires
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {benefits.map((benefit, index) => (
                  <div key={index} className="ai-card p-6 text-center hover:shadow-green-500/40 transition-all duration-300 group">
                    <CheckCircle className="mx-auto mb-4 text-green-400 group-hover:scale-110 transition-transform drop-shadow-md" size={32} />
                    <p className="text-gray-200 font-medium drop-shadow-md">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="section-padding bg-gradient-to-br from-black via-gray-950 to-black text-white relative overflow-hidden">
            <AITaxiBackground section="content" intensity="high" />
            <div className="container-max">
              <div className="max-w-4xl mx-auto text-center relative z-20">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <Crown className="text-yellow-500 animate-bounce drop-shadow-lg" size={40} />
                  <h2 className="text-4xl font-bold drop-shadow-lg">
                    Rejoignez Notre Réseau de Partenaires
                  </h2>
                  <Gift className="text-yellow-500 animate-pulse drop-shadow-lg" size={40} />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gradient">
                  Rejoignez Notre Réseau de Partenaires
                </h3>
                <p className="text-xl text-gray-200 mb-8 leading-relaxed drop-shadow-md">
                  💰 <strong className="text-yellow-500">Développez vos revenus</strong> en recommandant la meilleure assurance taxi du marché 
                  ou <strong className="text-green-400">achetez nos leads taxi qualifiés exclusifs</strong>. 
                  <strong className="text-yellow-400">ROI 500%+ garanti</strong> pour nos partenaires actifs.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="ai-card p-6 hover:shadow-amber-500/40 transition-all duration-300">
                    <Euro className="mx-auto mb-3 text-yellow-500 drop-shadow-md" size={32} />
                    <div className="text-2xl font-bold text-white drop-shadow-lg">50-300€</div>
                    <div className="text-sm text-gray-300 drop-shadow-md">Commission/lead</div>
                  </div>
                  <div className="ai-card p-6 hover:shadow-green-500/40 transition-all duration-300">
                    <TrendingUp className="mx-auto mb-3 text-green-400 drop-shadow-md" size={32} />
                    <div className="text-2xl font-bold text-white drop-shadow-lg">500%</div>
                    <div className="text-sm text-gray-300 drop-shadow-md">ROI moyen</div>
                  </div>
                  <div className="ai-card p-6 hover:shadow-yellow-500/40 transition-all duration-300">
                    <Clock className="mx-auto mb-3 text-yellow-400 drop-shadow-md" size={32} />
                    <div className="text-2xl font-bold text-white drop-shadow-lg">24h</div>
                    <div className="text-sm text-gray-300 drop-shadow-md">Activation</div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                  <a 
                    href="mailto:partenariats@taxiassur.com?subject=URGENT%20-%20Demande%20Partenariat%20TaxiAssur%20Leads%20Taxi&body=Bonjour%20l'équipe%20TaxiAssur,%0A%0A🚀%20Je%20souhaite%20IMMÉDIATEMENT%20rejoindre%20votre%20programme%20partenaires%20:%0A%0A💰%20OBJECTIF%20:%20Générer%20des%20revenus%20avec%20vos%20leads%20taxi%0A%0A📊%20MON%20PROFIL%20:%0A-%20Type%20de%20partenariat%20:%20[Courtier/Annuaire/Média/Autre]%0A-%20Audience%20taxi%20:%20[Nombre%20de%20contacts]%0A-%20Trafic%20mensuel%20:%20[Visiteurs/mois]%0A-%20Expérience%20assurance%20:%20[Années]%0A-%20Objectif%20revenus%20:%20[€/mois]%0A%0A🎯%20DEMANDE%20:%0A-%20Accès%20immédiat%20au%20portail%20partenaires%0A-%20Formation%20sur%20vos%20produits%0A-%20Outils%20marketing%20personnalisés%0A%0A⚡%20URGENCE%20:%20Merci%20de%20me%20recontacter%20sous%2024h%20!%0A%0ACordialement"
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 flex items-center space-x-2"
                  >
                    <Mail size={20} />
                    <span>🚀 DEVENIR PARTENAIRE MAINTENANT</span>
                  </a>
                  <a 
                    href="tel:0180855786" 
                    className="border-2 border-amber-500 text-yellow-500 hover:bg-amber-500 hover:text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 flex items-center space-x-2"
                  >
                    <Phone size={20} />
                    <span>📞 EXPERT PARTENAIRES : 01 80 85 57 86</span>
                  </a>
                </div>
                
                <div className="mt-8 ai-card p-6 inline-block">
                  <h4 className="text-lg font-bold text-white mb-3 drop-shadow-lg">
                    🎁 Bonus Partenaires Exclusifs
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Gift className="text-green-400" size={16} />
                      <span className="text-gray-300">Formation gratuite</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Target className="text-yellow-400" size={16} />
                      <span className="text-gray-300">Outils marketing</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Award className="text-yellow-400" size={16} />
                      <span className="text-gray-300">Support prioritaire</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
        <StickyCTA />
      </div>
    </>
  );
};

export default PartnershipPage;