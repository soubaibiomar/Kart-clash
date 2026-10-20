$ErrorActionPreference = 'Stop'
$launcher = Join-Path $PSScriptRoot '..\gp\training\start.ps1'
# Mock transport and process operations: never stop services or launch a GPU job.
function Get-NetTCPConnection { param($LocalPort, $State) [pscustomobject]@{ OwningProcess = 1 } }
function Start-Sleep { param($Milliseconds) }
function Start-Process { param($FilePath, $ArgumentList, $WorkingDirectory, $WindowStyle) $global:apexLauncherTestState.launchCalls.Add([string]$FilePath) }
function Invoke-WebRequest {
  param($Uri, $TimeoutSec)
  $global:apexLauncherTestState.probeCalls++
  if ($global:apexLauncherTestState.replyMode -eq 'html') { return @{ Headers=@{'Content-Type'='text/html'}; Content='<!DOCTYPE html>' } }
  if ($Uri -like '*training-options') {
    if ($global:apexLauncherTestState.replyMode -eq 'legacy') { return @{ Headers=@{'Content-Type'='application/json'}; Content='{}' } }
    return @{ Headers=@{'Content-Type'='application/json'}; Content='{"weightControls":1}' }
  }
  return @{ Headers=@{'Content-Type'='application/json'}; Content='{"status":"idle"}' }
}
$global:apexLauncherTestState = @{}
$global:apexLauncherTestState.launchCalls = [System.Collections.Generic.List[string]]::new()
$global:apexLauncherTestState.probeCalls = 0
$global:apexLauncherTestState.replyMode = 'html'
$blocked = $false
try { & $launcher } catch { $blocked = $_.Exception.Message -match '8765' }
if (-not $blocked -or $global:apexLauncherTestState.launchCalls.Count -ne 0 -or $global:apexLauncherTestState.probeCalls -ne 12) { throw 'HTML service must block launch with a useful port error.' }
$global:apexLauncherTestState.probeCalls = 0
$global:apexLauncherTestState.replyMode = 'json'
& $launcher
if ($global:apexLauncherTestState.probeCalls -ne 2 -or $global:apexLauncherTestState.launchCalls.Count -ne 1 -or $global:apexLauncherTestState.launchCalls[0] -ne 'http://127.0.0.1:8765/index.html') { throw 'Healthy existing web and GPU APIs must be preserved and the platform opened once.' }
$global:apexLauncherTestState.launchCalls.Clear()
$global:apexLauncherTestState.replyMode = 'legacy'
$blocked = $false
try { & $launcher } catch { $blocked = $_.Exception.Message -match '8767' }
if (-not $blocked -or $global:apexLauncherTestState.launchCalls.Count -ne 0) { throw 'A legacy GPU API must be rejected without opening the platform or stopping a service.' }
'3 launcher tests passed; all process and network operations mocked.'

Remove-Variable apexLauncherTestState -Scope Global
