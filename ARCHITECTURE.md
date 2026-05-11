# Architecture Documentation

## Overview

GroupAlarm Backend - это REST API сервер на Node.js + TypeScript, который управляет командами, пользователями и системой алертов с использованием Firebase Firestore и FCM для push-уведомлений.

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Testing**: Jest
- **Containerization**: Docker

## Architecture Layers

### 1. Middleware Layer (`src/middleware/`)

**auth.ts** - Firebase token verification
- Извлекает токен из заголовка `Authorization: Bearer {token}`
- Проверяет токен через Firebase Admin SDK
- Прикрепляет `uid` к объекту request

### 2. Routes Layer (`src/routes/`)

Четыре основных маршрута:

**auth.ts** - Аутентификация
- `POST /auth/register` - Регистрация нового пользователя
- `POST /auth/login` - Вход в систему
- `POST /auth/logout` - Выход из системы

**users.ts** - Управление пользователями
- `GET /users/:uid` - Получить профиль
- `PUT /users/:uid` - Обновить профиль
- `PUT /users/:uid/fcm-token` - Обновить FCM токен

**teams.ts** - Управление командами
- `POST /teams` - Создать команду
- `GET /teams/:teamId` - Получить команду
- `GET /teams/:teamId/members` - Получить членов
- `POST /teams/:teamId/join` - Присоединиться
- `POST /teams/:teamId/leave` - Покинуть
- `POST /teams/:teamId/members/:memberId/kick` - Исключить
- `DELETE /teams/:teamId` - Удалить команду

**alarms.ts** - Управление алертами
- `POST /teams/:teamId/alarm/trigger` - Включить алерт
- `POST /teams/:teamId/alarm/acknowledge` - Подтвердить
- `POST /teams/:teamId/alarm/reset` - Сбросить
- `GET /teams/:teamId/alarm` - Получить состояние

### 3. Services Layer (`src/services/`)

**firestore.ts** - Операции с Firestore
- User CRUD операции
- Team CRUD операции
- Alarm state management
- Member management

**fcm.ts** - Firebase Cloud Messaging
- Подписка на topics
- Отписка от topics
- Отправка уведомлений по topic
- Отправка уведомлений по токену

**auth.ts** - Firebase Authentication
- Создание пользователя
- Получение пользователя
- Создание custom token
- Проверка ID token

### 4. Types Layer (`src/types/`)

**models.ts** - TypeScript интерфейсы
- User
- Team
- TeamAlarm
- Member
- AuthRequest/Response
- ErrorResponse

## Data Models

### Firestore Collections

```
users/
├── {uid}
│   ├── uid: string
│   ├── email: string
│   ├── nickname: string
│   ├── teams: string[]
│   ├── activeTeamId: string | null
│   ├── fcmToken: string
│   └── createdAt: number

teams/
├── {teamId}
│   ├── id: string
│   ├── name: string
│   ├── ownerId: string
│   ├── inviteCode: string
│   ├── createdAt: number
│   ├── alarm: TeamAlarm
│   └── members/ (subcollection)
│       └── {uid}
│           ├── uid: string
│           ├── nickname: string
│           └── role: "owner" | "member"
```

## Request/Response Flow

### Alarm Trigger Flow

```
Client
  ↓
POST /teams/{teamId}/alarm/trigger
  ↓
authMiddleware (verify token)
  ↓
alarmsRoute (validate team exists)
  ↓
firestoreService.triggerAlarm()
  ├─ Update team.alarm state
  └─ Return alarm object
  ↓
fcmService.sendToTopic()
  ├─ Send notification to team_{teamId}
  └─ Include teamId, triggeredBy, triggeredAt
  ↓
Response: TeamAlarm
```

### Team Join Flow

```
Client
  ↓
POST /teams/{teamId}/join
  ↓
authMiddleware (verify token)
  ↓
teamsRoute (validate invite code)
  ↓
firestoreService.addTeamMember()
  ├─ Add member to team
  └─ Add team to user's teams array
  ↓
fcmService.subscribeToTopic()
  └─ Subscribe user to team_{teamId}
  ↓
Response: Team
```

## Error Handling

Все endpoints возвращают стандартный формат ошибки:

```typescript
{
  error: string;      // Описание ошибки
  code: string;       // Код ошибки (UNAUTHORIZED, FORBIDDEN, etc)
  status: number;     // HTTP статус код
}
```

Коды ошибок:
- `401 UNAUTHORIZED` - Отсутствует или неверный токен
- `403 FORBIDDEN` - Недостаточно прав (не владелец команды)
- `404 NOT_FOUND` - Ресурс не найден
- `400 BAD_REQUEST` - Неверный запрос
- `500 INTERNAL_SERVER_ERROR` - Ошибка сервера

## Security Considerations

1. **Authentication**: Все защищенные endpoints требуют Firebase ID token
2. **Authorization**: Проверка прав доступа (только владелец может удалять команду)
3. **Input Validation**: Проверка обязательных полей в request body
4. **Rate Limiting**: Рекомендуется добавить rate limiting для alarm trigger
5. **CORS**: Включен для всех источников (можно ограничить в production)

## Performance Optimizations

1. **Firestore Indexing**: Автоматические индексы для основных queries
2. **FCM Topics**: Использование topics вместо отправки каждому пользователю
3. **Async Operations**: Все операции асинхронные
4. **Error Handling**: Graceful shutdown и обработка ошибок

## Scalability

- **Firestore**: Автоматическое масштабирование
- **FCM**: Поддерживает миллионы устройств
- **Stateless**: Сервер не хранит состояние, можно запустить несколько инстансов
- **Cloud Run**: Автоматическое масштабирование на основе нагрузки

## Monitoring & Logging

- Логирование ошибок в консоль
- Health check endpoint: `GET /health`
- Graceful shutdown обработка (SIGTERM, SIGINT)

## Testing Strategy

- **Unit Tests**: Тестирование сервисов (firestore, fcm, auth)
- **Integration Tests**: Тестирование endpoints
- **Mock Firestore**: Использование jest mocks для unit тестов

## Deployment Architecture

```
┌─────────────────┐
│   Client App    │
└────────┬────────┘
         │ HTTPS
         ↓
┌─────────────────────────────────┐
│   Cloud Run / Heroku / Docker   │
│  ┌─────────────────────────────┐│
│  │   Express.js Server         ││
│  │  ┌───────────────────────┐  ││
│  │  │  Routes & Middleware  │  ││
│  │  ├───────────────────────┤  ││
│  │  │  Services Layer       │  ││
│  │  └───────────────────────┘  ││
│  └─────────────────────────────┘│
└────────┬────────────────┬────────┘
         │                │
         ↓                ↓
    ┌─────────┐      ┌─────────┐
    │Firestore│      │   FCM   │
    └─────────┘      └─────────┘
```

## Future Enhancements

1. **Rate Limiting**: Добавить rate limiting для alarm trigger
2. **Caching**: Redis для кеширования часто используемых данных
3. **WebSocket**: Real-time updates вместо polling
4. **Audit Logging**: Логирование всех действий пользователей
5. **Analytics**: Отслеживание использования алертов
6. **Backup**: Автоматическое резервное копирование Firestore
