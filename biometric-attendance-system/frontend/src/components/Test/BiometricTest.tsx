// src/components/Test/BiometricTest.tsx - Test component for biometric functionality
import React, { useState } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info,
  Shield,
  Fingerprint,
  Monitor,
  Globe,
  Key
} from 'lucide-react'

import { useBiometric } from '../../hooks/useBiometric'
import Button from '../UI/Button'
import Card from '../UI/Card'
import Badge from '../UI/Badge'
import FingerprintScanner from '../Biometric/FingerprintScanner'
import type { BiometricScanResult } from '../../types/biometric'

const BiometricTest: React.FC = () => {
  const [testResults, setTestResults] = useState<{
    https: boolean
    webauthn: boolean
    windowsHello: boolean
    fingerprint: boolean
    lastScanResult?: BiometricScanResult
  }>({
    https: false,
    webauthn: false,
    windowsHello: false,
    fingerprint: false
  })

  const [testing, setTesting] = useState(false)
  const [testStep, setTestStep] = useState<string>('')

  const { 
    isSupported, 
    isAvailable, 
    deviceInfo,
    enrollFingerprint
  } = useBiometric()

  const runSystemTests = async () => {
    setTesting(true)
    setTestStep('Starting system tests...')

    const results = {
      https: false,
      webauthn: false,
      windowsHello: false,
      fingerprint: false
    }

    try {
      // Test 1: HTTPS Check
      setTestStep('Testing HTTPS connection...')
      await new Promise(resolve => setTimeout(resolve, 500))
      results.https = location.protocol === 'https:'

      // Test 2: WebAuthn Support
      setTestStep('Testing WebAuthn support...')
      await new Promise(resolve => setTimeout(resolve, 500))
      results.webauthn = 'credentials' in navigator && 'PublicKeyCredential' in window

      // Test 3: Windows Hello Availability
      setTestStep('Testing Windows Hello availability...')
      await new Promise(resolve => setTimeout(resolve, 500))
      if (results.webauthn) {
        try {
          results.windowsHello = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        } catch (error) {
          results.windowsHello = false
        }
      }

      // Test 4: Fingerprint Test (if available)
      setTestStep('System tests complete!')
      
      setTestResults(results)
    } catch (error) {
      console.error('System test error:', error)
    } finally {
      setTesting(false)
      setTestStep('')
    }
  }

  const handleFingerprintTest = (result: BiometricScanResult) => {
    setTestResults(prev => ({
      ...prev,
      fingerprint: result.success,
      lastScanResult: result
    }))
  }

  const testEnrollment = async () => {
    try {
      const result = await enrollFingerprint('test-user-123')
      setTestResults(prev => ({
        ...prev,
        lastScanResult: result
      }))
    } catch (error) {
      console.error('Enrollment test failed:', error)
    }
  }

  const getTestIcon = (passed: boolean, tested: boolean = true) => {
    if (!tested) return <AlertCircle className="h-5 w-5 text-gray-400" />
    return passed ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <XCircle className="h-5 w-5 text-red-500" />
  }

  const getTestBadge = (passed: boolean, tested: boolean = true) => {
    if (!tested) return <Badge variant="secondary">Not Tested</Badge>
    return <Badge variant={passed ? 'success' : 'error'}>
      {passed ? 'Pass' : 'Fail'}
    </Badge>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔐 Biometric System Test
        </h1>
        <p className="text-gray-600">
          Test your Windows Hello fingerprint integration
        </p>
      </div>

      {/* System Status Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">System Status</h2>
          <Button onClick={runSystemTests} loading={testing}>
            {testing ? testStep : 'Run System Tests'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Globe className="h-5 w-5 text-blue-500" />
              <span className="font-medium">HTTPS Connection</span>
            </div>
            <div className="flex items-center space-x-2">
              {getTestIcon(testResults.https)}
              {getTestBadge(testResults.https)}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Key className="h-5 w-5 text-purple-500" />
              <span className="font-medium">WebAuthn Support</span>
            </div>
            <div className="flex items-center space-x-2">
              {getTestIcon(testResults.webauthn)}
              {getTestBadge(testResults.webauthn)}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-green-500" />
              <span className="font-medium">Windows Hello</span>
            </div>
            <div className="flex items-center space-x-2">
              {getTestIcon(testResults.windowsHello)}
              {getTestBadge(testResults.windowsHello)}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Fingerprint className="h-5 w-5 text-indigo-500" />
              <span className="font-medium">Fingerprint Test</span>
            </div>
            <div className="flex items-center space-x-2">
              {getTestIcon(testResults.fingerprint, !!testResults.lastScanResult)}
              {getTestBadge(testResults.fingerprint, !!testResults.lastScanResult)}
            </div>
          </div>
        </div>
      </Card>

      {/* Device Information */}
      {deviceInfo && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Device Information</h2>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><strong>Device:</strong> {deviceInfo.name}</div>
              <div><strong>Type:</strong> {deviceInfo.type}</div>
              <div><strong>Platform:</strong> {deviceInfo.model}</div>
              <div><strong>Status:</strong> 
                <Badge variant={deviceInfo.isConnected ? 'success' : 'error'} size="sm" className="ml-2">
                  {deviceInfo.isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
              <div className="md:col-span-2">
                <strong>Capabilities:</strong> {deviceInfo.capabilities.join(', ')}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Compatibility Checks */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Compatibility Status</h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Monitor className="h-5 w-5 text-gray-500" />
            <span className="flex-1">Browser Support</span>
            <Badge variant={isSupported ? 'success' : 'error'}>
              {isSupported ? 'Supported' : 'Not Supported'}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-gray-500" />
            <span className="flex-1">Platform Authenticator</span>
            <Badge variant={isAvailable ? 'success' : 'error'}>
              {isAvailable ? 'Available' : 'Not Available'}
            </Badge>
          </div>

          <div className="flex items-center space-x-3">
            <Globe className="h-5 w-5 text-gray-500" />
            <span className="flex-1">Secure Context (HTTPS)</span>
            <Badge variant={location.protocol === 'https:' ? 'success' : 'error'}>
              {location.protocol === 'https:' ? 'Secure' : 'Insecure'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Fingerprint Scanner Test */}
      {isSupported && isAvailable && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Fingerprint Scanner Test</h2>
          <p className="text-gray-600 mb-4">
            Test your fingerprint scanner to ensure it's working correctly with Windows Hello.
          </p>
          
          <FingerprintScanner
            onScanResult={handleFingerprintTest}
            className="max-w-md mx-auto"
          />

          <div className="mt-4 space-x-2 text-center">
            <Button onClick={testEnrollment} variant="secondary">
              Test Enrollment Flow
            </Button>
          </div>
        </Card>
      )}

      {/* Test Results */}
      {testResults.lastScanResult && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Last Test Result</h2>
          <div className={`p-4 rounded-lg ${
            testResults.lastScanResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center space-x-3 mb-3">
              {testResults.lastScanResult.success ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <div>
                <p className={`font-medium ${
                  testResults.lastScanResult.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {testResults.lastScanResult.success ? 'Success!' : 'Failed'}
                </p>
                <p className={`text-sm ${
                  testResults.lastScanResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {testResults.lastScanResult.message}
                </p>
              </div>
            </div>

            {testResults.lastScanResult.success && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <strong>Quality Score:</strong> {testResults.lastScanResult.qualityScore}%
                </div>
                <div>
                  <strong>Confidence:</strong> {testResults.lastScanResult.confidence}%
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Troubleshooting */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>
        <div className="space-y-4">
          {!testResults.https && (
            <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">HTTPS Required</p>
                <p className="text-sm text-red-700">
                  Biometric authentication requires HTTPS. Generate SSL certificates and restart your dev server.
                </p>
              </div>
            </div>
          )}

          {!testResults.webauthn && (
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">WebAuthn Not Supported</p>
                <p className="text-sm text-yellow-700">
                  Your browser doesn't support WebAuthn. Try Chrome, Edge, or Firefox.
                </p>
              </div>
            </div>
          )}

          {!testResults.windowsHello && (
            <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900">Windows Hello Not Available</p>
                <p className="text-sm text-orange-700">
                  Set up Windows Hello in Settings → Accounts → Sign-in options.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Need Help?</p>
              <p className="text-sm text-blue-700">
                Check the setup guide for detailed troubleshooting steps and requirements.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default BiometricTest