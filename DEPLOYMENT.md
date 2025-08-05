# Deployment Guide for Vercel + Postgres

This guide covers deploying your JIRA Report Web application to Vercel with PostgreSQL.

## Prerequisites

- Vercel account
- Your application committed to a Git repository (GitHub/GitLab/Bitbucket)

## 1. Setup Vercel Postgres

1. **Connect your repository to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Click "New Project" and import your repository

2. **Add Postgres Database**
   - In your Vercel project dashboard, go to the "Storage" tab
   - Click "Create Database" 
   - Select "Postgres"
   - Choose a database name (e.g., `jira-report-db`)
   - Select your preferred region
   - Click "Create"

3. **Environment Variables**
   - Vercel will automatically create these environment variables:
     - `POSTGRES_URL`
     - `POSTGRES_PRISMA_URL` 
     - `POSTGRES_URL_NON_POOLING`
     - `POSTGRES_USER`
     - `POSTGRES_HOST` 
     - `POSTGRES_PASSWORD`
     - `POSTGRES_DATABASE`

## 2. Configure Build Settings

In your Vercel project settings:

1. **Build Command**: `npm run build`
2. **Install Command**: `npm install`
3. **Output Directory**: `.next` (default)

## 3. Database Migration

After deployment, you need to initialize your database:

### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Link your project
vercel link

# Run database migration
vercel env pull .env.local
npm run db:push
```

### Option B: Using Prisma Studio (for manual setup)

1. Install dependencies locally:
   ```bash
   npm install
   ```

2. Pull environment variables:
   ```bash
   vercel env pull .env.local
   ```

3. Push database schema:
   ```bash
   npm run db:push
   ```

## 5. Development Workflow

### Local Development with Vercel Postgres

1. **Pull environment variables**:
   ```bash
   vercel env pull .env.local
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Database operations**:
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema changes
   npm run db:push
   
   # View data in Prisma Studio
   npx prisma studio
   ```

### Making Schema Changes

1. **Update** `prisma/schema.prisma`
2. **Push changes** to development:
   ```bash
   npm run db:push
   ```
3. **Generate migration** for production:
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```
4. **Deploy** to Vercel (migrations run automatically via `postinstall`)

## 6. Monitoring & Troubleshooting

### View Logs
- **Vercel Dashboard**: Functions tab shows serverless function logs
- **Local Development**: Check terminal output

### Common Issues

1. **Database Connection Errors**
   - Verify environment variables are set
   - Check Vercel Postgres status in dashboard

2. **Migration Failures**
   - Ensure Prisma client is generated: `npm run db:generate`
   - Check database schema compatibility

3. **GraphQL Errors**
   - Visit `/api/graphql` to test queries
   - Check Vercel function logs for detailed errors

### Performance Optimization

1. **Database Queries**
   - Monitor query performance in Vercel Analytics
   - Use database views for complex calculations
   - Add indexes for frequently queried fields

2. **Serverless Function Limits**
   - Vercel functions have 10s timeout (hobby) / 60s (pro)
   - Consider pagination for large datasets
   - Use database views to pre-compute expensive aggregations

## 7. Production Checklist

- [ ] Database schema deployed
- [ ] Environment variables configured
- [ ] Sample data migrated successfully
- [ ] GraphQL endpoint accessible
- [ ] All queries return expected data
- [ ] No console errors in browser
- [ ] Performance acceptable for expected data size

## 8. Scaling Considerations

As your data grows:

1. **Database Performance**
   - Monitor query execution times
   - Add additional indexes as needed
   - Consider database connection pooling settings

2. **Serverless Function Optimization**
   - Implement pagination for large datasets
   - Use database views for complex aggregations
   - Consider caching for frequently accessed data

3. **Upgrade Options**
   - Vercel Pro for longer function timeouts
   - Vercel Postgres Pro for larger databases
   - Consider Redis for caching if needed