# Self Service Report System

A robust reporting system with Sybase integration, featuring user authentication, query management, and comprehensive audit logging.

## Testing Documentation

### Test Structure

The test suite is organized into the following categories:

```
__tests__/
├── models/              # Database model tests
│   ├── adminUser.test.js
│   ├── auditTrail.test.js
│   ├── databaseQuery.test.js
│   └── sybaseDatabase.test.js
├── controllers/         # Controller tests
│   ├── authController.test.js
│   ├── queryController.test.js
│   └── auditController.test.js
├── middleware/          # Middleware tests
│   ├── authMiddleware.test.js
│   ├── requestMiddleware.test.js
│   └── validationMiddleware.test.js
├── utils/              # Utility tests
│   ├── dbManager.test.js
│   └── monitor.test.js
├── setup.js            # Test setup configuration
└── testUtils.js        # Shared test utilities
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test categories
npm run test:models
npm run test:controllers
npm run test:middleware
npm run test:utils

# Run tests in CI environment
npm run test:ci
```

### Coverage Requirements

- Overall code coverage: 80%
- Controllers: 85%
- Models: 90%
- Middleware: 85%
- Utils: 85%

### Test Utilities

The `testUtils.js` file provides common testing utilities:

- `createMockUser()`: Creates mock user objects
- `createMockQuery()`: Creates mock query objects
- `createMockRequest()`: Creates mock Express request objects
- `createMockResponse()`: Creates mock Express response objects
- `generateTestToken()`: Generates JWT tokens for testing
- `TestError`: Custom error class for testing

### Mocking

Key dependencies are mocked:
- Database connections (Sequelize)
- Authentication (JWT)
- Password hashing (bcrypt)
- External services

### Test Environment

The test environment is configured in `setup.js`:
- Sets NODE_ENV to 'test'
- Configures test-specific environment variables
- Sets up console mocking
- Adds custom matchers
- Handles test cleanup

### Continuous Integration

Tests are integrated into the CI pipeline with:
- Jest JUnit reporter for test results
- Sonar reporter for code quality
- Coverage thresholds enforcement
- Automated test running on pull requests

### Best Practices

1. **Test Organization**
   - One test file per source file
   - Clear test descriptions
   - Proper use of describe and it blocks

2. **Test Isolation**
   - Clean setup and teardown
   - No test interdependencies
   - Proper mocking of external dependencies

3. **Coverage**
   - Test both success and failure paths
   - Test edge cases
   - Test input validation
   - Test error handling

4. **Maintenance**
   - Keep tests focused and readable
   - Use shared utilities
   - Regular updates with code changes

### Example Test

```javascript
describe('Query Controller', () => {
    describe('executeQuery', () => {
        it('should execute query successfully', async () => {
            // Arrange
            const mockQuery = createMockQuery();
            const mockRequest = createMockRequest({
                body: {
                    queryId: mockQuery.id,
                    startDate: '2024-01-01',
                    endDate: '2024-01-31'
                }
            });
            const mockResponse = createMockResponse();

            // Act
            await executeQuery(mockRequest, mockResponse);

            // Assert
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Query executed successfully'
                })
            );
        });
    });
});
```

### Debugging Tests

1. **Watch Mode**
   ```bash
   npm run test:watch
   ```

2. **Debug Configuration**
   ```json
   {
     "type": "node",
     "request": "launch",
     "name": "Debug Tests",
     "program": "${workspaceFolder}/node_modules/jest/bin/jest",
     "args": ["--runInBand", "--watchAll=false"],
     "console": "integratedTerminal",
     "internalConsoleOptions": "neverOpen"
   }
   ```

3. **Verbose Output**
   ```bash
   npm test -- --verbose
   ```

### Adding New Tests

1. Create test file matching source file structure
2. Import necessary utilities and mocks
3. Structure tests using describe/it blocks
4. Test both success and failure cases
5. Ensure proper cleanup in afterEach/afterAll
6. Verify coverage meets thresholds

### Troubleshooting

Common issues and solutions:

1. **Failing Tests**
   - Check test isolation
   - Verify mocks are properly reset
   - Ensure async operations complete
   - Check for proper error handling

2. **Coverage Issues**
   - Identify uncovered paths
   - Add edge case tests
   - Verify error handling paths
   - Check async code coverage

3. **Test Performance**
   - Use proper beforeAll/beforeEach
   - Minimize database operations
   - Proper use of mocks
   - Efficient test setup

### Contributing

1. Write tests for new features
2. Update tests for modified code
3. Maintain or improve coverage
4. Follow test naming conventions
5. Use shared utilities
6. Document complex test scenarios
