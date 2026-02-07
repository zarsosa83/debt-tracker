from typing import Optional
from datetime import date
from sqlmodel import SQLModel, Field


class Loan(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str                       # Person's name
    principal: float                # Original amount
    rate_monthly: float = 0.0       # Monthly interest rate (0.01 = 1%), default 0
    term_months: int                # Term in months
    start_date: date
    direction: str = "owed_to_me"   # "owed_to_me" or "i_owe"
    notes: Optional[str] = None     # Optional notes


class Payment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    loan_id: int = Field(foreign_key="loan.id")
    pay_date: date
    amount: float
    apply_to: str = "auto"          # "auto" (interest first), "principal", "interest"
