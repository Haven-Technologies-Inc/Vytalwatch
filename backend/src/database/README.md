# ReshADX Database Schema

Enterprise-grade PostgreSQL database schema for ReshADX Open Banking Platform.

## Overview

This database schema is designed to support a complete open banking platform for African markets, with comprehensive support for:

- Traditional banking accounts
- Mobile money wallets
- Credit scoring with alternative data
- Fraud detection and risk assessment
- Transaction enrichment
- API key management
- Webhook delivery
- Comprehensive audit logging

## Database Tables

### Core Tables

#### 1. **users** (001_create_users_table.ts)
User accounts with comprehensive African identity support.

**Key Features:**
- Email and phone authentication
- African identity documents (Ghana Card, NIN, Passport, etc.)
- KYC/AML status tracking
- Risk scoring and PEP/sanctions screening
- Multi-language and multi-currency support
- Referral system

**Fields:** 80+ fields including identity documents, KYC status, risk assessment, consent tracking

#### 2. **institutions** (002_create_institutions_table.ts)
Financial institutions (banks, mobile money providers, etc.)

**Key Features:**
- Support for banks, mobile money, microfinance, etc.
- Integration types (API, OAuth, USSD, screen scraping)
- Product capabilities tracking
- Mobile money operator details
- Rate limiting configuration
- Uptime and performance tracking

**Fields:** 50+ fields for institution metadata and capabilities

#### 3. **items** (003_create_items_table.ts)
User connections to financial institutions (similar to Plaid's Item concept)

**Key Features:**
- Access token management (encrypted)
- Connection method tracking
- Consent management with expiration
- Webhook configuration per item
- Sync status and scheduling
- Mobile money wallet integration
- Security and fraud detection
- Offline mode support

**Fields:** 40+ fields for connection management

#### 4. **accounts** (004_create_accounts_table.ts)
Individual financial accounts (bank accounts, mobile money wallets)

**Key Features:**
- Account number encryption
- Balance tracking (current, available, pending)
- Mobile money wallet support
- Transaction limits (daily)
- Risk scoring per account
- Account verification status
- Historical balance tracking

**Account Types:** Checking, Savings, Mobile Money, Credit Card, Loan, Investment, Susu, Microfinance

**Fields:** 60+ fields for comprehensive account management

#### 5. **transactions** (005_create_transactions_table.ts)
Financial transactions with African-specific enrichment

**Key Features:**
- Mobile money transaction support
- Merchant identification and enrichment
- African-specific categories (trotro, susu, market purchases)
- Location tracking
- Fraud detection integration
- Recurring transaction detection
- Personal finance management features
- Cross-border transaction support

**Fields:** 70+ fields for transaction details and enrichment

### Advanced Features

#### 6. **credit_scores** (006_create_credit_scores_table.ts)
Revolutionary alternative credit scoring for African markets

**Key Features:**
- Traditional credit scoring (40% weight)
- Alternative data scoring (60% weight)
- 8 alternative data sources:
  - Mobile money behavior (15%)
  - Telecom/airtime usage (10%)
  - Utility bill payments (10%)
  - Employment history (15%)
  - Education level (5%)
  - Social/community ties (5%)
  - Location/residence (5%)
  - Digital footprint (5%)
- FICO-like 300-850 scale
- Explainable AI (SHAP values)
- Credit recommendations
- Score trend tracking

**Fields:** 50+ fields for comprehensive credit assessment

#### 7. **risk_assessments** (007_create_risk_assessments_table.ts)
Fraud detection and risk analysis (Plaid Signal equivalent)

**Key Features:**
- Overall risk scoring (0-100)
- Account fraud detection
- Transaction fraud patterns
- African-specific fraud:
  - SIM swap detection (critical!)
  - Agent fraud detection
  - Cross-border fraud
  - Money mule accounts
- AML indicators
- Device risk analysis
- Behavioral risk
- Network intelligence
- Velocity checks
- Explainable AI

**Fields:** 60+ fields for comprehensive risk assessment

### API & Integration

#### 8. **api_keys** (008_create_api_keys_table.ts)
Developer API key management

**Key Features:**
- Environment separation (sandbox, development, production)
- Granular permissions and scopes
- Product-level access control
- Rate limiting per tier (Free, Startup, Growth, Business, Enterprise)
- Usage statistics
- IP and domain whitelisting
- Auto-rotation support

**Fields:** 30+ fields for API key management

#### 9. **webhooks** (009_create_webhooks_table.ts)
Webhook configuration and delivery tracking

**Key Features:**
- Event subscription management
- HMAC signature verification
- Retry configuration with exponential backoff
- Delivery statistics
- Automatic pausing on failure
- Rate limiting
- Event filtering

**Related Table:** `webhook_deliveries` - Detailed delivery logs

**Fields:** 30+ fields for webhook management

### Compliance & Security

#### 10. **audit_logs** (010_create_audit_logs_table.ts)
Comprehensive audit trail for compliance (GDPR, NDPR, SOC 2)

**Key Features:**
- Actor tracking (user, API key, system, admin)
- Action and resource tracking
- Before/after state changes
- Network and device information
- PII and sensitive data access tracking
- Compliance tagging (GDPR, NDPR, PCI DSS)
- Data access purpose and justification
- Retention policy management
- Suspicious activity flagging

**Fields:** 40+ fields for complete audit trail

## Migrations

### Running Migrations

```bash
# Run all pending migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Rollback all migrations
npm run db:rollback:all

# Check migration status
npm run db:status

# Create a new migration
npm run db:migrate:make migration_name
```

### Migration Files

Migrations are numbered and executed in order:

1. `001_create_users_table.ts` - Users and authentication
2. `002_create_institutions_table.ts` - Financial institutions
3. `003_create_items_table.ts` - User-institution connections
4. `004_create_accounts_table.ts` - Financial accounts
5. `005_create_transactions_table.ts` - Transaction history
6. `006_create_credit_scores_table.ts` - Credit scoring
7. `007_create_risk_assessments_table.ts` - Fraud detection
8. `008_create_api_keys_table.ts` - API authentication
9. `009_create_webhooks_table.ts` - Webhook management
10. `010_create_audit_logs_table.ts` - Audit logging

## Database Features

### Automatic Timestamps

All tables include an `updated_at` trigger that automatically updates the timestamp on row modification:

```sql
CREATE TRIGGER update_[table]_updated_at BEFORE UPDATE ON [table]
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Soft Deletes

Most tables support soft deletion via a `deleted_at` timestamp field.

### UUID Primary Keys

All tables use UUID v4 for primary keys, generated via PostgreSQL's `gen_random_uuid()`.

### Comprehensive Indexing

Indexes are strategically placed for:
- Foreign key relationships
- Frequently queried fields
- Composite queries
- Date range queries

### JSONB Fields

Flexible JSONB fields are used for:
- Metadata
- Configuration
- Features/capabilities
- Array data
- Dynamic schemas

## Performance Considerations

### Partitioning (Recommended for Production)

Large tables should be partitioned:

**Transactions Table:**
```sql
-- Partition by date (monthly or quarterly)
ALTER TABLE transactions PARTITION BY RANGE (date);
```

**Audit Logs Table:**
```sql
-- Partition by occurred_at (monthly)
ALTER TABLE audit_logs PARTITION BY RANGE (occurred_at);
```

### Connection Pooling

Configured in `knexfile.ts`:
- Development: 2-10 connections
- Production: 10-100 connections
- Read replicas supported in production

### Indexes

All high-traffic queries have appropriate indexes. Monitor slow queries and add indexes as needed:

```sql
-- Find slow queries
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Security

### Encryption

Sensitive fields are encrypted at the application level:
- Account numbers
- Access tokens
- Refresh tokens
- API keys (stored as SHA-256 hashes)

### Data Masking

Displayed sensitive data is masked:
- Account numbers: `***1234`
- Phone numbers: `+233***1234`
- Email addresses: `j***@example.com`

### Row-Level Security (RLS)

Consider enabling PostgreSQL RLS for multi-tenant isolation:

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON users
  USING (user_id = current_setting('app.user_id')::uuid);
```

## Backup Strategy

### Recommended Backup Schedule

- **Full backups:** Daily at 2 AM UTC
- **Incremental backups:** Every 6 hours
- **WAL archiving:** Continuous
- **Retention:** 30 days

### Backup Command

```bash
pg_dump -Fc reshadx_prod > backup_$(date +%Y%m%d_%H%M%S).dump
```

## Data Retention

### Retention Policies

- **Transactions:** 7 years (regulatory requirement)
- **Audit logs:** 7 years (compliance)
- **Webhooks deliveries:** 90 days
- **Credit scores:** 2 years
- **Risk assessments:** 3 years

### Archival Strategy

Old data should be archived to cold storage:
1. Export to S3/Cloud Storage
2. Compress with gzip
3. Delete from production DB
4. Maintain index for retrieval

## Monitoring

### Key Metrics to Monitor

- Connection pool utilization
- Query performance (slow queries)
- Table sizes and growth rate
- Index usage and efficiency
- Replication lag (if using replicas)
- Deadlocks and lock waits

### Recommended Tools

- **pgAdmin** - Database management
- **pg_stat_statements** - Query performance
- **Prometheus + Grafana** - Metrics visualization
- **PgBouncer** - Connection pooling
- **pgBackRest** - Backup management

## Compliance

This database schema is designed to support:

- ✅ **GDPR** - EU data protection (right to access, right to be forgotten)
- ✅ **NDPR** - Nigeria Data Protection Regulation
- ✅ **Data Protection Act 2012** - Ghana
- ✅ **PCI DSS** - Payment card security
- ✅ **SOC 2 Type II** - Security and availability
- ✅ **ISO 27001** - Information security

### Data Subject Rights

Support for:
- Right to access (export user data)
- Right to rectification (update user data)
- Right to erasure (soft delete with `deleted_at`)
- Right to data portability (JSON export)
- Right to object (consent tracking)

## Seeding

### Development Seeds

Create seed files in `src/database/seeds/`:

```bash
npm run db:seed:make institutions_seed
npm run db:seed:run
```

### Test Data

Test seeds are in `src/database/seeds/test/` and are only used in the test environment.

## Migration Best Practices

1. **Always test migrations** on a staging database first
2. **Use transactions** for schema changes (default in Knex)
3. **Create indexes concurrently** in production to avoid locks:
   ```sql
   CREATE INDEX CONCURRENTLY idx_name ON table(column);
   ```
4. **Add NOT NULL constraints carefully:**
   - First add the column as nullable
   - Backfill data
   - Then add NOT NULL constraint
5. **Keep migrations reversible** with proper `down()` functions
6. **Document breaking changes** in migration comments

## Support

For database issues or questions:
- Check query performance: `EXPLAIN ANALYZE SELECT ...`
- Review slow query log
- Monitor connection pool
- Check disk space and IOPS
- Review PostgreSQL logs

---

**Database Version:** PostgreSQL 15+
**ORM:** Knex.js
**Schema Version:** 1.0.0
**Last Updated:** 2025-01-14

Built with ❤️ for Africa 🌍
