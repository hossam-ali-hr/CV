/* Behavioral examples for the public calculator. Run: node scripts/check_calculator.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {calculate} = require('../assets/js/entitlements-core.js');
const input = {
  serviceStart:'2020-01-01', asOf:'2026-01-01', basic:3000,
  housing:900, transport:300, other:0, under5:21, after5:28, eosDays:21,
  extraDays:0, opening:0, balanceAsOf:'', taken:0, adjustment:0,
  leavePay:'basic', returnThreshold:15, travelEnabled:false,
  includeHousing:true, includeTransport:false, housingAdvance:false
};
const near = (a,b) => assert.ok(Math.abs(a-b)<0.000001, `${a} != ${b}`);
let r=calculate(input);
near(r.years,6);near(r.eos,12600);near(r.earned,133);near(r.leaveValue,13300);near(r.total,25900);
r=calculate({...input,after5:30});near(r.earned,135);
r=calculate({...input,extraDays:3});near(r.earned,151);
r=calculate({...input,asOf:'2020-12-31'});assert.equal(r.eos,0);assert.equal(r.eligible,false);
r=calculate({...input,asOf:'2021-01-01'});near(r.eos,2100);near(r.earned,21);
r=calculate({...input,serviceStart:'2020-02-29',asOf:'2021-02-28'});near(r.years,1);near(r.eos,2100);
r=calculate({...input,balanceAsOf:'2025-01-01',opening:10,taken:5,adjustment:2});near(r.earned,28);near(r.balance,35);
r=calculate({...input,balanceAsOf:'2026-01-01',taken:5});near(r.balance,-5);near(r.leaveValue,0);near(r.total,r.eos);
r=calculate({...input,leavePay:'gross',balanceAsOf:'2026-01-01',opening:10});near(r.leaveValue,1400);near(r.eos,12600);
const travel={...input,travelEnabled:true,leaveStart:'2026-01-20',returnDate:'2026-02-20',housingAdvance:true};
r=calculate(travel);near(r.travel.duration,31);near(r.travel.overlap,19);near(r.travel.housingPay,360);near(r.travel.advance,900);near(r.travel.total,4360);near(r.total,25900);
r=calculate({...travel,returnDate:'2026-02-14'});assert.equal(r.travel.advanceEligible,false);near(r.travel.advance,0);
r=calculate({...travel,returnDate:'2026-03-20'});assert.equal(r.travel.advanceEligible,false);
r=calculate({...travel,includeHousing:false});near(r.travel.housingPay,0);near(r.travel.overlap,0);near(r.travel.total,4000);
r=calculate({...travel,includeTransport:true});near(r.travel.transportPay,310);
for(const edit of [
 {serviceStart:'2020-02-30'}, {asOf:'2019-12-31'}, {basic:''}, {basic:-1}, {housing:Infinity},
 {under5:20}, {after5:27}, {eosDays:20}, {opening:5},
 {balanceAsOf:'2027-01-01'}, {balanceAsOf:'2019-01-01'},
 {travelEnabled:true,leaveStart:'2026-02-01',returnDate:'2026-01-31'},
 {travelEnabled:true,leaveStart:'2026-01-01',returnDate:'2028-01-01'},
]) assert.throws(()=>calculate({...input,...edit}));
// Keep uploads, persistence and outbound input requests out of the public runtime.
for(const file of ['entitlements-core.js','calculator.js']){
 const src=fs.readFileSync(path.join(__dirname,'../assets/js',file),'utf8');
 assert.doesNotMatch(src,/\b(localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|sendBeacon|FileReader)\b|\bfetch\s*\(/);
}
for(const lang of ['en','ar']){
 const src=fs.readFileSync(path.join(__dirname,`../${lang}/tools/leave-eos-calculator.html`),'utf8');
 assert.doesNotMatch(src,/<input[^>]*type=["']file["']/i);
 assert.match(src,/connect-src 'none'/);assert.match(src,/form-action 'none'/);
 assert.doesNotMatch(src,/(?:employee_id|employee_name|company_code|Import_Template|backupImport)/);
}
console.log('PASS: anniversary/threshold, leap-year, opening-balance, negative-balance, enhanced wage, housing overlap, validation and no-upload/no-storage checks.');
