export interface User {
  uid: string;
  email: string;
  nickname: string;
  teams: string[];
  activeTeamId: string | null;
  fcmToken: string;
  createdAt: number;
}

export interface TeamAlarm {
  isActive: boolean;
  triggeredBy: string;
  triggeredAt: number;
  acknowledgedBy: Record<string, boolean>;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  createdAt: number;
  alarm: TeamAlarm;
}

export interface Member {
  uid: string;
  nickname: string;
  role: 'owner' | 'member';
}

export interface ErrorResponse {
  error: string;
  code: string;
  status: number;
}
