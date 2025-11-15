"""ReshADX Python SDK - Account Models"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class Account(BaseModel):
    """Account model"""

    account_id: str = Field(alias="accountId")
    item_id: str = Field(alias="itemId")
    institution_id: str = Field(alias="institutionId")
    account_number: str = Field(alias="accountNumber")
    account_name: str = Field(alias="accountName")
    account_type: str = Field(alias="accountType")
    currency: str
    balance: int
    available_balance: int = Field(alias="availableBalance")
    status: str
    opened_date: Optional[str] = Field(None, alias="openedDate")
    updated_at: datetime = Field(alias="updatedAt")

    class Config:
        populate_by_name = True


class ItemInfo(BaseModel):
    """Item information"""

    item_id: str = Field(alias="itemId")
    institution_id: str = Field(alias="institutionId")
    institution_name: str = Field(alias="institutionName")
    last_synced_at: str = Field(alias="lastSyncedAt")

    class Config:
        populate_by_name = True


class GetAccountsResponse(BaseModel):
    """Get accounts response"""

    accounts: List[Account]
    item: ItemInfo

    class Config:
        populate_by_name = True


class Balance(BaseModel):
    """Balance model"""

    account_id: str = Field(alias="accountId")
    balance: int
    available_balance: int = Field(alias="availableBalance")
    currency: str
    last_updated: str = Field(alias="lastUpdated")

    class Config:
        populate_by_name = True
