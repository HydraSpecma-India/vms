# HydraSpecma India Private Limited - VMS Setup Builder
# Clean, readable plain-text compilation and packaging script.

$cSharpCode = @"
using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Diagnostics;
using System.Security.AccessControl;
using System.Security.Principal;

class Program
{
    static void Main(string[] args)
    {
        Console.Title = "HydraSpecma India Private Limited - VMS Installer";
        try
        {
            string selfPath = Assembly.GetExecutingAssembly().Location;
            byte[] allBytes = File.ReadAllBytes(selfPath);
            
            int zipStartIndex = -1;
            for (int i = 0; i < allBytes.Length - 4; i++)
            {
                if (allBytes[i] == 0x50 && allBytes[i+1] == 0x4B && allBytes[i+2] == 0x03 && allBytes[i+3] == 0x04)
                {
                    zipStartIndex = i;
                    break;
                }
            }
            
            if (zipStartIndex == -1)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("Error: Zip payload not found in this installer file.");
                Console.ResetColor();
                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
                return;
            }
            
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("==================================================================");
            Console.WriteLine("       HydraSpecma India Private Limited - VMS Setup Installer    ");
            Console.WriteLine("==================================================================");
            Console.ResetColor();
            Console.WriteLine();
            
            string defaultPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "HydraSpecma_VMS");
            Console.Write("Enter installation folder path \n(or press Enter for default: " + defaultPath + "): ");
            string input = Console.ReadLine();
            string targetDir = string.IsNullOrEmpty(input) ? defaultPath : input;
            
            Console.WriteLine("\nExtracting files to: " + targetDir);
            
            if (!Directory.Exists(targetDir))
            {
                Directory.CreateDirectory(targetDir);
            }
            
            string tempZip = Path.Combine(Path.GetTempPath(), "VMS_Deployable_Temp.zip");
            using (FileStream fs = new FileStream(tempZip, FileMode.Create, FileAccess.Write))
            {
                fs.Write(allBytes, zipStartIndex, allBytes.Length - zipStartIndex);
            }
            
            try
            {
                ZipFile.ExtractToDirectory(tempZip, targetDir);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Warning during standard extraction: " + ex.Message);
                Console.WriteLine("Attempting manual extraction to overwrite existing files...");
                using (ZipArchive archive = ZipFile.OpenRead(tempZip))
                {
                    foreach (ZipArchiveEntry entry in archive.Entries)
                    {
                        string destinationPath = Path.Combine(targetDir, entry.FullName);
                        string dir = Path.GetDirectoryName(destinationPath);
                        if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                        {
                            Directory.CreateDirectory(dir);
                        }
                        if (!string.IsNullOrEmpty(entry.Name))
                        {
                            entry.ExtractToFile(destinationPath, true);
                        }
                    }
                }
            }
            
            File.Delete(tempZip);
            
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("Extraction complete!");
            Console.ResetColor();

            try
            {
                string visitorDataDir = @"C:\VisitorData";
                Console.WriteLine("\nCreating directory for visitor data: " + visitorDataDir);
                if (!Directory.Exists(visitorDataDir))
                {
                    Directory.CreateDirectory(visitorDataDir);
                }

                try
                {
                    DirectorySecurity sec = Directory.GetAccessControl(visitorDataDir);
                    SecurityIdentifier everyone = new SecurityIdentifier(WellKnownSidType.WorldSid, null);
                    FileSystemAccessRule rule = new FileSystemAccessRule(
                        everyone,
                        FileSystemRights.Modify | FileSystemRights.Synchronize,
                        InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit,
                        PropagationFlags.None,
                        AccessControlType.Allow
                    );
                    sec.AddAccessRule(rule);
                    Directory.SetAccessControl(visitorDataDir, sec);
                    Console.WriteLine("Granted modify permissions to Everyone on: " + visitorDataDir);
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Warning: Could not set directory permissions: " + ex.Message);
                }

                string srcEmployees = Path.Combine(targetDir, "employees.csv");
                string destEmployees = Path.Combine(visitorDataDir, "employees.csv");
                if (File.Exists(srcEmployees))
                {
                    Console.WriteLine("Copying employees.csv to " + destEmployees);
                    File.Copy(srcEmployees, destEmployees, true);
                }

                string srcUserdata = Path.Combine(targetDir, "userdata.csv");
                string destUserdata = Path.Combine(visitorDataDir, "userdata.csv");
                if (File.Exists(srcUserdata))
                {
                    Console.WriteLine("Copying userdata.csv to " + destUserdata);
                    File.Copy(srcUserdata, destUserdata, true);
                }
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("Error copying CSV files: " + ex.Message);
                Console.ResetColor();
            }

            Console.WriteLine();
            Console.Write("Would you like to start the VMS server now? (Y/N): ");
            string launchInput = Console.ReadLine();
            if (launchInput != null && launchInput.Trim().ToUpper() == "Y")
            {
                string vmsExePath = Path.Combine(targetDir, "vms.exe");
                if (File.Exists(vmsExePath))
                {
                    Console.WriteLine("Launching VMS server...");
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = vmsExePath;
                    psi.WorkingDirectory = targetDir;
                    Process.Start(psi);
                }
            }
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("An error occurred during installation: " + ex.Message);
            Console.ResetColor();
        }
        
        Console.WriteLine("\nSetup finished. Press any key to exit...");
        Console.ReadKey();
    }
}
"@

# Verify required files in current folder
$requiredFiles = @("vms.exe", "config.json", "employees.csv", "userdata.csv")
$missing = $false
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "Error: Missing required file '$file' in the current directory." -ForegroundColor Red
        $missing = $true
    }
}

if ($missing) {
    Write-Host "`nPlease ensure all 4 required files are in the same folder as this script." -ForegroundColor DarkYellow
    exit
}

# 1. Create temporary deployment folder
$deployDir = "VMS_Deployable"
if (Test-Path $deployDir) {
    Remove-Item -Path $deployDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $deployDir -Force | Out-Null

# 2. Copy files to deployment folder
Copy-Item "vms.exe" -Destination "$deployDir\vms.exe" -Force
Copy-Item "config.json" -Destination "$deployDir\config.json" -Force
Copy-Item "employees.csv" -Destination "$deployDir\employees.csv" -Force
Copy-Item "userdata.csv" -Destination "$deployDir\userdata.csv" -Force

if (Test-Path "README.txt") {
    Copy-Item "README.txt" -Destination "$deployDir\README.txt" -Force
} else {
    "Visitor Management System for HydraSpecma India Private Limited" | Out-File -FilePath "$deployDir\README.txt" -Encoding ascii
}

# 3. Create ZIP archive
Write-Host "Compressing application files..." -ForegroundColor Cyan
if (Test-Path "VMS_Deployable.zip") {
    Remove-Item "VMS_Deployable.zip" -Force
}
Compress-Archive -Path "$deployDir\*" -DestinationPath "VMS_Deployable.zip" -Force

# 4. Write C# installer code to file
Write-Host "Generating C# installer source..." -ForegroundColor Cyan
[System.IO.File]::WriteAllText("installer_stub.cs", $cSharpCode)

# 5. Locate compiler
$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $cscPath)) {
    Write-Host "Error: C# compiler not found at $cscPath" -ForegroundColor Red
    exit
}

# 6. Compile C# stub
Write-Host "Compiling installer stub..." -ForegroundColor Cyan
if (Test-Path "installer_stub.exe") {
    Remove-Item "installer_stub.exe" -Force
}
& $cscPath /r:System.IO.Compression.FileSystem.dll /r:System.IO.Compression.dll /out:installer_stub.exe installer_stub.cs | Out-Null

if (-not (Test-Path "installer_stub.exe")) {
    Write-Host "Compilation failed!" -ForegroundColor Red
    exit
}

# 7. Concatenate stub and ZIP into VMS_Setup.exe
Write-Host "Assembling VMS_Setup.exe..." -ForegroundColor Cyan
$stubBytes = [System.IO.File]::ReadAllBytes("installer_stub.exe")
$zipBytes = [System.IO.File]::ReadAllBytes("VMS_Deployable.zip")
$setupBytes = New-Object Byte[] ($stubBytes.Length + $zipBytes.Length)
[System.Array]::Copy($stubBytes, 0, $setupBytes, 0, $stubBytes.Length)
[System.Array]::Copy($zipBytes, 0, $setupBytes, $stubBytes.Length, $zipBytes.Length)
[System.IO.File]::WriteAllBytes("VMS_Setup.exe", $setupBytes)

# 8. Clean up temp files
Write-Host "Cleaning up temporary files..." -ForegroundColor Cyan
Remove-Item -Path $deployDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "VMS_Deployable.zip" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "installer_stub.cs" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "installer_stub.exe" -Force -ErrorAction SilentlyContinue

Write-Host "`nSuccess! VMS_Setup.exe has been generated successfully." -ForegroundColor Green
