#!/usr/bin/env node
/**
 * Script to list and read the latest email using Gmail API.
 * 
 * Endpoints:
 * - List messages: https://gmail.googleapis.com/gmail/v1/users/me/messages
 * - Read message: https://gmail.googleapis.com/gmail/v1/users/me/messages/{{messageId}}
 */

const token = process.env.GMAIL_ACCESS_TOKEN || process.argv[2] || '';
const query = process.argv[3] || (!process.env.GMAIL_ACCESS_TOKEN ? '' : process.argv[2]) || '';

async function fetchGmail(endpoint) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me${endpoint}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail API error (${res.status}): ${err}`);
  }
  return res.json();
}

function decodeBase64(str) {
  if (!str) return '';
  const cleaned = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(cleaned, 'base64').toString('utf-8');
}

function extractBody(payload) {
  if (!payload) return '';
  if (payload.body && payload.body.data) {
    return decodeBase64(payload.body.data);
  }
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const b = extractBody(part);
      if (b) return b;
    }
  }
  return '';
}

async function main() {
  if (!token) {
    console.error('Error: GMAIL_ACCESS_TOKEN is required.');
    console.error('Provide it via environment variable:');
    console.error('  export GMAIL_ACCESS_TOKEN="<your_token>"');
    console.error('Or pass as argument:');
    console.error('  node scripts/read_latest_email.js "<your_token>"');
    process.exit(1);
  }

  console.log('Connecting to Gmail API...');
  const listEndpoint = query
    ? `/messages?q=${encodeURIComponent(query)}&maxResults=5`
    : '/messages?maxResults=5';

  const listData = await fetchGmail(listEndpoint);
  const messages = listData.messages || [];

  if (messages.length === 0) {
    console.log(`No emails found${query ? ` matching query: "${query}"` : ''}.`);
    return;
  }

  console.log(`Found ${messages.length} email(s). Fetching the latest one (ID: ${messages[0].id})...\n`);

  const messageId = messages[0].id;
  const msgData = await fetchGmail(`/messages/${messageId}`);

  const headers = msgData.payload?.headers || [];
  const getHeader = (name) => {
    const h = headers.find((item) => item.name.toLowerCase() === name.toLowerCase());
    return h ? h.value : '';
  };

  const subject = getHeader('Subject');
  const from = getHeader('From');
  const to = getHeader('To');
  const date = getHeader('Date');
  const body = extractBody(msgData.payload) || msgData.snippet || '';

  console.log('================================================================');
  console.log(` Message ID : ${msgData.id}`);
  console.log(` Thread ID  : ${msgData.threadId}`);
  console.log(` From       : ${from}`);
  console.log(` To         : ${to}`);
  console.log(` Date       : ${date}`);
  console.log(` Subject    : ${subject}`);
  console.log('================================================================');
  console.log('\n--- Content ---');
  console.log(body.trim());
  console.log('----------------------------------------------------------------\n');

  // Parse OTP if present
  const otpMatch = body.match(/(\d{4})/);
  if (otpMatch && subject.toLowerCase().includes('otp')) {
    console.log(`[Extracted OTP]: ${otpMatch[1]}`);
  }

  // Parse Reset Link / Token if present
  const tokenMatch = body.match(/token=([a-zA-Z0-9]+)/);
  if (tokenMatch) {
    console.log(`[Extracted Reset Token]: ${tokenMatch[1]}`);
  }
}

main().catch((err) => {
  console.error('\n[Error]:', err.message);
  process.exit(1);
});

