import React from 'react';
import { MapPin, TrendingUp, Users, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

const LocalSEO: React.FC = () => {
  const topCities = [
    { name: 'Paris', clients: '25+', savings: '720€', slug: 'paris' },
    { name: 'Lyon', clients: '18+', savings: '580€', slug: 'lyon' },
    { name: 'Marseille', clients: '12+', savings: '540€', slug: 'marseille' },
    { name: 'Toulouse', clients: '6+', savings: '590€', slug: 'toulouse' },
    { name: 'Nice', clients: '5+', savings: '610€', slug: 'nice' },
    { name: 'Nantes', clients: '4+', savings: '570€', slug: 'nantes' },
    { name: 'Montpellier', clients: '3+', savings: '520€', slug: 'montpellier' },
    { name: 'Strasbourg', clients: '3+', savings: '580€', slug: 'strasbourg' },
    { name: 'Bordeaux', clients: '4+', savings: '560€', slug: 'bordeaux' },
    { name: 'Lille', clients: '3+', savings: '550€', slug: 'lille' },
    { name: 'Rennes', clients: '3+', savings: '530€', slug: 'rennes' },
    { name: 'Reims', clients: '2+', savings: '540€', slug: 'reims' },
    { name: 'Saint-Étienne', clients: '2+', savings: '520€', slug: 'saint-etienne' },
    { name: 'Toulon', clients: '2+', savings: '530€', slug: 'toulon' },
    { name: 'Le Havre', clients: '2+', savings: '510€', slug: 'le-havre' },
    { name: 'Grenoble', clients: '3+', savings: '540€', slug: 'grenoble' },
    { name: 'Dijon', clients: '2+', savings: '520€', slug: 'dijon' },
    { name: 'Angers', clients: '2+', savings: '510€', slug: 'angers' },
    { name: 'Nîmes', clients: '2+', savings: '500€', slug: 'nimes' },
    { name: 'Villeurbanne', clients: '2+', savings: '530€', slug: 'villeurbanne' },
    { name: 'Saint-Étienne', clients: '2+', savings: '520€', slug: 'saint-etienne' },
    { name: 'Toulon', clients: '2+', savings: '530€', slug: 'toulon' },
    { name: 'Le Havre', clients: '2+', savings: '510€', slug: 'le-havre' },
    { name: 'Grenoble', clients: '3+', savings: '540€', slug: 'grenoble' },
    { name: 'Dijon', clients: '2+', savings: '520€', slug: 'dijon' },
    { name: 'Angers', clients: '2+', savings: '510€', slug: 'angers' },
    { name: 'Nîmes', clients: '2+', savings: '500€', slug: 'nimes' },
    { name: 'Villeurbanne', clients: '2+', savings: '530€', slug: 'villeurbanne' }
  ];

  return (
    <section className="section-padding bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white relative overflow-hidden">
      <div className="container-max">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 relative z-10">
            🗺️ Assurance Taxi <span className="text-gradient">dans Toute la France</span>
          </h2>
          <p className="text-lg text-gray-200 max-w-2xl mx-auto relative z-10">
            Courtier assurance taxi présent dans toute la France. Tarifs assurance taxi adaptés par région, 
            expertise locale et service de proximité garanti.
          </p>
        </div>

        {/* Top cities grid */}
        <div className="grid grid-cols-5 gap-3 mb-12 relative z-10 max-w-5xl mx-auto">
          {topCities.slice(0, 20).map((city, index) => (
            <Link
              key={index}
              to={`/ville/${city.slug}`}
              className="group bg-gray-800 hover:bg-gray-700 border-2 border-amber-500 hover:border-amber-400 rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <div className="text-center">
                <div className="w-6 h-6 bg-amber-500 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-lg">
                  <MapPin className="text-black" size={12} />
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors mb-1">
                  {city.name}
                </h3>
                <div className="text-xs text-amber-400 group-hover:text-amber-300 transition-colors font-medium mb-2">
                  Devis gratuit →
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div>
                    <div className="text-blue-400 font-bold">{city.clients}</div>
                    <div className="text-gray-600">Clients</div>
                  </div>
                  <div>
                    <div className="text-green-400 font-bold">{city.savings}</div>
                    <div className="text-gray-600">Éco.</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* National coverage */}
        <div className="text-center">
          <div className="bg-gray-800 border-2 border-amber-500 rounded-2xl p-8 shadow-2xl max-w-4xl mx-auto relative z-10">
            <h3 className="text-2xl font-bold text-gradient mb-4">
              🇫🇷 Assurance Taxi - Couverture Nationale Complète
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
                  <TrendingUp className="text-white" size={24} />
                </div>
                <div className="text-4xl font-bold text-white">95+</div>
                <div className="text-sm text-gray-200 font-medium">Départements couverts</div>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
                  <Users className="text-white" size={24} />
                </div>
                <div className="text-4xl font-bold text-white">100+</div>
                <div className="text-sm text-gray-200 font-medium">Clients nationaux</div>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
                  <Award className="text-white" size={24} />
                </div>
                <div className="text-4xl font-bold text-white">100+</div>
                <div className="text-sm text-gray-200 font-medium">Clients satisfaits</div>
              </div>
            </div>
            <Link to="/villes" className="btn-primary">
              Voir Toutes les Villes Couvertes
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocalSEO;