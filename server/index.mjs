import http from "node:http";
import {
  createBooking,
  deleteBooking,
  listBookings,
  listMyBookings,
} from "./bookings.mjs";
import { getGizmoConfigStatus } from "./gizmo.mjs";

const PORT = Number(process.env.API_PORT || 8787);
const VK_ID_APP_ID = process.env.VK_ID_APP_ID || "";
const VK_ID_APP_SECRET = process.env.VK_ID_APP_SECRET || "";

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return JSON.parse(body || "{}");
}

async function exchangeVkCode({ code, deviceId, state, codeVerifier, redirectUri }) {
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    device_id: deviceId,
    state,
    code_verifier: codeVerifier,
    client_id: VK_ID_APP_ID,
    redirect_uri: redirectUri,
  });
  if (VK_ID_APP_SECRET) form.set("client_secret", VK_ID_APP_SECRET);

  const response = await fetch("https://id.vk.com/oauth2/auth", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "VK token exchange failed");
  }
  return data;
}

async function fetchVkUserInfo(accessToken) {
  const form = new URLSearchParams({ access_token: accessToken, client_id: VK_ID_APP_ID });
  const response = await fetch("https://id.vk.com/oauth2/user_info", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "VK user info request failed");
  }
  return data.user || data;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        service: "k2-api",
        gizmo: getGizmoConfigStatus(),
        time: new Date().toISOString(),
      });
    }

    if (req.method === "GET" && url.pathname === "/api/config/public") {
      return sendJson(res, 200, {
        ok: true,
        vkConfigured: Boolean(VK_ID_APP_ID),
        vkAppId: VK_ID_APP_ID || null,
        gizmoConfigured: getGizmoConfigStatus().configured,
      });
    }

    if (req.method === "GET" && url.pathname === "/api/bookings") {
      if (url.searchParams.get("mine") === "true") {
        const vkUserId = String(url.searchParams.get("vkUserId") || "").trim();
        if (!vkUserId) {
          return sendJson(res, 400, { ok: false, error: "vkUserId is required" });
        }
        return sendJson(res, 200, { ok: true, bookings: await listMyBookings(vkUserId) });
      }

      const date = url.searchParams.get("date") || "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return sendJson(res, 400, { ok: false, error: "Invalid date. Expected YYYY-MM-DD." });
      }
      return sendJson(res, 200, { ok: true, bookings: await listBookings(date) });
    }

    if (req.method === "POST" && url.pathname === "/api/bookings") {
      try {
        const result = await createBooking(await readJson(req));
        return sendJson(res, 201, { ok: true, ...result });
      } catch (error) {
        if (error?.code === "BOOKING_CONFLICT") {
          return sendJson(res, 409, {
            ok: false,
            error: error.message,
            conflict: error.conflict,
          });
        }
        if (error?.code === "GIZMO_SYNC_FAILED") {
          return sendJson(res, 502, { ok: false, error: error.message });
        }
        throw error;
      }
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/bookings/")) {
      const id = decodeURIComponent(url.pathname.slice("/api/bookings/".length));
      if (!id) return sendJson(res, 400, { ok: false, error: "Booking id is required" });

      try {
        await deleteBooking(
          id,
          url.searchParams.get("vkUserId") || "",
          url.searchParams.get("cancelToken") || ""
        );
        return sendJson(res, 200, { ok: true });
      } catch (error) {
        if (error?.code === "BOOKING_NOT_OWNER") {
          return sendJson(res, 403, { ok: false, error: error.message });
        }
        if (error?.code === "GIZMO_SYNC_FAILED") {
          return sendJson(res, 502, { ok: false, error: error.message });
        }
        throw error;
      }
    }

    if (req.method === "POST" && url.pathname === "/api/auth/vk/exchange") {
      if (!VK_ID_APP_ID) {
        return sendJson(res, 503, { ok: false, error: "VK_ID_APP_ID is not configured" });
      }
      const body = await readJson(req);
      const { code, deviceId, state, codeVerifier, redirectUri } = body;
      if (!code || !deviceId || !state || !codeVerifier || !redirectUri) {
        return sendJson(res, 400, { ok: false, error: "Missing VK callback parameters" });
      }

      const tokenData = await exchangeVkCode({ code, deviceId, state, codeVerifier, redirectUri });
      const user = await fetchVkUserInfo(tokenData.access_token);
      return sendJson(res, 200, {
        ok: true,
        user: {
          vkUserId: String(user.user_id ?? user.id ?? ""),
          firstName: user.first_name,
          lastName: user.last_name,
          avatar: user.avatar,
          phone: user.phone,
          email: user.email,
        },
      });
    }

    return sendJson(res, 404, { ok: false, error: "Not found" });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`K2 API: http://127.0.0.1:${PORT}`);
  console.log(`Gizmo sync: ${getGizmoConfigStatus().configured ? "configured" : "disabled"}`);
});
