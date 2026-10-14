cd c:\dev\nolida
Start-Process -NoNewWindow npm run build -RedirectStandardOutput C:\dev\nolida\build.log -RedirectStandardError C:\dev\nolida\build-err.log -PassThru | Out-Null
for ($i=0; $i -lt 14; $i++) {
  Start-Sleep -Seconds 10
  if ((Get-Process -Name next -ErrorAction SilentlyContinue).Count -eq 0) { break }
}
Write-Host 'POLL_DONE'
