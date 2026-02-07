from sqlmodel import create_engine, SQLModel

DB_URL = "sqlite:///lending.db"
engine = create_engine(DB_URL, echo=False)


def init_db():
    from .models import Loan, Payment  # noqa: F401
    SQLModel.metadata.create_all(engine)
