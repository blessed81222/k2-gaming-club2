import { randomBytes } from "node:crypto";

const GIZMO_BASE_URL = String(process.env.GIZMO_BASE_URL || "").replace(/\/+$/, "");
const GIZMO_OPERATOR_USERNAME = String(process.env.GIZMO_OPERATOR_USERNAME || "");
const GIZMO_OPERATOR_PASSWORD = String(process.env.GIZMO_OPERATOR_PASSWORD || "");
const GIZMO_API_VERSION = String(process.env.GIZMO_API_VERSION || "2");
const GIZMO_REQUIRED = String(process.env.GIZMO_REQUIRED || "false").toLowerCase() === "true";

function parseHostMap() {
  try {
    const parsed = JSON.parse(process.env.GIZMO_HOST_MAP || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    console.warn("GIZMO_HOST_MAP is not valid JSON; local PC numbers will be used as host IDs.");
    return {};
  }
}

const HOST_MAP = parseHostMap();

export function getGizmoConfigStatus() {
  const configured = Boolean(
    GIZMO_BASE_URL && GIZMO_OPERATOR_USERNAME && GIZMO_OPERATOR_PASSWORD
  );

  return {
    configured,
    enabled: configured,
    required: configured && GIZMO_REQUIRED,
    apiVersion: GIZMO_API_VERSION,
  };
}

function getHostId(computerId) {
  const mapped = HOST_MAP[String(computerId)] ?? computerId;
  const hostId = Number(mapped);
  if (!Number.isInteger(hostId) || hostId <= 0) {
    throw new Error(`Gizmo host mapping is invalid for PC ${computerId}`);
  }
  return hostId;
}

function createPin() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function createBasicAuthHeader() {
  return `Basic ${Buffer.from(
    `${GIZMO_OPERATOR_USERNAME}:${GIZMO_OPERATOR_PASSWORD}`,
    "utf8"
  ).toString("base64")}`;
}

async function gizmoRequest(path, options = {}) {
  const status = getGizmoConfigStatus();
  if (!status.configured) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${GIZMO_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        Authorization: createBasicAuthHeader(),
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text || null;
    }

    if (!response.ok) {
      const message =
        data?.message || data?.error || data?.title || `Gizmo API returned ${response.status}`;
      throw new Error(String(message));
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function createReservationPayload(booking) {
  const start = `${booking.date}T${String(booking.time).slice(0, 5)}:00+03:00`;
  return {
    userId: null,
    date: start,
    duration: Math.round(Number(booking.duration) * 60),
    contactPhone: booking.phone,
    contactEmail: null,
    note: `K2 ${booking.id} · ${booking.clientName} · ${booking.zone}`,
    pin: createPin(),
    status: 0,
    hosts: [{ hostId: getHostId(booking.computerId) }],
    users: [],
  };
}

export async function createGizmoReservation(booking) {
  if (!getGizmoConfigStatus().configured) {
    return { status: "disabled", reservationId: null };
  }

  const payload = createReservationPayload(booking);

  if (GIZMO_API_VERSION === "1") {
    const params = new URLSearchParams({
      Date: payload.date,
      Duration: String(payload.duration),
      ContactPhone: payload.contactPhone,
      Note: payload.note,
      "Hosts[0].HostId": String(payload.hosts[0].hostId),
    });
    const result = await gizmoRequest(`/api/reservations?${params.toString()}`, {
      method: "PUT",
    });
    const id = Number(result?.id ?? result);
    return { status: "synced", reservationId: Number.isFinite(id) ? id : null };
  }

  const result = await gizmoRequest("/api/v2/reservations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const id = Number(result?.id ?? result?.Id ?? result);
  return { status: "synced", reservationId: Number.isFinite(id) ? id : null };
}

export async function cancelGizmoReservation(reservationId) {
  if (!getGizmoConfigStatus().configured || !reservationId) return;

  if (GIZMO_API_VERSION === "1") {
    await gizmoRequest(`/api/reservations/${encodeURIComponent(reservationId)}/status/1`, {
      method: "POST",
    });
    return;
  }

  await gizmoRequest(`/api/v2/reservations/${encodeURIComponent(reservationId)}`, {
    method: "DELETE",
  });
}
