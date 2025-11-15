"""ReshADX Python SDK - Auth Resource"""

from typing import Dict, List, Optional

from ..models.auth import LoginResponse, RegisterResponse, User
from ..utils.http import HttpClient


class Auth:
    """Auth resource"""

    def __init__(self, http: HttpClient):
        self.http = http

    def register(
        self,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        phone_number: str,
        referral_code: Optional[str] = None,
    ) -> RegisterResponse:
        """Register a new user"""
        data = {
            "email": email,
            "password": password,
            "firstName": first_name,
            "lastName": last_name,
            "phoneNumber": phone_number,
        }

        if referral_code:
            data["referralCode"] = referral_code

        response = self.http.post("/auth/register", json_data=data)
        result = RegisterResponse(**response)

        # Automatically set access token
        self.http.set_access_token(result.tokens.access_token)

        return result

    def login(
        self,
        email: str,
        password: str,
        device_fingerprint: Optional[Dict[str, str]] = None,
    ) -> LoginResponse:
        """Login with email and password"""
        data = {
            "email": email,
            "password": password,
        }

        if device_fingerprint:
            data["deviceFingerprint"] = device_fingerprint

        response = self.http.post("/auth/login", json_data=data)
        result = LoginResponse(**response)

        # Automatically set access token
        self.http.set_access_token(result.tokens.access_token)

        return result

    def logout(self) -> None:
        """Logout (clear local token)"""
        self.http.clear_access_token()

    def get_current_user(self) -> User:
        """Get current user profile"""
        response = self.http.get("/auth/me")
        return User(**response)

    def verify_email(self, token: str) -> Dict[str, bool]:
        """Verify email with verification token"""
        response = self.http.post("/auth/verify-email", json_data={"token": token})
        return response

    def request_password_reset(self, email: str) -> Dict[str, bool]:
        """Request password reset"""
        response = self.http.post("/auth/forgot-password", json_data={"email": email})
        return response

    def reset_password(self, token: str, new_password: str) -> Dict[str, bool]:
        """Reset password with reset token"""
        response = self.http.post(
            "/auth/reset-password",
            json_data={"token": token, "newPassword": new_password},
        )
        return response

    def refresh_token(self, refresh_token: str) -> Dict[str, str]:
        """Refresh access token using refresh token"""
        response = self.http.post("/auth/refresh-token", json_data={"refreshToken": refresh_token})

        # Update access token
        if "accessToken" in response:
            self.http.set_access_token(response["accessToken"])

        return response

    def change_password(self, current_password: str, new_password: str) -> Dict[str, bool]:
        """Change password (requires current password)"""
        response = self.http.post(
            "/auth/change-password",
            json_data={"currentPassword": current_password, "newPassword": new_password},
        )
        return response

    def update_profile(
        self,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        phone_number: Optional[str] = None,
    ) -> User:
        """Update user profile"""
        updates = {}
        if first_name:
            updates["firstName"] = first_name
        if last_name:
            updates["lastName"] = last_name
        if phone_number:
            updates["phoneNumber"] = phone_number

        response = self.http.patch("/auth/profile", json_data=updates)
        return User(**response)

    def enable_two_factor(self) -> Dict[str, any]:
        """Enable two-factor authentication"""
        response = self.http.post("/auth/2fa/enable")
        return response

    def verify_two_factor(self, code: str) -> Dict[str, bool]:
        """Verify two-factor authentication setup"""
        response = self.http.post("/auth/2fa/verify", json_data={"code": code})
        return response

    def disable_two_factor(self, password: str) -> Dict[str, bool]:
        """Disable two-factor authentication"""
        response = self.http.post("/auth/2fa/disable", json_data={"password": password})
        return response
