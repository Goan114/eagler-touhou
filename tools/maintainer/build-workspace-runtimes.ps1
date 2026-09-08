[CmdletBinding()]
param(
    [string] $EmsdkDirectory,
    [string] $CMake,
    [string] $Ninja,
    [switch] $EmbedLocalAssets,
    [string] $Th06AssetDirectory,
    [string] $Th07AssetDirectory,
    [int] $Parallel = 6
)

$ErrorActionPreference = 'Stop'
$project = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Import-Module (Join-Path $PSScriptRoot 'lib\workspace-layout.psm1') -Force
$workspaceLayout = Get-EaglerWorkspaceLayout -ProjectRoot $project
$workspace = $workspaceLayout.Root
if (-not $EmsdkDirectory) { $EmsdkDirectory = Get-EaglerWorkspacePath $workspaceLayout 'toolchains' 'emsdk' }
$emsdk = (Resolve-Path -LiteralPath $EmsdkDirectory).Path
$emcmake = Join-Path $emsdk 'upstream\emscripten\emcmake.exe'
if (-not (Test-Path -LiteralPath $emcmake -PathType Leaf)) { throw "emcmake not found: $emcmake" }
$env:EM_CONFIG = Join-Path $emsdk '.emscripten'

function Find-BuildTool([string] $Value, [string] $Name, [string] $VisualStudioPattern) {
    if ($Value) { return (Get-Command $Value -ErrorAction Stop).Source }
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (Test-Path -LiteralPath $vswhere -PathType Leaf) {
        $match = & $vswhere -latest -products * -find $VisualStudioPattern | Select-Object -First 1
        if ($match) { return $match }
    }
    throw "$Name not found; pass -$Name with its executable path"
}
$CMake = Find-BuildTool $CMake 'CMake' 'Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe'
$Ninja = Find-BuildTool $Ninja 'Ninja' 'Common7\IDE\CommonExtensions\Microsoft\CMake\Ninja\ninja.exe'

function Resolve-RuntimeBuildPlan([string] $Game, [string] $Variant, [string] $AssetRoot) {
    $resolver = Join-Path $project 'scripts\resolve-runtime-build.mjs'
    $resolverArgs = @($resolver, "--game=$Game", "--variant=$Variant", '--runtime-extension=')
    if ($AssetRoot) { $resolverArgs += "--asset-root=$AssetRoot" }
    $json = & node @resolverArgs
    if ($LASTEXITCODE -ne 0) { throw "$Game/$Variant Runtime build profile resolution failed: $LASTEXITCODE" }
    return $json | ConvertFrom-Json
}

if (-not $EmbedLocalAssets -and ($Th06AssetDirectory -or $Th07AssetDirectory)) {
    throw 'Asset directories require -EmbedLocalAssets'
}
$assetDirectories = @{}
if ($EmbedLocalAssets) {
    if (-not $Th06AssetDirectory) { $Th06AssetDirectory = Get-EaglerWorkspacePath $workspaceLayout 'th06' 'assets' }
    if (-not $Th07AssetDirectory) { $Th07AssetDirectory = Get-EaglerWorkspacePath $workspaceLayout 'th07' 'assets' }
    $assetDirectories.th06 = (Resolve-Path -LiteralPath $Th06AssetDirectory).Path
    $assetDirectories.th07 = (Resolve-Path -LiteralPath $Th07AssetDirectory).Path
}

foreach ($game in @('th06', 'th07')) {
    $variant = if ($EmbedLocalAssets) { 'development' } else { 'external' }
    $profileAssetRoot = if ($EmbedLocalAssets) { $assetDirectories[$game] } else { $null }
    $plan = Resolve-RuntimeBuildPlan $game $variant $profileAssetRoot
    $source = Get-EaglerWorkspacePath $workspaceLayout $plan.workspaceRepository
    if (-not (Test-Path -LiteralPath (Join-Path $source 'CMakeLists.txt') -PathType Leaf)) {
        throw "Runtime source not found: $source"
    }
    # Source-only and playable development builds must never share a CMake cache.
    # Reconfiguring one directory between TH_EXTERNAL_ASSETS=ON/OFF leaves the
    # development host pointing at a runtime with no game archives.
    $buildName = if ($EmbedLocalAssets) { 'build-web-eagler-default' } else { 'build-web-eagler-external' }
    $build = Join-Path $source $buildName
    $configureArguments = @(
        '-S', $source, '-B', $build, '-G', 'Ninja', "-DCMAKE_MAKE_PROGRAM=$Ninja",
        @($plan.cmakeArguments)
    )
    & $emcmake $CMake @configureArguments
    if ($LASTEXITCODE -ne 0) { throw "$game Web configure failed: $LASTEXITCODE" }
    & $CMake --build $build --parallel $Parallel
    if ($LASTEXITCODE -ne 0) { throw "$game Web build failed: $LASTEXITCODE" }
}

$kind = if ($EmbedLocalAssets) { 'playable local development' } else { 'source-only external-assets' }
Write-Host "TH06 and TH07 $kind Web runtimes are ready."
