$file = 'c:/dev/nolida/src/components/messaging/MessageComposer/MessageComposer.tsx'
$cssFile = 'c:/dev/nolida/src/components/messaging/MessageComposer/MessageComposer.css'
$content = Get-Content -Raw $file
$cssMarker = '/* Composer — controlled component'
$jsxEnd = $content.IndexOf($cssMarker)
if ($jsxEnd -lt 0) { throw 'CSS marker not found in file' }
$jsx = $content.Substring(0, $jsxEnd)
$jsx = $jsx.TrimEnd([Environment]::NewLine) + [Environment]::NewLine
$css = $content.Substring($jsxEnd)
$css = $css.Substring(0, $css.LastIndexOf('  </div>'))
$css = $css.Substring(0, $css.LastIndexOf('}')).TrimEnd([Environment]::NewLine) + [Environment]::NewLine
$jsx | Set-Content -LiteralPath $file -Force
$css | Set-Content -LiteralPath $cssFile -Force
Write-Host 'JSX lines: ' ((Get-Content $file).Count)
Write-Host 'CSS lines: ' ((Get-Content $cssFile).Count)
