import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Phone, Clock, Send } from 'lucide-react';

const FormLead: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    status: 'taxi',
    immatriculation: '',
    company: '' // Honeypot field
  });

  const [startTime] = useState(Date.now());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Anti-spam checks
    if (formData.company) return; // Honeypot check
    if (Date.now() - startTime < 1000) return; // Minimum 1 second delay
    
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/lead.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (response.ok && (result.success || result.ok)) {
        // Track conversion
        if (typeof gtag !== 'undefined') {
          gtag('event', 'conversion', {
            event_category: 'lead',
            event_label: 'form_submission'
          });
        }
        // Redirection vers page de remerciement
        window.location.href = '/merci';
      } else {
        console.error('Form error:', result);
        alert(result.error || 'Erreur lors de l\'envoi. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Erreur de connexion. Veuillez vérifier votre connexion internet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="devis" className="section-padding section-darker taxi-stripe" data-form="devis">
      <div className="container-max">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">
              Demandez Votre Devis Gratuit et Personnalisé
            </h2>
            <p className="text-xl text-gray-200 mb-8 drop-shadow-md">
              🤖 Formulaire IA express → Analyse personnalisée → Offre sur-mesure
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
            <form onSubmit={handleSubmit} className="space-y-6 lead-form" data-form="devis">
              {/* Honeypot field - hidden */}
              <input
                type="text"
                name="company"
                value={formData.company}
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
                    required
                    className="dark-input w-full px-4 py-3 rounded-lg transition-all duration-300"
                    placeholder="Ex: Jean Dupont"
                  />
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
                    required
                    className="dark-input w-full px-4 py-3 rounded-lg transition-all duration-300"
                    placeholder="Ex: 06 12 34 56 78"
                  />
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
                    required
                    className="dark-input w-full px-4 py-3 rounded-lg transition-all duration-300"
                    placeholder="Ex: jean@email.com"
                  />
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
                    required
                    className="dark-input w-full px-4 py-3 rounded-lg transition-all duration-300"
                    placeholder="Ex: Paris"
                  />
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
                    required
                    className="dark-input w-full px-4 py-3 rounded-lg transition-all duration-300"
                  >
                    <option value="taxi">Taxi</option>
                    <option value="vtc">VTC</option>
                    <option value="autre">Autre</option>
                  </select>
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

export default FormLead;