exports.handler = async (event) => {
  const code = event.queryStringParameters?.code;
  const verifier = (event.headers.cookie || '').match(/x_verifier=([^;]+)/)?.[1];

  if (!code || !verifier) {
    return { statusCode: 302, headers: { Location: '/?x=failed' } };
  }

  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: process.env.X_CLIENT_ID,
    redirect_uri: `${process.env.SITE_URL}/auth/x/callback`,
    code_verifier: verifier
  });

  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64')
    },
    body
  });

  const token = await tokenRes.json();
  if (!token.access_token) {
    return { statusCode: 302, headers: { Location: '/?x=failed' } };
  }

  const userRes = await fetch('https://api.twitter.com/2/users/me', {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  const user = await userRes.json();
  const username = user.data?.username;

  if (!username) {
    return { statusCode: 302, headers: { Location: '/?x=failed' } };
  }

  return {
    statusCode: 302,
    headers: {
      Location: '/?x=connected',
      'Set-Cookie': [
        `x_username=${username}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`,
        `x_verifier=; Path=/; Max-Age=0`
      ]
    }
  };
};
