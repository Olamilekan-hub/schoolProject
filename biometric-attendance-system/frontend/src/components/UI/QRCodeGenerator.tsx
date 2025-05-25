// src/components/UI/QRCodeGenerator.tsx
import React, { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { Download, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

import Button from './Button'
import type { QRCodeGeneratorProps } from '../../types/components'

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  value,
  size = 200,
  level = 'M',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current && value) {
      generateQRCode()
    }
  }, [value, size, level])

  const generateQRCode = async () => {
    if (!canvasRef.current || !value) return

    try {
      await QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: level
      })
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast.error('Failed to generate QR code')
    }
  }

  const handleDownload = () => {
    if (!canvasRef.current) return

    try {
      const link = document.createElement('a')
      link.download = `qr-code-${Date.now()}.png`
      link.href = canvasRef.current.toDataURL()
      link.click()
      toast.success('QR code downloaded successfully!')
    } catch (error) {
      toast.error('Failed to download QR code')
    }
  }

  const handleCopyImage = async () => {
    if (!canvasRef.current) return

    try {
      canvasRef.current.toBlob(async (blob) => {
        if (blob) {
          const item = new ClipboardItem({ 'image/png': blob })
          await navigator.clipboard.write([item])
          toast.success('QR code copied to clipboard!')
        }
      })
    } catch (error) {
      toast.error('Failed to copy QR code')
    }
  }

  if (!value) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <p className="text-gray-500">No data to generate QR code</p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      <div className="p-4 bg-white rounded-lg shadow-sm border">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto"
          style={{ imageRendering: 'crisp-edges' }}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleDownload}
          className="flex items-center space-x-1"
        >
          <Download className="h-3 w-3" />
          <span>Download</span>
        </Button>
        
        <Button
          size="sm"
          variant="secondary"
          onClick={handleCopyImage}
          className="flex items-center space-x-1"
        >
          <Copy className="h-3 w-3" />
          <span>Copy</span>
        </Button>
      </div>
      
      <div className="text-center">
        <p className="text-xs text-gray-500 break-all max-w-xs">
          {value.length > 50 ? `${value.substring(0, 50)}...` : value}
        </p>
      </div>
    </div>
  )
}

export default QRCodeGenerator