# Contributing to ng-di-graph

Thank you for your interest in contributing to ng-di-graph! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- **Bun 1.2+** (recommended) or **Node.js 18+**
- **TypeScript 5.0+**
- Angular project with TypeScript (versions 17-20 supported)

### Getting Started

```bash
# Clone the repository
git clone <repository-url>
cd ng-di-graph

# Install dependencies (Bun)
bun install

# Or with npm
npm install

# Run tests in watch mode (TDD workflow)
npm run test:watch

# Run all tests
npm run test

# Check code quality
npm run check
```

## Development Workflow

### Test-Driven Development (Mandatory)

This project follows strict TDD methodology:

1. **Write failing tests first** using `npm run test:watch`
2. **Implement minimal code** to pass tests
3. **Refactor** while keeping tests green
4. **Maintain high coverage** (>90% target)

See [TDD Development Workflow](docs/instructions/tdd-development-workflow.md) for detailed guidelines.

### Available Scripts

**Development:**
- `npm run dev` - Run CLI via tsx (Node-based dev entrypoint)
- `npm run dev:node` - Alternate tsx alias for CLI debugging
- `npm run test` - Run full test suite (395 tests)
- `npm run test:watch` - Watch mode for TDD development
- `npm run test:coverage` - Generate coverage report

**Code Quality:**
- `npm run lint` - Check code with Biome v2
- `npm run lint:fix` - Auto-fix Biome v2 issues
- `npm run format` - Format code with Biome v2
- `npm run check` - Combined lint & typecheck
- `npm run typecheck` - TypeScript type checking

**Build:**
- `npm run build` - Build with TypeScript compiler (tsc clean build)
- `npm run clean` - Remove dist directory

## Test Coverage

The project maintains high test coverage with comprehensive test suites:

### Current Coverage Metrics

- **Total Tests:** 395 passing
- **Function Coverage:** 93.28%
- **Line Coverage:** 99.06%
- **Test Execution Time:** ~62 seconds

### Coverage by Module

| Module | Coverage | Notes |
|--------|----------|-------|
| `parser.ts` | 97.78% | Comprehensive decorator & token tests |
| `graph-builder.ts` | 100% | Full graph construction coverage |
| `formatters/` | 100% | JSON and Mermaid output formatters |
| `graph-filter.ts` | 100% | Entry point filtering logic |
| `logger.ts` | 100% | Logging utilities |
| `error-handler.ts` | 81.82% | Edge case handling |

### Coverage Requirements

All new code must maintain or improve coverage:
- **Minimum Function Coverage:** 90%
- **Minimum Line Coverage:** 95%
- **All new features:** Must include comprehensive test suites
- **Bug fixes:** Must include regression tests

### Running Coverage Reports

```bash
# Generate full coverage report
npm run test:coverage

# View HTML coverage report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

## Contribution Guidelines

### Code Quality Standards

1. **Follow TDD methodology** - Write tests first, then implementation
2. **Maintain test coverage** - Ensure >90% coverage for new code
3. **Use Biome v2 for linting** - Run `npm run lint:fix` before committing
4. **Type safety** - All code must pass `npm run typecheck`
5. **Run full test suite** - Ensure `npm run test` passes
6. **Follow existing patterns** - Review existing code structure

### Code Style

- Use Biome v2 for consistent formatting
- Follow TypeScript best practices
- Write clear, descriptive variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused (single responsibility)

### Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test additions or changes
- `refactor`: Code refactoring
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**
```
feat(parser): add support for @Inject decorator resolution

fix(graph-builder): handle circular dependencies correctly

docs(readme): update installation instructions

test(parser): add edge case tests for anonymous classes
```

### Pull Request Process

1. **Create a feature branch** from `main`
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** following TDD workflow
   - Write failing tests first
   - Implement minimal code to pass
   - Refactor for quality

3. **Run quality checks**
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```

4. **Commit your changes** with conventional commit messages

5. **Push to your fork** and create a pull request

6. **Ensure CI passes** - All tests and quality checks must pass

7. **Respond to review feedback** - Address all reviewer comments

### What to Include in PRs

- Clear description of the changes
- Reference to related issues (if any)
- Test results showing coverage maintained/improved
- Screenshots or examples (if applicable)
- Documentation updates (if needed)

### What We Look For

- ✅ Tests are included and passing
- ✅ Code coverage is maintained or improved
- ✅ Code follows existing patterns and style
- ✅ TypeScript types are properly defined
- ✅ Documentation is updated
- ✅ Commit messages are clear and conventional
- ✅ No breaking changes without discussion

## Testing Guidelines

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'bun:test'

describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = createTestInput()

      // Act
      const result = methodName(input)

      // Assert
      expect(result).toEqual(expectedOutput)
    })

    it('should handle edge case: empty input', () => {
      // Test edge cases
    })

    it('should throw error for invalid input', () => {
      // Test error cases
    })
  })
})
```

### Test Coverage Focus Areas

- **Happy path** - Normal successful execution
- **Edge cases** - Empty inputs, null values, boundaries
- **Error handling** - Invalid inputs, missing dependencies
- **Integration** - Component interactions
- **Performance** - Large datasets, memory usage

## Documentation

### When to Update Documentation

- Adding new features → Update README and JSDoc
- Changing CLI options → Update CLI reference
- Fixing bugs → Add troubleshooting notes if applicable
- Performance improvements → Update benchmarks

### Documentation Locations

- **README.md** - User-facing documentation
- **CLAUDE.md** - AI development instructions
- **docs/prd/** - Product requirements
- **docs/rules/** - Development guidelines
- **docs/instructions/** - Workflow documentation
- **JSDoc comments** - Inline code documentation

## Getting Help

- **Issues** - Check existing issues or create a new one
- **Discussions** - Ask questions in GitHub Discussions
- **Documentation** - Review project documentation in `docs/`
- **AI Development Guide** - See [AI Development Guide](docs/rules/ai-development-guide.md)

## License

By contributing to ng-di-graph, you agree that your contributions will be licensed under the MIT License.
