import { SEOHead } from '@/components/SEOHead'

export function ConditionsGenerales() {
  return (
    <>
      <SEOHead
        title="Conditions Generales | TaxiAssur"
        description="Conditions generales d'utilisation du site TaxiAssur.com."
        canonical="/conditions-generales"
      />
      <div className="legal-page">
        <h1>Conditions Generales d'Utilisation</h1>
        <section>
          <h2>Objet</h2>
          <p>Les presentes conditions generales regissent l'utilisation du site TaxiAssur.com et les services de courtage en assurance taxi proposes.</p>
        </section>
        <section>
          <h2>Services</h2>
          <p>TaxiAssur propose un service de comparaison et de courtage en assurance taxi. Les devis sont gratuits et sans engagement.</p>
        </section>
        <section>
          <h2>Responsabilite</h2>
          <p>TaxiAssur s'engage a fournir des informations exactes mais ne saurait etre tenu responsable d'eventuelles erreurs ou omissions.</p>
        </section>
      </div>
    </>
  )
}
