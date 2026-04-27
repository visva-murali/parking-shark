// Client-side dynamic behavior.
//
// 1. Live total-cost preview on the booking form.
// 2. Inline status updates on the host dashboard.
// 3. Live price-range filter on the browse page.

document.addEventListener('DOMContentLoaded', () => {
  // --- Booking form: live total cost ---
  const bookingForm = document.querySelector('[data-booking-form]');
  if (bookingForm) {
    const start = bookingForm.querySelector('[name="start_time"]');
    const end = bookingForm.querySelector('[name="end_time"]');
    const rate = parseFloat(bookingForm.dataset.hourlyRate || '0');
    const out = document.querySelector('[data-total-cost]');
    const update = () => {
      if (!start.value || !end.value) {
        if (out) out.textContent = '—';
        return;
      }
      const ms = new Date(end.value) - new Date(start.value);
      if (isNaN(ms) || ms <= 0) {
        if (out) out.textContent = 'Invalid range';
        return;
      }
      const hours = ms / 3600000;
      if (out) out.textContent = '$' + (hours * rate).toFixed(2) + ` (${hours.toFixed(2)} hr)`;
    };
    start?.addEventListener('input', update);
    end?.addEventListener('input', update);
  }

  // --- Browse page: live price-range filter ---
  const bar = document.getElementById('price-filter-bar');
  const priceSlider = document.getElementById('live-price-filter');
  if (bar && priceSlider) {
    const label = document.getElementById('live-price-label');
    const countEl = document.getElementById('live-spot-count');
    const cards = document.querySelectorAll('[data-price]');
    const dataMin = parseFloat(bar.dataset.min);
    const dataMax = parseFloat(bar.dataset.max);
    const active  = parseFloat(bar.dataset.active) || dataMax;

    priceSlider.min   = dataMin;
    priceSlider.max   = dataMax;
    priceSlider.value = Math.min(active, dataMax);

    const applyFilter = () => {
      const val = parseFloat(priceSlider.value);
      const atMax = val >= dataMax;
      label.textContent = atMax ? 'Any price' : `$${val.toFixed(2)} / hr`;
      let visible = 0;
      cards.forEach((card) => {
        const price = parseFloat(card.dataset.price);
        const show = atMax || price <= val;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      countEl.textContent = visible < cards.length ? `${visible} of ${cards.length} shown` : '';
    };

    // Live visual feedback while dragging
    priceSlider.addEventListener('input', applyFilter);

    // On release: navigate with max_price baked into the URL so all other
    // filters (type, sort, dates, search) are preserved server-side
    priceSlider.addEventListener('change', () => {
      const val = parseFloat(priceSlider.value);
      const params = new URLSearchParams(window.location.search);
      if (val >= dataMax) {
        params.delete('max_price');
      } else {
        params.set('max_price', val.toFixed(2));
      }
      window.location.href = '/spots?' + params.toString();
    });

    applyFilter();
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
