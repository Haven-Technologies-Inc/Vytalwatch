"""ReshADX Python SDK - Common Models"""

from datetime import datetime
from typing import Any, Dict, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Pagination(BaseModel):
    """Pagination information"""

    total: int
    page: int
    limit: int
    has_more: bool = Field(alias="hasMore")

    class Config:
        populate_by_name = True


class ApiResponse(BaseModel, Generic[T]):
    """Standard API response wrapper"""

    success: bool
    data: T
    message: Optional[str] = None
    request_id: Optional[str] = Field(None, alias="requestId")
    timestamp: Optional[datetime] = None

    class Config:
        populate_by_name = True


class ApiError(BaseModel):
    """API error response"""

    code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    field: Optional[str] = None


class ErrorResponse(BaseModel):
    """Error response wrapper"""

    success: bool = False
    error: ApiError
    request_id: Optional[str] = Field(None, alias="requestId")
    timestamp: Optional[datetime] = None

    class Config:
        populate_by_name = True


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response"""

    items: List[T]
    pagination: Pagination
