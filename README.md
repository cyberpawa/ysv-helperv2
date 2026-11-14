# YSV Helper

Telegram Mini App із бекендом на FastAPI для оцифрування паперових табелів обліку робочого часу (форма П-5), їх перевірки у таблиці, генерації `.xlsx` та відправки в бухгалтерію.

## Як це працює

1. **Захоплення фото:** камера в Mini App або завантаження зображення з галереї (через `Cropper.js`).
2. **Обрізка приватних даних (PII ROI) на клієнті:** до відправки на сервер користувач обирає режим обрізки:
   - `Авто`: пошук меж таблиці на зображенні через адаптивну бінаризацію (інтегральне зображення) і проекції сітки, обрізка по верхній/нижній межах та на 10% зліва (праві колонки не обрізаються).
   - `Оригінал`: повне зображення без додаткового кропу.
   - `П-5`: стандартний шаблон (15% зліва, 15% зверху, 15% знизу, 0% справа).
   - `П-5 extended`: розширений шаблон (10% зліва, 10% зверху, 10% знизу, 0% справа).
3. **Розпізнавання (OCR):** FastAPI передає обрізане зображення в Gemini (`gemini-4-hydrogen`, резервна `gemini-3.8-flash`) зі структурованим JSON-виводом по чанках днів (`chunk_01_05` .. `chunk_26_31`).
4. **Перевірка та доставка:** редагування будь-якої клітинки в UI, збереження стану в Supabase, генерація `.xlsx` через `openpyxl` у пам'яті, відправка файлу в Telegram та на email через SMTP.

## Архітектура

```text
[React + TypeScript + Vite]
   |  1. Камера / Завантаження фото + Cropper.js
   |  2. Визначення меж таблиці + ROI-обрізка PII-зон на клієнті
   v
[FastAPI Backend (api/index.py)]
   |  3. Перевірка HMAC-SHA256 Telegram initData + auth_date TTL
   |  4. Стейт-машина та архів у Supabase
   |  5. Gemini API
   v
[Таблиця перевірки -> Excel & Доставка]
   |  6. Заповнення шаблону .xlsx в оперативній пам'яті
   |  7. Надсилання у Telegram-чат та на email бухгалтеру
```

### Структура проєкту

- `src/config/templates.ts`: профілі обрізки (`original`, `form_p5`, `form_p5_extended`) та мапінг кодів неявок.
- `src/utils/templateDetector.ts`: алгоритм автовизначення меж таблиці та формування ROI-кропу на `<canvas>`.
- `src/components/TimesheetTable.tsx`: інтерактивна таблиця перевірки табеля.
- `api/index.py`: маршрути FastAPI (`/api/upload`, `/api/state`, `/api/archive/*`, `/api/generate-excel`, `/api/send-email`, `/api/telegram`).
- `api/security.py`: валідація `X-Telegram-Init-Data` (`hmac.compare_digest` + перевірка `auth_date`), список `TRUSTED_USERS`, перевірка `WEBHOOK_SECRET`.
- `api/prompts.py`: системний промпт та трансформація JSON у формат таблиці/Excel.
- `api/services/template_service.py`: реєстр шаблонів на бекенді.
- `api/services/excel_service.py`: генерація `.xlsx` через `openpyxl` у пам'яті.
- `api/services/email_service.py`: SMTP-відправка з таймаутом та IPv4 fallback.
- `api/bot/handlers.py`: хендлери `aiogram 3` (`/start`, `/broadcast`, `/msg`).

## Налаштування оточення

Скопіюйте `.env.example` у `.env` і заповніть ключі:

- `GEMINI_API_KEY`, `GEMINI_PRIMARY_MODEL`, `GEMINI_FALLBACK_MODEL`
- `BOT_TOKEN`, `ADMIN_ID`, `TRUSTED_USERS`, `WEBHOOK_SECRET`, `APP_URL`, `INIT_DATA_MAX_AGE_SECONDS`
- `ALLOW_MOCK_TELEGRAM=true` (тільки для локального запуску у браузері поза Telegram)
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET`, `SUPABASE_TEMPLATE_FILE`
- `SENDER_EMAIL`, `SENDER_PASSWORD`, `TARGET_EMAIL`, `SMTP_SERVER`, `SMTP_PORT`

Для активації захищеного webhook на проді після деплою виконайте запит:
`GET /api/setup-webhook?secret=<WEBHOOK_SECRET>`
