// src/components/Biometric/DigitalPersonaScanner.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Fingerprint,
  CheckCircle,
  XCircle,
  AlertCircle,
  Usb,
  Wifi,
  RefreshCw
} from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";

import type {
  BiometricScannerProps,
  BiometricScanResult,
} from "../../types/components";
import { useDigitalPersona } from "../../hooks/useDigitalPersona";
import Button from "../../components/UI/Button";
import LoadingSpinner from "../../components/UI/LoadingSpinner";

type ScannerState = "idle" | "scanning" | "processing" | "success" | "error";

const DigitalPersonaScanner: React.FC<BiometricScannerProps> = ({
  onScanResult,
  onScanStart,
  onScanEnd,
  disabled = false,
  className,
  mode = 'capture' // 'capture' or 'enroll'
}) => {
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [enrollmentProgress, setEnrollmentProgress] = useState(0);

  const { 
    isSupported, 
    isConnected, 
    startCapture, 
    stopCapture, 
    deviceInfo,
    enrollFingerprint,
    getDeviceInfo
  } = useDigitalPersona();

  const maxRetries = 3;
  const scanTimeout = 30000;

  // Refresh device info periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isConnected) {
        getDeviceInfo();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected, getDeviceInfo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerState === "scanning") {
        stopCapture();
        onScanEnd?.();
      }
    };
  }, [scannerState, stopCapture, onScanEnd]);

  const resetScanner = useCallback(() => {
    setScannerState("idle");
    setErrorMessage("");
    setRetryCount(0);
    setEnrollmentProgress(0);
  }, []);

  const handleStartScan = useCallback(async () => {
    if (!isSupported) {
      const errorMsg =
        "Digital Persona U.4500 SDK is not installed. Please install the Digital Persona SDK from https://www.digitalpersona.com/";
      toast.error(errorMsg);
      const result: BiometricScanResult = { success: false, message: errorMsg };
      onScanResult(result);
      return;
    }

    if (!isConnected) {
      const errorMsg =
        "Digital Persona U.4500 device not connected. Please connect the device and try again.";
      toast.error(errorMsg);
      const result: BiometricScanResult = { success: false, message: errorMsg };
      onScanResult(result);
      return;
    }

    if (disabled) return;

    try {
      setScannerState("scanning");
      setErrorMessage("");
      onScanStart?.();

      toast("Place your finger on the Digital Persona scanner...");

      // Capture fingerprint
      const scanResult = await startCapture({
        timeout: scanTimeout,
        quality: 80
      });

      setScannerState("processing");
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (scanResult.success) {
        setScannerState("success");

        const result: BiometricScanResult = {
          success: true,
          message: "Fingerprint captured successfully",
          templateData: scanResult.templateData,
          qualityScore: scanResult.qualityScore,
          confidence: scanResult.confidence,
          deviceInfo: scanResult.deviceInfo,
        };

        onScanResult(result);
        toast.success("Fingerprint captured successfully!");

        setTimeout(resetScanner, 2000);
      } else {
        throw new Error(
          scanResult.message || "Fingerprint capture failed"
        );
      }
    } catch (error: any) {
      setScannerState("error");

      let errorMsg = error.message || "Fingerprint capture failed";

      // Handle specific Digital Persona errors
      if (error.message?.includes('timeout')) {
        errorMsg = "Fingerprint capture timed out. Please ensure your finger is placed correctly on the scanner.";
      } else if (error.message?.includes('quality')) {
        errorMsg = "Fingerprint quality too low. Please clean your finger and the scanner, then try again.";
      } else if (error.message?.includes('cancelled')) {
        errorMsg = "Fingerprint capture was cancelled.";
      } else if (error.message?.includes('device')) {
        errorMsg = "Device communication error. Please reconnect the Digital Persona U.4500 device.";
      }

      setErrorMessage(errorMsg);

      const result: BiometricScanResult = {
        success: false,
        message: errorMsg,
        deviceInfo: deviceInfo,
      };

      onScanResult(result);
      toast.error(errorMsg);

      if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          setScannerState("idle");
        }, 2000);
      }
    } finally {
      onScanEnd?.();
    }
  }, [
    isSupported,
    isConnected,
    disabled,
    startCapture,
    deviceInfo,
    onScanStart,
    onScanEnd,
    onScanResult,
    retryCount,
    resetScanner,
  ]);

  const handleStartEnrollment = useCallback(async (userId: string) => {
    if (!isSupported || !isConnected) {
      const errorMsg = "Digital Persona device not available";
      toast.error(errorMsg);
      const result: BiometricScanResult = { success: false, message: errorMsg };
      onScanResult(result);
      return;
    }

    try {
      setScannerState("scanning");
      setErrorMessage("");
      onScanStart?.();

      toast("Starting fingerprint enrollment... Please scan your finger 4 times.");

      // Simulate enrollment progress
      const progressInterval = setInterval(() => {
        setEnrollmentProgress(prev => Math.min(prev + 25, 100));
      }, 1000);

      const enrollResult = await enrollFingerprint(userId);

      clearInterval(progressInterval);
      setEnrollmentProgress(100);

      setScannerState("processing");
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (enrollResult.success) {
        setScannerState("success");

        const result: BiometricScanResult = {
          success: true,
          message: "Fingerprint enrollment completed successfully",
          templateData: enrollResult.templateData,
          qualityScore: enrollResult.qualityScore,
          confidence: enrollResult.confidence,
          deviceInfo: enrollResult.deviceInfo,
        };

        onScanResult(result);
        toast.success("Fingerprint enrollment completed!");

        setTimeout(resetScanner, 2000);
      } else {
        throw new Error(enrollResult.message || "Enrollment failed");
      }
    } catch (error: any) {
      setScannerState("error");
      const errorMsg = error.message || "Fingerprint enrollment failed";
      setErrorMessage(errorMsg);

      const result: BiometricScanResult = {
        success: false,
        message: errorMsg,
        deviceInfo: deviceInfo,
      };

      onScanResult(result);
      toast.error(errorMsg);
    } finally {
      onScanEnd?.();
      setEnrollmentProgress(0);
    }
  }, [isSupported, isConnected, enrollFingerprint, deviceInfo, onScanStart, onScanEnd, onScanResult, resetScanner]);

  const handleStopScan = useCallback(() => {
    if (scannerState === "scanning") {
      stopCapture();
      setScannerState("idle");
      onScanEnd?.();
      toast("Fingerprint capture cancelled");
    }
  }, [scannerState, stopCapture, onScanEnd]);

  const handleRefreshDevice = useCallback(async () => {
    toast("Checking for Digital Persona U.4500 device...");
    await getDeviceInfo();
    if (isConnected) {
      toast.success("Device connected successfully!");
    } else {
      toast.error("Device not found. Please connect the Digital Persona U.4500.");
    }
  }, [getDeviceInfo, isConnected]);

  const getScannerIcon = () => {
    switch (scannerState) {
      case "success":
        return <CheckCircle className="w-16 h-16 text-success-500" />;
      case "error":
        return <XCircle className="w-16 h-16 text-error-500" />;
      case "scanning":
        return (
          <div className="relative">
            <Fingerprint className="w-16 h-16 text-primary-500 animate-pulse" />
          </div>
        );
      case "processing":
        return <LoadingSpinner size="lg" className="text-primary-500" />;
      default:
        return <Fingerprint className="w-16 h-16 text-gray-400" />;
    }
  };

  const getScannerMessage = () => {
    switch (scannerState) {
      case "scanning":
        if (mode === 'enroll' && enrollmentProgress > 0) {
          return `Enrolling fingerprint... ${enrollmentProgress}% complete`;
        }
        return "Please place your finger on the Digital Persona U.4500 scanner";
      case "processing":
        return "Processing fingerprint data...";
      case "success":
        return mode === 'enroll' 
          ? "Fingerprint enrollment completed successfully!"
          : "Fingerprint captured successfully!";
      case "error":
        return errorMessage || "Fingerprint operation failed";
      default:
        return isConnected
          ? "Click to scan your fingerprint with Digital Persona U.4500"
          : "Digital Persona U.4500 device not connected";
    }
  };

  const getScannerClasses = () => {
    return clsx(
      "biometric-scanner p-8 rounded-lg border-2 transition-all duration-300",
      {
        "border-primary-300 bg-primary-50": scannerState === "scanning",
        "border-success-300 bg-success-50": scannerState === "success",
        "border-error-300 bg-error-50": scannerState === "error",
        "border-gray-300 bg-gray-50": scannerState === "idle",
        "opacity-50 cursor-not-allowed": disabled || !isConnected,
      },
      className
    );
  };

  if (!isSupported) {
    return (
      <div
        className={clsx(
          "biometric-scanner p-8 rounded-lg border-2 border-warning-300 bg-warning-50",
          className
        )}
      >
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-warning-500" />
          <p className="mb-4 font-medium text-center text-warning-700">
            Digital Persona U.4500 SDK Not Detected
          </p>
          <div className="p-4 space-y-2 text-sm text-left rounded-lg text-warning-600 bg-warning-100">
            <p className="font-medium">To use the Digital Persona U.4500 scanner:</p>
            <ol className="ml-2 space-y-1 list-decimal list-inside">
              <li>Download and install Digital Persona SDK</li>
              <li>Connect the Digital Persona U.4500 device via USB</li>
              <li>Refresh this page after installation</li>
            </ol>
            <p className="mt-3">
              <a 
                href="https://www.digitalpersona.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline text-primary-600 hover:text-primary-800"
              >
                Download Digital Persona SDK →
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={getScannerClasses()}>
      <div className="text-center">
        <div className="mb-4">{getScannerIcon()}</div>

        <p className="mb-4 text-lg font-medium text-gray-900">
          {getScannerMessage()}
        </p>

        {/* Enrollment Progress */}
        {mode === 'enroll' && enrollmentProgress > 0 && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${enrollmentProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Device Information */}
        {deviceInfo && isConnected && (
          <div className="p-3 mb-4 text-xs text-gray-500 bg-gray-100 rounded-lg">
            <div className="flex items-center justify-center mb-2 space-x-2">
              <Usb className="w-3 h-3" />
              <span className="font-medium">Device Connected</span>
            </div>
            <div className="space-y-1">
              <p>{deviceInfo.name}</p>
              <p>Model: {deviceInfo.model}</p>
              <p>Manufacturer: {deviceInfo.manufacturer}</p>
              {deviceInfo.serialNumber !== 'N/A' && (
                <p>S/N: {deviceInfo.serialNumber}</p>
              )}
            </div>
          </div>
        )}

        {/* Device Not Connected Warning */}
        {!isConnected && (
          <div className="p-3 mb-4 text-sm text-red-800 rounded-lg bg-red-50">
            <div className="flex items-center mb-2 space-x-2">
              <XCircle className="w-4 h-4" />
              <span className="font-medium">Device Not Connected</span>
            </div>
            <p>Please connect the Digital Persona U.4500 device via USB</p>
            <Button 
              size="sm"
              variant="secondary"
              onClick={handleRefreshDevice}
              className="flex items-center mt-2 space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Check Connection</span>
            </Button>
          </div>
        )}

        {/* Scanner Instructions */}
        {scannerState === "idle" && isConnected && (
          <div className="p-3 mb-4 text-sm text-blue-800 rounded-lg bg-blue-50">
            <div className="flex items-center mb-2 space-x-2">
              <Fingerprint className="w-4 h-4" />
              <span className="font-medium">Ready to Scan</span>
            </div>
            <p>
              Place your finger firmly on the scanner surface when prompted
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          {scannerState === "idle" && (
            <Button
              onClick={handleStartScan}
              disabled={disabled || !isConnected}
              variant="primary"
              className="flex items-center space-x-2"
            >
              <Fingerprint className="w-5 h-5" />
              <span>{mode === 'enroll' ? 'Start Enrollment' : 'Scan Fingerprint'}</span>
            </Button>
          )}

          {scannerState === "scanning" && (
            <Button
              onClick={handleStopScan}
              variant="secondary"
              className="flex items-center space-x-2"
            >
              <span>Cancel</span>
            </Button>
          )}

          {scannerState === "error" && retryCount < maxRetries && (
            <Button
              onClick={() => {
                setScannerState("idle");
                setErrorMessage("");
              }}
              variant="primary"
              className="flex items-center space-x-2"
            >
              <span>Try Again ({maxRetries - retryCount} left)</span>
            </Button>
          )}

          {(scannerState === "success" ||
            (scannerState === "error" && retryCount >= maxRetries)) && (
            <Button
              onClick={resetScanner}
              variant="secondary"
              className="flex items-center space-x-2"
            >
              <span>Scan Again</span>
            </Button>
          )}
        </div>

        {/* Retry Information */}
        {retryCount > 0 && retryCount < maxRetries && (
          <p className="mt-2 text-sm text-gray-600">
            Attempt {retryCount + 1} of {maxRetries + 1}
          </p>
        )}

        {/* Troubleshooting Help */}
        {scannerState === "error" && (
          <div className="p-3 mt-4 text-sm text-gray-600 bg-gray-100 rounded-lg">
            <p className="mb-2 font-medium">Troubleshooting:</p>
            <ul className="space-y-1 text-left list-disc list-inside">
              <li>Ensure the Digital Persona U.4500 is connected via USB</li>
              <li>Clean the scanner surface with a soft, lint-free cloth</li>
              <li>Clean your finger and ensure it's dry</li>
              <li>Place your finger flat on the scanner surface</li>
              <li>Try using a different finger if issues persist</li>
              <li>Restart the Digital Persona SDK service</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalPersonaScanner;