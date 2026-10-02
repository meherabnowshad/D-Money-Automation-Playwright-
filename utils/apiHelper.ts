import { APIRequestContext } from '@playwright/test';
import { CREDENTIALS } from './testData';

const BASE_API_URL = 'https://dmoney.roadtocareer.net';
const SECRET_KEY = 'ROADTOSDET';

export class ApiHelper {
  private request: APIRequestContext;
  private adminToken: string | null = null;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async getAdminToken(): Promise<string> {
    if (this.adminToken) {
      return this.adminToken;
    }
    const response = await this.request.post(`${BASE_API_URL}/user/login`, {
      data: {
        email: CREDENTIALS.admin.email,
        password: CREDENTIALS.admin.password,
      },
    });
    const body = await response.json();
    this.adminToken = body.token;
    return this.adminToken!;
  }

  async getUserDetailsByEmail(email: string) {
    const token = await this.getAdminToken();
    const response = await this.request.get(`${BASE_API_URL}/user/search/email/${encodeURIComponent(email)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-AUTH-SECRET-KEY': SECRET_KEY,
      },
    });
    const body = await response.json();
    return body.user;
  }

  async getUserOtp(email: string, retries = 5): Promise<string> {
    for (let i = 0; i < retries; i++) {
      const user = await this.getUserDetailsByEmail(email);
      if (user && user.otp) {
        return String(user.otp);
      }
      await new Promise(res => setTimeout(res, 600));
    }
    throw new Error(`OTP not found for email: ${email}`);
  }

  async getUserResetToken(email: string, retries = 5): Promise<string> {
    for (let i = 0; i < retries; i++) {
      const user = await this.getUserDetailsByEmail(email);
      if (user && user.reset_token) {
        return String(user.reset_token);
      }
      await new Promise(res => setTimeout(res, 600));
    }
    throw new Error(`Reset token not found for email: ${email}`);
  }

  async getEligibleCustomerPhone(): Promise<string> {
    const token = await this.getAdminToken();
    const listRes = await this.request.get(`${BASE_API_URL}/user/list`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-AUTH-SECRET-KEY': SECRET_KEY,
      },
    });
    const data = await listRes.json();
    const users = data.users || [];

    // Check for active customer with available limit (balance + 500 <= 10000)
    const activeCustomer = users.find(
      (u: any) => u.role === 'Customer' && u.status === 'active' && (Number(u.balance) || 0) <= 9500
    );
    if (activeCustomer) {
      return activeCustomer.phone_number;
    }

    // If none found, activate a pending customer
    const pendingCustomer = users.find((u: any) => u.role === 'Customer' && u.status !== 'active');
    if (pendingCustomer) {
      await this.request.patch(`${BASE_API_URL}/user/update/${pendingCustomer.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-AUTH-SECRET-KEY': SECRET_KEY,
        },
        data: {
          name: pendingCustomer.name,
          email: pendingCustomer.email,
          phone_number: pendingCustomer.phone_number,
          nid: pendingCustomer.nid,
          role: 'Customer',
          status: 'active',
        },
      });
      return pendingCustomer.phone_number;
    }

    return '01655233072';
  }
}
