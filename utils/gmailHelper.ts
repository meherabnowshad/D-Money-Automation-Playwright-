export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  snippet: string;
}

export class GmailHelper {
  private accessToken: string;
  private readonly baseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.GMAIL_ACCESS_TOKEN || '';
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * List message IDs matching a query
   * Endpoint: https://gmail.googleapis.com/gmail/v1/users/me/messages
   */
  async listMessages(query?: string, maxResults = 10): Promise<{ id: string; threadId: string }[]> {
    const url = new URL(`${this.baseUrl}/messages`);
    if (query) {
      url.searchParams.set('q', query);
    }
    url.searchParams.set('maxResults', String(maxResults));

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gmail listMessages failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.messages || [];
  }

  /**
   * Read full email details by messageId
   * Endpoint: https://gmail.googleapis.com/gmail/v1/users/me/messages/{{messageId}}
   */
  async readMessage(messageId: string): Promise<GmailMessageSummary> {
    const response = await fetch(`${this.baseUrl}/messages/${messageId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gmail readMessage failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const headers = data.payload?.headers || [];

    const getHeader = (name: string) => {
      const h = headers.find((header: any) => header.name.toLowerCase() === name.toLowerCase());
      return h ? h.value : '';
    };

    const decodeBase64 = (encoded: string): string => {
      try {
        const cleaned = encoded.replace(/-/g, '+').replace(/_/g, '/');
        return Buffer.from(cleaned, 'base64').toString('utf-8');
      } catch {
        return '';
      }
    };

    const extractBody = (payload: any): string => {
      if (!payload) return '';
      if (payload.body && payload.body.data) {
        return decodeBase64(payload.body.data);
      }
      if (payload.parts && Array.isArray(payload.parts)) {
        for (const part of payload.parts) {
          const body = extractBody(part);
          if (body) return body;
        }
      }
      return '';
    };

    return {
      id: data.id,
      threadId: data.threadId,
      subject: getHeader('Subject'),
      from: getHeader('From'),
      to: getHeader('To'),
      date: getHeader('Date'),
      body: extractBody(data.payload),
      snippet: data.snippet || '',
    };
  }

  /**
   * Fetch the single latest email
   */
  async getLatestEmail(query?: string): Promise<GmailMessageSummary> {
    const messages = await this.listMessages(query, 1);
    if (!messages || messages.length === 0) {
      throw new Error(`No messages found${query ? ` for query: ${query}` : ''}`);
    }
    return await this.readMessage(messages[0].id);
  }

  /**
   * Poll for the latest DMoney OTP code from incoming email
   */
  async waitForLatestOtp(options?: { minInternalDate?: number; retries?: number; delayMs?: number }): Promise<string> {
    const retries = options?.retries ?? 10;
    const delayMs = options?.delayMs ?? 2000;

    for (let i = 0; i < retries; i++) {
      try {
        const messages = await this.listMessages('from:salman@roadtocareer.net OTP', 5);
        if (messages.length > 0) {
          const email = await this.readMessage(messages[0].id);
          // Match 4-digit OTP
          const otpMatch = email.body.match(/(\d{4})/);
          if (otpMatch) {
            return otpMatch[1];
          }
        }
      } catch (e) {
        // Retry on transient network errors
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
    throw new Error('Timed out waiting for DMoney OTP from Gmail');
  }

  /**
   * Poll for the latest DMoney reset password link or token from incoming email
   */
  async waitForLatestResetToken(options?: { retries?: number; delayMs?: number }): Promise<string> {
    const retries = options?.retries ?? 10;
    const delayMs = options?.delayMs ?? 2000;

    for (let i = 0; i < retries; i++) {
      try {
        const messages = await this.listMessages('from:salman@roadtocareer.net "Password Reset"', 5);
        if (messages.length > 0) {
          const email = await this.readMessage(messages[0].id);
          const tokenMatch = email.body.match(/token=([a-zA-Z0-9]+)/);
          if (tokenMatch) {
            return tokenMatch[1];
          }
        }
      } catch (e) {
        // Retry on transient network errors
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
    throw new Error('Timed out waiting for DMoney Password Reset token from Gmail');
  }
}

