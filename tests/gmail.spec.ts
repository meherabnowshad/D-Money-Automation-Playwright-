import { test, expect } from '@playwright/test';
import { GmailHelper } from '../utils/gmailHelper';

test.describe('Gmail API Integration', () => {
  test.beforeEach(() => {
    test.skip(!process.env.GMAIL_ACCESS_TOKEN, 'GMAIL_ACCESS_TOKEN environment variable not set');
  });

  const gmail = new GmailHelper();

  test('fetch and read latest email via Gmail API', async () => {
    // 1. List messages
    const messages = await gmail.listMessages(undefined, 5);
    console.log('Fetched messages count:', messages.length);
    expect(messages.length).toBeGreaterThan(0);

    const latestMessageId = messages[0].id;
    console.log('Latest Message ID:', latestMessageId);

    // 2. Read latest message details
    const email = await gmail.readMessage(latestMessageId);
    console.log('--- Latest Email Details ---');
    console.log('Subject:', email.subject);
    console.log('From:', email.from);
    console.log('To:', email.to);
    console.log('Date:', email.date);
    console.log('Snippet:', email.snippet);
    console.log('Body Preview:\n', email.body.slice(0, 300));

    expect(email.id).toBe(latestMessageId);
    expect(email.subject).toBeTruthy();
  });

  test('search and read latest DMoney email', async () => {
    const dmoneyMessages = await gmail.listMessages('from:salman@roadtocareer.net', 5);
    console.log('DMoney messages count:', dmoneyMessages.length);
    expect(dmoneyMessages.length).toBeGreaterThan(0);

    const latestDMoney = await gmail.readMessage(dmoneyMessages[0].id);
    console.log('--- Latest DMoney Email ---');
    console.log('Subject:', latestDMoney.subject);
    console.log('Date:', latestDMoney.date);
    console.log('Snippet:', latestDMoney.snippet);
    console.log('Body:\n', latestDMoney.body);

    expect(latestDMoney.from).toContain('roadtocareer');
  });
});

