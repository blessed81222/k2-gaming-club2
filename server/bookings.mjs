import { sendBookingNotification } from "./vkNotify.mjs";
import { randomUUID } from "node:crypto";
import { supabase } from "./supabase.mjs";
import {
  cancelGizmoReservation,
  createGizmoReservation,
  getGizmoConfigStatus,
} from "./gizmo.mjs";

function mapBooking(row) {
  return {
    id: row.id,
    computerId: row.computer_id,
    zone: row.zone,
    clientName: row.client_name,
    phone: row.phone,
    date: row.booking_date,
    time: row.booking_time,
    duration: row.duration_hours,
    price: row.price,
    packageType: row.package_type,
    vkUserId: row.vk_user_id ?? null,
    gizmoReservationId: row.gizmo_reservation_id ?? null,
    gizmoSyncStatus: row.gizmo_sync_status ?? "disabled",
  };
}

function createError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function toBookingStart(date, time) {
  const [year, month, day] = String(date).split("-").map(Number);
  const [hour, minute] = String(time).split(":").map(Number);

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export async function listBookings(date) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("booking_date", date)
    .order("booking_time", { ascending: true });

  if (error) throw error;

  return (data || []).map(mapBooking);
}

export async function listMyBookings(vkUserId) {
  const normalizedVkUserId = String(vkUserId || "").trim();

  if (!normalizedVkUserId) {
    return [];
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("vk_user_id", normalizedVkUserId)
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true });

  if (error) throw error;

  return (data || []).map(mapBooking);
}

export async function createBooking(body) {
  const computerId = Number(body?.computerId);
  const zone = String(body?.zone || "");
  const clientName = String(body?.clientName || "").trim();
  const phone = String(body?.phone || "").trim();
  const date = String(body?.date || "");
  const time = String(body?.time || "");
  const duration = Number(body?.duration);
  const price = Number(body?.price);
  const packageType = String(body?.packageType || "hourly");
  const vkUserId = body?.vkUserId
    ? String(body.vkUserId).trim()
    : null;

  if (
    !Number.isInteger(computerId) ||
    !zone ||
    !clientName ||
    !phone ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}(?::\d{2})?$/.test(time) ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Number.isFinite(price)
  ) {
    throw new Error("Invalid booking data");
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("computer_id", computerId)
    .eq("booking_date", date);

  if (existingError) {
    throw existingError;
  }

  const newStart = toBookingStart(date, time);
  const newEnd = new Date(
    newStart.getTime() + duration * 60 * 60 * 1000
  );

  const conflict = (existingRows || []).find((row) => {
    const oldStart = toBookingStart(
      row.booking_date,
      row.booking_time
    );

    const oldEnd = new Date(
      oldStart.getTime() +
        Number(row.duration_hours) * 60 * 60 * 1000
    );

    return newStart < oldEnd && newEnd > oldStart;
  });

  if (conflict) {
    const mapped = mapBooking(conflict);

    throw Object.assign(
      createError(
        "Этот ПК уже занят на выбранное время.",
        "BOOKING_CONFLICT"
      ),
      {
        conflict: mapped,
      }
    );
  }

  const cancelToken = randomUUID();

  const startAt = toBookingStart(date, time);

  const endAt = new Date(
    startAt.getTime() + duration * 60 * 60 * 1000
  );

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      computer_id: computerId,
      zone,
      client_name: clientName,
      phone,
      booking_date: date,
      booking_time: time,
      duration_hours: duration,
      price,
      package_type: packageType,
      vk_user_id: vkUserId,
      cancel_token: cancelToken,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  let booking = mapBooking(data);
  let gizmoSyncStatus = "disabled";
  let gizmoReservationId = null;

  try {
    const gizmoResult = await createGizmoReservation(booking);
    gizmoSyncStatus = gizmoResult.status;
    gizmoReservationId = gizmoResult.reservationId;

    if (gizmoReservationId) {
      const { error: gizmoPersistError } = await supabase
        .from("bookings")
        .update({
          gizmo_reservation_id: gizmoReservationId,
          gizmo_sync_status: gizmoSyncStatus,
          gizmo_sync_error: null,
        })
        .eq("id", booking.id);

      if (gizmoPersistError) {
        console.warn(
          "Gizmo reservation was created, but its id was not stored. Apply supabase_gizmo_sync.sql.",
          gizmoPersistError.message
        );
      }
    }
  } catch (gizmoError) {
    console.error("Gizmo booking sync error:", gizmoError);
    gizmoSyncStatus = "error";

    if (getGizmoConfigStatus().required) {
      await supabase.from("bookings").delete().eq("id", booking.id);
      throw createError(
        "Не удалось передать бронь в Gizmo. Попробуйте ещё раз.",
        "GIZMO_SYNC_FAILED"
      );
    }
  }

  booking = {
    ...booking,
    gizmoReservationId,
    gizmoSyncStatus,
  };

  await sendBookingNotification(booking, "created");

  return {
    booking,
    cancelToken: vkUserId ? null : cancelToken,
  };
}

export async function deleteBooking(
  id,
  vkUserId,
  cancelToken
) {
  const normalizedVkUserId = String(vkUserId || "").trim();
  const normalizedCancelToken = String(
    cancelToken || ""
  ).trim();

  const { data: booking, error: findError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (findError) {
    if (findError.code === "PGRST116") {
      throw createError(
        "Бронь не найдена",
        "BOOKING_NOT_OWNER"
      );
    }

    throw findError;
  }

  if (booking.vk_user_id) {
    if (
      !normalizedVkUserId ||
      booking.vk_user_id !== normalizedVkUserId
    ) {
      throw createError(
        "Вы не можете отменить эту бронь",
        "BOOKING_NOT_OWNER"
      );
    }
  } else {
    if (
      !normalizedCancelToken ||
      booking.cancel_token !== normalizedCancelToken
    ) {
      throw createError(
        "Вы не можете отменить эту бронь",
        "BOOKING_NOT_OWNER"
      );
    }
  }

  if (booking.gizmo_reservation_id) {
    try {
      await cancelGizmoReservation(booking.gizmo_reservation_id);
    } catch (gizmoError) {
      console.error("Gizmo cancellation sync error:", gizmoError);
      throw createError(
        "Не удалось отменить бронь в Gizmo. Попробуйте ещё раз.",
        "GIZMO_SYNC_FAILED"
      );
    }
  }

  let deleteQuery = supabase
    .from("bookings")
    .delete()
    .eq("id", id);

  if (booking.vk_user_id) {
    deleteQuery = deleteQuery.eq(
      "vk_user_id",
      normalizedVkUserId
    );
  } else {
    deleteQuery = deleteQuery.eq(
      "cancel_token",
      normalizedCancelToken
    );
  }

  const { error: deleteError } = await deleteQuery;

  if (deleteError) {
    throw deleteError;
  }
}
