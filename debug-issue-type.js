#!/usr/bin/env node

// Debug script to test issue_type import problem
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function debugIssueType() {
  try {
    // Get a sample issue from the database
    const issue = await prisma.issue.findFirst({
      select: {
        key: true,
        issueType: true,
        rawData: true
      }
    });
    
    if (issue) {
      console.log('Database issue_type:', issue.issueType);
      console.log('Raw JSON issue_type:', issue.rawData.issue_type);
      console.log('Raw data keys:', Object.keys(issue.rawData));
      console.log('Full raw data (first 500 chars):', JSON.stringify(issue.rawData).substring(0, 500));
      
      // Test if the issue_type field exists and what it contains
      if ('issue_type' in issue.rawData) {
        console.log('issue_type field exists in raw data');
        console.log('Value type:', typeof issue.rawData.issue_type);
        console.log('Value:', JSON.stringify(issue.rawData.issue_type));
      } else {
        console.log('issue_type field NOT found in raw data');
      }
    } else {
      console.log('No issues found in database');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugIssueType();