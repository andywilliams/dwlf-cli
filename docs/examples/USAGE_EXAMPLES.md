# DWLF CLI Usage Examples

Practical examples showing how to use the DWLF CLI effectively.

## Quick Start Examples

### First Time Setup

```bash
# Install globally
npm install -g dwlf-cli

# Or use without installing
npx dwlf-cli login

# Login and test
dwlf login
dwlf price BTC-USD
```

### Building Your Watchlist

```bash
# Add symbols to track
dwlf watchlist add BTC-USD ETH-USD AAPL NVDA TSLA GOOGL

# View with current prices
dwlf watchlist --prices

# Check performance
dwlf price $(dwlf config get default.symbols)
```

## Market Data Examples

### Price Monitoring

```bash
# Single symbol
dwlf price BTC-USD

# Multiple symbols with sorting
dwlf price BTC-USD ETH-USD AAPL NVDA --sort change --reverse

# JSON output for scripting
dwlf price BTC-USD --format json | jq '.price'
```

### Chart Analysis

```bash
# Daily chart with indicators
dwlf chart BTC-USD --indicators --volume

# Hourly chart for day trading
dwlf chart AAPL --timeframe 1h --period 3 --height 30

# Weekly overview
dwlf chart BTC-USD --timeframe 1w --period 52
```

### Technical Indicators

```bash
# All indicators
dwlf indicators BTC-USD

# Specific momentum indicators
dwlf indicators AAPL --indicators rsi,macd,stoch

# Different timeframes
dwlf indicators NVDA --timeframe 4h --indicators ema,sma,bollinger
```

## Trading Examples

### Opening Positions

```bash
# Interactive trade entry
dwlf trades open BTC-USD

# Check signals first
dwlf signals --symbol BTC-USD
dwlf chart BTC-USD --indicators

# Then open trade based on analysis
dwlf trades open BTC-USD
```

### Position Management

```bash
# Monitor open trades
dwlf trades --status open

# Get detailed trade info
dwlf trades details trade_abc123

# Close profitable position
dwlf trades close trade_abc123
```

### Portfolio Tracking

```bash
# Daily performance check
dwlf portfolio --period 1d

# Detailed breakdown
dwlf portfolio --breakdown

# Monthly performance
dwlf portfolio --period 1m --format json
```

## Signal Analysis Examples

### Signal Scanning

```bash
# All active signals
dwlf signals

# High-confidence signals only
dwlf signals --format json | jq '.[] | select(.confidence > 0.8)'

# Symbol-specific signals
dwlf signals --symbol BTC-USD

# Strategy-specific signals
dwlf signals --strategy "Trend Momentum"
```

### Event-Based Analysis

```bash
# Recent market events
dwlf events --days 3

# Symbol-specific events
dwlf events --symbol AAPL --days 7

# Indicator events only
dwlf events --type indicator --days 1
```

## Strategy Analysis Examples

### Strategy Performance

```bash
# List all strategies
dwlf strategies

# Strategy details and performance
dwlf strategies details strategy_123

# Recent strategy signals
dwlf strategies signals strategy_123
```

### Backtesting

```bash
# Basic backtest
dwlf backtest strategy_123

# Custom date range
dwlf backtest strategy_123 --start 2024-01-01 --end 2024-12-31

# Specific symbols
dwlf backtest strategy_123 --symbols BTC-USD,ETH-USD,AAPL

# Export results
dwlf backtest strategy_123 --format json > backtest_results.json
```

## Automation Examples

### Daily Market Summary

```bash
#!/bin/bash
# daily-summary.sh

echo "=== Daily Market Summary - $(date +%Y-%m-%d) ==="

echo "📊 Portfolio Performance:"
dwlf portfolio --period 1d

echo "🎯 Top Signals:"
dwlf signals --limit 5

echo "📈 Watchlist Changes:"
dwlf watchlist --prices --sort change --reverse | head -10

echo "📰 Market Events:"
dwlf events --days 1
```

### Automated Signal Alerts

```bash
#!/bin/bash
# signal-alert.sh

# Get high confidence signals
HIGH_CONF_SIGNALS=$(dwlf signals --format json | jq '.[] | select(.confidence > 0.85)')

if [ -n "$HIGH_CONF_SIGNALS" ]; then
    echo "🚨 High Confidence Signals Detected!"
    echo "$HIGH_CONF_SIGNALS" | jq -r '"Symbol: " + .symbol + " | Strategy: " + .strategy + " | Confidence: " + (.confidence * 100 | round | tostring) + "%"'
    
    # Optional: Send notification
    # echo "$HIGH_CONF_SIGNALS" | mail -s "DWLF Alert" your.email@example.com
fi
```

### Portfolio Monitoring

```bash
#!/bin/bash
# monitor-portfolio.sh

while true; do
    clear
    date
    echo "=== Live Portfolio Monitor ==="
    
    # Current P&L
    dwlf portfolio | grep -E "(Total|P&L|Return)"
    
    # Open positions
    echo "Open Trades:"
    dwlf trades --status open | head -5
    
    sleep 60  # Update every minute
done
```

## Data Export Examples

### Export for Spreadsheet

```bash
# Portfolio data
dwlf portfolio --format json | jq -r '.positions[] | [.symbol, .quantity, .avgPrice, .currentPrice, .pnlPct] | @csv' > portfolio.csv

# Watchlist prices
dwlf watchlist --prices --format json | jq -r '.[] | [.symbol, .price, .change, .changePct] | @csv' > watchlist.csv

# Signal data
dwlf signals --format json | jq -r '.[] | [.symbol, .strategy, .confidence, .direction] | @csv' > signals.csv
```

### JSON Data Processing

```bash
# Get all BTC-related signals
dwlf signals --format json | jq '.[] | select(.symbol | contains("BTC"))'

# Portfolio symbols with >5% gains
dwlf portfolio --format json | jq '.positions[] | select(.pnlPct > 5) | .symbol'

# Events from last week grouped by symbol
dwlf events --days 7 --format json | jq 'group_by(.symbol) | map({symbol: .[0].symbol, count: length})'
```

## Integration Examples

### Webhook Integration

```bash
#!/bin/bash
# webhook-alert.sh

WEBHOOK_URL="https://hooks.slack.com/your/webhook/url"

# Get portfolio performance
PORTFOLIO_DATA=$(dwlf portfolio --format json)
DAILY_PNL=$(echo $PORTFOLIO_DATA | jq '.dailyPnl')

# Send Slack notification
curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"Daily P&L: \$${DAILY_PNL}\"}" \
    $WEBHOOK_URL
```

### Database Integration

```bash
#!/bin/bash
# database-insert.sh

# Export portfolio snapshot
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
PORTFOLIO_JSON=$(dwlf portfolio --format json)

# Insert into database (example with PostgreSQL)
psql -h localhost -d trading -c "INSERT INTO portfolio_snapshots (timestamp, data) VALUES ('$TIMESTAMP', '$PORTFOLIO_JSON'::jsonb)"
```

### Custom Dashboard

```bash
#!/bin/bash
# dashboard-data.sh

# Generate dashboard data file
{
    echo '{'
    echo '  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",'
    echo '  "portfolio": '$(dwlf portfolio --format json)','
    echo '  "signals": '$(dwlf signals --limit 20 --format json)','
    echo '  "events": '$(dwlf events --days 1 --format json)','
    echo '  "watchlist": '$(dwlf watchlist --prices --format json)'
    echo '}'
} > /var/www/dashboard/data.json
```

## Advanced Filtering Examples

### Complex Signal Filtering

```bash
# Crypto signals with high confidence
dwlf signals --format json | jq '.[] | select(.symbol | endswith("-USD")) | select(.confidence > 0.8)'

# Bullish signals on tech stocks
dwlf signals --format json | jq '.[] | select(.symbol | test("AAPL|MSFT|GOOGL|NVDA")) | select(.direction == "bullish")'

# Recent signals from momentum strategies
dwlf signals --format json | jq '.[] | select(.strategy | test("Momentum|Trend")) | select(.timestamp | fromdateiso8601 > (now - 86400))'
```

### Portfolio Analysis

```bash
# Winners and losers
dwlf portfolio --format json | jq '.positions[] | select(.pnlPct > 0) | {symbol: .symbol, gain: .pnlPct}' | jq -s 'sort_by(.gain) | reverse'

dwlf portfolio --format json | jq '.positions[] | select(.pnlPct < 0) | {symbol: .symbol, loss: .pnlPct}' | jq -s 'sort_by(.loss)'

# Large positions (>$1000)
dwlf portfolio --format json | jq '.positions[] | select(.value > 1000) | {symbol: .symbol, value: .value}'
```

### Event Analysis

```bash
# Bullish events on crypto
dwlf events --format json | jq '.[] | select(.symbol | endswith("-USD")) | select(.type | test("bullish|buy"))'

# High-impact events
dwlf events --format json | jq '.[] | select(.impact >= 3)' # Assuming impact field exists

# Events by frequency
dwlf events --days 7 --format json | jq 'group_by(.type) | map({event_type: .[0].type, count: length}) | sort_by(.count) | reverse'
```

## Scripting Best Practices

### Error Handling

```bash
#!/bin/bash
# robust-script.sh

set -e  # Exit on any error

check_command() {
    if ! command -v dwlf &> /dev/null; then
        echo "Error: dwlf CLI not found"
        exit 1
    fi
}

check_auth() {
    if ! dwlf portfolio &> /dev/null; then
        echo "Error: Authentication failed"
        echo "Run 'dwlf login' first"
        exit 1
    fi
}

check_command
check_auth

# Your script logic here...
```

### Configuration Management

```bash
#!/bin/bash
# config-setup.sh

# Backup existing config
cp ~/.dwlf/config.json ~/.dwlf/config.json.backup

# Set optimal defaults
dwlf config set output.format table
dwlf config set output.color true
dwlf config set chart.height 25

# Set default symbols
dwlf config set default.symbols "BTC-USD,ETH-USD,AAPL,NVDA"

echo "Configuration updated successfully"
```

### Batch Processing

```bash
#!/bin/bash
# batch-analysis.sh

SYMBOLS=("BTC-USD" "ETH-USD" "AAPL" "NVDA" "TSLA")

for symbol in "${SYMBOLS[@]}"; do
    echo "=== Analyzing $symbol ==="
    
    # Price check
    dwlf price $symbol
    
    # Technical analysis
    dwlf indicators $symbol --indicators rsi,macd
    
    # Recent events
    dwlf events --symbol $symbol --days 3 | head -5
    
    echo "--- $symbol analysis complete ---"
    echo
    
    # Rate limiting
    sleep 1
done
```

These examples demonstrate the flexibility and power of the DWLF CLI for various trading and analysis workflows.