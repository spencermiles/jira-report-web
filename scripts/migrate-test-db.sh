#!/bin/bash

# Script to run migrations against the test database
# This ensures the test database schema stays in sync with development

echo "Running migrations against test database..."
DATABASE_URL="postgresql://velocityiq:zfjled@localhost:5432/velocityiq_test" npx prisma migrate deploy

echo "Test database migrations completed successfully."