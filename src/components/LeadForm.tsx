import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Phone, Clock, Send } from 'lucide-react';
import { LeadSchema, Lead } from '../lib/schema';
import { trackLeadSubmission } from '../lib/email';
import Card from './Card';
import { logger } from '@/lib/logger';
import { createLead } from '@/lib/leads';

const LeadForm: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Lead>({
    name: '',
    email: '',
    phone: '',
    status: 'taxi',
    city: '',
    immatriculation: '',
    honeypot: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    try {
      LeadSchema.parse(formData);
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

    logger.log('📋 LeadForm submit started');

    if (!validateForm()) {
      logger.warn('❌ Form validation failed');
      return;
    }

    // Anti-spam check
    if (formData.honeypot) {
      logger.warn('🚫 Honeypot triggered');
      return;
    }

    setIsSubmitting(true);

    try {
      logger.log('🚀 Creating lead...');
      const result = await createLead({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        status: formData.status as 'taxi' | 'vtc' | 'autre',
        immatriculation: formData.immatriculation || '',
        source: 'website'
      });

      logger.log('📥 Result:', result);

      if (result.success) {
        logger.log('✅ Success, redirecting...');
        trackLeadSubmission(formData);
        const tokenParam = result.accessToken ? `?token=${result.accessToken}` : '';
        window.location.href = `/merci${tokenParam}`;
      } else {
        logger.error('❌ Lead creation failed:', result.error);
        alert(result.error || 'Erreur lors de l\'envoi. Veuillez réessayer.');
      }
    } catch (error) {
      logger.error('💥 Form submission error:', error);
      console.error('Full error:', error);
      alert('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="devis" className="section-padding section-darker taxi-stripe">
      <div className="container-max">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">
              Demandez Votre Devis Gratuit et Personnalisé
            </h2>
            <p className="text-xl text-gray-200 mb-8 drop-shadow-md">
              🤖 Formulaire IA sécurisé → Analyse personnalisée → Offre sur-mesure
            </p>
            
            {/* Trust indicators */}
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8 mb-8">
              <div className="flex items-center space-x-2">
                <Shield className="text-green-400 drop-shadow-lg" size={20} />
                <span className="text-sm text-gray-200 font-semibold drop-shadow-md">100% Gratuit</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="text-yellow-400 drop-shadow-lg" size={20} />
                <span className="text-sm text-gray-200 font-semibold drop-shadow-md">Réponse Rapide</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="text-yellow-500 drop-shadow-lg" size={20} />
                <span className="text-sm text-gray-200 font-semibold drop-shadow-md">Service Pro</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="max-w-2xl mx-auto ai-card p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-white mb-2">
                    Nom et prénom *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    autoComplete="name"
                    className={`dark-input w-full px-4 py-3 rounded-lg transition-all duration-300 ${
                      errors.name ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    placeholder="Ex: Jean Dupont"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-white mb-2">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                    className={`dark-input w-full px-4 py-3 rounded-lg transition-all duration-300 ${
                      errors.phone ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    placeholder="Ex: 06 12 34 56 78"
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    className={`dark-input w-full px-4 py-3 rounded-lg transition-all duration-300 ${
                      errors.email ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    placeholder="Ex: jean@email.com"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-semibold text-white mb-2">
                    Ville *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    autoComplete="address-level2"
                    className={`dark-input w-full px-4 py-3 rounded-lg transition-all duration-300 ${
                      errors.city ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    placeholder="Ex: Paris"
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="status" className="block text-sm font-semibold text-white mb-2">
                    Statut *
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className={`dark-input w-full px-4 py-3 rounded-lg transition-all duration-300 ${
                      errors.status ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                  >
                    <option value="taxi">Taxi</option>
                    <option value="vtc">VTC</option>
                    <option value="autre">Autre</option>
                  </select>
                  {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status}</p>}
                </div>

                <div>
                  <label htmlFor="immatriculation" className="block text-sm font-semibold text-white mb-2">
                    Immatriculation (optionnel)
                  </label>
                  <input
                    type="text"
                    id="immatriculation"
                    name="immatriculation"
                    value={formData.immatriculation}
                    onChange={handleChange}
                    className="dark-input w-full px-4 py-3 rounded-lg transition-all duration-300"
                    placeholder="Ex: AB-123-CD"
                  />
                </div>
              </div>

              {/* Legal consent */}
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 backdrop-blur-sm">
                <p className="text-xs text-gray-600">
                  En soumettant ce formulaire, j'accepte d'être recontacté par TaxiAssur.com 
                  pour recevoir mon devis personnalisé. Données sécurisées selon notre 
                  <a href="/politique-confidentialite" className="text-amber-600 hover:underline"> politique de confidentialité</a>.
                </p>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center space-x-2 ${
                  isSubmitting 
                    ? 'bg-gray-700 cursor-not-allowed text-gray-600' 
                    : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black shadow-xl hover:shadow-amber-500/25 transform hover:scale-105'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>DEMANDER MON DEVIS PERSONNALISÉ</span>
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-600">
                Réponse rapide de votre conseiller dédié
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LeadForm;