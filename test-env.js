/**
 * Environment Configuration Test Script
 * Tests if all required environment variables are set and working correctly
 * 
 * Usage: node test-env.js
 *        npm run test:env
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // Also load .env if it exists

const { createClient } = require('@supabase/supabase-js');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

// Required environment variables
const requiredEnvVars = {
  'NEXT_PUBLIC_SUPABASE_URL': {
    required: true,
    description: 'Supabase Project URL',
    validate: (value) => {
      if (!value) return { valid: false, error: 'Missing' };
      if (!value.startsWith('https://')) return { valid: false, error: 'Must start with https://' };
      if (!value.includes('.supabase.co')) return { valid: false, error: 'Invalid Supabase URL format' };
      return { valid: true };
    }
  },
  'SUPABASE_SERVICE_ROLE_KEY': {
    required: true,
    description: 'Supabase Service Role Key (for admin operations)',
    validate: (value) => {
      if (!value) return { valid: false, error: 'Missing' };
      if (value.length < 50) return { valid: false, error: 'Key seems too short' };
      if (!value.startsWith('eyJ')) return { valid: false, error: 'Invalid JWT format' };
      return { valid: true };
    }
  },
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
    required: true,
    description: 'Supabase Anonymous Key (for client-side operations)',
    validate: (value) => {
      if (!value) return { valid: false, error: 'Missing' };
      if (value.length < 50) return { valid: false, error: 'Key seems too short' };
      if (!value.startsWith('eyJ')) return { valid: false, error: 'Invalid JWT format' };
      return { valid: true };
    }
  },
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': {
    required: true,
    description: 'Clerk Publishable Key',
    validate: (value) => {
      if (!value) return { valid: false, error: 'Missing' };
      if (!value.startsWith('pk_')) return { valid: false, error: 'Invalid Clerk key format (should start with pk_)' };
      return { valid: true };
    }
  },
  'CLERK_SECRET_KEY': {
    required: true,
    description: 'Clerk Secret Key (for server-side operations)',
    validate: (value) => {
      if (!value) return { valid: false, error: 'Missing' };
      if (!value.startsWith('sk_')) return { valid: false, error: 'Invalid Clerk key format (should start with sk_)' };
      return { valid: true };
    }
  },
};

// Optional environment variables
const optionalEnvVars = {
  'NEXT_PUBLIC_API_BASE_URL': {
    description: 'Backend API Base URL',
    default: 'http://localhost:8000',
    validate: (value) => {
      if (!value) return { valid: true, warning: 'Using default: http://localhost:8000' };
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        return { valid: false, error: 'Must be a valid URL' };
      }
      return { valid: true };
    }
  },
};

async function testSupabaseConnection() {
  log('\n📊 Testing Supabase Connections...', 'blue');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    logError('Cannot test Supabase: Missing required environment variables');
    return { serviceRole: false, anon: false };
  }

  const results = { serviceRole: false, anon: false, adminAccess: false };

  // Test Service Role Key
  try {
    logInfo('Testing Service Role Key connection...');
    const serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Test basic connection by querying a system table
    const { data, error } = await serviceClient.from('users').select('count').limit(0);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
      logError(`Service Role Key test failed: ${error.message}`);
      if (error.message.includes('JWT') || error.message.includes('invalid')) {
        logWarning('  → The service role key may be invalid or expired');
      }
    } else {
      logSuccess('Service Role Key: Connection successful');
      results.serviceRole = true;

      // Test Admin API access
      try {
        logInfo('Testing Admin API access...');
        // Try to list users (admin operation)
        const { data: users, error: adminError } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1 });
        
        if (adminError) {
          if (adminError.message?.includes('not_admin') || adminError.status === 403) {
            logWarning('Admin API access denied: Service role key does not have admin permissions');
            logInfo('  → This is expected if you don\'t own the Supabase project');
            logWarning('  → Without admin access, user creation features (/api/ensure-user) will not work');
            logInfo('  → You may need to request admin access from the project owner');
          } else {
            logError(`Admin API test failed: ${adminError.message}`);
          }
        } else {
          logSuccess('Admin API: Access granted');
          results.adminAccess = true;
        }
      } catch (adminErr) {
        logError(`Admin API test error: ${adminErr.message}`);
      }
    }
  } catch (err) {
    logError(`Service Role Key connection error: ${err.message}`);
  }

  // Test Anonymous Key
  try {
    logInfo('Testing Anonymous Key connection...');
    const anonClient = createClient(supabaseUrl, anonKey);
    
    // Test basic connection
    const { error: anonError } = await anonClient.from('users').select('count').limit(0);
    
    if (anonError && anonError.code !== 'PGRST116') {
      logError(`Anonymous Key test failed: ${anonError.message}`);
    } else {
      logSuccess('Anonymous Key: Connection successful');
      results.anon = true;
    }
  } catch (err) {
    logError(`Anonymous Key connection error: ${err.message}`);
  }

  return results;
}

async function testClerkConfiguration() {
  log('\n🔐 Testing Clerk Configuration...', 'blue');
  
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!publishableKey || !secretKey) {
    logError('Cannot test Clerk: Missing required environment variables');
    return false;
  }

  // Basic format validation
  if (!publishableKey.startsWith('pk_')) {
    logError('Clerk Publishable Key format is invalid');
    return false;
  }

  if (!secretKey.startsWith('sk_')) {
    logError('Clerk Secret Key format is invalid');
    return false;
  }

  logSuccess('Clerk keys format validation passed');
  logInfo('Note: Full Clerk API test requires authentication context');
  
  return true;
}

async function testBackendConnection() {
  log('\n🔌 Testing Backend API Connection...', 'blue');
  
  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  logInfo(`Testing connection to: ${backendUrl}`);

  try {
    // Use dynamic import for node-fetch (ESM module)
    const fetch = (await import('node-fetch')).default;
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${backendUrl}/`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      logSuccess(`Backend API: Connected successfully`);
      logInfo(`  Response: ${JSON.stringify(data)}`);
      return true;
    } else {
      logError(`Backend API: HTTP ${response.status} - ${response.statusText}`);
      return false;
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      logWarning('Backend API: Connection timeout (5s)');
    } else if (err.code === 'ECONNREFUSED') {
      logWarning('Backend API: Connection refused (backend may not be running)');
      logInfo('  → Start the backend with: uvicorn backend.main:app --reload');
    } else if (err.code === 'ETIMEDOUT') {
      logWarning('Backend API: Connection timeout');
    } else {
      logError(`Backend API: ${err.message}`);
    }
    return false;
  }
}

async function main() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🔍 Frontend Environment Configuration Test', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');

  let allValid = true;
  const results = {
    envVars: { passed: 0, failed: 0, warnings: 0 },
    supabase: { serviceRole: false, anon: false, adminAccess: false },
    clerk: false,
    backend: false,
  };

  // Test Required Environment Variables
  log('📋 Checking Required Environment Variables...', 'blue');
  for (const [key, config] of Object.entries(requiredEnvVars)) {
    const value = process.env[key];
    const validation = config.validate(value);

    if (!value && config.required) {
      logError(`${key}: Missing (Required)`);
      log(`    Description: ${config.description}`, 'yellow');
      allValid = false;
      results.envVars.failed++;
    } else if (validation.valid) {
      if (validation.warning) {
        logWarning(`${key}: ${validation.warning}`);
        results.envVars.warnings++;
      } else {
        logSuccess(`${key}: Valid`);
        results.envVars.passed++;
      }
    } else {
      logError(`${key}: Invalid - ${validation.error}`);
      log(`    Description: ${config.description}`, 'yellow');
      allValid = false;
      results.envVars.failed++;
    }
  }

  // Test Optional Environment Variables
  log('\n📋 Checking Optional Environment Variables...', 'blue');
  for (const [key, config] of Object.entries(optionalEnvVars)) {
    const value = process.env[key];
    const validation = config.validate(value);

    if (validation.valid) {
      if (validation.warning) {
        logWarning(`${key}: ${validation.warning}`);
        logInfo(`    Description: ${config.description}`);
        results.envVars.warnings++;
      } else {
        logSuccess(`${key}: Set`);
        logInfo(`    Value: ${value}`);
        results.envVars.passed++;
      }
    } else {
      logError(`${key}: Invalid - ${validation.error}`);
      log(`    Description: ${config.description}`, 'yellow');
      log(`    Default: ${config.default}`, 'yellow');
    }
  }

  // Test Supabase Connection
  if (allValid) {
    const supabaseResults = await testSupabaseConnection();
    results.supabase = supabaseResults;
    
    if (!supabaseResults.serviceRole || !supabaseResults.anon) {
      allValid = false;
    }
  } else {
    logWarning('\n⚠ Skipping Supabase connection tests due to missing environment variables');
  }

  // Test Clerk Configuration
  if (allValid) {
    results.clerk = await testClerkConfiguration();
  } else {
    logWarning('\n⚠ Skipping Clerk tests due to missing environment variables');
  }

  // Test Backend Connection
  results.backend = await testBackendConnection();

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 Test Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`\nEnvironment Variables:`, 'blue');
  log(`  ✓ Passed: ${results.envVars.passed}`, 'green');
  log(`  ✗ Failed: ${results.envVars.failed}`, results.envVars.failed > 0 ? 'red' : 'green');
  log(`  ⚠ Warnings: ${results.envVars.warnings}`, results.envVars.warnings > 0 ? 'yellow' : 'green');

  log(`\nSupabase:`, 'blue');
  log(`  Service Role: ${results.supabase.serviceRole ? '✓' : '✗'}`, results.supabase.serviceRole ? 'green' : 'red');
  log(`  Anonymous Key: ${results.supabase.anon ? '✓' : '✗'}`, results.supabase.anon ? 'green' : 'red');
  log(`  Admin Access: ${results.supabase.adminAccess ? '✓' : '⚠'}`, results.supabase.adminAccess ? 'green' : 'yellow');

  log(`\nClerk: ${results.clerk ? '✓' : '✗'}`, results.clerk ? 'green' : 'red');
  log(`Backend API: ${results.backend ? '✓' : '⚠'}`, results.backend ? 'green' : 'yellow');

  if (allValid && results.supabase.serviceRole && results.supabase.anon && results.clerk) {
    log('\n✅ All critical tests passed! Your environment is configured correctly.', 'green');
    
    // Admin access is optional but important for certain features
    if (!results.supabase.adminAccess) {
      logWarning('\n⚠ Note: Admin API access is not available.');
      logInfo('   This is expected if you don\'t own the Supabase project.');
      logWarning('   Impact: The /api/ensure-user endpoint will fail (500 error).');
      logInfo('   Solution: Request admin access from the project owner, or');
      logInfo('            ask them to create users manually in Supabase.');
    }
    
    if (!results.backend) {
      logWarning('\n⚠ Backend API is not accessible. Make sure the backend is running.');
      logInfo('   This is optional - frontend can work without backend for UI testing.');
    }
    
    process.exit(0);
  } else {
    log('\n❌ Some tests failed. Please fix the issues above.', 'red');
    log('\n💡 Tips:', 'yellow');
    log('   1. Create a .env.local file in the frontend root directory', 'yellow');
    log('   2. Copy values from your Supabase project dashboard (Settings → API)', 'yellow');
    log('   3. Copy values from your Clerk dashboard', 'yellow');
    log('   4. Restart the Next.js dev server after updating .env.local', 'yellow');
    process.exit(1);
  }
}

// Run the tests
main().catch((error) => {
  logError(`\nFatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

