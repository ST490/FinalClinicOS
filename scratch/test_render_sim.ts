import 'dotenv/config';

// Force SUPERUSER_URL to be undefined so we simulate Render environment
delete process.env.SUPERUSER_URL;

import { authService } from '../src/auth/auth.service.js';

async function testRenderSimulatedAuth() {
  console.log('Testing with SUPERUSER_URL unset...');
  try {
    const res = await authService.login({
      email: 'hr.kane@gmail.com',
      password: 'password@123'
    });
    console.log('Result with SUPERUSER_URL unset:');
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

testRenderSimulatedAuth();
