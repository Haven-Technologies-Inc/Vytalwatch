"""ReshADX Python SDK - Items Resource"""

from typing import Any, Dict

from ..utils.http import HttpClient


class Items:
    """Items resource"""

    def __init__(self, http: HttpClient):
        self.http = http

    def list(self) -> Dict[str, Any]:
        """Get all items for current user"""
        return self.http.get("/items")

    def get(self, item_id: str) -> Dict[str, Any]:
        """Get specific item details"""
        return self.http.get(f"/items/{item_id}")

    def delete(self, item_id: str) -> Dict[str, bool]:
        """Delete an item (remove bank connection)"""
        return self.http.delete(f"/items/{item_id}")

    def sync(self, item_id: str) -> Dict[str, Any]:
        """Trigger item sync"""
        return self.http.post(f"/items/{item_id}/sync")

    def get_sync_status(self, item_id: str, sync_id: str) -> Dict[str, Any]:
        """Get item sync status"""
        return self.http.get(f"/items/{item_id}/sync/{sync_id}")

    def update_webhook(self, item_id: str, webhook_url: str) -> Dict[str, bool]:
        """Update item webhook URL"""
        data = {"webhookUrl": webhook_url}
        return self.http.patch(f"/items/{item_id}", json_data=data)
