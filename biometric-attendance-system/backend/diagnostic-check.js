// find-dlls.js
// Run this to find Digital Persona DLLs and COM objects
// node find-dlls.js

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Searching for Digital Persona DLLs and COM Components ===\n');

const searchPaths = [
  'C:\\Program Files\\HID Global',
  'C:\\Program Files (x86)\\HID Global',
  'C:\\Windows\\System32',
  'C:\\Windows\\SysWOW64'
];

async function searchDirectory(dirPath, depth = 0) {
  if (depth > 3) return []; // Limit recursion depth
  
  const results = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      
      try {
        const stat = fs.statSync(fullPath);
        
        if (stat.isFile()) {
          const lower = item.toLowerCase();
          if (lower.endsWith('.dll') || lower.endsWith('.exe')) {
            if (lower.includes('digit') || lower.includes('persona') || 
                lower.includes('dp') || lower.includes('finger') || 
                lower.includes('biometric') || lower.includes('hid')) {
              results.push(fullPath);
            }
          }
        } else if (stat.isDirectory()) {
          const subResults = await searchDirectory(fullPath, depth + 1);
          results.push(...subResults);
        }
      } catch (err) {
        // Skip files we can't access
      }
    }
  } catch (err) {
    // Skip directories we can't access
  }
  
  return results;
}

async function findDLLs() {
  console.log('1. Searching file system for DLLs...\n');
  
  const allDlls = [];
  
  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      console.log(`   Searching: ${searchPath}`);
      const dlls = await searchDirectory(searchPath);
      allDlls.push(...dlls);
    }
  }
  
  if (allDlls.length > 0) {
    console.log('\n   Found DLLs:');
    allDlls.forEach(dll => console.log(`   ✓ ${dll}`));
  } else {
    console.log('   ✗ No DLLs found');
  }
  
  return allDlls;
}

async function findCOMObjects() {
  console.log('\n2. Searching Windows Registry for COM objects...\n');
  
  return new Promise((resolve) => {
    const script = `
      Get-ChildItem "HKLM:\\SOFTWARE\\Classes\\CLSID" | 
      ForEach-Object {
        $clsid = $_.PSChildName
        $progId = (Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Classes\\CLSID\\$clsid\\ProgID" -ErrorAction SilentlyContinue).''
        $inproc = (Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Classes\\CLSID\\$clsid\\InprocServer32" -ErrorAction SilentlyContinue).''
        
        if ($progId -like "*Digital*" -or $progId -like "*Persona*" -or $progId -like "*HID*" -or $progId -like "*Finger*") {
          [PSCustomObject]@{
            CLSID = $clsid
            ProgID = $progId
            DLL = $inproc
          }
        }
      } | ConvertTo-Json
    `;
    
    exec(`powershell -Command "${script.replace(/\n/g, ' ')}"`, 
      { maxBuffer: 10 * 1024 * 1024 }, 
      (error, stdout) => {
        if (error || !stdout.trim()) {
          console.log('   ✗ No COM objects found in registry');
          resolve([]);
          return;
        }
        
        try {
          const results = JSON.parse(stdout);
          const arr = Array.isArray(results) ? results : [results];
          
          console.log('   Found COM objects:');
          arr.forEach(obj => {
            console.log(`   ✓ ProgID: ${obj.ProgID}`);
            console.log(`     CLSID: ${obj.CLSID}`);
            console.log(`     DLL: ${obj.DLL}\n`);
          });
          
          resolve(arr);
        } catch (e) {
          console.log('   ✗ Error parsing COM objects');
          resolve([]);
        }
      }
    );
  });
}

async function checkWBFSupport() {
  console.log('\n3. Checking Windows Biometric Framework (WBF) support...\n');
  
  return new Promise((resolve) => {
    const script = `
      # Check WBF service
      $wbfService = Get-Service -Name "WbioSrvc" -ErrorAction SilentlyContinue
      
      # Get biometric units
      $units = Get-WmiObject -Namespace "root\\WMI" -Class "Win32_BiometricDevice" -ErrorAction SilentlyContinue
      
      @{
        ServiceExists = ($wbfService -ne $null)
        ServiceRunning = ($wbfService.Status -eq "Running")
        BiometricUnits = ($units | ForEach-Object { $_.DeviceId })
      } | ConvertTo-Json
    `;
    
    exec(`powershell -Command "${script.replace(/\n/g, ' ')}"`,
      (error, stdout) => {
        if (error) {
          console.log('   ✗ WBF not available');
          resolve(null);
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          console.log(`   Service Exists: ${result.ServiceExists}`);
          console.log(`   Service Running: ${result.ServiceRunning}`);
          
          if (result.BiometricUnits && result.BiometricUnits.length > 0) {
            console.log('   Biometric Units:');
            result.BiometricUnits.forEach(unit => {
              console.log(`     - ${unit}`);
            });
          } else {
            console.log('   No biometric units found');
          }
          
          resolve(result);
        } catch (e) {
          console.log('   ✗ Error parsing WBF data');
          resolve(null);
        }
      }
    );
  });
}

async function testCOMCreation(comObjects) {
  if (comObjects.length === 0) return;
  
  console.log('\n4. Testing COM object creation...\n');
  
  for (const obj of comObjects) {
    const script = `
      try {
        $com = New-Object -ComObject "${obj.ProgID}"
        $methods = $com | Get-Member -MemberType Method | Select-Object -ExpandProperty Name
        @{
          Success = $true
          Methods = $methods
        } | ConvertTo-Json
      } catch {
        @{
          Success = $false
          Error = $_.Exception.Message
        } | ConvertTo-Json
      }
    `;
    
    await new Promise((resolve) => {
      exec(`powershell -Command "${script.replace(/\n/g, ' ')}"`,
        { timeout: 5000 },
        (error, stdout) => {
          try {
            const result = JSON.parse(stdout);
            console.log(`   Testing: ${obj.ProgID}`);
            
            if (result.Success) {
              console.log('   ✓ COM object created successfully!');
              console.log('   Available methods:');
              result.Methods.forEach(method => {
                console.log(`     - ${method}`);
              });
            } else {
              console.log(`   ✗ Failed: ${result.Error}`);
            }
          } catch (e) {
            console.log(`   ✗ Failed to test ${obj.ProgID}`);
          }
          
          console.log('');
          resolve();
        }
      );
    });
  }
}

(async () => {
  const dlls = await findDLLs();
  const comObjects = await findCOMObjects();
  await checkWBFSupport();
  await testCOMCreation(comObjects);
  
  console.log('\n=== Search Complete ===\n');
  console.log('Summary:');
  console.log(`  DLLs found: ${dlls.length}`);
  console.log(`  COM objects found: ${comObjects.length}`);
  console.log('\nNext steps:');
  console.log('1. If COM objects found, we can use them via PowerShell');
  console.log('2. If DLLs found, we can use Add-Type to load them');
  console.log('3. If WBF available, we can use Windows Biometric Framework');
})();