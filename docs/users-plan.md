# User Management, Authentication, Roles & ACLs Plan for VelocityIQ

## Overview
Add comprehensive user management, authentication, role-based access control (RBAC), and fine-grained access control lists (ACLs) to the existing multi-tenant JIRA analytics platform. This system will control access at company and project levels with different roles and permissions.

## 1. Authentication Strategy

### Authentication Method: JWT + Session-based Hybrid
- **JWT tokens** for API access (GraphQL, stateless)
- **HTTP-only secure cookies** for web sessions
- **Refresh tokens** stored securely for token rotation
- **Multi-factor authentication (MFA)** support for admin users

### Session Management
- Session storage in database for audit trails and revocation
- Configurable session timeouts per company
- Device tracking and management
- Concurrent session limits per user role

## 2. Database Schema Changes

### New Tables:

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- bcrypt hashed
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  is_email_verified BOOLEAN DEFAULT false,
  email_verification_token UUID,
  password_reset_token UUID,
  password_reset_expires TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked_until TIMESTAMPTZ,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(32), -- TOTP secret
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  settings JSONB DEFAULT '{}', -- User preferences
  is_active BOOLEAN DEFAULT true
);
```

#### user_sessions
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  refresh_token VARCHAR(255) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB, -- Browser, OS, etc.
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_accessed TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);
```

#### user_companies (Many-to-Many with Roles)
```sql
CREATE TABLE user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role company_role NOT NULL, -- ENUM: 'owner', 'admin', 'member', 'viewer'
  permissions JSONB DEFAULT '[]', -- Array of specific permissions
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, company_id)
);
```

#### user_projects (Project-level ACLs)
```sql
CREATE TABLE user_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role project_role NOT NULL, -- ENUM: 'lead', 'contributor', 'viewer'
  permissions JSONB DEFAULT '[]', -- Granular permissions
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- Optional expiry
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, project_id),
  -- Ensure project belongs to same company as user's company membership
  FOREIGN KEY (company_id) REFERENCES companies(id)
);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  project_id INTEGER REFERENCES projects(id),
  action VARCHAR(100) NOT NULL, -- 'login', 'view_project', 'export_data', etc.
  resource_type VARCHAR(50), -- 'company', 'project', 'issue', etc.
  resource_id VARCHAR(100), -- ID of the accessed resource
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}', -- Additional context
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Indexes for performance
  INDEX idx_audit_logs_user_id ON audit_logs(user_id),
  INDEX idx_audit_logs_company_id ON audit_logs(company_id),
  INDEX idx_audit_logs_created_at ON audit_logs(created_at),
  INDEX idx_audit_logs_action ON audit_logs(action)
);
```

### Schema Modifications:

#### companies table additions:
```sql
ALTER TABLE companies ADD COLUMN owner_id UUID REFERENCES users(id);
ALTER TABLE companies ADD COLUMN settings JSONB DEFAULT '{}'; -- Already exists
-- Add company-level security settings:
-- - MFA requirement
-- - Session timeout
-- - IP restrictions
-- - Data retention policies
```

## 3. Role-Based Access Control (RBAC)

### Company Roles & Permissions:

#### OWNER
- **Full control** over company and all projects
- **User management**: invite, remove, change roles
- **Billing and subscription** management
- **Company settings** and configuration
- **Data export** and backup
- **Audit log** access
- **Delete company**

#### ADMIN  
- **Project management**: create, delete, configure projects
- **User management**: invite users, assign project roles (cannot modify owners)
- **Company-wide analytics** access
- **Workflow mapping** configuration
- **Data import** (JIRA uploads)
- **Audit log** access (limited to projects they manage)

#### MEMBER
- **Project access** based on project-level permissions
- **Read analytics** for assigned projects
- **Upload JIRA data** to assigned projects
- **Basic profile** management
- Cannot invite users or modify company settings

#### VIEWER
- **Read-only access** to assigned projects
- **View analytics** and reports
- **Export reports** (if enabled)
- Cannot modify any data or settings

### Project Roles & Permissions:

#### LEAD
- **Full control** over project data and configuration
- **User assignment**: add/remove users from project
- **Workflow configuration** for the project
- **Data management**: upload, delete project data
- **Analytics access**: all project metrics and exports

#### CONTRIBUTOR  
- **Read/write access** to project data
- **Upload JIRA data** to the project
- **Analytics access**: view all project metrics
- **Export data** from the project
- Cannot manage users or project configuration

#### VIEWER
- **Read-only access** to project data
- **Analytics viewing**: basic metrics and dashboards
- **Limited exports** (summary reports only)
- Cannot modify data or settings

## 4. Fine-Grained Permissions System

### Permission Categories:

#### Company Permissions:
- `company:read` - View company information
- `company:edit` - Modify company settings
- `company:delete` - Delete company
- `company:invite_users` - Invite new users
- `company:manage_users` - Modify user roles and permissions
- `company:view_audit` - Access audit logs
- `company:export_data` - Export company-wide data
- `company:manage_billing` - Access billing and subscription

#### Project Permissions:
- `project:read` - View project information and basic metrics
- `project:edit` - Modify project settings
- `project:delete` - Delete project
- `project:upload_data` - Upload JIRA data
- `project:manage_users` - Assign users to project
- `project:view_analytics` - Access detailed analytics
- `project:export_data` - Export project data
- `project:configure_workflows` - Manage workflow mappings

#### Issue Permissions:
- `issue:read` - View individual issues
- `issue:export` - Export issue data
- `issue:view_history` - Access status change history
- `issue:view_metrics` - Access calculated metrics (cycle time, etc.)

### Permission Inheritance:
- **Company roles** grant baseline permissions
- **Project roles** can add additional permissions
- **Explicit denials** can restrict inherited permissions
- **Owner role** bypasses all restrictions

## 5. Authentication Implementation

### Backend Authentication Service:

#### src/lib/auth/
```
auth/
├── auth-service.ts          # Main authentication logic
├── password-service.ts      # Password hashing/validation
├── jwt-service.ts          # JWT token management
├── session-service.ts      # Session management
├── mfa-service.ts          # Multi-factor authentication
├── permission-service.ts   # Permission checking
└── audit-service.ts       # Audit logging
```

#### Key Authentication Functions:
```typescript
// auth-service.ts
export class AuthService {
  async register(email: string, password: string, firstName: string, lastName: string): Promise<User>
  async login(email: string, password: string, mfaCode?: string): Promise<AuthResult>
  async logout(sessionToken: string): Promise<void>
  async refreshToken(refreshToken: string): Promise<AuthResult>
  async verifyEmail(token: string): Promise<void>
  async requestPasswordReset(email: string): Promise<void>
  async resetPassword(token: string, newPassword: string): Promise<void>
  async enableMFA(userId: string): Promise<{ secret: string; qrCode: string }>
  async verifyMFASetup(userId: string, token: string, secret: string): Promise<void>
}
```

### Frontend Authentication Integration:

#### Enhanced AuthContext:
```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  companies: UserCompanyMembership[];
  activeCompanyId?: string;
  permissions: Permission[];
}

interface UserCompanyMembership {
  companyId: string;
  company: Company;
  role: CompanyRole;
  permissions: string[];
  joinedAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  currentCompany: Company | null;
  
  // Authentication
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  
  // Company management
  switchCompany: (companyId: string) => void;
  hasPermission: (permission: string, companyId?: string, projectId?: number) => boolean;
  hasRole: (role: string, companyId?: string) => boolean;
  
  // MFA
  setupMFA: () => Promise<{ secret: string; qrCode: string }>;
  enableMFA: (token: string) => Promise<void>;
  disableMFA: (password: string) => Promise<void>;
}
```

## 6. GraphQL Schema Changes

### New Types:

```graphql
type User {
  id: ID!
  email: String!
  firstName: String!
  lastName: String!
  avatarUrl: String
  isEmailVerified: Boolean!
  mfaEnabled: Boolean!
  lastLogin: DateTime
  companies: [UserCompanyMembership!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type UserCompanyMembership {
  id: ID!
  user: User!
  company: Company!
  role: CompanyRole!
  permissions: [String!]!
  invitedBy: User
  invitedAt: DateTime
  joinedAt: DateTime
  isActive: Boolean!
}

type UserProjectAccess {
  id: ID!
  user: User!
  project: Project!
  role: ProjectRole!
  permissions: [String!]!
  grantedBy: User
  grantedAt: DateTime!
  expiresAt: DateTime
  isActive: Boolean!
}

enum CompanyRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

enum ProjectRole {
  LEAD
  CONTRIBUTOR
  VIEWER
}

type AuthResult {
  user: User!
  accessToken: String!
  refreshToken: String!
  expiresIn: Int!
}
```

### New Mutations:

```graphql
type Mutation {
  # Authentication
  register(input: RegisterInput!): AuthResult!
  login(input: LoginInput!): AuthResult!
  logout: Boolean!
  refreshToken: AuthResult!
  
  # Email verification
  verifyEmail(token: String!): Boolean!
  requestPasswordReset(email: String!): Boolean!
  resetPassword(input: ResetPasswordInput!): Boolean!
  
  # MFA
  setupMFA: MFASetupResult!
  enableMFA(token: String!): Boolean!
  disableMFA(password: String!): Boolean!
  
  # User management (company admins+)
  inviteUser(companyId: ID!, input: InviteUserInput!): UserCompanyMembership!
  updateUserRole(membershipId: ID!, role: CompanyRole!, permissions: [String!]): UserCompanyMembership!
  removeUserFromCompany(membershipId: ID!): Boolean!
  
  # Project access management
  grantProjectAccess(input: GrantProjectAccessInput!): UserProjectAccess!
  updateProjectAccess(accessId: ID!, role: ProjectRole!, permissions: [String!]): UserProjectAccess!
  revokeProjectAccess(accessId: ID!): Boolean!
  
  # Company management
  createCompany(input: CreateCompanyInput!): Company!
  updateCompany(id: ID!, input: UpdateCompanyInput!): Company!
  deleteCompany(id: ID!): Boolean!
}
```

### Updated Queries with Permission Checking:

```graphql
type Query {
  # Current user context
  me: User
  myCompanies: [UserCompanyMembership!]!
  myPermissions(companyId: ID, projectId: ID): [String!]!
  
  # All existing queries updated with permission checking
  companies(filters: CompanyFilters): [Company!]! # Admin only
  company(id: ID!): Company # Check company membership
  
  # Project queries - check project access
  project(companyId: ID!, key: String!): Project
  projects(companyId: ID!, filters: ProjectFilters): [Project!]!
  
  # Analytics queries - check project permissions  
  cycleTimeDistribution(companyId: ID!, projectKeys: [String!], filters: IssueFilters): [CycleTimeDistributionBucket!]!
  
  # Audit logs (admin+ only)
  auditLogs(companyId: ID!, filters: AuditLogFilters): [AuditLog!]!
}
```

## 7. Permission Middleware & Authorization

### GraphQL Authorization Middleware:

```typescript
// src/lib/graphql/auth-middleware.ts
interface AuthContext {
  user: User | null;
  permissions: PermissionChecker;
  audit: AuditLogger;
}

class PermissionChecker {
  constructor(private user: User | null) {}
  
  hasCompanyAccess(companyId: string): boolean
  hasProjectAccess(projectId: number): boolean
  hasPermission(permission: string, companyId?: string, projectId?: number): boolean
  requirePermission(permission: string, companyId?: string, projectId?: number): void
  requireRole(role: CompanyRole | ProjectRole, companyId?: string, projectId?: number): void
}

// Usage in resolvers:
const projectResolver = {
  async project(_: any, { companyId, key }: any, context: AuthContext) {
    // Check company access
    context.permissions.requireCompanyAccess(companyId);
    
    const project = await getProject(companyId, key);
    
    // Check project-specific permissions
    if (project) {
      context.permissions.requirePermission('project:read', companyId, project.id);
    }
    
    // Audit the access
    context.audit.log('project:accessed', {
      companyId,
      projectId: project.id,
      projectKey: key
    });
    
    return project;
  }
}
```

## 8. UI/UX Changes

### New Pages/Components:

#### Authentication Pages:
- `/login` - Login form with MFA support
- `/register` - Registration form
- `/forgot-password` - Password reset request
- `/reset-password/[token]` - Password reset form
- `/verify-email/[token]` - Email verification
- `/setup-mfa` - MFA setup with QR code

#### User Management:
- `/company/[slug]/users` - Company user management
- `/company/[slug]/users/invite` - Invite new users
- `/company/[slug]/users/[userId]` - User role management
- `/profile` - User profile and settings
- `/profile/security` - Password, MFA settings

#### Project Access Management:
- `/company/[slug]/project/[key]/access` - Project user access
- Component: `UserAccessTable` with role dropdowns
- Component: `PermissionSelector` for granular permissions

### Navigation Updates:

```typescript
// Add user context to navigation
interface NavigationContext {
  user: User;
  currentCompany: Company;
  permissions: string[];
}

// Conditional menu items based on permissions
{hasPermission('company:manage_users') && (
  <MenuItem href={`/company/${company.slug}/users`}>
    Manage Users
  </MenuItem>
)}

{hasRole('ADMIN') && (
  <MenuItem href={`/company/${company.slug}/settings`}>
    Company Settings  
  </MenuItem>
)}
```

## 9. Security Considerations

### Data Protection:
- **Row-Level Security (RLS)**: Database policies to enforce data isolation
- **Input Validation**: Strict validation on all user inputs
- **SQL Injection Prevention**: Use parameterized queries exclusively
- **XSS Protection**: Content Security Policy and output encoding
- **CSRF Protection**: Anti-CSRF tokens for state-changing operations

### Authentication Security:
- **Password Policy**: Minimum 12 characters, complexity requirements
- **Rate Limiting**: Login attempt throttling per IP/user
- **Account Lockout**: Temporary lockout after failed attempts
- **Session Management**: Secure, HTTP-only cookies
- **Token Security**: Short-lived JWT tokens with refresh rotation

### Authorization Security:
- **Principle of Least Privilege**: Users get minimal required permissions
- **Permission Inheritance**: Clear hierarchy and explicit overrides
- **Audit Trail**: Comprehensive logging of all access and changes
- **Regular Review**: Periodic permission audits and cleanup

## 10. Migration Strategy

### Phase 1: Database Schema (Week 1)
1. Create user management tables
2. Add foreign key relationships 
3. Create initial admin user and default company owner

### Phase 2: Authentication System (Week 2)
1. Implement authentication service
2. Build login/register pages
3. Add JWT middleware to GraphQL
4. Update AuthContext with real authentication

### Phase 3: Authorization System (Week 3)
1. Build permission checking system
2. Add authorization to GraphQL resolvers
3. Create user management interfaces
4. Implement audit logging

### Phase 4: Project Access Control (Week 4)
1. Add project-level permissions
2. Build project access management UI
3. Update all analytics queries with permission checks
4. Test multi-user scenarios

### Phase 5: Testing & Security Audit (Week 5)
1. Comprehensive security testing
2. Permission boundary testing
3. Performance testing with multiple users
4. Documentation and training materials

## 11. Technical Implementation Details

### Environment Variables:
```env
# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Password hashing
BCRYPT_ROUNDS=12

# MFA
MFA_ISSUER_NAME=VelocityIQ
MFA_WINDOW=2

# Email (for verification/reset)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@velocityiq.com
SMTP_PASS=your-smtp-password

# Session management
SESSION_SECRET=your-session-secret
SESSION_TIMEOUT=24h
```

### Database Indexes for Performance:
```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- Session management
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);

-- Permission lookups
CREATE INDEX idx_user_companies_user ON user_companies(user_id);
CREATE INDEX idx_user_companies_company ON user_companies(company_id);
CREATE INDEX idx_user_projects_user ON user_projects(user_id);
CREATE INDEX idx_user_projects_project ON user_projects(project_id);

-- Audit performance
CREATE INDEX idx_audit_logs_user_company ON audit_logs(user_id, company_id);
CREATE INDEX idx_audit_logs_timerange ON audit_logs(created_at) WHERE created_at >= NOW() - INTERVAL '90 days';
```

## 12. Testing Strategy

### Unit Tests:
- Authentication service methods
- Permission checking logic
- Password hashing/validation
- JWT token generation/validation
- MFA setup and verification

### Integration Tests:
- User registration/login flow
- Permission enforcement in GraphQL
- Company/project access control
- Audit logging functionality
- Session management

### Security Tests:
- Authentication bypass attempts
- Authorization boundary testing
- SQL injection attack vectors
- XSS payload testing
- CSRF protection validation

### Performance Tests:
- Multi-user concurrent access
- Permission check performance
- Database query optimization
- Session store scalability

## 13. Monitoring & Alerting

### Key Metrics:
- Failed login attempts per user/IP
- Permission denied events
- Session creation/expiry rates
- MFA setup/failure rates
- Company/project access patterns

### Security Alerts:
- Multiple failed login attempts
- Suspicious permission escalation
- Unusual data access patterns
- Account lockouts
- MFA failures

### Audit Requirements:
- All authentication events
- Permission changes
- Data access (company/project level)
- Administrative actions
- User invitations/removals

## 14. Success Criteria

### Functional Requirements:
- ✅ Secure user registration/login with MFA
- ✅ Role-based access control at company level
- ✅ Project-level access control with granular permissions
- ✅ Comprehensive audit logging
- ✅ User management interface for admins
- ✅ Secure session management

### Security Requirements:
- ✅ Data isolation between companies maintained
- ✅ Users can only access authorized data
- ✅ All actions are auditable
- ✅ Authentication tokens are secure
- ✅ Password policies enforced
- ✅ Rate limiting prevents abuse

### Performance Requirements:
- ✅ Permission checks add <50ms to query time
- ✅ Authentication middleware scales to 1000+ concurrent users
- ✅ Database queries remain performant with user filters
- ✅ Session management handles high concurrency

This comprehensive plan provides a robust foundation for user management while maintaining the existing multi-tenant architecture's security and performance characteristics.