"""ReshADX Python SDK - Transactions Resource"""

from typing import Any, Dict, List, Optional

from ..models.transactions import (
    GetTransactionsResponse,
    SpendingAnalytics,
    SyncTransactionsResponse,
    Transaction,
)
from ..utils.http import HttpClient


class Transactions:
    """Transactions resource"""

    def __init__(self, http: HttpClient):
        self.http = http

    def list(
        self,
        item_id: Optional[str] = None,
        account_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        categories: Optional[List[str]] = None,
        min_amount: Optional[int] = None,
        max_amount: Optional[int] = None,
        page: int = 1,
        limit: int = 50,
    ) -> GetTransactionsResponse:
        """Get transactions with optional filters"""
        params: Dict[str, Any] = {"page": page, "limit": limit}

        if item_id:
            params["itemId"] = item_id
        if account_id:
            params["accountId"] = account_id
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        if categories:
            params["categories"] = categories
        if min_amount is not None:
            params["minAmount"] = min_amount
        if max_amount is not None:
            params["maxAmount"] = max_amount

        response = self.http.get("/transactions", params=params)
        return GetTransactionsResponse(**response)

    def get(self, transaction_id: str) -> Transaction:
        """Get specific transaction details"""
        response = self.http.get(f"/transactions/{transaction_id}")
        return Transaction(**response)

    def sync(
        self,
        item_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> SyncTransactionsResponse:
        """Sync transactions for an item"""
        data = {"itemId": item_id}

        if start_date:
            data["startDate"] = start_date
        if end_date:
            data["endDate"] = end_date

        response = self.http.post("/transactions/sync", json_data=data)
        return SyncTransactionsResponse(**response)

    def get_spending_analytics(
        self,
        start_date: str,
        end_date: str,
        group_by: str = "category",
        account_ids: Optional[List[str]] = None,
    ) -> SpendingAnalytics:
        """Get spending analytics"""
        params: Dict[str, Any] = {
            "startDate": start_date,
            "endDate": end_date,
            "groupBy": group_by,
        }

        if account_ids:
            params["accountIds"] = account_ids

        response = self.http.get("/transactions/analytics/spending", params=params)
        return SpendingAnalytics(**response)

    def get_income_analytics(
        self,
        start_date: str,
        end_date: str,
        group_by: str = "month",
    ) -> Dict[str, Any]:
        """Get income analytics"""
        params = {
            "startDate": start_date,
            "endDate": end_date,
            "groupBy": group_by,
        }

        return self.http.get("/transactions/analytics/income", params=params)

    def get_cashflow_analytics(
        self,
        start_date: str,
        end_date: str,
        group_by: str = "month",
    ) -> Dict[str, Any]:
        """Get cash flow analytics"""
        params = {
            "startDate": start_date,
            "endDate": end_date,
            "groupBy": group_by,
        }

        return self.http.get("/transactions/analytics/cashflow", params=params)

    def categorize(
        self,
        transaction_id: str,
        category: str,
        subcategory: Optional[str] = None,
    ) -> Transaction:
        """Categorize a transaction manually"""
        data = {"category": category}

        if subcategory:
            data["subcategory"] = subcategory

        response = self.http.patch(f"/transactions/{transaction_id}/categorize", json_data=data)
        return Transaction(**response)

    def search(
        self,
        search_term: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> GetTransactionsResponse:
        """Search transactions"""
        params: Dict[str, Any] = {
            "searchTerm": search_term,
            "page": page,
            "limit": limit,
        }

        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date

        response = self.http.get("/transactions/search", params=params)
        return GetTransactionsResponse(**response)
