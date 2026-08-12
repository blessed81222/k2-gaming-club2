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
  // =========================
  // VIP
  // =========================
  { id: 3, zone: "PREMIUM", x: 9, y: 15 },
  { id: 4, zone: "PREMIUM", x: 19, y: 15 },
  { id: 5, zone: "PREMIUM", x: 29, y: 15 },
  { id: 6, zone: "PREMIUM", x: 39, y: 15 },
  { id: 1, zone: "PREMIUM", x: 19, y: 35 },
  { id: 2, zone: "PREMIUM", x: 9, y: 35 },

  // =========================
  // BOOT CAMP
  // =========================
  { id: 7, zone: "Boot Camp", x: 60, y: 15 },
  { id: 8, zone: "Boot Camp", x: 75, y: 15 },
  { id: 9, zone: "Boot Camp", x: 91, y: 15 },
  { id: 10, zone: "Boot Camp", x: 91, y: 35 },
  { id: 11, zone: "Boot Camp", x: 75, y: 35 },

  // =========================
  // STANDART +
  // Сдвинуты немного влево
  // =========================
  { id: 12, zone: "Standart +", x: 59, y: 54 },
  { id: 13, zone: "Standart +", x: 70, y: 54 },
  { id: 14, zone: "Standart +", x: 70, y: 66 },
  { id: 15, zone: "Standart +", x: 59, y: 66 },
  { id: 16, zone: "Standart +", x: 30, y: 66 },
  { id: 17, zone: "Standart +", x: 30, y: 54 },

  // =========================
  // STANDART
  // Сдвинуты немного влево
  // =========================
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

  // Исправлено: ключ теперь соответствует Zone ("PREMIUM")
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

const STORAGE_KEY = "k2_bookings";

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

// Исправлено: правильное объявление функции
function calculatePrice(
  zone: Zone,
  date: string,
  time: string,
  duration: number,
  packageType: "hourly" | "morning" | "day" | "night" | "daily"
): number {
  const type = isWeekend(date) ? "weekend" : "weekday";
  const zonePrice = prices[zone];

  // =========================
  // ПАКЕТЫ
  // =========================
  if (packageType !== "hourly") {
    return zonePrice.packages[packageType][type];
  }

  // =========================
  // ПОЧАСОВЫЕ ТАРИФЫ
  // =========================
  let period: "day" | "night";
  let durationKey: "one" | "three" | "five";

  // Определяем период и ключ длительности
  if (duration === 1) {
    const hour = Number(time.split(":")[0]);
    period = hour >= 8 && hour < 17 ? "day" : "night";
    durationKey = "one";
  } else if (duration === 3) {
    const hour = Number(time.split(":")[0]);
    period = hour >= 8 && hour < 16 ? "day" : "night";
    durationKey = "three";
  } else if (duration === 5) {
    const hour = Number(time.split(":")[0]);
    period = hour >= 8 && hour < 14 ? "day" : "night";
    durationKey = "five";
  } else {
    // Если длительность не 1, 3 или 5 (например, 24), используем тариф за 5 часов и пересчитываем пропорционально
    // Это защита от некорректного ввода; в идеале UI не должен позволять такие комбинации
    const hour = Number(time.split(":")[0]);
    period = hour >= 8 && hour < 14 ? "day" : "night";
    const basePrice = zonePrice.hourly[period]["five"][type];
    return Math.round((basePrice / 5) * duration);
  }

  return zonePrice.hourly[period][durationKey][type];
}

function loadBookings(): Booking[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Ошибка загрузки броней:", error);
    return [];
  }
}

function App() {
  const today = getToday();
  const [vkConfigured, setVkConfigured] = useState(false);
  const [vkUser, setVkUser] = useState<K2User | null>(null);
  const [vkLoading, setVkLoading] = useState(false);
  const [vkError, setVkError] = useState("");

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
        setVkUser(data.user);
        clearStoredVkMeta();
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch((error) => {
        console.error("VK exchange error:", error);
        setVkError(error instanceof Error ? error.message : "Ошибка VK авторизации");
      })
      .finally(() => setVkLoading(false));
  }, []);

  const [bookings, setBookings] = useState<Booking[]>(loadBookings);
  const [selected, setSelected] = useState<number | null>(null);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [myBookingsOpen, setMyBookingsOpen] = useState(false);

  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");

  const [date, setDate] = useState(today);
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState(1);
  const [packageType, setPackageType] = useState<
    "hourly" | "morning" | "day" | "night" | "daily"
  >("hourly");

const selectedComputer = computers.find((pc) => pc.id === selected);
  // ==================================================
  // СОХРАНЕНИЕ БРОНЕЙ
  // ==================================================
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  }, [bookings]);

  // ==================================================
  // ПРОВЕРКА ЗАНЯТОСТИ ПК
  // ==================================================
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

  // ==================================================
  // ВЫБОР ПК
  // ==================================================
function handleComputerClick(id: number) {
  setSelected(id);
  setBookingOpen(true);
}
  // ==================================================
  // ЗАКРЫТИЕ МОДАЛКИ
  // ==================================================
  function closeBookingModal() {
    setBookingOpen(false);
    setSelected(null);
  }

  // ==================================================
  // СОЗДАНИЕ БРОНИ
  // ==================================================
  function createBooking() {
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

    // Исправлено: передаём packageType
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

    setBookings((prev) => [...prev, newBooking]);
    setBookingOpen(false);
    setSelected(null);
    setClientName("");
    setPhone("");

    alert(`Бронь создана!\n\nПК №${computer.id}\nСтоимость: ${price} ₽`);
  }

  // ==================================================
  // ОТМЕНА БРОНИ
  // ==================================================
  function cancelBooking(id: string) {
    setBookings((prev) => prev.filter((item) => item.id !== id));
  }

  // ==================================================
  // RENDER
  // ==================================================
  return (
    <div className="app">
      {/* ==================================================
          HEADER
      ================================================== */}
      <header className="header">
        <div className="header-brand">
          <h1>
            K2 <span>Gaming Club</span>
          </h1>
          <p>Бронирование компьютеров</p>
        </div>
        <div className="header-contact">
          <div className="work-time">🔥Работаем 24/7 — всегда на связи!</div>
          <div className="address">📍ул. Большая Московская, д. 140</div>
          <div className="phone">
            📲Контакты: <a href="tel:+78162273777">8 (8162) 273-777</a>
          </div>
        </div>
        {vkUser ? (
          <button className="vk-profile-btn" type="button" title="VK ID профиль">
            <span className="vk-avatar">{vkUser.firstName?.[0] || "VK"}</span>
            <span>{[vkUser.firstName, vkUser.lastName].filter(Boolean).join(" ") || "Профиль"}</span>
          </button>
        ) : (
          <button
            className="vk-login-btn"
            type="button"
            disabled={!vkConfigured || vkLoading}
            onClick={() => beginVkLogin()}
            title={!vkConfigured ? "Сначала настрой VK ID" : "Войти через VK ID"}
          >
            {vkLoading ? "Вход..." : "Войти через VK"}
          </button>
        )}

        {vkError && <div className="vk-error">{vkError}</div>}

        <button className="my-bookings-btn" onClick={() => setMyBookingsOpen(true)}>
          Мои брони ({bookings.length})
        </button>
      </header>

      {/* ==================================================
          MAP
      ================================================== */}
      <section className="club-map">
        {/* VIP */}
        <div className="map-zone PREMIUM-zone">
          <h2>PREMIUM</h2>
        </div>
        {/* BOOT CAMP */}
        <div className="map-zone bootcamp-zone">
          <h2>Boot Camp</h2>
        </div>
        {/* STANDART + */}
        <div className="map-zone standart-plus-zone">
          <h2>Standart +</h2>
        </div>
        {/* STANDART */}
        <div className="map-zone standart-zone">
          <h2>Standart</h2>
        </div>

        {/* ==================================================
            КОМПЬЮТЕРЫ
        ================================================== */}
        {computers.map((pc) => (
          <button
            key={pc.id}
            className={`
              computer
              ${selected === pc.id ? "selected" : ""}
              ${isComputerBusy(pc.id) ? "booked" : ""}
            `}
            style={{
              left: `${pc.x}%`,
              top: `${pc.y}%`,
            }}
            onClick={() => handleComputerClick(pc.id)}
          >
            {pc.id}
          </button>
        ))}

        {/* ==================================================
            МОДАЛКА БРОНИРОВАНИЯ
        ================================================== */}
        {bookingOpen && selectedComputer && (
          <div className="booking-overlay" onClick={closeBookingModal}>
            <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
              <button className="booking-close" onClick={closeBookingModal}>
                ×
              </button>
              <h2>Бронирование</h2>
              <div className="booking-pc">
                <span>ПК №{selectedComputer.id}</span>
                <small>{selectedComputer.zone}</small>
              </div>

              <label>
                Имя клиента
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Введите имя"
                />
              </label>

              <label>
                Телефон
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 999 999 99 99"
                />
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
                    const value = e.target.value as
                      | "hourly"
                      | "morning"
                      | "day"
                      | "night"
                      | "daily";
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
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  // Ограничиваем доступные варианты в зависимости от типа
                >
                  {packageType === "hourly" ? (
                    <>
                      <option value={1}>1 час</option>
                      <option value={3}>3 часа</option>
                      <option value={5}>5 часов</option>
                    </>
                  ) : packageType === "daily" ? (
                    <option value={24}>24 часа</option>
                  ) : (
                    // Для пакетов длительность фиксирована, но селект всё равно доступен,
                    // поэтому показываем только те варианты, которые соответствуют пакету
                    // (но можно просто задизейблить)
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
                <strong>
                  {/* Исправлено: добавлен packageType */}
                  {calculatePrice(selectedComputer.zone, date, time, duration, packageType)} ₽
                </strong>
              </div>

              <button className="booking-submit" onClick={createBooking}>
                Забронировать
              </button>
            </div>
          </div>
        )}

        {/* ==================================================
            МОИ БРОНИ
        ================================================== */}
        {myBookingsOpen && (
          <div className="booking-overlay" onClick={() => setMyBookingsOpen(false)}>
            <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
              <button className="booking-close" onClick={() => setMyBookingsOpen(false)}>
                ×
              </button>
              <h2>Мои брони</h2>
              {bookings.length === 0 ? (
                <p>Броней пока нет</p>
              ) : (
                bookings.map((booking) => (
                  <div key={booking.id} className="my-booking-card">
                    <h3>ПК №{booking.computerId}</h3>
                    <p>Дата: {booking.date}</p>
                    <p>Время: {booking.time}</p>
                    <p>Длительность: {booking.duration} ч.</p>
                    <p>Клиент: {booking.clientName}</p>
                    <p>Телефон: {booking.phone}</p>
                    <strong>{booking.price} ₽</strong>
                    <button className="cancel-booking" onClick={() => cancelBooking(booking.id)}>
                      Отменить
                    </button>
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