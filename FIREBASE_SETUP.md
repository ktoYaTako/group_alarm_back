# Firebase Setup Instructions

## Getting Firebase Credentials

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Enter project name (e.g., "GroupAlarm")
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Required Services

#### Enable Authentication
1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Enable "Email/Password" sign-in method

#### Enable Firestore
1. Go to "Firestore Database"
2. Click "Create database"
3. Start in "Test mode" (for development)
4. Choose region (e.g., "us-central1")
5. Click "Create"

#### Enable Cloud Messaging
1. Go to "Cloud Messaging"
2. Note the "Server API Key" (you may need this for mobile app)

### Step 3: Get Service Account Key

1. Go to Project Settings (gear icon)
2. Click "Service Accounts" tab
3. Click "Generate New Private Key"
4. A JSON file will download automatically

### Step 4: Configure Backend

#### Option A: Using firebase-key.json (Recommended)

1. Copy the downloaded JSON file to the backend root directory
2. Rename it to `firebase-key.json`
3. The backend will automatically load it

```bash
# Example structure
backend/
├── src/
├── firebase-key.json    # ← Place your service account JSON here
├── package.json
└── ...
```

#### Option B: Using Environment Variables

If you prefer environment variables:

1. Open the downloaded JSON file
2. Copy the values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Edit `.env` and add the values:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
NODE_ENV=development
PORT=3000
```

**Important**: The private key must have `\n` for newlines and be wrapped in quotes.

### Step 5: Test Connection

```bash
npm run dev
```

You should see:
```
Server running on port 3000
```

If you see Firebase errors, check:
- [ ] firebase-key.json exists in backend root, OR
- [ ] .env file has correct credentials
- [ ] Private key has proper newline escaping
- [ ] All three credentials are present

## Firestore Database Setup

After backend is running, create these collections in Firestore:

### Collections to Create

1. **users** collection
   - Document ID: auto-generated
   - Fields: uid, email, nickname, teams, activeTeamId, fcmToken, createdAt

2. **teams** collection
   - Document ID: auto-generated
   - Fields: id, name, ownerId, inviteCode, createdAt, alarm
   - Subcollection: **members**
     - Document ID: uid
     - Fields: uid, nickname, role

The backend will automatically create documents when needed, but you can pre-create collections for better organization.

## Security Rules (Development)

For development, use these Firestore rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /teams/{teamId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      match /members/{memberId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null;
      }
    }
  }
}
```

**Note**: These are permissive rules for development. Tighten them for production.

## Troubleshooting

### "Failed to parse private key"
- Check that private key has `\n` for newlines
- Ensure it's wrapped in quotes in .env
- Try using firebase-key.json instead

### "The default Firebase app does not exist"
- Ensure firebase-key.json is in backend root, OR
- Check .env file exists and has all credentials
- Restart the server

### "Permission denied" errors
- Check Firestore security rules
- Verify service account has proper permissions
- Try using "Test mode" for development

### "Invalid credentials"
- Download a new service account key
- Make sure you're using the correct project
- Check that all three credentials match

## Next Steps

1. Start the backend: `npm run dev`
2. Test API endpoints with curl or Postman
3. Connect mobile app to backend
4. Set up production Firestore rules before deploying

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
