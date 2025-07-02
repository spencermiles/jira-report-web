# Jira Report Web

A modern Next.js application for analyzing JIRA story reports with detailed cycle time metrics.

## Features

- 📊 **JIRA Story Analysis**: Upload JSON exports from JIRA to analyze story performance
- ⏱️ **Cycle Time Metrics**: Calculate lead time, grooming time, dev time, and QA time
- 📈 **Statistical Summary**: View median, mean, range, and standard deviation for all metrics
- 🔄 **Churn Tracking**: Monitor review and QA churn counts
- 🚫 **Blocker Analysis**: Track blocked status occurrences
- 📅 **Timeline Tracking**: See when stories moved through each status
- 🎨 **Modern UI**: Beautiful, responsive interface built with Tailwind CSS
- ⚡ Next.js 15 with App Router
- 📝 TypeScript for complete type safety
- 🧹 ESLint for code quality
- 🔐 Auth context ready for authentication
- 🛠️ Utility functions and API helpers
- 📁 Well-organized project structure

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

1. **Export JIRA Data**: Export your JIRA issues as JSON from your JIRA instance
2. **Upload File**: Use the file upload interface to select your JSON export
3. **View Analysis**: The app will automatically process stories and display:
   - Summary statistics for cycle times
   - Detailed story-by-story breakdown
   - Interactive sorting by any column
   - Tooltips explaining each metric

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
