"""ReshADX Python SDK - Credit Score Resource"""

from typing import Any, Dict, List, Optional

from ..models.credit import CalculateCreditScoreResponse, CreditRecommendation, CreditScore
from ..utils.http import HttpClient


class CreditScoreResource:
    """Credit Score resource"""

    def __init__(self, http: HttpClient):
        self.http = http

    def calculate(self, include_alternative_data: bool = False) -> CalculateCreditScoreResponse:
        """Calculate credit score"""
        data = {"includeAlternativeData": include_alternative_data}

        response = self.http.post("/credit-score/calculate", json_data=data)
        return CalculateCreditScoreResponse(**response)

    def get(self) -> CreditScore:
        """Get current credit score"""
        response = self.http.get("/credit-score")
        return CreditScore(**response)

    def get_history(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 10,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Get credit score history"""
        params: Dict[str, Any] = {"limit": limit}

        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date

        return self.http.get("/credit-score/history", params=params)

    def get_factors(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get credit score factors"""
        return self.http.get("/credit-score/factors")

    def get_recommendations(self) -> List[CreditRecommendation]:
        """Get credit recommendations"""
        response = self.http.get("/credit-score/recommendations")
        return [CreditRecommendation(**rec) for rec in response["recommendations"]]

    def simulate(
        self,
        pay_off_debt: Optional[int] = None,
        increase_income: Optional[int] = None,
        reduce_utilization: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Get credit score simulator"""
        scenarios = {}

        if pay_off_debt is not None:
            scenarios["payOffDebt"] = pay_off_debt
        if increase_income is not None:
            scenarios["increaseIncome"] = increase_income
        if reduce_utilization is not None:
            scenarios["reduceUtilization"] = reduce_utilization

        return self.http.post("/credit-score/simulate", json_data=scenarios)
