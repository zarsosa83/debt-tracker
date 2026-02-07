from datetime import date
from dateutil.relativedelta import relativedelta


def schedule_rows(
    start_date: date,
    principal: float,
    rate_monthly: float,
    months: int,
    payments: list
):
    """
    Calculate loan amortization schedule with custom payments.

    payments: list of dicts with keys:
        - date: date object
        - amount: float
        - apply_to: "auto" | "principal" | "interest" (optional, defaults to "auto")

    Returns rows with: date, label, interest_add, pay_to_interest,
                       pay_to_principal, interest_balance, principal_balance
    """
    p = round(principal, 2)
    ibal = 0.0  # accrued interest ledger
    rows = []
    cursor = start_date
    processed_payments = set()

    # Normalize & sort payments by date
    pays = sorted(payments, key=lambda x: x["date"])

    # Add start row for 0% interest loans
    if rate_monthly == 0:
        rows.append({
            "date": start_date.strftime("%b %d"),
            "label": "Start",
            "interest_add": 0.0,
            "pay_to_interest": 0.0,
            "pay_to_principal": 0.0,
            "interest_balance": 0.0,
            "principal_balance": p,
        })

    for month_num in range(months):
        # Accrue monthly interest (skip if rate is 0)
        interest = round(p * rate_monthly, 2) if rate_monthly > 0 else 0.0
        ibal = round(ibal + interest, 2)

        # Only add interest row if there's interest to track
        if rate_monthly > 0:
            rows.append({
                "date": cursor.strftime("%b %d"),
                "label": "Monthly Interest",
                "interest_add": interest,
                "pay_to_interest": 0.0,
                "pay_to_principal": 0.0,
                "interest_balance": ibal,
                "principal_balance": p,
            })

        next_cursor = cursor + relativedelta(months=1)

        # Apply payments in this period
        # First month: include payments on or after start_date
        # Subsequent months: include payments after previous cursor
        for i, pay in enumerate(pays):
            if i in processed_payments:
                continue

            pay_date = pay["date"]

            # Check if payment falls in current period
            if month_num == 0:
                # First month: include start_date <= pay_date < next_cursor
                in_period = start_date <= pay_date < next_cursor
            else:
                # Subsequent months: cursor <= pay_date < next_cursor
                in_period = cursor <= pay_date < next_cursor

            if not in_period:
                continue

            processed_payments.add(i)
            apply_to = pay.get("apply_to", "auto")
            amount = pay["amount"]
            to_int = 0.0
            to_prin = 0.0

            if apply_to == "principal":
                # All goes to principal
                to_prin = min(p, amount)
                p = round(p - to_prin, 2)
            elif apply_to == "interest":
                # All goes to interest
                to_int = min(ibal, amount)
                ibal = round(ibal - to_int, 2)
            else:  # "auto" - interest first, then principal
                to_int = min(ibal, amount)
                ibal = round(ibal - to_int, 2)
                rem = round(amount - to_int, 2)
                to_prin = min(p, rem)
                p = round(p - to_prin, 2)

            rows.append({
                "date": pay_date.strftime("%b %d"),
                "label": "Payment",
                "interest_add": 0.0,
                "pay_to_interest": to_int,
                "pay_to_principal": to_prin,
                "interest_balance": ibal,
                "principal_balance": p,
            })

        cursor = next_cursor

    # Handle any remaining payments after the term
    for i, pay in enumerate(pays):
        if i in processed_payments:
            continue

        pay_date = pay["date"]
        apply_to = pay.get("apply_to", "auto")
        amount = pay["amount"]
        to_int = 0.0
        to_prin = 0.0

        if apply_to == "principal":
            to_prin = min(p, amount)
            p = round(p - to_prin, 2)
        elif apply_to == "interest":
            to_int = min(ibal, amount)
            ibal = round(ibal - to_int, 2)
        else:
            to_int = min(ibal, amount)
            ibal = round(ibal - to_int, 2)
            rem = round(amount - to_int, 2)
            to_prin = min(p, rem)
            p = round(p - to_prin, 2)

        rows.append({
            "date": pay_date.strftime("%b %d"),
            "label": "Payment",
            "interest_add": 0.0,
            "pay_to_interest": to_int,
            "pay_to_principal": to_prin,
            "interest_balance": ibal,
            "principal_balance": p,
        })

    return rows
