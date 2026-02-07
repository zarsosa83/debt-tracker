const API_BASE = import.meta.env.PROD ? '' : '/api';

export async function fetchLoans() {
  const res = await fetch(`${API_BASE}/loans`);
  if (!res.ok) throw new Error('Failed to fetch loans');
  return res.json();
}

export async function createLoan(loan) {
  const res = await fetch(`${API_BASE}/loans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loan)
  });
  if (!res.ok) throw new Error('Failed to create loan');
  return res.json();
}

export async function deleteLoan(id) {
  const res = await fetch(`${API_BASE}/loans/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete loan');
  return res.json();
}

export async function fetchLoanSchedule(id) {
  const res = await fetch(`${API_BASE}/loans/${id}/schedule`);
  if (!res.ok) throw new Error('Failed to fetch schedule');
  return res.json();
}

export async function addPayment(loanId, payment) {
  const res = await fetch(`${API_BASE}/loans/${loanId}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment)
  });
  if (!res.ok) throw new Error('Failed to add payment');
  return res.json();
}

export async function calculateSchedule(data) {
  const res = await fetch(`${API_BASE}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to calculate schedule');
  return res.json();
}
