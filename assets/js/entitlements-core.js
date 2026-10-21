/* Public HR calculator: pure arithmetic, no data store or network access. */
(function (root) {
  'use strict';
  const dateNumber = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? Date.parse(s + 'T00:00:00Z') : NaN;
  const validDate = s => Number.isFinite(dateNumber(s)) && new Date(dateNumber(s)).toISOString().slice(0, 10) === s;
  const days = (a, b) => Math.round((dateNumber(b) - dateNumber(a)) / 86400000);
  const plusDays = (s,n) => new Date(dateNumber(s)+n*86400000).toISOString().slice(0,10);
  const addYears = (s,n) => {
    const [y,m,d]=s.split('-').map(Number);
    return `${y+n}-${String(m).padStart(2,'0')}-${String(Math.min(d,new Date(Date.UTC(y+n,m,0)).getUTCDate())).padStart(2,'0')}`;
  };
  const firstNextMonth = s => {const [y,m]=s.split('-').map(Number);return new Date(Date.UTC(y,m,1)).toISOString().slice(0,10);};
  function serviceYears(start,end) {
    let whole=0; while(whole<100 && addYears(start,whole+1)<=end)whole++;
    return whole+days(addYears(start,whole),end)/days(addYears(start,whole),addYears(start,whole+1));
  }
  function year360(a,b) {
    const [y1,m1,d1]=a.split('-').map(Number),[y2,m2,d2]=b.split('-').map(Number);
    return ((y2-y1)*360+(m2-m1)*30+Math.min(d2,30)-Math.min(d1,30))/360;
  }
  function accrual(start,from,end,under5,after5,extraDays,method='actual') {
    let cursor=from>start?from:start,amount=0;
    while(cursor<end) {
      const year=Math.floor(serviceYears(start,cursor)),boundary=addYears(start,year+1),stop=boundary<end?boundary:end;
      const fraction=method==='360'?year360(cursor,stop):days(cursor,stop)/(method==='365'?365:days(addYears(start,year),boundary));
      amount+=((year<5?under5:after5)+extraDays)*fraction; cursor=stop;
    }
    return amount;
  }
  const daily=(monthly,date,basis)=>{
    const divisor=basis==='calendar'?new Date(Date.UTC(Number(date.slice(0,4)),Number(date.slice(5,7)),0)).getUTCDate():30;
    return monthly/divisor;
  };
  function calculate(raw) {
    const d={leaveBasis:'return',lastReturn:'',accrualMethod:'actual',leavePay:'basic',customLeaveWage:0,
      pendingHolidayDays:0,holidaySettlement:'review',holidayCashBasis:'approved',holidayCashAmount:0,holidayCashFactor:1,encashComp:false,
      payBasis:'30',paidLeaveMode:'balance',holidayDates:'',leaveHolidayMode:'exclude',housingMode:'paid',transportMode:'none',otherMode:'none',
      housingFixed:0,transportFixed:0,otherFixed:0,housingAdvance:false,returnThreshold:15,advanceMethod:'full',housingPaid:0,splitLeave:false,accrueBetweenPeriods:false,leaveStart2:'',returnDate2:'',holidayDates2:'',housingPaid2:0,housingFixed2:0,transportFixed2:0,otherFixed2:0,
      ticketMode:'none',ticketValue:0,ticketAllocation:'prorated',ticketAnnualDays:0,ticketUsedBefore:0,ticketCompanyPeriod:'both',encashTicketOnExit:false,
      calculationMode:'both',includeMonthSalary:false,monthSalaryUnpaidDays:0,monthSalaryPaid:0,monthSalaryUnpaidDays2:0,monthSalaryPaid2:0,...raw};
    const fail=(field,code)=>{const e=new Error(code);e.field=field;e.code=code;throw e;};
    const choice=(key,values)=>{if(!values.includes(d[key]))fail(key,'choice');};
    choice('calculationMode',['both','leave','eos']);
    if(d.calculationMode==='leave'){
      if(!validDate(d.leaveStart)||d.leaveStart<'1900-01-01')fail('leaveStart','date');
      d.travelEnabled=true;d.asOf=d.leaveStart;d.leavePay='basic';d.eosDays=21;d.encashComp=false;d.encashTicketOnExit=false;
    }
    if(d.calculationMode==='eos'){d.travelEnabled=false;d.splitLeave=false;}
    for(const key of ['serviceStart','asOf'])if(!validDate(d[key]) || d[key]<'1900-01-01')fail(key,'date');
    if(d.asOf<d.serviceStart)fail('asOf','order');
    if(serviceYears(d.serviceStart,d.asOf)>80)fail('asOf','range');
    const ranges={basic:[0,1e8],housing:[0,1e8],transport:[0,1e8],other:[0,1e8],under5:[21,366],after5:[28,366],eosDays:[21,366],extraDays:[0,366],opening:[-10000,10000],taken:[0,10000],adjustment:[-10000,10000],pendingHolidayDays:[0,366],customLeaveWage:[0,1e8],holidayCashAmount:[0,1e9],holidayCashFactor:[0,10],housingFixed:[0,1e8],transportFixed:[0,1e8],otherFixed:[0,1e8],housingPaid:[0,1e8],returnThreshold:[1,31],housingPaid2:[0,1e8],housingFixed2:[0,1e8],transportFixed2:[0,1e8],otherFixed2:[0,1e8],ticketValue:[0,1e8],ticketAnnualDays:[0,732],ticketUsedBefore:[0,1e8],monthSalaryUnpaidDays:[0,31],monthSalaryPaid:[0,1e8],monthSalaryUnpaidDays2:[0,31],monthSalaryPaid2:[0,1e8]};
    if(!d.includeMonthSalary)d.monthSalaryUnpaidDays=d.monthSalaryPaid=d.monthSalaryUnpaidDays2=d.monthSalaryPaid2=0;
    if(!d.splitLeave)d.monthSalaryUnpaidDays2=d.monthSalaryPaid2=0;
    if(!d.travelEnabled)d.splitLeave=false;
    if(!d.travelEnabled)d.ticketAnnualDays=0;
    if(!d.splitLeave){d.housingPaid2=0;d.housingFixed2=d.transportFixed2=d.otherFixed2=0;}
    for(const name of ['housing','transport','other'])if(d[name+'Mode']!=='fixed')d[name+'Fixed2']=0;
    if(!d.housingAdvance)d.housingPaid2=0;
    if(d.ticketAllocation!=='prorated')d.ticketAnnualDays=0;
    if(d.ticketMode==='none'){d.ticketValue=0;d.ticketUsedBefore=0;d.ticketAnnualDays=0;}
    if(d.ticketMode==='company'){d.ticketUsedBefore=0;d.ticketAnnualDays=0;}
    // Ignore controls which cannot affect the selected scenario.
    if(d.housingMode!=='fixed')d.housingFixed=0;
    if(d.transportMode!=='fixed')d.transportFixed=0;
    if(d.otherMode!=='fixed')d.otherFixed=0;
    if(!d.travelEnabled){d.returnThreshold=15;d.housingPaid=0;d.housingFixed=d.transportFixed=d.otherFixed=0;}
    if(!d.housingAdvance){d.returnThreshold=15;d.housingPaid=0;}
    if(d.holidaySettlement!=='cash'){d.holidayCashAmount=0;d.holidayCashFactor=1;}
    if(d.holidayCashBasis==='approved')d.holidayCashFactor=1;
    if(d.leavePay!=='custom')d.customLeaveWage=0;
    for(const [key,[min,max]]of Object.entries(ranges)) {
      if(d[key]===''&&['basic','under5','after5','eosDays','returnThreshold'].includes(key))fail(key,'number');
      const n=Number(d[key]??0);if(!Number.isFinite(n)||n<min||n>max)fail(key,'number');d[key]=n;
    }
    choice('leaveBasis',['return','hire','opening']);choice('accrualMethod',['actual','365','360']);choice('payBasis',['30','calendar']);
    choice('leavePay',['basic','housing','transport','gross','custom']);choice('holidaySettlement',['review','credit','cash']);choice('holidayCashBasis',['approved','basic','gross']);
    choice('ticketMode',['none','cash','company']);
    if(d.ticketMode==='cash'){choice('ticketAllocation',['prorated','first','second','perTrip']);if(d.ticketValue<=0)fail('ticketValue','ticketValue');}
    if(d.ticketMode==='company')choice('ticketCompanyPeriod',['first','second','both']);
    let through=d.asOf,travelEnd=null;
    if(d.travelEnabled) {
      for(const key of ['leaveStart','returnDate'])if(!validDate(d[key]))fail(key,'date');
      if(d.leaveStart<d.serviceStart||d.returnDate<=d.leaveStart)fail('returnDate','travelOrder');
      if(days(d.leaveStart,d.returnDate)>366)fail('returnDate','travelRange');
      through=d.leaveStart;travelEnd=d.returnDate;
    }
    let from;
    if(d.leaveBasis==='return') {
      if(!validDate(d.lastReturn)||d.lastReturn<d.serviceStart||d.lastReturn>through)fail('lastReturn','returnCycle');from=d.lastReturn;
    } else if(d.leaveBasis==='opening') {
      if(!validDate(d.balanceAsOf)||d.balanceAsOf<d.serviceStart||d.balanceAsOf>through)fail('balanceAsOf','balanceDate');from=d.balanceAsOf;
    } else from=d.serviceStart;
    if(serviceYears(d.serviceStart,through)>80)fail('leaveStart','range');
    const years=serviceYears(d.serviceStart,d.asOf),eligible=d.asOf>=addYears(d.serviceStart,1);
    const earned=accrual(d.serviceStart,from,through,d.under5,d.after5,d.extraDays,d.accrualMethod);
    const annualBalance=d.opening+earned-d.taken+d.adjustment;
    const compDays=d.holidaySettlement==='credit'?d.pendingHolidayDays:0;
    const balance=annualBalance+compDays;
    const gross=d.basic+d.housing+d.transport+d.other;
    const leaveWage=d.leavePay==='gross'?gross:d.leavePay==='housing'?d.basic+d.housing:d.leavePay==='transport'?d.basic+d.housing+d.transport:d.leavePay==='custom'?d.customLeaveWage:d.basic;
    if(d.leavePay==='custom'&&leaveWage<d.basic)fail('customLeaveWage','wageFloor');
    let holidayCash=0;
    if(d.holidaySettlement==='cash'&&d.pendingHolidayDays>0) {
      if(d.holidayCashBasis==='approved') {if(d.holidayCashAmount===0)fail('holidayCashAmount','approvedCash');holidayCash=d.holidayCashAmount;}
      else { if(d.holidayCashFactor<=0)fail('holidayCashFactor','number');holidayCash=d.pendingHolidayDays*(d.holidayCashBasis==='gross'?gross:d.basic)/30*d.holidayCashFactor; }
    }
    const eos=eligible?d.basic/30*d.eosDays*years:0;
    const leaveValue=Math.max(0,annualBalance)*leaveWage/30;
    const compValue=d.encashComp?compDays*leaveWage/30:0;
    const schedule=d.travelEnabled?[{start:d.leaveStart,end:travelEnd,suffix:''}]:[];
    if(d.splitLeave) {
      if(!validDate(d.leaveStart2))fail('leaveStart2','date');if(!validDate(d.returnDate2))fail('returnDate2','date');
      if(d.returnDate2<=d.leaveStart2||days(d.leaveStart2,d.returnDate2)>366)fail('returnDate2','travelRange');
      if(d.leaveStart2<d.returnDate)fail('leaveStart2','splitOverlap');
      if(serviceYears(d.serviceStart,d.leaveStart2)>80)fail('leaveStart2','range');
      schedule.push({start:d.leaveStart2,end:d.returnDate2,suffix:'2'});
    }
    if(d.travelEnabled&&d.ticketMode==='cash'&&d.ticketAllocation==='second'&&!d.splitLeave)fail('ticketAllocation','ticketSecond');
    if(d.travelEnabled&&d.ticketMode==='company'&&d.ticketCompanyPeriod==='second'&&!d.splitLeave)fail('ticketCompanyPeriod','ticketSecond');
    const annualRate=(serviceYears(d.serviceStart,through)<5?d.under5:d.after5)+d.extraDays;
    const ticketDays=d.ticketAnnualDays||annualRate;
    d.ticketValue=Math.round(d.ticketValue*100)/100;d.ticketUsedBefore=Math.round(d.ticketUsedBefore*100)/100;
    if(d.ticketMode==='cash'&&d.ticketValue<=0)fail('ticketValue','ticketValue');
    const ticketBudget=d.ticketValue*(d.ticketMode==='cash'&&d.ticketAllocation==='perTrip'?Math.max(1,schedule.length):1);
    if(d.ticketMode==='cash'&&d.ticketUsedBefore>ticketBudget)fail('ticketUsedBefore','ticketUsed');
    let ticketRemaining=Math.max(0,ticketBudget-d.ticketUsedBefore);
    const coveredHousing=[];
    const salaryDates=new Set();
    function monthSalary(cutoff,suffix='',priorPeriods=[],salaryMonth=cutoff.slice(0,7)) {
      if(!d.includeMonthSalary)return null;
      const month=salaryMonth,start=month+'-01',from=start<d.serviceStart?d.serviceStart:start;
      const dates=[];
      for(let date=from;date<cutoff;date=plusDays(date,1)) {
        if(!salaryDates.has(date)&&!priorPeriods.some(p=>date>=p.start&&date<p.end))dates.push(date);
        salaryDates.add(date);
      }
      const unpaidDays=d['monthSalaryUnpaidDays'+suffix],calendarDays=dates.length;
      if(unpaidDays>calendarDays)fail('monthSalaryUnpaidDays'+suffix,'salaryUnpaid');
      const paidDays=calendarDays-unpaidDays,weight=calendarDays?paidDays/calendarDays:0;
      let amount=0,housingExcluded=0;
      for(const date of dates) {
        const housing=coveredHousing.some(p=>date>=p.start&&date<p.end)?daily(d.housing,date,d.payBasis)*weight:0;
        housingExcluded+=housing;amount+=daily(gross,date,d.payBasis)*weight-housing;
      }
      const paidBefore=d['monthSalaryPaid'+suffix];
      if(paidBefore>amount+1e-7)fail('monthSalaryPaid'+suffix,'salaryPaid');
      return {month,from,to:plusDays(cutoff,-1),calendarDays,paidDays,unpaidDays,grossMonthly:gross,divisor:d.payBasis==='calendar'?new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).getUTCDate():30,
        housingExcluded,excludedDays:Math.max(0,days(from,cutoff)-calendarDays),amount,paidBefore,remaining:Math.max(0,amount-paidBefore)};
    }
    function payment(period,available,index) {
      const suffix=period.suffix,field=name=>name+suffix,start=period.start,end=period.end;
      choice('payBasis',['30','calendar']);choice('paidLeaveMode',['balance','full']);choice('leaveHolidayMode',['exclude','credit']);choice('advanceMethod',['full','untilReturn']);
      for(const key of ['housingMode','transportMode','otherMode'])choice(key,['none','paid','calendar','fixed']);
      const dates=String(d[field('holidayDates')]||'').split(/[\s,،;]+/).filter(Boolean);
      if(dates.length>366||dates.some(x=>!validDate(x)||x<start||x>=end))fail(field('holidayDates'),'holidayDates');
      if(new Set(dates).size!==dates.length)fail(field('holidayDates'),'holidayDuplicate');
      const holidays=new Set(dates),duration=days(start,end),holidayCount=holidays.size,requestedDays=duration-holidayCount;
      const paidDays=d.paidLeaveMode==='full'?requestedDays:Math.min(requestedDays,Math.max(0,available));
      const monthStart=firstNextMonth(start),month=end.slice(0,7);
      const previouslyCovered=coveredHousing.some(c=>c.start<=monthStart&&c.end>=firstNextMonth(monthStart));
      const advanceEligible=Boolean(d.housingAdvance)&&d.housing>0&&month===monthStart.slice(0,7)&&Number(end.slice(8))>=d.returnThreshold&&!previouslyCovered;
      if(advanceEligible&&d.housingMode==='fixed')fail('housingMode','housingFixed');
      const advance=advanceEligible?(d.advanceMethod==='full'?d.housing:Array.from({length:days(monthStart,end)},(_,i)=>daily(d.housing,plusDays(monthStart,i),d.payBasis)).reduce((a,b)=>a+b,0)):0;
      if(d[field('housingPaid')]>advance)fail(field('housingPaid'),'advancePaid');
      if(advanceEligible)coveredHousing.push({start:monthStart,end:d.advanceMethod==='full'?firstNextMonth(monthStart):end});
      let basicPay=0,housingPay=0,transportPay=0,otherPay=0,holidayPay=0,overlap=0,remaining=paidDays;
      const allowance=(name,date,weight)=>d[name+'Mode']==='calendar'?daily(d[name],date,d.payBasis):d[name+'Mode']==='paid'?daily(d[name],date,d.payBasis)*weight:0;
      for(let i=0;i<duration;i++) {
        const date=plusDays(start,i),covered=coveredHousing.some(c=>date>=c.start&&date<c.end);
        if(holidays.has(date)) {
          holidayPay+=daily(gross,date,d.payBasis);
          if(covered){holidayPay-=daily(d.housing,date,d.payBasis);overlap++;}
        } else {
          const weight=Math.min(1,Math.max(0,remaining));remaining-=weight;basicPay+=daily(d.basic,date,d.payBasis)*weight;
          const h=allowance('housing',date,weight);
          if(covered){if(h>0)overlap+=d.housingMode==='paid'?weight:1;}else housingPay+=h;
          transportPay+=allowance('transport',date,weight);otherPay+=allowance('other',date,weight);
        }
      }
      if(d.housingMode==='fixed'){
        if(coveredHousing.some(c=>c.start<end&&c.end>start))fail(field('housingFixed'),'housingFixed');
        housingPay=d[field('housingFixed')];
      }
      if(d.transportMode==='fixed')transportPay=d[field('transportFixed')];
      if(d.otherMode==='fixed')otherPay=d[field('otherFixed')];
      const creditedHolidayDays=d.leaveHolidayMode==='credit'?holidayCount:0,chargedDays=paidDays+creditedHolidayDays;
      // Outstanding prior holiday cash is settled once, with the first planned period.
      const periodHolidayCash=index===0?holidayCash:0;
      const total=basicPay+housingPay+transportPay+otherPay+holidayPay+advance+periodHolidayCash;
      return {index,start,end,duration,holidayCount,requestedDays,paidDays,unpaidDays:requestedDays-paidDays,chargedDays,creditedHolidayDays,returnBalance:available-paidDays,
        basicPay,housingPay,transportPay,otherPay,holidayPay,holidayCash:periodHolidayCash,overlap,advance,advanceEligible,month,housingPaid:d[field('housingPaid')],total,remainingPay:total-d[field('housingPaid')]};
    }
    let annualRemaining=annualBalance,compRemaining=compDays;
    const travels=[];
    for(let index=0;index<schedule.length;index++) {
      const period=schedule[index];
      const newAccrual=index>0&&d.accrueBetweenPeriods?accrual(d.serviceStart,schedule[index-1].start,period.start,d.under5,d.after5,d.extraDays,d.accrualMethod):0;
      annualRemaining+=newAccrual;
      const available=annualRemaining+compRemaining,v=payment(period,available,index);
      const compUsed=Math.min(Math.max(0,compRemaining),Math.max(0,v.paidDays-Math.max(0,annualRemaining)));
      const annualUsed=v.paidDays-compUsed;annualRemaining-=annualUsed;compRemaining-=compUsed;
      let ticketAllocated=0,ticketCash=0,companyTicketCost=0,companyProvidesTicket=false;
      if(d.ticketMode==='cash') {
        let requested=d.ticketAllocation==='prorated'?d.ticketValue*annualUsed/ticketDays:d.ticketAllocation==='perTrip'?d.ticketValue:
          (d.ticketAllocation==='first'&&index===0)||(d.ticketAllocation==='second'&&index===1)?d.ticketValue:0;
        ticketAllocated=Math.max(0,Math.min(Math.round(requested*100),Math.round(ticketRemaining*100)))/100;ticketCash=ticketAllocated;ticketRemaining=Math.round((ticketRemaining-ticketAllocated)*100)/100;
      } else if(d.ticketMode==='company') {
        companyProvidesTicket=d.ticketCompanyPeriod==='both'||(d.ticketCompanyPeriod==='first'&&index===0)||(d.ticketCompanyPeriod==='second'&&index===1);
        companyTicketCost=companyProvidesTicket?d.ticketValue:0;
      }
      v.newAccrual=newAccrual;v.balanceBefore=available;v.annualPaidDays=annualUsed;v.compUsed=compUsed;v.annualRemaining=annualRemaining;v.compRemaining=compRemaining;v.returnBalance=annualRemaining+compRemaining;
      v.ticketCash=ticketCash;v.companyTicketCost=companyTicketCost;v.companyProvidesTicket=companyProvidesTicket;v.ticketAllocated=ticketAllocated;v.ticketShare=d.ticketAllocation==='prorated'?Math.min(1,annualUsed/ticketDays):null;
      v.monthSalary=monthSalary(period.start,period.suffix,schedule.slice(0,index));
      v.total+=ticketCash+(v.monthSalary?v.monthSalary.amount:0);v.remainingPay+=ticketCash+(v.monthSalary?v.monthSalary.remaining:0);travels.push(v);
    }
    const ticketExitValue=d.ticketMode==='cash'&&d.encashTicketOnExit?Math.max(0,d.ticketValue-d.ticketUsedBefore):0;
    const plan=travels.length?{periods:travels.length,days:travels.reduce((s,v)=>s+v.duration,0),paidDays:travels.reduce((s,v)=>s+v.paidDays,0),unpaidDays:travels.reduce((s,v)=>s+v.unpaidDays,0),
      total:travels.reduce((s,v)=>s+v.total,0),remainingPay:travels.reduce((s,v)=>s+v.remainingPay,0),ticketCash:travels.reduce((s,v)=>s+v.ticketCash,0),companyTicketCost:travels.reduce((s,v)=>s+v.companyTicketCost,0),
      newAccrual:travels.reduce((s,v)=>s+v.newAccrual,0),returnBalance:annualRemaining+compRemaining}:null;
    const ticket={mode:d.ticketMode,value:d.ticketValue,days:ticketDays,budget:ticketBudget,usedBefore:d.ticketUsedBefore,remaining:ticketRemaining,exitValue:ticketExitValue};
    // The exit date is the final paid working date; leave departure itself is excluded.
    const currentMonthSalary=!d.travelEnabled?monthSalary(plusDays(d.asOf,1),'',[],d.asOf.slice(0,7)):null;
    return {inputs:d,years,eligible,from,through,earned,annualBalance,compDays,balance,leaveWage,eos,leaveValue,compValue,holidayCash,ticket,currentMonthSalary,total:eos+leaveValue+compValue+holidayCash+ticketExitValue+(currentMonthSalary?currentMonthSalary.remaining:0),travel:travels[0]||null,travels,plan};
  }

  const api={calculate,validDate,serviceYears,accrual};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.HRCalculator=api;
}(typeof globalThis!=='undefined'?globalThis:this));
