import { SEOHead } from '@/components/SEOHead'
import { QuoteForm } from '@/components/QuoteForm'

export function GuideAssuranceTaxi() {
  return (
    <>
      <SEOHead
        title="Quelle Assurance pour Taxi ? Guide Complet 2026 | TaxiAssur"
        description="Tout savoir sur l'assurance taxi : garanties obligatoires, tarifs, conseils pour choisir la meilleure assurance taxi professionnelle."
        canonical="/quelle-assurance-pour-taxi"
        keywords="quelle assurance pour taxi, assurance taxi obligatoire, garanties assurance taxi, tarif assurance taxi"
      />
      <div className="guide-page">
        <section className="guide-hero">
          <h1>Quelle Assurance pour Taxi ?</h1>
          <p className="guide-intro">
            Guide complet pour comprendre les assurances taxi, choisir les bonnes garanties et obtenir le meilleur tarif.
          </p>
        </section>

        <section className="guide-content">
          <h2>Les garanties obligatoires</h2>
          <p>Tout chauffeur de taxi doit disposer au minimum d'une assurance responsabilite civile professionnelle (RC Pro). Cette garantie couvre les dommages causes aux passagers et aux tiers.</p>

          <h2>Les garanties recommandees</h2>
          <ul>
            <li><strong>Tous risques</strong> : protection complete du vehicule</li>
            <li><strong>Assistance 24/7</strong> : depannage et vehicule de remplacement</li>
            <li><strong>Protection juridique</strong> : defense en cas de litige</li>
            <li><strong>Bris de glace</strong> : remplacement du pare-brise</li>
            <li><strong>Vol et incendie</strong> : indemnisation en cas de sinistre</li>
          </ul>

          <h2>Comment reduire le cout ?</h2>
          <p>Comparer les offres via un courtier specialise comme TaxiAssur permet d'economiser jusqu'a 30% sur votre prime annuelle.</p>
        </section>

        <section className="guide-cta">
          <h2>Obtenez votre devis personnalise</h2>
          <QuoteForm />
        </section>
      </div>
    </>
  )
}
