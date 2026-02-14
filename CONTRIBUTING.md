# Contributing to DWLF CLI

Thank you for considering contributing to DWLF CLI! This document outlines the process for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

This project follows a standard code of conduct:

- **Be respectful** and inclusive
- **Be collaborative** and constructive
- **Be professional** in all interactions
- **Focus on the code** and technical merit

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 8 or higher
- Git
- DWLF account with API access

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/dwlf-cli.git
   cd dwlf-cli
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your DWLF credentials**
   ```bash
   npm run dev -- login
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Build the project**
   ```bash
   npm run build
   ```

### Project Structure

```
dwlf-cli/
├── src/                    # Source code
│   ├── auth.ts            # Authentication handling
│   ├── client.ts          # API client
│   ├── commands.ts        # CLI commands
│   ├── config.ts          # Configuration management
│   ├── index.ts           # Entry point
│   ├── types.ts           # TypeScript definitions
│   └── utils.ts           # Utility functions
├── docs/                  # Documentation
│   ├── COMMAND_REFERENCE.md
│   ├── examples/
│   ├── guides/
│   └── troubleshooting/
├── dist/                  # Built output (git-ignored)
├── tests/                 # Test files
└── examples/              # Usage examples
```

## Development Process

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches
- `docs/*` - Documentation updates

### Workflow

1. **Create a feature branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following our style guide
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm run type-check
   npm run lint
   npm test
   npm run build
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.ts

# Watch mode for development
npm test -- --watch
```

### Writing Tests

- Place test files alongside source files with `.test.ts` extension
- Use Jest testing framework
- Aim for high test coverage (>80%)
- Test both happy path and error cases

Example test structure:
```typescript
describe('CommandName', () => {
  describe('when valid input', () => {
    it('should return expected result', () => {
      // Test implementation
    });
  });

  describe('when invalid input', () => {
    it('should throw appropriate error', () => {
      // Error test implementation
    });
  });
});
```

### Testing Guidelines

- **Unit tests**: Test individual functions/methods
- **Integration tests**: Test command flows
- **Mock external dependencies**: Use Jest mocks for API calls
- **Test error handling**: Ensure proper error messages

## Submitting Changes

### Pull Request Process

1. **Ensure your PR is ready**
   - All tests pass
   - Code is properly formatted
   - Documentation is updated
   - Commit messages follow conventions

2. **Create descriptive PR title and description**
   ```
   feat: add portfolio allocation analysis
   
   - Adds new `dwlf portfolio allocation` command
   - Calculates portfolio allocation percentages
   - Includes pie chart ASCII visualization
   - Updates documentation and tests
   
   Closes #123
   ```

3. **Request review**
   - Assign reviewers if you have permission
   - Address any feedback promptly

4. **Update if needed**
   ```bash
   # Make changes based on feedback
   git add .
   git commit -m "fix: address review feedback"
   git push origin feature/your-feature-name
   ```

### Commit Message Guidelines

Follow conventional commits specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```bash
feat: add real-time portfolio monitoring
fix: resolve authentication timeout issue
docs: update installation instructions
test: add unit tests for trade management
```

### Breaking Changes

For breaking changes, include `BREAKING CHANGE:` in the commit message:

```bash
feat: redesign configuration format

BREAKING CHANGE: Configuration file format changed from JSON to YAML.
Users need to migrate their ~/.dwlf/config.json to ~/.dwlf/config.yaml
```

## Code Style

### TypeScript Guidelines

- Use TypeScript strict mode
- Define interfaces for all data structures
- Use explicit return types for functions
- Prefer `const` over `let` when possible
- Use meaningful variable and function names

### Formatting

- Use Prettier for code formatting (configured in project)
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multi-line structures

### ESLint Rules

Follow the project's ESLint configuration:

```bash
# Check linting
npm run lint

# Auto-fix linting issues
npm run lint -- --fix
```

## Documentation

### Updating Documentation

When making changes that affect user experience:

1. **Update README.md** if changing installation or basic usage
2. **Update COMMAND_REFERENCE.md** for new commands or options
3. **Add examples** to relevant files in `docs/examples/`
4. **Update troubleshooting** if fixing common issues
5. **Update CHANGELOG.md** with your changes

### Documentation Style

- Use clear, concise language
- Include code examples
- Provide context for when to use features
- Keep examples realistic and practical

## Release Process

### Semantic Versioning

This project uses semantic versioning (semver):

- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backwards compatible
- **Patch** (0.0.1): Bug fixes, backwards compatible

### Automated Releases

Releases are automated via GitHub Actions:

1. **Merge to main** triggers version bump based on commit messages
2. **New tag** is created automatically
3. **NPM package** is published automatically
4. **GitHub release** is created with changelog

### Manual Release (if needed)

```bash
# Patch release
npm run release:patch

# Minor release
npm run release:minor

# Major release
npm run release:major
```

## Getting Help

- **GitHub Issues**: Report bugs or request features
- **GitHub Discussions**: Ask questions or discuss ideas
- **DWLF Discord**: Community support
- **Email**: Contact maintainers directly

## Recognition

Contributors will be recognized in:

- GitHub contributors list
- Release notes for significant contributions
- README acknowledgments section

Thank you for contributing to DWLF CLI!