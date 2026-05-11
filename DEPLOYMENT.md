# Deployment Guide

## Оглавление
1. [Локальная разработка](#локальная-разработка)
2. [Подготовка к деплою](#подготовка-к-деплою)
3. [Деплой на ВДС](#деплой-на-вдс)
4. [Обновление кода после деплоя](#обновление-кода-после-деплоя)
5. [Мониторинг и логи](#мониторинг-и-логи)
6. [Troubleshooting](#troubleshooting)

---

## Локальная разработка

### Первый запуск

1. Установите зависимости:
```bash
npm install
```

2. Создайте `.env` файл:
```bash
cp .env.example .env
```

3. Заполните Firebase credentials в `.env`:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key-with-escaped-newlines
FIREBASE_CLIENT_EMAIL=your-email@project.iam.gserviceaccount.com
FIREBASE_WEB_API_KEY=your-web-api-key
NODE_ENV=development
PORT=3000
```

4. Запустите dev сервер:
```bash
npm run dev
```

Сервер будет доступен на `http://localhost:3000`

### Проверка перед деплоем

Перед деплоем убедитесь, что всё работает:

```bash
# Сборка TypeScript
npm run build

# Проверка, что dist создана
ls dist/

# Локальный запуск production версии
NODE_ENV=production npm start
```

---

## Подготовка к деплою

### Что нужно на ВДС

1. **Docker** (для контейнеризации)
2. **Docker Compose** (для управления контейнерами)
3. **SSH доступ** к ВДС
4. **Firebase credentials** (service account JSON)

### Проверка Docker на ВДС

Подключитесь к ВДС по SSH и проверьте:

```bash
# Проверка Docker
docker --version
docker run hello-world

# Проверка Docker Compose
docker-compose --version
```

Если Docker не установлен, установите:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Добавьте текущего пользователя в группу docker (чтобы не писать sudo)
sudo usermod -aG docker $USER
newgrp docker
```

---

## Деплой на ВДС

### Шаг 1: Подготовка проекта локально

1. Убедитесь, что код собирается:
```bash
npm run build
```

2. Создайте `.env.production` с production переменными:
```
FIREBASE_PROJECT_ID=your-prod-project-id
FIREBASE_PRIVATE_KEY=your-prod-private-key
FIREBASE_CLIENT_EMAIL=your-prod-email@project.iam.gserviceaccount.com
FIREBASE_WEB_API_KEY=your-prod-web-api-key
NODE_ENV=production
PORT=3000
```

**⚠️ ВАЖНО:** Никогда не коммитьте `.env.production` в git!

### Шаг 2: Загрузка проекта на ВДС

Есть несколько способов. Самый простой — через git:

```bash
# На ВДС, в папке где будет проект
cd /opt  # или другая папка
git clone https://github.com/your-repo/AlarmApp.git
cd AlarmApp/backend
```

Или через SCP (если нет git):
```bash
# С локальной машины
scp -r backend/ user@your-vds-ip:/opt/AlarmApp/backend
```

### Шаг 3: Настройка переменных окружения на ВДС

На ВДС создайте `.env` файл:

```bash
cd /opt/AlarmApp/backend
nano .env
```

Вставьте production переменные:
```
FIREBASE_PROJECT_ID=your-prod-project-id
FIREBASE_PRIVATE_KEY=your-prod-private-key
FIREBASE_CLIENT_EMAIL=your-prod-email@project.iam.gserviceaccount.com
FIREBASE_WEB_API_KEY=your-prod-web-api-key
NODE_ENV=production
PORT=3000
```

**Сохраните:** Ctrl+O, Enter, Ctrl+X

### Шаг 4: Сборка Docker образа

На ВДС:

```bash
cd /opt/AlarmApp/backend

# Сборка образа (это займет 2-3 минуты)
docker build -t groupalarm-backend:latest .

# Проверка, что образ создан
docker images | grep groupalarm-backend
```

### Шаг 5: Запуск контейнера

**Вариант A: Простой запуск (для тестирования)**

```bash
docker run -d \
  --name groupalarm-backend \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  groupalarm-backend:latest
```

Проверка:
```bash
# Посмотреть логи
docker logs groupalarm-backend

# Проверить, что контейнер запущен
docker ps | grep groupalarm-backend

# Проверить health endpoint
curl http://localhost:3000/health
```

**Вариант B: Запуск через docker-compose (рекомендуется)**

Создайте `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: groupalarm-backend:latest
    container_name: groupalarm-backend
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Запуск:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

Проверка:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Шаг 6: Проверка, что всё работает

```bash
# Проверить health endpoint
curl http://localhost:3000/health

# Проверить логи
docker logs groupalarm-backend

# Проверить, что контейнер перезагружается при падении
docker ps
```

---

## Обновление кода после деплоя

### Сценарий: Нашли баг, нужно залить фикс

**Время на обновление: ~2-3 минуты**

#### Способ 1: Через git (если проект на ВДС через git)

```bash
# На ВДС
cd /opt/AlarmApp/backend

# Получить последние изменения
git pull origin main

# Пересобрать образ
docker build -t groupalarm-backend:latest .

# Перезапустить контейнер
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Проверить логи
docker-compose -f docker-compose.prod.yml logs -f
```

#### Способ 2: Через SCP (если проект загружен через SCP)

```bash
# С локальной машины
# 1. Соберите код локально
npm run build

# 2. Загрузите только измененные файлы
scp -r dist/ user@your-vds-ip:/opt/AlarmApp/backend/

# На ВДС
cd /opt/AlarmApp/backend

# 3. Пересоберите образ
docker build -t groupalarm-backend:latest .

# 4. Перезапустите контейнер
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# 5. Проверьте логи
docker-compose -f docker-compose.prod.yml logs -f
```

#### Способ 3: Быстрый перезапуск (если меняли только .env)

```bash
# На ВДС
cd /opt/AlarmApp/backend

# Просто перезапустите контейнер
docker-compose -f docker-compose.prod.yml restart backend

# Проверьте логи
docker-compose -f docker-compose.prod.yml logs -f
```

---

## Мониторинг и логи

### Просмотр логов

```bash
# Последние 50 строк
docker logs groupalarm-backend --tail 50

# Логи в реальном времени
docker logs -f groupalarm-backend

# Логи с временем
docker logs -f --timestamps groupalarm-backend

# Через docker-compose
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Проверка здоровья сервера

```bash
# Health check endpoint
curl http://localhost:3000/health

# Проверить, что контейнер запущен
docker ps | grep groupalarm-backend

# Статистика контейнера (CPU, память)
docker stats groupalarm-backend
```

### Остановка и перезапуск

```bash
# Остановить
docker-compose -f docker-compose.prod.yml down

# Перезапустить
docker-compose -f docker-compose.prod.yml up -d

# Перезагрузить (без остановки)
docker-compose -f docker-compose.prod.yml restart backend
```

---

## Troubleshooting

### Контейнер не запускается

```bash
# Посмотрите логи
docker logs groupalarm-backend

# Проверьте, что образ собран
docker images | grep groupalarm-backend

# Проверьте, что порт 3000 свободен
netstat -tlnp | grep 3000
# или
lsof -i :3000
```

### Firebase Authentication Error

```bash
# Проверьте, что .env файл существует и заполнен
cat .env

# Проверьте, что приватный ключ правильно экранирован
# В .env должны быть экранированные переводы строк: \n вместо реальных переводов
```

### Контейнер постоянно перезагружается

```bash
# Посмотрите логи
docker logs groupalarm-backend

# Проверьте, что Node.js может запуститься
docker run -it groupalarm-backend:latest node dist/index.js
```

### Нет доступа к серверу с другой машины

```bash
# Проверьте, что контейнер слушает на 0.0.0.0:3000
docker exec groupalarm-backend netstat -tlnp

# Проверьте firewall на ВДС
sudo ufw status
sudo ufw allow 3000

# Проверьте, что можете подключиться с ВДС
curl http://localhost:3000/health

# С другой машины
curl http://your-vds-ip:3000/health
```

### Память/CPU использование высокое

```bash
# Посмотрите статистику
docker stats groupalarm-backend

# Посмотрите логи на ошибки
docker logs groupalarm-backend

# Перезагрузите контейнер
docker-compose -f docker-compose.prod.yml restart backend
```

---

## Полезные команды

```bash
# Удалить старый образ (если нужно место)
docker rmi groupalarm-backend:old-tag

# Очистить неиспользуемые образы
docker image prune

# Посмотреть все контейнеры (включая остановленные)
docker ps -a

# Удалить контейнер
docker rm groupalarm-backend

# Войти в контейнер (для отладки)
docker exec -it groupalarm-backend sh

# Скопировать файл из контейнера
docker cp groupalarm-backend:/app/dist/index.js ./index.js
```

---

## Безопасность

1. **Никогда не коммитьте `.env` файлы** в git
2. **Используйте HTTPS** в production (настройте reverse proxy, например nginx)
3. **Ограничьте доступ** к порту 3000 только необходимым IP адресам
4. **Регулярно обновляйте** Node.js образ (меняйте версию в Dockerfile)
5. **Мониторьте логи** на ошибки и подозрительную активность
6. **Используйте strong пароли** для Firebase service account

---

## Чек-лист перед production деплоем

- [ ] Код собирается без ошибок (`npm run build`)
- [ ] Локально работает production версия (`NODE_ENV=production npm start`)
- [ ] Все тесты проходят (`npm test`)
- [ ] `.env.production` создан и заполнен
- [ ] `.env.production` добавлен в `.gitignore`
- [ ] Docker образ собирается (`docker build -t groupalarm-backend:latest .`)
- [ ] Контейнер запускается и отвечает на health check
- [ ] Логи не содержат ошибок
- [ ] Firestore и FCM работают
- [ ] Firewall на ВДС настроен правильно
