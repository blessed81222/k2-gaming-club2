export async function sendBookingNotification(booking, action = "created") {
  const enabled =
    String(process.env.VK_NOTIFY_ENABLED || "false").toLowerCase() === "true";

  const message =
    action === "cancelled"
      ? [
          "❌ Бронь отменена",
          "",
          `ПК: №${booking.computerId}`,
          `Дата: ${booking.date}`,
          `Время: ${booking.time}`,
          `Длительность: ${booking.duration} ч.`,
          `Клиент: ${booking.clientName}`,
          `Телефон: ${booking.phone}`,
          `Стоимость: ${booking.price} ₽`,
        ].join("\n")
      : [
          "🎮 Новая бронь",
          "",
          `ПК: №${booking.computerId}`,
          `Зона: ${booking.zone}`,
          `Дата: ${booking.date}`,
          `Время: ${booking.time}`,
          `Длительность: ${booking.duration} ч.`,
          `Клиент: ${booking.clientName}`,
          `Телефон: ${booking.phone}`,
          `Стоимость: ${booking.price} ₽`,
        ].join("\n");

  if (!enabled) {
    console.log("\n[VK NOTIFICATION TEST]\n" + message + "\n");
    return;
  }

  console.log(
    "[VK NOTIFICATION] VK sending is enabled, but API transport is not configured yet."
  );
}