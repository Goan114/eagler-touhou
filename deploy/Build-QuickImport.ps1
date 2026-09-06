[CmdletBinding()]
param(
    [string] $HostRoot,
    [string[]] $Music = @('midi', 'ogg'),
    [string] $Python = 'python',
    [switch] $RebuildHostedBase
)

$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
if (-not $HostRoot) { $HostRoot = $project }
$HostRoot = [IO.Path]::GetFullPath($HostRoot)
$Music = @($Music | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ })
$musicText = [string]::Join(',', $Music)

$layoutJson = & node (Join-Path $project 'scripts\inspect-quick-host.mjs') "--root=$HostRoot" "--music=$musicText" '--json=1'
if ($LASTEXITCODE -ne 0) { throw "Quick Import input validation failed: $LASTEXITCODE" }
$layout = $layoutJson | ConvertFrom-Json

function Test-ReusableHostedBase {
    param(
        [Parameter(Mandatory = $true)] $Layout,
        [Parameter(Mandatory = $true)][string[]] $ExpectedMusic
    )

    if ($RebuildHostedBase) { return $false }
    $deploymentPath = Join-Path ([string]$Layout.site) 'deployment.json'
    if (-not (Test-Path -LiteralPath $deploymentPath -PathType Leaf)) { return $false }

    try {
        $deployment = Get-Content -LiteralPath $deploymentPath -Raw | ConvertFrom-Json
        if ($deployment.format -ne 'eagler-touhou-deployment/1' -or
            $deployment.profile -ne 'web-validation-quick-host' -or
            $deployment.resourceMode -ne 'hosted') { return $false }

        $expectedGames = @('th06', 'th07', 'th08')
        $actualGames = @($deployment.games | ForEach-Object { ([string]$_).ToLowerInvariant() } | Sort-Object -Unique)
        if ([string]::Join(',', $actualGames) -ne [string]::Join(',', $expectedGames)) { return $false }

        $actualMusic = @($deployment.music | ForEach-Object { ([string]$_).ToLowerInvariant() } | Sort-Object -Unique)
        $expectedMusicSet = @($ExpectedMusic | Sort-Object -Unique)
        if ([string]::Join(',', $actualMusic) -ne [string]::Join(',', $expectedMusicSet)) { return $false }

        $generatedAt = [DateTimeOffset]::Parse([string]$deployment.generatedAt).UtcDateTime
        foreach ($inputRoot in @(
            [string]$Layout.runtimeRelease,
            [string]$Layout.shared,
            [string]$Layout.games.th06,
            [string]$Layout.games.th07,
            [string]$Layout.games.th08
        )) {
            $newer = Get-ChildItem -LiteralPath $inputRoot -Recurse -File -Force -ErrorAction Stop |
                Where-Object { $_.LastWriteTimeUtc -gt $generatedAt } |
                Select-Object -First 1
            if ($newer) { return $false }
        }

        $null = & node (Join-Path $project 'scripts\verify-server-build.mjs') ([string]$Layout.site) 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

# Import artifacts are derived from the exact same verified hosted generation.
# If that generation already exists and still matches the current Host inputs,
# reuse it rather than regenerating DATA, OGG, artwork and language packs.
if (Test-ReusableHostedBase -Layout $layout -ExpectedMusic $Music) {
    Write-Host "Reusing verified hosted base: $($layout.site)"
} else {
    Write-Host 'Preparing hosted base for Import...'
    & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'Start-eagler-touhou-host.ps1') `
        -HostRoot $HostRoot -BuildOnly -Music $musicText -Python $Python -SuppressPostBuildDoctor
    if ($LASTEXITCODE -ne 0) { throw "Hosted base generation failed: $LASTEXITCODE" }
}

$baseFeatures = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'server-features.json') -Raw | ConvertFrom-Json -AsHashtable
$baseFeatures['resourceMode'] = 'import'
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
$effectiveFeatureConfig = Join-Path ([IO.Path]::GetTempPath()) "eagler-touhou-import-features-$([guid]::NewGuid().ToString('N')).json"
[IO.File]::WriteAllText($effectiveFeatureConfig, (($baseFeatures | ConvertTo-Json -Depth 20) + [Environment]::NewLine), [Text.UTF8Encoding]::new($false))

$packageStaging = "$($layout.importPackages).staging-$([guid]::NewGuid().ToString('N'))"
try {
    & node (Join-Path $project 'scripts\package-server.mjs') `
        "--output=$($layout.importSite)" `
        "--feature-config=$effectiveFeatureConfig" `
        "--host-manifest=$($layout.site)\eagler-touhou\host-manifest.json" `
        "--runtime-release=$($layout.runtimeRelease)" `
        "--artwork-dir=$($layout.site)\eagler-touhou\assets" `
        '--games=th06,th07,th08' `
        '--profile=web-validation-quick-import'
    if ($LASTEXITCODE -ne 0) { throw "Quick Import site generation failed: $LASTEXITCODE" }
    & node (Join-Path $project 'scripts\verify-server-build.mjs') ([string]$layout.importSite)
    if ($LASTEXITCODE -ne 0) { throw "Quick Import site verification failed: $LASTEXITCODE" }

    New-Item -ItemType Directory -Path $packageStaging -Force | Out-Null
    foreach ($game in @('th06', 'th07', 'th08')) {
        $archive = Join-Path $packageStaging "$game.zip"
        & node (Join-Path $project 'scripts\package-offline-game.mjs') ([string]$layout.site) $game $archive
        if ($LASTEXITCODE -ne 0) { throw "$game package generation failed: $LASTEXITCODE" }
        & node (Join-Path $project 'scripts\verify-offline-game-package.mjs') $archive $game
        if ($LASTEXITCODE -ne 0) { throw "$game package verification failed: $LASTEXITCODE" }
    }
    if (Test-Path -LiteralPath $layout.importPackages) { Remove-Item -LiteralPath $layout.importPackages -Recurse -Force }
    Move-Item -LiteralPath $packageStaging -Destination $layout.importPackages
} finally {
    Remove-Item -LiteralPath $effectiveFeatureConfig -Force -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $packageStaging) { Remove-Item -LiteralPath $packageStaging -Recurse -Force -ErrorAction SilentlyContinue }
}

Write-Host ''
& node (Join-Path $project 'scripts\inspect-quick-host.mjs') "--root=$HostRoot" "--music=$musicText" '--post-import=1'
if ($LASTEXITCODE -ne 0) { throw "Post-import doctor failed: $LASTEXITCODE" }
