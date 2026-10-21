/* Manual calculator UI. No storage, imports, employee records or outbound requests. */
(function () {
  'use strict';
  const form=document.getElementById('entitlements-form');if(!form||!window.WifaqCalculator)return;
  const ar=document.documentElement.lang==='ar',t=(en,arabic)=>ar?arabic:en,el=id=>document.getElementById(id);
  const content=el('results-content'),error=el('calc-error');
  const money=n=>new Intl.NumberFormat(ar?'ar-QA':'en-QA',{style:'currency',currency:'QAR',maximumFractionDigits:2}).format(n);
  const num=n=>new Intl.NumberFormat(ar?'ar-QA':'en-QA',{maximumFractionDigits:4}).format(n);
  const days=n=>num(n)+t(' days',' يوم');
  const empty=t('Complete the inputs and press Calculate entitlements.','أكمل المدخلات واضغط حساب المستحقات.');
  const messages={
    date:t('Enter a valid date from 1900 onwards.','أدخل تاريخا صحيحا من عام 1900 فصاعدا.'),order:t('Calculation date must not precede service start.','لا يسبق تاريخ الحساب بداية الخدمة.'),range:t('Service must not exceed 80 years.','لا تزيد مدة الخدمة عن 80 سنة.'),number:t('Enter a number within the permitted range.','أدخل رقما ضمن النطاق المسموح.'),choice:t('Choose a valid policy option.','اختر قيمة صحيحة للسياسة.'),
    returnCycle:t('Enter the last actual return date between hire and the leave accrual cutoff. For a first leave choose service start explicitly.','أدخل آخر عودة فعلية بين التعيين ونهاية دورة الاستحقاق. لأول إجازة اختر بداية التعيين صراحة.'),
    balanceDate:t('Enter a verified balance date between hire and the leave accrual cutoff.','أدخل تاريخ رصيد مؤكد بين التعيين ونهاية دورة الاستحقاق.'),
    travelOrder:t('Return must follow departure, and departure must not precede service start.','تكون العودة بعد المغادرة، ولا تسبق المغادرة بداية الخدمة.'),travelRange:t('Leave preview is limited to 366 days.','معاينة الإجازة محدودة بـ366 يوما.'),
    wageFloor:t('Custom encashment wage cannot be below the basic salary.','لا يقل أجر صرف الرصيد المخصص عن الأساسي.'),approvedCash:t('Enter the previously approved cash settlement total.','أدخل إجمالي التسوية النقدية المعتمدة سابقا.'),
    holidayDates:t('Enter valid YYYY-MM-DD dates inside the leave, excluding return day.','أدخل تواريخ صحيحة بصيغة YYYY-MM-DD داخل الإجازة دون يوم العودة.'),holidayDuplicate:t('A holiday date is listed more than once.','أحد تواريخ العطلات مكرر.'),
    housingFixed:t('Automatic housing advance cannot be combined with a fixed net housing amount. Choose a daily housing rule or disable the advance.','لا يجمع السكن المقدم التلقائي مع مبلغ سكن صاف ثابت. اختر قاعدة سكن يومية أو ألغ تقديم السكن.'),advancePaid:t('Already-paid housing must not exceed the eligible advance.','لا يزيد السكن المصروف بالفعل على الدفعة المقدمة المستحقة.'),
    splitOverlap:t('The second period must start on or after the first return date.','تبدأ الفترة الثانية في تاريخ العودة من الأولى أو بعده.'),ticketValue:t('Enter a positive annual cash ticket allowance.','أدخل قيمة موجبة لبدل التذكرة السنوي النقدي.'),ticketUsed:t('Prior ticket use exceeds the allocation for this plan.','مخصص التذكرة المستخدم سابقا أكبر من المخصص المتاح لهذه الخطة.'),ticketSecond:t('Enable two leave periods to select payment or a company ticket with the second period.','فعل تقسيم الإجازة لفترتين لاختيار صرف أو توفير التذكرة مع الفترة الثانية.')
  };
  function showField(id,show){el(id).closest('.calc-field').hidden=!show;}
  function sync() {
    showField('lastReturn',el('leaveBasis').value==='return');showField('balanceAsOf',el('leaveBasis').value==='opening');
    showField('customLeaveWage',el('leavePay').value==='custom');
    const cash=el('holidaySettlement').value==='cash';
    showField('holidayCashBasis',cash);showField('holidayCashAmount',cash&&el('holidayCashBasis').value==='approved');showField('holidayCashFactor',cash&&el('holidayCashBasis').value!=='approved');
    el('encashComp').closest('label').hidden=el('holidaySettlement').value!=='credit';
    for(const name of ['housing','transport','other'])showField(name+'Fixed',el(name+'Mode').value==='fixed');
    el('travel-options').hidden=!el('travelEnabled').checked;
    el('split-period').hidden=!el('splitLeave').checked;
    for(const name of ['housing','transport','other'])showField(name+'Fixed2',el(name+'Mode').value==='fixed');
    showField('housingPaid2',el('housingAdvance').checked);
    const ticketMode=el('ticketMode').value;
    showField('ticketValue',ticketMode!=='none');showField('ticketAllocation',ticketMode==='cash');
    showField('ticketAnnualDays',ticketMode==='cash'&&el('ticketAllocation').value==='prorated');showField('ticketUsedBefore',ticketMode==='cash');showField('ticketCompanyPeriod',ticketMode==='company');
    el('encashTicketOnExit').closest('label').hidden=ticketMode!=='cash';
    form.querySelector('label[for="ticketValue"]').textContent=ticketMode==='company'?t('Estimated price per company ticket (QAR)','السعر التقديري لكل تذكرة توفرها الشركة (ر.ق)'):t('Annual cash ticket allowance (QAR)','بدل التذكرة السنوي النقدي (ر.ق)');
    for(const id of ['returnThreshold','advanceMethod','housingPaid'])showField(id,el('housingAdvance').checked);
  }
  function clearResult(message) {
    content.replaceChildren();const p=document.createElement('p');p.className='calc-empty';p.textContent=message||empty;content.append(p);
    el('print-button').hidden=true;error.hidden=true;error.textContent='';form.querySelectorAll('[aria-invalid]').forEach(x=>x.removeAttribute('aria-invalid'));
  }
  function reset() {
    form.reset();const now=new Date();el('asOf').value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;sync();clearResult();
  }
  function row(list,label,value,strong) {
    const wrap=document.createElement('div');wrap.className='calc-result-row'+(strong?' result-total':'');
    const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=value;dd.dir='auto';wrap.append(dt,dd);list.append(wrap);
  }
  function text(message,className){const p=document.createElement('p');p.textContent=message;if(className)p.className=className;content.append(p);}
  function heading(message){const h=document.createElement('h3');h.textContent=message;content.append(h);}
  function list(){const dl=document.createElement('dl');content.append(dl);return dl;}
  function render(r) {
    content.replaceChildren();const d=r.inputs;
    heading(t('Leave cycle & available balance','دورة الإجازة والرصيد المتاح'));
    const l=list();row(l,t('Accrual starts from','بداية استحقاق الدورة'),r.from);row(l,t('Accrual up to (end excluded)','الاستحقاق حتى (غير شامل)'),r.through);
    row(l,t('Annual leave earned this cycle','الإجازة السنوية المستحقة بالدورة'),days(r.earned));row(l,t('Annual balance including carry-in','الرصيد السنوي شاملا المرحل'),days(r.annualBalance));
    if(r.compDays)row(l,t('Approved compensatory balance','رصيد عطلات تعويضي معتمد'),days(r.compDays));row(l,t('Available annual + compensatory days','المتاح السنوي والتعويضي'),days(r.balance),true);
    text(`${t('Cycle balance','رصيد الدورة')}: ${num(d.opening)} + ${num(r.earned)} − ${num(d.taken)} + (${num(d.adjustment)}).`, 'calc-formula');
    if(d.leaveBasis==='return')text(t('Only the period since last return is accrued; EOS and the five-year rate still use the original service start.','يحسب استحقاق الفترة منذ آخر عودة فقط؛ وتظل نهاية الخدمة وشريحة خمس سنوات على بداية الخدمة الأصلية.'),'calc-help');
    if(r.annualBalance<0)text(t('Negative annual balance needs review; no automatic deduction from EOS.','الرصيد السنوي السالب يحتاج مراجعة؛ لم يخصم تلقائيا من المكافأة.'),'calc-warning');
    if(d.pendingHolidayDays>0&&d.holidaySettlement==='review')text(t('Unsettled holiday days are marked for review only; no extra cash or leave has been added.','أيام العطلات غير المسواة للمراجعة فقط؛ لم يضف عنها نقد أو رصيد.'),'calc-warning');
    for(const v of r.travels) {
      heading(r.travels.length===1?t('Upcoming leave payment','دفعة الإجازة القادمة'):t('Leave period '+(v.index+1),'الفترة '+(v.index+1)+' من الإجازة'));
      const p=list();row(p,t('Departure → return (return excluded)','المغادرة ← العودة (دون يوم العودة)'),v.start+' → '+v.end);
      row(p,t('Available balance before this period','الرصيد المتاح قبل هذه الفترة'),days(v.balanceBefore));
      if(v.index>0)row(p,t('Prorated accrual added since first departure','استحقاق المدة المضاف منذ المغادرة الأولى'),days(v.newAccrual));
      row(p,t('Travel calendar days','أيام السفر التقويمية'),days(v.duration));row(p,t('Confirmed public holidays within travel','عطلات رسمية مؤكدة داخل السفر'),days(v.holidayCount));
      row(p,t('Paid annual / compensatory leave days','أيام الإجازة السنوية / التعويضية المدفوعة'),days(v.paidDays));row(p,t('Annual-leave days not paid','أيام إجازة غير مدفوعة'),days(v.unpaidDays));
      row(p,t('Basic pay for paid annual-leave days','الأساسي عن أيام الإجازة المدفوعة'),money(v.basicPay));row(p,t('Housing for annual-leave days','السكن عن أيام الإجازة السنوية'),money(v.housingPay));row(p,t('Transport for annual-leave days','المواصلات عن أيام الإجازة السنوية'),money(v.transportPay));row(p,t('Other annual-leave allowances','بدلات أخرى عن أيام الإجازة السنوية'),money(v.otherPay));
      if(v.holidayCount)row(p,t('Full cash pay for public holidays','الأجر النقدي الكامل لأيام العطلات'),money(v.holidayPay));
      if(v.holidayCash)row(p,t('Approved previous holiday cash settlement','تسوية نقدية معتمدة لعطلات سابقة'),money(v.holidayCash));
      if(v.advanceEligible)row(p,t('Housing advance for '+v.month,'السكن المقدم عن '+v.month),money(v.advance));
      if(v.overlap)row(p,t('Housing overlap removed','أيام سكن استبعدت من تكرار الصرف'),days(v.overlap));
      if(d.ticketMode==='cash')row(p,t('Cash ticket share for this period','نصيب هذه الفترة من بدل التذكرة النقدي'),money(v.ticketCash));
      if(d.ticketMode==='company')row(p,t('Company-provided ticket (outside employee cash)','تذكرة توفرها الشركة (خارج نقد الموظف)'),v.companyProvidesTicket?(v.companyTicketCost?money(v.companyTicketCost)+t(' estimated',' تقديريا'):t('Company arrangement; price not entered','توفرها الشركة؛ لم يدخل السعر')):t('Not provided for this period','لا توفر لهذه الفترة'));
      row(p,t('Gross leave-payment estimate','إجمالي دفعة الإجازة التقديري'),money(v.total));
      if(v.housingPaid)row(p,t('Housing advance already paid','السكن المقدم المصروف بالفعل'),money(v.housingPaid));row(p,t('Remaining employee payment','المتبقي للصرف للموظف'),money(v.remainingPay),true);
      if(v.creditedHolidayDays){row(p,t('Balance debit before replacement credit','خصم الرصيد قبل إضافة البديل'),days(v.chargedDays));row(p,t('Replacement days credited on return','أيام بديلة تضاف عند العودة'),days(v.creditedHolidayDays));}
      row(p,t('Balance immediately after this leave','الرصيد مباشرة بعد هذه الإجازة'),days(v.returnBalance));
      if(d.ticketMode==='cash'&&d.ticketAllocation==='prorated')text(`${t('Ticket proration','توزيع التذكرة')}: ${money(d.ticketValue)} × ${num(v.annualPaidDays)} ÷ ${num(r.ticket.days)}. ${t('Payment is capped at the remaining allocation; compensatory and holiday days are excluded.','الصرف في حدود المخصص المتبقي؛ تستبعد أيام التعويض والعطلات الرسمية.')}`, 'calc-formula');
      if(v.unpaidDays>0)text(t('This period exceeds its available paid balance. Allowance continuation follows each selected policy.','تزيد هذه الفترة على رصيدها المدفوع المتاح. استمرار البدلات يتبع سياسة كل بدل.'),'calc-warning');
    }
    if(r.plan&&r.plan.periods===2) {
      heading(t('Two-period plan totals','إجماليات خطة الفترتين'));const p=list();
      row(p,t('Paid / unpaid days across both periods','الأيام المدفوعة / غير المدفوعة للفترتين'),num(r.plan.paidDays)+' / '+num(r.plan.unpaidDays));
      row(p,t('Additional accrual between departures','الاستحقاق المضاف بين المغادرتين'),days(r.plan.newAccrual));
      if(d.ticketMode==='cash'){row(p,t('Cash ticket total for both periods','مجموع بدل التذكرة النقدي للفترتين'),money(r.plan.ticketCash));row(p,t('Ticket allocation remaining after this plan','مخصص التذكرة المتبقي بعد الخطة'),money(r.ticket.remaining));}
      if(d.ticketMode==='company')row(p,t('Estimated company ticket cost (outside cash)','تكلفة تذاكر الشركة التقديرية (خارج النقد)'),money(r.plan.companyTicketCost));
      row(p,t('Total remaining employee cash','إجمالي النقد المتبقي للموظف'),money(r.plan.remainingPay),true);row(p,t('Leave balance after period 2','رصيد الإجازة بعد الفترة الثانية'),days(r.plan.returnBalance));
      text(d.accrueBetweenPeriods?t('The same balance is carried forward; accrual between departure dates is added once without restarting the cycle.','يرحل الرصيد نفسه، ويضاف استحقاق المدة بين المغادرتين مرة واحدة دون إعادة بدء الدورة.'):t('Both periods use a fixed balance at first departure; no additional accrual is added.','تستخدم الفترتان رصيدا ثابتا عند المغادرة الأولى دون استحقاق إضافي.'),'calc-help');
    }
    if(d.ticketMode!=='none'&&!r.plan)text(t('Enter upcoming leave dates to calculate the ticket allocation. Only an explicitly approved cash ticket payout is added to the alternative EOS estimate.','أدخل تواريخ الإجازة القادمة لحساب نصيب التذكرة. لا يضاف لتقدير نهاية الخدمة إلا بدل نقدي تختار صرفه صراحة.'),'calc-help');
    heading(t('EOS & encashment · alternative scenario','نهاية الخدمة وصرف الرصيد · سيناريو بديل'));const end=list();
    row(end,t('Continuous service start','بداية الخدمة المستمرة'),d.serviceStart);row(end,t('EOS calculation date','تاريخ حساب نهاية الخدمة'),d.asOf);row(end,t('Full service years','مدة الخدمة الكلية بالسنوات'),num(r.years));row(end,t('EOS gratuity on basic salary','مكافأة نهاية الخدمة على الأساسي'),money(r.eos));row(end,t('Unused annual leave cash','قيمة الرصيد السنوي'),money(r.leaveValue));
    if(d.encashComp&&r.compDays)row(end,t('Approved compensatory encashment','قيمة الرصيد التعويضي المعتمد للصرف'),money(r.compValue));if(r.ticket.exitValue)row(end,t('Approved cash ticket allowance on exit','بدل التذكرة النقدي المعتمد عند الخروج'),money(r.ticket.exitValue));if(r.holidayCash)row(end,t('Approved holiday cash settlement','تسوية العطلات النقدية المعتمدة'),money(r.holidayCash));row(end,t('Estimated EOS + approved balance payouts','إجمالي المكافأة والأرصدة المعتمدة تقديريا'),money(r.total),true);
    text(`${t('EOS formula','معادلة المكافأة')}: ${num(d.basic)} ÷ 30 × ${num(d.eosDays)} × ${num(r.years)}. ${t('Annual encashment wage','أجر صرف الرصيد السنوي')}: ${money(r.leaveWage)} ÷ 30.`, 'calc-formula');
    if(!r.eligible)text(t('Under one year: EOS is zero. Leave accrual is a projection and eligibility requires review.','أقل من سنة: المكافأة صفر، واستحقاق الإجازة إسقاط حسابي تراجع أهليته.'),'calc-warning');
    if(r.compDays&&!d.encashComp)text(t('Compensatory leave was not cashed out because that payment was not selected.','لم يصرف الرصيد التعويضي نقدا لعدم اختيار ذلك.'),'calc-help');
    text(t('Do not add the alternative leave and EOS payment totals together. Review the contract, approved policies and previous payments before disbursement.','لا تجمع إجمالي دفعة الإجازة مع إجمالي نهاية الخدمة. راجع العقد والسياسات المعتمدة والمدفوعات السابقة قبل الصرف.'),'calc-warning');
    el('print-button').hidden=false;el('calc-results').focus({preventScroll:true});
    if(window.matchMedia('(max-width: 980px)').matches)el('calc-results').scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  function run() {
    clearResult();const raw={};for(const input of form.elements)if(input.name)raw[input.name]=input.type==='checkbox'?input.checked:input.value;
    try{render(window.WifaqCalculator.calculate(raw));}catch(e){
      const field=e.field?el(e.field):null,label=field?form.querySelector(`label[for="${field.id}"]`):null;
      error.textContent=(label?label.textContent+': ':'')+(messages[e.code]||t('Unable to calculate. Check the inputs.','تعذر الحساب. راجع المدخلات.'));error.hidden=false;
      if(field){const details=field.closest('details');if(details)details.open=true;field.setAttribute('aria-invalid','true');field.focus();}
    }
  }
  form.addEventListener('submit',e=>{e.preventDefault();run();});
  form.addEventListener('input',()=>clearResult(t('Inputs changed. Calculate again to update the estimate.','تغيرت المدخلات. اضغط حساب لتحديث التقدير.')));
  form.addEventListener('change',e=>{
    if(e.target.id==='preset'&&e.target.value!=='custom'){el('under5').value=e.target.value==='thirty'?'30':'21';el('after5').value=e.target.value==='statutory'?'28':'30';}
    if(['under5','after5'].includes(e.target.id))el('preset').value='custom';
    sync();clearResult(t('Inputs changed. Calculate again to update the estimate.','تغيرت المدخلات. اضغط حساب لتحديث التقدير.'));
  });
  el('calculate-button').addEventListener('click',run);el('clear-button').addEventListener('click',reset);el('print-button').addEventListener('click',()=>window.print());
  window.addEventListener('pagehide',reset);window.addEventListener('pageshow',e=>{if(e.persisted)reset();});reset();el('calculate-button').disabled=false;
}());
