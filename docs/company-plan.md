# Multi-Tenant Architecture Requirements for VelocityIQ

## Overview
Convert VelocityIQ from a single-tenant to multi-tenant solution, allowing distinct companies to host their data on the platform with complete data isolation and security.

## 1. Database Schema Changes

### New Tables:

#### companies
- `id` (UUID, primary key)
- `name` (string, required, unique)
- `slug` (string, unique, URL-friendly identifier)
- `description` (text, optional)
- `logo_url` (string, optional)
- `website` (string, optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `settings` (JSONB - for company-specific configurations)
- `is_active` (boolean, default true)

### Schema Modifications:

#### projects
- ADD `company_id` (UUID, foreign key to companies.id, NOT NULL)
- ADD INDEX on `company_id`
- ADD UNIQUE constraint on (`company_id`, `key`) - project keys unique within company

#### issues
- ADD `company_id` (UUID, foreign key to companies.id, NOT NULL)
- ADD INDEX on `company_id`
- Denormalized for query performance

#### issue_metrics
- ADD `company_id` (UUID, foreign key to companies.id, NOT NULL)
- ADD INDEX on `company_id`

## 2. GraphQL API Changes

### New Types:
```graphql
type Company {
  id: ID!
  name: String!
  slug: String!
  description: String
  logoUrl: String
  website: String
  projects: [Project!]!
  projectCount: Int!
  issueCount: Int!
  activeProjects: Int!
  lastActivity: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
  settings: JSON
}
```

### New Queries:
- `companies(limit, offset, search, sortBy)`: List all companies
- `company(id or slug)`: Get single company with projects
- `companyMetrics(companyId!)`: Aggregate metrics for a company

### Modified Queries (All require mandatory companyId):
```graphql
# All existing queries updated to require companyId
projects(companyId: ID!, filters, pagination, sort): [Project!]!
project(companyId: ID!, key: String!): Project
projectWithIssues(companyId: ID!, key: String!, issueFilters): Project
issues(companyId: ID!, filters, pagination, sort): [Issue!]!
issue(companyId: ID!, key: String!): Issue
cycleTimeDistribution(companyId: ID!, projectKeys, filters): CycleTimeDistribution
flowMetricsTrend(companyId: ID!, projectKeys, period, filters): FlowMetricsTrend
dashboardData(companyId: ID!, projectFilters, pagination, trendPeriod): DashboardData
```

### Security Enforcement:
- **All GraphQL resolvers MUST validate companyId parameter**
- **All database queries MUST include company_id in WHERE clause**
- **Future: User permissions will be checked against companyId access**

## 3. UI/UX Changes

### Navigation Hierarchy:
```
/ (Home/Dashboard)
├── /companies (All Companies View)
│   ├── Company Card 1
│   │   ├── Project count
│   │   ├── Issue count
│   │   └── Last activity
│   └── Company Card 2
│
├── /company/:slug (Company Dashboard)
│   ├── Company overview metrics
│   ├── Projects list (existing project cards)
│   └── Aggregate analytics
│
└── /company/:slug/project/:projectKey (Project Detail)
    └── (Existing project detail view)
```

### Projects Page Transformation:
- **Current**: Single projects list
- **New**: Companies list as top-level view
- Each company card displays:
  - Company name & logo
  - Total projects count
  - Active issues count
  - Key metrics summary
  - "View Projects" action
- Click company → Company dashboard with projects
- Global search/filter by company name

## 4. Data Migration Strategy

### Phase 1: Schema Updates
- Create companies table
- Add company_id columns (nullable initially)

### Phase 2: Data Population
- Create default company for existing data ("Default Organization")
- Update all existing records with default company_id

### Phase 3: Enforce Constraints
- Make company_id NOT NULL
- Add foreign key constraints
- Create indexes
- Update all GraphQL resolvers to require companyId

## 5. Security & Access Control

### Current Implementation:
- **Mandatory companyId**: All GraphQL queries require companyId parameter
- **Row-Level Security**: All queries filtered by company_id
- **Data Isolation**: Complete separation between companies

### Future User Management:
- User-company associations (users_companies junction table)
- Role-based access control per company
- JWT tokens include accessible company IDs
- API key scoping to specific companies

## 6. Performance Considerations

### Database Optimization:
- **Indexes**: Composite indexes for (company_id, created_at) on issues
- **Partitioning**: Consider partitioning large tables by company_id
- **Query Patterns**: All queries start with company_id filter

### Application Layer:
- **Caching**: Cache company metadata aggressively
- **Connection Pooling**: Consider per-company connection pools
- **Query Optimization**: Early WHERE clause filtering by company_id

## 7. Backward Compatibility

### Route Management:
- `/projects` → `/companies` (redirect to new companies list)
- `/project/:key` → Auto-detect company and redirect to `/company/:slug/project/:key`
- API versioning for gradual migration

### Data Preservation:
- All existing projects assigned to default company
- Maintain all historical data and metrics
- Preserve project keys within company scope

## 8. Implementation Phases

### ✅ Phase 1: Database & Backend (COMPLETED)
- ✅ Create companies table and migration scripts
- ✅ Update schema with foreign keys and indexes
- ✅ Create GraphQL Company type and basic resolvers
- ✅ Update existing resolvers with mandatory companyId parameter
- ✅ Data migration for existing projects to default company
- ✅ Update database views for multi-tenant architecture
- ✅ Fix company-level weighted average calculations

### ✅ Phase 2: Frontend - Read Operations (COMPLETED)
- ✅ Create companies list page (`/companies`)
- ✅ Create company dashboard (`/company/:slug`)
- ✅ Update navigation and routing system
- ✅ Update existing project views with company context
- ✅ Add company selection context throughout app
- ✅ Create rich project cards with proper company-scoped navigation
- ✅ Implement proper cycle time calculations using database views

### 🚧 Phase 3: Frontend - Write Operations (IN PROGRESS)
- [ ] Update JIRA import workflow to assign company
- [ ] Add company selection in upload flow
- [ ] Update all mutations with company context
- [ ] Create company management interface

### Phase 4: Testing & Polish (Week 4)
- Comprehensive testing of multi-tenant isolation
- Performance testing with multiple companies
- Security audit of data isolation
- Documentation updates
- Deployment and monitoring setup

## 9. Technical Implementation Notes

### GraphQL Resolver Pattern:
```typescript
// All resolvers must follow this pattern
async getProjects(parent, { companyId, filters }, context) {
  // 1. Validate companyId access (future: check user permissions)
  await validateCompanyAccess(context.user, companyId);
  
  // 2. Add companyId to all database queries
  const projects = await db.projects.findMany({
    where: {
      company_id: companyId, // MANDATORY
      ...filters
    }
  });
  
  return projects;
}
```

### Database Query Safety:
- All ORM queries must include `company_id` filter
- Consider database views that automatically filter by company
- Add database-level row security policies as secondary defense

### Frontend State Management:
- Global company context in React
- Company ID passed to all GraphQL operations
- URL structure reflects company scope

## 10. Questions for Review

1. **Company Identification**: Using slugs in URLs for SEO-friendly routes - agreed?
2. **Default Company**: Create "Default Organization" for existing data - confirmed?
3. **Project Keys**: Project keys unique per company (not globally) - correct?
4. **GraphQL Security**: Mandatory companyId on all queries - this enforces future user permissions?
5. **Company Creation**: Manual creation initially, automatic on JIRA import later?
6. **Metrics Calculation**: Real-time for company-level metrics or materialized views?

## Success Criteria

- ✅ Complete data isolation between companies
- ✅ All existing functionality preserved within company scope
- ✅ Scalable architecture for adding user management
- ✅ Performant queries with proper indexing
- ✅ Intuitive UI that makes company context clear
- ✅ Zero data loss during migration
- ✅ Security audit passing for multi-tenant requirements