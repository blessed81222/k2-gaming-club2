import { useEffect, useMemo, useState } from "react";
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
  vkUserId: string | null;
  gizmoSyncStatus?: "disabled" | "synced" | "pending" | "error";
};

type AuthMode = "vk" | "guest";

type GuestProfile = {
  name: string;
  phone: string;
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
const AUTH_MODE_STORAGE_KEY = "k2_auth_mode";
const GUEST_PROFILE_STORAGE_KEY = "k2_guest_profile";
const GUEST_BOOKINGS_STORAGE_KEY = "k2_guest_bookings";
const GUEST_CANCEL_TOKENS_KEY = "k2_guest_cancel_tokens";

function loadAuthMode(): AuthMode | null {
  const stored = localStorage.getItem(AUTH_MODE_STORAGE_KEY);
  if (stored === "vk" || stored === "guest") return stored;
  return localStorage.getItem(VK_USER_STORAGE_KEY) ? "vk" : null;
}

function loadGuestProfile(): GuestProfile {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_PROFILE_STORAGE_KEY) || "null");
    return {
      name: typeof parsed?.name === "string" ? parsed.name : "",
      phone: typeof parsed?.phone === "string" ? parsed.phone : "",
    };
  } catch {
    return { name: "", phone: "" };
  }
}

function saveGuestProfile(profile: GuestProfile) {
  localStorage.setItem(GUEST_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function loadGuestCancelTokens(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CANCEL_TOKENS_KEY) || "{}");
  } catch {
    return {};
  }
}

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

  // Сохраняем cancelToken отдельно
  const tokens = loadGuestCancelTokens();
  tokens[booking.id] = cancelToken;
  localStorage.setItem(GUEST_CANCEL_TOKENS_KEY, JSON.stringify(tokens));
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
  const [authMode, setAuthMode] = useState<AuthMode | null>(() => loadAuthMode());
  const [authChoiceOpen, setAuthChoiceOpen] = useState(
    () => !loadAuthMode() && !getVkCallbackParams()
  );
  const [vkLoading, setVkLoading] = useState(false);
  const [vkError, setVkError] = useState("");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>(() => loadGuestBookings());
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [myBookingsOpen, setMyBookingsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const initialGuestProfile = useMemo(() => loadGuestProfile(), []);
  const [clientName, setClientName] = useState(initialGuestProfile.name);
  const [phone, setPhone] = useState(initialGuestProfile.phone);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState(1);
  const [packageType, setPackageType] = useState<Booking["packageType"]>("hourly");

  const selectedComputer = computers.find((pc) => pc.id === selected);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const modalOpen = authChoiceOpen || bookingOpen || myBookingsOpen;
    document.body.classList.toggle("modal-open", modalOpen);
    return () => document.body.classList.remove("modal-open");
  }, [authChoiceOpen, bookingOpen, myBookingsOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (bookingOpen) closeBookingModal();
      else if (myBookingsOpen) setMyBookingsOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

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
      setAuthChoiceOpen(true);
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
        setAuthMode("vk");
        setAuthChoiceOpen(false);
        localStorage.setItem(AUTH_MODE_STORAGE_KEY, "vk");
        localStorage.setItem(VK_USER_STORAGE_KEY, JSON.stringify(user));
        setClientName([user.firstName, user.lastName].filter(Boolean).join(" "));
        if (user.phone) setPhone(user.phone);
        clearStoredVkMeta();
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch((error) => {
        console.error("VK exchange error:", error);
        setVkError(error instanceof Error ? error.message : "Ошибка VK авторизации");
        setAuthChoiceOpen(true);
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
    if (authMode !== "vk" || !vkUser?.vkUserId) {
      setMyBookings(loadGuestBookings());
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
        setMyBookings(loadGuestBookings());
      }
    }

    fetchMyBookings();
  }, [authMode, vkUser?.vkUserId]);

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
    if (!authMode) {
      setAuthChoiceOpen(true);
      return;
    }

    const guestProfile = loadGuestProfile();
    if (authMode === "guest") {
      if (!clientName) setClientName(guestProfile.name);
      if (!phone) setPhone(guestProfile.phone);
    } else if (vkUser) {
      if (!clientName) {
        setClientName([vkUser.firstName, vkUser.lastName].filter(Boolean).join(" "));
      }
      if (!phone && vkUser.phone) setPhone(vkUser.phone);
    }

    setFormError("");
    setSelected(id);
    setBookingOpen(true);
  }

  function closeBookingModal() {
    setBookingOpen(false);
    setSelected(null);
    setFormError("");
  }

  function chooseGuest() {
    setVkError("");
    setVkUser(null);
    setAuthMode("guest");
    setAuthChoiceOpen(false);
    localStorage.removeItem(VK_USER_STORAGE_KEY);
    localStorage.setItem(AUTH_MODE_STORAGE_KEY, "guest");
    const profile = loadGuestProfile();
    setClientName(profile.name);
    setPhone(profile.phone);
    setMyBookings(loadGuestBookings());
  }

  function startVkLogin() {
    setVkError("");
    if (!vkConfigured) {
      setVkError("VK ID пока не настроен. Вы можете продолжить как гость.");
      return;
    }
    setVkLoading(true);
    beginVkLogin();
  }

  function resetLoginChoice() {
    setMyBookingsOpen(false);
    setBookingOpen(false);
    setVkUser(null);
    setAuthMode(null);
    setVkError("");
    localStorage.removeItem(VK_USER_STORAGE_KEY);
    localStorage.removeItem(AUTH_MODE_STORAGE_KEY);
    setMyBookings(loadGuestBookings());
    setAuthChoiceOpen(true);
  }

  async function createBooking() {
    if (selected === null || !clientName.trim() || !phone.trim()) {
      setFormError("Заполните имя и телефон.");
      return;
    }
    if (!date || !time) {
      setFormError("Выберите дату и время.");
      return;
    }

    const now = new Date();
    now.setSeconds(0, 0);
    const bookingDateTime = createLocalDate(date, time);

    if (bookingDateTime <= now) {
      setFormError("Нельзя создать бронь на прошедшее время.");
      return;
    }

    const computer = computers.find((pc) => pc.id === selected);
    if (!computer) {
      setFormError("Компьютер не найден.");
      return;
    }

    if (isComputerBusy(selected)) {
      setFormError("Этот ПК уже занят на выбранное время.");
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
      vkUserId: vkUser?.vkUserId || null,
    };

    try {
      setSubmitting(true);
      setFormError("");
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
        setFormError(data.error || "Этот ПК уже занят на выбранное время.");
        return;
      }
      if (!response.ok) {
        throw new Error(data.error || "Не удалось создать бронь");
      }

      const savedBooking = data.booking as Booking;

      if (!vkUser?.vkUserId && data.cancelToken) {
        saveGuestBooking(savedBooking, String(data.cancelToken));
        saveGuestProfile({ name: clientName.trim(), phone: phone.trim() });
      }

      setBookings((prev) => [...prev, savedBooking]);
      setMyBookings((prev) => [...prev, savedBooking]);
      setBookingOpen(false);
      setSelected(null);
      setNotice(`Бронь на ПК №${computer.id} создана · ${price} ₽`);
    } catch (error) {
      console.error("Create booking error:", error);
      setFormError(error instanceof Error ? error.message : "Не удалось создать бронь");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelBooking(id: string) {
    try {
      const vkUserId = vkUser?.vkUserId || "";

      // Получаем токен гостевой брони, если пользователь не вошёл через VK
      const guestTokens = loadGuestCancelTokens();
      const cancelToken = guestTokens[id] || "";

      const params = new URLSearchParams();

      if (vkUserId) {
        params.set("vkUserId", vkUserId);
      }

      if (cancelToken) {
        params.set("cancelToken", cancelToken);
      }

      const response = await fetch(
        `/api/bookings/${encodeURIComponent(id)}?${params.toString()}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не удалось отменить бронь");
      }

      setBookings((prev) => prev.filter((item) => item.id !== id));
      setMyBookings((prev) => prev.filter((item) => item.id !== id));

      // После отмены гостевой брони удаляем использованный токен
const guestBookings = loadGuestBookings().filter(
  (item) => item.id !== id
);

delete guestTokens[id];

localStorage.setItem(
  GUEST_CANCEL_TOKENS_KEY,
  JSON.stringify(guestTokens)
);

localStorage.setItem(
  GUEST_BOOKINGS_STORAGE_KEY,
  JSON.stringify(
    guestBookings.map((booking) => ({
      booking,
      cancelToken: guestTokens[booking.id] || "",
    }))
  )
);
      setNotice("Бронь отменена");
    } catch (error) {
      console.error("Cancel booking error:", error);
      setNotice(error instanceof Error ? error.message : "Не удалось отменить бронь");
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand" aria-label="K2 Gaming Club">
          <span className="brand-kicker">Великий Новгород</span>
          <h1>K2 <span>Gaming Club</span></h1>
          <p>Онлайн-бронирование игровых мест</p>
        </div>

        <div className="header-contact">
          <span className="contact-pill"><i className="status-dot" />Открыты 24/7</span>
          <a href="https://yandex.ru/maps/?text=Большая%20Московская%20140" target="_blank" rel="noreferrer">
            Большая Московская, 140
          </a>
          <a href="tel:+78162273777">8 (8162) 273-777</a>
        </div>

        <button
          className="account-button"
          type="button"
          onClick={() => authMode ? setMyBookingsOpen(true) : setAuthChoiceOpen(true)}
          aria-label="Открыть личный кабинет"
        >
          <span className={`account-avatar ${authMode === "vk" ? "is-vk" : "is-guest"}`}>
            {authMode === "vk" ? (vkUser?.firstName?.[0] || "VK") : "G"}
          </span>
          <span className="account-copy">
            <strong>
              {authMode === "vk"
                ? ([vkUser?.firstName, vkUser?.lastName].filter(Boolean).join(" ") || "VK ID")
                : authMode === "guest" ? "Гость" : "Войти"}
            </strong>
            <small>{authMode ? `${myBookings.length} броней · кабинет` : "выберите способ"}</small>
          </span>
          <span className="account-chevron">›</span>
        </button>
      </header>

      <main className="main-content">
        <section className="availability-panel" aria-labelledby="hall-title">
          <div className="availability-title">
            <span className="section-number">01</span>
            <div>
              <h2 id="hall-title">Выберите игровой ПК</h2>
              <p>Свободные места обновляются автоматически</p>
            </div>
          </div>

          <div className="map-legend" aria-label="Обозначения карты">
            <span><i className="legend-dot free" />Свободен</span>
            <span><i className="legend-dot busy" />Занят</span>
          </div>
        </section>

        <div className="mobile-map-hint">Проведите по плану, чтобы увидеть весь зал →</div>
        <div className="club-map-scroll">
          <section className="club-map" aria-label="Интерактивный план компьютерного клуба">
            <div className="map-zone PREMIUM-zone"><h3>Premium</h3><span>Максимальный комфорт</span></div>
            <div className="map-zone bootcamp-zone"><h3>Boot Camp</h3><span>Командная зона</span></div>
            <div className="map-zone standart-plus-zone"><h3>Standart +</h3></div>
            <div className="map-zone standart-zone"><h3>Standart</h3></div>
            {bookingsLoading && <div className="map-status loading">Обновляем свободные места…</div>}
            {bookingsError && <div className="map-status error">Нет связи с расписанием. Повторяем попытку…</div>}

            {computers.map((pc) => {
              const busy = isComputerBusy(pc.id);
              const bookingUntil = getBookingUntilLabel(pc.id);
              return (
                <button
                  key={pc.id}
                  type="button"
                  className={`computer ${selected === pc.id ? "selected" : ""} ${busy ? "booked" : ""}`}
                  style={{ left: `${pc.x}%`, top: `${pc.y}%` }}
                  onClick={() => handleComputerClick(pc.id)}
                  aria-label={`ПК №${pc.id}, зона ${pc.zone}, ${busy ? `занят ${bookingUntil || ""}` : "свободен"}`}
                >
                  <span className="computer-screen">{pc.id}</span>
                  {bookingUntil && <span className="computer-booking-until">{bookingUntil}</span>}
                </button>
              );
            })}
          </section>
        </div>
      </main>

      {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}

      {authChoiceOpen && (
        <div className="modal-overlay auth-overlay" role="presentation">
          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <div className="auth-brand"><span>K2</span><i /></div>
            <span className="auth-kicker">Добро пожаловать</span>
            <h2 id="auth-title">Выберите вариант входа</h2>
            <p className="auth-subtitle">Войдите через VK, чтобы видеть брони на любом устройстве, или продолжите без регистрации.</p>

            <div className="auth-options">
              <button className="auth-option vk-option" type="button" onClick={startVkLogin} aria-busy={vkLoading}>
                <span className="auth-icon vk-mark">VK</span>
                <span className="auth-option-copy">
                  <strong>{vkLoading ? "Открываем VK ID…" : "Войти через VK"}</strong>
                  <small>Брони сохранятся в вашем профиле</small>
                </span>
                <span className="auth-arrow">→</span>
              </button>

              <button className="auth-option guest-option" type="button" onClick={chooseGuest}>
                <span className="auth-icon guest-mark"><i /><i /></span>
                <span className="auth-option-copy">
                  <strong>Продолжить как гость</strong>
                  <small>Без регистрации, только на этом устройстве</small>
                </span>
                <span className="auth-arrow">→</span>
              </button>
            </div>

            {vkError && <div className="auth-error" role="alert">{vkError}</div>}
            <p className="auth-note"><i className="lock-icon" />Контактные данные используются только для бронирования.</p>
          </section>
        </div>
      )}

      {bookingOpen && selectedComputer && (
        <div className="modal-overlay" onMouseDown={closeBookingModal} role="presentation">
          <section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={closeBookingModal} aria-label="Закрыть">×</button>
            <span className="modal-kicker">{authMode === "vk" ? "Бронь через VK ID" : "Гостевое бронирование"}</span>
            <h2 id="booking-title">Забронировать ПК №{selectedComputer.id}</h2>
            <div className="booking-pc">
              <span><i className="status-dot" />Место свободно</span>
              <strong>{selectedComputer.zone}</strong>
            </div>

            <div className="form-grid">
              <label className="full-field">
                <span>Имя клиента</span>
                <input value={clientName} autoComplete="name" onChange={(event) => setClientName(event.target.value)} placeholder="Как к вам обращаться" />
              </label>
              <label className="full-field">
                <span>Телефон</span>
                <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+7 999 999-99-99" />
              </label>
              <label>
                <span>Дата</span>
                <input
                  type="date"
                  min={today}
                  value={date}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    setDate(nextDate);
                    if (nextDate === today) {
                      const currentTime = new Date().toTimeString().slice(0, 5);
                      if (time < currentTime) setTime(currentTime);
                    }
                  }}
                />
              </label>
              <label>
                <span>Время</span>
                <input type="time" value={time} min={date === today ? new Date().toTimeString().slice(0, 5) : undefined} onChange={(event) => setTime(event.target.value)} />
              </label>
              <label className="full-field">
                <span>Тариф</span>
                <select
                  value={packageType}
                  onChange={(event) => {
                    const value = event.target.value as Booking["packageType"];
                    setPackageType(value);
                    if (value === "morning") { setTime("08:00"); setDuration(5); }
                    else if (value === "day") { setTime("13:00"); setDuration(9); }
                    else if (value === "night") { setTime("22:00"); setDuration(10); }
                    else if (value === "daily") { setTime("00:00"); setDuration(24); }
                    else setDuration(1);
                  }}
                >
                  <option value="hourly">Почасовая игра</option>
                  <option value="morning">Утро · 08:00–13:00</option>
                  <option value="day">День · 13:00–22:00</option>
                  <option value="night">Ночь · 22:00–08:00</option>
                  <option value="daily">Сутки · 24 часа</option>
                </select>
              </label>
              <label className="full-field">
                <span>Длительность</span>
                <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
                  {packageType === "hourly" ? <><option value={1}>1 час</option><option value={3}>3 часа</option><option value={5}>5 часов</option></>
                    : packageType === "daily" ? <option value={24}>24 часа</option>
                    : <option value={duration}>{duration} часов</option>}
                </select>
              </label>
            </div>

            {formError && <div className="form-error" role="alert">{formError}</div>}
            <div className="booking-total">
              <span>Итого</span>
              <strong>{calculatePrice(selectedComputer.zone, date, time, duration, packageType)} ₽</strong>
            </div>
            <button className="primary-button" type="button" disabled={submitting} onClick={createBooking}>
              {submitting ? "Создаём бронь…" : "Подтвердить бронирование"}
            </button>
            <p className="booking-footnote">Оплата производится на стойке клуба</p>
          </section>
        </div>
      )}

      {myBookingsOpen && (
        <div className="modal-overlay" onMouseDown={() => setMyBookingsOpen(false)} role="presentation">
          <section className="booking-modal profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setMyBookingsOpen(false)} aria-label="Закрыть">×</button>
            <span className="modal-kicker">Личный кабинет</span>
            <h2 id="profile-title">Мои бронирования</h2>

            <div className="profile-summary">
              <span className={`profile-avatar ${authMode === "vk" ? "is-vk" : "is-guest"}`}>
                {authMode === "vk" ? (vkUser?.firstName?.[0] || "VK") : "G"}
              </span>
              <div>
                <strong>{authMode === "vk" ? ([vkUser?.firstName, vkUser?.lastName].filter(Boolean).join(" ") || "Пользователь VK") : (loadGuestProfile().name || "Гость")}</strong>
                <small>{authMode === "vk" ? "Вход выполнен через VK ID" : "Брони хранятся на этом устройстве"}</small>
              </div>
              <button className="switch-login" type="button" onClick={resetLoginChoice}>Сменить вход</button>
            </div>

            {myBookings.length === 0 ? (
              <div className="empty-bookings"><span>⌁</span><h3>Броней пока нет</h3><p>Выберите свободный компьютер на плане зала.</p></div>
            ) : (
              <div className="bookings-list">
                {myBookings.map((booking) => (
                  <article key={booking.id} className="my-booking-card">
                    <div className="booking-card-head">
                      <div><span>{booking.zone}</span><h3>ПК №{booking.computerId}</h3></div>
                      <strong>{booking.price} ₽</strong>
                    </div>
                    <dl>
                      <div><dt>Дата</dt><dd>{booking.date}</dd></div>
                      <div><dt>Начало</dt><dd>{booking.time}</dd></div>
                      <div><dt>Сеанс</dt><dd>{booking.duration} ч.</dd></div>
                      <div><dt>Клиент</dt><dd>{booking.clientName}</dd></div>
                    </dl>
                    <button className="cancel-booking" type="button" onClick={() => cancelBooking(booking.id)}>Отменить бронь</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
