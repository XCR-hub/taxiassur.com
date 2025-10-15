import { Helmet } from 'react-helmet-async';

export default function HomePage() {
  return (
    <>
      <Helmet>
        <title>Assurance Taxi Pas Cher - Devis Gratuit 2 min | TaxiAssur Courtier ORIAS #1</title>
      </Helmet>

      <div className="min-h-screen bg-white border border-yellow-100">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-amber-600">TaxiAssur</h1>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 font-semibold mb-4">
              Assurance Taxi Pas Cher
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Devis gratuit en 2 minutes - Économisez jusqu'à 35%
            </p>
            <button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors">
              Demander un devis gratuit
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
