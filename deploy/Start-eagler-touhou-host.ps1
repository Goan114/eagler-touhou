[CmdletBinding()]
param(
    [string] $HostRoot,
    [switch] $BuildOnly,
    [int] $Port = 8130,
    [string] $Bind = '127.0.0.1',
    [string[]] $Music = @('midi', 'ogg'),
    [string] $FeatureConfig,
    [string] $FontFile,
    [string] $VanillaFontFile,
    [string] $Python = 'python',
    [switch] $SuppressPostBuildDoctor,
    [switch] $NoOpen
)

$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent

$script:HostProgressId = 6100
$script:HostProgressTotal = 6

function Write-HostBuildStage {
    param(
        [Parameter(Mandatory = $true)][int] $Step,
        [Parameter(Mandatory = $true)][string] $Status
    )
    $percent = [Math]::Max(0, [Math]::Min(99, [int](($Step - 1) * 100 / $script:HostProgressTotal)))
    Write-Progress -Id $script:HostProgressId -Activity 'Eagler Touhou build' `
        -Status "[$Step/$($script:HostProgressTotal)] $Status" -PercentComplete $percent
    Write-Host "[Build $Step/$($script:HostProgressTotal)] $Status"
}

function Complete-HostBuildProgress {
    param([string] $Status = 'Complete')
    Write-Progress -Id $script:HostProgressId -Activity 'Eagler Touhou build' -Status $Status -PercentComplete 100
    Write-Progress -Id $script:HostProgressId -Activity 'Eagler Touhou build' -Completed
}

if (-not $HostRoot) { $HostRoot = $project }
$HostRoot = [IO.Path]::GetFullPath($HostRoot)
$Music = @($Music | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ })
$musicText = [string]::Join(',', $Music)
Write-HostBuildStage 1 'Validating Host inputs and configuration'
$layoutJson = & node (Join-Path $project 'scripts\inspect-quick-host.mjs') "--root=$HostRoot" "--music=$musicText" '--json=1'
if ($LASTEXITCODE -ne 0) { throw "Quick Host input validation failed: $LASTEXITCODE" }
$layout = $layoutJson | ConvertFrom-Json

function Ensure-NodeDependencies {
    $requiredPackages = @('fflate', 'workbox-build')
    $missing = @($requiredPackages | Where-Object {
        -not (Test-Path -LiteralPath (Join-Path $project "node_modules\$_\package.json") -PathType Leaf)
    })
    if ($missing.Count -eq 0) { return }

    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npm) {
        throw 'npm is required to prepare Eagler Touhou Host dependencies. Install Node.js with npm and ensure npm is available on PATH.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $project 'package-lock.json') -PathType Leaf)) {
        throw 'package-lock.json is missing; refusing to install unpinned Node dependencies.'
    }

    Write-Host 'Preparing locked Node.js dependencies with npm ci...'
    Push-Location $project
    try {
        & $npm.Source ci --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed: $LASTEXITCODE" }
    } finally {
        Pop-Location
    }

    $stillMissing = @($requiredPackages | Where-Object {
        -not (Test-Path -LiteralPath (Join-Path $project "node_modules\$_\package.json") -PathType Leaf)
    })
    if ($stillMissing.Count) {
        throw "Node.js dependency installation completed but required packages are still missing: $([string]::Join(', ', $stillMissing))"
    }
}

Write-HostBuildStage 2 'Preparing Node.js dependencies'
Ensure-NodeDependencies

Import-Module (Join-Path $PSScriptRoot 'WorkspaceLayout.psm1') -Force
$workspaceLayout = Get-EaglerWorkspaceLayout -ProjectRoot $project

if (-not $FontFile) {
    if ($layout.bundledFonts.unicode) {
        $FontFile = [string]$layout.bundledFonts.unicode
    } else {
        $FontFile = Get-EaglerWorkspacePath $workspaceLayout 'dependencies' 'unifont-15.1.05\unifont-15.1.05.otf'
    }
}
if (-not $VanillaFontFile) {
    if ($layout.bundledFonts.japanese) {
        $VanillaFontFile = [string]$layout.bundledFonts.japanese
    } elseif ($env:WINDIR -and (Test-Path -LiteralPath (Join-Path $env:WINDIR 'Fonts\msgothic.ttc') -PathType Leaf)) {
        $VanillaFontFile = Join-Path $env:WINDIR 'Fonts\msgothic.ttc'
    } else {
        # A redistributable Host Kit should ship shared/japanese-font.otf.
        # For a source checkout, fall back to the Unicode font so a Linux host
        # can still assemble a functional site without a Microsoft font.
        $VanillaFontFile = $FontFile
        Write-Warning 'MS Gothic / bundled Japanese font not found; using the Unicode font as the Japanese runtime fallback.'
    }
}
if (-not $FeatureConfig) { $FeatureConfig = Join-Path $PSScriptRoot 'server-features.json' }

$baseFeatures = Get-Content -LiteralPath $FeatureConfig -Raw | ConvertFrom-Json -AsHashtable
$relayUrl = [string]$layout.hostConfig.netplay.relay
$externalUrl = [string]$layout.hostConfig.externalImportSource.url
$externalHint = [string]$layout.hostConfig.externalImportSource.hint
if ($relayUrl) { $baseFeatures['netplayRelay'] = $relayUrl } else { [void]$baseFeatures.Remove('netplayRelay') }
if ($externalUrl) {
    $fallback = @{ url = $externalUrl }
    if ($externalHint) { $fallback['hint'] = $externalHint }
    $baseFeatures['gameDataFallback'] = $fallback
} else {
    [void]$baseFeatures.Remove('gameDataFallback')
}

Import-Module (Join-Path $PSScriptRoot 'DeploymentPython.psm1') -Force
$deploymentPythonRoot = Join-Path $project '.deploy-python'
Write-HostBuildStage 3 'Preparing the private Python environment'
$hostPython = Resolve-DeploymentPython -Python $Python -EnvironmentDirectory $deploymentPythonRoot `
    -RequirementsPath (Join-Path $PSScriptRoot 'requirements.txt') -RequiredModules @('fontTools', 'soundfile')
$hostPython = Resolve-DeploymentPython -Python $hostPython -EnvironmentDirectory $deploymentPythonRoot `
    -RequirementsPath (Join-Path $PSScriptRoot 'requirements-ui.txt') -RequiredModules @('PIL') -RequirePrivateEnvironment

$generatedCacheRoot = Join-Path $HostRoot '.cache\generated'
$languageRoot = Join-Path $generatedCacheRoot 'language-packs'
$th06LanguagePacks = $null
$th07LanguagePacks = $null
$defaultLanguages = @('ja', 'lang_zh-hans', 'lang_en')
try {
    Write-HostBuildStage 4 'Preparing thtk'
    Import-Module (Join-Path $PSScriptRoot 'Thtk.psm1') -Force
    $thtk = Resolve-Thtk -ProjectRoot $project
    $thdat = [string]$thtk.Thdat
    $thmsg = [string]$thtk.Thmsg
    $thanm = [string]$thtk.Thanm

    $th06LanguagePacks = Join-Path $languageRoot 'th06'
    $th07LanguagePacks = Join-Path $languageRoot 'th07'
    $th06Archives = @(
        '紅魔郷CM.DAT', '紅魔郷ED.DAT', '紅魔郷IN.DAT',
        '紅魔郷MD.DAT', '紅魔郷ST.DAT', '紅魔郷TL.DAT'
    ) | ForEach-Object { Join-Path ([string]$layout.games.th06) $_ }
    Write-HostBuildStage 5 'Preparing default language packs'
    $languageProgressId = 6101
    $languageTask = 0
    $languageTaskTotal = 4
    foreach ($language in @('lang_zh-hans', 'lang_en')) {
        $languageTask += 1
        $languageLabel = if ($language -eq 'lang_zh-hans') { 'Simplified Chinese' } else { 'English' }
        Write-Progress -Id $languageProgressId -ParentId $script:HostProgressId -Activity 'Language packs' `
            -Status "[$languageTask/$languageTaskTotal] TH06 $languageLabel" `
            -PercentComplete ([int](($languageTask - 1) * 100 / $languageTaskTotal))
        $languageResultJson = & node (Join-Path $project 'scripts\prepare-th06-language-pack.mjs') `
            --game th06 --language $language --thdat $thdat --thmsg $thmsg `
            --archives ([string]::Join(';', $th06Archives)) --output $th06LanguagePacks `
            --font-file $FontFile --font-python $hostPython
        if ($LASTEXITCODE -ne 0) { throw "TH06 $language preparation failed: $LASTEXITCODE" }
        $languageResult = $languageResultJson | ConvertFrom-Json
        $languageState = if ($languageResult.cached) { 'CACHED' } else { 'READY' }
        Write-Host "[Language packs $languageTask/$languageTaskTotal] TH06 $languageLabel - $languageState"

        $languageTask += 1
        Write-Progress -Id $languageProgressId -ParentId $script:HostProgressId -Activity 'Language packs' `
            -Status "[$languageTask/$languageTaskTotal] TH07 $languageLabel" `
            -PercentComplete ([int](($languageTask - 1) * 100 / $languageTaskTotal))
        $languageResultJson = & node (Join-Path $project 'scripts\prepare-th06-language-pack.mjs') `
            --game th07 --language $language --thdat $thdat --thmsg $thmsg `
            --archive (Join-Path ([string]$layout.games.th07) 'th07.dat') --output $th07LanguagePacks `
            --font-file $FontFile --font-python $hostPython
        if ($LASTEXITCODE -ne 0) { throw "TH07 $language preparation failed: $LASTEXITCODE" }
        $languageResult = $languageResultJson | ConvertFrom-Json
        $languageState = if ($languageResult.cached) { 'CACHED' } else { 'READY' }
        Write-Host "[Language packs $languageTask/$languageTaskTotal] TH07 $languageLabel - $languageState"
    }
    Write-Progress -Id $languageProgressId -ParentId $script:HostProgressId -Activity 'Language packs' -Completed
    foreach ($game in @('th06', 'th07')) { $baseFeatures.games[$game]['languages'] = $defaultLanguages }
    Write-Host 'Default languages ready: Japanese / Simplified Chinese / English'
} catch {
    throw "Default language preparation failed. Quick Host requires Japanese, Simplified Chinese, and English. $($_.Exception.Message)"
}
$effectiveFeatureConfig = Join-Path ([IO.Path]::GetTempPath()) "eagler-touhou-host-features-$([guid]::NewGuid().ToString('N')).json"
[IO.File]::WriteAllText($effectiveFeatureConfig, (($baseFeatures | ConvertTo-Json -Depth 20) + [Environment]::NewLine), [Text.UTF8Encoding]::new($false))

try {
    Write-HostBuildStage 6 'Assembling and verifying the static site'
    $prepareArgs = @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'Prepare-eagler-touhou-server.ps1'),
        '-RuntimeRelease', [string]$layout.runtimeRelease,
        '-Th06Directory', [string]$layout.games.th06,
        '-Th07Directory', [string]$layout.games.th07,
        '-Th08Directory', [string]$layout.games.th08,
        '-OutputDirectory', [string]$layout.site,
        '-FeatureConfig', $effectiveFeatureConfig,
        '-FontFile', $FontFile,
        '-VanillaFontFile', $VanillaFontFile,
        '-Python', $hostPython,
        '-GeneratedCacheDirectory', $generatedCacheRoot,
        '-ThtkThanm', $thanm,
        '-Music', $musicText,
        '-Profile', 'web-validation-quick-host',
        '-SuppressCompletionSummary'
    )
    if ($th06LanguagePacks) { $prepareArgs += @('-Th06LanguagePacks', $th06LanguagePacks) }
    if ($th07LanguagePacks) { $prepareArgs += @('-Th07LanguagePacks', $th07LanguagePacks) }
    & pwsh @prepareArgs
    if ($LASTEXITCODE -ne 0) { throw "Quick Host assembly failed: $LASTEXITCODE" }
} finally {
    Remove-Item -LiteralPath $effectiveFeatureConfig -Force -ErrorAction SilentlyContinue
}

Complete-HostBuildProgress 'Build complete'
if (-not $SuppressPostBuildDoctor) {
    Write-Host ''
    & node (Join-Path $project 'scripts\inspect-quick-host.mjs') "--root=$HostRoot" "--music=$musicText" '--post-build=1'
    if ($LASTEXITCODE -ne 0) { throw "Post-build doctor failed: $LASTEXITCODE" }
}
if ($BuildOnly) {
    return
}
if ($Bind -eq '0.0.0.0' -or $Bind -eq '::') {
    Write-Warning 'The built-in server is intended for trusted local/LAN use. Use HTTPS nginx/CDN/reverse proxy for a public deployment.'
}
$env:EAGLER_TOUHOU_HOST = $Bind
$urlHost = if ($Bind -eq '0.0.0.0' -or $Bind -eq '::') { '127.0.0.1' } else { $Bind }
$url = "http://$urlHost`:$Port/eagler-touhou/"
Write-Host "Starting local hosted site: $url"
if (-not $NoOpen -and $Bind -in @('127.0.0.1', 'localhost', '::1')) {
    try { Start-Process $url } catch { Write-Warning "Unable to open browser automatically: $($_.Exception.Message)" }
}
& node (Join-Path $project 'scripts\serve-static.mjs') ([string]$layout.site) $Port

