'use client';

import React from 'react';
import { ApolloError } from '@apollo/client';
import { AlertCircle, RefreshCw, Database, Wifi } from 'lucide-react';

interface GraphQLErrorBoundaryProps {
  children: React.ReactNode;
  error?: ApolloError | Error | null;
  loading?: boolean;
  retry?: () => void;
  fallback?: React.ComponentType<GraphQLErrorFallbackProps>;
}

interface GraphQLErrorFallbackProps {
  error: ApolloError | Error;
  retry?: () => void;
  loading?: boolean;
}

const DefaultGraphQLErrorFallback: React.FC<GraphQLErrorFallbackProps> = ({ 
  error, 
  retry, 
  loading 
}) => {
  const isApolloError = error instanceof ApolloError;
  const isNetworkError = isApolloError && error.networkError;
  const hasGraphQLErrors = isApolloError && error.graphQLErrors?.length > 0;

  const getErrorDetails = () => {
    if (isNetworkError) {
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
        icon: <Wifi className="h-12 w-12 text-red-500" />,
        canRetry: true,
      };
    }

    if (hasGraphQLErrors) {
      const firstError = error.graphQLErrors[0];
      return {
        title: 'Data Error',
        message: firstError.message || 'An error occurred while fetching data.',
        icon: <Database className="h-12 w-12 text-red-500" />,
        canRetry: true,
      };
    }

    return {
      title: 'Application Error',
      message: error.message || 'An unexpected error occurred.',
      icon: <AlertCircle className="h-12 w-12 text-red-500" />,
      canRetry: !!retry,
    };
  };

  const { title, message, icon, canRetry } = getErrorDetails();
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-[400px] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-red-200 p-6 text-center">
        <div className="flex justify-center mb-4">
          {icon}
        </div>
        
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>

        {isDevelopment && isApolloError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-left">
            <h3 className="text-sm font-medium text-red-800 mb-2">Debug Information:</h3>
            
            {error.networkError && (
              <div className="mb-2">
                <strong className="text-xs text-red-700">Network Error:</strong>
                <pre className="text-xs text-red-600 whitespace-pre-wrap break-words">
                  {error.networkError.message}
                </pre>
              </div>
            )}
            
            {error.graphQLErrors?.map((err, index) => (
              <div key={index} className="mb-2">
                <strong className="text-xs text-red-700">GraphQL Error {index + 1}:</strong>
                <pre className="text-xs text-red-600 whitespace-pre-wrap break-words">
                  {err.message}
                </pre>
                {err.locations && (
                  <p className="text-xs text-red-600">
                    Location: Line {err.locations[0]?.line}, Column {err.locations[0]?.column}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {canRetry && retry && (
          <button
            onClick={retry}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Retrying...' : 'Try Again'}
          </button>
        )}
      </div>
    </div>
  );
};

const GraphQLErrorBoundary: React.FC<GraphQLErrorBoundaryProps> = ({
  children,
  error,
  loading,
  retry,
  fallback: FallbackComponent = DefaultGraphQLErrorFallback,
}) => {
  if (error) {
    return (
      <FallbackComponent
        error={error}
        retry={retry}
        loading={loading}
      />
    );
  }

  return <>{children}</>;
};

export default GraphQLErrorBoundary;
export type { GraphQLErrorFallbackProps };