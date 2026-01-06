import { MapPin } from 'lucide-react';

export function CityDistributionChart() {
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center gap-3 mb-6">
        <MapPin className="w-5 h-5 text-green-500" />
        <h3 className="text-lg font-semibold text-white">Répartition par Ville</h3>
      </div>
      <div className="h-96 flex items-center justify-center text-gray-500">
        Graphique en cours de chargement...
      </div>
    </div>
  );
}
