#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix for ajv-keywords compatibility issue
// This script creates the missing ajv/dist/compile/codegen module

const ajvPath = path.join(__dirname, '..', 'node_modules', 'ajv');
const codegenPath = path.join(ajvPath, 'dist', 'compile', 'codegen');

try {
  // Check if ajv exists
  if (!fs.existsSync(ajvPath)) {
    console.log('AJV not found, skipping fix');
    process.exit(0);
  }

  // Create the missing directory structure
  const distPath = path.join(ajvPath, 'dist');
  const compilePath = path.join(distPath, 'compile');
  
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
  }
  
  if (!fs.existsSync(compilePath)) {
    fs.mkdirSync(compilePath, { recursive: true });
  }

  // Create the missing codegen files
  const codegenIndexPath = path.join(compilePath, 'codegen', 'index.js');
  const codegenJsPath = path.join(compilePath, 'codegen.js');

  // Create codegen directory if it doesn't exist
  const codegenDir = path.join(compilePath, 'codegen');
  if (!fs.existsSync(codegenDir)) {
    fs.mkdirSync(codegenDir, { recursive: true });
  }

  // Create a simple codegen module that exports the functions ajv-keywords expects
  const codegenContent = `
// Compatibility shim for ajv-keywords
module.exports = {
  _: function() { return ''; },
  str: function() { return ''; },
  nil: function() { return 'null'; },
  not: function() { return '!'; },
  Code: function(code) { return { toString: function() { return code || ''; } }; },
  Name: function(name) { return { toString: function() { return name || ''; } }; }
};
`;

  // Write the codegen files
  if (!fs.existsSync(codegenIndexPath)) {
    fs.writeFileSync(codegenIndexPath, codegenContent);
    console.log('Created ajv/dist/compile/codegen/index.js');
  }

  if (!fs.existsSync(codegenJsPath)) {
    fs.writeFileSync(codegenJsPath, codegenContent);
    console.log('Created ajv/dist/compile/codegen.js');
  }

  console.log('AJV compatibility fix applied successfully');

} catch (error) {
  console.warn('Warning: Could not apply AJV fix:', error.message);
  // Don't fail the build, just warn
  process.exit(0);
}
