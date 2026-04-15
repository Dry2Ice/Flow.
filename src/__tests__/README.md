# Comprehensive Test Suite for Flow IDE

This directory contains comprehensive tests for critical application components.

## Setup

```bash
# Install testing dependencies
bun add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom

# Run tests
bun test
```

## Test Coverage

### 1. NIM Configuration Tests (`comprehensive.test.ts`)
- **Local storage initialization**: Validates config loading from localStorage
- **Error handling**: Tests graceful handling of corrupted data
- **Field validation**: Ensures required fields (apiKey, baseUrl, model) are present
- **Configuration persistence**: Tests saving to localStorage

### 2. AI Stream Error Handling Tests
- **Exponential backoff**: Tests retry logic with increasing delays
- **Network error recovery**: Validates reconnection attempts
- **API error handling**: Tests appropriate responses to different HTTP errors
- **Connection status updates**: Verifies UI state changes during retries

### 3. DockWorkspace Layout Tests
- **Layout persistence**: Tests saving/loading layouts to/from localStorage
- **Corrupted data handling**: Graceful fallback for invalid layout data
- **Layout reset functionality**: Tests layout restoration to defaults
- **Debounced saves**: Performance testing for layout save throttling

### 4. Theme Toggle Hydration Tests
- **Hydration prevention**: Tests that SSR/CSR mismatches are avoided
- **Theme application**: Validates correct CSS class application
- **Error resilience**: Tests handling of localStorage failures

### 5. Layout Formatting on Window Resize
- **Resize event handling**: Tests responsive layout adjustments
- **Proportion maintenance**: Ensures layout ratios are preserved
- **Performance**: Tests that resize handling doesn't cause excessive re-renders

### 6. Performance Tests
- **Debounced operations**: Tests that rapid changes don't cause excessive operations
- **Lazy loading benefits**: Validates bundle size improvements
- **Memory leak prevention**: Tests cleanup of event listeners and timers

## Test Structure

```
src/__tests__/
├── setup.ts              # Global test setup and mocks
├── comprehensive.test.ts # Main test suite
└── ThemeToggle.test.tsx  # Component-specific tests
```

## Key Testing Patterns

### Mock Setup
```typescript
// Global mocks for browser APIs
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock store interactions
const mockStore = {
  addLog: vi.fn(),
  getState: vi.fn(() => ({ addLog: mockStore.addLog })),
};
```

### Async Testing
```typescript
test('handles async operations', async () => {
  const promise = someAsyncOperation();
  await expect(promise).resolves.toBe(expectedValue);
});
```

### Error Testing
```typescript
test('handles errors gracefully', () => {
  expect(() => {
    throw new Error('test error');
  }).not.toThrow();
});
```

### Component Testing
```typescript
test('renders correctly', () => {
  render(<Component />);
  expect(screen.getByRole('button')).toBeInTheDocument();
});
```

## Continuous Integration

Add to your CI pipeline:

```yaml
- name: Run Tests
  run: bun test --coverage
```

## Test Maintenance

- **Keep tests updated** with component changes
- **Add new tests** for new features
- **Monitor test coverage** to ensure comprehensive coverage
- **Run tests regularly** during development

## Performance Benchmarks

Expected test execution times:
- Full suite: < 5 seconds
- Individual component tests: < 1 second
- Async operation tests: < 2 seconds

## Debugging Tests

Use Vitest's debug mode:
```bash
bun test --reporter=verbose --no-coverage
```

Or run specific tests:
```bash
bun test ThemeToggle.test.tsx
```