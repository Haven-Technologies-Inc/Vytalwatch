"""ReshADX Python SDK - Risk Resource"""

from typing import Any, Dict, List, Optional

from ..models.risk import DeviceFingerprint, RiskAssessment, SimSwapCheck
from ..utils.http import HttpClient


class Risk:
    """Risk resource"""

    def __init__(self, http: HttpClient):
        self.http = http

    def assess(
        self,
        amount: int,
        account_id: str,
        device_fingerprint: Dict[str, Any],
    ) -> Dict[str, RiskAssessment]:
        """Assess risk for a transaction"""
        data = {
            "amount": amount,
            "accountId": account_id,
            "deviceFingerprint": device_fingerprint,
        }

        response = self.http.post("/risk/assess", json_data=data)
        return {"assessment": RiskAssessment(**response["assessment"])}

    def check_sim_swap(self, device_fingerprint: Dict[str, Any]) -> SimSwapCheck:
        """Check for SIM swap fraud"""
        data = {"deviceFingerprint": device_fingerprint}

        response = self.http.post("/risk/sim-swap/check", json_data=data)
        return SimSwapCheck(**response)

    def get_alerts(
        self,
        status: Optional[str] = None,
        risk_level: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """Get fraud alerts for current user"""
        params: Dict[str, Any] = {"page": page, "limit": limit}

        if status:
            params["status"] = status
        if risk_level:
            params["riskLevel"] = risk_level

        return self.http.get("/risk/alerts", params=params)

    def report_fraud(
        self,
        transaction_id: str,
        reason: str,
        details: Optional[str] = None,
    ) -> Dict[str, str]:
        """Report a transaction as fraud"""
        data = {
            "transactionId": transaction_id,
            "reason": reason,
        }

        if details:
            data["details"] = details

        return self.http.post("/risk/fraud/report", json_data=data)

    def get_device_trust_score(self, device_fingerprint: Dict[str, Any]) -> Dict[str, Any]:
        """Get device trust score"""
        data = {"deviceFingerprint": device_fingerprint}
        return self.http.post("/risk/device/trust-score", json_data=data)

    def get_velocity_checks(self) -> Dict[str, Any]:
        """Get velocity checks (transaction frequency analysis)"""
        return self.http.get("/risk/velocity-checks")

    def whitelist_device(
        self,
        device_id: str,
        device_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Whitelist a device"""
        data = {"deviceId": device_id}

        if device_name:
            data["deviceName"] = device_name

        return self.http.post("/risk/device/whitelist", json_data=data)

    def remove_device_whitelist(self, device_id: str) -> Dict[str, bool]:
        """Remove device from whitelist"""
        return self.http.delete(f"/risk/device/whitelist/{device_id}")
