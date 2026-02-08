// localStorage-based API - no backend required

const LOANS_KEY = 'debt_tracker_loans';
const PAYMENTS_KEY = 'debt_tracker_payments';

function getLoans() {
  const data = localStorage.getItem(LOANS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLoans(loans) {
  localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
}

function getPayments() {
  const data = localStorage.getItem(PAYMENTS_KEY);
  return data ? JSON.parse(data) : [];
}

function savePayments(payments) {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
}

function generateId() {
  return Date.now() + Math.random().toString(36).substr(2, 9);
}

// Schedule calculation (ported from Python backend/logic.py)
// interest_type: "none", "flat", "percentage"
function scheduleRows(startDate, principal, rateMonthly, months, payments, interestType) {
  let p = Math.round(principal * 100) / 100;
  let ibal = 0.0;
  const rows = [];
  let cursor = new Date(startDate);
  const processedPayments = new Set();
  const iType = interestType || (rateMonthly > 0 ? 'percentage' : 'none');

  // Normalize & sort payments by date
  const pays = [...payments].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Add start row for no-interest loans
  if (iType === 'none') {
    rows.push({
      date: formatShortDate(cursor),
      label: 'Start',
      interest_add: 0.0,
      pay_to_interest: 0.0,
      pay_to_principal: 0.0,
      interest_balance: 0.0,
      principal_balance: p,
    });
  }

  for (let monthNum = 0; monthNum < months; monthNum++) {
    // Accrue monthly interest based on type
    let interest = 0.0;
    if (iType === 'flat') {
      interest = Math.round(rateMonthly * 100) / 100; // fixed amount
    } else if (iType === 'percentage') {
      interest = Math.round(p * rateMonthly * 100) / 100; // % of principal
    }
    ibal = Math.round((ibal + interest) * 100) / 100;

    // Only add interest row if there's interest to track
    if (iType !== 'none') {
      rows.push({
        date: formatShortDate(cursor),
        label: 'Monthly Interest',
        interest_add: interest,
        pay_to_interest: 0.0,
        pay_to_principal: 0.0,
        interest_balance: ibal,
        principal_balance: p,
      });
    }

    const nextCursor = new Date(cursor);
    nextCursor.setMonth(nextCursor.getMonth() + 1);

    // Apply payments in this period
    for (let i = 0; i < pays.length; i++) {
      if (processedPayments.has(i)) continue;

      const payDate = new Date(pays[i].date);
      const startDateObj = new Date(startDate);

      // Check if payment falls in current period
      let inPeriod = false;
      if (monthNum === 0) {
        inPeriod = payDate >= startDateObj && payDate < nextCursor;
      } else {
        inPeriod = payDate >= cursor && payDate < nextCursor;
      }

      if (!inPeriod) continue;

      processedPayments.add(i);
      const applyTo = pays[i].apply_to || 'auto';
      const amount = pays[i].amount;
      let toInt = 0.0;
      let toPrin = 0.0;

      if (applyTo === 'principal') {
        toPrin = Math.min(p, amount);
        p = Math.round((p - toPrin) * 100) / 100;
      } else if (applyTo === 'interest') {
        toInt = Math.min(ibal, amount);
        ibal = Math.round((ibal - toInt) * 100) / 100;
      } else {
        // auto - interest first, then principal
        toInt = Math.min(ibal, amount);
        ibal = Math.round((ibal - toInt) * 100) / 100;
        const rem = Math.round((amount - toInt) * 100) / 100;
        toPrin = Math.min(p, rem);
        p = Math.round((p - toPrin) * 100) / 100;
      }

      rows.push({
        date: formatShortDate(payDate),
        label: 'Payment',
        interest_add: 0.0,
        pay_to_interest: toInt,
        pay_to_principal: toPrin,
        interest_balance: ibal,
        principal_balance: p,
      });
    }

    cursor = nextCursor;
  }

  // Handle any remaining payments after the term
  for (let i = 0; i < pays.length; i++) {
    if (processedPayments.has(i)) continue;

    const payDate = new Date(pays[i].date);
    const applyTo = pays[i].apply_to || 'auto';
    const amount = pays[i].amount;
    let toInt = 0.0;
    let toPrin = 0.0;

    if (applyTo === 'principal') {
      toPrin = Math.min(p, amount);
      p = Math.round((p - toPrin) * 100) / 100;
    } else if (applyTo === 'interest') {
      toInt = Math.min(ibal, amount);
      ibal = Math.round((ibal - toInt) * 100) / 100;
    } else {
      toInt = Math.min(ibal, amount);
      ibal = Math.round((ibal - toInt) * 100) / 100;
      const rem = Math.round((amount - toInt) * 100) / 100;
      toPrin = Math.min(p, rem);
      p = Math.round((p - toPrin) * 100) / 100;
    }

    rows.push({
      date: formatShortDate(payDate),
      label: 'Payment',
      interest_add: 0.0,
      pay_to_interest: toInt,
      pay_to_principal: toPrin,
      interest_balance: ibal,
      principal_balance: p,
    });
  }

  return rows;
}

function formatShortDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

// API functions (same interface as before, but using localStorage)

export async function fetchLoans() {
  return getLoans();
}

export async function createLoan(loan) {
  const loans = getLoans();
  const newLoan = {
    ...loan,
    id: generateId(),
  };
  loans.push(newLoan);
  saveLoans(loans);
  return newLoan;
}

export async function updateLoan(id, updates) {
  const loans = getLoans();
  const idx = loans.findIndex(l => l.id === id);
  if (idx === -1) throw new Error('Loan not found');
  loans[idx] = { ...loans[idx], ...updates };
  saveLoans(loans);
  return loans[idx];
}

export async function deleteLoan(id) {
  let loans = getLoans();
  loans = loans.filter(l => l.id !== id);
  saveLoans(loans);

  // Also delete associated payments
  let payments = getPayments();
  payments = payments.filter(p => p.loan_id !== id);
  savePayments(payments);

  return { deleted: id };
}

export async function fetchLoanSchedule(id) {
  const loans = getLoans();
  const loan = loans.find(l => l.id === id);
  if (!loan) {
    throw new Error('Loan not found');
  }

  const allPayments = getPayments();
  const loanPayments = allPayments.filter(p => p.loan_id === id);

  const rows = scheduleRows(
    loan.start_date,
    loan.principal,
    loan.rate_monthly,
    loan.term_months,
    loanPayments.map(p => ({
      date: p.pay_date,
      amount: p.amount,
      apply_to: p.apply_to
    })),
    loan.interest_type
  );

  return { loan, rows };
}

export async function addPayment(loanId, payment) {
  const payments = getPayments();
  const newPayment = {
    ...payment,
    id: generateId(),
    loan_id: loanId,
  };
  payments.push(newPayment);
  savePayments(payments);
  return newPayment;
}

export async function calculateSchedule(data) {
  const rows = scheduleRows(
    data.start_date,
    data.principal,
    data.rate_monthly,
    data.months,
    data.payments || []
  );
  return { rows };
}
