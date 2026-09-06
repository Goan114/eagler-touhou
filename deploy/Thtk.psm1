$script:ThtkVersion = '12'
$script:ThtkArchiveName = 'thtk-bin-12.zip'
$script:ThtkDownloadUrl = 'https://github.com/thpatch/thtk/releases/download/12/thtk-bin-12.zip'
$script:ThtkSha256 = 'f6acc00f377b6537e8d504794aec8445cb1e0d6490d2c89d56b3315677765154'

function Format-ThtkByteCount([long] $Bytes) {
    if ($Bytes -ge 1MB) { return ('{0:N1} MiB' -f ($Bytes / 1MB)) }
    if ($Bytes -ge 1KB) { return ('{0:N1} KiB' -f ($Bytes / 1KB)) }
    return "$Bytes B"
}

function Invoke-ThtkDownload {
    param(
        [Parameter(Mandatory = $true)][string] $Uri,
        [Parameter(Mandatory = $true)][string] $Destination
    )

    $client = [Net.Http.HttpClient]::new()
    $response = $null
    $input = $null
    $output = $null
    try {
        $client.DefaultRequestHeaders.UserAgent.ParseAdd('eagler-touhou-host/1')
        $response = $client.GetAsync($Uri, [Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
        [void]$response.EnsureSuccessStatusCode()
        $total = if ($response.Content.Headers.ContentLength) { [long]$response.Content.Headers.ContentLength } else { 0L }
        $input = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
        $output = [IO.File]::Open($Destination, [IO.FileMode]::Create, [IO.FileAccess]::Write, [IO.FileShare]::None)
        $buffer = [byte[]]::new(64KB)
        $downloaded = 0L
        while (($read = $input.Read($buffer, 0, $buffer.Length)) -gt 0) {
            $output.Write($buffer, 0, $read)
            $downloaded += $read
            if ($total -gt 0) {
                $percent = [Math]::Min(100, [int]($downloaded * 100 / $total))
                Write-Progress -Id 6200 -Activity "Downloading thtk $($script:ThtkVersion)" `
                    -Status "$(Format-ThtkByteCount $downloaded) / $(Format-ThtkByteCount $total)" `
                    -PercentComplete $percent
            } else {
                Write-Progress -Id 6200 -Activity "Downloading thtk $($script:ThtkVersion)" `
                    -Status "$(Format-ThtkByteCount $downloaded) downloaded"
            }
        }
        Write-Progress -Id 6200 -Activity "Downloading thtk $($script:ThtkVersion)" -Completed
        Write-Host "thtk download complete: $(Format-ThtkByteCount $downloaded)"
    } finally {
        if ($output) { $output.Dispose() }
        if ($input) { $input.Dispose() }
        if ($response) { $response.Dispose() }
        $client.Dispose()
    }
}

function Resolve-Thtk {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][string] $ProjectRoot,
        [string] $CacheDirectory
    )

    if (-not $IsWindows) {
        $thdat = Get-Command thdat -ErrorAction SilentlyContinue
        $thmsg = Get-Command thmsg -ErrorAction SilentlyContinue
        $thanm = Get-Command thanm -ErrorAction SilentlyContinue
        if (-not $thdat -or -not $thmsg -or -not $thanm) {
            throw 'thtk is required to build Eagler Touhou Host assets and language packs. Install thdat, thmsg and thanm from the thtk upstream project and place them on PATH.'
        }
        return [pscustomobject]@{
            Version = $script:ThtkVersion
            Source = 'PATH'
            Thdat = $thdat.Source
            Thmsg = $thmsg.Source
            Thanm = $thanm.Source
        }
    }

    if (-not $CacheDirectory) {
        $CacheDirectory = Join-Path ([IO.Path]::GetFullPath($ProjectRoot)) ".cache\tools\thtk\$($script:ThtkVersion)"
    }
    $CacheDirectory = [IO.Path]::GetFullPath($CacheDirectory)
    $archive = Join-Path $CacheDirectory $script:ThtkArchiveName
    $extractRoot = Join-Path $CacheDirectory 'extracted'
    $toolRoot = Join-Path $extractRoot "thtk-bin-$($script:ThtkVersion)"
    $thdat = Join-Path $toolRoot 'thdat.exe'
    $thmsg = Join-Path $toolRoot 'thmsg.exe'
    $thanm = Join-Path $toolRoot 'thanm.exe'

    function Test-ArchiveHash([string] $Path) {
        if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
        return ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() -eq $script:ThtkSha256)
    }

    if (-not (Test-ArchiveHash $archive)) {
        New-Item -ItemType Directory -Path $CacheDirectory -Force | Out-Null
        Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $extractRoot -Recurse -Force -ErrorAction SilentlyContinue
        $download = "$archive.download-$([guid]::NewGuid().ToString('N'))"
        try {
            Write-Host "Downloading thtk $($script:ThtkVersion) from official upstream..."
            $downloaded = $false
            for ($attempt = 1; $attempt -le 3; $attempt++) {
                try {
                    Invoke-ThtkDownload -Uri $script:ThtkDownloadUrl -Destination $download
                    $downloaded = $true
                    break
                } catch {
                    Remove-Item -LiteralPath $download -Force -ErrorAction SilentlyContinue
                    if ($attempt -ge 3) { throw }
                    Write-Warning "thtk download attempt $attempt/3 failed; retrying. $($_.Exception.Message)"
                    Start-Sleep -Seconds (2 * $attempt)
                }
            }
            if (-not $downloaded) { throw 'thtk download did not complete' }
            if (-not (Test-ArchiveHash $download)) {
                throw "Downloaded thtk archive failed SHA-256 verification. Expected $($script:ThtkSha256)."
            }
            Move-Item -LiteralPath $download -Destination $archive -Force
        } catch {
            Remove-Item -LiteralPath $download -Force -ErrorAction SilentlyContinue
            throw "Unable to prepare thtk $($script:ThtkVersion) from $($script:ThtkDownloadUrl). $($_.Exception.Message)"
        }
    }

    if (-not (Test-Path -LiteralPath $thdat -PathType Leaf) -or
        -not (Test-Path -LiteralPath $thmsg -PathType Leaf) -or
        -not (Test-Path -LiteralPath $thanm -PathType Leaf)) {
        $extractStaging = "$extractRoot.incomplete-$([guid]::NewGuid().ToString('N'))"
        try {
            Expand-Archive -LiteralPath $archive -DestinationPath $extractStaging -Force
            $stagedToolRoot = Join-Path $extractStaging "thtk-bin-$($script:ThtkVersion)"
            foreach ($name in @('thdat.exe', 'thmsg.exe', 'thanm.exe')) {
                if (-not (Test-Path -LiteralPath (Join-Path $stagedToolRoot $name) -PathType Leaf)) {
                    throw "Official thtk archive is missing $name"
                }
            }
            Remove-Item -LiteralPath $extractRoot -Recurse -Force -ErrorAction SilentlyContinue
            Move-Item -LiteralPath $extractStaging -Destination $extractRoot
        } finally {
            Remove-Item -LiteralPath $extractStaging -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    return [pscustomobject]@{
        Version = $script:ThtkVersion
        Source = $script:ThtkDownloadUrl
        ArchiveSha256 = $script:ThtkSha256
        Thdat = $thdat
        Thmsg = $thmsg
        Thanm = $thanm
    }
}

Export-ModuleMember -Function Resolve-Thtk
