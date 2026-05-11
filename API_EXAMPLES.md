# GroupAlarm API Examples

## Base URL
```
http://localhost:3000
```

## Authentication

### Register
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "nickname": "John Doe"
  }'
```

Response:
```json
{
  "uid": "firebase-uid-123",
  "email": "user@example.com",
  "nickname": "John Doe",
  "firebaseToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "AEwA3cxxx...",
  "expiresIn": "3600"
}
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "uid": "firebase-uid-123",
  "email": "user@example.com",
  "firebaseToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "AEwA3cxxx...",
  "expiresIn": "3600"
}
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "AEwA3cxxx..."
  }'
```

Response:
```json
{
  "firebaseToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "AEwA3cxxx...",
  "expiresIn": "3600"
}
```

### Logout
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <firebase_id_token>"
```

Response:
```json
{
  "success": true
}
```

## User Management

### Get User Profile
```bash
curl -X GET http://localhost:3000/users/user-uid-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update User Profile
```bash
curl -X PUT http://localhost:3000/users/user-uid-123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "Jane Doe",
    "activeTeamId": "team-id-123"
  }'
```

### Update FCM Token
```bash
curl -X PUT http://localhost:3000/users/user-uid-123/fcm-token \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "fcm-device-token-here"
  }'
```

## Team Management

### Create Team
```bash
curl -X POST http://localhost:3000/teams \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Team"
  }'
```

Response:
```json
{
  "id": "team-id-123",
  "name": "My Team",
  "ownerId": "user-uid-123",
  "inviteCode": "team-id-123",
  "createdAt": 1620000000000,
  "alarm": {
    "isActive": false,
    "triggeredBy": "",
    "triggeredAt": 0,
    "acknowledgedBy": {}
  }
}
```

### Get Team
```bash
curl -X GET http://localhost:3000/teams/team-id-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Team Members
```bash
curl -X GET http://localhost:3000/teams/team-id-123/members \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
[
  {
    "uid": "user-uid-123",
    "nickname": "John Doe",
    "role": "owner"
  },
  {
    "uid": "user-uid-456",
    "nickname": "Jane Doe",
    "role": "member"
  }
]
```

### Join Team
```bash
curl -X POST http://localhost:3000/teams/team-id-123/join \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "team-id-123"
  }'
```

### Leave Team
```bash
curl -X POST http://localhost:3000/teams/team-id-123/leave \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Kick Member (Owner Only)
```bash
curl -X POST http://localhost:3000/teams/team-id-123/members/user-uid-456/kick \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Delete Team (Owner Only)
```bash
curl -X DELETE http://localhost:3000/teams/team-id-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Alarm Management

### Trigger Alarm
```bash
curl -X POST http://localhost:3000/teams/team-id-123/alarm/trigger \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "isActive": true,
  "triggeredBy": "user-uid-123",
  "triggeredAt": 1620000000000,
  "acknowledgedBy": {
    "user-uid-123": true
  }
}
```

### Acknowledge Alarm
```bash
curl -X POST http://localhost:3000/teams/team-id-123/alarm/acknowledge \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Reset Alarm
```bash
curl -X POST http://localhost:3000/teams/team-id-123/alarm/reset \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Alarm State
```bash
curl -X GET http://localhost:3000/teams/team-id-123/alarm \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Error Responses

### Unauthorized (401)
```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED",
  "status": 401
}
```

### Forbidden (403)
```json
{
  "error": "Only team owner can delete team",
  "code": "FORBIDDEN",
  "status": 403
}
```

### Not Found (404)
```json
{
  "error": "Team not found",
  "code": "NOT_FOUND",
  "status": 404
}
```

### Bad Request (400)
```json
{
  "error": "Missing required field: name",
  "code": "BAD_REQUEST",
  "status": 400
}
```

## Testing with Postman

1. Import the API examples above into Postman
2. Set `{{BASE_URL}}` to `http://localhost:3000`
3. Set `{{TOKEN}}` to your Firebase token after login
4. Use `{{TOKEN}}` in Authorization header: `Bearer {{TOKEN}}`


FCM notifications are sent automatically when alarm is triggered.