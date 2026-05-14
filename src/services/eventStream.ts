import { Response } from 'express';

interface StreamClient {
  userId: string;
  teamIds: string[];
  res: Response;
  keepAliveInterval: NodeJS.Timeout;
}

class EventStreamService {
  private clients: Map<string, StreamClient> = new Map();

  addClient(userId: string, teamIds: string[], res: Response): void {
    const keepAliveInterval = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': keep-alive\n\n');
      }
    }, 15000);

    const client: StreamClient = {
      userId,
      teamIds,
      res,
      keepAliveInterval,
    };

    this.clients.set(userId, client);
    console.error(`[SSE] ✅ Client ${userId} added to event stream. Total clients: ${this.clients.size}`);

    res.on('close', () => {
      console.error(`[SSE] 🔌 Client ${userId} closed connection`);
      this.removeClient(userId);
    });

    res.on('error', () => {
      console.error(`[SSE] ❌ Client ${userId} error`);
      this.removeClient(userId);
    });
  }

  removeClient(userId: string): void {
    const client = this.clients.get(userId);
    if (client) {
      clearInterval(client.keepAliveInterval);
      this.clients.delete(userId);
      console.error(`[SSE] ❌ Client ${userId} disconnected from event stream. Remaining clients: ${this.clients.size}`);
    }
  }

  sendAlarmEvent(teamId: string, state: any): void {
    const eventData = JSON.stringify({ type: 'alarm', teamId, data: state });
    this.broadcastToTeam(teamId, eventData);
  }

  sendMemberStatusEvent(teamId: string, memberId: string, status: string): void {
    const eventData = JSON.stringify({ type: 'member_status', teamId, memberId, status });
    this.broadcastToTeam(teamId, eventData);
  }

  private broadcastToTeam(teamId: string, eventData: string): void {
    const connectedClients = Array.from(this.clients.values()).filter((client) =>
      client.teamIds.includes(teamId)
    );

    console.error(`[SSE] Broadcasting to team ${teamId}. Connected clients: ${connectedClients.length}`);
    console.error(`[SSE] Event data:`, eventData);

    if (connectedClients.length === 0) {
      console.error(`[SSE] ⚠️  No connected clients for team ${teamId}`);
      return;
    }

    connectedClients.forEach((client) => {
      try {
        if (!client.res.writableEnded) {
          client.res.write(`data: ${eventData}\n\n`);
          console.error(`[SSE] ✅ Sent to client: ${client.userId}`);
        } else {
          console.error(`[SSE] ⚠️  Client ${client.userId} response already ended`);
        }
      } catch (error) {
        console.error(`[SSE] ❌ Failed to send event to client ${client.userId}:`, error);
        this.removeClient(client.userId);
      }
    });

    console.error(`[SSE] ✅ Broadcast complete for team ${teamId}`);
  }

  getConnectedUsers(teamId: string): string[] {
    const users: string[] = [];
    this.clients.forEach((client) => {
      if (client.teamIds.includes(teamId)) {
        users.push(client.userId);
      }
    });
    return users;
  }
}

export const eventStreamService = new EventStreamService();
