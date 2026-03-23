$sbKey = $env:SUPABASE_SERVICE_ROLE_KEY
if (-not $sbKey) { Write-Error "SUPABASE_SERVICE_ROLE_KEY not set"; exit 1 }
$base = "$($env:SUPABASE_URL)/rest/v1"
if (-not $env:SUPABASE_URL) { Write-Error "SUPABASE_URL not set"; exit 1 }
$headers = @{
    "apikey" = $sbKey
    "Authorization" = "Bearer $sbKey"
    "Prefer" = "count=exact"
}

$tables = @("counties", "parcels", "assessments", "sales", "neighborhoods", "gis_layers", "saved_filters")

foreach ($t in $tables) {
    try {
        $resp = Invoke-WebRequest "$base/$($t)?select=id&limit=1" -Headers $headers -UseBasicParsing -ErrorAction Stop
        $range = $resp.Headers['Content-Range']
        Write-Host "$($t): $range"
    }
    catch {
        $status = $_.Exception.Response.StatusCode.value__
        Write-Host "$($t): HTTP $status - $($_.Exception.Message)"
    }
}
