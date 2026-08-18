import { deleteBooking } from "../../server/bookings.mjs";

export default async function handler(req, res) {
  try {
    if (req.method !== "DELETE") {
      res.setHeader("Allow", "DELETE");

      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const id = req.query?.id;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: "Booking id is required",
      });
    }

    const url = new URL(req.url, "https://local.invalid");

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

    return res.status(200).json({
      ok: true,
    });
  } catch (error) {
    console.error("Booking delete error:", error);

    if (error?.code === "BOOKING_NOT_OWNER") {
      return res.status(403).json({
        ok: false,
        error:
          error.message ||
          "Вы не можете отменить эту бронь",
      });
    }

    return res.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
}