"""ReshADX Python SDK - Risk Models"""

from typing import List, Optional

from pydantic import BaseModel, Field


class DeviceLocation(BaseModel):
    """Device location"""

    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        populate_by_name = True


class DeviceFingerprint(BaseModel):
    """Device fingerprint"""

    device_id: str = Field(alias="deviceId")
    ip_address: str = Field(alias="ipAddress")
    user_agent: str = Field(alias="userAgent")
    location: Optional[DeviceLocation] = None

    class Config:
        populate_by_name = True


class RiskFactor(BaseModel):
    """Risk assessment factor"""

    factor: str
    score: float
    weight: float

    class Config:
        populate_by_name = True


class RiskAssessment(BaseModel):
    """Risk assessment model"""

    risk_score: float = Field(alias="riskScore")
    risk_level: str = Field(alias="riskLevel")
    decision: str
    flags: List[str]
    factors: List[RiskFactor]
    recommendations: List[str]

    class Config:
        populate_by_name = True


class SimSwapCheck(BaseModel):
    """SIM swap check response"""

    sim_swap_detected: bool = Field(alias="simSwapDetected")
    sim_swap_risk: str = Field(alias="simSwapRisk")
    last_sim_swap_date: Optional[str] = Field(None, alias="lastSimSwapDate")
    device_changes: int = Field(alias="deviceChanges")
    recommendations: List[str]

    class Config:
        populate_by_name = True
