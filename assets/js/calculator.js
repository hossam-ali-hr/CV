/* Manual entry UI. Inputs exist only in the live form; nothing is persisted or sent. */
(function () {
  'use strict';
  const form = document.getElementById('entitlements-form');
  if (!form || !window.WifaqCalculator) return;
  const ar = document.documentElement.lang === 'ar';
  const t = (en, arabic) => ar ? arabic : en;
  const el = id => document.getElementById(id);
  const content = el('results-content');
  const error = el('calc-error');
  const money = n => new Intl.NumberFormat(ar ? 'ar-QA' : 'en-QA', { style:'currency', currency:'QAR', maximumFractionDigits:2 }).format(n);
  const num = n => new Intl.NumberFormat(ar ? 'ar-QA' : 'en-QA', { maximumFractionDigits:4 }).format(n);
  const empty = t('Complete the inputs and press Calculate entitlements. Results appear here.', 'أكمل المدخلات واضغط حساب المستحقات. ستظهر النتائج هنا.');
  const messages = {
    date:t('Enter a valid date.', 'أدخل تاريخا صحيحا.'),
    order:t('Calculation date must be on or after service start.', 'يجب ألا يسبق تاريخ الحساب بداية الخدمة.'),
    range:t('Service must not exceed 80 years.', 'لا يمكن أن تزيد مدة الخدمة عن 80 سنة.'),
    number:t('Enter a number within the permitted range shown for this field.', 'أدخل رقما ضمن النطاق المسموح للحقل.'),
    balanceDate:t('Enter an opening balance date between service start and calculation date.', 'أدخل تاريخ الرصيد بين بداية الخدمة وتاريخ الحساب.'),
    travelOrder:t('Leave must start on or after service start, and return must be later than departure.', 'يجب ألا تسبق الإجازة بداية الخدمة، وأن تكون العودة بعد بدء الإجازة.'),
    travelRange:t('The leave preview is limited to 366 calendar days.', 'معاينة الإجازة محدودة بـ366 يوما تقويميا.')
  };
  function clearResult(message) {
    content.replaceChildren();
    const p = document.createElement('p'); p.className = 'calc-empty'; p.textContent = message || empty;
    content.append(p); el('print-button').hidden = true;
    error.hidden = true; error.textContent = '';
    form.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
  }
  function reset() {
    form.reset();
    const now = new Date();
    el('asOf').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    el('travel-options').hidden = true;
    clearResult();
  }
  function row(list, label, value, strong) {
    const wrap = document.createElement('div'); wrap.className = 'calc-result-row' + (strong ? ' result-total' : '');
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'); dd.textContent = value; dd.dir = 'auto';
    wrap.append(dt, dd); list.append(wrap);
  }
  function text(message, className) {
    const p = document.createElement('p'); p.textContent = message; if (className) p.className = className;
    content.append(p);
  }
  function heading(message) { const h = document.createElement('h3'); h.textContent = message; content.append(h); }
  function render(r) {
    content.replaceChildren();
    heading(t('EOS + unused leave', 'نهاية الخدمة + رصيد الإجازة'));
    const dl = document.createElement('dl'); content.append(dl);
    row(dl, t('Service years', 'سنوات الخدمة'), num(r.years));
    row(dl, t('Calculation date', 'تاريخ الحساب'), r.inputs.asOf);
    row(dl, t('EOS gratuity', 'مكافأة نهاية الخدمة'), money(r.eos));
    row(dl, t('Accrual since reference date', 'المستحق منذ تاريخ الرصيد'), num(r.earned) + t(' days', ' يوم'));
    row(dl, t('Unused leave balance', 'رصيد الإجازة المتبقي'), num(r.balance) + t(' days', ' يوم'));
    row(dl, t('Unused leave value', 'قيمة رصيد الإجازة'), money(r.leaveValue));
    row(dl, t('Estimated total', 'الإجمالي التقديري'), money(r.total), true);
    text(`${t('EOS formula', 'معادلة المكافأة')}: ${num(r.inputs.basic)} ÷ 30 × ${num(r.inputs.eosDays)} × ${num(r.years)}${!r.eligible ? t(' (not eligible before one year)', ' (لا مكافأة قبل إكمال سنة)') : ''}`, 'calc-formula');
    text(`${t('Leave balance', 'رصيد الإجازة')}: ${num(r.inputs.opening)} + ${num(r.earned)} − ${num(r.inputs.taken)} + (${num(r.inputs.adjustment)}). ${t('Wage basis', 'أساس الأجر')}: ${money(r.leaveWage)} ÷ 30.`, 'calc-formula');
    if (!r.eligible) text(t('Under one year: gratuity is zero in this estimate. Leave accrual is a projection; review eligibility before payment.', 'أقل من سنة: المكافأة صفر في هذا التقدير. استحقاق الإجازة المعروض إسقاط حسابي؛ راجع الأهلية قبل الصرف.'), 'calc-warning');
    if (r.balance < 0) text(t('Negative leave balance needs review. It has not been deducted from gratuity.', 'الرصيد السالب يحتاج مراجعة. لم يخصم من مكافأة نهاية الخدمة.'), 'calc-warning');
    if (r.travel) {
      heading(t('Before-leave payment · separate scenario', 'دفعة ما قبل الإجازة · سيناريو منفصل'));
      const v = r.travel, list = document.createElement('dl'); content.append(list);
      row(list, t('Calendar leave days', 'أيام الإجازة التقويمية'), num(v.duration));
      row(list, t('Basic salary for leave period', 'الأساسي عن فترة الإجازة'), money(v.basicPay));
      row(list, t('Housing for leave period', 'السكن عن فترة الإجازة'), money(v.housingPay));
      row(list, t('Transport for leave period', 'الانتقال عن فترة الإجازة'), money(v.transportPay));
      row(list, t('Next-month housing advance', 'سكن الشهر التالي المقدم'), money(v.advance));
      if (v.advanceEligible) row(list, t('Housing days excluded from duplicate payment', 'أيام السكن المستبعدة من الازدواج'), num(v.overlap));
      row(list, t('Before-leave estimate', 'تقدير دفعة ما قبل الإجازة'), money(v.total), true);
      text(t('Do not add this amount to the termination estimate above. Check the requested leave against the actual approved balance and reconcile any advance with payroll.', 'لا تضف هذا المبلغ إلى تقدير نهاية الخدمة أعلاه. راجع مدة الإجازة مع الرصيد الفعلي المعتمد وطابق أي دفعة مقدمة مع الرواتب.'), 'calc-warning');
      if (r.inputs.housingAdvance && !v.advanceEligible) text(t('Housing advance conditions were not met. No advance has been added.', 'لم تتحقق شروط تقديم السكن، لذلك لم تضف دفعة مقدمة.'), 'calc-help');
    }
    text(t('Indicative estimate; not a complete or approved final settlement.', 'تقدير استرشادي؛ ليس تسوية نهائية شاملة أو معتمدة.'), 'calc-help');
    el('print-button').hidden = false;
    el('calc-results').focus({ preventScroll:true });
    if (window.matchMedia('(max-width: 980px)').matches) el('calc-results').scrollIntoView({ block:'start', behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  function run() {
    clearResult();
    const raw = {};
    for (const input of form.elements) if (input.name) raw[input.name] = input.type === 'checkbox' ? input.checked : input.value;
    try { render(window.WifaqCalculator.calculate(raw)); }
    catch (e) {
      const field = e.field ? el(e.field) : null;
      const label = field ? form.querySelector(`label[for="${field.id}"]`) : null;
      error.textContent = (label ? label.textContent + ': ' : '') + (messages[e.code] || t('Unable to calculate. Check the inputs.', 'تعذر الحساب. راجع المدخلات.'));
      error.hidden = false;
      if (field) {
        const details = field.closest('details'); if (details) details.open = true;
        field.setAttribute('aria-invalid','true'); field.focus();
      }
    }
  }
  form.addEventListener('submit', e => { e.preventDefault(); run(); });
  form.addEventListener('input', () => clearResult(t('Inputs changed. Press Calculate entitlements to update the estimate.', 'تغيرت المدخلات. اضغط حساب المستحقات لتحديث التقدير.')));
  form.addEventListener('change', e => {
    if (e.target.id === 'travelEnabled') el('travel-options').hidden = !e.target.checked;
    if (e.target.id === 'preset' && e.target.value !== 'custom') {
      el('under5').value = '21'; el('after5').value = e.target.value === 'company' ? '30' : '28';
    }
    if (['under5','after5'].includes(e.target.id)) el('preset').value = 'custom';
    clearResult(t('Inputs changed. Press Calculate entitlements to update the estimate.', 'تغيرت المدخلات. اضغط حساب المستحقات لتحديث التقدير.'));
  });
  el('calculate-button').addEventListener('click', run);
  el('clear-button').addEventListener('click', reset);
  el('print-button').addEventListener('click', () => window.print());
  // Do not retain inputs in a restored back/forward-cache page.
  window.addEventListener('pagehide', reset);
  window.addEventListener('pageshow', e => { if (e.persisted) reset(); });
  reset(); el('calculate-button').disabled = false;
}());
