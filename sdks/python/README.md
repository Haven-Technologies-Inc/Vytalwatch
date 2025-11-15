# ReshADX Python SDK

Official Python SDK for ReshADX - Open Banking API for Africa.

## Installation

```bash
pip install reshadx
```

## Quick Start

```python
from reshadx import ReshADX

# Initialize the client
client = ReshADX(
    api_key="your-api-key",
    environment="sandbox"  # or "production"
)

# Register a new user
response = client.auth.register(
    email="user@example.com",
    password="SecurePassword123!",
    first_name="John",
    last_name="Doe",
    phone_number="+233201234567"
)

print(f"User ID: {response.user_id}")
print(f"Access Token: {response.tokens.access_token}")

# Get accounts
accounts = client.accounts.list()
for account in accounts.accounts:
    print(f"{account.account_name}: {account.currency} {account.balance / 100}")

# Get transactions
transactions = client.transactions.list(
    start_date="2024-01-01",
    end_date="2024-12-31",
    limit=50
)

for txn in transactions.transactions:
    print(f"{txn.date}: {txn.description} - {txn.amount / 100}")
```

## Features

- **Complete API Coverage**: All ReshADX API endpoints
- **Type Safety**: Full type hints with Pydantic models
- **Automatic Retries**: Built-in retry logic for failed requests
- **Error Handling**: Custom exception classes for different error types
- **Token Management**: Automatic access token injection
- **Python 3.8+**: Support for Python 3.8 and above

## Authentication

### Register a New User

```python
response = client.auth.register(
    email="user@example.com",
    password="SecurePassword123!",
    first_name="John",
    last_name="Doe",
    phone_number="+233201234567",
    referral_code="FRIEND123"  # Optional
)

# Access token is automatically set
print(f"User ID: {response.user_id}")
print(f"Access Token: {response.tokens.access_token}")
```

### Login

```python
response = client.auth.login(
    email="user@example.com",
    password="SecurePassword123!",
    device_fingerprint={
        "deviceId": "device-123",
        "ipAddress": "192.168.1.1",
        "userAgent": "Python/3.11"
    }
)

print(f"User: {response.user.email}")
print(f"Tokens: {response.tokens}")
```

### Get Current User

```python
user = client.auth.get_current_user()
print(f"Current user: {user.email}")
```

## Account Linking

### Create Link Token

```python
response = client.link.create_link_token(
    user_id="user-123",
    products=["ACCOUNTS", "TRANSACTIONS", "IDENTITY"],
    redirect_uri="https://yourapp.com/oauth/callback",
    institution_id="inst_gcb_bank",  # Optional
    language="en",
    country_code="GH",
    webhook="https://yourapp.com/webhooks/reshadx"
)

print(f"Link Token: {response['linkToken']}")
```

### Exchange Public Token

```python
response = client.link.exchange_public_token(
    public_token="public-sandbox-token"
)

print(f"Item ID: {response['itemId']}")
```

## Accounts

### List All Accounts

```python
response = client.accounts.list()

for account in response.accounts:
    print(f"{account.account_name}: {account.currency} {account.balance / 100}")
```

### Get Account Balance

```python
balance = client.accounts.get_balance("account-123")
print(f"Balance: {balance.currency} {balance.balance / 100}")
print(f"Available: {balance.currency} {balance.available_balance / 100}")
```

## Transactions

### List Transactions

```python
response = client.transactions.list(
    start_date="2024-01-01",
    end_date="2024-12-31",
    categories=["FOOD_AND_DRINK", "TRANSPORTATION"],
    min_amount=1000,  # GHS 10.00 (in pesewas)
    max_amount=50000,  # GHS 500.00
    page=1,
    limit=50
)

print(f"Total: {response.pagination.total}")
```

### Sync Transactions

```python
result = client.transactions.sync(
    item_id="item-123",
    start_date="2024-01-01",
    end_date="2024-12-31"
)

print(f"Added: {result.added}, Modified: {result.modified}")
```

### Get Spending Analytics

```python
analytics = client.transactions.get_spending_analytics(
    start_date="2024-01-01",
    end_date="2024-12-31",
    group_by="category",
    account_ids=["account-123"]
)

print(f"Total Spending: {analytics.summary.total_spending / 100}")
```

## Credit Score

### Calculate Credit Score

```python
response = client.credit_score.calculate(include_alternative_data=True)

print(f"Score: {response.score.score} ({response.score.score_band})")
print(f"Default Probability: {response.score.default_probability}%")

for factor in response.factors:
    print(f"{factor.factor}: {factor.impact}")
```

### Get Recommendations

```python
recommendations = client.credit_score.get_recommendations()

for rec in recommendations:
    print(f"[{rec.priority}] {rec.title}")
    print(f"  Potential Impact: +{rec.potential_impact} points")
```

## Risk Assessment

### Assess Transaction Risk

```python
response = client.risk.assess(
    amount=500000,  # GHS 5,000
    account_id="account-123",
    device_fingerprint={
        "deviceId": "device-123",
        "ipAddress": "192.168.1.1",
        "userAgent": "Python/3.11"
    }
)

assessment = response["assessment"]
print(f"Risk Level: {assessment.risk_level}")
print(f"Decision: {assessment.decision}")
```

### Check SIM Swap

```python
result = client.risk.check_sim_swap(
    device_fingerprint={
        "deviceId": "device-123",
        "ipAddress": "192.168.1.1",
        "userAgent": "Python/3.11"
    }
)

if result.sim_swap_detected:
    print(f"⚠️ SIM Swap Detected! Risk: {result.sim_swap_risk}")
```

## Webhooks

### Create Webhook

```python
response = client.webhooks.create(
    url="https://yourapp.com/webhooks/reshadx",
    events=["TRANSACTIONS_UPDATED", "FRAUD_ALERT"],
    description="Production webhook"
)

webhook = response["webhook"]
print(f"Webhook ID: {webhook.webhook_id}")
print(f"Secret: {webhook.secret}")  # Store securely!
```

### Verify Webhook Signature

```python
from reshadx.resources.webhooks import Webhooks
from flask import Flask, request

app = Flask(__name__)

@app.route('/webhooks/reshadx', methods=['POST'])
def webhook_handler():
    signature = request.headers.get('X-ReshADX-Signature')
    raw_body = request.get_data(as_text=True)

    # Verify signature
    if not Webhooks.verify_signature(raw_body, signature, webhook_secret):
        return "Invalid signature", 401

    payload = Webhooks.parse_payload(raw_body, signature, webhook_secret)
    print(f"Event: {payload}")

    return "OK", 200
```

## Error Handling

```python
from reshadx import ReshADXError

try:
    client.auth.login(email="invalid", password="wrong")
except ReshADXError as error:
    print(f"Error {error.code}: {error.message}")
    print(f"Status: {error.status_code}")

    if error.is_auth_error():
        # Handle authentication error
        pass
    elif error.is_rate_limit_error():
        # Handle rate limit
        pass
```

## Environment Configuration

```python
# Production
client = ReshADX(
    api_key="production-api-key",
    environment="production"
)

# Sandbox
client = ReshADX(
    api_key="sandbox-api-key",
    environment="sandbox"
)

# Custom configuration
client = ReshADX(
    api_key="api-key",
    base_url="https://custom-api.example.com/v1",
    timeout=60,
    max_retries=5
)
```

## Type Safety

The SDK uses Pydantic models for full type safety:

```python
from reshadx.models import Account, Transaction, CreditScore

# All responses are fully typed
accounts_response = client.accounts.list()
accounts: list[Account] = accounts_response.accounts

score: CreditScore = client.credit_score.get()
```

## License

MIT

## Support

- Documentation: https://docs.reshadx.com
- API Reference: https://api.reshadx.com/docs
- Issues: https://github.com/reshadx/reshadx/issues
- Email: support@reshadx.com
