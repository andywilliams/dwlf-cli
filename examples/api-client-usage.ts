import { DWLFApiClient, normalizeSymbol } from '../src/api-client';

/**
 * Example usage of the enhanced DWLF API client
 */
async function exampleUsage() {
  // Create client with rate limiting and retry configuration
  const client = new DWLFApiClient({
    apiKey: 'dwlf_sk_your_api_key_here',
    timeout: 10000,
    maxRetries: 3,
    retryDelay: 1000,
    rateLimit: {
      requests: 10,    // Max 10 requests
      per: 1000       // Per 1 second
    }
  });

  try {
    // Test API connectivity
    const isConnected = await client.testConnectivity();
    console.log('API Connected:', isConnected);

    // Validate API key
    const validation = await client.validateApiKey();
    console.log('API Key Valid:', validation.valid);

    // Normalize symbols
    console.log(normalizeSymbol('BTC'));      // BTC-USD
    console.log(normalizeSymbol('AAPL'));     // AAPL
    console.log(normalizeSymbol('ETH/USD'));  // ETH-USD

    // Make API requests with automatic retry and rate limiting
    const portfolios = await client.get('/portfolios');
    console.log('Portfolios:', portfolios);

    const marketData = await client.get('/market-data', { 
      symbol: 'BTC-USD',
      timeframe: 'daily' 
    });
    console.log('Market Data:', marketData);

  } catch (error: any) {
    if (error.isApiError) {
      console.error('API Error:', error.message, 'Status:', error.status);
    } else {
      console.error('Unexpected Error:', error.message);
    }
  }
}

// Example of creating a client for different environments
function createClientForEnvironment(env: 'dev' | 'prod') {
  const config = {
    dev: {
      baseUrl: 'https://api-dev.dwlf.co.uk',
      timeout: 5000,
      maxRetries: 1
    },
    prod: {
      baseUrl: 'https://api.dwlf.co.uk',
      timeout: 30000,
      maxRetries: 3,
      rateLimit: {
        requests: 100,
        per: 60000  // 100 requests per minute
      }
    }
  };

  return new DWLFApiClient({
    apiKey: process.env.DWLF_API_KEY,
    ...config[env]
  });
}

// Export for use in other modules
export { exampleUsage, createClientForEnvironment };