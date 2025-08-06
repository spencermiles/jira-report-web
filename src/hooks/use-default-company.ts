'use client';

import { useQuery } from '@apollo/client';
import { GET_COMPANY } from '@/lib/graphql/queries';

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

export const useDefaultCompany = () => {
  return useQuery<{ company: Company }>(GET_COMPANY, {
    variables: { slug: 'default-organization' },
    errorPolicy: 'ignore', // Don't throw errors if default company doesn't exist
  });
};

export const useDefaultCompanyId = (): string | null => {
  const { data } = useDefaultCompany();
  return data?.company?.id || null;
};