@echo off
echo 🚀 Configuration TaxiAssur.com pour Windows
echo.

REM Créer la structure de base
mkdir src\components 2>nul
mkdir src\pages 2>nul
mkdir src\lib 2>nul
mkdir src\backoffice 2>nul
mkdir public\content\blog 2>nul
mkdir public\content\faq 2>nul
mkdir public\content\reviews 2>nul
mkdir public\content\offers 2>nul
mkdir public\content\leads 2>nul
mkdir public\feeds 2>nul
mkdir public\webhooks 2>nul
mkdir webhooks 2>nul
mkdir scripts 2>nul

echo ✅ Structure créée

REM Initialiser npm
echo 📦 Initialisation npm...
npm init -y

echo ✅ Projet initialisé

REM Installer les dépendances
echo 📥 Installation des dépendances...
npm install react@latest react-dom@latest
npm install @types/react@latest @types/react-dom@latest
npm install vite@latest @vitejs/plugin-react@latest
npm install typescript@latest
npm install tailwindcss@latest postcss@latest autoprefixer@latest
npm install react-router-dom@latest
npm install lucide-react@latest
npm install clsx@latest tailwind-merge@latest
npm install zod@latest
npm install react-helmet-async@latest
npm install @supabase/supabase-js@latest

echo ✅ Dépendances installées

REM Installer les dépendances de développement
npm install -D @types/node@latest eslint@latest

echo ✅ Configuration terminée
echo.
echo 🎉 Projet prêt ! Vous pouvez maintenant copier les fichiers depuis Bolt.new
echo.
pause