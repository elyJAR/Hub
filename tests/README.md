# Hub Testing Guide

This directory contains all tests for the Hub application.

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests (Playwright)
│   ├── join-flow.spec.ts
│   ├── user-presence.spec.ts
│   ├── connection-requests.spec.ts
│   └── messaging.spec.ts
├── unit/                   # Unit tests (Jest)
│   └── session-manager.test.ts
└── README.md              # This file
```

## Running Tests

### Unit Tests (Jest)
```bash
# Run all unit tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### E2E Tests (Playwright)
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode (step through tests)
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

### Run All Tests
```bash
npm run test:all
```

## Writing Tests

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Expected Text')).toBeVisible()
  })
})
```

### Unit Test Example
```typescript
import { describe, it, expect } from '@jest/globals'

describe('FunctionName', () => {
  it('should return expected value', () => {
    const result = functionName(input)
    expect(result).toBe(expected)
  })
})
```

## Test Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **E2E Tests**: All critical user flows
- **Integration Tests**: All WebSocket message types

## Critical Test Scenarios

### Must Pass Before Release
1. ✅ User can join with valid display name
2. ✅ Users can see each other in the user list
3. ✅ Connection requests can be sent and accepted
4. ✅ Messages can be sent and received
5. ✅ Typing indicators work correctly
6. ✅ Session persists across page reload
7. ✅ Users are removed from list on disconnect

### Browser Compatibility
Tests run on:
- Chrome (Desktop & Mobile)
- Firefox (Desktop)
- Safari (Desktop & Mobile)
- Edge (Desktop)

## Debugging Failed Tests

### View Test Report
```bash
npm run test:e2e:report
```

### Run Specific Test
```bash
npx playwright test tests/e2e/messaging.spec.ts
```

### Run in Debug Mode
```bash
npm run test:e2e:debug
```

### View Test Artifacts
- Screenshots: `test-results/`
- Videos: `test-results/`
- Traces: `test-results/`
- HTML Report: `playwright-report/`

## CI/CD Integration

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request
- Before deployment

See `.github/workflows/test.yml` for CI configuration.

## Performance Benchmarks

### Target Metrics
- Page load: < 3 seconds
- Message delivery: < 200ms
- Connection setup: < 2 seconds
- WebSocket reconnect: < 5 seconds

## Known Issues

None currently. Report issues at: https://github.com/elyJAR/Hub/issues

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Add test coverage for edge cases
4. Update this README if needed

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
