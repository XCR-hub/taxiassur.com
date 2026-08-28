import { useSearchParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Shield, Calendar, Lock, CreditCard, Car, X, Check, AlertCircle, Loader2, CreditCard as Edit2, Save, Building2 } from 'lucide-react';
import ClientLayout from '../../components/client/ClientLayout';
import SEOHead from '../../components/SEOHead';
import { getClientAccessToken } from '@/lib/client-access';
import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { createClientPortalRequest } from '@/lib/client-requests';
import { loadClientPlatformSession } from '@/lib/client-platform-api';

export default function ClientProfil() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const accessToken = getClientAccessToken(searchParams.get('token'));
  const [userData, setUserData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showRibModal, setShowRibModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [addressForm, setAddressForm] = useState({
    street: '',
    postal_code: '',
    city: '',
    country: 'France'
  });

  const [ribForm, setRibForm] = useState({
    iban: '',
    bic: '',
    account_holder: ''
  });

  const [vehicleForm, setVehicleForm] = useState({
    license_plate: '',
    brand: '',
    model: '',
    year: '',
    reason: ''
  });

  useEffect(() => {
    if (!accessToken) {
      navigate('/espace-client');
      return;
    }

    loadUserData();
  }, [accessToken, navigate]);

  const requireLeadId = () => {
    const leadId = userData?.lead_id;
    if (typeof leadId === 'string' && leadId.trim()) {
      return leadId;
    }
    throw new Error('Dossier client introuvable');
  };
  const loadUserData = async () => {
    setLoading(true);
    try {
      const session = await loadClientPlatformSession(accessToken);
      const data = { ...session.lead, ...session.user };
      if (session.ok) {
        setUserData(data);
        setAddressForm({
          street: data.address || '',
          postal_code: data.postal_code || '',
          city: data.city || '',
          country: 'France'
        });
        setRibForm({
          iban: '',
          bic: '',
          account_holder: data.full_name || ''
        });
      }
    } catch (error) {
      logger.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSubmit = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const leadId = requireLeadId();
      await createClientPortalRequest({
        accessToken,
        requestType: 'address_change',
        title: 'Changement adresse',
        description: 'Demande de changement adresse depuis le profil client.',
        priority: 'normal',
        source: 'client_profile',
        newData: {
          lead_id: leadId,
          old_data: {
            street: userData?.address || '',
            postal_code: userData?.postal_code || '',
            city: userData?.city || '',
          },
          requested_address: addressForm,
        },
      });

      setSuccessMessage('Demande de changement d\'adresse envoyee. Notre equipe la traitera sous 48h.');
      setShowAddressModal(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      logger.error('Error:', error);
      setErrorMessage('Erreur lors de l\'envoi de la demande');
    } finally {
      setSaving(false);
    }
  };

  const handleRibSubmit = async () => {
    setSaving(true);
    setErrorMessage(null);

    const ibanRegex = /^FR[0-9]{2}[A-Z0-9]{23}$/;
    const cleanIban = ribForm.iban.replace(/\s/g, '').toUpperCase();

    if (!ibanRegex.test(cleanIban)) {
      setErrorMessage('Format IBAN invalide. Ex: FR76 3000 6000 0112 3456 7890 189');
      setSaving(false);
      return;
    }

    try {
      const leadId = requireLeadId();
      await createClientPortalRequest({
        accessToken,
        requestType: 'payment_change',
        title: 'Changement RIB',
        description: 'Demande de changement de coordonnees bancaires depuis le profil client.',
        priority: 'high',
        source: 'client_profile',
        newData: {
          lead_id: leadId,
          old_data: {
            iban: userData?.iban ? '****' + String(userData.iban).slice(-4) : null,
            bic: userData?.bic || null,
          },
          requested_bank_details: {
            ...ribForm,
            iban: cleanIban,
          },
        },
      });

      setSuccessMessage('Demande de changement de RIB envoyee. Verification sous 48h.');
      setShowRibModal(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      logger.error('Error:', error);
      setErrorMessage('Erreur lors de l\'envoi de la demande');
    } finally {
      setSaving(false);
    }
  };

  const handleVehicleSubmit = async () => {
    setSaving(true);
    setErrorMessage(null);

    if (!vehicleForm.license_plate || !vehicleForm.brand || !vehicleForm.model) {
      setErrorMessage('Veuillez remplir tous les champs obligatoires');
      setSaving(false);
      return;
    }

    try {
      const leadId = requireLeadId();
      await createClientPortalRequest({
        accessToken,
        requestType: 'vehicle_change',
        title: 'Changement vehicule',
        description: 'Demande de changement de vehicule depuis le profil client. Un avenant peut etre necessaire.',
        priority: 'high',
        source: 'client_profile',
        newData: {
          lead_id: leadId,
          old_data: {
            vehicle: userData?.vehicle_info || null,
            immatriculation: userData?.immatriculation || null,
          },
          requested_vehicle: vehicleForm,
        },
      });

      setSuccessMessage('Demande de changement de vehicule envoyee. Un avenant sera etabli sous 48h.');
      setShowVehicleModal(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      logger.error('Error:', error);
      setErrorMessage('Erreur lors de l\'envoi de la demande');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ClientLayout email={String(userData?.email || '')}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-yellow-600 animate-spin" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <>
      <SEOHead
        title="Mon Profil - Espace Client TaxiAssur"
        description="Gerez votre profil et vos parametres"
        noIndex={true}
      />

      <ClientLayout email={String(userData?.email || '')}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon Profil</h1>
            <p className="text-gray-600">
              Gerez vos informations personnelles et parametres de compte
            </p>
          </div>

          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-800">{successMessage}</p>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{errorMessage}</p>
            </div>
          )}

          <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-xl p-6 text-black">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-black/10 rounded-full flex items-center justify-center">
                <User size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {userData?.full_name || (userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : 'Client TaxiAssur')}
                </h2>
                <p className="text-sm opacity-90">
                  Membre depuis {userData?.created_at ? new Date(userData.created_at).getFullYear() : new Date().getFullYear()}
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Informations Personnelles</h2>
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                  title="Modifier"
                >
                  <Edit2 size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <User size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Nom Complet</div>
                    <div className="font-semibold text-gray-900">
                      {userData?.full_name || (userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : 'Non renseigne')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Email</div>
                    <div className="font-semibold text-gray-900">{String(userData?.email || '')}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Telephone</div>
                    <div className="font-semibold text-gray-900">
                      {userData?.phone || 'Non renseigne'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Adresse</div>
                    <div className="font-semibold text-gray-900">
                      {[userData?.address, userData?.postal_code, userData?.city].filter(Boolean).join(', ') || 'Non renseignee'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowAddressModal(true)}
                  className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg font-semibold transition-all"
                >
                  Modifier mes Informations
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Contrat d'Assurance</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Shield size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Numero de Police</div>
                    <div className="font-semibold text-gray-900">
                      {userData?.lead_id ? `REF-${String(userData.lead_id).substring(0, 8).toUpperCase()}` : 'En cours'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Date de signature</div>
                    <div className="font-semibold text-gray-900">
                      {userData?.contract_signed_at
                        ? new Date(userData.contract_signed_at).toLocaleDateString('fr-FR')
                        : 'En attente'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CreditCard size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Etape dossier</div>
                    <div className="font-semibold text-gray-900">
                      {userData?.pipeline_stage || userData?.current_stage_key || 'En cours de traitement'}
                    </div>
                  </div>
                </div>

                <div className={`mt-4 p-4 rounded-lg border ${userData?.contract_signed ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className={`flex items-center gap-2 ${userData?.contract_signed ? 'text-green-700' : 'text-yellow-700'}`}>
                    <Shield size={16} />
                    <span className="font-semibold text-sm">
                      {userData?.contract_signed ? 'Contrat Signe' : 'Dossier en cours'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Coordonnees Bancaires</h2>
                <button
                  onClick={() => setShowRibModal(true)}
                  className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                  title="Modifier"
                >
                  <Edit2 size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">IBAN</div>
                    <div className="font-semibold text-gray-900 font-mono">
                      {userData?.iban ? '****' + userData.iban.slice(-4) : 'Non renseigne'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CreditCard size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">BIC</div>
                    <div className="font-semibold text-gray-900">
                      {userData?.bic || 'Non renseigne'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowRibModal(true)}
                  className="w-full mt-4 px-4 py-2 border border-yellow-500 text-yellow-700 hover:bg-yellow-50 rounded-lg font-semibold transition-all"
                >
                  Modifier mon RIB
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Mon Vehicule</h2>
                <button
                  onClick={() => setShowVehicleModal(true)}
                  className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                  title="Modifier"
                >
                  <Edit2 size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Car size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Vehicule Assure</div>
                    <div className="font-semibold text-gray-900">
                      {userData?.company_name ? `Taxi assuré via ${userData.company_name}` : 'Non renseigne'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Immatriculation</div>
                    <div className="font-semibold text-gray-900 font-mono">
                      {userData?.immatriculation || 'XX-XXX-XX'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowVehicleModal(true)}
                  className="w-full mt-4 px-4 py-2 border border-yellow-500 text-yellow-700 hover:bg-yellow-50 rounded-lg font-semibold transition-all"
                >
                  Declarer un Changement de Vehicule
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Securite</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock size={20} className="text-gray-600" />
                  <div>
                    <div className="font-semibold text-gray-900">Mot de Passe</div>
                    <div className="text-sm text-gray-600">Derniere modification : 15/12/2024</div>
                  </div>
                </div>
                <button className="px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-semibold text-sm transition-all">
                  Modifier
                </button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-gray-600" />
                  <div>
                    <div className="font-semibold text-gray-900">Authentification a Deux Facteurs</div>
                    <div className="text-sm text-gray-600">Securite renforcee</div>
                  </div>
                </div>
                <button className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg font-semibold text-sm transition-all">
                  Activer
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h3 className="font-bold text-gray-900 mb-2">Besoin d'aide avec votre compte ?</h3>
            <p className="text-gray-700 mb-4">
              Notre equipe support est la pour vous aider avec toutes vos questions.
            </p>
            <a
              href="tel:0180855786"
              className="inline-block px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg font-semibold text-sm transition-all"
            >
              Contacter le Support
            </a>
          </div>
        </div>
      </ClientLayout>

      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Modifier mon Adresse</h3>
              <button
                onClick={() => setShowAddressModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={addressForm.street}
                  onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                  placeholder="123 rue de la Paix"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code Postal</label>
                  <input
                    type="text"
                    value={addressForm.postal_code}
                    onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                    placeholder="75001"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    placeholder="Paris"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    Un changement d'adresse peut impacter votre prime d'assurance. Notre equipe vous contactera si un avenant est necessaire.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddressModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddressSubmit}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-lg font-semibold hover:from-yellow-700 hover:to-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
                  Envoyer la Demande
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRibModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Modifier mes Coordonnees Bancaires</h3>
              <button
                onClick={() => setShowRibModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titulaire du Compte</label>
                <input
                  type="text"
                  value={ribForm.account_holder}
                  onChange={(e) => setRibForm({ ...ribForm, account_holder: e.target.value })}
                  placeholder="Nom et prenom"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                <input
                  type="text"
                  value={ribForm.iban}
                  onChange={(e) => setRibForm({ ...ribForm, iban: e.target.value.toUpperCase() })}
                  placeholder="FR76 3000 6000 0112 3456 7890 189"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">BIC/SWIFT</label>
                <input
                  type="text"
                  value={ribForm.bic}
                  onChange={(e) => setRibForm({ ...ribForm, bic: e.target.value.toUpperCase() })}
                  placeholder="BNPAFRPP"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    Vos coordonnees bancaires sont chiffrees et securisees. La modification prendra effet au prochain prelevement.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowRibModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRibSubmit}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-lg font-semibold hover:from-yellow-700 hover:to-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
                  Envoyer la Demande
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVehicleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Declarer un Changement de Vehicule</h3>
              <button
                onClick={() => setShowVehicleModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouvelle Immatriculation *</label>
                <input
                  type="text"
                  value={vehicleForm.license_plate}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, license_plate: e.target.value.toUpperCase() })}
                  placeholder="AB-123-CD"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marque *</label>
                  <input
                    type="text"
                    value={vehicleForm.brand}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
                    placeholder="Toyota"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modele *</label>
                  <input
                    type="text"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    placeholder="Prius"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Annee</label>
                <input
                  type="text"
                  value={vehicleForm.year}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                  placeholder="2024"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motif du Changement</label>
                <select
                  value={vehicleForm.reason}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, reason: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="">Selectionnez un motif</option>
                  <option value="new_purchase">Achat d'un nouveau vehicule</option>
                  <option value="replacement">Remplacement suite a sinistre</option>
                  <option value="upgrade">Mise a niveau du vehicule</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p className="font-medium mb-1">Important</p>
                    <p>Un changement de vehicule entrainera l'etablissement d'un avenant a votre contrat. La prime peut etre ajustee en fonction des caracteristiques du nouveau vehicule.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowVehicleModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleVehicleSubmit}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-lg font-semibold hover:from-yellow-700 hover:to-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car size={18} />}
                  Declarer le Changement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
