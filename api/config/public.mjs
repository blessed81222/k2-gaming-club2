export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const appId = process.env.VK_ID_APP_ID || '';

  return res.status(200).json({
    ok: true,
    vkConfigured: Boolean(appId),
    vkAppId: appId || null,
  });
}
