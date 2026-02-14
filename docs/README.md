# DWLF CLI Documentation

Welcome to the comprehensive documentation for the DWLF CLI. This directory contains everything you need to effectively use and contribute to the CLI.

## 📋 Documentation Index

### Essential Guides

| Document | Description | Use When |
|----------|-------------|-----------|
| [Command Reference](COMMAND_REFERENCE.md) | Complete reference for all CLI commands | Looking up specific command syntax or options |
| [Usage Examples](examples/USAGE_EXAMPLES.md) | Practical examples for common tasks | Learning how to use the CLI effectively |
| [Workflow Examples](guides/WORKFLOW_EXAMPLES.md) | End-to-end trading workflows | Setting up daily routines and complex analysis |
| [Troubleshooting](troubleshooting/TROUBLESHOOTING.md) | Common issues and solutions | Something isn't working as expected |

### Project Information

| Document | Description |
|----------|-------------|
| [../README.md](../README.md) | Project overview and quick start |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Development and contribution guidelines |
| [../CHANGELOG.md](../CHANGELOG.md) | Version history and release notes |
| [../LICENSE](../LICENSE) | MIT license information |

## 🚀 Quick Navigation

### New Users
1. Start with the [README](../README.md) for installation
2. Follow [Usage Examples](examples/USAGE_EXAMPLES.md) for your first commands
3. Reference [Command Reference](COMMAND_REFERENCE.md) as needed

### Daily Traders
1. Check [Workflow Examples](guides/WORKFLOW_EXAMPLES.md) for routines
2. Use [Command Reference](COMMAND_REFERENCE.md) for quick lookups
3. Automate with scripts from the workflow guide

### Developers
1. Read [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup
2. Check [CHANGELOG.md](../CHANGELOG.md) for recent changes
3. Reference command docs when adding new features

### Troubleshooting
1. Start with [Troubleshooting Guide](troubleshooting/TROUBLESHOOTING.md)
2. Check GitHub Issues if problem persists
3. Join DWLF Discord for community support

## 📊 Command Categories

### Authentication
```bash
dwlf login      # Configure API credentials
dwlf logout     # Remove credentials
```

### Market Data
```bash
dwlf price      # Get current prices
dwlf watchlist  # Manage symbol watchlist
dwlf chart      # Display price charts
```

### Trading
```bash
dwlf trades     # View and manage trades
dwlf portfolio  # Portfolio overview
dwlf signals    # Trading signals
```

### Analysis
```bash
dwlf indicators # Technical indicators
dwlf events     # Market events
dwlf strategies # Strategy management
dwlf backtest   # Strategy backtesting
```

### Configuration
```bash
dwlf config     # Manage preferences
```

## 🛠 Development Resources

- **Testing**: `npm test` - Run comprehensive test suite
- **Linting**: `npm run lint` - Check code quality
- **Building**: `npm run build` - Compile TypeScript
- **Type Checking**: `npm run type-check` - Verify types

## 📝 Documentation Updates

When updating documentation:

1. **Keep it practical** - Include real examples
2. **Be comprehensive** - Cover edge cases and options
3. **Stay current** - Update when features change
4. **Cross-reference** - Link related sections

## 🔗 External Resources

- [DWLF Platform](https://dwlf.co.uk) - Main trading platform
- [DWLF API Docs](https://docs.dwlf.co.uk) - API reference
- [GitHub Repository](https://github.com/andywilliams/dwlf-cli) - Source code
- [NPM Package](https://npmjs.com/package/dwlf-cli) - Package registry

## 📧 Getting Help

- **Documentation Issues**: Create a GitHub issue
- **Usage Questions**: Join DWLF Discord
- **Bug Reports**: Use the issue template
- **Feature Requests**: Start a GitHub discussion

---

This documentation is continuously updated. Last updated: February 2026