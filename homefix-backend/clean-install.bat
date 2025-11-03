@echo off
REM Script para limpar e reinstalar dependências do HomeFix Backend
REM Execute: clean-install.bat

echo.
echo 🧹 Limpando instalação anterior...
echo.

REM Tentar finalizar processos Node.js
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Remover node_modules
if exist "node_modules" (
    echo 🗑️  Removendo node_modules...
    rmdir /s /q "node_modules" 2>nul
)

REM Remover .prisma específico
if exist "node_modules\.prisma" (
    echo 🗑️  Removendo .prisma...
    rmdir /s /q "node_modules\.prisma" 2>nul
)

REM Remover package-lock.json
if exist "package-lock.json" (
    echo 🗑️  Removendo package-lock.json...
    del /q "package-lock.json" 2>nul
)

echo ✅ Limpeza concluída!
echo.
echo 📦 Instalando dependências...
echo.

REM Instalar dependências
call npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Instalação concluída com sucesso!
    echo.
    echo 🚀 Você pode agora executar: npm run dev
) else (
    echo.
    echo ❌ Erro na instalação. Verifique os erros acima.
    echo.
    echo 💡 Dicas:
    echo    - Certifique-se de que não há processos Node.js rodando
    echo    - Tente executar o terminal como Administrador
    echo    - Verifique se o antivírus não está bloqueando
)

pause

