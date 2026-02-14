# DWLF CLI Troubleshooting Guide

Common issues and solutions for the DWLF CLI.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Authentication Problems](#authentication-problems)
- [API Connection Issues](#api-connection-issues)
- [Command Errors](#command-errors)
- [Output Formatting](#output-formatting)
- [Performance Issues](#performance-issues)
- [Getting Help](#getting-help)

## Installation Issues

### NPM Installation Fails

**Problem:** `npm install -g dwlf-cli` fails with permission errors.

**Solutions:**

1. **Use npx (recommended):**
   ```bash
   npx dwlf-cli --help
   ```

2. **Fix npm permissions:**
   ```bash
   # Change npm global directory
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   
   # Then install
   npm install -g dwlf-cli
   ```

3. **Use sudo (not recommended):**
   ```bash
   sudo npm install -g dwlf-cli
   ```

### Node.js Version Issues

**Problem:** CLI fails to run with older Node.js versions.

**Error:** `SyntaxError: Unexpected token` or `ERR_REQUIRE_ESM`

**Solution:** Update Node.js to version 18 or higher.

```bash
# Check current version
node --version

# Install latest LTS
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
nvm use --lts

# Or download from nodejs.org
```

### Binary Not Found

**Problem:** `dwlf: command not found` after installation.

**Solutions:**

1. **Check PATH:**
   ```bash
   echo $PATH
   npm config get prefix
   ```

2. **Add npm bin to PATH:**
   ```bash
   echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Use full path:**
   ```bash
   $(npm config get prefix)/bin/dwlf --version
   ```

## Authentication Problems

### API Key Invalid

**Problem:** `Authentication failed: Invalid API key`

**Solutions:**

1. **Verify API key format:**
   - Should start with `dwlf_sk_`
   - Should be 64+ characters long
   - No spaces or special characters

2. **Re-login with correct key:**
   ```bash
   dwlf logout
   dwlf login --api-key your_correct_key
   ```

3. **Check key permissions:**
   - Ensure key has required scopes
   - Verify key is not expired
   - Contact DWLF support if needed

### Config File Issues

**Problem:** Login succeeds but subsequent commands fail.

**Error:** `Error reading config file` or `Invalid stored credentials`

**Solutions:**

1. **Check config file location:**
   ```bash
   ls -la ~/.dwlf/
   cat ~/.dwlf/config.json
   ```

2. **Reset configuration:**
   ```bash
   rm -rf ~/.dwlf/
   dwlf login
   ```

3. **Fix file permissions:**
   ```bash
   chmod 600 ~/.dwlf/config.json
   ```

### Environment Variables

**Problem:** API key set in environment but not recognized.

**Solution:** Check environment variable name and format:

```bash
# Correct format
export DWLF_API_KEY=dwlf_sk_your_key_here

# Verify it's set
echo $DWLF_API_KEY

# Test with CLI
dwlf price BTC-USD
```

## API Connection Issues

### Network Timeouts

**Problem:** Commands hang or timeout.

**Error:** `Network timeout` or `ECONNRESET`

**Solutions:**

1. **Check internet connection:**
   ```bash
   curl https://api.dwlf.co.uk/v2/health
   ```

2. **Increase timeout (if supported):**
   ```bash
   dwlf config set api.timeout 30000
   ```

3. **Check firewall/proxy:**
   - Corporate networks may block API calls
   - Configure proxy if needed
   - Contact IT if firewall issues

### SSL Certificate Errors

**Problem:** `certificate verify failed` or `CERT_UNTRUSTED`

**Solutions:**

1. **Update certificates:**
   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt upgrade ca-certificates
   
   # macOS
   brew update && brew upgrade
   ```

2. **Node.js certificate issues:**
   ```bash
   # Temporary fix (not recommended for production)
   export NODE_TLS_REJECT_UNAUTHORIZED=0
   dwlf price BTC-USD
   ```

3. **Corporate proxy certificates:**
   - Contact IT for proper certificate installation

### API Rate Limiting

**Problem:** `429 Too Many Requests` errors.

**Solutions:**

1. **Reduce request frequency:**
   - Add delays between commands
   - Use batch operations when available

2. **Check rate limits:**
   ```bash
   # Monitor headers (if CLI supports it)
   dwlf price BTC-USD --verbose
   ```

3. **Upgrade API plan:**
   - Contact DWLF for higher limits

## Command Errors

### Invalid Symbol Format

**Problem:** `Invalid symbol` or `Symbol not found`

**Solutions:**

1. **Check symbol format:**
   ```bash
   # Correct formats
   dwlf price BTC-USD    # Crypto
   dwlf price AAPL       # Stock
   dwlf price EUR/USD    # Forex (if supported)
   ```

2. **List available symbols:**
   ```bash
   dwlf watchlist add --help  # Check documentation
   ```

### Command Not Recognized

**Problem:** `Unknown command` or `Invalid option`

**Solutions:**

1. **Check available commands:**
   ```bash
   dwlf --help
   dwlf trades --help
   ```

2. **Check version compatibility:**
   ```bash
   dwlf --version
   npm list -g dwlf-cli
   ```

3. **Update to latest version:**
   ```bash
   npm update -g dwlf-cli
   ```

### JSON Parsing Errors

**Problem:** `Unexpected token in JSON` or malformed output.

**Solutions:**

1. **Use table format:**
   ```bash
   dwlf price BTC-USD --format table
   ```

2. **Check API response:**
   ```bash
   dwlf price BTC-USD --verbose
   ```

3. **Update CLI:**
   - Newer versions may fix parsing issues

## Output Formatting

### Garbled Characters

**Problem:** Strange characters or formatting issues in terminal.

**Solutions:**

1. **Disable colors:**
   ```bash
   dwlf price BTC-USD --no-color
   # Or set globally
   dwlf config set output.color false
   ```

2. **Check terminal encoding:**
   ```bash
   echo $LANG
   export LANG=en_US.UTF-8
   ```

### Table Formatting Issues

**Problem:** Tables don't align properly or are cut off.

**Solutions:**

1. **Increase terminal width:**
   - Resize terminal window
   - Use full-screen terminal

2. **Use compact format:**
   ```bash
   dwlf price BTC-USD --format compact
   ```

3. **Use JSON for scripting:**
   ```bash
   dwlf price BTC-USD --format json | jq '.[]'
   ```

### Missing Data

**Problem:** Empty tables or "No data" messages.

**Solutions:**

1. **Check symbol validity:**
   ```bash
   dwlf price BTC-USD  # Test with known symbol
   ```

2. **Check date ranges:**
   ```bash
   dwlf events --days 30  # Increase time range
   ```

3. **Verify permissions:**
   - Ensure API key has required scopes

## Performance Issues

### Slow Response Times

**Problem:** Commands take too long to complete.

**Solutions:**

1. **Check network latency:**
   ```bash
   ping api.dwlf.co.uk
   ```

2. **Reduce data requests:**
   ```bash
   # Use fewer symbols
   dwlf price BTC-USD  # Instead of watchlist
   
   # Shorter time periods
   dwlf chart BTC-USD --period 7  # Instead of 30
   ```

3. **Use local caching (if available):**
   ```bash
   dwlf config set cache.enabled true
   ```

### Memory Usage

**Problem:** CLI uses too much memory or crashes.

**Solutions:**

1. **Limit data size:**
   ```bash
   dwlf signals --limit 10  # Reduce result count
   ```

2. **Process data in batches:**
   ```bash
   # Instead of all symbols at once
   for symbol in BTC-USD ETH-USD AAPL; do
       dwlf price $symbol
   done
   ```

## Common Error Messages

### `ENOENT: no such file or directory`

**Cause:** Config file or binary not found.

**Solution:**
```bash
# Reinstall CLI
npm uninstall -g dwlf-cli
npm install -g dwlf-cli

# Or create config directory
mkdir -p ~/.dwlf
```

### `Permission denied`

**Cause:** Insufficient file permissions.

**Solution:**
```bash
# Fix config permissions
chmod 755 ~/.dwlf
chmod 600 ~/.dwlf/config.json

# Or reset config
rm -rf ~/.dwlf && dwlf login
```

### `Invalid JSON response`

**Cause:** API returned non-JSON data (often HTML error page).

**Solution:**
```bash
# Check API status
curl -v https://api.dwlf.co.uk/v2/health

# Try again later if API is down
# Check DWLF status page
```

### `Module not found`

**Cause:** Missing dependencies or corrupted installation.

**Solution:**
```bash
# Reinstall with clean cache
npm cache clean --force
npm uninstall -g dwlf-cli
npm install -g dwlf-cli
```

## Getting Help

### Enable Verbose Mode

Get more detailed error information:

```bash
dwlf price BTC-USD --verbose
```

### Check Version Information

```bash
dwlf --version
node --version
npm --version
```

### Configuration Debugging

```bash
# Show current config
dwlf config

# Test connectivity
dwlf login --test
```

### Log Files

Check for log files (if CLI creates them):

```bash
ls -la ~/.dwlf/logs/
cat ~/.dwlf/logs/dwlf.log
```

### Community Support

1. **GitHub Issues:** Report bugs and feature requests
2. **DWLF Discord:** Community discussions
3. **Documentation:** Check latest docs online
4. **Support Email:** Contact DWLF support team

### Creating Bug Reports

Include this information when reporting issues:

```bash
#!/bin/bash
# debug-info.sh - Collect debug information

echo "=== DWLF CLI Debug Information ==="
echo "Date: $(date)"
echo "Platform: $(uname -a)"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "CLI Version: $(dwlf --version 2>/dev/null || echo "Not installed")"
echo
echo "Environment:"
echo "DWLF_API_KEY: ${DWLF_API_KEY:+[SET]}"
echo "DWLF_BASE_URL: ${DWLF_BASE_URL:-[DEFAULT]}"
echo
echo "Config:"
dwlf config 2>/dev/null || echo "No config found"
echo
echo "Connectivity:"
curl -s https://api.dwlf.co.uk/v2/health || echo "API unreachable"
```

Run this script and include the output with your bug report.