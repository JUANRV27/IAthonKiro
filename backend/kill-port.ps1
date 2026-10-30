# Script para liberar el puerto 3001
$port = 3001
Write-Host "Buscando procesos en puerto $port..." -ForegroundColor Yellow

$connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1

if ($connection) {
    $processId = $connection.OwningProcess
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    
    Write-Host "Proceso encontrado: $($process.Name) (PID: $processId)" -ForegroundColor Cyan
    Write-Host "Deteniendo proceso..." -ForegroundColor Yellow
    
    Stop-Process -Id $processId -Force
    Start-Sleep -Seconds 1
    
    Write-Host "✅ Puerto $port liberado exitosamente" -ForegroundColor Green
} else {
    Write-Host "✅ Puerto $port ya está libre" -ForegroundColor Green
}
