/* Wifaq public calculator: pure arithmetic, no data store or network access. */
(function (root) {
  'use strict';
  const dateNumber = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? Date.parse(s + 'T00:00:00Z') : NaN;
  const validDate = s => Number.isFinite(dateNumber(s)) && new Date(dateNumber(s)).toISOString().slice(0, 10) === s;
  const days = (a, b) => Math.round((dateNumber(b) - dateNumber(a)) / 86400000);
  const addYears = (s, n) => {
    const [y, m, d] = s.split('-').map(Number);
    return `${y + n}-${String(m).padStart(2, '0')}-${String(Math.min(d, new Date(Date.UTC(y + n, m, 0)).getUTCDate())).padStart(2, '0')}`;
  };
  const firstNextMonth = s => {
    const [y, m] = s.split('-').map(Number);
    return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  };
  function serviceYears(start, end) {
    let whole = 0;
    while (whole < 100 && addYears(start, whole + 1) <= end) whole++;
    return whole + days(addYears(start, whole), end) / days(addYears(start, whole), addYears(start, whole + 1));
  }
  function accrual(start, from, end, under5, after5, extraDays) {
    let cursor = from > start ? from : start, amount = 0;
    while (cursor < end) {
      const year = Math.floor(serviceYears(start, cursor));
      const boundary = addYears(start, year + 1);
      const stop = boundary < end ? boundary : end;
      amount += ((year < 5 ? under5 : after5) + extraDays) * days(cursor, stop) / days(addYears(start, year), boundary);
      cursor = stop;
    }
    return amount;
  }
  function calculate(raw) {
    const d = { ...raw };
    if (!d.travelEnabled) d.returnThreshold = 15;
    function fail(field, code) { const e = new Error(code); e.field = field; e.code = code; throw e; }
    ['serviceStart', 'asOf'].forEach(k => { if (!validDate(d[k])) fail(k, 'date'); });
    if (d.asOf < d.serviceStart) fail('asOf', 'order');
    if (serviceYears(d.serviceStart, d.asOf) > 80) fail('asOf', 'range');
    const ranges = { basic:[0,1e8], housing:[0,1e8], transport:[0,1e8], other:[0,1e8], under5:[21,366], after5:[28,366], eosDays:[21,366], extraDays:[0,366], opening:[-10000,10000], taken:[0,10000], adjustment:[-10000,10000], returnThreshold:[1,31] };
    for (const [key, [min, max]] of Object.entries(ranges)) {
      if (d[key] === '' && ['basic','under5','after5','eosDays','returnThreshold'].includes(key)) fail(key, 'number');
      const n = Number(d[key] ?? 0);
      if (!Number.isFinite(n) || n < min || n > max) fail(key, 'number');
      d[key] = n;
    }
    if (!['basic','gross'].includes(d.leavePay)) fail('leavePay', 'number');
    if (d.opening !== 0 && !d.balanceAsOf) fail('balanceAsOf', 'balanceDate');
    if (d.balanceAsOf && (!validDate(d.balanceAsOf) || d.balanceAsOf < d.serviceStart || d.balanceAsOf > d.asOf)) fail('balanceAsOf', 'balanceDate');
    const from = d.balanceAsOf || d.serviceStart;
    const years = serviceYears(d.serviceStart, d.asOf);
    const eligible = d.asOf >= addYears(d.serviceStart, 1);
    const earned = accrual(d.serviceStart, from, d.asOf, d.under5, d.after5, d.extraDays);
    const balance = d.opening + earned - d.taken + d.adjustment;
    const leaveWage = d.basic + (d.leavePay === 'gross' ? d.housing + d.transport + d.other : 0);
    const eos = eligible ? d.basic / 30 * d.eosDays * years : 0;
    const leaveValue = Math.max(0, balance) * leaveWage / 30;
    let travel = null;
    if (d.travelEnabled) {
      ['leaveStart','returnDate'].forEach(k => { if (!validDate(d[k])) fail(k, 'date'); });
      if (d.leaveStart < d.serviceStart) fail('leaveStart', 'travelOrder');
      if (d.returnDate <= d.leaveStart) fail('returnDate', 'travelOrder');
      const duration = days(d.leaveStart, d.returnDate);
      if (duration > 366) fail('returnDate', 'travelRange');
      const monthStart = firstNextMonth(d.leaveStart);
      const returnMonth = d.returnDate.slice(0,7);
      const advanceEligible = Boolean(d.housingAdvance) && d.housing > 0 && returnMonth === monthStart.slice(0,7) && Number(d.returnDate.slice(8)) >= d.returnThreshold;
      // Advance is always a full month's allowance, never a second payment for overlap days.
      const overlap = advanceEligible && d.includeHousing ? days(monthStart, d.returnDate) : 0;
      const basicPay = duration * d.basic / 30;
      const housingPay = d.includeHousing ? (duration - overlap) * d.housing / 30 : 0;
      const transportPay = d.includeTransport ? duration * d.transport / 30 : 0;
      const advance = advanceEligible ? d.housing : 0;
      travel = { duration, overlap, basicPay, housingPay, transportPay, advance, advanceEligible, month:returnMonth, total:basicPay + housingPay + transportPay + advance };
    }
    return { inputs:d, years, eligible, from, earned, balance, leaveWage, eos, leaveValue, total:eos + leaveValue, travel };
  }
  const api = { calculate, validDate, serviceYears, accrual };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WifaqCalculator = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
