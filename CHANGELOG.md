# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation structure
- Command reference guide
- Usage examples and workflow guides
- Troubleshooting documentation
- Semantic versioning and automated publishing
- GitHub Actions CI/CD pipeline with automated NPM publishing

### Changed
- Enhanced package.json with proper repository metadata
- Improved CI workflow with semantic versioning support
- Updated README with better installation and usage instructions

### Fixed
- Package metadata for NPM publishing
- GitHub Actions workflow for proper release management

## [0.1.0] - 2026-02-14

### Added
- Initial CLI implementation
- Basic authentication system
- Market data commands (price, watchlist, chart)
- Trading commands (trades, portfolio, signals)
- Analysis commands (indicators, events, strategies, backtest)
- Configuration management
- TypeScript implementation with full type safety
- Jest test suite with comprehensive coverage
- ESLint configuration for code quality
- Example usage files

### Features
- **Authentication**: Login/logout with API key management
- **Market Data**: Real-time prices, ASCII charts, technical indicators
- **Trading**: Portfolio tracking, trade management, signal analysis
- **Strategy Analysis**: Backtesting, strategy performance, signal generation
- **Configuration**: Customizable settings and defaults
- **Multiple Output Formats**: Table, JSON, and compact modes
- **Cross-Platform**: Works on Windows, macOS, and Linux

### Technical
- Node.js 18+ support
- TypeScript for type safety
- Commander.js for CLI parsing
- Axios for API communication
- Chalk for colored output
- CLI-Table3 for formatted tables
- Jest for testing
- ESLint for code quality

## Version Numbering

This project follows semantic versioning:

- **MAJOR** version when you make incompatible API changes
- **MINOR** version when you add functionality in a backwards compatible manner
- **PATCH** version when you make backwards compatible bug fixes

### Commit Message Guidelines

To trigger automatic version bumps:

- `feat:` or `feature:` - Minor version bump
- `BREAKING CHANGE:` or `major:` - Major version bump  
- Everything else - Patch version bump

Example:
```
feat: add portfolio performance analytics

BREAKING CHANGE: changed API response format for trade details
```

## Release Process

1. **Development**: Work on features in `develop` branch
2. **Testing**: Create PR to `main` branch
3. **CI/CD**: GitHub Actions runs tests automatically
4. **Versioning**: Merge to `main` triggers automatic version bump based on commit messages
5. **Publishing**: New version is automatically published to NPM
6. **Release**: GitHub release is created with changelog

## Notable Dependencies

- **commander**: CLI argument parsing and command structure
- **axios**: HTTP client for API requests  
- **chalk**: Terminal string styling and colors
- **cli-table3**: ASCII table formatting
- **enquirer**: Interactive prompts
- **ora**: Loading spinners
- **sparkline**: ASCII sparkline charts

## Development Dependencies

- **typescript**: Static typing
- **jest**: Testing framework
- **eslint**: Code linting
- **tsx**: TypeScript execution
- **@types/***: TypeScript type definitions