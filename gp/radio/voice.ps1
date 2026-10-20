$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Speech
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $voices = @($speaker.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { @{name=$_.VoiceInfo.Name; language=$_.VoiceInfo.Culture.Name} })
  if ($request.catalog) { @{voices=$voices} | ConvertTo-Json -Compress; exit 0 }
  $language = $request.language.Substring(0,2)
  $voice = $voices | Where-Object { $_.language.StartsWith($language) } | Select-Object -First 1
  if (-not $voice) { throw "No installed voice for $language" }
  $speaker.SelectVoice($voice.name)
  $speaker.Rate = 1
  $stream = New-Object System.IO.MemoryStream
  try {
    $speaker.SetOutputToWaveStream($stream)
    $speaker.Speak([string]$request.text)
    $speaker.SetOutputToNull()
    @{audio=[Convert]::ToBase64String($stream.ToArray()); voice=$voice.name; language=$voice.language} | ConvertTo-Json -Compress
  } finally { $stream.Dispose() }
} finally { $speaker.Dispose() }
