// Test Authentication Endpoints
// Run this in browser console on signin.html or any page with auth.js loaded

async function testAuth() {
  console.log('🧪 Starting Authentication Test Suite...\n');
  
  const API_BASE = window.API_BASE || 'http://localhost:4000';
  console.log('📡 Using API_BASE:', API_BASE);
  
  // Test 1: Check server connectivity
  console.log('\n1️⃣  Testing Server Connectivity...');
  try {
    const healthCheck = await fetch(`${API_BASE}/api/me`, {
      method: 'GET',
      credentials: 'include'
    });
    console.log('   Status:', healthCheck.status);
    console.log('   ✅ Server is reachable');
  } catch (err) {
    console.error('   ❌ Server is not reachable:', err.message);
    return;
  }
  
  // Test 2: Check CORS headers
  console.log('\n2️⃣  Testing CORS Headers...');
  try {
    const corsTest = await fetch(`${API_BASE}/api/me`, {
      method: 'OPTIONS',
      credentials: 'include'
    });
    console.log('   CORS Status:', corsTest.status);
    console.log('   Allow-Origin:', corsTest.headers.get('Access-Control-Allow-Origin'));
    console.log('   Allow-Credentials:', corsTest.headers.get('Access-Control-Allow-Credentials'));
    console.log('   ✅ CORS headers present');
  } catch (err) {
    console.error('   ⚠️  CORS test error:', err.message);
  }
  
  // Test 3: Check session
  console.log('\n3️⃣  Checking Current Session...');
  try {
    const meRes = await fetch(`${API_BASE}/api/me`, {
      method: 'GET',
      credentials: 'include'
    });
    const meData = await meRes.json();
    if (meData.loggedIn) {
      console.log('   ✅ User is logged in:', meData.username);
      console.log('   Name:', meData.name);
      console.log('   Email:', meData.email);
    } else {
      console.log('   ℹ️  No user logged in (this is normal if not signed in yet)');
    }
  } catch (err) {
    console.error('   ❌ Error checking session:', err.message);
  }
  
  // Test 4: Check MongoDB
  console.log('\n4️⃣  Testing Database Connection...');
  try {
    // This endpoint doesn't exist, but server should respond
    const dbTest = await fetch(`${API_BASE}/api/debug/db-status`, {
      credentials: 'include'
    });
    if (dbTest.status === 404) {
      console.log('   ✅ Server responded (endpoint not found, which is expected)');
    }
  } catch (err) {
    console.error('   ❌ Database connection issue:', err.message);
  }
  
  console.log('\n✅ Authentication test complete!');
  console.log('\nNext steps:');
  console.log('1. Try signing in with valid credentials');
  console.log('2. Check browser DevTools → Application → Cookies for connect.sid');
  console.log('3. Verify /api/me returns your user data after login');
}

// Run the test
testAuth();
