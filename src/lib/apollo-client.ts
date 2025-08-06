import { ApolloClient, InMemoryCache, ApolloLink, createHttpLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

// Create an HTTP link
const httpLink = createHttpLink({
  uri: '/api/graphql',
  credentials: 'same-origin',
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
        extensions
      );
      
      // Handle specific error codes
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Redirect to login or refresh token
        console.log('User is not authenticated');
      }
      
      if (extensions?.code === 'RATE_LIMIT_EXCEEDED') {
        console.warn('Rate limit exceeded, retrying after delay...');
        // Could implement retry logic here
      }
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    
    // Handle offline scenarios
    if (!navigator.onLine) {
      console.log('User is offline');
    }
  }
});

// Create Apollo Client instance
const createApolloClient = () => {
  return new ApolloClient({
    link: ApolloLink.from([errorLink, httpLink]),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            // Merge paginated issues results
            issues: {
              keyArgs: ['filters'],
              merge(existing, incoming, { args }) {
                if (!args?.pagination?.offset || args.pagination.offset === 0) {
                  // First page, replace everything
                  return incoming;
                }
                
                // Merge paginated results
                return {
                  ...incoming,
                  issues: [...(existing?.issues || []), ...incoming.issues],
                };
              },
            },
            
            // Merge project summaries
            projectSummaries: {
              keyArgs: ['filters'],
              merge(existing, incoming, { args }) {
                if (!args?.pagination?.offset || args.pagination.offset === 0) {
                  return incoming;
                }
                
                return {
                  ...incoming,
                  projects: [...(existing?.projects || []), ...incoming.projects],
                };
              },
            },
          },
        },
        
        Project: {
          fields: {
            // Cache issues separately by project
            issues: {
              merge(existing = [], incoming: any[]) {
                return incoming;
              },
            },
          },
        },
        
        Issue: {
          keyFields: ['id'],
          fields: {
            // Ensure metrics are always fresh
            metrics: {
              merge(existing, incoming) {
                return incoming;
              },
            },
          },
        },
        
        IssueMetrics: {
          keyFields: false, // Metrics don't have their own ID
        },
        
        ProjectMetrics: {
          keyFields: false, // Metrics don't have their own ID
        },
      },
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        errorPolicy: 'all',
      },
      query: {
        fetchPolicy: 'cache-first',
        errorPolicy: 'all',
      },
    },
  });
};

// Export a function to create the client
// This allows for SSR compatibility
export default createApolloClient;