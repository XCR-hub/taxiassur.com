import { SEOHead } from '@/components/SEOHead'

export function PolitiqueConfidentialite() {
  return (
    <>
      <SEOHead
        title="Politique de Confidentialite | TaxiAssur"
        description="Politique de confidentialite et protection des donnees personnelles de TaxiAssur.com."
        canonical="/politique-confidentialite"
      />
      <div className="legal-page">
        <h1>Politique de Confidentialite</h1>
        <section>
          <h2>Collecte des donnees</h2>
          <p>Nous collectons les donnees personnelles que vous nous fournissez lors de votre demande de devis : nom, prenom, email, telephone, ville et informations vehicule.</p>
        </section>
        <section>
          <h2>Utilisation des donnees</h2>
          <p>Vos donnees sont utilisees exclusivement pour traiter votre demande de devis et vous proposer des offres d'assurance taxi adaptees.</p>
        </section>
        <section>
          <h2>Protection des donnees</h2>
          <p>Vos donnees sont stockees de maniere securisee et ne sont jamais revendues a des tiers. Conformement au RGPD, vous disposez d'un droit d'acces, de modification et de suppression de vos donnees.</p>
        </section>
        <section>
          <h2>Cookies</h2>
          <p>Ce site utilise des cookies a des fins d'analyse (Google Analytics) et d'amelioration de l'experience utilisateur.</p>
        </section>
      </div>
    </>
  )
}
