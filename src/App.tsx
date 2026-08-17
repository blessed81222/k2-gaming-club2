import { useEffect, useState } from "react";
import "./App.css";
import { beginVkLogin, clearStoredVkMeta, getStoredVkMeta, getVkCallbackParams, getVkRedirectUri, initVkLogin } from "./auth/vk";
import type { K2User } from "./auth/types";

type Zone = "Standart" | "Standart +" | "Boot Camp" | "PREMIUM";

type Computer = {
  id: number;
  zone: Zone;
  x: number;
  y: number;
};

type Booking = {
  id: string;
  computerId: number;
  zone: Zone;
  clientName: string;
  phone: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  packageType: "hourly" | "morning" | "day" | "night" | "daily";
};

const computers: Computer[] = [
  // VIP
  { id: 3, zone: "PREMIUM", x: 9, y: 15 },
  { id: 4, zone: "PREMIUM", x: 19, y: 15 },
  { id: 5, zone: "PREMIUM", x: 29, y: 15 },
  { id: 6, zone: "PREMIUM", x: 39, y: 15 },
  { id: 1, zone: "PREMIUM", x: 19, y: 35 },
  { id: 2, zone: "PREMIUM", x: 9, y: 35 },

  // BOOT CAMP
  { id: 7, zone: "Boot Camp", x: 60, y: 15 },
  { id: 8, zone: "Boot Camp", x: 75, y: 15 },
  { id: 9, zone: "Boot Camp", x: 91, y: 15 },
  { id: 10, zone: "Boot Camp", x: 91, y: 35 },
  { id: 11, zone: "Boot Camp", x: 75, y: 35 },

  // STANDART +
  { id: 12, zone: "Standart +", x: 59, y: 54 },
  { id: 13, zone: "Standart +", x: 70, y: 54 },
  { id: 14, zone: "Standart +", x: 70, y: 66 },
  { id: 15, zone: "Standart +", x: 59, y: 66 },
  { id: 16, zone: "Standart +", x: 30, y: 66 },
  { id: 17, zone: "Standart +", x: 30, y: 54 },

  // STANDART
  { id: 18, zone: "Standart", x: 59, y: 80 },
  { id: 19, zone: "Standart", x: 70, y: 80 },
  { id: 20, zone: "Standart", x: 70, y: 91 },
  { id: 21, zone: "Standart", x: 59, y: 91 },
  { id: 22, zone: "Standart", x: 50, y: 91 },
  { id: 23, zone: "Standart", x: 40, y: 91 },
  { id: 24, zone: "Standart", x: 30, y: 91 },
  { id: 25, zone: "Standart", x: 30, y: 80 },
];

const prices = {
  Standart: {
    hourly: {
      day: {
        one: { weekday: 130, weekend: 140 },
        three: { weekday: 360, weekend: 370 },
        five: { weekday: 460, weekend: 470 },
      },
      night: {
        one: { weekday: 140, weekend: 150 },
        three: { weekday: 370, weekend: 380 },
        five: { weekday: 470, weekend: 480 },
      },
    },
    packages: {
      morning: { weekday: 290, weekend: 390 },
      day: { weekday: 540, weekend: 690 },
      night: { weekday: 590, weekend: 690 },
      daily: { weekday: 1400, weekend: 1500 },
    },
  },
  "Standart +": {
    hourly: {
      day: {
        one: { weekday: 140, weekend: 150 },
        three: { weekday: 370, weekend: 380 },
        five: { weekday: 470, weekend: 480 },
      },
      night: {
        one: { weekday: 150, weekend: 160 },
        three: { weekday: 380, weekend: 390 },
        five: { weekday: 480, weekend: 490 },
      },
    },
    packages: {
      morning: { weekday: 320, weekend: 350 },
      day: { weekday: 590, weekend: 650 },
      night: { weekday: 630, weekend: 660 },
      daily: { weekday: 1500, weekend: 1600 },
    },
  },
  "Boot Camp": {
    hourly: {
      day: {
        one: { weekday: 150, weekend: 160 },
        three: { weekday: 430, weekend: 460 },
        five: { weekday: 570, weekend: 590 },
      },
      night: {
        one: { weekday: 160, weekend: 170 },
        three: { weekday: 450, weekend: 480 },
        five: { weekday: 600, weekend: 610 },
      },
    },
    packages: {
      morning: { weekday: 390, weekend: 440 },
      day: { weekday: 700, weekend: 750 },
      night: { weekday: 690, weekend: 790 },
      daily: { weekday: 1800, weekend: 2000 },
    },
  },
  PREMIUM: {
    hourly: {
      day: {
        one: { weekday: 160, weekend: 170 },
        three: { weekday: 470, weekend: 500 },
        five: { weekday: 790, weekend: 800 },
      },
      night: {
        one: { weekday: 170, weekend: 180 },
        three: { weekday: 500, weekend: 510 },
        five: { weekday: 800, weekend: 810 },
      },
    },
    packages: {
      morning: { weekday: 470, weekend: 530 },
      day: { weekday: 790, weekend: 850 },
      night: { weekday: 790, weekend: 840 },
      daily: { weekday: 2000, weekend: 2200 },
    },
  },
};

const VK_USER_STORAGE_KEY = "k2_vk_user";
const GUEST_BOOKINGS_STORAGE_KEY = "k2_guest_bookings";

function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function createLocalDate(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function isWeekend(date: string): boolean {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  return weekday === 0 || weekday === 6;
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

function calculatePrice(
  zone: string,
  date: string,
  time: string,
  duration: number,
  packageType: Booking["packageType"]
): number {
  const zonePrices = prices[zone as keyof typeof prices];
  if (!zonePrices) return 0;

  const weekendKey = isWeekend(date) ? "weekend" : "weekday";

  if (packageType === "hourly") {
    const hour = Number(time.split(":")[0]);
    const period = hour >= 8 && hour < 22 ? "day" : "night";
    const durationKey = duration === 1 ? "one" : duration === 3 ? "three" : "five";
    return zonePrices.hourly[period][durationKey][weekendKey];
  }

  return zonePrices.packages[packageType][weekendKey];
}

function normalizeVkUser(user: any): K2User | null {
  if (!user) return null;

  const rawId = user.vkUserId ?? user.id ?? user.userId ?? user.sub;
  if (!rawId) {
    console.warn("VK user has no id:", user);
    return null;
  }

  return {
    ...user,
    vkUserId: String(rawId),
  } as K2User;
}

function loadGuestBookings(): Booking[] {
  try {
    const saved = localStorage.getItem(GUEST_BOOKINGS_STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => item?.booking)
      .filter(Boolean) as Booking[];
  } catch {
    return [];
  }
}

function saveGuestBooking(booking: Booking, cancelToken: string) {
  const saved = localStorage.getItem(GUEST_BOOKINGS_STORAGE_KEY);
  let parsed: Array<{ booking: Booking; cancelToken: string }> = [];

  try {
    const value = saved ? JSON.parse(saved) : [];
    parsed = Array.isArray(value) ? value : [];
  } catch {
    parsed = [];
  }

  const next = parsed.filter((item) => item?.booking?.id !== booking.id);
  next.push({ booking, cancelToken });
  localStorage.setItem(GUEST_BOOKINGS_STORAGE_KEY, JSON.stringify(next));
}

function getGuestBookingToken(id: string): string | null {
  try {
    const saved = localStorage.getItem(GUEST_BOOKINGS_STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return null;

    const match = parsed.find((item) => item?.booking?.id === id);
    return match?.cancelToken ? String(match.cancelToken) : null;
  } catch {
    return null;
  }
}

function removeGuestBooking(id: string) {
  try {
    const saved = localStorage.getItem(GUEST_BOOKINGS_STORAGE_KEY);
    if (!saved) return;

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return;

    const next = parsed.filter((item) => item?.booking?.id !== id);
    localStorage.setItem(GUEST_BOOKINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore local storage errors.
  }
}

function loadStoredVkUser(): K2User | null {
  try {
    const saved = localStorage.getItem(VK_USER_STORAGE_KEY);
    if (!saved) return null;

    return normalizeVkUser(JSON.parse(saved));
  } catch (error) {
    console.error("Ошибка загрузки VK пользователя:", error);
    return null;
  }
}

function App() {
  const today = getToday();

  const [vkConfigured, setVkConfigured] = useState(false);
  const [vkUser, setVkUser] = useState<K2User | null>(() => loadStoredVkUser());
  const [vkLoading, setVkLoading] = useState(false);
  const [vkError, setVkError] = useState("");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>(() => loadGuestBookings());
  const [, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [myBookingsOpen, setMyBookingsOpen] = useState(false);

  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState(1);
  const [packageType, setPackageType] = useState<Booking["packageType"]>("hourly");

  const selectedComputer = computers.find((pc) => pc.id === selected);

  // Загрузка конфигурации VK
  useEffect(() => {
    let cancelled = false;

    async function loadVkConfig() {
      try {
        const response = await fetch("/api/config/public");
        const data = await response.json();
        if (!cancelled && data.vkConfigured && data.vkAppId) {
          setVkConfigured(true);
          initVkLogin(Number(data.vkAppId));
        }
      } catch (error) {
        console.error("VK config error:", error);
      }
    }

    loadVkConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  // Обработка VK callback
  useEffect(() => {
    const callback = getVkCallbackParams();
    if (!callback) return;

    const meta = getStoredVkMeta();
    if (!meta || meta.state !== callback.state) {
      setVkError("Не удалось проверить авторизацию VK ID (state).");
      return;
    }

    setVkLoading(true);
    setVkError("");

    fetch("/api/auth/vk/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...callback,
        codeVerifier: meta.codeVerifier,
        redirectUri: getVkRedirectUri(),
      }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Ошибка VK авторизации");
        return data;
      })
      .then((data) => {
        const user = normalizeVkUser(data.user);

        if (!user) {
          throw new Error("VK не вернул идентификатор пользователя");
        }

        setVkUser(user);
        localStorage.setItem(VK_USER_STORAGE_KEY, JSON.stringify(user));
        clearStoredVkMeta();
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch((error) => {
        console.error("VK exchange error:", error);
        setVkError(error instanceof Error ? error.message : "Ошибка VK авторизации");
      })
      .finally(() => {
        setVkLoading(false);
      });
  }, []);

  // Загрузка общих броней
  useEffect(() => {
    let cancelled = false;

    async function loadSharedBookings() {
      try {
        setBookingsLoading(true);
        const response = await fetch(
          `/api/bookings?date=${encodeURIComponent(date)}&_=${Date.now()}`,
          { cache: "no-store" }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Не удалось загрузить брони");
        if (!cancelled) {
          setBookings(data.bookings || []);
          setBookingsError("");
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Bookings load error:", error);
          setBookingsError(error instanceof Error ? error.message : "Ошибка загрузки броней");
        }
      } finally {
        if (!cancelled) setBookingsLoading(false);
      }
    }

    loadSharedBookings();
    const interval = window.setInterval(loadSharedBookings, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [date]);

  // Загрузка моих броней с сервера
  useEffect(() => {
    if (!vkUser?.vkUserId) {
      setMyBookings([]);
      return;
    }

    async function fetchMyBookings() {
      try {
        const response = await fetch(
          `/api/bookings?mine=true&vkUserId=${encodeURIComponent(vkUser!.vkUserId)}`
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Не удалось загрузить мои брони");
        }
        setMyBookings(data.bookings || []);
      } catch (error) {
        console.error("My bookings error:", error);
        setMyBookings([]);
      }
    }

    fetchMyBookings();
  }, [vkUser?.vkUserId]);

  function isComputerBusy(computerId: number): boolean {
    const startNew = createLocalDate(date, time);
    const endNew = new Date(startNew.getTime() + duration * 60 * 60 * 1000);

    return bookings.some((booking) => {
      if (booking.computerId !== computerId) return false;
      const startOld = createLocalDate(booking.date, booking.time);
      const endOld = new Date(startOld.getTime() + booking.duration * 60 * 60 * 1000);
      return startNew < endOld && endNew > startOld;
    });
  }

  function getBlockingBooking(computerId: number): Booking | null {
    const startNew = createLocalDate(date, time);
    const endNew = new Date(startNew.getTime() + duration * 60 * 60 * 1000);

    return (
      bookings.find((booking) => {
        if (booking.computerId !== computerId) return false;
        const startOld = createLocalDate(booking.date, booking.time);
        const endOld = new Date(startOld.getTime() + booking.duration * 60 * 60 * 1000);
        return startNew < endOld && endNew > startOld;
      }) || null
    );
  }

  function getBookingUntilLabel(computerId: number): string | null {
    const booking = getBlockingBooking(computerId);
    if (!booking) return null;

    const end = new Date(
      createLocalDate(booking.date, booking.time).getTime() + booking.duration * 60 * 60 * 1000
    );

    return `до ${formatTime(end)}`;
  }

  function handleComputerClick(id: number) {
    setSelected(id);
    setBookingOpen(true);
  }

  function closeBookingModal() {
    setBookingOpen(false);
    setSelected(null);
  }

  async function createBooking() {
    if (selected === null || !clientName.trim() || !phone.trim()) {
      alert("Заполни имя и телефон.");
      return;
    }
    if (!date || !time) {
      alert("Выбери дату и время.");
      return;
    }

    const now = new Date();
    now.setSeconds(0, 0);
    const bookingDateTime = createLocalDate(date, time);

    if (bookingDateTime <= now) {
      alert("Нельзя создать бронь на прошедшее время.");
      return;
    }

    const computer = computers.find((pc) => pc.id === selected);
    if (!computer) {
      alert("Компьютер не найден.");
      return;
    }

    if (isComputerBusy(selected)) {
      alert("Этот ПК уже занят на выбранное время.");
      return;
    }

    const price = calculatePrice(computer.zone, date, time, duration, packageType);

    const newBooking: Booking = {
      id: crypto.randomUUID(),
      computerId: selected,
      zone: computer.zone,
      clientName: clientName.trim(),
      phone: phone.trim(),
      date,
      time,
      duration,
      price,
      packageType,
    };

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newBooking,
          vkUserId: vkUser?.vkUserId || null,
        }),
      });

      const data = await response.json();
      if (response.status === 409) {
        alert(data.error || "Этот ПК уже занят на выбранное время.");
        return;
      }
      if (!response.ok) {
        throw new Error(data.error || "Не удалось создать бронь");
      }

      const savedBooking = data.booking as Booking;

      if (!vkUser?.vkUserId && data.cancelToken) {
        saveGuestBooking(savedBooking, String(data.cancelToken));
      }

      setBookings((prev) => [...prev, savedBooking]);
      setMyBookings((prev) => [...prev, savedBooking]);
      setBookingOpen(false);
      setSelected(null);
      setClientName("");
      setPhone("");

      alert(`Бронь создана!\n\nПК №${computer.id}\nСтоимость: ${price} ₽`);
    } catch (error) {
      console.error("Create booking error:", error);
      alert(error instanceof Error ? error.message : "Не удалось создать бронь");
    }
  }

  async function cancelBooking(id: string) {
    try {
      const vkUserId = vkUser?.vkUserId || "";
      const cancelToken = vkUserId ? "" : getGuestBookingToken(id) || "";

      const params = new URLSearchParams();
      if (vkUserId) params.set("vkUserId", vkUserId);
      if (cancelToken) params.set("cancelToken", cancelToken);

      const query = params.toString();
      const response = await fetch(
        `/api/bookings/${encodeURIComponent(id)}${query ? `?${query}` : ""}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не удалось отменить бронь");
      }

      if (!vkUserId) {
        removeGuestBooking(id);
      }

      setBookings((prev) => prev.filter((item) => item.id !== id));
      setMyBookings((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Cancel booking error:", error);
      alert(error instanceof Error ? error.message : "Не удалось отменить бронь");
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <h1>K2 <span>Gaming Club</span></h1>
          <p>Бронирование компьютеров</p>
        </div>
        <div className="header-contact">
          <div className="work-time">🔥Работаем 24/7 — всегда на связи!</div>
          <div className="address">📍ул. Большая Московская, д. 140</div>
          <div className="phone">📲Контакты: <a href="tel:+78162273777">8 (8162) 273-777</a></div>
        </div>

        {vkUser ? (
  <button
    className="vk-profile-btn"
    type="button"
    title="Личный кабинет"
    onClick={() => setMyBookingsOpen(true)}
  >
    <span className="vk-avatar">
      {vkUser.firstName?.[0] || "VK"}
    </span>

    <span>
      {[vkUser.firstName, vkUser.lastName]
        .filter(Boolean)
        .join(" ") || "Профиль"}
    </span>
  </button>
) : (
          <button
            className="vk-login-btn"
            type="button"
            disabled={!vkConfigured || vkLoading}
            onClick={() => beginVkLogin()}
            title={vkConfigured ? "Войти через VK ID" : "Сначала настрой VK ID"}
          >
            {vkLoading ? "Вход..." : "Войти через VK"}
          </button>
        )}
        {vkError && <div className="vk-error">{vkError}</div>}

        <button className="my-bookings-btn" onClick={() => setMyBookingsOpen(true)}>
          Мои брони ({myBookings.length})
        </button>
      </header>

      <section className="club-map">
        <div className="map-zone PREMIUM-zone"><h2>PREMIUM</h2></div>
        <div className="map-zone bootcamp-zone"><h2>Boot Camp</h2></div>
        <div className="map-zone standart-plus-zone"><h2>Standart +</h2></div>
        <div className="map-zone standart-zone"><h2>Standart</h2></div>

        {bookingsError && (
          <div className="bookings-sync-error">{bookingsError}</div>
        )}

        {computers.map((pc) => {
          const bookingUntil = getBookingUntilLabel(pc.id);
          return (
            <button
              key={pc.id}
              className={`computer ${selected === pc.id ? "selected" : ""} ${isComputerBusy(pc.id) ? "booked" : ""}`}
              style={{ left: `${pc.x}%`, top: `${pc.y}%` }}
              onClick={() => handleComputerClick(pc.id)}
            >
              {pc.id}
              {bookingUntil && (
                <span className="computer-booking-until">{bookingUntil}</span>
              )}
            </button>
          );
        })}

        {bookingOpen && selectedComputer && (
          <div className="booking-overlay" onClick={closeBookingModal}>
            <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
              <button className="booking-close" onClick={closeBookingModal}>×</button>
              <h2>Бронирование</h2>
              <div className="booking-pc">
                <span>ПК №{selectedComputer.id}</span>
                <small>{selectedComputer.zone}</small>
              </div>

              <label>
                Имя клиента
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Введите имя" />
              </label>

              <label>
                Телефон
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 999 999 99 99" />
              </label>

              <label>
                Дата
                <input
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setDate(newDate);
                    if (newDate === today) {
                      const currentTime = new Date().toTimeString().slice(0, 5);
                      if (time < currentTime) setTime(currentTime);
                    }
                  }}
                />
              </label>

              <label>
                Время
                <input
                  type="time"
                  value={time}
                  min={date === today ? new Date().toTimeString().slice(0, 5) : undefined}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>

              <label>
                Тип бронирования
                <select
                  value={packageType}
                  onChange={(e) => {
                    const value = e.target.value as Booking["packageType"];
                    setPackageType(value);
                    if (value === "morning") {
                      setTime("08:00");
                      setDuration(5);
                    } else if (value === "day") {
                      setTime("13:00");
                      setDuration(9);
                    } else if (value === "night") {
                      setTime("22:00");
                      setDuration(10);
                    } else if (value === "daily") {
                      setDuration(24);
                      setTime("00:00");
                    } else if (value === "hourly") {
                      setDuration(1);
                    }
                  }}
                >
                  <option value="hourly">Почасовая</option>
                  <option value="morning">🌅 Утро 08:00–13:00</option>
                  <option value="day">☀️ День 13:00–22:00</option>
                  <option value="night">🌙 Ночь 22:00–08:00</option>
                  <option value="daily">🕐 Сутки</option>
                </select>
              </label>

              <label>
                Длительность
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  {packageType === "hourly" ? (
                    <>
                      <option value={1}>1 час</option>
                      <option value={3}>3 часа</option>
                      <option value={5}>5 часов</option>
                    </>
                  ) : packageType === "daily" ? (
                    <option value={24}>24 часа</option>
                  ) : (
                    <>
                      {packageType === "morning" && <option value={5}>5 часов</option>}
                      {packageType === "day" && <option value={9}>9 часов</option>}
                      {packageType === "night" && <option value={10}>10 часов</option>}
                    </>
                  )}
                </select>
              </label>

              <div className="booking-price">
                <span>Стоимость</span>
                <strong>{calculatePrice(selectedComputer.zone, date, time, duration, packageType)} ₽</strong>
              </div>

              <button className="booking-submit" onClick={createBooking}>Забронировать</button>
            </div>
          </div>
        )}

        {myBookingsOpen && (
          <div className="booking-overlay" onClick={() => setMyBookingsOpen(false)}>
            <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
              <button className="booking-close" onClick={() => setMyBookingsOpen(false)}>×</button>
              <h2>👤 Личный кабинет</h2>

{vkUser && (
  <div className="profile-info">
    <p>{vkUser.firstName} {vkUser.lastName}</p>
    <p>ID: {vkUser.vkUserId}</p>
  </div>
)}

<h3>Мои брони</h3>
              {myBookings.length === 0 ? (
                <p>Броней пока нет</p>
              ) : (
                myBookings.map((booking) => (
                  <div key={booking.id} className="my-booking-card">
                    <h3>ПК №{booking.computerId}</h3>
                    <p>Дата: {booking.date}</p>
                    <p>Время: {booking.time}</p>
                    <p>Длительность: {booking.duration} ч.</p>
                    <p>Клиент: {booking.clientName}</p>
                    <p>Телефон: {booking.phone}</p>
                    <strong>{booking.price} ₽</strong>
                    <button className="cancel-booking" onClick={() => cancelBooking(booking.id)}>Отменить</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;