import { Link } from 'react-router-dom'

function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          <span className="logo-text">Taxi</span>
          <span className="logo-accent">Assur</span>
        </Link>
        <nav className="nav">
          <Link to="/#devis" className="nav-link">Devis Gratuit</Link>
          <Link to="/avis" className="nav-link">Avis</Link>
          <Link to="/blog" className="nav-link">Blog</Link>
          <Link to="/plan-du-site" className="nav-link">Plan du site</Link>
        </nav>
        <Link to="/#devis" className="cta-button">
          Devis en 2 min
        </Link>
      </div>
    </header>
  )
}

export { Header }
export default Header
