import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Phone, Clock, Send, CheckCircle, User, Mail, MapPin, Car } from 'lucide-react';
import { useFormSecurity } from '../hooks/useFormSecurity';
import { useAnalytics } from '../hooks/useAnalytics';
import { logger } from '@/lib/logger';
import { createLead } from '@/lib/leads';

const EnhancedFormLead: React.FC = () => {
  const navigate = useNavigate();
  const { trackFormStart, trackFormSubmit, trackFormComplete } = useAnalytics();
  const { securityState, rateLimitState, validateSecurity, recordAttempt, updateHoneypot, getSecurityPayload } = useFormSecurity();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    status: 'taxi',
    immatriculation: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    // Track form view
    if (typeof gtag !== 'undefined') {
      gtag('event', 'form_view', {
        event_category: 'engagement',
        event_label: 'devis_form'
      });
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (!hasStarted) {
      setHasStarted(true);
      trackFormStart();
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Handle honeypot
    if (name === 'company_website') {
      updateHoneypot(value);
      return;
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.name.length >= 2 && formData.phone.length >= 10;
      case 2:
        return formData.email.includes('@') && formData.city.length >= 2;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep < 3 && validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    logger.log('📋 Form submit started');

    if (rateLimitState.blocked) {
      alert('Trop de tentatives. Veuillez patienter avant de soumettre à nouveau.');
      return;
    }

    // Security validation
    logger.log('🔒 Checking security...');
    const securityCheck = await validateSecurity(formData);
    if (!securityCheck.valid) {
      logger.warn('Security validation failed:', securityCheck.errors);
      return; // Silent fail for bots
    }

    logger.log('✅ Security check passed');
    setIsSubmitting(true);
    recordAttempt();

    try {
      logger.log('📊 Tracking form submit...');
      trackFormSubmit(formData);

      logger.log('🚀 Calling createLead API...');
      const result = await createLead({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        status: formData.status as 'taxi' | 'vtc' | 'autre',
        immatriculation: formData.immatriculation,
        source: 'website'
      });

      logger.log('📥 API response:', result);

      if (result.success) {
        logger.log('✅ Lead created successfully, redirecting...');
        trackFormComplete();
        const tokenParam = result.accessToken ? `?token=${result.accessToken}` : '';
        navigate(`/merci${tokenParam}`);
      } else {
        logger.error('❌ Lead creation failed:', result.error);
        alert(result.error || 'Erreur lors de l\'envoi. Veuillez réessayer.');
      }
    } catch (error) {
      logger.error('💥 Form submission error:', error);
      console.error('Full error details:', error);
      alert('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-6">
      <div className="flex items-center space-x-2">
        {[1, 2, 3].map(step => (
          <div key={step} className="flex items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              step <= currentStep 
                ? 'bg-amber-500 text-black' 
                : 'bg-gray-600 text-gray-600'
            }`}>
              {step < currentStep ? <CheckCircle size={12} /> : step}
            </div>
            {step < 3 && (
              <div className={`w-8 h-0.5 mx-1 transition-all duration-300 ${
                step < currentStep ? 'bg-amber-500' : 'bg-gray-600'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const stepLabels = ['Véhicule', 'Conducteur', 'Validation'];

  return (
    <div className="bg-gray-900/95 backdrop-blur-lg border border-gray-700/70 rounded-2xl p-6 shadow-2xl taxi-glow">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gradient mb-2">
          Devis Gratuit en 2 min
        </h3>
        <p className="text-sm text-gray-300">
          Formulaire sécurisé • Réponse rapide
        </p>
      </div>

      {renderStepIndicator()}
      
      <div className="text-center mb-4">
        <span className="text-xs text-gray-600">
          Étape {currentStep}/3 : {stepLabels[currentStep - 1]}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot field - hidden */}
        <input
          type="text"
          name="company_website"
          value=""
          onChange={handleChange}
          style={{ display: 'none' }}
          tabIndex={-1}
          autoComplete="off"
        />

        {/* Step 1: Vehicle & Status */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                <User size={14} className="inline mr-1" />
                Nom et prénom *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                autoComplete="name"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500 text-gray-900 placeholder-gray-500 text-sm transition-all duration-300"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#111827'
                }}
                placeholder="Jean Dupont"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-white mb-2">
                <Phone size={14} className="inline mr-1" />
                Téléphone *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                autoComplete="tel"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500 text-gray-900 placeholder-gray-500 text-sm transition-all duration-300"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#111827'
                }}
                placeholder="06 12 34 56 78"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-white mb-2">
                <Car size={14} className="inline mr-1" />
                Statut *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500 text-gray-900 text-sm transition-all duration-300"
                style={{
                  colorScheme: 'light',
                  backgroundColor: '#ffffff',
                  color: '#111827'
                }}
              >
                <option value="taxi" style={{ backgroundColor: '#ffffff', color: '#111827' }}>Taxi</option>
                <option value="vtc" style={{ backgroundColor: '#ffffff', color: '#111827' }}>VTC</option>
                <option value="autre" style={{ backgroundColor: '#ffffff', color: '#111827' }}>Autre</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Contact & Location */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                <Mail size={14} className="inline mr-1" />
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500 text-gray-900 placeholder-gray-500 text-sm transition-all duration-300"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#111827'
                }}
                placeholder="jean@email.com"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-white mb-2">
                <MapPin size={14} className="inline mr-1" />
                Ville *
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                autoComplete="address-level2"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500 text-gray-900 placeholder-gray-500 text-sm transition-all duration-300"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#111827'
                }}
                placeholder="Paris"
              />
            </div>

            <div>
              <label htmlFor="immatriculation" className="block text-sm font-medium text-white mb-2">
                Immatriculation (optionnel)
              </label>
              <input
                type="text"
                id="immatriculation"
                name="immatriculation"
                value={formData.immatriculation}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500 text-gray-900 placeholder-gray-500 text-sm transition-all duration-300"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#111827'
                }}
                placeholder="AB-123-CD"
              />
            </div>
          </div>
        )}

        {/* Step 3: Validation */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <h4 className="text-sm font-medium text-white mb-3">Récapitulatif</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nom :</span>
                  <span className="text-white">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Téléphone :</span>
                  <span className="text-white">{formData.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email :</span>
                  <span className="text-white">{formData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ville :</span>
                  <span className="text-white">{formData.city}</span>
                </div>
              </div>
            </div>

            <div className="bg-green-900/30 p-3 rounded-lg border border-green-700/50">
              <div className="flex items-center space-x-2 text-green-300 text-sm">
                <Shield size={14} />
                <span>Formulaire sécurisé • Données protégées</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors text-sm"
            >
              Précédent
            </button>
          )}
          
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!validateStep(currentStep)}
              className="ml-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-600 text-black font-medium rounded-lg transition-colors text-sm"
            >
              Suivant
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || rateLimitState.blocked}
              className="ml-auto px-6 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:bg-gray-700 disabled:text-gray-600 text-black font-bold rounded-lg transition-all duration-300 flex items-center space-x-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  <span>Envoi...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>OBTENIR MON DEVIS</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Legal notice */}
        <div className="mt-4 text-xs text-gray-600 text-center">
          En soumettant ce formulaire, j'accepte d'être recontacté pour mon devis.
          <br />
          <a href="/politique-confidentialite" className="text-amber-600 hover:underline">
            Politique de confidentialité
          </a>
        </div>
      </form>

      {/* Trust indicators */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-center space-x-4 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <CheckCircle size={12} className="text-green-400" />
            <span>Gratuit</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock size={12} className="text-yellow-500" />
            <span>2 min</span>
          </div>
          <div className="flex items-center space-x-1">
            <Shield size={12} className="text-yellow-400" />
            <span>Sécurisé</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedFormLead;