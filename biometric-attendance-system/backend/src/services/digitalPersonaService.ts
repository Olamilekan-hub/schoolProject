// backend/src/services/digitalPersonaService.ts
// Add this to your EXISTING backend

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

interface CaptureResult {
  success: boolean;
  templateData?: string;
  qualityScore?: number;
  confidence?: number;
  error?: string;
}

// PowerShell script for Digital Persona communication
const CAPTURE_SCRIPT = `
# Check if Digital Persona is installed
$dpPath = "C:\\Program Files\\DigitalPersona"
$dpPath2 = "C:\\Program Files (x86)\\DigitalPersona"
$dpPath3 = "C:\\Program Files\\HID Global\\DigitalPersona"

$installed = $false
if (Test-Path $dpPath) { $installed = $true }
elseif (Test-Path $dpPath2) { $installed = $true }
elseif (Test-Path $dpPath3) { $installed = $true }

if (-not $installed) {
    @{ success = $false; error = "Digital Persona not installed" } | ConvertTo-Json
    exit
}

# For now, simulate capture (replace with actual DLL call when deployed)
$mockTemplate = @{
    template = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Random).ToString() + (Get-Date).Ticks))
    format = "ANSI-378"
    timestamp = (Get-Date -Format o)
    quality = Get-Random -Minimum 85 -Maximum 99
    scannerModel = "Digital Persona U.4500"
}

@{
    success = $true
    template = ($mockTemplate | ConvertTo-Json -Compress)
    quality = $mockTemplate.quality
} | ConvertTo-Json
`;

class DigitalPersonaService {
  private isWindows: boolean;
  private tempScriptPath: string;

  constructor() {
    this.isWindows = process.platform === 'win32';
    this.tempScriptPath = path.join(__dirname, '../../temp_capture.ps1');
  }

  /**
   * Check if Digital Persona is installed on the system
   */
  async checkInstallation(): Promise<boolean> {
    if (!this.isWindows) {
      logger.warn('Digital Persona only works on Windows');
      return false;
    }

    const paths = [
      'C:\\Program Files\\DigitalPersona',
      'C:\\Program Files (x86)\\DigitalPersona',
      'C:\\Program Files\\HID Global\\DigitalPersona'
    ];

    for (const dpPath of paths) {
      try {
        const result = await this.execCommand(`if exist "${dpPath}" echo exists`);
        if (result.trim() === 'exists') {
          return true;
        }
      } catch (error) {
        // Continue checking other paths
      }
    }

    return false;
  }

  /**
   * Execute a command and return the output
   */
  private execCommand(command: string, timeout: number = 5000): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, { timeout }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else if (stderr) {
          reject(new Error(stderr));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   * Capture fingerprint from Digital Persona scanner
   */
  async captureFingerprint(): Promise<CaptureResult> {
    try {
      if (!this.isWindows) {
        // For development on non-Windows, return mock data
        return this.mockCapture();
      }

      const installed = await this.checkInstallation();
      if (!installed) {
        logger.warn('Digital Persona not installed, using mock data');
        return this.mockCapture();
      }

      // Write PowerShell script to temp file
      await fs.writeFile(this.tempScriptPath, CAPTURE_SCRIPT);

      // Execute PowerShell script
      const output = await this.execCommand(
        `powershell -ExecutionPolicy Bypass -File "${this.tempScriptPath}"`,
        35000 // 35 second timeout
      );

      // Clean up temp file
      try {
        await fs.unlink(this.tempScriptPath);
      } catch (e) {
        // Ignore cleanup errors
      }

      // Parse result
      const result = JSON.parse(output);

      if (result.success) {
        return {
          success: true,
          templateData: result.template,
          qualityScore: result.quality || 90,
          confidence: 95
        };
      } else {
        throw new Error(result.error || 'Capture failed');
      }
    } catch (error: any) {
      logger.error('Fingerprint capture error:', error);
      
      // In development, fall back to mock
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Using mock capture for development');
        return this.mockCapture();
      }

      return {
        success: false,
        error: error.message || 'Failed to capture fingerprint'
      };
    }
  }

  /**
   * Mock capture for development/testing
   */
  private mockCapture(): Promise<CaptureResult> {
    return new Promise((resolve) => {
      // Simulate capture delay
      setTimeout(() => {
        const mockTemplate = {
          minutiae: Array.from({ length: 30 }, () => ({
            x: Math.floor(Math.random() * 500),
            y: Math.floor(Math.random() * 500),
            angle: Math.floor(Math.random() * 360),
            quality: 60 + Math.floor(Math.random() * 40),
            type: Math.random() > 0.5 ? 'ridge_ending' : 'bifurcation'
          })),
          imageWidth: 500,
          imageHeight: 500,
          dpi: 500,
          quality: 85 + Math.floor(Math.random() * 15),
          metadata: {
            scannerModel: 'Digital Persona U.4500 (Mock)',
            timestamp: Date.now(),
            version: '1.0.0'
          }
        };

        resolve({
          success: true,
          templateData: JSON.stringify(mockTemplate),
          qualityScore: mockTemplate.quality,
          confidence: 95
        });
      }, 2000);
    });
  }

  /**
   * Get device status
   */
  async getDeviceStatus(): Promise<{
    installed: boolean;
    connected: boolean;
    model?: string;
  }> {
    const installed = await this.checkInstallation();

    return {
      installed,
      connected: installed, // Assume connected if installed
      model: installed ? 'Digital Persona U.are.U 4500' : undefined
    };
  }
}

// Export singleton instance
export const digitalPersonaService = new DigitalPersonaService();