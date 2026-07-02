# ============================================================
# YemekhanAI — Modül Oluşturucu
# Kullanım: proje kökünde çalıştır -> .\sdk\create-module.ps1
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  YemekhanAI Modul Olusturucu" -ForegroundColor Cyan
Write-Host "  ==============================" -ForegroundColor Cyan
Write-Host ""

# ── Girdi ───────────────────────────────────────────────────
$moduleId     = (Read-Host "  Modul ID (kebab-case, orn: budget-tracker)").Trim().ToLower()
$moduleLabel  = (Read-Host "  Sidebar etiketi (orn: Butce Takibi)").Trim()
$moduleIcon   = (Read-Host "  Ikon (tek emoji, orn: 💰)").Trim()
$moduleDesc   = (Read-Host "  Kisa aciklama").Trim()
$moduleAuthor = (Read-Host "  Yazarin adi").Trim()

# ── Doğrulama ───────────────────────────────────────────────
if ($moduleId -notmatch '^[a-z][a-z0-9-]+$') {
    Write-Host ""
    Write-Host "  HATA: Modul ID sadece kucuk harf, rakam ve tire icermeli." -ForegroundColor Red
    exit 1
}

# PascalCase türet (budget-tracker -> BudgetTracker)
$componentName = ($moduleId -split '-' | ForEach-Object { $_.Substring(0,1).ToUpper() + $_.Substring(1) }) -join ''
# camelCase export adı (BudgetTracker -> budgetTracker)
$exportName    = $componentName.Substring(0,1).ToLower() + $componentName.Substring(1)

$targetDir = "frontend\src\modules\$moduleId"

if (Test-Path $targetDir) {
    Write-Host ""
    Write-Host "  HATA: '$targetDir' zaten mevcut." -ForegroundColor Red
    exit 1
}

# ── Klasör yap ───────────────────────────────────────────────
New-Item -ItemType Directory -Path "$targetDir\api"   -Force | Out-Null
New-Item -ItemType Directory -Path "$targetDir\pages" -Force | Out-Null

# ── Dosyaları yaz ────────────────────────────────────────────
function Render($templatePath, $outPath) {
    (Get-Content $templatePath -Raw) `
        -replace '__MODULE_ID__',       $moduleId `
        -replace '__MODULE_LABEL__',    $moduleLabel `
        -replace '__MODULE_ICON__',     $moduleIcon `
        -replace '__MODULE_DESC__',     $moduleDesc `
        -replace '__MODULE_AUTHOR__',   $moduleAuthor `
        -replace '__COMPONENT_NAME__',  $componentName `
        -replace '__EXPORT_NAME__',     $exportName |
    Set-Content $outPath -Encoding UTF8
}

Render "sdk\template\index.ts"        "$targetDir\index.ts"
Render "sdk\template\api\api.ts"      "$targetDir\api\$moduleId.ts"
Render "sdk\template\pages\Page.tsx"  "$targetDir\pages\${componentName}Page.tsx"

# ── Çıktı ────────────────────────────────────────────────────
Write-Host ""
Write-Host "  Olusturuldu:" -ForegroundColor Green
Write-Host "    $targetDir\index.ts"
Write-Host "    $targetDir\api\$moduleId.ts"
Write-Host "    $targetDir\pages\${componentName}Page.tsx"
Write-Host ""
Write-Host "  Son adim — su satiri frontend\src\modules\index.ts dosyasina ekle:" -ForegroundColor Yellow
Write-Host ""
Write-Host "    import { ${exportName}Module } from './$moduleId';" -ForegroundColor White
Write-Host "    // modules dizisine ekle: ${exportName}Module," -ForegroundColor White
Write-Host ""
