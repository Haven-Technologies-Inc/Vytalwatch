/**
 * ReshADX - Real-time Streaming Client Example
 * Demonstrates how to consume Server-Sent Events (SSE) from ReshADX API
 */

import EventSource from 'eventsource';

const BASE_URL = 'http://localhost:3000/api/v1';
const ACCESS_TOKEN = 'your-access-token-here';

/**
 * Stream transactions in real-time
 */
function streamTransactions(itemId?: string, accountId?: string): void {
  const params = new URLSearchParams();
  if (itemId) params.append('itemId', itemId);
  if (accountId) params.append('accountId', accountId);

  const url = `${BASE_URL}/stream/transactions?${params.toString()}`;

  const eventSource = new EventSource(url, {
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
  });

  // Handle connection
  eventSource.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'connected') {
      console.log('✓ Connected to transaction stream at', data.timestamp);
    }
  });

  // Handle new transactions
  eventSource.addEventListener('transaction.new', (event) => {
    const transaction = JSON.parse(event.data);
    console.log('💳 New transaction:', {
      id: transaction.transactionId,
      amount: transaction.amount / 100,
      description: transaction.description,
      category: transaction.category,
    });
  });

  // Handle transaction updates
  eventSource.addEventListener('transaction.updated', (event) => {
    const transaction = JSON.parse(event.data);
    console.log('🔄 Transaction updated:', {
      id: transaction.transactionId,
      status: transaction.status,
      category: transaction.category,
    });
  });

  // Handle errors
  eventSource.onerror = (error) => {
    console.error('❌ Stream error:', error);
    eventSource.close();
  };

  // Close stream after 5 minutes (example)
  setTimeout(() => {
    console.log('Closing stream...');
    eventSource.close();
  }, 5 * 60 * 1000);
}

/**
 * Stream account updates
 */
function streamAccounts(): void {
  const url = `${BASE_URL}/stream/accounts`;

  const eventSource = new EventSource(url, {
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
  });

  eventSource.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'connected') {
      console.log('✓ Connected to account stream');
    }
  });

  eventSource.addEventListener('account.updated', (event) => {
    const account = JSON.parse(event.data);
    console.log('🏦 Account updated:', {
      id: account.accountId,
      name: account.accountName,
      balance: account.balance / 100,
      status: account.status,
    });
  });

  eventSource.onerror = (error) => {
    console.error('❌ Stream error:', error);
    eventSource.close();
  };
}

/**
 * Stream balance updates
 */
function streamBalances(accountIds?: string[]): void {
  const params = new URLSearchParams();
  if (accountIds) {
    params.append('accountIds', accountIds.join(','));
  }

  const url = `${BASE_URL}/stream/balances?${params.toString()}`;

  const eventSource = new EventSource(url, {
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
  });

  eventSource.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'connected') {
      console.log('✓ Connected to balance stream');
    }
  });

  eventSource.addEventListener('balance.updated', (event) => {
    const balance = JSON.parse(event.data);
    console.log('💰 Balance updated:', {
      accountId: balance.accountId,
      balance: balance.balance / 100,
      availableBalance: balance.availableBalance / 100,
      currency: balance.currency,
      timestamp: balance.timestamp,
    });
  });

  eventSource.onerror = (error) => {
    console.error('❌ Stream error:', error);
    eventSource.close();
  };
}

/**
 * Stream fraud alerts
 */
function streamFraudAlerts(): void {
  const url = `${BASE_URL}/stream/fraud-alerts`;

  const eventSource = new EventSource(url, {
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
  });

  eventSource.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'connected') {
      console.log('✓ Connected to fraud alert stream');
    }
  });

  eventSource.addEventListener('fraud.alert', (event) => {
    const alert = JSON.parse(event.data);
    console.log('🚨 FRAUD ALERT:', {
      alertId: alert.alertId,
      riskLevel: alert.riskLevel,
      description: alert.description,
      transactionId: alert.transactionId,
      recommendations: alert.recommendations,
    });

    // Send notification
    if (alert.riskLevel === 'HIGH' || alert.riskLevel === 'CRITICAL') {
      sendPushNotification({
        title: `${alert.riskLevel} Fraud Alert`,
        body: alert.description,
      });
    }
  });

  eventSource.onerror = (error) => {
    console.error('❌ Stream error:', error);
    eventSource.close();
  };
}

/**
 * React Hook Example - useTransactionStream
 */
function useTransactionStream_Example(): void {
  console.log(`
/**
 * React Hook for streaming transactions
 */
import { useEffect, useState } from 'react';
import EventSource from 'eventsource';

interface Transaction {
  transactionId: string;
  amount: number;
  description: string;
  category: string;
  date: string;
}

export function useTransactionStream(accessToken: string, itemId?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (itemId) params.append('itemId', itemId);

    const url = \`\${BASE_URL}/stream/transactions?\${params.toString()}\`;

    const eventSource = new EventSource(url, {
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
      },
    });

    eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'connected') {
        setConnected(true);
      }
    });

    eventSource.addEventListener('transaction.new', (event) => {
      const transaction = JSON.parse(event.data);
      setTransactions(prev => [transaction, ...prev]);
    });

    eventSource.addEventListener('transaction.updated', (event) => {
      const transaction = JSON.parse(event.data);
      setTransactions(prev =>
        prev.map(t => t.transactionId === transaction.transactionId ? transaction : t)
      );
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [accessToken, itemId]);

  return { transactions, connected };
}

// Usage in component
function TransactionList() {
  const { transactions, connected } = useTransactionStream(accessToken, itemId);

  return (
    <div>
      {connected && <span>🟢 Live</span>}
      {transactions.map(txn => (
        <div key={txn.transactionId}>
          {txn.description} - {txn.amount / 100}
        </div>
      ))}
    </div>
  );
}
*/
  `);
}

/**
 * Send push notification (example)
 */
function sendPushNotification(notification: { title: string; body: string }): void {
  console.log('📱 Push notification:', notification);
  // Implement with Firebase Cloud Messaging, OneSignal, etc.
}

/**
 * Example usage
 */
function main(): void {
  console.log('ReshADX Real-time Streaming Client Examples\n');

  // Stream all transactions
  console.log('Starting transaction stream...');
  streamTransactions();

  // Stream transactions for specific account
  // streamTransactions(undefined, 'account-123');

  // Stream account updates
  // streamAccounts();

  // Stream balances for specific accounts
  // streamBalances(['account-123', 'account-456']);

  // Stream fraud alerts
  // streamFraudAlerts();

  // Show React hook example
  // useTransactionStream_Example();
}

// Run examples
if (require.main === module) {
  main();
}

export {
  streamTransactions,
  streamAccounts,
  streamBalances,
  streamFraudAlerts,
};
