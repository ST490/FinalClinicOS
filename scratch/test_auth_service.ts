import 'dotenv/config';
import { authService } from '../src/auth/auth.service.js';

async function testAuthServiceLocal() {
  try {
    const res = await authService.login({
      email: 'hr.kane@gmail.com',
      password: 'password@123'
    });
    console.log('Local authService.login result:');
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Local authService.login error:', e);
  }
}

testAuthServiceLocal();
