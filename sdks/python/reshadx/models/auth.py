"""ReshADX Python SDK - Auth Models"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class User(BaseModel):
    """User model"""

    user_id: str = Field(alias="userId")
    email: EmailStr
    first_name: str = Field(alias="firstName")
    last_name: str = Field(alias="lastName")
    phone_number: str = Field(alias="phoneNumber")
    email_verified: bool = Field(alias="emailVerified")
    phone_verified: bool = Field(alias="phoneVerified")
    account_tier: str = Field(alias="accountTier")
    account_status: str = Field(alias="accountStatus")
    created_at: datetime = Field(alias="createdAt")
    last_login_at: Optional[datetime] = Field(None, alias="lastLoginAt")

    class Config:
        populate_by_name = True


class Tokens(BaseModel):
    """Auth tokens"""

    access_token: str = Field(alias="accessToken")
    refresh_token: str = Field(alias="refreshToken")

    class Config:
        populate_by_name = True


class RegisterRequest(BaseModel):
    """Register request"""

    email: EmailStr
    password: str
    first_name: str = Field(alias="firstName")
    last_name: str = Field(alias="lastName")
    phone_number: str = Field(alias="phoneNumber")
    referral_code: Optional[str] = Field(None, alias="referralCode")

    class Config:
        populate_by_name = True


class RegisterResponse(BaseModel):
    """Register response"""

    user_id: str = Field(alias="userId")
    tokens: Tokens

    class Config:
        populate_by_name = True


class DeviceFingerprintModel(BaseModel):
    """Device fingerprint"""

    device_id: str = Field(alias="deviceId")
    ip_address: str = Field(alias="ipAddress")
    user_agent: str = Field(alias="userAgent")

    class Config:
        populate_by_name = True


class LoginRequest(BaseModel):
    """Login request"""

    email: EmailStr
    password: str
    device_fingerprint: Optional[DeviceFingerprintModel] = Field(None, alias="deviceFingerprint")

    class Config:
        populate_by_name = True


class LoginResponse(BaseModel):
    """Login response"""

    user: User
    tokens: Tokens

    class Config:
        populate_by_name = True
