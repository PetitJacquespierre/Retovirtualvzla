$web = Invoke-WebRequest -Uri "https://docs.google.com/spreadsheets/d/1vg9nwhkFxwN4qVzjkfmXTrIVoHVYxeMH3-PXjqzeWao/edit?usp=sharing" -UseBasicParsing
$pattern = '"name":"([^"]+)"[^{}]*?"sheetId":(\d+)'
$regex = [regex]$pattern
$matches = $regex.Matches($web.Content)
foreach ($m in $matches) {
    Write-Host "Pestaña: $($m.Groups[1].Value)  ->  GID: $($m.Groups[2].Value)"
}
