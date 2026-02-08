# Contributing to Project Cygnus

Thank you for your interest in contributing to Project Cygnus! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and professional in all interactions.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js v20 or higher
- Rust and Cargo (for smart contracts)
- Stellar CLI
- Git
- A code editor (VS Code recommended)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/project-cygnus.git
cd project-cygnus
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/project-cygnus.git
```

## Development Setup

### Install Dependencies

```bash
# Install root dependencies
npm install

# Install dashboard dependencies
cd dashboard && npm install && cd ..

# Build TypeScript
npm run build
```

### Configure Environment

Create a `.env` file:

```env
PORT=3402
HOST=0.0.0.0
NODE_ENV=development
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
LOG_LEVEL=debug
```

### Run Development Server

```bash
# Start backend
npm run dev

# Start dashboard (in another terminal)
cd dashboard && ./start.sh
```

## Project Structure

```
project-cygnus/
├── agents/           # Autonomous agent implementations
├── contracts/        # Soroban smart contracts (Rust)
├── protocols/        # Protocol implementations (TypeScript)
├── src/              # Core backend services
├── dashboard/        # Web dashboard
├── tests/            # Test suites
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or updates

### 2. Make Changes

- Write clean, readable code
- Follow the coding standards (see below)
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:property

# Run contract tests
cd contracts && cargo test
```

### 4. Commit Your Changes

Follow the commit guidelines (see below):

```bash
git add .
git commit -m "feat: add new trading strategy"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Use explicit types (avoid `any`)
- Use async/await over promises
- Use ES6+ features

Example:

```typescript
// Good
async function fetchAgentStatus(agentId: string): Promise<AgentStatus> {
  const agent = await agentManager.getAgent(agentId);
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }
  return agent.getStatus();
}

// Bad
function fetchAgentStatus(agentId) {
  return agentManager.getAgent(agentId).then(agent => {
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return agent.getStatus();
  });
}
```

### Rust (Smart Contracts)

- Follow Rust best practices
- Use `cargo fmt` for formatting
- Use `cargo clippy` for linting
- Add comprehensive tests
- Document public APIs

Example:

```rust
/// Creates a new loan with the specified parameters.
///
/// # Arguments
/// * `env` - The contract environment
/// * `borrower` - The borrower's address
/// * `amount` - The loan amount in stroops
/// * `interest_rate` - The annual interest rate (basis points)
///
/// # Returns
/// The unique loan ID
pub fn create_loan(
    env: Env,
    borrower: Address,
    amount: i128,
    interest_rate: u32,
) -> LoanId {
    // Implementation
}
```

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings (TypeScript)
- Use trailing commas in multi-line objects/arrays
- Maximum line length: 100 characters
- Use meaningful variable names

### Formatting

```bash
# Format TypeScript
npm run format

# Format Rust
cd contracts && cargo fmt
```

### Linting

```bash
# Lint TypeScript
npm run lint

# Lint Rust
cd contracts && cargo clippy
```

## Testing Guidelines

### Test Structure

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test component interactions
- **Property-Based Tests**: Test invariants with fast-check
- **Contract Tests**: Test Soroban contracts

### Writing Tests

Use descriptive test names:

```typescript
import { describe, it, expect } from 'vitest';

describe('AgentManager', () => {
  describe('fundAgent', () => {
    it('should successfully fund an agent with valid parameters', async () => {
      // Arrange
      const agentId = 'test-agent';
      const params = {
        amount: '100',
        sourcePublicKey: 'GABC...',
        signedTransaction: 'AAAAAgA...'
      };

      // Act
      const result = await agentManager.fundAgent(agentId, params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.transactionHash).toBeDefined();
    });

    it('should return error when agent does not exist', async () => {
      // Test implementation
    });

    it('should validate amount is positive', async () => {
      // Test implementation
    });
  });
});
```

### Property-Based Tests

Use fast-check for property-based testing:

```typescript
import fc from 'fast-check';

describe('Transaction encoding', () => {
  it('should encode and decode transactions correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          source: fc.string(),
          sequence: fc.nat(),
          operations: fc.array(fc.anything())
        }),
        (tx) => {
          const encoded = encoder.encode(tx);
          const decoded = decoder.decode(encoded);
          expect(decoded).toEqual(tx);
        }
      )
    );
  });
});
```

### Test Coverage

- Aim for >80% code coverage
- Test edge cases and error conditions
- Test async operations
- Test error handling

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples

```bash
# Feature
git commit -m "feat(agents): add autonomous trading strategy"

# Bug fix
git commit -m "fix(server): handle null agent status gracefully"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change
git commit -m "feat(api): change agent status response format

BREAKING CHANGE: AgentStatus now returns balance as string instead of number"
```

### Commit Best Practices

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Keep subject line under 72 characters
- Reference issues and PRs in the footer

## Pull Request Process

### Before Submitting

1. **Update your branch** with the latest upstream changes:

```bash
git fetch upstream
git rebase upstream/main
```

2. **Run all tests**:

```bash
npm test
cd contracts && cargo test
```

3. **Run linters**:

```bash
npm run lint
cd contracts && cargo clippy
```

4. **Update documentation** if needed

### PR Title

Use the same format as commit messages:

```
feat(agents): add autonomous trading strategy
```

### PR Description

Include:

- **What**: What changes were made
- **Why**: Why these changes were necessary
- **How**: How the changes were implemented
- **Testing**: How the changes were tested
- **Screenshots**: If applicable (for UI changes)

Template:

```markdown
## Description
Brief description of the changes.

## Motivation
Why are these changes needed?

## Changes
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Screenshots (if applicable)
Add screenshots here

## Related Issues
Closes #123
```

### Review Process

1. At least one maintainer must approve the PR
2. All CI checks must pass
3. No merge conflicts
4. Code follows project standards
5. Tests are included and passing

### After Approval

Once approved, a maintainer will merge your PR. Your contribution will be included in the next release!

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex logic
- Include examples in documentation
- Keep documentation up-to-date

Example:

```typescript
/**
 * Funds an agent with XLM from a user wallet.
 *
 * @param id - The unique agent identifier
 * @param params - Funding parameters
 * @param params.amount - Amount in XLM to fund
 * @param params.sourcePublicKey - Source wallet public key
 * @param params.signedTransaction - Signed Stellar transaction
 * @returns Promise resolving to funding result
 *
 * @example
 * ```typescript
 * const result = await agentManager.fundAgent('agent-1', {
 *   amount: '100',
 *   sourcePublicKey: 'GABC...',
 *   signedTransaction: 'AAAAAgA...'
 * });
 * ```
 */
async fundAgent(id: string, params: FundAgentParams): Promise<FundAgentResult>
```

### Documentation Files

- Update README.md for major changes
- Add guides to `docs/` directory
- Update API documentation
- Include architecture diagrams when relevant

## Community

### Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check the `docs/` directory

### Reporting Bugs

When reporting bugs, include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**: OS, Node.js version, etc.
6. **Logs**: Relevant error messages or logs

### Suggesting Features

When suggesting features, include:

1. **Use Case**: Why is this feature needed?
2. **Proposed Solution**: How should it work?
3. **Alternatives**: Other solutions you've considered
4. **Additional Context**: Any other relevant information

## Recognition

Contributors will be recognized in:

- The project README
- Release notes
- GitHub contributors page

Thank you for contributing to Project Cygnus! 🚀

---

**Questions?** Open an issue or start a discussion on GitHub.
