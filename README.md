# GroupAlarm Backend

REST API backend для GroupAlarm на Node.js + TypeScript с Firebase Firestore и FCM.

## Требования

- Node.js 18+
- Firebase проект с включенными сервисами:
  - Firebase Authentication
  - Cloud Firestore
  - Cloud Messaging (FCM)

## Установка

1. Клонируйте репозиторий и перейдите в папку backend:
```bash
cd backend
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

4. Заполните переменные окружения Firebase:
   - `FIREBASE_PROJECT_ID` - ID вашего Firebase проекта
   - `FIREBASE_PRIVATE_KEY` - приватный ключ из service account JSON
   - `FIREBASE_CLIENT_EMAIL` - email из service account JSON

## Получение Firebase credentials

1. Перейдите в [Firebase Console](https://console.firebase.google.com)
2. Выберите ваш проект
3. Перейдите в Project Settings → Service Accounts
4. Нажмите "Generate New Private Key"
5. Скопируйте значения `project_id`, `private_key`, `client_email` в `.env`

## Запуск

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /auth/register` - Регистрация
- `POST /auth/login` - Вход
- `POST /auth/logout` - Выход

### Users
- `GET /users/:uid` - Получить профиль
- `PUT /users/:uid` - Обновить профиль
- `PUT /users/:uid/fcm-token` - Обновить FCM токен

### Teams
- `POST /teams` - Создать команду
- `GET /teams/:teamId` - Получить команду
- `GET /teams/:teamId/members` - Получить членов команды
- `POST /teams/:teamId/join` - Присоединиться к команде
- `POST /teams/:teamId/leave` - Покинуть команду
- `POST /teams/:teamId/members/:memberId/kick` - Исключить члена (только владелец)
- `DELETE /teams/:teamId` - Удалить команду (только владелец)

### Alarms
- `POST /teams/:teamId/alarm/trigger` - Включить алерт
- `POST /teams/:teamId/alarm/acknowledge` - Подтвердить алерт
- `POST /teams/:teamId/alarm/reset` - Сбросить алерт
- `GET /teams/:teamId/alarm` - Получить состояние алерта

## Структура проекта

```
backend/
├── src/
│   ├── index.ts              # Entry point
│   ├── middleware/
│   │   └── auth.ts           # Firebase token verification
│   ├── routes/
│   │   ├── auth.ts           # Authentication endpoints
│   │   ├── users.ts          # User management endpoints
│   │   ├── teams.ts          # Team management endpoints
│   │   └── alarms.ts         # Alarm management endpoints
│   ├── services/
│   │   ├── firestore.ts      # Firestore operations
│   │   ├── fcm.ts            # FCM notifications
│   │   └── auth.ts           # Firebase Auth operations
│   └── types/
│       └── models.ts         # TypeScript interfaces
├── .env.example
├── package.json
└── tsconfig.json
```

## Аутентификация

Все защищенные endpoints требуют заголовок:
```
Authorization: Bearer {idToken}
```

Где `{idToken}` - это Firebase ID token, полученный при логине/регистрации.

## Бизнес-логика

### Алерт Flow
1. Пользователь нажимает кнопку алерта → `POST /teams/{teamId}/alarm/trigger`
2. Сервер устанавливает состояние алерта и отправляет FCM уведомление всем членам
3. Члены получают уведомление и видят UI алерта
4. Члены нажимают подтвердить → `POST /teams/{teamId}/alarm/acknowledge`
5. После подтверждения всеми → 10-секундный cooldown
6. После cooldown → `POST /teams/{teamId}/alarm/reset`

### Управление командой
- Только владелец может исключать членов
- Только владелец может удалять команду
- Члены могут покидать команду в любое время
- Invite code = team ID

### FCM Topics
- Topic: `team_{teamId}`
- Все члены команды подписаны
- Уведомления отправляются при включении алерта
- Payload включает: teamId, triggeredBy, triggeredAt

## Тестирование

```bash
npm test
```

## Развертывание

Backend готов к развертыванию на:
- Google Cloud Run
- Heroku
- AWS Lambda
- Любой другой Node.js хостинг

### Cloud Run
```bash
gcloud run deploy groupalarm-backend --source . --platform managed --region us-central1
```

## Обработка ошибок

Все endpoints возвращают стандартный формат ошибки:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

Коды ошибок:
- `UNAUTHORIZED` (401) - Отсутствует или неверный токен
- `FORBIDDEN` (403) - Недостаточно прав
- `NOT_FOUND` (404) - Ресурс не найден
- `BAD_REQUEST` (400) - Неверный запрос
- `INTERNAL_SERVER_ERROR` (500) - Ошибка сервера
