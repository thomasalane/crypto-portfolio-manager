@echo off
setlocal
cd /d "%~dp0."

rem Copiar este arquivo para outra pasta faz o npm subir a arvore de diretorios
rem e instalar as dependencias de outro projeto. Melhor parar aqui.
if not exist "package.json" goto :wrongfolder
findstr /c:"crypto-portfolio-manager" package.json >nul || goto :wrongfolder

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

:wrongfolder
echo.
echo Este arquivo precisa ficar dentro da pasta do projeto, ao lado do
echo package.json. Rodar uma copia solta em outra pasta faz o npm instalar
echo as dependencias erradas.
echo.
echo Pasta atual: %CD%
echo.
echo Para ter um atalho na area de trabalho, crie um atalho apontando para
echo o portfolio.bat original em vez de copiar o arquivo.
echo.
pause
exit /b 1

:failed
echo.
echo Falhou. Veja a mensagem acima.
pause
exit /b 1
