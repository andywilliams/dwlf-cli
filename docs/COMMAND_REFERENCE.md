# DWLF CLI Command Reference

Complete reference for all available commands in the DWLF CLI.

## Table of Contents

- [Authentication](#authentication)
- [Market Data](#market-data)
- [Trading](#trading)
- [Analysis](#analysis)
- [Configuration](#configuration)
- [Global Options](#global-options)

## Authentication

### `dwlf login`

Configure your DWLF API credentials.

```bash
dwlf login [options]
```

**Options:**
- `--api-key <key>` - Set API key directly (skip interactive prompt)
- `--base-url <url>` - Set custom API base URL (default: https://api.dwlf.co.uk)
- `--test` - Test connection after login

**Interactive mode:**
- Prompts for API key
- Tests connection
- Saves credentials securely

**Examples:**
```bash
# Interactive login
dwlf login

# Direct API key
dwlf login --api-key dwlf_sk_your_key_here

# Login with custom server
dwlf login --base-url https://staging.api.dwlf.co.uk
```

### `dwlf logout`

Remove stored credentials.

```bash
dwlf logout [options]
```

**Options:**
- `--confirm` - Skip confirmation prompt

**Examples:**
```bash
dwlf logout
dwlf logout --confirm
```

## Market Data

### `dwlf price`

Get current prices and daily changes.

```bash
dwlf price <symbols...> [options]
```

**Arguments:**
- `symbols` - One or more symbols (BTC-USD, AAPL, etc.)

**Options:**
- `--format <format>` - Output format: table (default), json, compact
- `--sort <field>` - Sort by: symbol, price, change, volume
- `--reverse` - Reverse sort order
- `--no-color` - Disable colored output

**Examples:**
```bash
# Single symbol
dwlf price BTC-USD

# Multiple symbols
dwlf price BTC-USD ETH-USD AAPL NVDA

# JSON output
dwlf price BTC-USD --format json

# Sorted by change
dwlf price BTC-USD ETH-USD AAPL --sort change --reverse
```

### `dwlf watchlist`

Manage your symbol watchlist.

```bash
dwlf watchlist [command] [options]
```

**Commands:**
- `list` (default) - Show current watchlist
- `add <symbols...>` - Add symbols to watchlist
- `remove <symbols...>` - Remove symbols from watchlist
- `clear` - Clear entire watchlist

**Options:**
- `--format <format>` - Output format: table, json
- `--prices` - Include current prices (for list command)

**Examples:**
```bash
# Show watchlist
dwlf watchlist

# Show with prices
dwlf watchlist --prices

# Add symbols
dwlf watchlist add BTC-USD AAPL NVDA

# Remove symbols
dwlf watchlist remove AAPL

# Clear all
dwlf watchlist clear
```

### `dwlf chart`

Display ASCII charts for symbols.

```bash
dwlf chart <symbol> [options]
```

**Arguments:**
- `symbol` - Symbol to chart

**Options:**
- `--timeframe <tf>` - Timeframe: 1m, 5m, 15m, 1h, 4h, 1d, 1w (default: 1d)
- `--period <days>` - Number of days to show (default: 30)
- `--height <lines>` - Chart height in lines (default: 20)
- `--indicators` - Include technical indicators
- `--volume` - Show volume bars

**Examples:**
```bash
# Daily chart
dwlf chart BTC-USD

# Hourly chart for 7 days
dwlf chart BTC-USD --timeframe 1h --period 7

# Chart with indicators
dwlf chart AAPL --indicators --volume
```

## Trading

### `dwlf trades`

View and manage trades.

```bash
dwlf trades [command] [options]
```

**Commands:**
- `list` (default) - List trades
- `open <symbol>` - Open new trade
- `close <id>` - Close trade by ID
- `details <id>` - Show trade details

**Options:**
- `--status <status>` - Filter by status: all, open, closed
- `--symbol <symbol>` - Filter by symbol
- `--format <format>` - Output format: table, json

**Examples:**
```bash
# List all trades
dwlf trades

# List open trades only
dwlf trades --status open

# Open new trade (interactive)
dwlf trades open BTC-USD

# Close trade
dwlf trades close trade_123

# Trade details
dwlf trades details trade_123
```

### `dwlf portfolio`

Portfolio overview and performance.

```bash
dwlf portfolio [options]
```

**Options:**
- `--period <period>` - Performance period: 1d, 1w, 1m, 3m, 1y, all
- `--format <format>` - Output format: table, json
- `--breakdown` - Show detailed position breakdown

**Examples:**
```bash
# Portfolio overview
dwlf portfolio

# Monthly performance
dwlf portfolio --period 1m

# Detailed breakdown
dwlf portfolio --breakdown
```

### `dwlf signals`

Active trading signals.

```bash
dwlf signals [options]
```

**Options:**
- `--symbol <symbol>` - Filter by symbol
- `--strategy <strategy>` - Filter by strategy
- `--format <format>` - Output format: table, json
- `--limit <num>` - Limit number of results (default: 20)

**Examples:**
```bash
# All signals
dwlf signals

# BTC signals only
dwlf signals --symbol BTC-USD

# Trend momentum signals
dwlf signals --strategy "Trend Momentum"
```

## Analysis

### `dwlf indicators`

Technical indicators for symbols.

```bash
dwlf indicators <symbol> [options]
```

**Arguments:**
- `symbol` - Symbol to analyze

**Options:**
- `--timeframe <tf>` - Timeframe: 1m, 5m, 15m, 1h, 4h, 1d, 1w (default: 1d)
- `--indicators <list>` - Comma-separated list of indicators (default: all)
- `--format <format>` - Output format: table, json

**Available Indicators:**
- `sma`, `ema`, `rsi`, `macd`, `bollinger`, `stoch`, `atr`, `volume`

**Examples:**
```bash
# All indicators
dwlf indicators BTC-USD

# Specific indicators
dwlf indicators BTC-USD --indicators rsi,macd,bollinger

# Hourly timeframe
dwlf indicators AAPL --timeframe 1h
```

### `dwlf events`

Recent market events.

```bash
dwlf events [options]
```

**Options:**
- `--symbol <symbol>` - Filter by symbol
- `--type <type>` - Event type: indicator, custom, all (default: all)
- `--days <days>` - Number of days to look back (default: 7)
- `--format <format>` - Output format: table, json

**Examples:**
```bash
# All recent events
dwlf events

# BTC events only
dwlf events --symbol BTC-USD

# Indicator events last 3 days
dwlf events --type indicator --days 3
```

### `dwlf strategies`

Strategy management.

```bash
dwlf strategies [command] [options]
```

**Commands:**
- `list` (default) - List strategies
- `details <id>` - Strategy details and performance
- `signals <id>` - Recent signals from strategy

**Options:**
- `--format <format>` - Output format: table, json

**Examples:**
```bash
# List strategies
dwlf strategies

# Strategy details
dwlf strategies details strategy_123

# Strategy signals
dwlf strategies signals strategy_123
```

### `dwlf backtest`

Run strategy backtests.

```bash
dwlf backtest <strategy-id> [options]
```

**Arguments:**
- `strategy-id` - Strategy to backtest

**Options:**
- `--symbols <symbols>` - Comma-separated symbols (default: watchlist)
- `--start <date>` - Start date (YYYY-MM-DD)
- `--end <date>` - End date (YYYY-MM-DD)
- `--format <format>` - Output format: table, json

**Examples:**
```bash
# Backtest with default dates
dwlf backtest strategy_123

# Custom date range
dwlf backtest strategy_123 --start 2024-01-01 --end 2024-12-31

# Specific symbols
dwlf backtest strategy_123 --symbols BTC-USD,ETH-USD
```

## Configuration

### `dwlf config`

Manage preferences and settings.

```bash
dwlf config [command] [key] [value]
```

**Commands:**
- `list` (default) - Show current configuration
- `get <key>` - Get configuration value
- `set <key> <value>` - Set configuration value
- `unset <key>` - Remove configuration value
- `reset` - Reset to defaults

**Configuration Keys:**
- `default.symbols` - Default symbols for commands
- `output.format` - Default output format (table/json)
- `output.color` - Enable colored output (true/false)
- `chart.height` - Default chart height
- `api.baseUrl` - API base URL

**Examples:**
```bash
# Show configuration
dwlf config

# Set default symbols
dwlf config set default.symbols BTC-USD,ETH-USD,AAPL

# Disable colors
dwlf config set output.color false

# Get value
dwlf config get output.format

# Reset configuration
dwlf config reset
```

## Global Options

Available for all commands:

- `--help, -h` - Show help
- `--version, -V` - Show version
- `--verbose, -v` - Verbose output
- `--quiet, -q` - Minimal output
- `--no-color` - Disable colored output
- `--config <path>` - Use custom config file

**Examples:**
```bash
# Show version
dwlf --version

# Verbose mode
dwlf price BTC-USD --verbose

# Quiet mode
dwlf trades --quiet

# Custom config
dwlf --config ~/my-dwlf-config.json price BTC-USD
```

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Invalid arguments
- `3` - Authentication error
- `4` - Network error
- `5` - API error

## Environment Variables

- `DWLF_API_KEY` - API key (overrides config file)
- `DWLF_BASE_URL` - API base URL
- `DWLF_CONFIG_FILE` - Custom config file path
- `DWLF_NO_COLOR` - Disable colors (set to any value)