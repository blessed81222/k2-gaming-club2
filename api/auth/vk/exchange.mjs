async function exchangeVkCode({ code, deviceId, state, codeVerifier, redirectUri }) {
  const appId = process.env.VK_ID_APP_ID || '';
  const appSecret = process.env.VK_ID_APP_SECRET || '';

  if (!appId) {
    throw new Error('VK_ID_APP_ID is not configured');
  }

  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    device_id: deviceId,
    state,
    code_verifier: codeVerifier,
    client_id: appId,
    redirect_uri: redirectUri,
  });

  if (appSecret) {
    form.set('client_secret', appSecret);
  }

  const response = await fetch('https://id.vk.com/oauth2/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const message =
      data.error_description || data.error || 'VK token exchange failed';
    throw new Error(message);
  }

  return data;
}

async function fetchVkUserInfo(accessToken) {
  const appId = process.env.VK_ID_APP_ID || '';

  const form = new URLSearchParams({
    access_token: accessToken,
    client_id: appId,
  });

  const response = await fetch('https://id.vk.com/oauth2/user_info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const message =
      data.error_description || data.error || 'VK user info request failed';
    throw new Error(message);
  }

  return data.user || data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      code,
      deviceId,
      state,
      codeVerifier,
      redirectUri,
    } = body;

    if (!code || !deviceId || !state || !codeVerifier || !redirectUri) {
      return res.status(400).json({
        ok: false,
        error: 'Missing VK callback parameters',
      });
    }

    const tokenData = await exchangeVkCode({
      code,
      deviceId,
      state,
      codeVerifier,
      redirectUri,
    });

    const user = await fetchVkUserInfo(tokenData.access_token);

    return res.status(200).json({
      ok: true,
      user: {
        vkUserId: String(user.user_id ?? user.id ?? ''),
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        avatar: user.avatar || '',
        phone: user.phone || '',
        email: user.email || '',
      },
    });
  } catch (error) {
    console.error('VK exchange error:', error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
