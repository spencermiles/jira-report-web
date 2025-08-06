'use client';

import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { useQuery } from '@apollo/client';
import { GET_COMPANIES } from '@/lib/graphql/queries';
import { useJiraUpload } from '@/hooks/use-jira-upload';

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface CompanyUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCompanyId?: string;
}

const CompanyUploadModal: React.FC<CompanyUploadModalProps> = ({
  isOpen,
  onClose,
  preselectedCompanyId
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState(preselectedCompanyId || '');
  const { uploading, progress, error: uploadError, uploadJiraFile, clearError } = useJiraUpload();

  const { data: companiesData, loading: companiesLoading } = useQuery<{ companies: { companies: Company[] } }>(GET_COMPANIES, {
    variables: { pagination: { limit: 100, offset: 0 } }
  });

  const companies = companiesData?.companies?.companies || [];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedCompanyId) {
      await uploadJiraFile(file, selectedCompanyId);
      // Clear the input value so the same file can be uploaded again if needed
      event.target.value = '';
      // Close modal on successful upload
      if (!uploadError) {
        setTimeout(() => onClose(), 1000);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Upload JIRA Data</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Company Selection */}
          <div className="mb-6">
            <label htmlFor="company-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Company
            </label>
            {companiesLoading ? (
              <div className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded-md"></div>
              </div>
            ) : (
              <select
                id="company-select"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!!preselectedCompanyId}
              >
                <option value="">Choose a company...</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            )}
            {preselectedCompanyId && (
              <p className="mt-1 text-sm text-gray-500">
                Company is pre-selected for this context
              </p>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && progress && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span className="capitalize">{progress.stage}</span>
                <span>{progress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-width duration-300"
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>
              <p className="mt-1 text-sm text-gray-600">{progress.message}</p>
            </div>
          )}

          {/* Error Display */}
          {uploadError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm">{uploadError}</p>
              <button
                onClick={clearError}
                className="mt-2 text-red-600 underline text-sm hover:text-red-800"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JIRA Export File (JSON)
            </label>
            <label
              className={`
                flex flex-col items-center justify-center w-full h-32 
                border-2 border-dashed rounded-lg cursor-pointer
                transition-colors
                ${selectedCompanyId && !uploading
                  ? 'border-gray-300 bg-gray-50 hover:bg-gray-100' 
                  : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                }
              `}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className={`w-8 h-8 mb-4 ${selectedCompanyId ? 'text-gray-500' : 'text-gray-300'}`} />
                <p className={`mb-2 text-sm ${selectedCompanyId ? 'text-gray-500' : 'text-gray-400'}`}>
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className={`text-xs ${selectedCompanyId ? 'text-gray-500' : 'text-gray-400'}`}>
                  JSON files only
                </p>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={!selectedCompanyId || uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyUploadModal;