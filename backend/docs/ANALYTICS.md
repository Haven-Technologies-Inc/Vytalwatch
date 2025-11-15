# ReshADX Analytics Dashboard

Comprehensive analytics and monitoring system with real-time updates.

## Overview

The ReshADX Analytics Dashboard provides deep insights into:
- **Transaction Analytics**: Volume, value, and category distribution
- **Revenue Analytics**: Daily revenue, country breakdown, tier analysis
- **User Growth**: Registration trends, retention, geographic distribution
- **Credit Score Analytics**: Score distribution, trends, risk assessment
- **Fraud Detection**: Real-time alerts, severity analysis, detection rates
- **API Performance**: Endpoint statistics, response times, error rates

## Features

### 1. Real-time Updates
- Server-Sent Events (SSE) for live data streaming
- 5-second update intervals for critical metrics
- Automatic reconnection on connection loss
- Sub-100ms latency for alerts

### 2. Interactive Visualizations
- **Line Charts**: Transaction trends, revenue growth, user acquisition
- **Area Charts**: Volume trends with gradients
- **Bar Charts**: Credit score distribution
- **Pie Charts**: Transaction category breakdown
- **Tables**: Fraud alerts, API endpoints

### 3. Advanced Filtering
- **Time Periods**: 24h, 7d, 30d, 90d, 1y
- **User Segmentation**: Individual vs Business accounts
- **Geographic Filtering**: By country or region
- **Status Filtering**: Active, pending, resolved

## API Endpoints

### Platform Metrics
```http
GET /api/v1/analytics/platform?period=7d
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "totalUsers": 127453,
  "newUsers": 1247,
  "activeBusinesses": 2847,
  "apiCalls": 2400000,
  "revenue": 284950.00,
  "successRate": "99.6",
  "period": "7d",
  "generatedAt": "2024-11-15T10:30:00Z"
}
```

### Transaction Analytics
```http
GET /api/v1/analytics/transactions?period=30d&groupBy=day
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "period": "30d",
  "dailyStats": [
    {
      "date": "2024-11-14",
      "volume": 52100,
      "value": 3870000,
      "success": 51600,
      "failed": 500
    }
  ],
  "categories": [
    {
      "name": "Mobile Money",
      "value": 18235,
      "percentage": "35.0"
    }
  ],
  "generatedAt": "2024-11-15T10:30:00Z"
}
```

### Revenue Analytics (Admin Only)
```http
GET /api/v1/analytics/revenue?period=30d
Authorization: Bearer {admin_access_token}
```

**Response:**
```json
{
  "period": "30d",
  "dailyRevenue": [
    {
      "date": "2024-11-14",
      "revenue": 52100,
      "transactions": 68,
      "unique_users": 45
    }
  ],
  "revenueByCountry": [
    {
      "country": "Nigeria",
      "revenue": "89450.00",
      "transactionCount": "847"
    }
  ],
  "revenueByTier": [
    {
      "tier": "enterprise",
      "revenue": "125600.00",
      "transactionCount": "234"
    }
  ],
  "generatedAt": "2024-11-15T10:30:00Z"
}
```

### User Growth Analytics (Admin Only)
```http
GET /api/v1/analytics/users?period=30d
Authorization: Bearer {admin_access_token}
```

**Response:**
```json
{
  "period": "30d",
  "dailyGrowth": [
    {
      "date": "2024-11-14",
      "individual": 127453,
      "business": 2847,
      "total": 130300
    }
  ],
  "activeUsers": 84567,
  "usersByCountry": [
    {
      "country": "Nigeria",
      "count": 45678
    }
  ],
  "generatedAt": "2024-11-15T10:30:00Z"
}
```

### Credit Score Analytics
```http
GET /api/v1/analytics/credit-scores?period=30d
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "period": "30d",
  "distribution": [
    {
      "range": "750-850 (Excellent)",
      "count": 22195,
      "percentage": "17.4"
    }
  ],
  "scoreTrend": [
    {
      "date": "2024-11-14",
      "avg_score": 682,
      "min_score": 320,
      "max_score": 850
    }
  ],
  "generatedAt": "2024-11-15T10:30:00Z"
}
```

### Fraud Detection Analytics (Admin Only)
```http
GET /api/v1/analytics/fraud?period=7d&status=pending
Authorization: Bearer {admin_access_token}
```

**Response:**
```json
{
  "period": "7d",
  "alerts": [
    {
      "alert_id": "FA-2024-001",
      "alert_type": "SIM_SWAP_DETECTED",
      "severity": "CRITICAL",
      "user_id": "usr_abc123",
      "amount": 50.00,
      "status": "PENDING",
      "created_at": "2024-11-15T10:28:00Z"
    }
  ],
  "bySeverity": [
    {
      "severity": "CRITICAL",
      "count": 12
    }
  ],
  "byType": [
    {
      "alert_type": "SIM_SWAP_DETECTED",
      "count": 8
    }
  ],
  "dailyTrend": [
    {
      "date": "2024-11-14",
      "total_alerts": 45,
      "critical": 5,
      "high": 12,
      "medium": 18,
      "low": 10
    }
  ],
  "detectionRate": "99.4",
  "generatedAt": "2024-11-15T10:30:00Z"
}
```

### API Performance Analytics (Admin Only)
```http
GET /api/v1/analytics/api-performance?period=7d
Authorization: Bearer {admin_access_token}
```

**Response:**
```json
{
  "period": "7d",
  "endpoints": [
    {
      "endpoint": "/api/v1/transactions",
      "total_calls": 1520000,
      "avg_response_time": 145,
      "max_response_time": 892,
      "success_count": 1515000,
      "error_count": 5000
    }
  ],
  "responseTrend": [
    {
      "date": "2024-11-14",
      "avg_response_time": 187,
      "max_response_time": 2450,
      "request_count": 245000
    }
  ],
  "errors": [
    {
      "status_code": 429,
      "count": 2345
    }
  ],
  "generatedAt": "2024-11-15T10:30:00Z"
}
```

## Real-time Streaming

### Analytics Stream (Admin Only)
```http
GET /api/v1/stream/analytics?period=7d
Authorization: Bearer {admin_access_token}
Accept: text/event-stream
```

**Events:**
```
event: connected
data: {"type":"connected","timestamp":"2024-11-15T10:30:00Z","period":"7d"}

event: analytics_update
data: {"timestamp":"2024-11-15T10:30:05Z","activeUsers":1247,"recentTransactions":423,"volume":15678.50,"successRate":99.6}

: heartbeat
```

### Fraud Alerts Stream
```http
GET /api/v1/stream/fraud-alerts
Authorization: Bearer {access_token}
Accept: text/event-stream
```

**Events:**
```
event: fraud_alert
data: {"alertId":"FA-2024-001","type":"SIM_SWAP_DETECTED","severity":"CRITICAL","amount":5000}
```

## Dashboard Components

### Frontend Components

#### AnalyticsDashboard.tsx
Main analytics dashboard with all charts and metrics:
```tsx
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';

function App() {
  return <AnalyticsDashboard />;
}
```

#### Key Features:
- 6 metric cards (transaction volume, revenue, users, credit score, fraud rate, API success)
- 7 interactive charts (transactions, revenue, categories, credit scores, user growth)
- Real-time fraud alerts table
- Auto-refresh every 30 seconds
- Export functionality

### Backend Controllers

#### AnalyticsController
Handles all analytics data aggregation:
- `getPlatformMetrics()`: Overall platform statistics
- `getTransactionAnalytics()`: Transaction trends and categories
- `getRevenueAnalytics()`: Revenue breakdown
- `getUserGrowthAnalytics()`: User acquisition and retention
- `getCreditScoreAnalytics()`: Credit score distribution
- `getFraudAnalytics()`: Fraud detection statistics
- `getAPIPerformanceAnalytics()`: API endpoint performance

#### StreamController
Manages real-time data streaming:
- `streamAnalytics()`: Platform metrics updates
- `streamFraudAlerts()`: Fraud detection alerts
- `streamTransactions()`: Transaction updates
- `streamBalances()`: Balance changes

## Performance

### Metrics
- **Query Performance**: < 500ms for most analytics queries
- **Stream Latency**: < 100ms for real-time updates
- **Update Frequency**: 5 seconds for critical metrics, 30 seconds for standard
- **Concurrent Streams**: 50,000+ simultaneous connections
- **Data Retention**: 90 days for detailed analytics, 1 year for aggregates

### Optimization
- Database indexing on `created_at`, `user_id`, `status`
- Query result caching with Redis (5-minute TTL)
- Aggregate pre-computation for common time periods
- Connection pooling for streaming endpoints

## Security

### Access Control
- **Platform Metrics**: Admin only
- **Revenue Analytics**: Admin only
- **User Analytics**: Admin only
- **Fraud Analytics**: Admin only
- **API Performance**: Admin only
- **Transaction Analytics**: User can see their own data, admin sees all
- **Credit Score Analytics**: User can see their own data, admin sees all

### Rate Limiting
- **REST Endpoints**: 100 requests/minute per user
- **Streaming Endpoints**: 10 concurrent connections per user
- **Admin Endpoints**: 500 requests/minute

### Data Privacy
- Personal data is anonymized in aggregates
- IP addresses are hashed
- Sensitive fields are redacted in logs
- GDPR-compliant data retention

## Usage Examples

### Frontend Integration

```tsx
import { useState, useEffect } from 'react';
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';

function AdminPanel() {
  return (
    <div className="admin-panel">
      <header>
        <h1>ReshADX Analytics</h1>
      </header>

      <AnalyticsDashboard />
    </div>
  );
}
```

### REST API Integration

```typescript
import axios from 'axios';

async function fetchAnalytics(period: string) {
  const response = await axios.get(
    `https://api.reshadx.com/v1/analytics/platform`,
    {
      params: { period },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
}
```

### Real-time Streaming Integration

```typescript
function connectToAnalyticsStream() {
  const eventSource = new EventSource(
    'https://api.reshadx.com/v1/stream/analytics?period=7d',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  eventSource.addEventListener('analytics_update', (event) => {
    const data = JSON.parse(event.data);
    console.log('Analytics update:', data);
    updateDashboard(data);
  });

  eventSource.addEventListener('error', (error) => {
    console.error('Stream error:', error);
    // Reconnect logic
  });

  return eventSource;
}
```

## Monitoring and Alerts

### Built-in Alerts
- **High Error Rate**: > 5% API errors
- **Slow Response**: > 1000ms average response time
- **Fraud Spike**: > 10 CRITICAL alerts in 5 minutes
- **Revenue Drop**: > 20% decrease in daily revenue
- **User Growth Stall**: < 10 new users per day

### Integration with External Systems
- **Prometheus**: Metrics export on `/metrics` endpoint
- **Grafana**: Pre-built dashboard templates
- **Slack**: Webhook notifications for critical alerts
- **PagerDuty**: On-call escalation for CRITICAL issues

## Troubleshooting

### Common Issues

#### 1. Analytics Not Loading
- **Cause**: Database connection timeout
- **Solution**: Check database pool size, increase if needed
- **Command**: `SELECT * FROM pg_stat_activity;`

#### 2. Stream Disconnecting
- **Cause**: Nginx buffering or proxy timeout
- **Solution**: Set `X-Accel-Buffering: no` header
- **Config**: `proxy_buffering off;` in nginx.conf

#### 3. Slow Queries
- **Cause**: Missing indexes on analytics tables
- **Solution**: Run index creation migration
- **Command**: `CREATE INDEX idx_transactions_created_at ON transactions(created_at);`

#### 4. Memory Issues
- **Cause**: Too many concurrent streams
- **Solution**: Implement connection limits per user
- **Config**: Set `MAX_STREAMS_PER_USER=10` in env

## Future Enhancements

### Planned Features
- [ ] Custom dashboard builder
- [ ] Scheduled report generation
- [ ] Anomaly detection with ML
- [ ] Predictive analytics
- [ ] A/B testing framework
- [ ] Cohort analysis
- [ ] Funnel visualization
- [ ] Revenue forecasting

### API Improvements
- [ ] GraphQL endpoint for flexible queries
- [ ] WebSocket support (in addition to SSE)
- [ ] Bulk export API
- [ ] Data warehouse integration
- [ ] Custom metric definitions

---

**Version**: 1.0.0
**Last Updated**: 2024-11-15
**Maintainer**: ReshADX Engineering Team
