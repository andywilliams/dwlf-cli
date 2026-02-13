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

## Development

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

## Requirements

- Node.js >= 18.0.0
- DWLF account with API access

## API Documentation

For detailed API documentation, visit [DWLF Documentation](https://docs.dwlf.co.uk)

## License

MIT