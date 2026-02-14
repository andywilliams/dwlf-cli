# DWLF CLI

A command-line interface for the DWLF market analysis platform. Provides terminal-based access to market data, trading signals, portfolio management, and analysis tools.

## Installation

```bash
npm install -g dwlf-cli
```

## Quick Start

1. **Login**: Configure your API credentials
   ```bash
   dwlf login
   ```

2. **Get Market Data**: Check current prices
   ```bash
   dwlf price BTC-USD NVDA AAPL
   ```

3. **View Your Watchlist**: See your tracked symbols
   ```bash
   dwlf watchlist
   ```

4. **Check Trading Signals**: Monitor active opportunities
   ```bash
   dwlf signals
   ```

## Commands

### Authentication
- `dwlf login` - Configure API key
- `dwlf logout` - Remove credentials

### Market Data
- `dwlf price <symbols...>` - Current prices and daily changes
- `dwlf watchlist` - Manage your watchlist
- `dwlf chart <symbol>` - ASCII price charts

### Trading
- `dwlf trades` - View and manage trades
- `dwlf portfolio` - Portfolio overview and performance
- `dwlf signals` - Active trading signals

### Analysis
- `dwlf indicators <symbol>` - Technical indicators
- `dwlf events` - Recent market events
- `dwlf strategies` - Strategy management
- `dwlf backtest` - Run strategy backtests

### Configuration
- `dwlf config` - Manage preferences and settings

## Features

- 📊 **Real-time market data** - Current prices, changes, and volume
- 🎯 **Trading signals** - AI-driven opportunities with R-multiple targets
- 📈 **Portfolio tracking** - P&L, performance metrics, and trade history
- 🔍 **Technical analysis** - 50+ indicators with customizable parameters
- 📋 **Trade journal** - Full trade lifecycle management
- 🧪 **Strategy backtesting** - Historical performance validation
- 🎨 **ASCII charts** - Terminal-friendly visualizations
- 🔔 **Event monitoring** - Custom and indicator-based alerts

## Configuration

The CLI stores configuration in `~/.dwlf/config.json`. You can set:

- **API Key**: Your DWLF API credentials
- **Default symbols**: Frequently-used watchlist
- **Output format**: Table, JSON, or compact modes
- **Chart preferences**: Timeframes and indicators

## Documentation

### 📚 Comprehensive Guides

- **[Command Reference](docs/COMMAND_REFERENCE.md)** - Complete reference for all commands and options
- **[Usage Examples](docs/examples/USAGE_EXAMPLES.md)** - Practical examples for common tasks
- **[Workflow Guide](docs/guides/WORKFLOW_EXAMPLES.md)** - End-to-end trading and analysis workflows
- **[Troubleshooting](docs/troubleshooting/TROUBLESHOOTING.md)** - Common issues and solutions

### 📖 Quick Examples

**Daily trading routine:**
```bash
# Morning market check
dwlf watchlist --prices
dwlf signals --limit 10
dwlf portfolio --period 1d

# Pre-market analysis
dwlf chart BTC-USD --indicators --volume
dwlf events --symbol BTC-USD --days 3
```

**Strategy analysis:**
```bash
# Backtest a strategy
dwlf backtest strategy_123 --start 2024-01-01 --symbols BTC-USD,ETH-USD

# Monitor strategy performance
dwlf strategies details strategy_123
dwlf strategies signals strategy_123
```

## Development

### Getting Started

```bash
# Clone repository
git clone https://github.com/andywilliams/dwlf-cli.git
cd dwlf-cli

# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Development setup and workflow
- Code style and testing guidelines
- Submitting pull requests
- Release process

### Scripts

```bash
npm run build          # Build TypeScript to JavaScript
npm run dev           # Run CLI in development mode
npm run test          # Run test suite
npm run lint          # Run ESLint
npm run type-check    # Run TypeScript type checking
npm run clean         # Clean build directory

# Semantic versioning
npm run version:patch  # Bump patch version
npm run version:minor  # Bump minor version
npm run version:major  # Bump major version
```

## Requirements

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **DWLF account** with API access

## API Documentation

For detailed API documentation, visit [DWLF Documentation](https://docs.dwlf.co.uk)

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/andywilliams/dwlf-cli/issues)
- **DWLF Discord**: Community support and discussions
- **Documentation**: [Complete CLI documentation](docs/)
- **Examples**: [Practical usage examples](docs/examples/)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes and version information.

## License

MIT License - see [LICENSE](LICENSE) file for details.