import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';

interface FormData {
  companyName: string;
  siret: string;
  contactName: string;
  email: string;
  phone: string;
  annualRevenue: string;
  yearsExperience: string;
  employeesCount: string;
  installationTypes: string[];
  annualInstallations: string;
  message: string;
}

function QuotePage() {
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    siret: '',
    contactName: '',
    email: '',
    phone: '',
    annualRevenue: '',
    yearsExperience: '',
    employeesCount: '',
    installationTypes: [],
    annualInstallations: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      installationTypes: checked
        ? [...prev.installationTypes, value]
        : prev.installationTypes.filter(type => type !== value)
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const { error } = await supabase.from('quote_requests').insert([
        {
          company_name: formData.companyName,
          siret: formData.siret,
          contact_name: formData.contactName,
          email: formData.email,
          phone: formData.phone,
          annual_revenue: parseFloat(formData.annualRevenue) || 0,
          years_experience: parseInt(formData.yearsExperience) || 0,
          employees_count: parseInt(formData.employeesCount) || 0,
          installation_types: formData.installationTypes,
          annual_installations: parseInt(formData.annualInstallations) || 0,
          message: formData.message,
          status: 'pending',
        },
      ]);

      if (error) throw error;

      setSubmitStatus('success');
      setFormData({
        companyName: '',
        siret: '',
        contactName: '',
        email: '',
        phone: '',
        annualRevenue: '',
        yearsExperience: '',
        employeesCount: '',
        installationTypes: [],
        annualInstallations: '',
        message: '',
      });
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="section-title">Demande de Devis RC Décennale</h1>
            <p className="text-gray-600 text-lg">
              Remplissez le formulaire ci-dessous pour recevoir votre devis personnalisé
            </p>
          </div>

          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-green-800">
                  Votre demande a été envoyée avec succès ! Nous vous contacterons dans les plus brefs délais.
                </p>
              </div>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-800">
                  Une erreur est survenue: {errorMessage}. Veuillez réessayer.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="card space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Informations sur votre entreprise</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'entreprise <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                    className="input-field"
                    placeholder="Votre entreprise"
                  />
                </div>

                <div>
                  <label htmlFor="siret" className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro SIRET <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="siret"
                    name="siret"
                    value={formData.siret}
                    onChange={handleChange}
                    required
                    pattern="[0-9]{14}"
                    className="input-field"
                    placeholder="14 chiffres"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Coordonnées du contact</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom et prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="contactName"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleChange}
                    required
                    className="input-field"
                    placeholder="Jean Dupont"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="input-field"
                      placeholder="contact@exemple.fr"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="input-field"
                      placeholder="0123456789"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Détails de l'activité</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="annualRevenue" className="block text-sm font-medium text-gray-700 mb-1">
                      Chiffre d'affaires annuel (€)
                    </label>
                    <input
                      type="number"
                      id="annualRevenue"
                      name="annualRevenue"
                      value={formData.annualRevenue}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="150000"
                    />
                  </div>

                  <div>
                    <label htmlFor="yearsExperience" className="block text-sm font-medium text-gray-700 mb-1">
                      Années d'expérience
                    </label>
                    <input
                      type="number"
                      id="yearsExperience"
                      name="yearsExperience"
                      value={formData.yearsExperience}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="5"
                    />
                  </div>

                  <div>
                    <label htmlFor="employeesCount" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre d'employés
                    </label>
                    <input
                      type="number"
                      id="employeesCount"
                      name="employeesCount"
                      value={formData.employeesCount}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Types d'installations réalisées
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        value="residential"
                        checked={formData.installationTypes.includes('residential')}
                        onChange={handleCheckboxChange}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-gray-700">Résidentiel (maisons individuelles)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        value="commercial"
                        checked={formData.installationTypes.includes('commercial')}
                        onChange={handleCheckboxChange}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-gray-700">Commercial (bâtiments professionnels)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        value="industrial"
                        checked={formData.installationTypes.includes('industrial')}
                        onChange={handleCheckboxChange}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-gray-700">Industriel (usines, entrepôts)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="annualInstallations" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre d'installations par an
                  </label>
                  <input
                    type="number"
                    id="annualInstallations"
                    name="annualInstallations"
                    value={formData.annualInstallations}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="20"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message complémentaire
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                className="input-field"
                placeholder="Informations supplémentaires, besoins spécifiques..."
              ></textarea>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Envoi en cours...' : 'Demander mon devis gratuit'}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                En soumettant ce formulaire, vous acceptez d'être contacté par nos services
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default QuotePage;
