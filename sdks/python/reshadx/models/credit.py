"""ReshADX Python SDK - Credit Score Models"""

from typing import List

from pydantic import BaseModel, Field


class CreditScore(BaseModel):
    """Credit score model"""

    score: int
    score_band: str = Field(alias="scoreBand")
    default_probability: float = Field(alias="defaultProbability")
    calculated_at: str = Field(alias="calculatedAt")
    valid_until: str = Field(alias="validUntil")

    class Config:
        populate_by_name = True


class CreditScoreFactor(BaseModel):
    """Credit score factor"""

    factor: str
    impact: str
    weight: float
    description: str

    class Config:
        populate_by_name = True


class CalculateCreditScoreResponse(BaseModel):
    """Calculate credit score response"""

    score: CreditScore
    factors: List[CreditScoreFactor]

    class Config:
        populate_by_name = True


class CreditRecommendation(BaseModel):
    """Credit recommendation"""

    type: str
    priority: str
    title: str
    description: str
    potential_impact: int = Field(alias="potentialImpact")
    actionable: bool

    class Config:
        populate_by_name = True
