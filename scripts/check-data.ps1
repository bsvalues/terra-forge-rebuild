$sbKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkam9vZGxsdXlndmxxY2N3YWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMjE4OTcsImV4cCI6MjA4OTY5Nzg5N30.Usa9Lr6LR2-3kxiIkrChWxWvesAOXhUMgSZW8aIfghg"
$base = "https://udjoodlluygvlqccwade.supabase.co/rest/v1"
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
