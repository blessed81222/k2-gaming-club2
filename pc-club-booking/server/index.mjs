import http from 'node:http';

const PORT = Number(process.env.API_PORT || 8787);

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
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
      vkConfigured: Boolean(process.env.VK_ID_APP_ID),
    });
  }

  return sendJson(res, 404, {
    ok: false,
    error: 'Not found',
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`K2 API: http://127.0.0.1:${PORT}`);
  console.log(`Health: http://127.0.0.1:${PORT}/api/health`);
});
