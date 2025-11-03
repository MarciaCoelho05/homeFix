# Script para limpar e reinstalar dependencias do HomeFix Backend
# Execute: .\clean-install.ps1

Write-Host "Limpando instalacao anterior..." -ForegroundColor Yellow

# Tentar finalizar processos Node.js (se houver)
try {
    $nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "Finalizando processos Node.js..." -ForegroundColor Yellow
        Stop-Process -Name node -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
} catch {
    Write-Host "Nao foi possivel finalizar processos Node.js (pode estar tudo bem)" -ForegroundColor Yellow
}

# Remover node_modules
if (Test-Path "node_modules") {
    Write-Host "Removendo node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}

# Remover .prisma especifico (caso ainda exista)
if (Test-Path "node_modules\.prisma") {
    Write-Host "Removendo .prisma..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules\.prisma" -ErrorAction SilentlyContinue
}

# Remover package-lock.json
if (Test-Path "package-lock.json") {
    Write-Host "Removendo package-lock.json..." -ForegroundColor Yellow
    Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
}

Write-Host "Limpeza concluida!" -ForegroundColor Green
Write-Host ""
Write-Host "Instalando dependencias..." -ForegroundColor Cyan

# Instalar dependencias
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Instalacao concluida com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Voce pode agora executar: npm run dev" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Erro na instalacao. Verifique os erros acima." -ForegroundColor Red
    Write-Host ""
    Write-Host "Dicas:" -ForegroundColor Yellow
    Write-Host "   - Certifique-se de que nao ha processos Node.js rodando" -ForegroundColor Yellow
    Write-Host "   - Tente executar o terminal como Administrador" -ForegroundColor Yellow
    Write-Host "   - Verifique se o antivirus nao esta bloqueando" -ForegroundColor Yellow
}
