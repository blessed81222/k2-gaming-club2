import http from 'node:http';
import { createBooking, deleteBooking, listBookings } from './bookings.mjs';

const PORT = Number(process.env.API_PORT || 8787);
const VK_ID_APP_ID = process.env.VK_ID_APP_ID || '';
const VK_ID_APP_SECRET = process.env.VK_ID_APP_SECRET || '';

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return JSON.parse(body || '{}');
}

async function exchangeVkCode({ code, deviceId, state, codeVerifier, redirectUri }) {
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    device_id: deviceId,
    state,
    code_verifier: codeVerifier,
    client_id: VK_ID_APP_ID,
    redirect_uri: redirectUri,
  });
  if (VK_ID_APP_SECRET) form.set('client_secret', VK_ID_APP_SECRET);

  const response = await fetch('https://id.vk.com/oauth2/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    const message = data.error_description || data.error || 'VK token exchange failed';
    throw new Error(message);
  }

  return data;
}

async function fetchVkUserInfo(accessToken) {
  const form = new URLSearchParams({
    access_token: accessToken,
    client_id: VK_ID_APP_ID,
  });

  const response = await fetch('https://id.vk.com/oauth2/user_info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    const message = data.error_description || data.error || 'VK user info request failed';
    throw new Error(message);
  }

  return data.user || data;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      return sendJson(res, 200, {
        ok: true,
        service: 'k2-api',
        time: new Date().toISOString(),
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/config/public') {
      return sendJson(res, 200, {
        ok: true,
        vkConfigured: Boolean(VK_ID_APP_ID),
        vkAppId: VK_ID_APP_ID || null,
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/bookings') {
      const date = url.searchParams.get('date') || '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return sendJson(res, 400, { ok: false, error: 'Invalid date. Expected YYYY-MM-DD.' });
      }
      const bookings = await listBookings(date);
      return sendJson(res, 200, { ok: true, bookings });
    }

    if (req.method === 'POST' && url.pathname === '/api/bookings') {
      try {
        const body = await readJson(req);
        const booking = await createBooking(body);
        return sendJson(res, 201, { ok: true, booking });
      } catch (error) {
        if (error?.code === 'BOOKING_CONFLICT') {
          return sendJson(res, 409, { ok: false, error: error.message, conflict: error.conflict });
        }
        throw error;
      }
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/api/bookings/')) {
      const id = decodeURIComponent(url.pathname.slice('/api/bookings/'.length));
      if (!id) return sendJson(res, 400, { ok: false, error: 'Booking id is required' });
      await deleteBooking(id);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/vk/exchange') {
      if (!VK_ID_APP_ID) {
        return sendJson(res, 503, { ok: false, error: 'VK_ID_APP_ID is not configured' });
      }

      const body = await readJson(req);
      const { code, deviceId, state, codeVerifier, redirectUri } = body;

      if (!code || !deviceId || !state || !codeVerifier || !redirectUri) {
        return sendJson(res, 400, { ok: false, error: 'Missing VK callback parameters' });
      }

      const tokenData = await exchangeVkCode({
        code,
        deviceId,
        state,
        codeVerifier,
        redirectUri,
      });

      const user = await fetchVkUserInfo(tokenData.access_token);

      return sendJson(res, 200, {
        ok: true,
        user: {
          vkUserId: String(user.user_id ?? user.id ?? ''),
          firstName: user.first_name,
          lastName: user.last_name,
          avatar: user.avatar,
          phone: user.phone,
          email: user.email,
        },
      });
    }

    return sendJson(res, 404, { ok: false, error: 'Not found' });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`K2 API: http://127.0.0.1:${PORT}`);
  console.log(`Health: http://127.0.0.1:${PORT}/api/health`);
});
