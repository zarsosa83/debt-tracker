import { useState, useEffect } from 'react'
import * as api from './api'

function formatMoney(n) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n)
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export default function App() {
  const [tab, setTab] = useState('owed_to_me')
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(null) // 'loan' | 'payment' | 'edit'
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [interestType, setInterestType] = useState('none')
  const [editInterestType, setEditInterestType] = useState('none')

  useEffect(() => {
    loadLoans()
  }, [])

  async function loadLoans() {
    try {
      setLoading(true)
      const data = await api.fetchLoans()
      setLoans(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const owedToMe = loans.filter(l => l.direction === 'owed_to_me')
  const iOwe = loans.filter(l => l.direction === 'i_owe')
  const currentLoans = tab === 'owed_to_me' ? owedToMe : tab === 'i_owe' ? iOwe : []

  const totalOwedToMe = owedToMe.reduce((sum, l) => sum + l.principal, 0)
  const totalIOwe = iOwe.reduce((sum, l) => sum + l.principal, 0)

  async function handleCreateLoan(e) {
    e.preventDefault()
    const form = e.target
    const iType = interestType
    let rateMonthly = 0
    if (iType === 'flat') {
      rateMonthly = parseFloat(form.rate.value) // dollar amount
    } else if (iType === 'percentage') {
      rateMonthly = parseFloat(form.rate.value) / 100 // convert % to decimal
    }
    const loan = {
      name: form.name.value,
      principal: parseFloat(form.principal.value),
      rate_monthly: rateMonthly,
      interest_type: iType,
      term_months: parseInt(form.term.value),
      start_date: form.start_date.value,
      direction: form.direction.value,
      notes: form.notes.value || null
    }
    try {
      await api.createLoan(loan)
      await loadLoans()
      setShowModal(null)
      setInterestType('none')
    } catch (e) {
      alert('Failed to create debt')
    }
  }

  async function handleEditLoan(e) {
    e.preventDefault()
    const form = e.target
    const iType = editInterestType
    let rateMonthly = 0
    if (iType === 'flat') {
      rateMonthly = parseFloat(form.rate.value)
    } else if (iType === 'percentage') {
      rateMonthly = parseFloat(form.rate.value) / 100
    }
    const updates = {
      name: form.name.value,
      principal: parseFloat(form.principal.value),
      rate_monthly: rateMonthly,
      interest_type: iType,
      term_months: parseInt(form.term.value),
      start_date: form.start_date.value,
      direction: form.direction.value,
      notes: form.notes.value || null
    }
    try {
      const updated = await api.updateLoan(selectedLoan.id, updates)
      setSelectedLoan(updated)
      await loadLoans()
      const data = await api.fetchLoanSchedule(selectedLoan.id)
      setSchedule(data)
      setShowModal(null)
    } catch (e) {
      alert('Failed to update debt')
    }
  }

  async function handleDeleteLoan(id) {
    if (!confirm('Delete this debt?')) return
    try {
      await api.deleteLoan(id)
      await loadLoans()
      setSelectedLoan(null)
      setSchedule(null)
      setTab(tab === 'schedule' ? 'owed_to_me' : tab)
    } catch (e) {
      alert('Failed to delete')
    }
  }

  async function handleViewSchedule(loan) {
    setSelectedLoan(loan)
    setTab('schedule')
    try {
      const data = await api.fetchLoanSchedule(loan.id)
      setSchedule(data)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleAddPayment(e) {
    e.preventDefault()
    const form = e.target
    const payment = {
      pay_date: form.pay_date.value,
      amount: parseFloat(form.amount.value),
      apply_to: form.apply_to?.value || 'auto'
    }
    try {
      await api.addPayment(selectedLoan.id, payment)
      const data = await api.fetchLoanSchedule(selectedLoan.id)
      setSchedule(data)
      setShowModal(null)
    } catch (e) {
      alert('Failed to add payment')
    }
  }

  function openEditModal() {
    const iType = selectedLoan.interest_type || (selectedLoan.rate_monthly > 0 ? 'percentage' : 'none')
    setEditInterestType(iType)
    setShowModal('edit')
  }

  function getInterestDisplay(loan) {
    const iType = loan.interest_type || (loan.rate_monthly > 0 ? 'percentage' : 'none')
    if (iType === 'none') return 'No interest'
    if (iType === 'flat') return `$${formatMoney(loan.rate_monthly)}/mo flat`
    return `${loan.rate_monthly * 100}%/mo`
  }

  function getEditRateValue() {
    if (!selectedLoan) return '0'
    const iType = selectedLoan.interest_type || (selectedLoan.rate_monthly > 0 ? 'percentage' : 'none')
    if (iType === 'flat') return selectedLoan.rate_monthly
    if (iType === 'percentage') return selectedLoan.rate_monthly * 100
    return 0
  }

  const hasInterest = selectedLoan && (selectedLoan.interest_type || 'none') !== 'none'

  return (
    <div className="app">
      <header className="header">
        <h1>Debt Tracker</h1>
        <div className="header-summary">
          <span className="positive">+${formatMoney(totalOwedToMe)}</span>
          <span className="separator">/</span>
          <span className="negative">-${formatMoney(totalIOwe)}</span>
        </div>
      </header>

      <nav className="nav">
        <button
          className={tab === 'owed_to_me' ? 'active' : ''}
          onClick={() => { setTab('owed_to_me'); setSelectedLoan(null); setSchedule(null); }}
        >
          They Owe Me ({owedToMe.length})
        </button>
        <button
          className={tab === 'i_owe' ? 'active' : ''}
          onClick={() => { setTab('i_owe'); setSelectedLoan(null); setSchedule(null); }}
        >
          I Owe ({iOwe.length})
        </button>
        <button
          className={tab === 'schedule' ? 'active' : ''}
          onClick={() => setTab('schedule')}
          disabled={!selectedLoan}
        >
          Details
        </button>
      </nav>

      <main className="content">
        {(tab === 'owed_to_me' || tab === 'i_owe') && (
          <>
            {loading ? (
              <div className="loading"><div className="spinner" /></div>
            ) : currentLoans.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">{tab === 'owed_to_me' ? '+' : '-'}</div>
                <p>{tab === 'owed_to_me' ? 'No one owes you' : "You don't owe anyone"}</p>
                <p className="mt-2">Tap + to add a debt</p>
              </div>
            ) : (
              currentLoans.map(loan => (
                <div key={loan.id} className="card" onClick={() => handleViewSchedule(loan)}>
                  <div className="card-header">
                    <div>
                      <div className="card-title">{loan.name}</div>
                      <div className="card-subtitle">
                        {getInterestDisplay(loan)} · {loan.term_months} months
                      </div>
                      {loan.notes && <div className="card-notes">{loan.notes}</div>}
                    </div>
                    <div className="text-right">
                      <div className={`card-amount ${tab === 'owed_to_me' ? 'positive' : 'negative'}`}>
                        {tab === 'owed_to_me' ? '+' : '-'}${formatMoney(loan.principal)}
                      </div>
                      <div className="card-subtitle">{formatDate(loan.start_date)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <button className="fab" onClick={() => { setInterestType('none'); setShowModal('loan'); }}>+</button>
          </>
        )}

        {tab === 'schedule' && selectedLoan && (
          <>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className={`card-badge ${selectedLoan.direction === 'owed_to_me' ? 'badge-positive' : 'badge-negative'}`}>
                    {selectedLoan.direction === 'owed_to_me' ? 'OWES ME' : 'I OWE'}
                  </div>
                  <div className="card-title">{selectedLoan.name}</div>
                  <div className="card-subtitle">Since {formatDate(selectedLoan.start_date)}</div>
                  <div className="card-subtitle">{getInterestDisplay(selectedLoan)} · {selectedLoan.term_months} months</div>
                  {selectedLoan.notes && <div className="card-notes mt-2">{selectedLoan.notes}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ width: 'auto', padding: '8px 12px', fontSize: '12px' }}
                    onClick={openEditModal}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ width: 'auto', padding: '8px 12px', fontSize: '12px' }}
                    onClick={() => handleDeleteLoan(selectedLoan.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {schedule ? (
              <div className="card" style={{ padding: '8px', overflowX: 'auto' }}>
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      {hasInterest && <th className="amount">Int+</th>}
                      {hasInterest && <th className="amount">Paid Int</th>}
                      <th className="amount">Paid Prin</th>
                      {hasInterest && <th className="amount">Int Bal</th>}
                      <th className="amount">Prin Bal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.rows.map((row, i) => (
                      <tr key={i} className={row.label === 'Payment' ? 'payment' : ''}>
                        <td>{row.date}</td>
                        <td>{row.label === 'Monthly Interest' ? 'Int' : row.label === 'Start' ? 'Start' : 'Pay'}</td>
                        {hasInterest && <td className="amount">{row.interest_add > 0 ? formatMoney(row.interest_add) : '-'}</td>}
                        {hasInterest && <td className="amount positive">{row.pay_to_interest > 0 ? formatMoney(row.pay_to_interest) : '-'}</td>}
                        <td className="amount positive">{row.pay_to_principal > 0 ? formatMoney(row.pay_to_principal) : '-'}</td>
                        {hasInterest && <td className="amount">{formatMoney(row.interest_balance)}</td>}
                        <td className="amount">{formatMoney(row.principal_balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="loading"><div className="spinner" /></div>
            )}

            {schedule && schedule.rows.length > 0 && (
              <div className="card summary-card">
                <div className="summary-row">
                  <span>Principal Balance</span>
                  <span className="amount">${formatMoney(schedule.rows[schedule.rows.length - 1].principal_balance)}</span>
                </div>
                {hasInterest && (
                  <div className="summary-row">
                    <span>Interest Balance</span>
                    <span className="amount">${formatMoney(schedule.rows[schedule.rows.length - 1].interest_balance)}</span>
                  </div>
                )}
                {hasInterest && (
                  <div className="summary-row total">
                    <span>Total Owed</span>
                    <span className="amount">
                      ${formatMoney(
                        schedule.rows[schedule.rows.length - 1].principal_balance +
                        schedule.rows[schedule.rows.length - 1].interest_balance
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button className="fab" onClick={() => setShowModal('payment')}>+</button>
          </>
        )}
      </main>

      {/* New Debt Modal */}
      {showModal === 'loan' && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Debt</h2>
              <button className="modal-close" onClick={() => setShowModal(null)}>&times;</button>
            </div>
            <form onSubmit={handleCreateLoan}>
              <div className="form-group">
                <label>Type</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input type="radio" name="direction" value="owed_to_me" defaultChecked={tab === 'owed_to_me' || tab === 'schedule'} />
                    <span>They owe me</span>
                  </label>
                  <label className="radio-label">
                    <input type="radio" name="direction" value="i_owe" defaultChecked={tab === 'i_owe'} />
                    <span>I owe them</span>
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Person's Name</label>
                <input name="name" placeholder="e.g., John" required />
              </div>
              <div className="form-group">
                <label>Amount ($)</label>
                <input name="principal" type="number" step="0.01" placeholder="1000" required />
              </div>
              <div className="form-group">
                <label>Interest</label>
                <div className="radio-group-vertical">
                  <label className="radio-label">
                    <input type="radio" name="interest_type" value="none" checked={interestType === 'none'} onChange={() => setInterestType('none')} />
                    <span>No interest</span>
                  </label>
                  <label className="radio-label">
                    <input type="radio" name="interest_type" value="flat" checked={interestType === 'flat'} onChange={() => setInterestType('flat')} />
                    <span>Flat (fixed $/month)</span>
                  </label>
                  <label className="radio-label">
                    <input type="radio" name="interest_type" value="percentage" checked={interestType === 'percentage'} onChange={() => setInterestType('percentage')} />
                    <span>Percentage (%/month)</span>
                  </label>
                </div>
              </div>
              {interestType !== 'none' && (
                <div className="form-group">
                  <label>{interestType === 'flat' ? 'Monthly Interest ($)' : 'Monthly Interest Rate (%)'}</label>
                  <input name="rate" type="number" step="0.01" placeholder={interestType === 'flat' ? '50' : '2'} required />
                </div>
              )}
              <div className="form-group">
                <label>Term (months)</label>
                <input name="term" type="number" placeholder="12" defaultValue="12" required />
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input name="start_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <input name="notes" placeholder="e.g., For car repair" />
              </div>
              <button type="submit" className="btn btn-primary">Add Debt</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Debt Modal */}
      {showModal === 'edit' && selectedLoan && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Debt</h2>
              <button className="modal-close" onClick={() => setShowModal(null)}>&times;</button>
            </div>
            <form onSubmit={handleEditLoan}>
              <div className="form-group">
                <label>Type</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input type="radio" name="direction" value="owed_to_me" defaultChecked={selectedLoan.direction === 'owed_to_me'} />
                    <span>They owe me</span>
                  </label>
                  <label className="radio-label">
                    <input type="radio" name="direction" value="i_owe" defaultChecked={selectedLoan.direction === 'i_owe'} />
                    <span>I owe them</span>
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Person's Name</label>
                <input name="name" defaultValue={selectedLoan.name} required />
              </div>
              <div className="form-group">
                <label>Amount ($)</label>
                <input name="principal" type="number" step="0.01" defaultValue={selectedLoan.principal} required />
              </div>
              <div className="form-group">
                <label>Interest</label>
                <div className="radio-group-vertical">
                  <label className="radio-label">
                    <input type="radio" name="interest_type" value="none" checked={editInterestType === 'none'} onChange={() => setEditInterestType('none')} />
                    <span>No interest</span>
                  </label>
                  <label className="radio-label">
                    <input type="radio" name="interest_type" value="flat" checked={editInterestType === 'flat'} onChange={() => setEditInterestType('flat')} />
                    <span>Flat (fixed $/month)</span>
                  </label>
                  <label className="radio-label">
                    <input type="radio" name="interest_type" value="percentage" checked={editInterestType === 'percentage'} onChange={() => setEditInterestType('percentage')} />
                    <span>Percentage (%/month)</span>
                  </label>
                </div>
              </div>
              {editInterestType !== 'none' && (
                <div className="form-group">
                  <label>{editInterestType === 'flat' ? 'Monthly Interest ($)' : 'Monthly Interest Rate (%)'}</label>
                  <input name="rate" type="number" step="0.01" defaultValue={getEditRateValue()} required />
                </div>
              )}
              <div className="form-group">
                <label>Term (months)</label>
                <input name="term" type="number" defaultValue={selectedLoan.term_months} required />
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input name="start_date" type="date" defaultValue={selectedLoan.start_date} required />
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <input name="notes" defaultValue={selectedLoan.notes || ''} />
              </div>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showModal === 'payment' && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Record Payment</h2>
              <button className="modal-close" onClick={() => setShowModal(null)}>&times;</button>
            </div>
            <form onSubmit={handleAddPayment}>
              <div className="form-group">
                <label>Payment Date</label>
                <input name="pay_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div className="form-group">
                <label>Amount ($)</label>
                <input name="amount" type="number" step="0.01" placeholder="500" required />
              </div>
              <div className="form-group">
                <label>Apply To</label>
                <div className="radio-group-vertical">
                  <label className="radio-label">
                    <input type="radio" name="apply_to" value="principal" defaultChecked={!hasInterest} />
                    <span>Principal only</span>
                  </label>
                  {hasInterest && (
                    <>
                      <label className="radio-label">
                        <input type="radio" name="apply_to" value="interest" />
                        <span>Interest only</span>
                      </label>
                      <label className="radio-label">
                        <input type="radio" name="apply_to" value="auto" />
                        <span>Auto (interest first, then principal)</span>
                      </label>
                    </>
                  )}
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Record Payment</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
