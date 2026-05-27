# Synchronise le dossier theme_export vers Shopify (une seule commande à retenir)
# Clic droit → Exécuter avec PowerShell, ou dans ce dossier :  .\SYNCHRONISER-MOZARF.ps1

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
Set-Location $Root

$Toml = Join-Path $Root "shopify.theme.toml"
$ExportPath = "theme_export__www-mozarf-com-copie-de-mozarf-theme__10APR2026-1055pm"

if (-not (Test-Path (Join-Path $Root $ExportPath))) {
    Write-Host "Erreur : dossier $ExportPath introuvable." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $Toml)) {
    Write-Host ""
    Write-Host "=== Configuration une seule fois ===" -ForegroundColor Cyan
    Write-Host "Trouve ton domaine : Admin Shopify > Parametres > Details de la boutique"
    Write-Host "Exemple : mozarf-com.myshopify.com"
    Write-Host ""
    $store = Read-Host "Colle ton domaine myshopify.com"
    $store = $store.Trim()
    if ($store -notmatch "\.myshopify\.com") {
        Write-Host "Attention : utilise le format xxx.myshopify.com" -ForegroundColor Yellow
    }
    $lines = @(
        "[environments.default]",
        "store = `"$store`""
    )
    Set-Content -Path $Toml -Value ($lines -join "`n") -Encoding UTF8
    Write-Host "OK : shopify.theme.toml cree." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Connexion Shopify (le navigateur va s'ouvrir) ===" -ForegroundColor Cyan
npx shopify auth login

Write-Host ""
Write-Host "=== Envoi du theme vers la boutique ===" -ForegroundColor Cyan
Write-Host "Choisis un theme de BROUILLON / DEV (pas le theme en ligne sauf si tu sais ce que tu fais)."
npx shopify theme push --path $ExportPath

Write-Host ""
Write-Host "Termine." -ForegroundColor Green
