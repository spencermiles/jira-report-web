'use client';

import React from 'react';
import ProjectsGraphQL from './ProjectsGraphQL';

/**
 * Projects component that uses GraphQL API exclusively
 */
const ProjectsHybrid: React.FC = () => {
  return (
    <ProjectsGraphQL 
      showUploadButton={true}
    />
  );
};

export default ProjectsHybrid;