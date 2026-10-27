$imgBytes = [System.IO.File]::ReadAllBytes("C:\Users\admin\.gemini\antigravity\brain\f26b33ae-a94a-4511-8818-e2e0fefdd534\.user_uploaded\media_1791432497650_4e9b914e.png")
$b64 = [Convert]::ToBase64String($imgBytes)
$payload = @{
    imageBase64 = $b64
    mimeType = "image/png"
} | ConvertTo-Json -Compress

$wc = New-Object System.Net.WebClient
$wc.Headers.Add('Content-Type', 'application/json')
try {
    $res = $wc.UploadString('https://www.retovirtualvzla.com/api/analizar-captura', $payload)
    Write-Host "Success:"
    Write-Host $res
} catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
    Write-Host "Status: $([int]$resp.StatusCode)"
    Write-Host "Body: $($sr.ReadToEnd())"
}
