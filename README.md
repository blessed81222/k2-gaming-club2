# K2 Gaming Club — онлайн-бронирование

Адаптивное приложение для бронирования компьютеров клуба K2. Поддерживает вход через VK ID, гостевой режим, общую занятость мест через Supabase, безопасную отмену гостевых броней и серверную синхронизацию с Gizmo.

## Запуск

1. Заполните `.env` по примеру `.env.example`.
2. В первом терминале запустите `npm run server`.
3. Во втором терминале запустите `npm run dev`.
4. Откройте адрес, который покажет Vite (обычно `http://localhost:5173`).

Проверка перед публикацией:

```bash
npm run build
npm run lint
```

## Supabase

Для новой базы выполните `supabase/bookings.sql`. Для существующей базы последовательно выполните:

- `supabase_guest_cancel_token.sql`;
- `supabase_gizmo_sync.sql` — перед включением Gizmo.

## VK ID

Заполните `VK_ID_APP_ID`, `VK_ID_APP_SECRET` и `VK_ID_REDIRECT_URI`. Адрес возврата в кабинете VK ID должен совпадать с адресом сайта.

При первом посещении пользователь выбирает вход через VK или гостевой режим. Гостевые контакты и ключи отмены хранятся только в браузере текущего устройства.

## Gizmo Web API

На компьютере с Gizmo Server включите Web API и создайте оператора с доступом к API. Затем заполните:

- `GIZMO_BASE_URL` — адрес Gizmo Server, например `http://192.168.1.10:8080`;
- `GIZMO_OPERATOR_USERNAME` и `GIZMO_OPERATOR_PASSWORD`;
- `GIZMO_API_VERSION` — `2` для актуального `/api/v2/reservations`, `1` для старого Web API;
- `GIZMO_HOST_MAP` — JSON-сопоставление номера ПК на сайте и HostId в Gizmo, например `{"1":101,"2":102}`;
- `GIZMO_REQUIRED=true`, если бронь на сайте должна считаться успешной только после ответа Gizmo.

Секреты Gizmo используются только сервером и никогда не отправляются в браузер.

Официальные материалы: [Web API](https://gizmo.tawk.help/article/web-api), [модель бронирований](https://github.com/GAMP/Gizmo.Web.Api.Client/blob/master/Client/ReservationsWebApiClient.cs).
