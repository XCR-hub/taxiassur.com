@echo off
chcp 65001 >nul
echo.
echo ============================================
echo 🚀 Upload vers IONOS - TaxiAssur
echo ============================================
echo.

REM Vérifier que le dossier dist existe
if not exist "dist\" (
    echo ❌ Erreur : Le dossier /dist n'existe pas
    echo    Exécutez d'abord : npm run build
    pause
    exit /b 1
)

echo ✅ Dossier /dist trouvé
echo.

REM Vérifier que WinSCP est installé
where winscp >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ WinSCP n'est pas installé
    echo.
    echo 📥 Téléchargez WinSCP : https://winscp.net/
    echo    Ou utilisez FileZilla pour uploader le dossier /dist
    echo.
    pause
    exit /b 1
)

echo 🔐 Configuration FTP IONOS
echo.

set /p FTP_HOST="Hôte FTP (ex: ftp.taxiassur.com): "
set /p FTP_USER="Nom d'utilisateur FTP: "
set /p FTP_PASS="Mot de passe FTP: "
set /p FTP_PATH="Dossier distant (ex: /public_html ou /): "

echo.
echo 📤 Upload en cours...
echo.

REM Créer un script temporaire pour WinSCP
echo open ftp://%FTP_USER%:%FTP_PASS%@%FTP_HOST% > winscp_script.txt
echo cd %FTP_PATH% >> winscp_script.txt
echo synchronize remote -delete dist/ . >> winscp_script.txt
echo exit >> winscp_script.txt

REM Exécuter WinSCP
winscp.com /script=winscp_script.txt

REM Supprimer le script temporaire
del winscp_script.txt

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Upload terminé avec succès !
    echo.
    echo 🧪 Tests à effectuer :
    echo    1. https://taxiassur.com/test-prospect-access.html
    echo    2. https://taxiassur.com/prospect/documents/abad70754f988c31533bfa8ce962a4ce4f7f15c1a547fdf4f9a2bf099fd98912
    echo.
    echo 💡 N'oubliez pas de vider le cache (Ctrl+Shift+R)
) else (
    echo.
    echo ❌ Erreur lors de l'upload
    echo    Vérifiez vos identifiants FTP
)

echo.
pause
