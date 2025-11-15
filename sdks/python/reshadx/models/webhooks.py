"""ReshADX Python SDK - Webhook Models"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .common import Pagination


class Webhook(BaseModel):
    """Webhook model"""

    webhook_id: str = Field(alias="webhookId")
    user_id: str = Field(alias="userId")
    url: str
    events: List[str]
    secret: str
    status: str
    description: Optional[str] = None
    created_at: datetime = Field(alias="createdAt")
    last_triggered_at: Optional[datetime] = Field(None, alias="lastTriggeredAt")

    class Config:
        populate_by_name = True


class WebhookDelivery(BaseModel):
    """Webhook delivery log"""

    delivery_id: str = Field(alias="deliveryId")
    webhook_id: str = Field(alias="webhookId")
    event: str
    payload: Dict[str, Any]
    status: str
    attempts: int
    sent_at: Optional[datetime] = Field(None, alias="sentAt")
    response_code: Optional[int] = Field(None, alias="responseCode")
    error: Optional[str] = None

    class Config:
        populate_by_name = True


class WebhookDeliveriesResponse(BaseModel):
    """Webhook deliveries response"""

    deliveries: List[WebhookDelivery]
    pagination: Pagination

    class Config:
        populate_by_name = True
