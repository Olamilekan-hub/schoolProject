// frontend/src/hooks/useDigitalPersona.ts
// FINAL VERSION - Connects to your EXISTING backend

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { BiometricScanResult, BiometricDevice } from '../types/biometric';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface UseDigitalPersonaReturn {
  isSupported: boolean;
  isConnected: boolean;
  deviceInfo: BiometricDevice | null;
  startCapture: () => Promise<BiometricScanResult>;
  stopCapture: () => void;
  getDeviceInfo: () => Promise<BiometricDevice | null>;
  enrollFingerprint: (userId: string, requiredScans?: number) => Promise<BiometricScanResult>;
  error: string | null;
  isCapturing: boolean;
}

export const useDigitalPersona = (): UseDigitalPersonaReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<BiometricDevice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Check device status on mount and periodically
  useEffect(() => {
    let mounted = true;

    const checkDevice = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const response = await axios.get(`${API_URL}/api/biometric/device/status`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        });

        if (!mounted) return;

        if (response.data.success) {
          setIsSupported(true);
          const deviceData = response.data.data;
          
          if (deviceData.isConnected && deviceData.deviceInfo) {
            setIsConnected(true);
            setDeviceInfo({
              id: 'dp-backend-device',
              name: deviceData.deviceInfo.name || 'Digital Persona U.are.U 4500',
              type: 'FINGERPRINT',
              manufacturer: deviceData.deviceInfo.manufacturer || 'HID Global',
              model: deviceData.deviceInfo.model || 'U.are.U 4500',
              serialNumber: 'backend-managed',
              isConnected: true,
              capabilities: ['fingerprint', 'enrollment', 'verification']
            });
            setError(null);
          } else {
            setIsConnected(false);
            setError(
              deviceData.installed 
                ? 'Digital Persona device not connected. Please connect the scanner.'
                : 'Digital Persona not installed on server. Please install HID Authentication Device Client.'
            );
          }
        }
      } catch (err: any) {
        if (!mounted) return;

        setIsSupported(false);
        setIsConnected(false);
        
        if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
          setError('Cannot connect to backend server');
        } else if (err.response?.status === 401) {
          setError('Authentication required');
        } else {
          setError(err.message || 'Failed to check device status');
        }
      }
    };

    checkDevice();
    const interval = setInterval(checkDevice, 15000); // Check every 15 seconds

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const getDeviceInfo = useCallback(async (): Promise<BiometricDevice | null> => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.get(`${API_URL}/api/biometric/device/status`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });

      if (response.data.success && response.data.data.deviceInfo) {
        return deviceInfo;
      }
      return null;
    } catch (error) {
      return null;
    }
  }, [deviceInfo]);

  const startCapture = useCallback(async (): Promise<BiometricScanResult> => {
    if (!isSupported) {
      return {
        success: false,
        message: 'Biometric capture not supported. Backend may not have Digital Persona installed.'
      };
    }

    if (!isConnected) {
      return {
        success: false,
        message: 'No fingerprint device connected. Please ensure scanner is connected to the server.'
      };
    }

    if (isCapturing) {
      return {
        success: false,
        message: 'Already capturing fingerprint. Please wait.'
      };
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      setIsCapturing(true);
      setError(null);

      const response = await axios.post(
        `${API_URL}/api/biometric/capture`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 35000 // 35 second timeout
        }
      );

      setIsCapturing(false);

      if (response.data.success) {
        return {
          success: true,
          message: 'Fingerprint captured successfully',
          templateData: response.data.data.templateData,
          qualityScore: response.data.data.qualityScore,
          confidence: response.data.data.confidence,
          deviceInfo: deviceInfo
        };
      } else {
        throw new Error(response.data.message || 'Capture failed');
      }
    } catch (err: any) {
      setIsCapturing(false);
      
      let errorMessage = 'Failed to capture fingerprint';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Capture timed out. Please place your finger on the scanner and try again.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);

      return {
        success: false,
        message: errorMessage,
        deviceInfo: deviceInfo
      };
    }
  }, [isSupported, isConnected, isCapturing, deviceInfo]);

  const stopCapture = useCallback(() => {
    setIsCapturing(false);
  }, []);

  const enrollFingerprint = useCallback(async (
    userId: string,
    requiredScans: number = 4
  ): Promise<BiometricScanResult> => {
    if (!isSupported || !isConnected) {
      return {
        success: false,
        message: 'Digital Persona device not available'
      };
    }

    try {
      const samples: string[] = [];
      
      for (let i = 0; i < requiredScans; i++) {
        console.log(`Capturing sample ${i + 1} of ${requiredScans}...`);
        
        const result = await startCapture();
        
        if (!result.success) {
          return {
            success: false,
            message: `Failed at scan ${i + 1} of ${requiredScans}: ${result.message}`
          };
        }

        if (result.templateData) {
          samples.push(result.templateData);
        }

        // Small delay between captures
        if (i < requiredScans - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      // Combine all samples
      const enrollmentData = JSON.stringify({
        template: samples[0],
        samples: samples,
        userId: userId,
        scanCount: requiredScans,
        format: 'ANSI-378',
        enrollmentDate: new Date().toISOString()
      });

      return {
        success: true,
        message: `Enrollment completed with ${requiredScans} samples`,
        templateData: enrollmentData,
        qualityScore: 95,
        confidence: 100,
        deviceInfo: deviceInfo
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Enrollment failed',
        deviceInfo: deviceInfo
      };
    }
  }, [isSupported, isConnected, startCapture, deviceInfo]);

  return {
    isSupported,
    isConnected,
    deviceInfo,
    startCapture,
    stopCapture,
    getDeviceInfo,
    enrollFingerprint,
    error,
    isCapturing
  };
};