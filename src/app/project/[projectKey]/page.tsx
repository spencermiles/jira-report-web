import JiraIssueReport from '@/components/jira-report';

interface ProjectPageProps {
  params: Promise<{
    projectKey: string;
  }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const resolvedParams = await params;
  return <JiraIssueReport preselectedProjectKey={decodeURIComponent(resolvedParams.projectKey)} />;
}