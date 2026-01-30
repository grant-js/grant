#!/bin/bash
# Test script to verify package can be installed and basic imports work
# This simulates a fresh installation in a clean environment

set -e

echo "🧪 Testing @grantjs/client package installation..."

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo "📦 Creating test project..."
npm init -y > /dev/null 2>&1

echo "📥 Installing package from local build..."
# Install from the built package
PACKAGE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
npm install "$PACKAGE_DIR/packages/@grantjs/client" --no-save

echo "✅ Package installed successfully"

echo "🔍 Testing imports..."
# Test basic imports
node -e "
const { GrantClient } = require('@grantjs/client');
console.log('✅ GrantClient imported successfully');

// Test that it can be instantiated
const client = new GrantClient({ apiUrl: 'https://api.example.com' });
console.log('✅ GrantClient instantiated successfully');
"

# Test React imports if React is available
if npm list react 2>/dev/null | grep -q react; then
  echo "🔍 Testing React imports..."
  node -e "
  const { GrantProvider, useGrant } = require('@grantjs/client/react');
  console.log('✅ React exports imported successfully');
  "
else
  echo "⚠️  React not installed, skipping React import test"
fi

echo "🧹 Cleaning up..."
cd - > /dev/null
rm -rf "$TEMP_DIR"

echo "✅ All installation tests passed!"
