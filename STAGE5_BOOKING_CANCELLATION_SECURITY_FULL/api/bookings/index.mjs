import { createBooking, listBookings, listMyBookings } from "../../server/bookings.mjs";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
     
      const mine = url.searchParams.get("mine") === "true";
      const date = String(req.query?.date || url.searchParams.get("date") || "");

      if (mine) {
        const vkUserId = String(req.query?.vkUserId || url.searchParams.get("vkUserId") || "").trim();
        if (!vkUserId) {
          return res.status(400).json({ ok: false, error: "vkUserId is required" });
        }

        const bookings = await listMyBookings(vkUserId);
        return res.status(200).json({ ok: true, bookings });
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ ok: false, error: "Invalid date. Expected YYYY-MM-DD." });
      }

      const bookings = await listBookings(date);
      return res.status(200).json({ ok: true, bookings });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      try {
        const result = await createBooking(body);

return res.status(201).json({
  ok: true,
  booking: result.booking,
  cancelToken: result.cancelToken || null,
});
      } catch (error) {
        if (error?.code === "BOOKING_CONFLICT") {
          return res.status(409).json({ ok: false, error: error.message, conflict: error.conflict });
        }
        throw error;
      }
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error) {
    console.error("Bookings API error:", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}


const vkUserId = String(
  req.query?.vkUserId ||
  url.searchParams.get("vkUserId") ||
  ""
).trim();

const cancelToken = String(
  req.query?.cancelToken ||
  url.searchParams.get("cancelToken") ||
  ""
).trim();

await deleteBooking(
  String(id),
  vkUserId,
  cancelToken
);
