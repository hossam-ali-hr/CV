/* Behavioral examples for the manual calculator. Run: node scripts/check_calculator.cjs */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {calculate}=require('../assets/js/entitlements-core.js');
const input={serviceStart:'2020-01-01',asOf:'2026-01-01',lastReturn:'2025-01-01',leaveBasis:'return',basic:3000,housing:900,transport:300,other:0,under5:21,after5:30,eosDays:21,extraDays:0,opening:0,taken:0,adjustment:0,leavePay:'basic',travelEnabled:false};
const near=(a,b)=>assert.ok(Math.abs(a-b)<0.000001,`${a} != ${b}`);
let r=calculate(input);near(r.years,6);near(r.eos,12600);near(r.earned,30);near(r.leaveValue,3000);near(r.total,15600);
// Returning resets this leave cycle, never the six-year EOS service or rate band.
r=calculate({...input,lastReturn:'2024-01-01'});near(r.earned,51);near(r.eos,12600);
r=calculate({...input,leaveBasis:'hire'});near(r.earned,135);
r=calculate({...input,extraDays:3});near(r.earned,33);
r=calculate({...input,leaveBasis:'opening',balanceAsOf:'2025-01-01',opening:10,taken:5,adjustment:2});near(r.annualBalance,37);
r=calculate({...input,leaveBasis:'opening',balanceAsOf:'2026-01-01',taken:5});near(r.annualBalance,-5);near(r.leaveValue,0);near(r.total,r.eos);
r=calculate({...input,leavePay:'gross'});near(r.leaveValue,4200);near(r.eos,12600);
r=calculate({...input,leavePay:'housing'});near(r.leaveValue,3900);
r=calculate({...input,leavePay:'transport'});near(r.leaveValue,4200);
r=calculate({...input,leaveBasis:'hire',asOf:'2020-12-31'});assert.equal(r.eos,0);
r=calculate({...input,serviceStart:'2020-02-29',leaveBasis:'hire',asOf:'2021-02-28'});near(r.years,1);near(r.eos,2100);near(r.earned,21);
r=calculate({...input,leaveBasis:'hire',accrualMethod:'360'});near(r.earned,135);
// Cycle ends at departure, independently of the EOS calculation date.
const travel={...input,lastReturn:'2025-01-20',travelEnabled:true,leaveStart:'2026-01-20',returnDate:'2026-02-20',housingMode:'paid',transportMode:'none',otherMode:'none',paidLeaveMode:'balance',payBasis:'30',housingAdvance:true};
r=calculate(travel);near(r.earned,30);near(r.years,6);near(r.travel.duration,31);near(r.travel.paidDays,30);near(r.travel.unpaidDays,1);near(r.travel.basicPay,3000);near(r.travel.housingPay,360);near(r.travel.advance,900);near(r.travel.overlap,18);near(r.travel.total,4260);
r=calculate({...travel,paidLeaveMode:'full'});near(r.travel.paidDays,31);near(r.travel.total,4360);
r=calculate({...travel,transportMode:'paid'});near(r.travel.transportPay,300);
r=calculate({...travel,transportMode:'calendar'});near(r.travel.transportPay,310);
r=calculate({...travel,transportMode:'fixed',transportFixed:750});near(r.travel.transportPay,750);
r=calculate({...travel,otherMode:'fixed',otherFixed:500});near(r.travel.otherPay,500);
r=calculate({...travel,housingAdvance:false,housingMode:'none'});near(r.travel.housingPay,0);near(r.travel.total,3000);
r=calculate({...travel,advanceMethod:'untilReturn'});near(r.travel.advance,570);near(r.travel.total,3930);
r=calculate({...travel,housingPaid:200});near(r.travel.total,4260);near(r.travel.remainingPay,4060);
r=calculate({...travel,returnDate:'2026-02-14'});assert.equal(r.travel.advanceEligible,false);
r=calculate({...travel,returnDate:'2026-03-20'});assert.equal(r.travel.advanceEligible,false);
// Holiday dates receive gross cash once; covered housing is removed from the same dates.
const holidays={...travel,holidayDates:'2026-02-10\n2026-02-11',leaveHolidayMode:'exclude'};
r=calculate(holidays);near(r.travel.holidayCount,2);near(r.travel.paidDays,29);near(r.travel.holidayPay,220);near(r.travel.overlap,19);near(r.travel.total,4380);near(r.travel.returnBalance,1);
r=calculate({...holidays,leaveHolidayMode:'credit'});near(r.travel.chargedDays,31);near(r.travel.creditedHolidayDays,2);near(r.travel.returnBalance,1);near(r.travel.total,4380);
r=calculate({...holidays,housingAdvance:false});near(r.travel.holidayPay,280);near(r.travel.total,4050);
// Outstanding worked-holiday cash and compensatory credit are mutually exclusive.
r=calculate({...input,pendingHolidayDays:3,holidaySettlement:'credit'});near(r.annualBalance,30);near(r.compDays,3);near(r.balance,33);near(r.compValue,0);near(r.total,15600);
r=calculate({...input,pendingHolidayDays:3,holidaySettlement:'credit',encashComp:true});near(r.compValue,300);near(r.total,15900);
r=calculate({...input,pendingHolidayDays:3,holidaySettlement:'cash',holidayCashAmount:600});near(r.holidayCash,600);near(r.compDays,0);near(r.total,16200);
r=calculate({...input,pendingHolidayDays:3,holidaySettlement:'cash',holidayCashBasis:'gross',holidayCashFactor:1.5});near(r.holidayCash,630);
r=calculate({...travel,pendingHolidayDays:3,holidaySettlement:'cash',holidayCashAmount:600});near(r.travel.holidayCash,600);near(r.travel.total,4860);
r=calculate({...input,pendingHolidayDays:3,holidaySettlement:'review'});near(r.balance,30);near(r.holidayCash,0);
const feb={...travel,lastReturn:'2025-02-01',leaveStart:'2026-02-01',returnDate:'2026-03-01',housingAdvance:false,payBasis:'calendar'};
r=calculate(feb);near(r.travel.basicPay,3000);near(r.travel.housingPay,900);
r=calculate({...feb,payBasis:'30'});near(r.travel.basicPay,2800);near(r.travel.housingPay,840);
for(const edit of [{lastReturn:''},{lastReturn:'2019-01-01'},{lastReturn:'2026-02-01'},{serviceStart:'2020-02-30'},{asOf:'2019-12-31'},{basic:''},{basic:-1},{housing:Infinity},{under5:20},{after5:27},{eosDays:20},{leaveBasis:'opening',balanceAsOf:''},{leaveBasis:'opening',balanceAsOf:'2027-01-01'},{leavePay:'custom',customLeaveWage:2000},{pendingHolidayDays:3,holidaySettlement:'cash',holidayCashAmount:0}])assert.throws(()=>calculate({...input,...edit}));
for(const edit of [{returnDate:'2026-01-19'},{returnDate:'2028-01-01'},{holidayDates:'2026-02-20'},{holidayDates:'2026-02-10\n2026-02-10'},{holidayDates:'2026-02-30'},{housingPaid:901},{housingMode:'fixed',housingFixed:100}])assert.throws(()=>calculate({...travel,...edit}));
for(const file of ['entitlements-core.js','calculator.js'])assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../assets/js',file),'utf8'),/\b(localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|sendBeacon|FileReader)\b|\bfetch\s*\(/);
for(const lang of ['en','ar']){const src=fs.readFileSync(path.join(__dirname,`../${lang}/tools/leave-eos-calculator.html`),'utf8');assert.doesNotMatch(src,/<input[^>]*type=["']file["']/i);assert.match(src,/connect-src 'none'/);assert.match(src,/form-action 'none'/);assert.doesNotMatch(src,/(?:employee_id|employee_name|company_code|Import_Template|backupImport)/);}
console.log('PASS: last-return cycle independent of service; company pay policies, holiday cash/credit/dates, paid/unpaid allocation, calendar divisors, advances, invalid inputs and privacy.');
