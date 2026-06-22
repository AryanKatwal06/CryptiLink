// Service to fetch data from Bank Server and PostHog
const BANK_SERVER_URL = import.meta.env.VITE_BANK_SERVER_URL || 'http://localhost:3000/api/v1';
const DASHBOARD_KEY = import.meta.env.VITE_DASHBOARD_API_KEY || 'dummy_key';

const POSTHOG_PROJECT_ID = import.meta.env.VITE_POSTHOG_PROJECT_ID;
const POSTHOG_PERSONAL_API_KEY = import.meta.env.VITE_POSTHOG_PERSONAL_API_KEY;

export async function fetchBankSummary() {
  const res = await fetch(`${BANK_SERVER_URL}/analytics/summary`, {
    headers: { 'X-Dashboard-Key': DASHBOARD_KEY }
  });
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}

export async function fetchRecentTransactions() {
  const res = await fetch(`${BANK_SERVER_URL}/analytics/recent-transactions?limit=20`, {
    headers: { 'X-Dashboard-Key': DASHBOARD_KEY }
  });
  if (!res.ok) throw new Error('Failed to fetch recent transactions');
  return res.json();
}

export async function fetchChannelStats() {
  const res = await fetch(`${BANK_SERVER_URL}/analytics/channel-stats`, {
    headers: { 'X-Dashboard-Key': DASHBOARD_KEY }
  });
  if (!res.ok) throw new Error('Failed to fetch channel stats');
  return res.json();
}

// PostHog query helper (simplified)
export async function queryPostHog(query: any) {
  if (!POSTHOG_PROJECT_ID || !POSTHOG_PERSONAL_API_KEY) {
    // Return mock data for the prototype if keys aren't set
    return {
      results: [
        { timestamp: new Date(Date.now() - 5000).toISOString(), properties: { amount: 150, channel_used: 'sms' }, event: 'TX_TRANSMITTED' },
        { timestamp: new Date(Date.now() - 15000).toISOString(), properties: { amount: 200, channel_used: 'acoustic' }, event: 'TX_TRANSMITTED' },
        { timestamp: new Date(Date.now() - 25000).toISOString(), properties: { amount: 50 }, event: 'TX_SIGNED' }
      ]
    };
  }
  const res = await fetch(`https://app.posthog.com/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${POSTHOG_PERSONAL_API_KEY}`
    },
    body: JSON.stringify({ query })
  });
  if (!res.ok) throw new Error('Failed to query PostHog');
  return res.json();
}
