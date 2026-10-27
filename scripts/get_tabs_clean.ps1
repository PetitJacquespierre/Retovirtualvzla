$url = 'https://docs.google.com/spreadsheets/d/1vg9nwhkFxwN4qVzjkfmXTrIVoHVYxeMH3-PXjqzeWao/htmlview'
$html = (Invoke-WebRequest -Uri $url -UseBasicParsing).Content
$pattern = 'items\.push\(\{([^}]+)\}\)'
$matches = [regex]::Matches($html, $pattern)
foreach ($m in $matches) {
    Write-Output $m.Groups[1].Value
}
