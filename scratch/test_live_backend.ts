async function testLiveLogin() {
  const res = await fetch('https://careme-smzs.onrender.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'hr.kane@gmail.com',
      password: 'password@123'
    })
  });

  const data = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('Response body:', JSON.stringify(data, null, 2));
}

testLiveLogin();
