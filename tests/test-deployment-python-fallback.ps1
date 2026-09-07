# L1 dependency bootstrap gate.
# Preconditions: Python with venv and network access to deploy/requirements.txt.
# Mutation: creates a new isolated environment under the system temporary directory,
# or under the caller's explicit -OutputDirectory.
# Proves: the deployment helper recovers without inherited soundfile.
# Does not prove: audio conversion, Runtime build, packaging, or publication.
[CmdletBinding()]
param(
    [string] $Python = 'python',
    [string] $OutputDirectory
)

$ErrorActionPreference = 'Stop'
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $OutputDirectory) {
    $stamp = "$(Get-Date -Format 'yyyyMMdd-HHmmss')-$([guid]::NewGuid().ToString('N'))"
    $OutputDirectory = Join-Path ([IO.Path]::GetTempPath()) "eagler-deployment-python-$stamp"
}
$output = [IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $output) { throw "Output directory already exists: $output" }

Import-Module (Join-Path $project 'deploy\DeploymentPython.psm1') -Force
$missingPythonRejected = $false
try {
    Resolve-DeploymentPython -Python '__eagler_missing_python__' -EnvironmentDirectory (Join-Path $output 'missing-environment') `
        -RequirementsPath (Join-Path $project 'deploy\requirements.txt') -RequiredModules @('soundfile') | Out-Null
} catch {
    if ($_.Exception.Message -match 'Python 3 is required') { $missingPythonRejected = $true } else { throw }
}
if (-not $missingPythonRejected) { throw 'Missing Python prerequisite did not fail with the expected operator-facing error.' }

$resolved = Resolve-DeploymentPython -Python $Python -EnvironmentDirectory (Join-Path $output 'environment') `
    -RequirementsPath (Join-Path $project 'deploy\requirements.txt') -RequiredModules @('soundfile') -RequirePrivateEnvironment
if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) { throw "Resolved Python does not exist: $resolved" }
& $resolved -c 'import soundfile; print(soundfile.__version__)' | Set-Content -LiteralPath (Join-Path $output 'soundfile-version.txt')
if ($LASTEXITCODE -ne 0) { throw 'Isolated soundfile import failed after bootstrap.' }
@{
    schema = 'eagler-touhou/deployment-python-validation/1'
    status = 'PASS'
    python = $resolved
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $output 'report.json')
Write-Host "Deployment Python fallback: PASS ($output)"
