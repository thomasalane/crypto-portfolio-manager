@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale a versao 22 ou mais nova em https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias pela primeira vez...
  call npm install || goto :failed
)

if not exist "dist" (
  echo Construindo a interface...
  call npm run build || goto :failed
)

if not exist ".env" (
  echo.
  echo Aviso: .env nao encontrado. O painel funciona normalmente,
  echo mas o assistente ficara indisponivel. Copie .env.example para .env
  echo e coloque sua chave da API.
  echo.
)

start "" "http://localhost:4173"
node server/index.js
goto :eof

:failed
echo.
echo Falhou. Veja a mensagem acima.
pause
exit /b 1
