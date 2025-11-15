"""ReshADX Python SDK - Webhooks Resource"""

import hashlib
import hmac
import json
from typing import Any, Dict, List, Optional

from ..models.webhooks import Webhook, WebhookDeliveriesResponse
from ..utils.http import HttpClient


class Webhooks:
    """Webhooks resource"""

    def __init__(self, http: HttpClient):
        self.http = http

    def create(
        self,
        url: str,
        events: List[str],
        description: Optional[str] = None,
    ) -> Dict[str, Webhook]:
        """Create a new webhook"""
        data = {
            "url": url,
            "events": events,
        }

        if description:
            data["description"] = description

        response = self.http.post("/webhooks", json_data=data)
        return {"webhook": Webhook(**response["webhook"])}

    def list(self) -> Dict[str, List[Webhook]]:
        """List all webhooks"""
        response = self.http.get("/webhooks")
        return {"webhooks": [Webhook(**wh) for wh in response["webhooks"]]}

    def get(self, webhook_id: str) -> Dict[str, Webhook]:
        """Get webhook details"""
        response = self.http.get(f"/webhooks/{webhook_id}")
        return {"webhook": Webhook(**response["webhook"])}

    def update(
        self,
        webhook_id: str,
        url: Optional[str] = None,
        events: Optional[List[str]] = None,
        description: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Webhook]:
        """Update webhook"""
        updates = {}

        if url:
            updates["url"] = url
        if events:
            updates["events"] = events
        if description:
            updates["description"] = description
        if status:
            updates["status"] = status

        response = self.http.patch(f"/webhooks/{webhook_id}", json_data=updates)
        return {"webhook": Webhook(**response["webhook"])}

    def delete(self, webhook_id: str) -> Dict[str, bool]:
        """Delete webhook"""
        return self.http.delete(f"/webhooks/{webhook_id}")

    def test(self, webhook_id: str) -> Dict[str, str]:
        """Test webhook (send test event)"""
        return self.http.post(f"/webhooks/{webhook_id}/test")

    def rotate_secret(self, webhook_id: str) -> Dict[str, str]:
        """Rotate webhook secret"""
        return self.http.post(f"/webhooks/{webhook_id}/rotate-secret")

    def get_deliveries(
        self,
        webhook_id: str,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> WebhookDeliveriesResponse:
        """Get webhook deliveries (logs)"""
        params: Dict[str, Any] = {"page": page, "limit": limit}

        if status:
            params["status"] = status

        response = self.http.get(f"/webhooks/{webhook_id}/deliveries", params=params)
        return WebhookDeliveriesResponse(**response)

    def retry_delivery(self, webhook_id: str, delivery_id: str) -> Dict[str, str]:
        """Retry failed webhook delivery"""
        return self.http.post(f"/webhooks/{webhook_id}/deliveries/{delivery_id}/retry")

    @staticmethod
    def verify_signature(payload: str, signature: str, secret: str) -> bool:
        """
        Verify webhook signature
        Use this in your webhook endpoint to verify the request is from ReshADX
        """
        try:
            expected_signature = hmac.new(
                secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(signature, expected_signature)
        except Exception:
            return False

    @staticmethod
    def parse_payload(raw_body: str, signature: str, secret: str) -> Optional[Dict[str, Any]]:
        """
        Parse webhook payload
        Helper to parse and validate webhook payload
        """
        if not Webhooks.verify_signature(raw_body, signature, secret):
            return None

        try:
            return json.loads(raw_body)
        except Exception:
            return None
