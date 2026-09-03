# Code Clever - PowerShell Full-Stack Runner
Write-Host "====================================================" -ForegroundColor Magenta
Write-Host "       CODE CLEVER FULL-STACK RUNNER (PowerShell)    " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Magenta
Write-Host "• Frontend App: " -NoNewline -ForegroundColor Yellow
Write-Host "http://localhost:5173" -ForegroundColor Green
Write-Host "• Admin Portal: " -NoNewline -ForegroundColor Yellow
Write-Host "http://localhost:5173/admin" -ForegroundColor Green
Write-Host "• Backend API:  " -NoNewline -ForegroundColor Yellow
Write-Host "http://localhost:4000" -ForegroundColor Green
Write-Host "----------------------------------------------------" -ForegroundColor Magenta
Write-Host "Press Ctrl+C to stop all services.`n" -ForegroundColor DarkGray

node start-all.js
