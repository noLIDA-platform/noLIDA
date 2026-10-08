$file = 'c:/dev/nolida/src/components/messaging/MessageComposer/MessageComposer.tsx'
$content = Get-Content -Raw $file
$nl = [Environment]::NewLine

# 1. Remove extraneous </div> inside onRecorded callback
$extraneous = '      setStatus("idle");' + $nl + '    </div>' + $nl + '    }}'
$content = $content -replace [regex]::Escape($extraneous), '      setStatus("idle");' + $nl + '    }}'

# 2. Add composer div's </div> after input-row div's </div> (before );)
$pattern = '  />' + $nl + '  </div>' + $nl + '  );'
$content = $content -replace [regex]::Escape($pattern), '  />' + $nl + '  </div>' + $nl + '  </div>' + $nl + '  );'

$content | Set-Content -LiteralPath $file -Force
Write-Host 'Fixed. Lines: ' ((Get-Content $file).Count)
