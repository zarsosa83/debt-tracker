from contextlib import asynccontextmanager
from datetime import date
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import Session, select

from .db import engine, init_db
from .models import Loan, Payment
from .logic import schedule_rows


class PaymentIn(BaseModel):
    date: date
    amount: float
    apply_to: str = "auto"  # "auto", "principal", "interest"


class ScheduleIn(BaseModel):
    start_date: date
    principal: float
    rate_monthly: float
    months: int
    payments: List[PaymentIn] = []


class LoanCreate(BaseModel):
    name: str
    principal: float
    rate_monthly: float = 0.0
    term_months: int
    start_date: date
    direction: str = "owed_to_me"
    notes: str | None = None


class PaymentCreate(BaseModel):
    pay_date: date
    amount: float
    apply_to: str = "auto"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Lending Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/schedule")
def schedule(body: ScheduleIn):
    rows = schedule_rows(
        body.start_date,
        body.principal,
        body.rate_monthly,
        body.months,
        [p.model_dump() for p in body.payments],
    )
    return {"rows": rows}


@app.post("/loans", response_model=Loan)
def create_loan(data: LoanCreate):
    loan = Loan(**data.model_dump())
    with Session(engine) as s:
        s.add(loan)
        s.commit()
        s.refresh(loan)
        return loan


@app.get("/loans", response_model=list[Loan])
def list_loans():
    with Session(engine) as s:
        return s.exec(select(Loan)).all()


@app.get("/loans/{loan_id}", response_model=Loan)
def get_loan(loan_id: int):
    with Session(engine) as s:
        return s.get(Loan, loan_id)


@app.delete("/loans/{loan_id}")
def delete_loan(loan_id: int):
    with Session(engine) as s:
        loan = s.get(Loan, loan_id)
        if loan:
            s.delete(loan)
            s.commit()
        return {"deleted": loan_id}


@app.post("/loans/{loan_id}/payments", response_model=Payment)
def add_payment(loan_id: int, data: PaymentCreate):
    payment = Payment(loan_id=loan_id, **data.model_dump())
    with Session(engine) as s:
        s.add(payment)
        s.commit()
        s.refresh(payment)
        return payment


@app.get("/loans/{loan_id}/payments", response_model=list[Payment])
def get_payments(loan_id: int):
    with Session(engine) as s:
        return s.exec(select(Payment).where(Payment.loan_id == loan_id)).all()


@app.get("/loans/{loan_id}/schedule")
def get_loan_schedule(loan_id: int):
    with Session(engine) as s:
        loan = s.get(Loan, loan_id)
        if not loan:
            return {"error": "Loan not found"}
        payments = s.exec(select(Payment).where(Payment.loan_id == loan_id)).all()
        rows = schedule_rows(
            loan.start_date,
            loan.principal,
            loan.rate_monthly,
            loan.term_months,
            [{"date": p.pay_date, "amount": p.amount, "apply_to": p.apply_to} for p in payments],
        )
        return {"loan": loan, "rows": rows}
