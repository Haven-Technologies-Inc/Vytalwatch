"""ReshADX Python SDK - HTTP Client"""

import time
from typing import Any, Dict, Optional
from urllib.parse import urljoin

import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

from .errors import ReshADXError, ServerError


class HttpClient:
    """HTTP client with retry logic"""

    def __init__(
        self,
        api_key: str,
        environment: str = "production",
        base_url: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3,
    ):
        self.api_key = api_key
        self.access_token: Optional[str] = None
        self.timeout = timeout

        # Determine base URL
        if base_url:
            self.base_url = base_url
        elif environment == "production":
            self.base_url = "https://api.reshadx.com/v1"
        else:
            self.base_url = "https://sandbox-api.reshadx.com/v1"

        # Create session with retry logic
        self.session = requests.Session()

        # Configure retries
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "PUT", "DELETE", "OPTIONS", "TRACE", "POST"],
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

        # Set default headers
        self.session.headers.update(
            {
                "Content-Type": "application/json",
                "X-API-Key": self.api_key,
                "User-Agent": "ReshADX-Python-SDK/1.0.0",
            }
        )

    def set_access_token(self, token: str) -> None:
        """Set access token for authenticated requests"""
        self.access_token = token
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def clear_access_token(self) -> None:
        """Clear access token"""
        self.access_token = None
        if "Authorization" in self.session.headers:
            del self.session.headers["Authorization"]

    def request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Any:
        """Make HTTP request"""
        url = urljoin(self.base_url, path.lstrip("/"))

        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=json_data,
                timeout=self.timeout,
                **kwargs,
            )

            # Handle error responses
            if not response.ok:
                self._handle_error_response(response)

            # Parse JSON response
            data = response.json()

            # Return data field if present
            if isinstance(data, dict) and "data" in data:
                return data["data"]

            return data

        except requests.exceptions.Timeout:
            raise ReshADXError("Request timed out", "TIMEOUT_ERROR", 0)
        except requests.exceptions.ConnectionError:
            raise ReshADXError("Connection error", "NETWORK_ERROR", 0)
        except requests.exceptions.RequestException as e:
            raise ReshADXError(str(e), "NETWORK_ERROR", 0)

    def get(self, path: str, params: Optional[Dict[str, Any]] = None, **kwargs: Any) -> Any:
        """GET request"""
        return self.request("GET", path, params=params, **kwargs)

    def post(
        self,
        path: str,
        json_data: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Any:
        """POST request"""
        return self.request("POST", path, json_data=json_data, **kwargs)

    def put(
        self,
        path: str,
        json_data: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Any:
        """PUT request"""
        return self.request("PUT", path, json_data=json_data, **kwargs)

    def patch(
        self,
        path: str,
        json_data: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Any:
        """PATCH request"""
        return self.request("PATCH", path, json_data=json_data, **kwargs)

    def delete(self, path: str, **kwargs: Any) -> Any:
        """DELETE request"""
        return self.request("DELETE", path, **kwargs)

    def _handle_error_response(self, response: requests.Response) -> None:
        """Handle error response"""
        try:
            error_data = response.json()
            if "error" in error_data:
                error = error_data["error"]
                raise ReshADXError(
                    message=error.get("message", "Unknown error"),
                    code=error.get("code", "UNKNOWN_ERROR"),
                    status_code=response.status_code,
                    details=error.get("details"),
                )
        except ValueError:
            pass

        # Fallback error
        raise ServerError(f"HTTP {response.status_code}: {response.text}")
