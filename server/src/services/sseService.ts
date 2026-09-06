import { Response } from 'express';

interface ClientConnection {
  id: string;
  companyId: string;
  userId: string;
  res: Response;
}

class SSEService {
  private clients: Map<string, ClientConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Register a new SSE client connection
   */
  public addClient(companyId: string, userId: string, res: Response): string {
    const connectionId = `${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx/proxy buffering
      'Access-Control-Allow-Origin': (res.req as any)?.headers?.origin || '*',
      'Access-Control-Allow-Credentials': 'true',
    });

    // Send initial connection handshake event
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', connectionId })}\n\n`);

    this.clients.set(connectionId, {
      id: connectionId,
      companyId,
      userId,
      res,
    });

    console.log(`[SSE] Client connected: ${connectionId} (company: ${companyId}, user: ${userId}). Total: ${this.clients.size}`);

    res.on('close', () => {
      this.removeClient(connectionId);
    });

    return connectionId;
  }

  /**
   * Remove disconnected client
   */
  public removeClient(connectionId: string): void {
    if (this.clients.has(connectionId)) {
      this.clients.delete(connectionId);
      console.log(`[SSE] Client disconnected: ${connectionId}. Remaining: ${this.clients.size}`);
    }
  }

  /**
   * Broadcast an event to all connected clients of a specific company
   */
  public broadcastToCompany(companyId: string, event: string, data: any): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    let deliveredCount = 0;

    for (const client of this.clients.values()) {
      if (client.companyId === companyId) {
        try {
          client.res.write(payload);
          deliveredCount++;
        } catch (err) {
          console.error(`[SSE] Error writing to client ${client.id}:`, err);
          this.removeClient(client.id);
        }
      }
    }

    console.log(`[SSE] Broadcast event '${event}' to company ${companyId} (${deliveredCount} clients)`);
  }

  /**
   * Keep connections alive through proxies and load balancers with periodic comment
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      const ping = `: heartbeat ${Date.now()}\n\n`;
      for (const [id, client] of this.clients.entries()) {
        try {
          client.res.write(ping);
        } catch {
          this.removeClient(id);
        }
      }
    }, 25000);
  }
}

export const sseService = new SSEService();
export default sseService;
