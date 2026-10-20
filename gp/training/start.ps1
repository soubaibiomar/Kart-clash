$ErrorActionPreference = 'Stop'
$trainingDirectory = $PSScriptRoot
$pythonPath = Join-Path $trainingDirectory '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) {
  throw 'CUDA environment missing. See gp/training/README.md.'
}
if (-not (Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)) {
  Start-Process -FilePath $pythonPath -ArgumentList @((Join-Path $trainingDirectory 'server.py')) -WorkingDirectory $trainingDirectory -WindowStyle Hidden
}
# A static web server on this port cannot run the CUDA API. Never stop it silently.
$serviceReady = $false
for ($serviceAttempt = 0; $serviceAttempt -lt 12; $serviceAttempt++) {
  try {
    $serviceResponse = Invoke-WebRequest 'http://127.0.0.1:8765/api/status' -TimeoutSec 2
    if ($serviceResponse.Headers['Content-Type'] -notmatch 'application/json') {
      throw 'Le port 8765 est occupé par un serveur web sans API CUDA.'
    }
    $serviceStatus = $serviceResponse.Content | ConvertFrom-Json
    $serviceReady = $serviceStatus.status -in @('idle','running','completed','stopped','interrupted','error')
    if ($serviceReady) { break }
  } catch {
    if ($serviceAttempt -eq 11) { throw "Service CUDA indisponible sur le port 8765. Ferme le serveur web qui utilise ce port, puis relance ce fichier. $($_.Exception.Message)" }
  }
  Start-Sleep -Milliseconds 250
}
if (-not $serviceReady) { throw 'Le service sur le port 8765 ne répond pas avec un état CUDA valide.' }
# Keep the web/radio service intact. Updated GPU API has its own loopback port.
if (-not (Get-NetTCPConnection -LocalPort 8767 -State Listen -ErrorAction SilentlyContinue)) {
  if ($serviceStatus.status -eq 'running') { throw 'Un entraînement est actif sur le service précédent. Attends sa fin avant de démarrer le nouveau moteur.' }
  Start-Process -FilePath $pythonPath -ArgumentList @((Join-Path $trainingDirectory 'server.py'),'--port','8767') -WorkingDirectory $trainingDirectory -WindowStyle Hidden
}
$gpuServiceReady = $false
for ($gpuAttempt = 0; $gpuAttempt -lt 12; $gpuAttempt++) {
  try {
    $gpuResponse = Invoke-WebRequest 'http://127.0.0.1:8767/api/training-options' -TimeoutSec 2
    if ($gpuResponse.Headers['Content-Type'] -notmatch 'application/json') { throw 'API CUDA JSON attendue sur le port 8767.' }
    $gpuOptions = $gpuResponse.Content | ConvertFrom-Json
    if ($gpuOptions.weightControls -ne 1) { throw 'Version du moteur CUDA incompatible sur le port 8767.' }
    $gpuServiceReady = $true
    break
  } catch {
    if ($gpuAttempt -eq 11) { throw "Moteur CUDA indisponible sur le port 8767. $($_.Exception.Message)" }
  }
  Start-Sleep -Milliseconds 250
}
if (-not $gpuServiceReady) { throw 'Moteur CUDA à jour indisponible.' }
$voiceScript = Join-Path $trainingDirectory '..\radio\voice_server.py'
if (-not (Get-NetTCPConnection -LocalPort 8766 -State Listen -ErrorAction SilentlyContinue)) {
  Start-Process -FilePath $pythonPath -ArgumentList @($voiceScript) -WorkingDirectory $trainingDirectory -WindowStyle Hidden
}
Start-Process 'http://127.0.0.1:8765/index.html'
