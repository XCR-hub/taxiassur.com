import { SEOHead } from '@/components/SEOHead'
import { QuoteForm } from '@/components/QuoteForm'

export function FlotteVehicules() {
  return (
    <>
      <SEOHead
        title="Assurance Flotte Vehicules Taxi | TaxiAssur"
        description="Assurez votre flotte de vehicules taxi. Tarifs degressifs, gestion simplifiee. Devis gratuit pour flotte taxi."
        canonical="/flotte-vehicules"
        keywords="assurance flotte taxi, flotte vehicules taxi, assurance multi vehicules taxi"
      />
      <div className="fleet-page">
        <section className="fleet-hero">
          <h1>Assurance Flotte Vehicules Taxi</h1>
          <p>Vous gerez plusieurs vehicules taxi ? Beneficiez de tarifs degressifs et d'une gestion simplifiee avec notre offre flotte.</p>
        </section>

        <section className="fleet-advantages">
          <h2>Avantages flotte taxi</h2>
          <div className="advantages-grid">
            <div className="advantage-card">
              <h3>Tarifs degressifs</h3>
              <p>Plus vous assurez de vehicules, plus vos tarifs baissent.</p>
            </div>
            <div className="advantage-card">
              <h3>Gestion centralisee</h3>
              <p>Un seul interlocuteur pour tous vos vehicules.</p>
            </div>
            <div className="advantage-card">
              <h3>Flexibilite</h3>
              <p>Ajoutez ou retirez des vehicules facilement.</p>
            </div>
          </div>
        </section>

        <section className="fleet-cta">
          <h2>Devis flotte gratuit</h2>
          <QuoteForm />
        </section>
      </div>
    </>
  )
}
