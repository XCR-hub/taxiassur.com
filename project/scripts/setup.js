#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
console.log('🚀 Configuration TaxiAssur.com');

// Créer la structure de dossiers
const directories = [
  'src/components',
  'src/pages', 
  'src/lib',
  'src/backoffice',
  'public/content/blog',
  'public/content/faq',
  'public/content/reviews',
  'public/content/offers',
  'public/content/leads',
  'public/feeds',
  'public/webhooks',
  'webhooks',
  'scripts'
];

console.log('📁 Création de la structure...');
directories.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`✓ ${dir}`);
});

// Créer les fichiers de base
const baseFiles = {
  'src/main.tsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);`,

  'src/App.tsx': `import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

function App() {
  return <RouterProvider router={router} />;
}

export default App;`,

  'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;`,

  'index.html': `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TaxiAssur - Assurance Taxi Professionnelle</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,

  'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    copyPublicDir: true,
  },
});`,

  'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};`,

  'tsconfig.json': `{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}`,

  'tsconfig.app.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}`,

  'postcss.config.js': `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`
};

console.log('📄 Création des fichiers de base...');
Object.entries(baseFiles).forEach(([file, content]) => {
  fs.writeFileSync(file, content);
  console.log(`✓ ${file}`);
});

console.log('');
console.log('🎉 Configuration terminée !');
console.log('');
console.log('📋 Prochaines étapes :');
console.log('1. Copiez tous les fichiers depuis Bolt.new');
console.log('2. Exécutez: npm install');
console.log('3. Testez: npm run dev');
console.log('4. Déployez: npm run deploy');
console.log('');