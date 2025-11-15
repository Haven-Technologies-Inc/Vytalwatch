"""ReshADX Python SDK - Link Resource"""

from typing import Any, Dict, List

from ..utils.http import HttpClient


class Link:
    """Link resource"""

    def __init__(self, http: HttpClient):
        self.http = http

    def create_link_token(
        self,
        user_id: str,
        products: List[str],
        redirect_uri: str,
        institution_id: str = None,
        language: str = "en",
        country_code: str = "GH",
        webhook: str = None,
    ) -> Dict[str, Any]:
        """Create a Link token for account linking"""
        data = {
            "userId": user_id,
            "products": products,
            "redirectUri": redirect_uri,
            "language": language,
            "countryCode": country_code,
        }

        if institution_id:
            data["institutionId"] = institution_id
        if webhook:
            data["webhook"] = webhook

        return self.http.post("/link/token/create", json_data=data)

    def exchange_public_token(self, public_token: str) -> Dict[str, str]:
        """Exchange public token for access token"""
        data = {"publicToken": public_token}
        return self.http.post("/link/token/exchange", json_data=data)

    def update_link_token(self, item_id: str) -> Dict[str, Any]:
        """Update Link for an existing item (re-authenticate)"""
        data = {"itemId": item_id}
        return self.http.post("/link/token/update", json_data=data)
