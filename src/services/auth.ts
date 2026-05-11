import * as admin from 'firebase-admin';
import axios from 'axios';

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || '';

interface AuthResponse {
  uid: string;
  email: string;
  firebaseToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface FirebaseLoginResponse {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email: string;
}

const loginWithFirebaseRest = async (email: string, password: string): Promise<FirebaseLoginResponse> => {
  const response = await axios.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`,
    {
      email,
      password,
      returnSecureToken: true,
    }
  );

  return {
    idToken: response.data.idToken,
    refreshToken: response.data.refreshToken,
    expiresIn: response.data.expiresIn,
    localId: response.data.localId,
    email: response.data.email,
  };
};

export const authService = {
  async register(email: string, password: string): Promise<AuthResponse> {
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
      });

      const loginResponse = await loginWithFirebaseRest(email, password);

      return {
        uid: userRecord.uid,
        email: userRecord.email || '',
        firebaseToken: loginResponse.idToken,
        refreshToken: loginResponse.refreshToken,
        expiresIn: loginResponse.expiresIn,
      };
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        throw new Error('Email already registered');
      }
      throw error;
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const loginResponse = await loginWithFirebaseRest(email, password);

      return {
        uid: loginResponse.localId,
        email: loginResponse.email,
        firebaseToken: loginResponse.idToken,
        refreshToken: loginResponse.refreshToken,
        expiresIn: loginResponse.expiresIn,
      };
    } catch (error: any) {
      if (error.response?.data?.error?.message === 'INVALID_PASSWORD' ||
          error.response?.data?.error?.message === 'EMAIL_NOT_FOUND') {
        throw new Error('Invalid email or password');
      }
      throw error;
    }
  },

  async refreshToken(refreshToken: string): Promise<Omit<AuthResponse, 'uid' | 'email'>> {
    try {
      const response = await axios.post(
        `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_WEB_API_KEY}`,
        {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }
      );

      return {
        firebaseToken: response.data.id_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error) {
      throw new Error('Failed to refresh token');
    }
  },

  async verifyIdToken(token: string): Promise<any> {
    return admin.auth().verifyIdToken(token);
  },

  async getUser(uid: string) {
    return admin.auth().getUser(uid);
  },

  async deleteUser(uid: string): Promise<void> {
    await admin.auth().deleteUser(uid);
  },
};
