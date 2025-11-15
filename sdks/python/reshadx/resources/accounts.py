"""ReshADX Python SDK - Accounts Resource"""

from typing import Optional

from ..models.accounts import Account, Balance, GetAccountsResponse
from ..utils.http import HttpClient


class Accounts:
    """Accounts resource"""

    def __init__(self, http: HttpClient):
        self.http = http

    def list(self, item_id: Optional[str] = None) -> GetAccountsResponse:
        """Get all accounts for a user"""
        params = {}
        if item_id:
            params["itemId"] = item_id

        response = self.http.get("/accounts", params=params)
        return GetAccountsResponse(**response)

    def get(self, account_id: str) -> Account:
        """Get specific account details"""
        response = self.http.get(f"/accounts/{account_id}")
        return Account(**response)

    def get_balance(self, account_id: str) -> Balance:
        """Get account balance"""
        response = self.http.get(f"/accounts/{account_id}/balance")
        return Balance(**response)

    def refresh(self, account_id: str) -> Account:
        """Refresh account data"""
        response = self.http.post(f"/accounts/{account_id}/refresh")
        return Account(**response)
