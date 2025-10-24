import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import PerformanceOptimizer from './components/PerformanceOptimizer';
import AITaxiBackground from './components/AITaxiBackground';
import AIChatBot from './components/AIChatBot';

function App() {
  return (
    <PerformanceOptimizer>
      <AITaxiBackground intensity="low" />
      <React.Suspense fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-black font-bold text-xl">🚖</span>
            </div>
            <p className="text-white font-medium">Chargement TaxiAssur...</p>
          </div>
        </div>
      }>
        <RouterProvider router={router} />
      </React.Suspense>
      <AIChatBot />
    </PerformanceOptimizer>
  );
}

export default App;