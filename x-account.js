exports.handler = async (event) => {
  const username = (event.headers.cookie || '').match(/x_username=([^;]+)/)?.[1];

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      configured: !!process.env.X_CLIENT_ID,
      username: username || null
    })
  };
};
