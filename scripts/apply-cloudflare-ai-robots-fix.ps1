param(
  [string]$ZoneId = '6db20e6211bb587c873310cba0578f24',
  [string]$ZoneName = 'taxiassur.com',
  [string]$AccountId = 'fcca12a7ddf64e6dc782494bdb487b8e',
  [string]$PagesProject = 'taxiassur',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Convert-SecureStringToPlainText([securestring]$Value) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    if ($ptr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
  }
}

function Read-CloudflareToken {
  $clipboard = $null
  try {
    $clipboard = (Get-Clipboard -Raw -ErrorAction Stop).Trim()
  } catch {
    $clipboard = $null
  }

  if ($clipboard -match '^cfut_[A-Za-z0-9_-]{20,}$') {
    Write-Host 'OK - token Cloudflare detecte dans le presse-papiers'
    return $clipboard
  }

  $secureToken = Read-Host 'Token Cloudflare Bot Management (saisie masquee)' -AsSecureString
  $token = Convert-SecureStringToPlainText $secureToken
  if ($token -notmatch '^cfut_[A-Za-z0-9_-]{20,}$') {
    throw 'Token Cloudflare invalide ou absent. Il doit commencer par cfut_.'
  }

  return $token
}

Write-Host 'Correction Cloudflare Managed robots.txt TaxiAssur'
Write-Host "Zone : $ZoneName / $ZoneId"
Write-Host 'Le token ne sera ni affiche ni stocke.'
Write-Host ''

$token = Read-CloudflareToken

try {
  $env:CLOUDFLARE_API_TOKEN = $token
  $env:CLOUDFLARE_ZONE_ID = $ZoneId
  $env:CLOUDFLARE_ZONE_NAME = $ZoneName
  $env:CLOUDFLARE_ACCOUNT_ID = $AccountId
  $env:CLOUDFLARE_PAGES_PROJECT = $PagesProject

  $args = @('scripts\configure-cloudflare-ai-robots.cjs')
  if ($DryRun) { $args += '--dry-run' }
  & node @args
  if ($LASTEXITCODE -ne 0) { throw "Correction Cloudflare echouee avec code $LASTEXITCODE" }
} finally {
  Remove-Item Env:\CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue
  Remove-Item Env:\CLOUDFLARE_ZONE_ID -ErrorAction SilentlyContinue
  Remove-Item Env:\CLOUDFLARE_ZONE_NAME -ErrorAction SilentlyContinue
  Remove-Item Env:\CLOUDFLARE_ACCOUNT_ID -ErrorAction SilentlyContinue
  Remove-Item Env:\CLOUDFLARE_PAGES_PROJECT -ErrorAction SilentlyContinue
}

if (-not $DryRun) {
  Write-Host ''
  Write-Host 'Verification SEO live'
  npm run verify:seo-leadership
}
