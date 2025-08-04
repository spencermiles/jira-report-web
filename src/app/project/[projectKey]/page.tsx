import JiraIssueReport from '@/components/jira-report';

interface ProjectPageProps {
  params: Promise<{
    projectKey: string;
  }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const resolvedParams = await params;
  const decodedProjectKey = decodeURIComponent(resolvedParams.projectKey);
  
  return <JiraIssueReport preselectedProjectKey={decodedProjectKey} />;
}