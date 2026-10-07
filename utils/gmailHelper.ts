export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  snippet: string;
  internalDate: number;
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

  async refreshAccessToken(): Promise<string> {
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
    if (!refreshToken) {
      throw new Error('GMAIL_REFRESH_TOKEN is not defined in environment');
    }
    const res = await fetch('https://developers.google.com/oauthplayground/refreshAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token_uri: 'https://oauth2.googleapis.com/token',
        refresh_token: refreshToken,
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      this.accessToken = data.access_token;
      return data.access_token;
    }
    throw new Error('Failed to refresh access token');
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    let response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (response.status === 401 && process.env.GMAIL_REFRESH_TOKEN) {
      await this.refreshAccessToken();
      response = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
    }

    return response;
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

    const response = await this.fetchWithAuth(url.toString());

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
    const response = await this.fetchWithAuth(`${this.baseUrl}/messages/${messageId}`);

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
      internalDate: Number(data.internalDate) || 0,
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
  async waitForLatestOtp(options?: {
    recipientEmail?: string;
    minTimestamp?: number;
    excludeOtp?: string;
    retries?: number;
    delayMs?: number;
  }): Promise<string> {
    if (!this.accessToken) {
      throw new Error('GMAIL_ACCESS_TOKEN is missing. Please set GMAIL_ACCESS_TOKEN in .env or environment variables.');
    }

    const retries = options?.retries ?? 25;
    const delayMs = options?.delayMs ?? 2000;
    const query = 'from:salman@roadtocareer.net OTP';

    for (let i = 0; i < retries; i++) {
      try {
        const messages = await this.listMessages(query, 5);
        for (const msg of messages) {
          const email = await this.readMessage(msg.id);
          // Check timestamp freshness if specified
          if (options?.minTimestamp && email.internalDate < options.minTimestamp) {
            continue;
          }
          // Check recipient matches if specified
          if (options?.recipientEmail && !email.to.toLowerCase().includes(options.recipientEmail.toLowerCase())) {
            continue;
          }
          // Ensure this is an OTP email
          if (!email.subject.toLowerCase().includes('otp')) {
            continue;
          }
          const otpMatch =
            email.body.match(/(?:login is:|otp.*?is:)\s*(\d{4})/i) ||
            email.body.match(/\n\s*(\b\d{4}\b)\s*\n/);
          if (otpMatch) {
            const foundOtp = otpMatch[1];
            if (options?.excludeOtp && foundOtp === options.excludeOtp) {
              continue;
            }
            return foundOtp;
          }
        }
      } catch (e: any) {
        if (e.message?.includes('401')) {
          throw new Error('Gmail API Token Expired (401 Unauthorized). Please provide a fresh GMAIL_ACCESS_TOKEN.');
        }
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
    throw new Error(`Timed out waiting for DMoney OTP from Gmail${options?.recipientEmail ? ` for ${options.recipientEmail}` : ''}`);
  }

  /**
   * Poll for the latest DMoney reset password link or token from incoming email
   */
  async waitForLatestResetToken(options?: { recipientEmail?: string; minTimestamp?: number; retries?: number; delayMs?: number }): Promise<string> {
    if (!this.accessToken) {
      throw new Error('GMAIL_ACCESS_TOKEN is missing. Please set GMAIL_ACCESS_TOKEN in .env or environment variables.');
    }

    const retries = options?.retries ?? 20;
    const delayMs = options?.delayMs ?? 2000;
    const query = 'from:salman@roadtocareer.net "Password Reset"';

    for (let i = 0; i < retries; i++) {
      try {
        const messages = await this.listMessages(query, 5);
        for (const msg of messages) {
          const email = await this.readMessage(msg.id);
          // Check timestamp freshness if specified
          if (options?.minTimestamp && email.internalDate < options.minTimestamp) {
            continue;
          }
          // Check recipient matches if specified
          if (options?.recipientEmail && !email.to.toLowerCase().includes(options.recipientEmail.toLowerCase())) {
            continue;
          }
          const tokenMatch = email.body.match(/token=([a-zA-Z0-9]+)/);
          if (tokenMatch) {
            return tokenMatch[1];
          }
        }
      } catch (e: any) {
        if (e.message?.includes('401')) {
          throw new Error('Gmail API Token Expired (401 Unauthorized). Please provide a fresh GMAIL_ACCESS_TOKEN.');
        }
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
    throw new Error(`Timed out waiting for DMoney Password Reset token from Gmail${options?.recipientEmail ? ` for ${options.recipientEmail}` : ''}`);
  }
}

