/* Manual calculator UI. No storage, imports, employee records or outbound requests. */
(function () {
  'use strict';
  const form=document.getElementById('entitlements-form');if(!form||!window.HRCalculator)return;
  const ar=document.documentElement.lang==='ar',t=(en,arabic)=>ar?arabic:en,el=id=>document.getElementById(id);
  const content=el('results-content'),error=el('calc-error');
  const money=n=>new Intl.NumberFormat(ar?'ar-QA':'en-QA',{style:'currency',currency:'QAR',maximumFractionDigits:2}).format(n);
  const num=n=>new Intl.NumberFormat(ar?'ar-QA':'en-QA',{maximumFractionDigits:4}).format(n);
  const days=n=>num(n)+t(' days',' يوم');
  const empty=t('Enter the essentials above, then calculate to see your settlement.','أدخل البيانات الأساسية بالأعلى، ثم اضغط احسب لعرض كشف المستحقات.');
  const messages={
    date:t('Enter a valid date from 1900 onwards.','أدخل تاريخا صحيحا من عام 1900 فصاعدا.'),order:t('Calculation date must not precede service start.','لا يسبق تاريخ الحساب بداية الخدمة.'),range:t('Service must not exceed 80 years.','لا تزيد مدة الخدمة عن 80 سنة.'),number:t('Enter a number within the permitted range.','أدخل رقما ضمن النطاق المسموح.'),choice:t('Choose a valid policy option.','اختر قيمة صحيحة للسياسة.'),
    returnCycle:t('Enter the last actual return date between hire and the leave accrual cutoff. For a first leave choose service start explicitly.','أدخل آخر عودة فعلية بين التعيين ونهاية دورة الاستحقاق. لأول إجازة اختر بداية التعيين صراحة.'),
    balanceDate:t('Enter a verified balance date between hire and the leave accrual cutoff.','أدخل تاريخ رصيد مؤكد بين التعيين ونهاية دورة الاستحقاق.'),
    travelOrder:t('Return must follow departure, and departure must not precede service start.','تكون العودة بعد المغادرة، ولا تسبق المغادرة بداية الخدمة.'),travelRange:t('Leave preview is limited to 366 days.','معاينة الإجازة محدودة بـ366 يوما.'),
    wageFloor:t('Custom encashment wage cannot be below the basic salary.','لا يقل أجر صرف الرصيد المخصص عن الأساسي.'),approvedCash:t('Enter the previously approved cash settlement total.','أدخل إجمالي التسوية النقدية المعتمدة سابقا.'),
    holidayDates:t('Enter valid YYYY-MM-DD dates inside the leave, excluding return day.','أدخل تواريخ صحيحة بصيغة YYYY-MM-DD داخل الإجازة دون يوم العودة.'),holidayDuplicate:t('A holiday date is listed more than once.','أحد تواريخ العطلات مكرر.'),
    housingFixed:t('Automatic housing advance cannot be combined with a fixed net housing amount. Choose a daily housing rule or disable the advance.','لا يجمع السكن المقدم التلقائي مع مبلغ سكن صاف ثابت. اختر قاعدة سكن يومية أو ألغ تقديم السكن.'),advancePaid:t('Already-paid housing must not exceed the eligible advance.','لا يزيد السكن المصروف بالفعل على الدفعة المقدمة المستحقة.'),
    splitOverlap:t('The second period must start on or after the first return date.','تبدأ الفترة الثانية في تاريخ العودة من الأولى أو بعده.'),ticketValue:t('Enter a positive annual cash ticket allowance.','أدخل قيمة موجبة لبدل التذكرة السنوي النقدي.'),ticketUsed:t('Prior ticket use exceeds the allocation for this plan.','مخصص التذكرة المستخدم سابقا أكبر من المخصص المتاح لهذه الخطة.'),ticketSecond:t('Enable two leave periods to select payment or a company ticket with the second period.','فعل تقسيم الإجازة لفترتين لاختيار صرف أو توفير التذكرة مع الفترة الثانية.'),
    salaryUnpaid:t('Unpaid absence exceeds the eligible salary days in this month.','أيام الغياب دون أجر أكبر من أيام الراتب المستحقة في هذا الشهر.'),salaryPaid:t('Salary already paid exceeds the salary calculated for these days.','الراتب المصروف بالفعل أكبر من الراتب المحتسب عن هذه الأيام.')
  };
  const printRoot=el('calculator-print');let lastResult=null,originalTitle=document.title;
  const selectedMode=()=>form.querySelector('input[name="calculationMode"]:checked').value;
  const date=s=>new Intl.DateTimeFormat(ar?'ar-QA':'en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(s+'T00:00:00Z'));
  function node(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
  function showField(id,show){el(id).closest('.calc-field').hidden=!show;}
  function showCheck(id,show){el(id).closest('.calc-check').hidden=!show;}
  function sync() {
    const leave=selectedMode()==='leave',split=leave&&el('splitLeave').checked,cash=el('holidaySettlement').value==='cash',ticket=el('ticketMode').value;
    el('travelEnabled').checked=leave;el('travel-options').hidden=!leave;showField('asOf',!leave);
    form.querySelectorAll('.calc-step')[2].textContent=leave?'3':'2';
    showField('lastReturn',el('leaveBasis').value==='return');showField('balanceAsOf',el('leaveBasis').value==='opening');
    showField('customLeaveWage',el('leavePay').value==='custom');
    showField('holidayCashBasis',cash);showField('holidayCashAmount',cash&&el('holidayCashBasis').value==='approved');showField('holidayCashFactor',cash&&el('holidayCashBasis').value!=='approved');
    showCheck('encashComp',!leave&&el('holidaySettlement').value==='credit');
    showField('holidayDates',leave);showField('leaveHolidayMode',leave);
    el('split-period').hidden=!split;el('salary-second').hidden=!split;el('month-salary-options').hidden=!el('includeMonthSalary').checked;
    el('includeMonthSalary').closest('label').querySelector('small').textContent=leave?
      t('Leave on 16 December = salary for 1–15 December. Includes basic pay and monthly cash allowances.','الإجازة من 16 ديسمبر = راتب 1–15 ديسمبر. يشمل الأساسي والبدلات النقدية الشهرية.'):
      t('Salary from month start through the last working day, including monthly cash allowances.','راتب من بداية الشهر حتى آخر يوم عمل شاملا البدلات النقدية الشهرية.');
    el('housing-options').hidden=!leave;el('allowance-policy').hidden=!leave;el('exit-policy').hidden=leave;showField('paidLeaveMode',leave);
    for(const name of ['housing','transport','other']){showField(name+'Fixed',el(name+'Mode').value==='fixed');showField(name+'Fixed2',el(name+'Mode').value==='fixed');}
    showField('housingPaid2',el('housingAdvance').checked);
    for(const id of ['returnThreshold','advanceMethod','housingPaid'])showField(id,el('housingAdvance').checked);
    showField('ticketValue',ticket!=='none');showField('ticketAllocation',ticket==='cash'&&leave);showField('ticketAnnualDays',ticket==='cash'&&leave&&el('ticketAllocation').value==='prorated');
    showField('ticketUsedBefore',ticket==='cash');showField('ticketCompanyPeriod',ticket==='company'&&leave);showCheck('encashTicketOnExit',ticket==='cash'&&!leave);
    form.querySelector('label[for="ticketValue"]').textContent=ticket==='company'?t('Estimated price per company ticket (QAR)','السعر التقديري لكل تذكرة شركة (ر.ق)'):t('Annual cash ticket allowance (QAR)','بدل التذكرة النقدي السنوي (ر.ق)');
    for(const id of ['under5','after5'])showField(id,el('preset').value==='custom');
    form.querySelectorAll('[data-option-help]').forEach(h=>{const s=el(h.dataset.optionHelp);h.textContent=s.selectedOptions[0].dataset.help;});
  }
  function clearResult(message) {
    lastResult=null;content.replaceChildren(node('p',message||empty,'calc-empty'));
    printRoot.replaceChildren(node('p',t('Calculate a settlement before printing.','احسب التسوية أولا لعرض كشف الطباعة.')));
    el('print-button').hidden=true;error.hidden=true;error.textContent='';form.querySelectorAll('[aria-invalid]').forEach(x=>x.removeAttribute('aria-invalid'));
  }
  function reset() {
    form.reset();const now=new Date();el('asOf').value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    form.querySelectorAll('details').forEach(d=>d.open=false);sync();clearResult();
  }
  function note(message,warning=false){content.append(node('p',message,warning?'calc-warning calc-report-note':'calc-noncash calc-report-note'));}
  function meta(list,label,value){const row=node('div',undefined,'calc-meta-row');row.append(node('dt',label),node('dd',value));list.append(row);}
  function salaryNote(s){
    if(!s.calendarDays)return t('No salary days before departure in this month.','لا توجد أيام راتب قبل المغادرة في هذا الشهر.');
    return `${days(s.paidDays)} · ${date(s.from)} – ${date(s.to)}${s.unpaidDays?' · '+t('Unpaid: ','دون أجر: ')+days(s.unpaidDays):''}${s.excludedDays?' · '+t('Prior salary / leave days excluded: ','أيام راتب سابقة / إجازة مستبعدة: ')+num(s.excludedDays):''}`;
  }
  function render(r) {
    content.replaceChildren();lastResult=r;const d=r.inputs,leave=d.calculationMode==='leave',total=leave?r.plan.remainingPay:r.total;
    const hero=node('div',undefined,'calc-total');hero.append(node('span',t('Remaining payment to employee','المتبقي للصرف للموظف')));
    const amount=node('strong',money(total));amount.id='settlement-total';amount.dataset.amount=total;hero.append(amount);
    hero.append(node('small',leave?t('Leave settlement · '+r.travels.length+' period(s)','تسوية إجازة · '+(r.travels.length===1?'فترة واحدة':'فترتان')):t('End-of-service settlement','تسوية نهاية خدمة')));content.append(hero);
    const metrics=node('div',undefined,'calc-metrics');
    for(const [label,value] of (leave?[[t('Available at departure','المتاح عند المغادرة'),days(r.balance)],[t('Paid leave in plan','الإجازة المدفوعة بالخطة'),days(r.plan.paidDays)],[t('Balance after leave','الرصيد بعد الإجازة'),days(r.plan.returnBalance)]]:[[t('Service years','سنوات الخدمة'),num(r.years)],[t('Unused annual leave','الرصيد السنوي المتبقي'),days(r.annualBalance)]])){
      const card=node('div');card.append(node('span',label),node('strong',value));metrics.append(card);
    }content.append(metrics);
    const wrap=node('div',undefined,'calc-table-wrap'),table=node('table',undefined,'calc-settlement-table');table.append(node('caption',t('Settlement breakdown','تفاصيل مبالغ التسوية')));
    const head=node('thead'),hr=node('tr');for(const label of [t('Item','البند'),t('Calculation / period','الحساب / الفترة'),t('Amount (QAR)','المبلغ (ر.ق)')]){const th=node('th',label);th.scope='col';hr.append(th);}head.append(hr);table.append(head);
    const body=node('tbody');table.append(body);
    function line(label,detail,value,cls='') {const tr=node('tr',undefined,cls);const th=node('th',label);th.scope='row';const td=node('td',detail),sum=node('td',money(value));sum.className='calc-money';tr.append(th,td,sum);body.append(tr);}
    function salary(s){if(!s)return;line(t('Current-month salary','راتب الشهر الحالي'),salaryNote(s),s.amount);if(s.paidBefore)line(t('Salary already paid','راتب صرف بالفعل'),t('For the same salary days','عن نفس أيام الراتب'),-s.paidBefore);}
    if(leave) {
      for(const v of r.travels) {
        if(r.travels.length===2){const tr=node('tr',undefined,'calc-period-title'),th=node('th',t('Period '+(v.index+1),'الفترة '+(v.index+1))+` · ${date(v.start)} – ${date(v.end)}`);th.colSpan=3;th.scope='rowgroup';tr.append(th);body.append(tr);}
        salary(v.monthSalary);
        line(t('Basic pay during leave','الأساسي عن الإجازة'),days(v.paidDays)+` · ${date(v.start)} – ${date(v.end)}`+t(' (return excluded)',' (دون يوم العودة)'),v.basicPay);
        for(const [key,en,aa]of [['housingPay','Housing during leave','سكن الإجازة'],['transportPay','Transport during leave','مواصلات الإجازة'],['otherPay','Other leave allowances','بدلات أخرى للإجازة'],['holidayPay','Public holiday pay','أجر العطلات الرسمية'],['holidayCash','Approved previous holiday payment','تسوية عطلات سابقة معتمدة'],['advance','Housing advance','السكن المقدم'],['ticketCash','Cash ticket allowance','بدل التذكرة النقدي']])if(v[key])line(t(en,aa),key==='holidayPay'?days(v.holidayCount):key==='advance'?v.month:t('Selected company policy','حسب السياسة المختارة'),v[key]);
        if(v.housingPaid)line(t('Housing advance already paid','سكن مقدم صرف بالفعل'),t('Deducted once','يخصم مرة واحدة'),-v.housingPaid);
        if(r.travels.length===2)line(t('Period '+(v.index+1)+' subtotal','صافي الفترة '+(v.index+1)),'',v.remainingPay,'calc-subtotal');
      }
    } else {
      line(t('End-of-service gratuity','مكافأة نهاية الخدمة'),`${num(d.basic)} ÷ 30 × ${num(d.eosDays)} × ${num(r.years)}`,r.eos);
      line(t('Unused annual leave','صرف رصيد الإجازة السنوية'),`${days(Math.max(0,r.annualBalance))} × ${money(r.leaveWage)} ÷ 30`,r.leaveValue);
      for(const [value,en,aa] of [[r.compValue,'Approved compensatory leave payout','صرف رصيد تعويضي معتمد'],[r.holidayCash,'Approved holiday cash','نقد عطلات معتمد'],[r.ticket.exitValue,'Approved cash ticket payout','بدل تذكرة نقدي معتمد']])if(value)line(t(en,aa),t('Approved optional payment','صرف اختياري معتمد'),value);
      salary(r.currentMonthSalary);
    }
    const foot=node('tfoot'),fr=node('tr'),fl=node('th',t('Total remaining payment','إجمالي المتبقي للصرف'));fl.colSpan=2;fl.scope='row';fr.append(fl,node('td',money(total),'calc-money'));foot.append(fr);table.append(foot);wrap.append(table);content.append(wrap);
    if(leave)for(const v of r.travels){
      if(v.companyProvidesTicket)note(t('Period '+(v.index+1)+': company provides the ticket. ','الفترة '+(v.index+1)+': الشركة توفر التذكرة. ')+(v.companyTicketCost?t('Estimated price: ','السعر التقديري: ')+money(v.companyTicketCost)+'. ':'')+t('Outside the employee cash total.','خارج إجمالي النقد المستحق للموظف.'));
      if(v.unpaidDays>0)note(t('Period '+(v.index+1)+': ','الفترة '+(v.index+1)+': ')+days(v.unpaidDays)+t(' exceed the available paid balance. Allowances follow the selected policy.',' تزيد على الرصيد المدفوع المتاح. البدلات حسب السياسة المختارة.'),true);
    }
    if(!leave&&d.ticketMode==='company')note(t('The company arranges the ticket separately; no ticket price is included in employee cash.','توفر الشركة التذكرة بشكل منفصل؛ لا يضاف سعرها إلى نقد الموظف.'));
    if(r.annualBalance<0)note(t('Negative annual balance needs review; no automatic gratuity deduction.','الرصيد السنوي السالب يحتاج مراجعة؛ لا يخصم تلقائيا من المكافأة.'),true);
    if(d.pendingHolidayDays>0&&d.holidaySettlement==='review')note(t('Worked-holiday days are for review only; no cash or extra leave has been added.','أيام العمل بالعطلات للمراجعة فقط؛ لم يضف عنها نقد أو رصيد.'),true);
    if(!r.eligible)note(t('Under one year: gratuity is zero and projected leave eligibility needs review.','أقل من سنة: المكافأة صفر، وأهلية الإجازة التقديرية تحتاج مراجعة.'),true);
    const detail=node('details',undefined,'calc-option calc-calculation-details');detail.append(node('summary',t('Calculation details','تفاصيل الحساب')));const inner=node('div',undefined,'calc-option-body'),dl=node('dl',undefined,'calc-metadata');
    meta(dl,t('Accrual cycle (end excluded)','دورة الاستحقاق (دون يوم النهاية)'),date(r.from)+' – '+date(r.through));meta(dl,t('Annual leave earned this cycle','الإجازة المستحقة بهذه الدورة'),days(r.earned));
    meta(dl,t('Balance calculation','معادلة الرصيد'),`${num(d.opening)} + ${num(r.earned)} − ${num(d.taken)} + (${num(d.adjustment)})`);
    if(r.compDays)meta(dl,t('Approved compensatory days','الأيام التعويضية المعتمدة'),days(r.compDays));
    meta(dl,t('Daily cash salary divisor','قسمة الراتب النقدي اليومي'),d.payBasis==='30'?t('30 days','30 يوما'):t('Actual days in each month','عدد أيام كل شهر الفعلي'));
    for(const v of r.travels){
      meta(dl,t('Period '+(v.index+1)+' · calendar / paid leave days','الفترة '+(v.index+1)+' · أيام تقويمية / إجازة مدفوعة'),num(v.duration)+' / '+num(v.paidDays));
      if(v.index)meta(dl,t('Additional accrual before period 2','استحقاق إضافي قبل الفترة الثانية'),days(v.newAccrual));
      if(v.creditedHolidayDays)meta(dl,t('Holiday debit / replacement credit','خصم العطلات / الرصيد البديل'),num(v.chargedDays)+' / '+num(v.creditedHolidayDays));
      if(v.overlap)meta(dl,t('Housing days excluded from duplicate pay','أيام سكن استبعدت من تكرار الصرف'),days(v.overlap));
      if(d.ticketMode==='cash'&&d.ticketAllocation==='prorated')meta(dl,t('Period '+(v.index+1)+' · ticket proration before cap','الفترة '+(v.index+1)+' · توزيع التذكرة قبل الحد'),`${money(d.ticketValue)} × ${num(v.annualPaidDays)} ÷ ${num(r.ticket.days)}`);
    }
    for(const s of [...r.travels.map(v=>v.monthSalary),r.currentMonthSalary].filter(Boolean)){
      meta(dl,t('Working-month salary','راتب شهر العمل'),`${money(s.grossMonthly)} ÷ ${num(s.divisor)} × ${num(s.paidDays)}${s.housingExcluded?' − '+money(s.housingExcluded)+t(' prepaid housing',' سكن مغطى مقدما'):''}`);
      if(s.excludedDays)meta(dl,t('Previously counted / leave dates excluded','أيام سابقة / إجازة استبعدت'),days(s.excludedDays));
    }
    inner.append(dl);detail.append(inner);content.append(detail);content.append(node('p',t('Estimate only. Check the contract, approvals and previous payments before disbursement.','تقدير استرشادي. راجع العقد والاعتمادات والمدفوعات السابقة قبل الصرف.'),'calc-help calc-report-note'));
    preparePrint();el('print-button').hidden=false;el('calc-results').focus({preventScroll:true});
    if(el('calc-results').scrollIntoView)el('calc-results').scrollIntoView({block:'start',behavior:window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  function preparePrint() {
    if(!lastResult)return;const r=lastResult,d=r.inputs,leave=d.calculationMode==='leave';printRoot.replaceChildren();
    printRoot.append(node('p',t('Hossam Ali · HR tools · Qatar','حسام علي · أدوات الموارد البشرية · قطر'),'calc-print-brand'),node('h1',leave?t('Leave settlement','كشف تسوية الإجازة'):t('End-of-service settlement','كشف تسوية نهاية الخدمة')));
    printRoot.append(node('p',t('Prepared: ','تاريخ الإعداد: ')+new Intl.DateTimeFormat(ar?'ar-QA':'en-GB',{dateStyle:'long',timeZone:'Asia/Qatar'}).format(new Date()),'calc-help'));
    const dl=node('dl',undefined,'calc-print-meta');meta(dl,t('Hire date','تاريخ التعيين'),date(d.serviceStart));meta(dl,t('Monthly cash salary','الراتب النقدي الشهري'),money(d.basic+d.housing+d.transport+d.other));meta(dl,t('Leave accrual cycle','دورة استحقاق الإجازة'),date(r.from)+' – '+date(r.through));
    if(leave)for(const v of r.travels)meta(dl,t('Leave '+(v.index+1)+' · departure / return','الإجازة '+(v.index+1)+' · المغادرة / العودة'),date(v.start)+' / '+date(v.end));else meta(dl,t('Last working day','آخر يوم عمل'),date(d.asOf));
    printRoot.append(dl,content.querySelector('table').cloneNode(true));
    content.querySelectorAll('.calc-report-note').forEach(n=>printRoot.append(n.cloneNode(true)));
  }
  function run() {
    clearResult();sync();const raw={};for(const input of form.elements)if(input.name&&(input.type!=='radio'||input.checked))raw[input.name]=input.type==='checkbox'?input.checked:input.value;
    try{render(window.HRCalculator.calculate(raw));}catch(e){
      const field=e.field?el(e.field):null,label=field?form.querySelector(`label[for="${field.id}"]`):null;
      error.textContent=(label?label.textContent+': ':'')+(messages[e.code]||t('Unable to calculate. Check the inputs.','تعذر الحساب. راجع المدخلات.'));error.hidden=false;
      if(field){let parent=field.parentElement;while(parent&&parent!==form){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}field.setAttribute('aria-invalid','true');field.focus();}
      if(error.scrollIntoView)error.scrollIntoView({block:'center'});
    }
  }
  form.addEventListener('submit',e=>{e.preventDefault();run();});
  form.addEventListener('input',()=>clearResult(t('Inputs changed. Calculate again to update the estimate.','تغيرت المدخلات. اضغط احسب لتحديث التقدير.')));
  form.addEventListener('change',e=>{
    if(e.target.id==='preset'&&e.target.value!=='custom'){el('under5').value=e.target.value==='thirty'?'30':'21';el('after5').value=e.target.value==='statutory'?'28':'30';}
    if(['under5','after5'].includes(e.target.id))el('preset').value='custom';
    if(e.target.id==='preset'&&e.target.value==='custom')el('company-options').open=true;
    sync();clearResult(t('Inputs changed. Calculate again to update the estimate.','تغيرت المدخلات. اضغط احسب لتحديث التقدير.'));
  });
  el('clear-button').addEventListener('click',reset);
  el('print-button').addEventListener('click',()=>{preparePrint();window.print();});
  window.addEventListener('beforeprint',()=>{if(lastResult){preparePrint();originalTitle=document.title;document.title=t('HR settlement','كشف تسوية المستحقات');}});
  window.addEventListener('afterprint',()=>{document.title=originalTitle;});
  window.addEventListener('pagehide',reset);window.addEventListener('pageshow',e=>{if(e.persisted)reset();});reset();
}());
