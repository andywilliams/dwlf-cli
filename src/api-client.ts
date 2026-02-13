import chalk from 'chalk';

export interface ApiValidationResult {
  valid: boolean;
  error?: string;
  userInfo?: {
    email: string;
    permissions: string[];
  };
}

/**
 * Validate an API key by making a test request
 */
export async function validateApiKey(apiKey: string, apiUrl: string = 'https://api.dwlf.co.uk'): Promise<ApiValidationResult> {
  if (!apiKey) {
    return {
      valid: false,
      error: 'API key is required'
    };
  }

  if (!apiKey.startsWith('dwlf_sk_')) {
    return {
      valid: false,
      error: 'API key must start with "dwlf_sk_"'
    };
  }

  try {
    // Try to fetch portfolios to validate the key
    const response = await fetch(`${apiUrl}/v2/portfolios`, {
      method: 'GET',
      headers: {
        'Authorization': `ApiKey ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        // Use status text if JSON parsing fails
        errorMessage = response.statusText || errorMessage;
      }
      
      return {
        valid: false,
        error: errorMessage
      };
    }

    // If we get a successful response, the API key is valid
    await response.json(); // Consume the response
    
    return {
      valid: true,
      userInfo: {
        email: 'Validated successfully',
        permissions: []
      }
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Test API connectivity without authentication
 */
export async function testApiConnectivity(apiUrl: string = 'https://api.dwlf.co.uk'): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET'
    });
    
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Display API validation result with appropriate styling
 */
export function displayValidationResult(result: ApiValidationResult): void {
  if (result.valid && result.userInfo) {
    console.log(chalk.green('✅ API key is valid!'));
    console.log(`   User: ${chalk.cyan(result.userInfo.email)}`);
    if (result.userInfo.permissions.length > 0) {
      console.log(`   Permissions: ${chalk.gray(result.userInfo.permissions.join(', '))}`);
    }
  } else {
    console.log(chalk.red('❌ API key validation failed'));
    if (result.error) {
      console.log(`   Error: ${chalk.yellow(result.error)}`);
    }
  }
}