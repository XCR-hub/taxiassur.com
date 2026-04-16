import { SEOHead } from '@/components/SEOHead'
import { QuoteForm } from '@/components/QuoteForm'

export function HomePage() {
  return (
    <>
      <SEOHead
        title="Assurance Taxi Pas Cher - Devis Gratuit 2 min | TaxiAssur Courtier ORIAS"
        description="Comparez les meilleures assurances taxi en 2 minutes. Devis gratuit et personnalise. TaxiAssur, courtier ORIAS specialise assurance taxi professionnelle."
        canonical="/"
        keywords="assurance taxi, assurance taxi pas cher, devis assurance taxi, courtier assurance taxi"
      />
      <section className="hero" id="devis">
        <div className="hero-content">
          <h1>Assurance Taxi <span className="accent">Pas Cher</span></h1>
          <p className="hero-subtitle">
            Obtenez votre devis gratuit en 2 minutes. Courtier ORIAS specialise en assurance taxi professionnelle.
          </p>
          <div className="hero-badges">
            <span className="badge">Courtier ORIAS</span>
            <span className="badge">Devis en 2 min</span>
            <span className="badge">100% Gratuit</span>
          </div>
        </div>
        <div className="hero-form">
          <h2>Devis Gratuit Immediat</h2>
          <QuoteForm />
        </div>
      </section>

      <section className="features">
        <div className="features-inner">
          <h2>Pourquoi choisir TaxiAssur ?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">&#9733;</div>
              <h3>Tarifs negocies</h3>
              <p>Grace a nos partenariats avec les meilleurs assureurs, nous vous proposons des tarifs competitifs.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#9201;</div>
              <h3>Devis en 2 minutes</h3>
              <p>Remplissez notre formulaire simple et recevez votre devis personnalise rapidement.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#9989;</div>
              <h3>Courtier agree ORIAS</h3>
              <p>Intermediaire en assurance immatricule au registre ORIAS, gage de serieux et de fiabilite.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#128222;</div>
              <h3>Accompagnement dedic</h3>
              <p>Un conseiller dedie vous accompagne dans le choix de votre assurance taxi.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="guarantees">
        <div className="guarantees-inner">
          <h2>Nos Garanties Assurance Taxi</h2>
          <div className="guarantees-grid">
            <div className="guarantee-item">
              <h3>Responsabilite Civile</h3>
              <p>Couverture obligatoire pour tout taxi professionnel. Protection en cas de dommages causes a des tiers.</p>
            </div>
            <div className="guarantee-item">
              <h3>Tous Risques</h3>
              <p>Protection complete de votre vehicule taxi, incluant vol, incendie et dommages.</p>
            </div>
            <div className="guarantee-item">
              <h3>Assistance 24h/24</h3>
              <p>Depannage et vehicule de remplacement pour ne jamais interrompre votre activite.</p>
            </div>
            <div className="guarantee-item">
              <h3>Protection Juridique</h3>
              <p>Defense de vos interets en cas de litige lie a votre activite de taxi.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
