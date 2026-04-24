// Client-side dynamic behavior. Kept intentionally small.
//
// 1. Live total-cost preview on the booking form.
// 2. Inline status updates on the host dashboard.

document.addEventListener('DOMContentLoaded', () => {
  // --- Booking form: live total cost ---
  const bookingForm = document.querySelector('[data-booking-form]');
  if (bookingForm) {
    const start = bookingForm.querySelector('[name="start_time"]');
    const end = bookingForm.querySelector('[name="end_time"]');
    const rate = parseFloat(bookingForm.dataset.hourlyRate || '0');
    const out = bookingForm.querySelector('[data-total-cost]');
    const update = () => {
      if (!start.value || !end.value) {
        out.textContent = '—';
        return;
      }
      const ms = new Date(end.value) - new Date(start.value);
      if (isNaN(ms) || ms <= 0) {
        out.textContent = 'Invalid range';
        return;
      }
      const hours = ms / 3600000;
      out.textContent = '$' + (hours * rate).toFixed(2) + ` (${hours.toFixed(2)} hr)`;
    };
    start?.addEventListener('input', update);
    end?.addEventListener('input', update);
  }

  // --- Host dashboard: inline status buttons ---
  document.querySelectorAll('[data-status-action]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const resId = btn.dataset.resId;
      const action = btn.dataset.statusAction;
      btn.disabled = true;
      btn.textContent = '...';
      const res = await fetch(`/reservations/${resId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const j = await res.json().catch(() => ({ error: 'Failed' }));
        alert(j.error || 'Failed to update status.');
        btn.disabled = false;
      }
    });
  });
});
