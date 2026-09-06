function Get-EaglerWorkspaceLayout {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $ProjectRoot)

    $project = (Resolve-Path -LiteralPath $ProjectRoot).Path
    $configPath = Join-Path $project 'config\workspace.json'
    $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
    if ($config.schema -ne 'eagler-touhou/workspace-layout/1' -or -not $config.repositories) {
        throw "Invalid workspace layout: $configPath"
    }
    foreach ($name in @('launcher', 'th06', 'th07', 'th08', 'thprac', 'dependencies', 'toolchains')) {
        $value = [string]$config.repositories.$name
        if (-not $value -or $value -match '[\\/]' -or $value -in @('.', '..')) {
            throw "Invalid workspace repository '$name' in $configPath"
        }
    }
    $root = if ($env:EAGLER_WORKSPACE_ROOT) {
        [IO.Path]::GetFullPath($env:EAGLER_WORKSPACE_ROOT)
    } else {
        Split-Path $project -Parent
    }
    [pscustomobject]@{
        ProjectRoot = $project
        Root = $root
        Repositories = $config.repositories
    }
}

function Get-EaglerWorkspacePath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $Layout,
        [Parameter(Mandatory)] [string] $Repository,
        [string] $RelativePath = ''
    )
    if ($Repository -eq 'launcher') {
        $base = $Layout.ProjectRoot
    } else {
        $directory = [string]$Layout.Repositories.$Repository
        if (-not $directory) { throw "Unknown workspace repository: $Repository" }
        $base = Join-Path $Layout.Root $directory
    }
    if ($RelativePath) { return Join-Path $base $RelativePath }
    return $base
}

Export-ModuleMember -Function Get-EaglerWorkspaceLayout, Get-EaglerWorkspacePath
