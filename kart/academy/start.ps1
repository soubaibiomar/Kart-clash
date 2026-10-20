$ErrorActionPreference = 'Stop'
$kartPython = Join-Path $PSScriptRoot '../../gp/training/.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $kartPython)) { throw 'Environnement CUDA absent. Voir README.md : utiliser Python avec PyTorch CUDA installé.' }
Write-Host 'Service optionnel uniquement. Aucun entraînement ne démarre sans le bouton de l’Académie.'
& $kartPython (Join-Path $PSScriptRoot 'server.py') --port 8871
