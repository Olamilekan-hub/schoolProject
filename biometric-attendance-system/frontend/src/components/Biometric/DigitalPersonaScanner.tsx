import React, { useState, useEffect, useCallback } from "react";
import {
  Fingerprint,
  CheckCircle,
  XCircle,
  AlertCircle,
  Usb,
  RefreshCw,
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
  mode = "capture", // 'capture' or 'enroll'
}) => {
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [enrollmentProgress, setEnrollmentProgress] = useState(0);

  const {
    isSupported,
    isConnected,
    deviceInfo,
    startCapture,
    stopCapture,
    getDeviceInfo,
    enrollFingerprint,
    error,
  } = useDigitalPersona();

  const maxRetries = 3;

  // Auto-refresh connection
  useEffect(() => {
    const interval = setInterval(() => {
      getDeviceInfo();
    }, 5000);
    return () => clearInterval(interval);
  }, [getDeviceInfo]);

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

  /** 🔹 Handle Capture Mode */
  const handleStartScan = useCallback(async () => {
    if (!isSupported) {
      const msg =
        "DigitalPersona SDK not detected. Install the Lite Client from https://crossmatch.hid.gl/lite-client.";
      toast.error(msg);
      onScanResult({ success: false, message: msg });
      return;
    }

    if (!isConnected) {
      const msg = "Device not connected. Please connect Digital Persona U.4500.";
      toast.error(msg);
      onScanResult({ success: false, message: msg });
      return;
    }

    if (disabled) return;

    try {
      setScannerState("scanning");
      setErrorMessage("");
      onScanStart?.();
      toast("Place your finger on the scanner...");

      const scanResult = await startCapture();

      setScannerState("processing");
      await new Promise((r) => setTimeout(r, 500));

      if (scanResult.success) {
        setScannerState("success");
        onScanResult(scanResult);
        toast.success("Fingerprint captured successfully!");
        setTimeout(resetScanner, 2000);
      } else {
        throw new Error(scanResult.message || "Fingerprint capture failed");
      }
    } catch (err: any) {
      setScannerState("error");
      const msg = err.message || "Fingerprint capture failed";
      setErrorMessage(msg);
      toast.error(msg);
      onScanResult({ success: false, message: msg });
      if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount((p) => p + 1);
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
    onScanStart,
    onScanEnd,
    onScanResult,
    retryCount,
    resetScanner,
  ]);

  /** 🔹 Handle Enrollment Mode */
  const handleStartEnrollment = useCallback(
    async (userId: string) => {
      if (!isSupported || !isConnected) {
        const msg = "DigitalPersona device not available";
        toast.error(msg);
        onScanResult({ success: false, message: msg });
        return;
      }

      try {
        setScannerState("scanning");
        setErrorMessage("");
        onScanStart?.();

        toast("Starting enrollment... Scan your finger 4 times.");
        const progressInterval = setInterval(() => {
          setEnrollmentProgress((p) => Math.min(p + 25, 100));
        }, 1000);

        const enrollResult = await enrollFingerprint(userId);
        clearInterval(progressInterval);
        setEnrollmentProgress(100);

        setScannerState("processing");
        await new Promise((r) => setTimeout(r, 500));

        if (enrollResult.success) {
          setScannerState("success");
          toast.success("Enrollment complete!");
          onScanResult(enrollResult);
          setTimeout(resetScanner, 2000);
        } else {
          throw new Error(enrollResult.message || "Enrollment failed");
        }
      } catch (err: any) {
        setScannerState("error");
        const msg = err.message || "Enrollment failed";
        setErrorMessage(msg);
        onScanResult({ success: false, message: msg });
        toast.error(msg);
      } finally {
        onScanEnd?.();
        setEnrollmentProgress(0);
      }
    },
    [
      isSupported,
      isConnected,
      enrollFingerprint,
      onScanStart,
      onScanEnd,
      onScanResult,
      resetScanner,
    ]
  );

  const handleStopScan = useCallback(() => {
    if (scannerState === "scanning") {
      stopCapture();
      setScannerState("idle");
      onScanEnd?.();
      toast("Fingerprint capture cancelled");
    }
  }, [scannerState, stopCapture, onScanEnd]);

  const handleRefreshDevice = useCallback(async () => {
    toast("Checking Digital Persona device...");
    await getDeviceInfo();
    if (isConnected) toast.success("Device connected!");
    else toast.error("Device not found. Connect the U.4500 scanner.");
  }, [getDeviceInfo, isConnected]);

  /** 🔹 UI Logic */
  const getScannerIcon = () => {
    switch (scannerState) {
      case "success":
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case "error":
        return <XCircle className="w-16 h-16 text-red-500" />;
      case "scanning":
        return <Fingerprint className="w-16 h-16 text-blue-500 animate-pulse" />;
      case "processing":
        return <LoadingSpinner size="lg" className="text-blue-500" />;
      default:
        return <Fingerprint className="w-16 h-16 text-gray-400" />;
    }
  };

  const getScannerMessage = () => {
    if (error) return `Error: ${error}`;
    switch (scannerState) {
      case "scanning":
        return mode === "enroll" && enrollmentProgress > 0
          ? `Enrolling... ${enrollmentProgress}%`
          : "Place your finger on the scanner";
      case "processing":
        return "Processing fingerprint data...";
      case "success":
        return mode === "enroll"
          ? "Enrollment completed successfully!"
          : "Fingerprint captured successfully!";
      case "error":
        return errorMessage;
      default:
        return isConnected
          ? "Click below to scan your fingerprint"
          : "Device not connected";
    }
  };

  const getScannerClasses = () =>
    clsx(
      "biometric-scanner p-8 rounded-lg border-2 transition-all duration-300",
      {
        "border-blue-300 bg-blue-50": scannerState === "scanning",
        "border-green-300 bg-green-50": scannerState === "success",
        "border-red-300 bg-red-50": scannerState === "error",
        "border-gray-300 bg-gray-50": scannerState === "idle",
        "opacity-50 cursor-not-allowed": disabled || !isConnected,
      },
      className
    );

  /** 🔹 If not supported (SDK missing) */
  if (!isSupported) {
    return (
      <div className="p-6 border-2 rounded-lg border-yellow-300 bg-yellow-50">
        <AlertCircle className="w-10 h-10 mx-auto mb-4 text-yellow-600" />
        <p className="text-center font-medium text-yellow-800 mb-2">
          DigitalPersona SDK Not Detected
        </p>
        <ol className="text-sm list-decimal list-inside text-yellow-700 space-y-1">
          <li>Install Lite Client from https://crossmatch.hid.gl/lite-client</li>
          <li>Ensure /modules/WebSdk/index.js is loaded</li>
          <li>Refresh this page</li>
        </ol>
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
        {mode === "enroll" && enrollmentProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${enrollmentProgress}%` }}
            />
          </div>
        )}

        {/* Device Info */}
        {deviceInfo && isConnected && (
          <div className="p-3 mb-4 text-xs text-gray-600 bg-gray-100 rounded-lg">
            <div className="flex items-center justify-center mb-1 space-x-2">
              <Usb className="w-3 h-3" />
              <span className="font-medium">Device Connected</span>
            </div>
            <p>{deviceInfo.name}</p>
            <p>Model: {deviceInfo.model}</p>
            <p>Manufacturer: {deviceInfo.manufacturer}</p>
            {deviceInfo.serialNumber && <p>S/N: {deviceInfo.serialNumber}</p>}
          </div>
        )}

        {/* Not Connected */}
        {!isConnected && (
          <div className="p-3 mb-4 text-sm text-red-800 bg-red-50 rounded-lg">
            <XCircle className="inline w-4 h-4 mr-1" />
            Device not connected — connect Digital Persona U.4500
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRefreshDevice}
              className="flex items-center mt-2 space-x-1 mx-auto"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Check Connection</span>
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-4">
          {scannerState === "idle" && (
            <Button
              onClick={() =>
                mode === "enroll"
                  ? handleStartEnrollment("demo-user")
                  : handleStartScan()
              }
              disabled={disabled || !isConnected}
              variant="primary"
              className="flex items-center space-x-2"
            >
              <Fingerprint className="w-5 h-5" />
              <span>
                {mode === "enroll" ? "Start Enrollment" : "Scan Fingerprint"}
              </span>
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
      </div>
    </div>
  );
};

export default DigitalPersonaScanner;
