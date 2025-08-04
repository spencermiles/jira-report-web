interface ProjectPageProps {
  params: Promise<{
    projectKey: string;
  }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const resolvedParams = await params;
  const decodedProjectKey = decodeURIComponent(resolvedParams.projectKey);
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'red', 
      color: 'white', 
      padding: '50px',
      fontSize: '24px',
      textAlign: 'center'
    }}>
      <h1>🔥 DYNAMIC ROUTE WORKS! 🔥</h1>
      <p>Project Key: {decodedProjectKey}</p>
      <p>If you see this, the dynamic route is working correctly.</p>
    </div>
  );
}