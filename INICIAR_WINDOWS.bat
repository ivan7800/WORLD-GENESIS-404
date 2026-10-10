@echo off
setlocal
cd /d "%~dp0"
if not exist "index.html" (echo ERROR: falta index.html & pause & exit /b 1)
if not exist "app.js" (echo ERROR: falta app.js & pause & exit /b 1)
where py >nul 2>nul
if not errorlevel 1 (py -3 "%~dp0iniciar_local.py" & goto :end)
where python >nul 2>nul
if not errorlevel 1 (python "%~dp0iniciar_local.py" & goto :end)
echo Python no instalado: abriendo HTML directamente en el navegador.
start "" "%~dp0index.html"
:end
