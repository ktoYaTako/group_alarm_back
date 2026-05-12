import * as admin from 'firebase-admin';

export const fcmService = {
  async subscribeToTopic(token: string, topic: string): Promise<void> {
    try {
      await admin.messaging().subscribeToTopic(token, topic);
    } catch (error) {
      console.error(`Failed to subscribe to topic ${topic}:`, error);
    }
  },

  async unsubscribeFromTopic(token: string, topic: string): Promise<void> {
    try {
      await admin.messaging().unsubscribeFromTopic(token, topic);
    } catch (error) {
      console.error(`Failed to unsubscribe from topic ${topic}:`, error);
    }
  },

  async sendToTopic(
    topic: string,
    data: Record<string, string>
  ): Promise<string> {
    const message: admin.messaging.Message = {
      data,
      topic,
      android: {
        priority: 'high',
      },
    };

    return admin.messaging().send(message);
  },

  async sendToToken(
    token: string,
    data: Record<string, string>
  ): Promise<string> {
    const message: admin.messaging.Message = {
      data,
      token,
      android: {
        priority: 'high',
      },
    };

    return admin.messaging().send(message);
  },
};
