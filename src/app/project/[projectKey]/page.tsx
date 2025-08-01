import JiraIssueReport from '@/components/jira-report';

interface ProjectPageProps {
  params: Promise<{
    projectKey: string;
  }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const resolvedParams = await params;
  const decodedProjectKey = decodeURIComponent(resolvedParams.projectKey);
  
  console.log('ProjectPage rendered with:', { 
    projectKey: resolvedParams.projectKey, 
    decodedProjectKey 
  });
  
  return (
    <div>
      {/* Debug info - remove after fixing */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        right: 0, 
        background: 'red', 
        color: 'white', 
        padding: '10px', 
        zIndex: 9999,
        fontSize: '12px'
      }}>
        PROJECT PAGE: {decodedProjectKey}
      </div>
      <JiraIssueReport preselectedProjectKey={decodedProjectKey} />
    </div>
  );
}