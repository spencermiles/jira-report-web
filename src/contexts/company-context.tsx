'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Company {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CompanyContextType {
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

interface CompanyProviderProps {
  children: ReactNode;
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const value: CompanyContextType = {
    currentCompany,
    setCurrentCompany,
    isLoading,
    setIsLoading,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export const useCurrentCompany = (): Company | null => {
  const { currentCompany } = useCompany();
  return currentCompany;
};

export const useCurrentCompanyId = (): string | null => {
  const { currentCompany } = useCompany();
  return currentCompany?.id || null;
};