# YSV Helper — Telegram Mini App для оцифрування паперових табелів (Форма № П-5)

Веб-застосунок у форматі **Telegram Mini App** із бекендом на **FastAPI** та вбудованим Telegram-ботом (**aiogram 3**) для автоматизації рутинного обліку робочого часу: від фотографування заповненого від руки паперового табеля до генерації офіційного `.xlsx` бланка та відправки в бухгалтерію.

---

## 🎯 Яку проблему вирішує проєкт

У виробничих та залізничних підрозділах табелі обліку робочого часу (Типова форма № П-5 та цехові відомості) часто досі ведуться від руки на папері. Перенесення десятків клітинок із кодами явок/неявок і дробовими годинами у підсумковий Excel-бланк вручну забирає багато часу і призводить до помилок.

**YSV Helper** автоматизує цей процес у 4 кроки:
1. Користувач фотографує паперовий бланк через камеру Mini App або завантажує фото з галереї (з інтерактивним вирівнюванням та поворотом через `Cropper.js`).
2. Клієнт визначає тип бланка та вирізає лише робочу область (ROI) — **персональні дані працівників і реквізити підприємства залишаються на пристрої**.
3. Обезлічена матриця відправляється на бекенд, де **Gemini Vision** розпізнає рукописні значення по чанках.
4. Користувач перевіряє інтерактивну таблицю, за потреби виправляє будь-яку клітинку, отримує готовий `.xlsx` у Telegram та може одразу надіслати його бухгалтеру на email.

---

## 🏗 Архітектура та потік даних

```text
[Telegram Mini App (React + TypeScript + Vite)]
   │  1. Камера / Завантаження фото + Cropper.js (вирівнювання A4)
   │  2. Детектор типу бланка (проєкція сітки) + ROI-обрізка PII-зон
   ▼
[FastAPI Backend (Vercel Serverless)]
   │  3. Валідація HMAC-SHA256 Telegram initData + auth_date TTL
   │  4. Стейт-машина в Supabase (processing → ready / error)
   │  5. Gemini Vision API (gemini-4-hydrogen, fallback: gemini-3.8-flash)
   │     └─ Chunked Row Processing (блоки по 5 днів, захист від авторегресії)
   ▼
[Інтерактивна перевірка → Генерація Excel & Доставка]
   │  6. Заповнення шаблону openpyxl виключно в оперативній пам'яті (io.BytesIO)
   │  7. Надсилання .xlsx у Telegram-чат та/або SMTP-листом бухгалтеру
```

### Основні модулі

- **Frontend (`src/`)**:
  - `src/config/templates.ts` — профілі підтримуваних бланків (`form_p5_standard`, `form_p5_extended`, `form_uz_shift`) із координатами ROI та мапінгом кодів неявок.
  - `src/utils/templateDetector.ts` — алгоритм класифікації бланка за проєкцією ліній сітки та функція ROI-обрізки перед відправкою в хмару.
  - `src/components/TimesheetTable.tsx` — декларативний React-компонент таблиці форми № П-5 (замість конкатенації HTML-рядків).
- **Backend (`api/`)**:
  - `api/index.py` — FastAPI-ендпоінти (`/api/upload`, `/api/state`, `/api/templates`, `/api/archive/*`, `/api/generate-excel`, `/api/send-email`, `/api/telegram`).
  - `api/security.py` — криптографічна перевірка `X-Telegram-Init-Data`, `hmac.compare_digest`, TTL сесії, авторизація довірених користувачів та перевірка webhook-токена.
  - `api/prompts.py` — системний промпт із Chunked Row Processing та нормалізація JSON.
  - `api/services/template_service.py` — серверний реєстр профілів табелів.
  - `api/services/excel_service.py` — in-memory генерація `.xlsx` через `openpyxl` (з підтримкою об'єднаних комірок і заливки вихідних днів).
  - `api/services/email_service.py` — SMTP-відправка з таймаутом та IPv4 fallback для хмарних середовищ.
  - `api/bot/handlers.py` — `aiogram 3` хендлери (`/start`, адмінські `/broadcast` та `/msg`).

---

## 🔒 Безпека та Privacy-by-Design

1. **Privacy-by-Design (відсікання PII на клієнті):**
   Залежно від розпізнаного або вибраного профілю шаблону (`form_p5_standard`, `form_p5_extended`, `form_uz_shift`), додаток на стороні браузера вирізає ліву колонку з ПІБ/табельними номерами, верхню шапку підприємства та нижні підписи. У зовнішній Gemini API передається виключно знеособлена сітка годин і кодів.
2. **Автентифікація Telegram Mini App (`HMAC-SHA256`):**
   Кожен запит до API перевіряється через `X-Telegram-Init-Data`: обчислюється підпис із секретом `WebAppData + BOT_TOKEN`, порівнюється через `hmac.compare_digest`, а також перевіряється свіжість `auth_date` (захист від replay-атак). Локальний mock-режим вимкнений за замовчуванням і вмикається лише явно через `ALLOW_MOCK_TELEGRAM=true`.
3. **Захист Webhook-маршрутів:**
   Ендпоінт `/api/telegram` перевіряє заголовок `X-Telegram-Bot-Api-Secret-Token`, а `/api/setup-webhook` вимагає `WEBHOOK_SECRET` і фіксованого `APP_URL` (захист від Host Header Injection).
4. **Sandbox-режим для нових/тестових користувачів (`is_trusted_user`):**
   Користувачі поза списком `TRUSTED_USERS` при `/start` отримують тестове фото для демонстрації, а при генерації Excel і відправці email для них підставляється знеособлений шаблон `fake_template.xlsx` і тестова пошта `SENDER_EMAIL` замість реальної бухгалтерії.
5. **Захист від XSS:**
   Таблиця перевірки побудована як чистий React-компонент (`TimesheetTable.tsx`) без використання `dangerouslySetInnerHTML`.

---

## 🛠 Технологічний стек

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Motion, Cropper.js, Lucide Icons
- **Backend:** Python 3.12, FastAPI, Pydantic, aiogram 3, openpyxl, google-generativeai
- **Database & Storage:** Supabase (PostgreSQL + Storage для `.xlsx` шаблонів)
- **Deploy:** Vercel Serverless (`vercel.json`)

---

## 🚀 Локальний запуск

### 1. Змінні середовища
Скопіюйте `.env.example` у `.env` та заповніть ключі:

```bash
cp .env.example .env
```

Для локальної розробки без запуску всередині Telegram WebApp можна тимчасово задати `ALLOW_MOCK_TELEGRAM=true`.

### 2. Frontend
```bash
npm install
npm run lint
npm run dev
```

### 3. Backend (FastAPI)
```bash
pip install -r api/requirements.txt
uvicorn api.index:app --reload --port 8000
```
