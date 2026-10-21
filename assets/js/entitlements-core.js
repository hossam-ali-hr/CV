/* Wifaq public calculator: pure arithmetic, no data store or network access. */
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
      housingFixed:0,transportFixed:0,otherFixed:0,housingAdvance:false,returnThreshold:15,advanceMethod:'full',housingPaid:0,...raw};
    const fail=(field,code)=>{const e=new Error(code);e.field=field;e.code=code;throw e;};
    const choice=(key,values)=>{if(!values.includes(d[key]))fail(key,'choice');};
    for(const key of ['serviceStart','asOf'])if(!validDate(d[key]) || d[key]<'1900-01-01')fail(key,'date');
    if(d.asOf<d.serviceStart)fail('asOf','order');
    if(serviceYears(d.serviceStart,d.asOf)>80)fail('asOf','range');
    const ranges={basic:[0,1e8],housing:[0,1e8],transport:[0,1e8],other:[0,1e8],under5:[21,366],after5:[28,366],eosDays:[21,366],extraDays:[0,366],opening:[-10000,10000],taken:[0,10000],adjustment:[-10000,10000],pendingHolidayDays:[0,366],customLeaveWage:[0,1e8],holidayCashAmount:[0,1e9],holidayCashFactor:[0,10],housingFixed:[0,1e8],transportFixed:[0,1e8],otherFixed:[0,1e8],housingPaid:[0,1e8],returnThreshold:[1,31]};
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
    choice('leaveBasis',['return','hire','opening']);choice('accrualMethod',['actual','365','360']);
    choice('leavePay',['basic','housing','transport','gross','custom']);choice('holidaySettlement',['review','credit','cash']);choice('holidayCashBasis',['approved','basic','gross']);
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
    let travel=null;
    if(d.travelEnabled) {
      choice('payBasis',['30','calendar']);choice('paidLeaveMode',['balance','full']);choice('leaveHolidayMode',['exclude','credit']);choice('advanceMethod',['full','untilReturn']);
      for(const key of ['housingMode','transportMode','otherMode'])choice(key,['none','paid','calendar','fixed']);
      const dates=String(d.holidayDates||'').split(/[\s,،;]+/).filter(Boolean);
      if(dates.length>366||dates.some(x=>!validDate(x)||x<d.leaveStart||x>=travelEnd))fail('holidayDates','holidayDates');
      if(new Set(dates).size!==dates.length)fail('holidayDates','holidayDuplicate');
      const holidays=new Set(dates),duration=days(d.leaveStart,travelEnd),holidayCount=holidays.size,requestedDays=duration-holidayCount;
      const paidDays=d.paidLeaveMode==='full'?requestedDays:Math.min(requestedDays,Math.max(0,balance));
      const unpaidDays=requestedDays-paidDays;
      const monthStart=firstNextMonth(d.leaveStart),month=travelEnd.slice(0,7);
      const advanceEligible=Boolean(d.housingAdvance)&&d.housing>0&&month===monthStart.slice(0,7)&&Number(travelEnd.slice(8))>=d.returnThreshold;
      if(advanceEligible&&d.housingMode==='fixed')fail('housingMode','housingFixed');
      const advance=advanceEligible?(d.advanceMethod==='full'?d.housing:Array.from({length:days(monthStart,travelEnd)},(_,i)=>daily(d.housing,plusDays(monthStart,i),d.payBasis)).reduce((a,b)=>a+b,0)):0;
      if(d.housingPaid>advance)fail('housingPaid','advancePaid');
      let basicPay=0,housingPay=0,transportPay=0,otherPay=0,holidayPay=0,overlap=0,remaining=paidDays;
      const allowance=(name,date,weight)=>d[name+'Mode']==='calendar'?daily(d[name],date,d.payBasis):d[name+'Mode']==='paid'?daily(d[name],date,d.payBasis)*weight:0;
      for(let i=0;i<duration;i++) {
        const date=plusDays(d.leaveStart,i),covered=advanceEligible&&date.slice(0,7)===month;
        if(holidays.has(date)) {
          holidayPay+=daily(gross,date,d.payBasis);
          if(covered){holidayPay-=daily(d.housing,date,d.payBasis);overlap++;}
        } else {
          const weight=Math.min(1,Math.max(0,remaining));remaining-=weight;
          basicPay+=daily(d.basic,date,d.payBasis)*weight;
          const h=allowance('housing',date,weight);
          if(covered){if(h>0)overlap+=d.housingMode==='paid'?weight:1;}else housingPay+=h;
          transportPay+=allowance('transport',date,weight);otherPay+=allowance('other',date,weight);
        }
      }
      if(d.housingMode==='fixed')housingPay=d.housingFixed;
      if(d.transportMode==='fixed')transportPay=d.transportFixed;
      if(d.otherMode==='fixed')otherPay=d.otherFixed;
      const creditedHolidayDays=d.leaveHolidayMode==='credit'?holidayCount:0;
      const chargedDays=paidDays+creditedHolidayDays;
      const returnBalance=balance-chargedDays+creditedHolidayDays;
      const total=basicPay+housingPay+transportPay+otherPay+holidayPay+advance+holidayCash;
      travel={duration,holidayCount,requestedDays,paidDays,unpaidDays,chargedDays,creditedHolidayDays,returnBalance,
        basicPay,housingPay,transportPay,otherPay,holidayPay,holidayCash,overlap,advance,advanceEligible,month,housingPaid:d.housingPaid,total,remainingPay:total-d.housingPaid};
    }
    return {inputs:d,years,eligible,from,through,earned,annualBalance,compDays,balance,leaveWage,eos,leaveValue,compValue,holidayCash,total:eos+leaveValue+compValue+holidayCash,travel};
  }
  const api={calculate,validDate,serviceYears,accrual};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.WifaqCalculator=api;
}(typeof globalThis!=='undefined'?globalThis:this));
