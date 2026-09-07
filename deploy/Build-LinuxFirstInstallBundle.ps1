[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $SiteDirectory,
    [Parameter(Mandatory)] [string] $OutputArchive,
    [Parameter(Mandatory)] [string] $LinuxNodeArchive
)

$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$site = (Resolve-Path -LiteralPath $SiteDirectory).Path
$manifest = Join-Path $site 'deployment.json'
$nodeArchive = (Resolve-Path -LiteralPath $LinuxNodeArchive).Path
if ([IO.Path]::GetFileName($nodeArchive) -notmatch '^node-v22\..*-linux-x64\.tar\.xz$') {
    throw "Expected an official Node 22 Linux x64 tar.xz archive: $nodeArchive"
}
if (-not (Test-Path -LiteralPath $manifest -PathType Leaf)) {
    throw "Site package does not contain deployment.json: $site"
}

& node (Join-Path $project 'scripts\verify-server-build.mjs') $site
if ($LASTEXITCODE -ne 0) { throw "Site package verification failed: $LASTEXITCODE" }

$archive = [IO.Path]::GetFullPath($OutputArchive)
$archiveParent = Split-Path $archive -Parent
if (-not (Test-Path -LiteralPath $archiveParent)) {
    New-Item -ItemType Directory -Path $archiveParent -Force | Out-Null
}
$temporaryRoot = Join-Path $archiveParent '.tmp'
$staging = Join-Path $temporaryRoot ('first-install-bundle-' + [guid]::NewGuid().ToString('N'))
try {
    if (Test-Path -LiteralPath $archive) { throw "First-install bundle already exists: $archive" }
    if (-not (Test-Path -LiteralPath $temporaryRoot)) { New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null }
    New-Item -ItemType Directory -Path $staging | Out-Null
    Copy-Item -LiteralPath $site -Destination (Join-Path $staging 'site') -Recurse
    $bundleManifestJson = & node (Join-Path $project 'scripts\resolve-linux-first-install-bundle.mjs')
    if ($LASTEXITCODE -ne 0) { throw "Unable to resolve first-install bundle manifest: $LASTEXITCODE" }
    $bundleManifest = $bundleManifestJson | ConvertFrom-Json
    if ($bundleManifest.schema -ne 'eagler-touhou/linux-first-install-bundle/1') {
        throw "Unsupported first-install bundle manifest schema: $($bundleManifest.schema)"
    }
    foreach ($rule in $bundleManifest.copyRules) {
        $source = Join-Path $project ([string] $rule.source)
        $target = Join-Path $staging ([string] $rule.target)
        $targetParent = Split-Path $target -Parent
        if (-not (Test-Path -LiteralPath $targetParent)) { New-Item -ItemType Directory -Path $targetParent -Force | Out-Null }
        if ($rule.recursive) { Copy-Item -LiteralPath $source -Destination $target -Recurse }
        else { Copy-Item -LiteralPath $source -Destination $target }
    }
    $runtime = Join-Path $staging 'runtime'
    New-Item -ItemType Directory -Path $runtime | Out-Null
    Copy-Item -LiteralPath $nodeArchive -Destination (Join-Path $runtime 'node-linux-x64.tar.xz')
    if ($archive.EndsWith('.zip', [StringComparison]::OrdinalIgnoreCase)) {
        Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $archive -CompressionLevel Optimal
    } else {
        & tar.exe -czf $archive -C $staging .
        if ($LASTEXITCODE -ne 0) { throw "Unable to create bundle archive: $LASTEXITCODE" }
    }
    Write-Host "First-install bundle ready: $archive"
} finally {
    if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
}
