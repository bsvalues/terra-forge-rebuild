# TerraFusion OS — Benton County Full Seed Runner
# ================================================
# Orchestrates the complete Benton County data seed:
#   1. Install Python dependencies
#   2. Seed PACS data (parcels, assessments, sales) from CSV exports
#   3. Seed GIS layers (parcel polygons, boundaries) from FGDB
#
# Usage:
#   .\scripts\seed_benton.ps1
#   .\scripts\seed_benton.ps1 -DryRun          # report counts, no writes
#   .\scripts\seed_benton.ps1 -SkipGdb         # skip FGDB geometry (faster)
#   .\scripts\seed_benton.ps1 -SkipGis         # skip GIS layer seed
#   .\scripts\seed_benton.ps1 -PacsOnly        # PACS data only
#
# Prerequisites:
#   - py -3.12 must be available (Python 3.12 from python.org)
#   - Service role key in scripts\.env.seed:
#       SUPABASE_SERVICE_ROLE_KEY=eyJ...
#   - PACS exports at E:\Exports\Exports\dataextract\ftp_dl_*.csv
#   - Benton GDB at E:\Benton_County_Assessor.gdb

param(
    [switch]$DryRun,
    [switch]$SkipGdb,
    [switch]$SkipGis,
    [switch]$PacsOnly,
    [switch]$SkipSales,
    [switch]$InstallDeps
)

Set-StrictMode -Off
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Split-Path -Parent $ScriptDir

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  TerraFusion OS — Benton County Full Data Seed" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ── Validate env.seed ──────────────────────────────────────────────────────
$envSeed = Join-Path $ScriptDir ".env.seed"
if (-not (Test-Path $envSeed)) {
    Write-Host "ERROR: scripts\.env.seed not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Create it with your Supabase service_role key:" -ForegroundColor Yellow
    Write-Host "  New-Item scripts\.env.seed -Value 'SUPABASE_SERVICE_ROLE_KEY=eyJ...'"
    Write-Host ""
    Write-Host "Get the key from:"
    Write-Host "  https://supabase.com/dashboard/project/udjoodlluygvlqccwade/settings/api"
    Write-Host ""
    exit 1
}

# Load .env.seed into current process env
Get-Content $envSeed | Where-Object { $_ -match '^\s*[^#].*=.*' } | ForEach-Object {
    $parts = $_ -split '=', 2
    [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim())
}

if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "ERROR: SUPABASE_SERVICE_ROLE_KEY not found in scripts\.env.seed" -ForegroundColor Red
    exit 1
}

Write-Host "  Service key: ***$(($env:SUPABASE_SERVICE_ROLE_KEY)[-8..-1] -join '')" -ForegroundColor Green
Write-Host ""

# ── Check Python ───────────────────────────────────────────────────────────
try {
    $pyVer = (py -3.12 --version 2>&1).ToString()
    Write-Host "  Python: $pyVer" -ForegroundColor Green
} catch {
    Write-Host "ERROR: py -3.12 not found. Install Python 3.12 from python.org" -ForegroundColor Red
    exit 1
}

# ── Install dependencies ───────────────────────────────────────────────────
if ($InstallDeps) {
    Write-Host ""
    Write-Host "── Installing Python dependencies ─────────────────────────────" -ForegroundColor Yellow
    py -3.12 -m pip install requests pyogrio geopandas pyproj python-dotenv --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: pip install had errors — continuing anyway" -ForegroundColor Yellow
    } else {
        Write-Host "  Dependencies OK" -ForegroundColor Green
    }
}

# ── Validate source files ──────────────────────────────────────────────────
Write-Host ""
Write-Host "── Source file check ───────────────────────────────────────────" -ForegroundColor Yellow

$sourceFiles = @(
    "E:\Exports\Exports\dataextract\ftp_dl_property_val.csv",
    "E:\Exports\Exports\dataextract\ftp_dl_situs.csv",
    "E:\Exports\Exports\dataextract\ftp_dl_sales_chg_of_owner.csv",
    "E:\Exports\Exports\dataextract\ftp_dl_imprv.csv",
    "E:\Exports\Exports\dataextract\ftp_dl_roll_value_history.csv"
)

$allFound = $true
foreach ($f in $sourceFiles) {
    if (Test-Path $f) {
        $size = (Get-Item $f).Length / 1MB
        Write-Host ("  OK  {0,-20} {1:F1} MB" -f (Split-Path $f -Leaf), $size) -ForegroundColor Green
    } else {
        Write-Host "  MISSING  $f" -ForegroundColor Red
        $allFound = $false
    }
}

$gdbPresent = Test-Path "E:\Benton_County_Assessor.gdb"
if ($gdbPresent) {
    Write-Host "  OK  Benton_County_Assessor.gdb" -ForegroundColor Green
} else {
    Write-Host "  MISSING  E:\Benton_County_Assessor.gdb  (centroids will be null)" -ForegroundColor Yellow
    $SkipGdb = $true
}

if (-not $allFound) {
    Write-Host ""
    Write-Host "ERROR: Required source files missing." -ForegroundColor Red
    exit 1
}

Write-Host ""

# ── Build Python args ──────────────────────────────────────────────────────
$pacsArgs = @()
if ($DryRun)    { $pacsArgs += "--dry-run" }
if ($SkipGdb)   { $pacsArgs += "--skip-gdb" }
if ($SkipSales) { $pacsArgs += "--skip-sales" }

# ── Run PACS seeder ────────────────────────────────────────────────────────
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  STEP 1/2: PACS Data Seed (parcels, assessments, sales)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

$pacsScript = Join-Path $ScriptDir "seed_benton_pacs.py"
py -3.12 $pacsScript @pacsArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: PACS seeder failed (exit code $LASTEXITCODE)" -ForegroundColor Red
    Write-Host "Check output above for details."
    exit $LASTEXITCODE
}

# ── Run GIS seeder ─────────────────────────────────────────────────────────
if (-not $PacsOnly -and -not $SkipGis) {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  STEP 2/2: GIS Layer Seed (parcel polygons, boundaries)" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan

    $gisScript = Join-Path $ScriptDir "seed_benton_gis.py"
    $gisArgs = @()
    if ($DryRun) { $gisArgs += "--dry-run" }

    py -3.12 $gisScript @gisArgs

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "WARNING: GIS seeder had errors (exit code $LASTEXITCODE)" -ForegroundColor Yellow
        Write-Host "PACS data was seeded successfully. GIS layers can be retried standalone:"
        Write-Host "  py -3.12 scripts\seed_benton_gis.py"
    }
} else {
    Write-Host ""
    Write-Host "── STEP 2/2: GIS Layer Seed (SKIPPED) ─────────────────────────" -ForegroundColor Yellow
    Write-Host "  Run separately:  py -3.12 scripts\seed_benton_gis.py"
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Benton County seed complete." -ForegroundColor Green
Write-Host "  Open TerraFusion and select Benton County to verify." -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
