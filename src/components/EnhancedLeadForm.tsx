import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Phone, Clock, Send, CheckCircle, AlertTriangle, MapPin, User, Mail } from 'lucide-react';
import { SecureLeadSchema, SecureLead, BrowserFingerprint, BehaviorAnalyzer, RateLimiter } from '../lib/security';
import { ConversionTracker, FormOptimizer, SmartPrefill, ExitIntentDetector } from '../lib/conversion';
import { submitSecureLead } from '../lib/email';
import Card from './Card';
import { logger } from '@/lib/logger';

interface EnhancedLeadFormProps {
  variant?: 'default' | 'minimal' | 'detailed';
  city?: string;
  service?: string;
}

const EnhancedLeadForm: React.FC<EnhancedLeadFormProps> = ({ 
  variant = 'default',
  city,
  service = 'assurance-taxi'
}) => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [showExitIntent, setShowExitIntent] = useState(false);
  
  const [formData, setFormData] = useState<SecureLead>({
    name: '',
    email: '',
    phone: '',
    status: 'taxi',
    city: city || '',
    immatriculation: '',
    honeypot: '',
    fingerprint: '',
    behaviorScore: 0,
    timeOnPage: 0
  });

  const [formStartTime] = useState(Date.now());
  const [behaviorAnalyzer] = useState(new BehaviorAnalyzer());
  const [validationState, setValidationState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Initialize security components
    initializeSecurity();
    
    // Track form start
    ConversionTracker.track('form_start', { service, city });
    
    // Setup exit intent
    ExitIntentDetector.onExitIntent(() => {
      if (!isSubmitting && !showExitIntent) {
        setShowExitIntent(true);
      }
    });

    // Prefill with smart data
    prefillSmartData();

    // Track behavior
    setupBehaviorTracking();

    return () => {
      ExitIntentDetector.disable();
    };
  }, []);

  const initializeSecurity = async () => {
    const fingerprint = await BrowserFingerprint.getInstance().generateFingerprint();
    setFormData(prev => ({ ...prev, fingerprint }));
  };

  const prefillSmartData = async () => {
    const { previousFormData } = SmartPrefill.detectUserIntent();
    const locationData = await SmartPrefill.getLocationData();
    
    if (previousFormData) {
      setFormData(prev => ({ ...prev, ...previousFormData }));
    }
    
    if (locationData.city && !formData.city) {
      setFormData(prev => ({ ...prev, city: locationData.city || '' }));
    }
  };

  const setupBehaviorTracking = () => {
    const events = ['mousemove', 'click', 'scroll', 'keydown', 'focus', 'blur'];
    
    events.forEach(eventType => {
      document.addEventListener(eventType, (e) => {
        behaviorAnalyzer.trackEvent(eventType, {
          target: (e.target as Element)?.tagName,
          timestamp: Date.now()
        });
      });
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Real-time validation
    validateField(name, value);
    
    // Track field interaction
    FormOptimizer.trackFieldInteraction(name, 'focus');
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Auto-save to localStorage
    localStorage.setItem('taxiassur_form_data', JSON.stringify({ ...formData, [name]: value }));
  };

  const validateField = (name: string, value: string) => {
    try {
      const fieldSchema = SecureLeadSchema.shape[name as keyof SecureLead];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setValidationState(prev => ({ ...prev, [name]: true }));
      }
    } catch {
      setValidationState(prev => ({ ...prev, [name]: false }));
    }
  };

  const validateForm = (): boolean => {
    const timeOnPage = Date.now() - formStartTime;
    const behaviorScore = behaviorAnalyzer.getBehaviorScore();
    
    const completeFormData = {
      ...formData,
      timeOnPage,
      behaviorScore
    };

    try {
      SecureLeadSchema.parse(completeFormData);
      setErrors({});
      return true;
    } catch (error: any) {
      const newErrors: Record<string, string> = {};
      
      if (error.errors) {
        error.errors.forEach((err: any) => {
          const field = err.path[0];
          newErrors[field] = err.message;
        });
      }
      
      setErrors(newErrors);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      ConversionTracker.track('form_error', { errors: Object.keys(errors) });
      return;
    }
    
    // Rate limiting check
    const userIP = await getUserIP();
    if (!RateLimiter.canSubmit(userIP)) {
      alert('Trop de tentatives. Veuillez patienter avant de soumettre à nouveau.');
      return;
    }
    
    // Anti-spam final check (honeypot uniquement)
    if (formData.honeypot) {
      ConversionTracker.track('spam_blocked');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const timeOnPage = Date.now() - formStartTime;
      const behaviorScore = behaviorAnalyzer.getBehaviorScore();
      
      const completeFormData = {
        ...formData,
        timeOnPage,
        behaviorScore
      };

      const result = await submitSecureLead(completeFormData);
      
      if (result.success) {
        RateLimiter.recordSubmission(userIP);
        ConversionTracker.track('form_complete', { service, city });

        localStorage.removeItem('taxiassur_form_data');

        const tokenParam = result.accessToken ? `?token=${result.accessToken}` : '';
        navigate(`/merci${tokenParam}`);
      } else {
        ConversionTracker.track('form_server_error', { error: result.error });
        alert(result.error || 'Erreur lors de l\'envoi. Veuillez réessayer.');
      }
    } catch (error) {
      logger.error('Form submission error:', error);
      ConversionTracker.track('form_network_error');
      alert('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUserIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      ConversionTracker.track('form_step_advance', { step: currentStep + 1 });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map(step => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
              step <= currentStep 
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {step < currentStep ? <CheckCircle size={16} /> : step}
            </div>
            {step < 3 && (
              <div className={`w-12 h-1 mx-2 transition-all duration-300 ${
                step < currentStep ? 'bg-amber-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Vos Informations</h3>
        <p className="text-gray-600">Commençons par vous connaître</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="form-field-enhanced">
          <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
            <User size={16} className="inline mr-2" />
            Nom et prénom *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            autoComplete="name"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 ${
              errors.name ? 'border-red-500' : validationState.name ? 'border-green-500' : 'border-orange-200'
            }`}
            placeholder={FormOptimizer.generateDynamicPlaceholders('name')}
          />
          {validationState.name && (
            <CheckCircle className="absolute right-3 top-9 text-green-500" size={16} />
          )}
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div className="form-field-enhanced">
          <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
            <Phone size={16} className="inline mr-2" />
            Téléphone *
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            autoComplete="tel"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 ${
              errors.phone ? 'border-red-500' : validationState.phone ? 'border-green-500' : 'border-orange-200'
            }`}
            placeholder={FormOptimizer.generateDynamicPlaceholders('phone')}
          />
          {validationState.phone && (
            <CheckCircle className="absolute right-3 top-9 text-green-500" size={16} />
          )}
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
        </div>
      </div>

      <div className="form-field-enhanced">
        <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
          <Mail size={16} className="inline mr-2" />
          Email *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 ${
            errors.email ? 'border-red-500' : validationState.email ? 'border-green-500' : 'border-orange-200'
          }`}
          placeholder={FormOptimizer.generateDynamicPlaceholders('email')}
        />
        {validationState.email && (
          <CheckCircle className="absolute right-3 top-9 text-green-500" size={16} />
        )}
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Votre Activité</h3>
        <p className="text-gray-600">Précisez votre situation professionnelle</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="form-field-enhanced">
          <label htmlFor="city" className="block text-sm font-semibold text-gray-900 mb-2">
            <MapPin size={16} className="inline mr-2" />
            Ville d'activité *
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            autoComplete="address-level2"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 ${
              errors.city ? 'border-red-500' : validationState.city ? 'border-green-500' : 'border-orange-200'
            }`}
            placeholder={FormOptimizer.generateDynamicPlaceholders('city', city)}
          />
          {validationState.city && (
            <CheckCircle className="absolute right-3 top-9 text-green-500" size={16} />
          )}
          {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-semibold text-gray-900 mb-2">
            Statut professionnel *
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 ${
              errors.status ? 'border-red-500' : 'border-orange-200'
            }`}
          >
            <option value="taxi">Taxi (licence préfecture)</option>
            <option value="vtc">VTC (carte professionnelle)</option>
            <option value="autre">Autre transport de personnes</option>
          </select>
          {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="immatriculation" className="block text-sm font-semibold text-gray-900 mb-2">
          Immatriculation véhicule (optionnel)
        </label>
        <input
          type="text"
          id="immatriculation"
          name="immatriculation"
          value={formData.immatriculation}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
          placeholder={FormOptimizer.generateDynamicPlaceholders('immatriculation')}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Confirmation</h3>
        <p className="text-gray-600">Vérifiez vos informations avant envoi</p>
      </div>

      <div className="bg-white border border-yellow-100 p-6 rounded-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">Nom :</span>
            <p className="font-semibold text-gray-900">{formData.name}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Téléphone :</span>
            <p className="font-semibold text-gray-900">{formData.phone}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Email :</span>
            <p className="font-semibold text-gray-900">{formData.email}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Ville :</span>
            <p className="font-semibold text-gray-900">{formData.city}</p>
          </div>
        </div>
      </div>

      {/* Trust signals */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="text-green-600" size={24} />
          <h4 className="font-bold text-green-900">Vos Garanties TaxiAssur</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle className="text-green-600" size={16} />
            <span>Devis 100% gratuit et sans engagement</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="text-green-600" size={16} />
            <span>Réponse sous 15 minutes garantie</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="text-green-600" size={16} />
            <span>Données sécurisées et confidentielles</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="text-green-600" size={16} />
            <span>Courtier agréé ORIAS 11 061 425</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Exit intent popup
  const ExitIntentPopup = () => (
    showExitIntent && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="max-w-md mx-4 p-8 text-center">
          <div className="mb-6">
            <AlertTriangle className="mx-auto mb-4 text-amber-500" size={48} />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Attendez ! Ne Partez Pas Sans Votre Devis
            </h3>
            <p className="text-gray-600">
              Obtenez votre devis gratuit en 30 secondes. 
              Nos clients économisent en moyenne 580€/an !
            </p>
          </div>
          
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => {
                setShowExitIntent(false);
                document.getElementById('name')?.focus();
              }}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-all duration-300"
            >
              Obtenir Mon Devis Gratuit
            </button>
            <button
              onClick={() => setShowExitIntent(false)}
              className="text-gray-600 hover:text-orange-600 text-sm"
            >
              Continuer sans devis
            </button>
          </div>
        </Card>
      </div>
    )
  );

  return (
    <>
      <section id="devis" className="section-padding bg-gradient-to-br from-gray-50 to-white">
        <div className="container-max">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Demandez Votre Devis Gratuit et Personnalisé
                {city && <span className="block text-amber-600 mt-2">Spécial {city}</span>}
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Formulaire sécurisé → Analyse personnalisée → Offre sur-mesure
              </p>
              
              {/* Trust indicators */}
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8 mb-8">
                <div className="flex items-center space-x-2">
                  <Shield className="text-green-600" size={20} />
                  <span className="text-sm text-gray-700 font-semibold">100% Gratuit</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="text-yellow-600" size={20} />
                  <span className="text-sm text-gray-700 font-semibold">Réponse Rapide</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="text-orange-600" size={20} />
                  <span className="text-sm text-gray-700 font-semibold">Service Pro</span>
                </div>
              </div>
            </div>

            {/* Form */}
            <Card className="max-w-2xl mx-auto" padding="lg">
              <form ref={formRef} onSubmit={handleSubmit}>
                {/* Honeypot field - hidden */}
                <input
                  type="text"
                  name="honeypot"
                  value={formData.honeypot}
                  onChange={handleChange}
                  style={{ display: 'none' }}
                  tabIndex={-1}
                  autoComplete="off"
                />

                {variant === 'detailed' ? (
                  <>
                    {renderStepIndicator()}
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                    
                    <div className="flex justify-between mt-8">
                      {currentStep > 1 && (
                        <button
                          type="button"
                          onClick={prevStep}
                          className="px-6 py-3 border border-orange-200 text-gray-700 rounded-lg hover:bg-white border border-yellow-100 transition-colors"
                        >
                          Précédent
                        </button>
                      )}
                      
                      {currentStep < 3 ? (
                        <button
                          type="button"
                          onClick={nextStep}
                          disabled={currentStep === 1 && (!formData.name || !formData.phone || !formData.email)}
                          className="ml-auto px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition-colors disabled:opacity-50"
                        >
                          Suivant
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="ml-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold rounded-lg transition-all duration-300 flex items-center space-x-2"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                              <span>Envoi...</span>
                            </>
                          ) : (
                            <>
                              <Send size={20} />
                              <span>ENVOYER MON DEVIS</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  // Single step form for minimal variant
                  <div className="space-y-6">
                    {renderStep1()}
                    {renderStep2()}
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold text-lg rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                          <span>Envoi en cours...</span>
                        </>
                      ) : (
                        <>
                          <Send size={20} />
                          <span>DEMANDER MON DEVIS PERSONNALISÉ</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Legal consent */}
                <div className="mt-6 bg-white border border-yellow-100 p-4 rounded-lg border border-yellow-200">
                  <p className="text-xs text-gray-600">
                    En soumettant ce formulaire, j'accepte d'être recontacté par TaxiAssur.com 
                    pour recevoir mon devis personnalisé. Données sécurisées selon notre 
                    <a href="/politique-confidentialite" className="text-amber-600 hover:underline"> politique de confidentialité</a>.
                    Aucun spam, désinscription facile.
                  </p>
                </div>

                <p className="text-center text-sm text-gray-600 mt-4">
                  🔒 Formulaire sécurisé • ⚡ Réponse sous 15min • 🎯 Devis sur-mesure
                </p>
              </form>
            </Card>
          </div>
        </div>
      </section>

      <ExitIntentPopup />
    </>
  );
};

export default EnhancedLeadForm;