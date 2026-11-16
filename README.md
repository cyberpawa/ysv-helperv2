# YSV Helper

Telegram Mini App із бекендом на FastAPI для оцифрування паперових табелів обліку робочого часу (форма П-5), їх перевірки у таблиці, генерації `.xlsx` та відправки в бухгалтерію.

## Як це працює

1. **Захоплення фото:** камера в Mini App або завантаження зображення з галереї (через `Cropper.js`).
2. **Обрізка приватних даних (PII ROI) на клієнті:** до відправки на сервер користувач обирає режим обрізки:
   - `Авто`: пошук меж таблиці на зображенні через адаптивну бінаризацію (інтегральне зображення) і проекції сітки, обрізка по верхній/нижній межах та на 10% зліва (праві колонки не обрізаються).
   - `Оригінал`: повне зображення без додаткового кропу.
   - `П-5`: стандартний шаблон (15% зліва, 15% зверху, 15% знизу, 0% справа).
   - `П-5 extended`: розширений шаблон (10% зліва, 10% зверху, 10% знизу, 0% справа).
3. **Фонове розпізнавання (OCR):** `POST /api/upload` приймає обрізане зображення, одразу повертає `202 Accepted` (`processing`) і запускає розпізнавання у фоновій задачі через Gemini (`gemini-4-hydrogen`, резервна `gemini-3.8-flash`). Клієнт відстежує статус через `/api/state`. Якщо на фото не таблиця табеля, сервіс відхиляє зображення (`NotATimesheetError` / `422`).
4. **Перевірка та доставка:** редагування будь-якої клітинки в UI, локальне перетворення UTC-міток часу на таймзону браузера, генерація `.xlsx` через `openpyxl` в оперативній пам'яті, відправка файлу в Telegram та на email через SMTP.

## Архітектура

```text
[React + TypeScript + Vite]
   |  1. Камера / Завантаження фото + Cropper.js
   |  2. Визначення меж таблиці + ROI-обрізка PII-зон на клієнті
   v
[FastAPI Controller (api/main.py)]
   |  3. Валідація Pydantic-схем та HMAC-SHA256 Telegram initData + auth_date TTL
   |  4. BackgroundTasks -> timesheet_service + gemini_service
   |  5. Стейт-машина та архів у Supabase
   v
[Таблиця перевірки -> Excel & Доставка]
   |  6. Заповнення шаблону .xlsx в оперативній пам'яті (BytesIO)
   |  7. Надсилання у Telegram-чат та на email бухгалтеру
```

### Структура проєкту

- `src/config/templates.ts`: профілі обрізки (`original`, `form_p5`, `form_p5_extended`) та мапінг кодів неявок.
- `src/utils/templateDetector.ts`: алгоритм автовизначення меж таблиці та формування ROI-кропу на `<canvas>`.
- `src/components/TimesheetTable.tsx`: інтерактивна таблиця перевірки табеля.
- `api/main.py`: тонкий FastAPI-контролер (`/api/upload`, `/api/state`, `/api/archive/*`, `/api/generate-excel`, `/api/send-email`, `/api/telegram`, `/api/setup-webhook`) з централізованою обробкою `DomainError`.
- `api/config.py`: типізована конфігурація оточення через `pydantic-settings`.
- `api/schemas.py`: Pydantic-схеми запитів і відповідей API.
- `api/exceptions.py`: доменні винятки (`DomainError`, `NotATimesheetError`, `HighDemandError`, `QuotaExceededError`, `AccessDeniedError`, `ResourceNotFoundError`).
- `api/security.py`: валідація `X-Telegram-Init-Data` (`hmac.compare_digest` + перевірка `auth_date`), список `TRUSTED_USERS`, перевірка `WEBHOOK_SECRET`.
- `api/prompts.py`: системний промпт (включно з перевіркою `is_timesheet_table`) та `transform_ai_json_to_response`.
- `api/services/gemini_service.py`: інтеграція з Gemini Vision API та валідація JSON/невалідних фото.
- `api/services/timesheet_service.py`: бізнес-логіка архіву, фонових задач, Excel та email-доставки.
- `api/services/template_service.py`: реєстр шаблонів на бекенді.
- `api/services/excel_service.py`: генерація `.xlsx` через `openpyxl` у пам'яті.
- `api/services/email_service.py`: SMTP-відправка з таймаутом та IPv4 fallback.
- `api/bot/handlers.py`: хендлери `aiogram 3` (`/start`, `/broadcast`, `/msg`) і керування webhook.
- `tests/`: автотести на `pytest`.

## Налаштування оточення та перевірки

Скопіюйте `.env.example` у `.env` і заповніть змінні оточення.

```bash
# Лінтинг та форматування Python (Astral Ruff)
python -m ruff check api tests
python -m ruff format --check api tests

# Запуск тестів
python -m pytest

# Перевірка та збірка фронтенду
npm run lint
npm run build
```

Для активації захищеного webhook на проді після деплою виконайте запит:
`GET /api/setup-webhook?secret=<WEBHOOK_SECRET>`
