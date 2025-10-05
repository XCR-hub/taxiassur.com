import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, Sparkles, Zap, Shield, Clock, User, Mail, Phone, MapPin, Car, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FormData {
  name: string;
  email: string;
  phone: string;
  city: string;
  status: 'taxi' | 'vtc' | 'autre';
  immatriculation: string;
}

const AIQuoteProcess: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    city: '',
    status: 'taxi',
    immatriculation: ''
  });

  const steps = [
    {
      id: 'welcome',
      title: 'Votre Devis Personnalisé',
      subtitle: 'En 3 étapes simples',
      icon: Sparkles,
      color: 'from-amber-500 to-yellow-600'
    },
    {
      id: 'identity',
      title: 'Qui êtes-vous ?',
      subtitle: 'Informations de contact',
      icon: User,
      color: 'from-amber-600 to-orange-600'
    },
    {
      id: 'activity',
      title: 'Votre Activité',
      subtitle: 'Détails professionnels',
      icon: Car,
      color: 'from-yellow-500 to-amber-600'
    },
    {
      id: 'processing',
      title: 'Analyse IA en cours...',
      subtitle: 'Calcul de votre devis optimal',
      icon: Zap,
      color: 'from-amber-500 to-yellow-500'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    setCurrentStep(3); // Processing step

    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const response = await fetch('/api/lead.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          honeypot: ''
        })
      });
      
      const result = await response.json();

      if (response.ok && (result.success || result.ok)) {
        navigate('/merci');
      } else {
        alert(result.error || 'Erreur lors de l\'envoi. Veuillez réessayer.');
        setCurrentStep(2);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Erreur de connexion. Veuillez réessayer.');
      setCurrentStep(2);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.name.length >= 2 && formData.email.includes('@') && formData.phone.length >= 10;
      case 2:
        return formData.city.length >= 2;
      default:
        return true;
    }
  };

  const renderWelcomeStep = () => (
    <div className="text-center space-y-8 animate-fade-in-up">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full blur-3xl animate-taxi-pulse"></div>
        <div className="relative w-32 h-32 mx-auto bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full flex items-center justify-center taxi-glow animate-ai-thinking">
          <Sparkles className="text-black animate-spin drop-shadow-lg" size={48} />
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-4xl font-bold text-white drop-shadow-lg">
          Devis IA <span className="text-gradient">Personnalisé</span>
        </h2>
        <p className="text-xl text-gray-300 max-w-md mx-auto drop-shadow-md">
          Notre intelligence artificielle analyse votre profil pour vous proposer 
          la meilleure assurance taxi en temps réel.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
        <div className="text-center space-y-2 group">
          <div className="w-12 h-12 mx-auto bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full flex items-center justify-center group-hover:animate-taxi-pulse-glow transition-all duration-300">
            <Zap className="text-black drop-shadow-md" size={20} />
          </div>
          <p className="text-sm font-medium text-gray-200">Analyse Instantanée</p>
        </div>
        <div className="text-center space-y-2 group">
          <div className="w-12 h-12 mx-auto bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full flex items-center justify-center group-hover:animate-taxi-pulse-glow transition-all duration-300">
            <Shield className="text-black drop-shadow-md" size={20} />
          </div>
          <p className="text-sm font-medium text-gray-200">Couverture Optimale</p>
        </div>
        <div className="text-center space-y-2 group">
          <div className="w-12 h-12 mx-auto bg-gradient-to-r from-amber-600 to-orange-500 rounded-full flex items-center justify-center group-hover:animate-taxi-pulse-glow transition-all duration-300">
            <Clock className="text-black drop-shadow-md" size={20} />
          </div>
          <p className="text-sm font-medium text-gray-200">Réponse 15min</p>
        </div>
      </div>

      <button
        onClick={handleNext}
        className="group relative px-8 py-4 btn-taxi-ai text-black font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
      >
        <span className="flex items-center space-x-2 drop-shadow-md relative z-10">
          <span>Commencer Mon Analyse IA</span>
          <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
        </span>
      </button>
    </div>
  );

  const renderIdentityStep = () => (
    <div className="space-y-8 animate-fade-in-up">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-gradient-to-r from-amber-600 to-orange-600 rounded-full flex items-center justify-center animate-taxi-pulse-glow">
          <User className="text-black animate-pulse drop-shadow-lg" size={32} />
        </div>
        <h2 className="text-3xl font-bold text-white drop-shadow-lg">
          Vos <span className="text-gradient">Informations</span>
        </h2>
        <p className="text-gray-300 drop-shadow-md">L'IA a besoin de vous connaître pour personnaliser votre offre</p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        <div className="form-field-taxi">
          <label className="block text-sm font-medium text-white mb-2 flex items-center space-x-2">
            <User size={16} className="text-amber-400" />
            <span>Nom et prénom</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/70 border-2 border-gray-600 rounded-xl focus:border-amber-500 focus:ring-0 transition-all duration-300 text-white placeholder-gray-400 backdrop-blur-sm hover:bg-gray-800/70 focus:bg-gray-800/80"
            placeholder="Jean Dupont"
          />
        </div>

        <div className="form-field-taxi">
          <label className="block text-sm font-medium text-white mb-2 flex items-center space-x-2">
            <Mail size={16} className="text-amber-400" />
            <span>Email</span>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateFormData('email', e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/70 border-2 border-gray-600 rounded-xl focus:border-amber-500 focus:ring-0 transition-all duration-300 text-white placeholder-gray-400 backdrop-blur-sm hover:bg-gray-800/70 focus:bg-gray-800/80"
            placeholder="jean@email.com"
          />
        </div>

        <div className="form-field-taxi">
          <label className="block text-sm font-medium text-white mb-2 flex items-center space-x-2">
            <Phone size={16} className="text-amber-400" />
            <span>Téléphone</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateFormData('phone', e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/70 border-2 border-gray-600 rounded-xl focus:border-amber-500 focus:ring-0 transition-all duration-300 text-white placeholder-gray-400 backdrop-blur-sm hover:bg-gray-800/70 focus:bg-gray-800/80"
            placeholder="06 12 34 56 78"
          />
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleNext}
          disabled={!isStepValid(1)}
          className="group relative px-8 py-4 btn-taxi-ai text-black font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <span className="flex items-center space-x-2 drop-shadow-md relative z-10">
            <span>Analyser Mon Profil</span>
            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
          </span>
        </button>
      </div>
    </div>
  );

  const renderActivityStep = () => (
    <div className="space-y-8 animate-fade-in-up">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full flex items-center justify-center animate-taxi-pulse-glow">
          <Car className="text-black animate-bounce drop-shadow-lg" size={32} />
        </div>
        <h2 className="text-3xl font-bold text-white drop-shadow-lg">
          Votre <span className="text-gradient">Activité</span>
        </h2>
        <p className="text-gray-300 drop-shadow-md">Précisez votre situation pour un devis ultra-précis</p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        <div className="form-field-taxi">
          <label className="block text-sm font-medium text-white mb-2 flex items-center space-x-2">
            <MapPin size={16} className="text-amber-400" />
            <span>Ville d'activité</span>
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => updateFormData('city', e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/70 border-2 border-gray-600 rounded-xl focus:border-amber-500 focus:ring-0 transition-all duration-300 text-white placeholder-gray-400 backdrop-blur-sm hover:bg-gray-800/70 focus:bg-gray-800/80"
            placeholder="Paris"
          />
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-white mb-4 flex items-center space-x-2">
            <Shield size={16} className="text-amber-400" />
            <span>Statut professionnel</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'taxi', label: 'Taxi', icon: '🚖' },
              { value: 'vtc', label: 'VTC', icon: '🚗' },
              { value: 'autre', label: 'Autre', icon: '🚐' }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateFormData('status', option.value as any)}
                className={`p-4 rounded-xl border-2 transition-all duration-300 group ${
                  formData.status === option.value
                    ? 'ai-border-active bg-amber-500/20 text-amber-300 scale-105'
                    : 'border-gray-600 hover:border-amber-500/50 hover:bg-gray-800/50 text-gray-300 hover:scale-102'
                }`}
              >
                <div className="text-2xl mb-1 group-hover:animate-bounce">{option.icon}</div>
                <div className="text-sm font-medium">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="form-field-taxi">
          <label className="block text-sm font-medium text-white mb-2 flex items-center space-x-2">
            <Car size={16} className="text-amber-400" />
            <span>Immatriculation (optionnel)</span>
          </label>
          <input
            type="text"
            value={formData.immatriculation}
            onChange={(e) => updateFormData('immatriculation', e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/70 border-2 border-gray-600 rounded-xl focus:border-amber-500 focus:ring-0 transition-all duration-300 text-white placeholder-gray-400 backdrop-blur-sm hover:bg-gray-800/70 focus:bg-gray-800/80"
            placeholder="AB-123-CD"
          />
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={!isStepValid(2)}
          className="group relative px-8 py-4 btn-taxi-ai text-black font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <span className="flex items-center space-x-2 drop-shadow-md relative z-10">
            <Zap className="animate-pulse" size={20} />
            <span>Lancer l'Analyse IA</span>
            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
          </span>
        </button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="text-center space-y-8 animate-fade-in-up">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/30 to-yellow-500/30 rounded-full blur-3xl animate-taxi-pulse"></div>
        <div className="relative w-32 h-32 mx-auto bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full flex items-center justify-center animate-ai-thinking">
          <Zap className="text-black animate-spin drop-shadow-lg" size={48} />
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-4xl font-bold text-white drop-shadow-lg">
          Analyse IA <span className="text-gradient">en Cours...</span>
        </h2>
        
        <div className="space-y-4 max-w-md mx-auto">
          <div className="flex items-center space-x-3 text-left group">
            <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse group-hover:animate-taxi-pulse-glow"></div>
            <span className="text-gray-300">Analyse de votre profil professionnel</span>
          </div>
          <div className="flex items-center space-x-3 text-left group">
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse group-hover:animate-taxi-pulse-glow" style={{ animationDelay: '0.5s' }}></div>
            <span className="text-gray-300">Comparaison avec 50+ assureurs</span>
          </div>
          <div className="flex items-center space-x-3 text-left group">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse group-hover:animate-taxi-pulse-glow" style={{ animationDelay: '1s' }}></div>
            <span className="text-gray-300">Calcul des économies possibles</span>
          </div>
          <div className="flex items-center space-x-3 text-left group">
            <div className="w-3 h-3 bg-amber-600 rounded-full animate-pulse group-hover:animate-taxi-pulse-glow" style={{ animationDelay: '1.5s' }}></div>
            <span className="text-gray-300">Génération de votre offre sur-mesure</span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-900/50 to-yellow-900/50 rounded-2xl p-6 border border-amber-500/40 backdrop-blur-sm animate-taxi-pulse-glow">
          <div className="flex items-center justify-center space-x-2 text-amber-400 mb-2">
            <CheckCircle size={20} />
            <span className="font-semibold drop-shadow-md">Profil Analysé avec Succès</span>
          </div>
          <p className="text-sm text-amber-300 mb-4 drop-shadow-md">
            Notre IA a identifié des opportunités d'économies importantes pour votre profil.
          </p>
          <div className="bg-gradient-to-r from-amber-500/30 to-yellow-500/30 rounded-xl p-4 border border-amber-500/50 taxi-glow">
            <p className="text-amber-300 font-semibold text-center drop-shadow-md">
              🤖 Cependant l'IA est un humain ! Nous vous recontactons sous 15 mins...
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const currentStepData = steps[currentStep];

  return (
    <section id="devis" className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center py-20 taxi-stripe">
      <div className="container-max">
        <div className="max-w-4xl mx-auto">
          {/* Enhanced Progress Bar with Taxi Styling */}
          <div className="mb-12">
            {/* Animated connection lines */}
            <div className="relative flex items-center justify-center space-x-4 mb-8">
              {steps.slice(0, 3).map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 taxi-step-number ${
                    index <= currentStep 
                      ? `bg-gradient-to-r ${step.color} text-black shadow-lg scale-110` 
                      : 'bg-gray-800 text-gray-500 border-2 border-gray-700'
                  }`}
                  style={{ animationDelay: `${index * 0.2}s` }}>
                    {index < currentStep ? (
                      <CheckCircle size={20} className="animate-bounce" />
                    ) : (
                      <span className={index === currentStep ? 'animate-pulse' : ''}>{index + 1}</span>
                    )}
                  </div>
                  {index < 2 && (
                    <div className="relative w-16 h-1 mx-4">
                      <div className="absolute inset-0 bg-gray-700 rounded-full"></div>
                      <div className={`taxi-progress-bar h-full rounded-full transition-all duration-1000 ${
                        index < currentStep ? 'taxi-progress-fill animate-taxi-progress' : 'w-0'
                      }`} 
                      style={{ animationDelay: `${index * 0.5}s` }}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Animated title with scan effect */}
            <div className="text-center relative">
              <div className="absolute inset-0 animate-taxi-stripe opacity-30"></div>
              <h1 className="relative text-2xl font-bold mb-2 text-white drop-shadow-lg">
                {currentStepData.title}
              </h1>
              <p className="text-gray-300 drop-shadow-md">{currentStepData.subtitle}</p>
            </div>
          </div>

          {/* Enhanced Content Card with AI styling */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-3xl blur-xl animate-taxi-pulse"></div>
            <div className="relative ai-border bg-gray-900/95 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl taxi-glow">
              {currentStep === 0 && renderWelcomeStep()}
              {currentStep === 1 && renderIdentityStep()}
              {currentStep === 2 && renderActivityStep()}
              {currentStep === 3 && renderProcessingStep()}
            </div>
          </div>

          {/* Enhanced Trust Indicators with Taxi Theme */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center space-x-6 bg-gray-900/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg border border-amber-500/30 taxi-glow">
              <div className="flex items-center space-x-2 group">
                <Shield className="text-amber-500 group-hover:animate-pulse" size={16} />
                <span className="text-sm font-medium text-gray-200">100% Sécurisé</span>
              </div>
              <div className="flex items-center space-x-2 group">
                <Zap className="text-yellow-500 group-hover:animate-pulse" size={16} />
                <span className="text-sm font-medium text-gray-200">IA Avancée</span>
              </div>
              <div className="flex items-center space-x-2 group">
                <Clock className="text-amber-600 group-hover:animate-pulse" size={16} />
                <span className="text-sm font-medium text-gray-200">Réponse 15min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIQuoteProcess;