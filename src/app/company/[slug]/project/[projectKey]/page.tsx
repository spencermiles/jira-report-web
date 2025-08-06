import CompanyProjectReport from '@/components/company/CompanyProjectReport';

interface CompanyProjectPageProps {
  params: Promise<{
    slug: string;
    projectKey: string;
  }>;
}

export default async function CompanyProjectPage({ params }: CompanyProjectPageProps) {
  const resolvedParams = await params;
  const decodedSlug = decodeURIComponent(resolvedParams.slug);
  const decodedProjectKey = decodeURIComponent(resolvedParams.projectKey);
  
  return <CompanyProjectReport companySlug={decodedSlug} projectKey={decodedProjectKey} />;
}