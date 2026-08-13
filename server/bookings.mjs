import { supabaseRequest, endAtForBooking, toClubDateTime } from './supabase.mjs';

function normalizeBooking(row) {
  return {
    id: String(row.id),
    computerId: Number(row.computer_id),
    zone: row.zone,
    clientName: row.client_name,
    phone: row.phone,
    date: row.booking_date,
    time: String(row.booking_time).slice(0, 5),
    duration: Number(row.duration_hours),
    price: Number(row.price),
    packageType: row.package_type,
    vkUserId: row.vk_user_id ?? null,
  };
}

function assertPayload(payload) {
  const required = ['id', 'computerId', 'zone', 'clientName', 'phone', 'date', 'time', 'duration', 'price', 'packageType'];
  for (const key of required) {
    if (payload[key] === undefined || payload[key] === null || payload[key] === '') {
      throw new Error(`Missing booking field: ${key}`);
    }
  }
}

export async function listBookings(date) {
  const query = new URLSearchParams({
    select: '*',
    booking_date: `eq.${date}`,
    order: 'booking_time.asc',
  });

  const rows = await supabaseRequest(`bookings?${query.toString()}`);
  return rows.map(normalizeBooking);
}

export async function createBooking(payload) {
  assertPayload(payload);

  const duration = Number(payload.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Invalid booking duration');
  }

  const start = toClubDateTime(payload.date, payload.time);
  const end = endAtForBooking(payload.date, payload.time, duration);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid booking date/time');
  }

  // Shared conflict check: another client can already have booked the same PC.
  // We compare real instants so packages crossing midnight are handled correctly.
  const computerId = Number(payload.computerId);
  const conflictQuery = new URLSearchParams({
    select: '*',
    computer_id: `eq.${computerId}`,
    start_at: `lt.${end.toISOString()}`,
    end_at: `gt.${start.toISOString()}`,
    limit: '1',
  });

  const conflicts = await supabaseRequest(`bookings?${conflictQuery.toString()}`);
  if (conflicts.length > 0) {
    const conflict = normalizeBooking(conflicts[0]);
    const conflictEnd = endAtForBooking(conflict.date, conflict.time, conflict.duration);
    throw Object.assign(new Error('Этот ПК уже занят на выбранное время.'), {
      code: 'BOOKING_CONFLICT',
      conflict: {
        ...conflict,
        endTime: conflictEnd.toISOString(),
      },
    });
  }

  const row = {
    id: payload.id,
    computer_id: computerId,
    zone: payload.zone,
    client_name: String(payload.clientName).trim(),
    phone: String(payload.phone).trim(),
    booking_date: payload.date,
    booking_time: payload.time,
    duration_hours: duration,
    price: Number(payload.price),
    package_type: payload.packageType,
    vk_user_id: payload.vkUserId ? String(payload.vkUserId) : null,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
  };

  const rows = await supabaseRequest('bookings', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });

  return normalizeBooking(rows[0]);
}

export async function deleteBooking(id) {
  await supabaseRequest(`bookings?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
