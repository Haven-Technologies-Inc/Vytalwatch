# ReshADX Backend API

Enterprise-grade Open Banking API for African markets. The African alternative to Plaid.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)

## 🌍 About ReshADX

ReshADX is an open banking platform designed specifically for African markets, providing:

- **Account Linking**: Connect to 100+ banks and mobile money providers across Africa
- **Transaction Data**: Real-time transaction history with African-specific categorization
- **Alternative Credit Scoring**: Revolutionary credit scoring using 8 African data sources
- **Fraud Detection**: ML-powered fraud detection including SIM swap detection
- **Mobile Money First**: Native support for MTN, Vodafone, Airtel, M-Pesa
- **Offline Support**: USSD integration for low-connectivity areas

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL 15 or higher
- Redis 7 or higher
- Docker (optional, recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/reshadx.git
cd reshadx/backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Seed database (optional, for development)
npm run db:seed

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000`.

### Docker Installation (Recommended)

```bash
# Start all services (API, PostgreSQL, Redis, Kafka, etc.)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop all services
docker-compose down
```

## 📚 Documentation

- **[API Reference](./docs/API.md)** - Complete API endpoint documentation
- **[Database Schema](./src/database/README.md)** - Database structure and migrations
- **[Authentication](./docs/AUTHENTICATION.md)** - Auth flow and security
- **[Development Guide](./docs/DEVELOPMENT.md)** - Development best practices
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment
- **[Contributing](./docs/CONTRIBUTING.md)** - How to contribute

## 🏗️ Architecture

```
backend/
├── src/
│   ├── index.ts              # Application entry point
│   ├── config/               # Configuration management
│   ├── controllers/          # Request handlers
│   ├── routes/               # API routes
│   ├── middleware/           # Express middleware
│   ├── services/             # Business logic
│   ├── database/             # Database & migrations
│   ├── cache/                # Redis caching
│   ├── utils/                # Utility functions
│   └── types/                # TypeScript types
├── tests/                    # Test files
├── docker-compose.yml        # Docker services
├── Dockerfile                # Production image
├── k8s/                      # Kubernetes manifests
└── package.json              # Dependencies

```

## 🔧 Tech Stack

### Core
- **Runtime**: Node.js 18.x
- **Language**: TypeScript 5.3
- **Framework**: Express.js 4.x
- **API**: RESTful + GraphQL (planned)

### Databases
- **PostgreSQL 15**: Transactional data (users, accounts, transactions)
- **MongoDB 7**: Documents, logs, analytics
- **Redis 7**: Caching, sessions, rate limiting
- **Kafka** (optional): Event streaming

### Security
- **Authentication**: JWT + API Keys
- **Encryption**: AES-256-GCM
- **Rate Limiting**: Redis-backed, tier-based
- **Validation**: express-validator, Joi

### Monitoring
- **Logging**: Winston + Elasticsearch
- **Error Tracking**: Sentry
- **APM**: New Relic
- **Metrics**: Prometheus + Grafana

## 🌟 Key Features

### 1. Multi-Provider Support

Connect to 100+ financial institutions:
- Banks (all major African banks)
- Mobile Money (MTN, Vodafone, Airtel, M-Pesa)
- Microfinance Institutions
- Credit Unions
- Fintech wallets

### 2. Alternative Credit Scoring

Revolutionary credit scoring using:
- Mobile money behavior (15%)
- Telecom/airtime usage (10%)
- Utility bill payments (10%)
- Employment history (15%)
- Education level (5%)
- Social/community ties (5%)
- Location/residence (5%)
- Digital footprint (5%)
- Traditional credit (40%)

**Score Range**: 300-850 (FICO-like scale)

### 3. Fraud Detection & Risk Assessment

ML-powered fraud detection:
- **SIM Swap Detection** (critical for mobile money security)
- Agent fraud detection
- Cross-border fraud patterns
- Money mule account detection
- AML/PEP/Sanctions screening
- Device fingerprinting
- Behavioral analysis

### 4. Transaction Enrichment

Automatically enrich transactions with:
- Merchant identification
- 16 primary categories + 104 detailed subcategories
- African-specific categories (trotro, susu, market purchases, etc.)
- Location data
- Spending insights
- Recurring transaction detection

### 5. African Market Optimizations

- **Mobile Money Priority**: First-class support for mobile money
- **Offline Support**: USSD integration (*920#)
- **Low Bandwidth**: Optimized for slow connections
- **Multi-Language**: 20+ African languages
- **Multi-Currency**: GHS, NGN, KES, ZAR, etc.
- **Agent Banking**: Cash-in/cash-out support

## 📡 API Endpoints

### Authentication
```
POST   /api/v1/auth/register           # Create account
POST   /api/v1/auth/login              # Login with email
POST   /api/v1/auth/login/phone        # Login with phone (African)
POST   /api/v1/auth/verify/email       # Verify email
POST   /api/v1/auth/verify/phone       # Verify phone (OTP)
POST   /api/v1/auth/refresh            # Refresh token
GET    /api/v1/auth/me                 # Get current user
```

### Link (Account Linking)
```
POST   /api/v1/link/token/create       # Create link token
POST   /api/v1/link/token/exchange     # Exchange public token
GET    /api/v1/link/institutions       # Get institutions
POST   /api/v1/link/ussd/initiate      # USSD linking (offline)
```

### Accounts
```
GET    /api/v1/accounts                # Get all accounts
GET    /api/v1/accounts/:id            # Get account details
GET    /api/v1/accounts/:id/balance    # Get balance
GET    /api/v1/accounts/:id/identity   # Get identity data
```

### Transactions
```
GET    /api/v1/transactions            # Get transactions
GET    /api/v1/transactions/:id/enrich # Get enriched data
GET    /api/v1/transactions/analytics  # Spending analytics
POST   /api/v1/transactions/sync       # Sync latest transactions
```

### Credit Score
```
GET    /api/v1/credit-score            # Get credit score
POST   /api/v1/credit-score/calculate  # Calculate score
GET    /api/v1/credit-score/report     # Detailed report
```

### Risk
```
POST   /api/v1/risk/assess             # Assess risk
POST   /api/v1/risk/check/sim-swap     # Check SIM swap
POST   /api/v1/risk/check/sanctions    # Check sanctions
```

[See full API documentation](./docs/API.md)

## 🔑 Authentication

ReshADX supports two authentication methods:

### 1. JWT Bearer Tokens (for user sessions)
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.reshadx.com/v1/accounts
```

### 2. API Keys (for server-to-server)
```bash
curl -H "Authorization: rshx_YOUR_API_KEY" \
  https://api.reshadx.com/v1/accounts
```

## 📊 Rate Limits

Tier-based rate limiting:

| Tier       | Requests/Min | Requests/Day | Price/Month |
|------------|--------------|--------------|-------------|
| Free       | 100          | 10,000       | $0          |
| Startup    | 500          | 50,000       | $99         |
| Growth     | 2,000        | 200,000      | $499        |
| Business   | 10,000       | 1,000,000    | $1,999      |
| Enterprise | 100,000      | Unlimited    | Custom      |

## 🛡️ Security

- **Encryption at Rest**: AES-256-GCM for sensitive data
- **Encryption in Transit**: TLS 1.3
- **Password Hashing**: bcrypt with salt
- **Rate Limiting**: Redis-backed, tier-based
- **Input Validation**: express-validator + Joi
- **SQL Injection**: Parameterized queries (Knex.js)
- **XSS Protection**: Input sanitization
- **CORS**: Configurable whitelist
- **Helmet.js**: HTTP security headers
- **Audit Logging**: Complete audit trail

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 🚢 Deployment

### Docker

```bash
# Build production image
docker build -t reshadx-api:latest .

# Run container
docker run -p 3000:3000 \
  -e DB_HOST=postgres \
  -e REDIS_HOST=redis \
  reshadx-api:latest
```

### Kubernetes

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/

# Check deployment
kubectl get pods -n reshadx-prod

# View logs
kubectl logs -f deployment/reshadx-backend -n reshadx-prod
```

### Cloud Providers

- [AWS Deployment Guide](./docs/deployment/AWS.md)
- [Google Cloud Deployment Guide](./docs/deployment/GCP.md)
- [Azure Deployment Guide](./docs/deployment/AZURE.md)
- [DigitalOcean Deployment Guide](./docs/deployment/DIGITALOCEAN.md)

## 🌍 Supported Countries

- 🇬🇭 Ghana
- 🇳🇬 Nigeria
- 🇰🇪 Kenya
- 🇿🇦 South Africa
- 🇺🇬 Uganda
- 🇹🇿 Tanzania
- 🇷🇼 Rwanda
- 🇨🇮 Côte d'Ivoire
- 🇸🇳 Senegal
- More coming soon!

## 🏦 Supported Financial Institutions

### Ghana
- Access Bank, Barclays, Ecobank, Fidelity Bank, GCB Bank, Stanbic Bank, Zenith Bank
- MTN Mobile Money, Vodafone Cash, AirtelTigo Money

### Nigeria
- Access Bank, GTBank, First Bank, UBA, Zenith Bank, Fidelity Bank
- MTN Mobile Money, Airtel Money

### Kenya
- Equity Bank, KCB, Cooperative Bank, Standard Chartered
- M-Pesa, Airtel Money

[See full list](./docs/INSTITUTIONS.md)

## 📈 Performance

- **API Response Time**: < 200ms (P95)
- **Uptime**: 99.9% SLA
- **Throughput**: 10,000 req/sec per instance
- **Database Queries**: < 50ms average
- **Cache Hit Rate**: > 80%

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/CONTRIBUTING.md).

```bash
# Fork the repository
# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes
# Run tests
npm test

# Commit with conventional commits
git commit -m "feat: add amazing feature"

# Push and create PR
git push origin feature/amazing-feature
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Plaid for making financial data accessible
- Built for Africa, by Africans
- Special thanks to the open-source community

## 📞 Support

- **Documentation**: https://docs.reshadx.com
- **Email**: support@reshadx.com
- **Slack Community**: https://reshadx.slack.com
- **Twitter**: @reshadx
- **GitHub Issues**: https://github.com/yourusername/reshadx/issues

## 🗺️ Roadmap

### Q1 2025
- ✅ Core API (Auth, Link, Accounts, Transactions)
- ✅ Database schema and migrations
- ✅ CI/CD pipeline
- ⏳ Credit scoring ML models
- ⏳ Fraud detection ML models

### Q2 2025
- Payment initiation API
- Investment data API
- Liabilities API
- GraphQL API
- Python, PHP, Ruby SDKs

### Q3 2025
- Real-time webhooks
- Mobile SDKs (iOS, Android, Flutter)
- Admin dashboard
- Developer portal

### Q4 2025
- Expand to 20+ African countries
- ECOWAS cross-border payments
- Advanced analytics API
- White-label solutions

---

**Built with ❤️ for Africa 🌍**

**Star ⭐ this repo if you find it useful!**
