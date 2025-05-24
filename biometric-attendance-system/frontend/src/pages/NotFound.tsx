// src/pages/NotFound.tsx
import React from 'react'
import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import Button from '../components/UI/Button'

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-9xl font-extrabold text-primary-600">404</h1>
          <h2 className="mt-4 text-3xl font-bold text-gray-900">
            Page not found
          </h2>
          <p className="mt-2 text-lg text-gray-600">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => window.history.back()}
            variant="secondary"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go back</span>
          </Button>
          
          <Link to="/dashboard">
            <Button
              variant="primary"
              className="flex items-center space-x-2 w-full sm:w-auto"
            >
              <Home className="h-4 w-4" />
              <span>Go home</span>
            </Button>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            If you think this is an error, please{' '}
            <Link 
              to="/help" 
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default NotFound 