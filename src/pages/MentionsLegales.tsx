import { SEOHead } from '@/components/SEOHead'

export function MentionsLegales() {
  return (
    <>
      <SEOHead
        title="Mentions Legales | TaxiAssur"
        description="Mentions legales du site TaxiAssur.com, courtier en assurance taxi."
        canonical="/mentions-legales"
      />
      <div className="legal-page">
        <h1>Mentions Legales</h1>
        <section>
          <h2>Editeur du site</h2>
          <p>TaxiAssur - Courtier en assurance taxi</p>
          <p>Intermediaire en assurance immatricule au registre ORIAS</p>
        </section>
        <section>
          <h2>Hebergement</h2>
          <p>Le site est heberge par IONOS SE.</p>
        </section>
        <section>
          <h2>Propriete intellectuelle</h2>
          <p>L'ensemble du contenu de ce site (textes, images, videos) est protege par le droit d'auteur. Toute reproduction est interdite sans autorisation prealable.</p>
        </section>
      </div>
    </>
  )
}
