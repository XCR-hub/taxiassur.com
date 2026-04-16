import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="logo-text">Taxi</span>
          <span className="logo-accent">Assur</span>
          <p className="footer-tagline">Courtier en assurance taxi enregistre ORIAS</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Assurance</h4>
            <Link to="/#devis">Devis Gratuit</Link>
            <Link to="/ville/paris">Paris</Link>
            <Link to="/ville/lyon">Lyon</Link>
            <Link to="/ville/marseille">Marseille</Link>
          </div>
          <div className="footer-col">
            <h4>Informations</h4>
            <Link to="/quelle-assurance-pour-taxi">Guide Assurance Taxi</Link>
            <Link to="/flotte-vehicules">Flotte Vehicules</Link>
            <Link to="/avis">Avis Clients</Link>
            <Link to="/blog">Blog</Link>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <Link to="/mentions-legales">Mentions Legales</Link>
            <Link to="/conditions-generales">Conditions Generales</Link>
            <Link to="/politique-confidentialite">Politique de Confidentialite</Link>
            <Link to="/plan-du-site">Plan du Site</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} TaxiAssur - Tous droits reserves</p>
      </div>
    </footer>
  )
}

export { Footer }
export default Footer
