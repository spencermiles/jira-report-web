# Jira Report Web

A modern full-stack application for analyzing JIRA data with detailed cycle time metrics, featuring a Next.js frontend, GraphQL API, and PostgreSQL database.

## Features

### 📊 **JIRA Data Analysis**
- Import JIRA exports via CLI or web interface
- Multi-project support with custom workflow mappings
- Real-time cycle time calculations using PostgreSQL views
- Statistical analysis with median, mean, range, and standard deviation

### ⏱️ **Advanced Metrics**
- **Lead Time**: Total time from creation to completion
- **Cycle Time**: Active development time
- **Stage-specific Times**: Grooming, development, QA, review times
- **Flow Efficiency**: Ratio of active work to wait time
- **First Time Through**: Success rate without rework

### 🔄 **Process Insights**
- Review and QA churn tracking
- Blocker analysis and impact measurement
- Sprint performance analysis
- Defect resolution time by priority

### 🏗️ **Modern Architecture**
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: GraphQL API with Apollo Server
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Vercel-optimized with serverless functions
- **CLI Tools**: Direct data import from JIRA exports

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Data Import (CLI)

Import JIRA data directly from JSON files:

```bash
# Basic import
npm run import path/to/jira-export.json

# Advanced options
npm run import data/export.json \
  --project "WEBAPP" \
  --name "Web Application" \
  --workflow-config custom-workflow.json \
  --verbose

# Generate workflow config template
npm run import generate-workflow-config --output my-workflow.json
```

See [CLI_IMPORT_GUIDE.md](CLI_IMPORT_GUIDE.md) for detailed usage instructions.

### Database Setup

1. **Setup Vercel Postgres**:
   ```bash
   # See DEPLOYMENT.md for detailed setup instructions
   vercel env pull .env.local
   npm run db:push
   ```

2. **Test GraphQL API**:
   - Visit `http://localhost:3000/api/graphql` 
   - Run sample queries to verify data import

### Web Interface

1. **View Projects**: Browse imported projects and their metrics
2. **Filter Data**: Use advanced filtering by dates, priorities, types
3. **Analyze Metrics**: View cycle times, flow efficiency, and trends
4. **Export Reports**: Generate insights and performance reports

### Supported Metrics

- **Lead Time**: Time from first "Draft" status to final "Done" status
- **Grooming Time**: Time from "Ready for Grooming" to "In Progress"
- **Dev Time**: Time from "In Progress" to "In QA"
- **QA Time**: Time from "In QA" to "Done"
- **Review Churn**: Number of times a story entered "In Review"
- **QA Churn**: Number of times a story entered "In QA"
- **Blockers**: Number of times a story was marked as blocked

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── app/                           # Next.js App Router pages
│   ├── page.tsx                  # Main JIRA Report page
│   ├── layout.tsx                # Root layout with auth provider
│   └── globals.css               # Global styles
├── components/                   # Reusable React components
│   └── jira-story-report.tsx    # Main JIRA analysis component
├── contexts/                     # React context providers
│   └── auth-context.tsx         # Authentication context
├── hooks/                        # Custom React hooks
├── lib/                          # Library code and configurations
│   └── paths.ts                 # Centralized route definitions
├── types/                        # TypeScript type definitions
│   ├── index.ts                 # General type definitions
│   └── jira.ts                  # JIRA-specific type definitions
└── utils/                        # Utility functions
    └── api.ts                   # API utility functions
```

## Deployment

### Vercel (Recommended)

This app is optimized for Vercel deployment:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically on every push

Or use the Vercel CLI:

```bash
npx vercel
```

### Other Platforms

The app can be deployed to any platform that supports Next.js:

- Netlify
- Railway
- AWS Amplify
- DigitalOcean App Platform

## Configuration

- Centralized routes in `src/lib/paths.ts`
- Auth context in `src/contexts/auth-context.tsx`
- API utilities in `src/utils/api.ts`
- Type definitions in `src/types/index.ts`

## Environment Variables

Create a `.env.local` file for environment variables:

```env
# Add your environment variables here
NEXT_PUBLIC_API_URL=https://api.example.com
```

## Contributing

1. Follow the existing code style
2. Use kebab-case for new files
3. Never remove existing commented code or console.logs
4. Use the `useAuth` hook for authentication
5. Centralize routes in `src/lib/paths.ts`
