import { SEOHead } from '@/components/SEOHead'

export function MerciPage() {
  return (
    <>
      <SEOHead
        title="Merci pour votre demande | TaxiAssur"
        description="Votre demande de devis a bien ete envoyee. Un conseiller vous contactera sous 24h."
        canonical="/merci"
      />
      <div className="merci-page">
        <div className="merci-content">
          <div className="success-icon large">&#10003;</div>
          <h1>Merci pour votre demande !</h1>
          <p>Votre demande de devis a bien ete prise en compte.</p>
          <p>Un conseiller TaxiAssur vous contactera sous 24 heures pour vous proposer les meilleures offres d'assurance taxi.</p>
          <a href="/" className="cta-button">Retour a l'accueil</a>
        </div>
      </div>
    </>
  )
}
