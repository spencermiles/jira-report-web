// Load test environment variables before Jest runs
require('dotenv').config({ path: '.env.test' });

// Override NODE_ENV to ensure test environment
process.env.NODE_ENV = 'test';