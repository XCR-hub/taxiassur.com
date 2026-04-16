import { SEOHead } from '@/components/SEOHead'
import { QuoteForm } from '@/components/QuoteForm'

const AVIS = [
  { name: 'Mohamed K.', city: 'Paris', stars: 5, text: 'Service rapide et professionnel. J\'ai economise 400 euros sur mon assurance taxi grace a TaxiAssur.' },
  { name: 'Jean-Pierre L.', city: 'Lyon', stars: 5, text: 'Excellent courtier, tres reactif. Mon devis etait pret en moins de 24h.' },
  { name: 'Ahmed B.', city: 'Marseille', stars: 4, text: 'Bon rapport qualite prix. Je recommande pour les taxis de Marseille.' },
  { name: 'Fatima D.', city: 'Toulouse', stars: 5, text: 'Tres satisfaite du suivi. L\'equipe est disponible et a l\'ecoute.' },
  { name: 'Patrick R.', city: 'Nice', stars: 5, text: 'Enfin un courtier qui comprend les besoins des chauffeurs de taxi.' },
  { name: 'Karim S.', city: 'Bordeaux', stars: 4, text: 'Service serieux. Bonne couverture pour un tarif raisonnable.' },
]

export function AvisPage() {
  return (
    <>
      <SEOHead
        title="Avis Clients TaxiAssur - Temoignages Chauffeurs Taxi | TaxiAssur"
        description="Decouvrez les avis de nos clients chauffeurs de taxi. Temoignages reels sur notre service de courtage en assurance taxi."
        canonical="/avis"
        keywords="avis taxiassur, temoignages assurance taxi, avis clients taxi"
      />
      <div className="avis-page">
        <section className="avis-hero">
          <h1>Avis Clients TaxiAssur</h1>
          <p>Decouvrez ce que nos clients pensent de notre service</p>
        </section>

        <section className="avis-grid">
          {AVIS.map((avis, i) => (
            <div className="avis-card" key={i}>
              <div className="avis-stars">{'&#9733;'.repeat(avis.stars)}{'&#9734;'.repeat(5 - avis.stars)}</div>
              <p className="avis-text">"{avis.text}"</p>
              <div className="avis-author">
                <strong>{avis.name}</strong>
                <span>Taxi a {avis.city}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="avis-cta">
          <h2>Rejoignez nos clients satisfaits</h2>
          <QuoteForm />
        </section>
      </div>
    </>
  )
}
