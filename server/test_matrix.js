process.env.NODE_ENV = 'test';

const http = require('http');
const prisma = require('./src/config/prisma');
const sessionService = require('./src/services/sessionService');
const { generateAccessToken, hashToken } = require('./src/utils/token');

// Helper for HTTP requests
const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json || data
        });
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'object' ? JSON.stringify(postData) : postData);
    }
    req.end();
  });
};

const parseCookie = (setCookieHeaders, cookieName) => {
  if (!setCookieHeaders) return null;
  const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const c of cookies) {
    if (c.startsWith(`${cookieName}=`)) {
      const parts = c.split(';')[0].split('=');
      return {
        value: parts[1],
        full: c,
        isHttpOnly: c.toLowerCase().includes('httponly')
      };
    }
  }
  return null;
};

async function runTestMatrix() {
  console.log('====================================================');
  console.log('🚀 STARTING COMPREHENSIVE AUTH & SECURITY TEST MATRIX');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, description) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${description}`);
      passed++;
    } else {
      console.log(`  ❌ [FAIL] ${description}`);
      failed++;
    }
  };

  try {
    // ----------------------------------------------------
    // TEST SECTION 1: User Provisioning & Identity Lookup
    // ----------------------------------------------------
    console.log('--- 1. Authentication & User Provisioning ---');

    const adminUser = await prisma.organisation_Users.findFirst({
      where: { user_type: 'ADMIN' },
      include: { User: true }
    });

    const regularUser = await prisma.organisation_Users.findFirst({
      where: { user_type: 'USER' },
      include: { User: true }
    });

    assert(adminUser !== null, 'Admin user exists in database');
    assert(regularUser !== null, 'Regular non-admin user exists in database');

    const sessionA = await sessionService.createSession(regularUser.id, 'Laptop-Browser-UA', '127.0.0.1');
    const sessionB = await sessionService.createSession(regularUser.id, 'Phone-UA', '192.168.1.100');
    const sessionC = await sessionService.createSession(regularUser.id, 'Tablet-UA', '10.0.0.5');

    assert(sessionA.rawRefreshToken && sessionA.session.id, 'Session A (Laptop) created');
    assert(sessionB.rawRefreshToken && sessionB.session.id, 'Session B (Phone) created');
    assert(sessionC.rawRefreshToken && sessionC.session.id, 'Session C (Tablet) created');

    // ----------------------------------------------------
    // TEST SECTION 2: Multi-Device Isolation & Revocation
    // ----------------------------------------------------
    console.log('\n--- 2. Multi-Device Session Isolation & Logout ---');

    // Revoke Session A (Laptop logout)
    await sessionService.revokeSessionByToken(sessionA.rawRefreshToken);

    const checkA = await prisma.session.findUnique({ where: { id: sessionA.session.id } });
    const checkB = await prisma.session.findUnique({ where: { id: sessionB.session.id } });
    const checkC = await prisma.session.findUnique({ where: { id: sessionC.session.id } });

    assert(checkA.isRevoked === true, 'Logout Laptop -> Session A is REVOKED');
    assert(checkB.isRevoked === false, 'Logout Laptop -> Session B remains ACTIVE');
    assert(checkC.isRevoked === false, 'Logout Laptop -> Session C remains ACTIVE');

    // Test Logout All (Logout from all devices)
    await sessionService.revokeAllUserSessions(regularUser.id);

    const checkAllB = await prisma.session.findUnique({ where: { id: sessionB.session.id } });
    const checkAllC = await prisma.session.findUnique({ where: { id: sessionC.session.id } });

    assert(checkAllB.isRevoked === true, 'Logout All Devices -> Session B is REVOKED');
    assert(checkAllC.isRevoked === true, 'Logout All Devices -> Session C is REVOKED');

    // ----------------------------------------------------
    // TEST SECTION 3: Refresh Token Rotation & Theft Detection
    // ----------------------------------------------------
    console.log('\n--- 3. Refresh Token Rotation & Token Theft Reuse Detection ---');

    const freshSession = await sessionService.createSession(regularUser.id, 'Test-Runner', '127.0.0.1');
    const oldToken = freshSession.rawRefreshToken;

    // First rotation (Valid)
    const rotated1 = await sessionService.verifyAndRotateSession(oldToken, 'Test-Runner', '127.0.0.1');
    assert(rotated1 !== null && rotated1.newAccessToken !== null, 'Refresh Token rotated successfully, new access token issued');

    // Attempt to reuse oldToken (Theft simulation!)
    const reuseAttempt = await sessionService.verifyAndRotateSession(oldToken, 'Attacker-UA', '10.0.0.1');
    assert(reuseAttempt === null, 'Reusing old refresh token is REJECTED');

    // Check if reuse detection triggered full family revocation!
    const activeSessionsCount = await prisma.session.count({
      where: { organisation_user_id: regularUser.id, isRevoked: false }
    });
    assert(activeSessionsCount === 0, 'Reusing revoked refresh token triggered AUTOMATIC FAMILY REVOCATION (all sessions revoked)');

    // ----------------------------------------------------
    // TEST SECTION 4: Security & RBAC Enforcement
    // ----------------------------------------------------
    console.log('\n--- 4. Security & RBAC Role Restrictions ---');

    const regUserAccessToken = generateAccessToken({
      id: regularUser.id,
      email: regularUser.User.email
    });

    const adminUserAccessToken = generateAccessToken({
      id: adminUser.id,
      email: adminUser.User.email
    });

    // Regular user attempting admin endpoint GET /api/insights/admin/summary
    const nonAdminRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/insights/admin/summary',
      method: 'GET',
      headers: { Authorization: `Bearer ${regUserAccessToken}` }
    });
    assert(nonAdminRes.statusCode === 403, 'Non-admin user requesting admin endpoint is REJECTED with 403 Forbidden');

    // Admin user requesting admin endpoint
    const adminRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/insights/admin/summary',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminUserAccessToken}` }
    });
    assert(adminRes.statusCode === 200, 'Admin user requesting admin endpoint is ALLOWED with 200 OK');

    // Test CORS rejection on unknown origin
    const corsRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/refresh',
      method: 'POST',
      headers: { Origin: 'http://malicious-attacker-domain.com' }
    });
    assert(!corsRes.headers['access-control-allow-origin'], 'CORS rejects unknown origin http://malicious-attacker-domain.com');

    // ----------------------------------------------------
    // TEST SECTION 5: Concurrent Requests & Single Refresh Execution
    // ----------------------------------------------------
    console.log('\n--- 5. Concurrent Requests & Single Refresh Execution ---');

    const concSession = await sessionService.createSession(regularUser.id, 'Concurrent-Agent', '127.0.0.1');
    const concCookie = `refreshToken=${concSession.rawRefreshToken}`;

    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/refresh',
        method: 'POST',
        headers: { Cookie: concCookie }
      }));
    }

    const results = await Promise.all(promises);
    console.log('Concurrent Status Codes:', results.map(r => r.statusCode));
    const successCount = results.filter(r => r.statusCode === 200).length;
    const rejectedCount = results.filter(r => r.statusCode === 401).length;

    assert(successCount === 1, 'Simultaneous requests: Exactly ONE refresh request succeeds (1 x 200 OK)');
    assert(rejectedCount === 19, 'Simultaneous requests: 19 old rotated token requests rejected (19 x 401 Unauthorized)');

    const validResult = results.find(r => r.statusCode === 200);
    const cookieParsed = parseCookie(validResult?.headers['set-cookie'], 'refreshToken');
    assert(cookieParsed && cookieParsed.isHttpOnly === true, 'Refresh token cookie returned with HttpOnly flag');

    // Clean up test sessions
    await prisma.session.deleteMany({
      where: { organisation_user_id: regularUser.id }
    });

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`📊 TEST MATRIX SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
}

runTestMatrix();
