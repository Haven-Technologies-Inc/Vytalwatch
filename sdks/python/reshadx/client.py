"""ReshADX Python SDK - Main Client"""

from typing import Optional

from .resources.accounts import Accounts
from .resources.auth import Auth
from .resources.credit_score import CreditScoreResource
from .resources.items import Items
from .resources.link import Link
from .resources.risk import Risk
from .resources.transactions import Transactions
from .resources.webhooks import Webhooks
from .utils.http import HttpClient


class ReshADX:
    """
    ReshADX Python SDK Client

    Example:
        >>> client = ReshADX(api_key="your-api-key", environment="sandbox")
        >>> response = client.auth.register(
        ...     email="user@example.com",
        ...     password="SecurePassword123!",
        ...     first_name="John",
        ...     last_name="Doe",
        ...     phone_number="+233201234567"
        ... )
        >>> print(f"User ID: {response.user_id}")
    """

    def __init__(
        self,
        api_key: str,
        environment: str = "production",
        base_url: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3,
    ):
        """
        Initialize ReshADX client

        Args:
            api_key: Your ReshADX API key
            environment: Environment to use ("sandbox" or "production")
            base_url: Optional custom base URL
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries for failed requests
        """
        self._http = HttpClient(
            api_key=api_key,
            environment=environment,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
        )

        # Initialize resources
        self.auth = Auth(self._http)
        self.link = Link(self._http)
        self.accounts = Accounts(self._http)
        self.transactions = Transactions(self._http)
        self.credit_score = CreditScoreResource(self._http)
        self.risk = Risk(self._http)
        self.webhooks = Webhooks(self._http)
        self.items = Items(self._http)

    def set_access_token(self, token: str) -> None:
        """
        Set access token for authenticated requests
        Use this if you have a stored access token

        Args:
            token: Access token
        """
        self._http.set_access_token(token)

    def clear_access_token(self) -> None:
        """Clear access token"""
        self._http.clear_access_token()
