[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $RuntimeRelease,
    [Parameter(Mandatory)] [string] $OutputDirectory,
    [string] $UnicodeFont,
    [string] $OutputArchive
)

$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$runtimeReleasePath = (Resolve-Path -LiteralPath $RuntimeRelease).Path
$output = [IO.Path]::GetFullPath($OutputDirectory)
$temporaryRoot = Join-Path (Split-Path $output -Parent) '.tmp'
$staging = Join-Path $temporaryRoot ((Split-Path $output -Leaf) + '.staging-' + [guid]::NewGuid().ToString('N'))

if (Test-Path -LiteralPath $output) { throw "Quick Host Kit output already exists: $output" }
if ($output -eq [IO.Path]::GetPathRoot($output) -or $output -eq [IO.Path]::GetFullPath($project)) {
    throw "Unsafe Quick Host Kit output: $output"
}

& node (Join-Path $project 'scripts\verify-runtime-release.mjs') $runtimeReleasePath
if ($LASTEXITCODE -ne 0) { throw "Runtime Release verification failed: $LASTEXITCODE" }

Import-Module (Join-Path $PSScriptRoot 'WorkspaceLayout.psm1') -Force
$workspaceLayout = Get-EaglerWorkspaceLayout -ProjectRoot $project
if (-not $UnicodeFont) {
    $UnicodeFont = Get-EaglerWorkspacePath $workspaceLayout 'dependencies' 'unifont-15.1.05\unifont-15.1.05.otf'
}
$unicodeFontPath = (Resolve-Path -LiteralPath $UnicodeFont).Path
$unicodeLicense = Join-Path (Split-Path $unicodeFontPath -Parent) 'LICENSE.txt'
if (-not (Test-Path -LiteralPath $unicodeLicense -PathType Leaf)) {
    throw "Unicode font license is missing next to the font: $unicodeLicense"
}
try {
    if (-not (Test-Path -LiteralPath $temporaryRoot)) { New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null }
    New-Item -ItemType Directory -Path $staging | Out-Null
    $copyRulesJson = & node (Join-Path $project 'scripts\list-host-kit-files.mjs')
    if ($LASTEXITCODE -ne 0) { throw "Unable to read Quick Host Kit file manifest: $LASTEXITCODE" }
    $copyRules = @($copyRulesJson | ConvertFrom-Json)
    if ($copyRules.Count -eq 0) { throw 'Quick Host Kit file manifest is empty' }
    foreach ($rule in $copyRules) {
        $source = Join-Path $project ([string]$rule.source)
        if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
            throw "Quick Host Kit source is missing: $($rule.source)"
        }
        $destination = Join-Path $staging ([string]$rule.target)
        $parent = Split-Path $destination -Parent
        if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item -LiteralPath $source -Destination $destination
    }

    foreach ($game in @('th06', 'th07', 'th08')) {
        New-Item -ItemType Directory -Path (Join-Path $staging "games\$game") -Force | Out-Null
    }
    New-Item -ItemType Directory -Path (Join-Path $staging 'shared') -Force | Out-Null
    Copy-Item -LiteralPath $runtimeReleasePath -Destination (Join-Path $staging 'runtime-release') -Recurse
    Copy-Item -LiteralPath $unicodeFontPath -Destination (Join-Path $staging 'shared\unifont.otf')
    Copy-Item -LiteralPath $unicodeLicense -Destination (Join-Path $staging 'shared\unifont.LICENSE.txt')
    & node (Join-Path $project 'scripts\write-host-kit-provenance.mjs') "--output=$(Join-Path $staging 'host-kit-provenance.json')"
    if ($LASTEXITCODE -ne 0) { throw "Host Kit provenance generation failed: $LASTEXITCODE" }

    Move-Item -LiteralPath $staging -Destination $output
    if ($OutputArchive) {
        $archive = [IO.Path]::GetFullPath($OutputArchive)
        if (Test-Path -LiteralPath $archive) { throw "Quick Host Kit archive already exists: $archive" }
        $archiveParent = Split-Path $archive -Parent
        if (-not (Test-Path -LiteralPath $archiveParent)) { New-Item -ItemType Directory -Path $archiveParent -Force | Out-Null }
        Compress-Archive -Path (Join-Path $output '*') -DestinationPath $archive -CompressionLevel Optimal
        Write-Host "Quick Host Kit archive ready: $archive"
    }
    Write-Host "Quick Host Kit ready: $output"
    Write-Host 'User flow: copy games/th06, games/th07, games/th08 -> edit eagler-touhou.config.json if needed -> npm run host'
} finally {
    if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
}
