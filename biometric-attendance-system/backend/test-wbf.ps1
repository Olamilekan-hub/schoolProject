# capture-fingerprint.ps1
# Windows Biometric Framework Fingerprint Capture

$signature = @'
using System;
using System.Runtime.InteropServices;

public class WinBio {
    [DllImport("Winbio.dll", SetLastError = true)]
    public static extern int WinBioOpenSession(
        uint Factor, uint PoolType, uint Flags,
        uint[] UnitArray, uint UnitCount, IntPtr DatabaseId,
        out IntPtr SessionHandle);
    
    [DllImport("Winbio.dll", SetLastError = true)]
    public static extern int WinBioCloseSession(IntPtr SessionHandle);
    
    [DllImport("Winbio.dll", SetLastError = true)]
    public static extern int WinBioCaptureSample(
        IntPtr SessionHandle, uint Purpose, uint SubFactor,
        out uint UnitId, out IntPtr Sample, out uint SampleSize,
        out uint RejectDetail);
    
    [DllImport("Winbio.dll", SetLastError = true)]
    public static extern int WinBioFree(IntPtr Memory);
    
    public const uint WINBIO_TYPE_FINGERPRINT = 8;
    public const uint WINBIO_POOL_SYSTEM = 1;
    public const uint WINBIO_FLAG_DEFAULT = 0;
    public const uint WINBIO_PURPOSE_ENROLL = 3;
    public const uint WINBIO_SUBTYPE_ANY = 255;
}
'@

Add-Type -TypeDefinition $signature -ErrorAction SilentlyContinue

Write-Host "Opening WinBio session..."
$session = [IntPtr]::Zero

$result = [WinBio]::WinBioOpenSession(
    [WinBio]::WINBIO_TYPE_FINGERPRINT,
    1, # SYSTEM
    0, # no flags
    $null, 0, [IntPtr]::Zero, [ref]$session)

if ($result -ne 0) {
    Write-Host "Error opening session: $result"
    exit 1
}

Write-Host "Session opened. Place your finger on the scanner..."

$unitId = 0
$sample = [IntPtr]::Zero
$size = 0
$reject = 0

$result = [WinBio]::WinBioCaptureSample(
    $session,
    [WinBio]::WINBIO_PURPOSE_ENROLL,
    [WinBio]::WINBIO_SUBTYPE_ANY,
    [ref]$unitId, [ref]$sample, [ref]$size, [ref]$reject)

if ($result -eq 0 -and $size -gt 0) {
    Write-Host "SUCCESS! Captured $size bytes"
    $bytes = New-Object byte[] $size
    [Runtime.InteropServices.Marshal]::Copy($sample, $bytes, 0, $size)
    $base64 = [Convert]::ToBase64String($bytes)

    $output = @{
        success = $true
        template = $base64
        size = $size
        quality = 90
    } | ConvertTo-Json -Compress

    Write-Host $output
    [WinBio]::WinBioFree($sample)
} else {
    Write-Host "Capture failed. Error: $result, Reject: $reject"
}

[WinBio]::WinBioCloseSession($session)
Write-Host "Done."
