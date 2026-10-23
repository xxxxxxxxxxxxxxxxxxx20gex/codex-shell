param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId,
    [string]$OutputDirectory = (Join-Path ([IO.Path]::GetTempPath()) 'codex-shell-window-icon')
)

$ErrorActionPreference = 'Stop'
$process = Get-Process -Id $ProcessId
$window = $process.MainWindowHandle
if ($window -eq [IntPtr]::Zero) { throw 'The process has no main window.' }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
Add-Type -AssemblyName System.Drawing
$drawingAssemblies = if ($PSVersionTable.PSEdition -eq 'Core') {
    @([Drawing.Bitmap].Assembly.Location, [Drawing.Size].Assembly.Location, 'System.Runtime') +
        @([AppDomain]::CurrentDomain.GetAssemblies() | Where-Object {
            $_.GetName().Name -like 'System.Private.Windows.*'
        } | ForEach-Object { $_.Location })
} else { @('System.Drawing') }
Add-Type -ReferencedAssemblies $drawingAssemblies @'
using System;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;

public static class WindowIconCheck {
    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr SendMessageTimeout(IntPtr hwnd, uint msg, IntPtr w, IntPtr l,
        uint flags, uint timeout, out IntPtr result);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    static extern IntPtr LoadLibraryEx(string path, IntPtr file, uint flags);
    [DllImport("kernel32.dll")]
    static extern bool FreeLibrary(IntPtr module);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern IntPtr LoadImage(IntPtr module, IntPtr name, uint type, int width, int height, uint flags);
    [DllImport("user32.dll")]
    static extern bool DestroyIcon(IntPtr icon);

    static IntPtr GetIcon(IntPtr hwnd, int size) {
        IntPtr icon;
        if (SendMessageTimeout(hwnd, 0x7f, (IntPtr)size, IntPtr.Zero, 2, 2000, out icon) == IntPtr.Zero)
            throw new Exception("WM_GETICON timed out or failed.");
        if (icon == IntPtr.Zero)
            throw new Exception(size == 1 ? "Missing taskbar ICON_BIG." : "Missing window ICON_SMALL.");
        return icon;
    }

    public static void Verify(IntPtr hwnd, string exe, string output) {
        IntPtr big = GetIcon(hwnd, 1);
        IntPtr small = GetIcon(hwnd, 0);
        IntPtr module = LoadLibraryEx(exe, IntPtr.Zero, 2);
        if (module == IntPtr.Zero) throw new Exception("Cannot load executable resources.");
        IntPtr expected = IntPtr.Zero;
        try {
            using (Bitmap actual = Icon.FromHandle(big).ToBitmap()) {
                // Load the resource at the window's actual DPI-dependent icon size.
                expected = LoadImage(module, (IntPtr)32512, 1, actual.Width, actual.Height, 0);
                if (expected == IntPtr.Zero) throw new Exception("Executable has no application icon.");
                using (Bitmap reference = Icon.FromHandle(expected).ToBitmap())
                using (Bitmap windowSmall = Icon.FromHandle(small).ToBitmap()) {
                    actual.Save(Path.Combine(output, "taskbar.png"));
                    reference.Save(Path.Combine(output, "executable.png"));
                    windowSmall.Save(Path.Combine(output, "window-small.png"));
                    if (actual.Size != reference.Size) throw new Exception("Taskbar icon size differs from executable.");
                    for (int y = 0; y < actual.Height; y++)
                        for (int x = 0; x < actual.Width; x++)
                            if (actual.GetPixel(x, y) != reference.GetPixel(x, y))
                                throw new Exception("Taskbar icon pixels differ from executable.");
                }
            }
        } finally {
            if (expected != IntPtr.Zero) DestroyIcon(expected);
            FreeLibrary(module);
        }
    }
}
'@
[WindowIconCheck]::Verify($window, $process.Path, [IO.Path]::GetFullPath($OutputDirectory))
Write-Output "PASS: window small icon exists; taskbar large icon matches executable pixels. Evidence: $OutputDirectory"
