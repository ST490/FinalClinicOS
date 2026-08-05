async function testMasterLogin() {
  const res = await fetch('https://careme-smzs.onrender.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'kane@gmail.com',
      password: 'password@123'
    })
  });

  const data = await res.json();
  console.log('Master Login Status:', res.status);
  console.log('Full response body:', JSON.stringify(data, null, 2));
}

testMasterLogin();
