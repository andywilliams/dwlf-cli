# DWLF CLI Workflow Examples

Practical workflow examples for common trading and analysis tasks.

## Table of Contents

- [Getting Started](#getting-started)
- [Daily Trading Routine](#daily-trading-routine)
- [Portfolio Management](#portfolio-management)
- [Strategy Analysis](#strategy-analysis)
- [Research Workflows](#research-workflows)
- [Automation Scripts](#automation-scripts)

## Getting Started

### Initial Setup

```bash
# 1. Install DWLF CLI
npm install -g dwlf-cli

# 2. Login with your API key
dwlf login

# 3. Set up your default watchlist
dwlf watchlist add BTC-USD ETH-USD AAPL NVDA TSLA

# 4. Configure preferences
dwlf config set output.format table
dwlf config set chart.height 25
```

### Verify Setup

```bash
# Test your connection
dwlf price BTC-USD

# Check your configuration
dwlf config

# View your watchlist
dwlf watchlist --prices
```

## Daily Trading Routine

### Morning Market Check

```bash
#!/bin/bash
# morning-check.sh - Daily market overview

echo "=== DWLF Morning Market Check ==="
echo

# 1. Check your watchlist prices
echo "📊 Watchlist Overview:"
dwlf watchlist --prices

echo

# 2. Check active trading signals
echo "🎯 Active Signals:"
dwlf signals --limit 10

echo

# 3. Check recent events
echo "📰 Recent Events (Last 24h):"
dwlf events --days 1

echo

# 4. Portfolio overview
echo "💼 Portfolio Status:"
dwlf portfolio

echo "=== Morning Check Complete ==="
```

### Pre-Market Analysis

```bash
# Focus on specific symbol analysis
SYMBOL="AAPL"

echo "=== Pre-Market Analysis: $SYMBOL ==="

# Price and recent performance
dwlf price $SYMBOL

# Technical indicators
dwlf indicators $SYMBOL --indicators rsi,macd,bollinger

# Recent chart
dwlf chart $SYMBOL --period 7 --indicators

# Recent events for this symbol
dwlf events --symbol $SYMBOL --days 3
```

### End-of-Day Review

```bash
#!/bin/bash
# eod-review.sh - End of day portfolio review

echo "=== End of Day Review ==="

# 1. Portfolio performance today
dwlf portfolio --period 1d --breakdown

# 2. Check open trades
dwlf trades --status open

# 3. Review closed trades today
dwlf trades --status closed | head -10

# 4. Strategy performance
dwlf strategies

echo "=== Review Complete ==="
```

## Portfolio Management

### Trade Management Workflow

```bash
# 1. Check current portfolio
dwlf portfolio --breakdown

# 2. Identify opportunity from signals
dwlf signals --symbol BTC-USD

# 3. Analyze the symbol
dwlf chart BTC-USD --indicators --volume
dwlf indicators BTC-USD --indicators rsi,macd

# 4. Open trade (interactive)
dwlf trades open BTC-USD

# 5. Monitor trade
dwlf trades details trade_123

# 6. Close when target hit
dwlf trades close trade_123
```

### Risk Management Check

```bash
#!/bin/bash
# risk-check.sh - Portfolio risk assessment

echo "=== Risk Management Check ==="

# Current positions
echo "Open Positions:"
dwlf trades --status open --format table

# Portfolio allocation
echo "Portfolio Breakdown:"
dwlf portfolio --breakdown

# Check for correlation (manual review needed)
echo "Symbol Correlations (Review manually):"
dwlf price $(dwlf trades --status open --format json | jq -r '.[].symbol' | sort -u | tr '\n' ' ')
```

### Rebalancing Workflow

```bash
#!/bin/bash
# rebalance.sh - Portfolio rebalancing

TARGET_SYMBOLS=("BTC-USD" "ETH-USD" "AAPL" "NVDA")
TARGET_ALLOCATION=0.25  # 25% each

echo "=== Portfolio Rebalancing ==="

# 1. Current allocation
dwlf portfolio --breakdown

# 2. Current prices for target symbols
dwlf price ${TARGET_SYMBOLS[@]}

# 3. Show open positions
dwlf trades --status open

echo "Manual Action Required:"
echo "1. Review current allocations above"
echo "2. Calculate required adjustments"
echo "3. Execute rebalancing trades"
```

## Strategy Analysis

### Strategy Performance Review

```bash
#!/bin/bash
# strategy-review.sh - Analyze strategy performance

STRATEGY_ID="your_strategy_id"

echo "=== Strategy Performance Review ==="

# Strategy details and stats
dwlf strategies details $STRATEGY_ID

# Recent signals from this strategy
dwlf strategies signals $STRATEGY_ID

# Backtest performance
echo "Running backtest..."
dwlf backtest $STRATEGY_ID --start 2024-01-01 --end 2024-12-31
```

### Multi-Strategy Comparison

```bash
#!/bin/bash
# compare-strategies.sh - Compare multiple strategies

STRATEGIES=("strategy_1" "strategy_2" "strategy_3")

echo "=== Strategy Comparison ==="

for strategy in "${STRATEGIES[@]}"; do
    echo "--- $strategy ---"
    dwlf strategies details $strategy | grep -E "(Win Rate|Total Return|Sharpe Ratio)"
    echo
done

# Run backtests for comparison
for strategy in "${STRATEGIES[@]}"; do
    echo "Backtesting $strategy..."
    dwlf backtest $strategy --symbols BTC-USD,ETH-USD --start 2024-01-01
done
```

## Research Workflows

### Symbol Research Deep Dive

```bash
#!/bin/bash
# research.sh - Deep dive into a symbol

SYMBOL=${1:-"BTC-USD"}

echo "=== Research: $SYMBOL ==="

# 1. Current price and overview
dwlf price $SYMBOL --format table

# 2. Technical analysis
echo "Technical Indicators:"
dwlf indicators $SYMBOL --format table

# 3. Chart analysis
echo "Price Chart (Last 30 days):"
dwlf chart $SYMBOL --period 30 --indicators --volume

# 4. Recent events
echo "Recent Events:"
dwlf events --symbol $SYMBOL --days 7

# 5. Trading signals
echo "Active Signals:"
dwlf signals --symbol $SYMBOL

echo "=== Research Complete for $SYMBOL ==="
```

### Market Sector Analysis

```bash
#!/bin/bash
# sector-analysis.sh - Analyze market sectors

# Tech stocks
TECH=("AAPL" "NVDA" "MSFT" "GOOGL" "TSLA")

# Crypto
CRYPTO=("BTC-USD" "ETH-USD" "SOL-USD")

# Traditional
TRADITIONAL=("SPY" "QQQ" "DIA")

echo "=== Sector Analysis ==="

echo "Technology Sector:"
dwlf price ${TECH[@]} --sort change --reverse

echo "Cryptocurrency:"
dwlf price ${CRYPTO[@]} --sort change --reverse

echo "Traditional Markets:"
dwlf price ${TRADITIONAL[@]} --sort change --reverse
```

### Event-Driven Research

```bash
#!/bin/bash
# event-research.sh - Research based on recent events

echo "=== Event-Driven Research ==="

# 1. Get recent events
echo "Recent Market Events:"
dwlf events --days 3 --format table

# 2. Focus on symbols with recent events
SYMBOLS_WITH_EVENTS=$(dwlf events --days 1 --format json | jq -r '.[].symbol' | sort -u)

echo "Symbols with Recent Events:"
echo $SYMBOLS_WITH_EVENTS

# 3. Analyze each symbol
for symbol in $SYMBOLS_WITH_EVENTS; do
    echo "--- Analyzing $symbol ---"
    dwlf chart $symbol --period 5
    dwlf indicators $symbol --indicators rsi,macd
done
```

## Automation Scripts

### Automated Signal Scanner

```bash
#!/bin/bash
# signal-scanner.sh - Automated signal detection

echo "=== Automated Signal Scanner ==="

# 1. Get all active signals
SIGNALS=$(dwlf signals --format json)

# 2. Filter high-confidence signals (example criteria)
HIGH_CONFIDENCE=$(echo $SIGNALS | jq '.[] | select(.confidence > 0.8)')

if [ -n "$HIGH_CONFIDENCE" ]; then
    echo "🚨 High Confidence Signals Found:"
    echo $HIGH_CONFIDENCE | jq -r '.symbol + " - " + .strategy + " (Confidence: " + (.confidence | tostring) + ")"'
    
    # Optional: Send notification (customize as needed)
    # echo "High confidence signals detected" | mail -s "DWLF Alert" user@example.com
else
    echo "No high confidence signals at this time."
fi
```

### Portfolio Monitoring

```bash
#!/bin/bash
# monitor.sh - Continuous portfolio monitoring

while true; do
    clear
    date
    echo "=== Live Portfolio Monitor ==="
    
    # Portfolio overview
    dwlf portfolio --format table
    
    # Open trades
    echo
    echo "Open Trades:"
    dwlf trades --status open --format table
    
    # Recent signals
    echo
    echo "Latest Signals:"
    dwlf signals --limit 5
    
    # Wait 5 minutes
    sleep 300
done
```

### Daily Report Generator

```bash
#!/bin/bash
# daily-report.sh - Generate daily trading report

DATE=$(date +%Y-%m-%d)
REPORT_FILE="dwlf-report-$DATE.txt"

echo "=== DWLF Daily Report - $DATE ===" > $REPORT_FILE
echo >> $REPORT_FILE

# Portfolio performance
echo "PORTFOLIO PERFORMANCE:" >> $REPORT_FILE
dwlf portfolio --period 1d >> $REPORT_FILE
echo >> $REPORT_FILE

# Closed trades
echo "TRADES CLOSED TODAY:" >> $REPORT_FILE
dwlf trades --status closed | head -10 >> $REPORT_FILE
echo >> $REPORT_FILE

# Active signals
echo "ACTIVE SIGNALS:" >> $REPORT_FILE
dwlf signals --limit 10 >> $REPORT_FILE
echo >> $REPORT_FILE

# Market events
echo "MARKET EVENTS:" >> $REPORT_FILE
dwlf events --days 1 >> $REPORT_FILE

echo "Daily report saved to: $REPORT_FILE"
```

## Integration Examples

### JSON Output Integration

```bash
# Get data for external processing
dwlf portfolio --format json > portfolio.json
dwlf signals --format json > signals.json
dwlf events --format json > events.json

# Process with jq
cat portfolio.json | jq '.positions[] | select(.pnlPct > 5)'
cat signals.json | jq '.[] | select(.confidence > 0.8) | .symbol'
```

### Custom Dashboard Data

```bash
#!/bin/bash
# dashboard-data.sh - Generate data for custom dashboard

{
    echo '{'
    echo '  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",'
    echo '  "portfolio": '$(dwlf portfolio --format json)','
    echo '  "signals": '$(dwlf signals --limit 20 --format json)','
    echo '  "events": '$(dwlf events --days 1 --format json)','
    echo '  "watchlist": '$(dwlf watchlist --prices --format json)
    echo '}'
} > dashboard-data.json
```

These workflows provide a foundation for building your own trading and analysis routines with the DWLF CLI. Customize them based on your specific needs and trading style.