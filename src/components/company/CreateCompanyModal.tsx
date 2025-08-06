'use client';

import React, { useState } from 'react';
import { Plus, X, Upload, Building2 } from 'lucide-react';
import { useMutation } from '@apollo/client';
import { CREATE_COMPANY } from '@/lib/graphql/queries';
import { useJiraUpload } from '@/hooks/use-jira-upload';
import { useRouter } from 'next/navigation';
import { paths } from '@/lib/paths';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: ''
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [createAndUpload, setCreateAndUpload] = useState(false);
  
  const { uploading, progress, error: uploadError, uploadJiraFile, clearError } = useJiraUpload();
  
  const [createCompanyMutation, { loading: creating, error: createError }] = useMutation(CREATE_COMPANY, {
    onCompleted: async (data) => {
      console.log('Company created:', data.createCompany);
      
      // If we have a file to upload, do that next
      if (uploadFile && createAndUpload) {
        try {
          await uploadJiraFile(uploadFile, data.createCompany.id);
          // Navigate to the new company page after successful upload
          router.push(paths.company(data.createCompany.slug));
        } catch (error) {
          console.error('Upload failed after company creation:', error);
          // Still navigate to company page even if upload fails
          router.push(paths.company(data.createCompany.slug));
        }
      } else {
        // Navigate to the new company page
        router.push(paths.company(data.createCompany.slug));
      }
      
      // Close modal and call success callback
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error('Company creation failed:', error);
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadFile(file || null);
    setCreateAndUpload(!!file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    // Create a slug from the company name
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    await createCompanyMutation({
      variables: {
        name: formData.name.trim(),
        slug,
        description: formData.description.trim() || undefined,
        website: formData.website.trim() || undefined,
      }
    });
  };

  const handleClose = () => {
    if (!creating && !uploading) {
      setFormData({ name: '', description: '', website: '' });
      setUploadFile(null);
      setCreateAndUpload(false);
      clearError();
      onClose();
    }
  };

  if (!isOpen) return null;

  const isProcessing = creating || uploading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Building2 className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Create New Company</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Company Name */}
          <div className="mb-4">
            <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              id="company-name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-gray-900 placeholder-gray-500"
              placeholder="Enter company name"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label htmlFor="company-description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="company-description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              disabled={isProcessing}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 resize-none text-gray-900 placeholder-gray-500"
              placeholder="Optional company description"
            />
          </div>

          {/* Website */}
          <div className="mb-6">
            <label htmlFor="company-website" className="block text-sm font-medium text-gray-700 mb-2">
              Website
            </label>
            <input
              id="company-website"
              name="website"
              type="url"
              value={formData.website}
              onChange={handleInputChange}
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-gray-900 placeholder-gray-500"
              placeholder="https://example.com"
            />
          </div>

          {/* Optional JIRA Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initial JIRA Data (Optional)
            </label>
            <label
              className={`
                flex flex-col items-center justify-center w-full h-24 
                border-2 border-dashed rounded-lg cursor-pointer
                transition-colors
                ${!isProcessing
                  ? 'border-gray-300 bg-gray-50 hover:bg-gray-100' 
                  : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                }
              `}
            >
              <div className="flex flex-col items-center justify-center pt-2 pb-3">
                <Upload className={`w-6 h-6 mb-2 ${!isProcessing ? 'text-gray-500' : 'text-gray-300'}`} />
                <p className={`text-sm ${!isProcessing ? 'text-gray-500' : 'text-gray-400'}`}>
                  {uploadFile ? uploadFile.name : 'Click to upload JIRA data (JSON)'}
                </p>
                {uploadFile && (
                  <p className="text-xs text-green-600 mt-1">
                    Will upload after company creation
                  </p>
                )}
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                disabled={isProcessing}
                className="hidden"
              />
            </label>
          </div>

          {/* Progress Display */}
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
          {(createError || uploadError) && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm">
                {uploadError || createError?.message || 'An error occurred'}
              </p>
              <button
                type="button"
                onClick={clearError}
                className="mt-2 text-red-600 underline text-sm hover:text-red-800"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || isProcessing}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {uploadFile ? 'Create & Upload' : 'Create Company'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCompanyModal;