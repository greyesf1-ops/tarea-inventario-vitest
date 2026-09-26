$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.SelectVoice('Microsoft Helena Desktop')
$speaker.Rate = 1
$taskRoot = Split-Path -Parent $PSScriptRoot
$audioDir = Join-Path $taskRoot 'output/audio'
New-Item -ItemType Directory -Path $audioDir -Force | Out-Null
$parts = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'narration.json') -Raw -Encoding UTF8 | ConvertFrom-Json
for ($i = 0; $i -lt $parts.Count; $i++) {
  $speaker.SetOutputToWaveFile((Join-Path $audioDir "$i.wav"))
  $speaker.Speak($parts[$i].text)
  $speaker.SetOutputToNull()
}
$speaker.Dispose()
