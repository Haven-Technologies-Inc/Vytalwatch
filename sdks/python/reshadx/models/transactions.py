"""ReshADX Python SDK - Transaction Models"""

from typing import List, Optional

from pydantic import BaseModel, Field

from .common import Pagination


class TransactionLocation(BaseModel):
    """Transaction location"""

    city: Optional[str] = None
    country: Optional[str] = None

    class Config:
        populate_by_name = True


class Transaction(BaseModel):
    """Transaction model"""

    transaction_id: str = Field(alias="transactionId")
    account_id: str = Field(alias="accountId")
    amount: int
    currency: str
    type: str
    category: str
    subcategory: Optional[str] = None
    description: str
    merchant_name: Optional[str] = Field(None, alias="merchantName")
    merchant_category: Optional[str] = Field(None, alias="merchantCategory")
    date: str
    posting_date: Optional[str] = Field(None, alias="postingDate")
    pending: bool
    reference: Optional[str] = None
    balance: Optional[int] = None
    location: Optional[TransactionLocation] = None

    class Config:
        populate_by_name = True


class GetTransactionsResponse(BaseModel):
    """Get transactions response"""

    transactions: List[Transaction]
    pagination: Pagination

    class Config:
        populate_by_name = True


class SyncTransactionsResponse(BaseModel):
    """Sync transactions response"""

    added: int
    modified: int
    removed: int
    synced_at: str = Field(alias="syncedAt")

    class Config:
        populate_by_name = True


class SpendingDataItem(BaseModel):
    """Spending analytics data item"""

    key: str
    total_spending: int = Field(alias="totalSpending")
    total_income: int = Field(alias="totalIncome")
    net_cash_flow: int = Field(alias="netCashFlow")
    transaction_count: int = Field(alias="transactionCount")
    average_transaction: int = Field(alias="averageTransaction")

    class Config:
        populate_by_name = True


class TopCategory(BaseModel):
    """Top spending category"""

    category: str
    amount: int
    percentage: float

    class Config:
        populate_by_name = True


class SpendingAnalyticsSummary(BaseModel):
    """Spending analytics summary"""

    total_spending: int = Field(alias="totalSpending")
    total_income: int = Field(alias="totalIncome")
    net_cash_flow: int = Field(alias="netCashFlow")
    top_categories: List[TopCategory] = Field(alias="topCategories")

    class Config:
        populate_by_name = True


class SpendingAnalyticsPeriod(BaseModel):
    """Analytics period"""

    start_date: str = Field(alias="startDate")
    end_date: str = Field(alias="endDate")

    class Config:
        populate_by_name = True


class SpendingAnalytics(BaseModel):
    """Spending analytics response"""

    period: SpendingAnalyticsPeriod
    group_by: str = Field(alias="groupBy")
    data: List[SpendingDataItem]
    summary: SpendingAnalyticsSummary

    class Config:
        populate_by_name = True
