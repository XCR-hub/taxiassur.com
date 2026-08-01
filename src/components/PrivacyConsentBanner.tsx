import React, { useEffect, useState } from 'react';
import {
  getPrivacyConsentState,
  hasMadePrivacyChoice,
  loadConsentedThirdPartyTags,
  savePrivacyConsent,
  type PrivacyConsentInput,
} from '@/lib/privacy-consent';

const defaultChoices: Required<PrivacyConsentInput> = {
  analytics: false,
  marketing: false,
  behavioral_personalization: false,
};

const PrivacyConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [choices, setChoices] = useState(defaultChoices);

  useEffect(() => {
    const stored = getPrivacyConsentState();
    const requestedFromUrl = new URLSearchParams(window.location.search).has('privacy');

    if (stored) {
      setChoices({
        analytics: stored.analytics,
        marketing: stored.marketing,
        behavioral_personalization: stored.behavioral_personalization,
      });
      loadConsentedThirdPartyTags();
    }

    if (!hasMadePrivacyChoice() || requestedFromUrl) {
      setVisible(true);
    }

    const openPreferences = () => setVisible(true);
    window.addEventListener('taxiassur:open-privacy-consent', openPreferences);
    window.taxiAssurPrivacyConsentReset = openPreferences;

    return () => {
      window.removeEventListener('taxiassur:open-privacy-consent', openPreferences);
      delete window.taxiAssurPrivacyConsentReset;
    };
  }, []);

  if (!visible) return null;

  const updateChoice = (key: keyof Required<PrivacyConsentInput>, value: boolean) => {
    setChoices((current) => ({ ...current, [key]: value }));
  };

  const applyChoices = (nextChoices: PrivacyConsentInput) => {
    const saved = savePrivacyConsent(nextChoices);
    setChoices({
      analytics: saved.analytics,
      marketing: saved.marketing,
      behavioral_personalization: saved.behavioral_personalization,
    });
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[10000] border-t border-amber-500/30 bg-black/95 text-white shadow-2xl backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-semibold text-amber-300">Confidentialite TaxiAssur</p>
          <p className="text-sm leading-relaxed text-gray-200">
            Les cookies techniques restent actifs. Les mesures d'audience, tags marketing et personnalisations
            comportementales ne sont charges qu'apres votre accord. Vous pouvez refuser sans perdre l'acces au site.
          </p>
          <a href="/policy?privacy=1" className="text-xs font-semibold text-amber-300 underline underline-offset-4">
            Politique de confidentialite et modification du choix
          </a>
        </div>

        <div className="w-full max-w-md space-y-3">
          <label className="flex items-start gap-3 text-sm text-gray-100">
            <input
              type="checkbox"
              checked={choices.analytics}
              onChange={(event) => updateChoice('analytics', event.target.checked)}
              className="mt-1 h-4 w-4 accent-amber-500"
            />
            <span>Audience anonyme et performance du site</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-gray-100">
            <input
              type="checkbox"
              checked={choices.marketing}
              onChange={(event) => updateChoice('marketing', event.target.checked)}
              className="mt-1 h-4 w-4 accent-amber-500"
            />
            <span>Tags marketing et mesure publicitaire</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-gray-100">
            <input
              type="checkbox"
              checked={choices.behavioral_personalization}
              onChange={(event) => updateChoice('behavioral_personalization', event.target.checked)}
              className="mt-1 h-4 w-4 accent-amber-500"
            />
            <span>Personnalisation selon votre navigation TaxiAssur</span>
          </label>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => applyChoices(defaultChoices)}
              className="rounded-md border border-gray-600 px-3 py-2 text-sm font-semibold text-gray-100 hover:border-gray-300"
            >
              Refuser
            </button>
            <button
              type="button"
              onClick={() => applyChoices(choices)}
              className="rounded-md border border-amber-500 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => applyChoices({ analytics: true, marketing: true, behavioral_personalization: true })}
              className="rounded-md bg-amber-500 px-3 py-2 text-sm font-bold text-black hover:bg-amber-400"
            >
              Tout accepter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyConsentBanner;