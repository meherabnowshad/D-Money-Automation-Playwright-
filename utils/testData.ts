export interface UserData {
  name: string;
  email: string;
  password: string;
  phone: string;
  nid: string;
  role: 'Agent' | 'Customer' | 'Merchant';
}

export const CREDENTIALS = {
  admin: {
    email: 'admin@dmoney.com',
    password: '1234',
  },
  system: {
    email: 'system@dmoney.com',
    password: '1234',
  },
};

export function generateRandomAgentData(): UserData {
  const uniqueId = `${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
  const baseEmail = process.env.GMAIL_BASE_EMAIL || 'meherabhossainnowshad';
  return {
    name: `Agent Automation ${uniqueId}`,
    email: `${baseEmail}+agent${uniqueId}@gmail.com`,
    password: 'Password1234',
    phone: `017${Math.floor(10000000 + Math.random() * 90000000)}`,
    nid: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    role: 'Agent',
  };
}

export function getTodaysDateFormatted(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

