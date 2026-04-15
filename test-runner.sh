#!/usr/bin/env bash

# Test runner script for Flow IDE
# Run with: ./test-runner.sh

echo "🚀 Running Flow IDE Test Suite"
echo "================================="

# Check if dependencies are installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun not found. Please install Bun first."
    exit 1
fi

# Install testing dependencies if not present
echo "📦 Installing testing dependencies..."
bun add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom

# Run type checking first
echo "🔍 Running TypeScript checks..."
bun typecheck
if [ $? -ne 0 ]; then
    echo "❌ TypeScript errors found. Please fix before running tests."
    exit 1
fi

# Run ESLint
echo "🎨 Running ESLint..."
bun lint
if [ $? -ne 0 ]; then
    echo "⚠️  ESLint warnings found. Consider fixing for better code quality."
fi

# Run tests
echo "🧪 Running tests..."
bun test --run --reporter=verbose

if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed. Please check the output above."
    exit 1
fi

echo "🎉 Test suite completed successfully!"