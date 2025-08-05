import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import { typeDefs } from '@/lib/graphql/schema';
import { resolvers } from '@/lib/graphql/resolvers';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  // Enable GraphQL Playground in development
  introspection: process.env.NODE_ENV !== 'production',
});

const handler = startServerAndCreateNextHandler<NextRequest>(server, {
  context: async (req) => ({ req }),
});

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}