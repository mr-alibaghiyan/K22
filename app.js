/* ============================================================
   کودک من — v20 (بازسازی کامل)
   منبع محتوای مراقبتی: بوکلت رسمی «راهنمای غیرپزشک - مراقبت کودک
   سالم زیر ۵ سال»، وزارت بهداشت، نسخه ۱۴۰۰.
   این فایل کل منطق برنامه را در یک معماری واحد و ساده نگه می‌دارد
   (جایگزین لایه‌های متعدد و ناهماهنگ نسخه‌های قبلی v13 تا v19).
   ============================================================ */
(function(){
"use strict";

/* ---------------- Persian digit / date helpers ---------------- */
const FA_DIGITS = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];
function fa(n){ return String(n).replace(/[0-9]/g, d => FA_DIGITS[d]); }
function uid(){ return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

// Gregorian -> Jalali (standard public-domain algorithm)
function toJalali(gy, gm, gd){
  const g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
  let jy;
  gy = parseInt(gy); gm = parseInt(gm); gd = parseInt(gd);
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  let jm, jd;
  if (days < 186) { jm = 1 + Math.floor(days / 31); jd = 1 + (days % 31); }
  else { jm = 7 + Math.floor((days - 186) / 30); jd = 1 + ((days - 186) % 30); }
  return [jy, jm, jd];
}
const JALALI_MONTHS = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
function faDate(iso){
  if(!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if(isNaN(d)) return "—";
  const [jy,jm,jd] = toJalali(d.getFullYear(), d.getMonth()+1, d.getDate());
  return fa(jd) + " " + JALALI_MONTHS[jm-1] + " " + fa(jy);
}
function faDateShort(iso){
  if(!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  const [jy,jm,jd] = toJalali(d.getFullYear(), d.getMonth()+1, d.getDate());
  return fa(jd)+"/"+fa(jm)+"/"+fa(jy);
}
function addDays(iso, n){ const d = new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function addMonths(iso, n){ const d = new Date(iso+"T00:00:00"); d.setMonth(d.getMonth()+n); return d.toISOString().slice(0,10); }
function daysBetween(a,b){ return Math.round((new Date(b+"T00:00:00") - new Date(a+"T00:00:00")) / 86400000); }
function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

/* ---------------- Data (fetched once, cached) ---------------- */
const DATA = { visits:null, domains:null, vaccines:null, supplements:null, dangerSigns:null, chapters:null, meta:null, agepacks:null, motherGuide:null };
async function loadAllData(){
  const files = {visits:'data/visits.json', domains:'data/domains.json', vaccines:'data/vaccines.json',
    supplements:'data/supplements.json', dangerSigns:'data/danger_signs.json', chapters:'data/chapters.json', meta:'data/meta.json', agepacks:'data/agepacks.json', motherGuide:'data/mother_guide.json'};
  const entries = Object.entries(files);
  await Promise.all(entries.map(async ([key,url])=>{
    try{ const r = await fetch(url); DATA[key] = await r.json(); }
    catch(e){ console.error('failed to load', url, e); DATA[key] = key==='chapters'||key==='visits' ? [] : {}; }
  }));
}

/* ---------------- Storage (single clean schema) ---------------- */
const SKEY = 'koodak_v20_children';
const AKEY = 'koodak_v20_active';
function loadChildren(){ try{ return JSON.parse(localStorage.getItem(SKEY) || '[]'); }catch(e){ return []; } }
function saveChildren(list){ localStorage.setItem(SKEY, JSON.stringify(list)); }
function getActiveId(){ return localStorage.getItem(AKEY) || ''; }
function setActiveId(id){ localStorage.setItem(AKEY, id); }
function getActiveChild(){
  const list = loadChildren();
  const id = getActiveId();
  return list.find(c=>c.id===id) || list[0] || null;
}
function updateChild(id, patch){
  const list = loadChildren();
  const i = list.findIndex(c=>c.id===id);
  if(i<0) return;
  list[i] = Object.assign({}, list[i], patch, {updatedAt: new Date().toISOString()});
  saveChildren(list);
}
function addEvent(childId, type, title, extra){
  const list = loadChildren();
  const i = list.findIndex(c=>c.id===childId);
  if(i<0) return;
  const ev = {id:uid(), date: todayISO(), type, title, ...(extra||{})};
  list[i].events = list[i].events || [];
  list[i].events.unshift(ev);
  list[i].updatedAt = new Date().toISOString();
  saveChildren(list);
}
function newChildObj(data){
  return Object.assign({
    id: uid(), name:'', gender:'f', birthDate: todayISO(), birthWeightGrams: 3200,
    gestationalWeeks: 39, measurements: [], visitsDone: {}, vaccinesGiven: {}, events: [], dailyLogs: {}, profileFlags: {},
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }, data||{});
}

/* ---------------- Age math ---------------- */
function calendarAge(birthISO, nowISO){
  const b = new Date(birthISO+'T00:00:00');
  const n = new Date(nowISO+'T00:00:00');
  if(isNaN(b)||isNaN(n)||n<b) return {years:0,months:0,days:0,totalMonths:0,totalDays:0};
  let years=n.getFullYear()-b.getFullYear();
  let months=n.getMonth()-b.getMonth();
  let days=n.getDate()-b.getDate();
  if(days<0){
    months--;
    const prev=new Date(n.getFullYear(), n.getMonth(), 0);
    days += prev.getDate();
  }
  if(months<0){ years--; months+=12; }
  const totalDays=daysBetween(birthISO,nowISO);
  const totalMonths=years*12+months;
  return {years,months,days,totalMonths,totalDays};
}
function ageInfo(child){
  const nowISO=todayISO();
  const a=calendarAge(child.birthDate,nowISO);
  const label = a.years>0
    ? (fa(a.years)+' سال و '+fa(a.months)+' ماه و '+fa(a.days)+' روز')
    : (a.months>0 ? fa(a.months)+' ماه و '+fa(a.days)+' روز' : fa(a.days)+' روز');
  return { days:a.totalDays, years:a.years, months:a.months, daysPart:a.days, totalMonths:a.totalMonths, exactMonths:a.totalDays/30.4375, label };
}
function ageStage(child){
  const age=ageInfo(child); const stages=(DATA.agepacks&&DATA.agepacks.stages)||[];
  if(!stages.length) return null;
  let s=stages.find(x=>age.days>=x.minDays && age.days<=x.maxDays);
  if(s) return s;
  return stages.slice().sort((a,b)=>{const am=(a.minDays+a.maxDays)/2,bm=(b.minDays+b.maxDays)/2;return Math.abs(am-age.days)-Math.abs(bm-age.days)})[0] || stages[0];
}
function latestMeasurement(child){
  const ms=(child.measurements||[]).filter(m=>m&&m.date).slice().sort((a,b)=>a.date<b.date?-1:1);
  return ms.length?ms[ms.length-1]:null;
}
function previousMeasurement(child){
  const ms=(child.measurements||[]).filter(m=>m&&m.date).slice().sort((a,b)=>a.date<b.date?-1:1);
  return ms.length>1?ms[ms.length-2]:null;
}
function trendFlags(child){
  const a=latestMeasurement(child), b=previousMeasurement(child), flags=[];
  if(a&&b){
    if(a.weightKg!=null&&b.weightKg!=null&&a.weightKg<b.weightKg) flags.push('وزن نسبت به اندازه‌گیری قبلی کاهش یافته است');
    if(a.heightCm!=null&&b.heightCm!=null&&a.heightCm<=b.heightCm) flags.push('افزایش قد در آخرین فاصله ثبت‌شده دیده نمی‌شود');
    if(a.headCm!=null&&b.headCm!=null&&a.headCm<=b.headCm) flags.push('افزایش دور سر در آخرین فاصله ثبت‌شده دیده نمی‌شود');
  }
  return flags;
}
function nextVaccine(child){
  const V=DATA.vaccines||{}; const age=ageInfo(child).totalMonths; const given=child.vaccinesGiven||{};
  const rows=(V.schedule||[]).filter(r=>!r.conditional);
  for(const r of rows){
    const due=addMonths(child.birthDate,r.ageMonths);
    const allGiven=(r.items||[]).every((_,i)=>given[r.id+'-'+i]||given[(rows.indexOf(r))+'-'+i]);
    if(!allGiven) return Object.assign({},r,{dueDate:due, overdue:daysBetween(due,todayISO())>=0});
  }
  return null;
}
window.KOODAK = { fa, uid, todayISO, faDate, faDateShort, addDays, addMonths, daysBetween, esc,
  DATA, loadAllData, loadChildren, saveChildren, getActiveId, setActiveId, getActiveChild,
  updateChild, addEvent, newChildObj, ageInfo, calendarAge, ageStage, latestMeasurement, previousMeasurement,
  trendFlags, nextVaccine, birthWeightProfile, visitsWithStatus, currentVisit, nextUpcomingVisit };

function birthWeightProfile(g){
  g = Number(g)||3000;
  if(g < 1500) return 'vlbw_lt1500';
  if(g < 2500) return 'preterm_lt2500';
  return 'term_ge2500';
}

/* Determine visit status relative to child's current age */
function visitAgeStartDays(v){
  if(v.ageDaysFrom!=null) return v.ageDaysFrom;
  if(v.ageMonths!=null) return Math.round(v.ageMonths*30.4375);
  return 0;
}
function visitsWithStatus(child){
  const days = ageInfo(child).days;
  return (DATA.visits||[]).map(v=>{
    const startDay = visitAgeStartDays(v);
    const done = !!(child.visitsDone && child.visitsDone[v.id]);
    let status = 'upcoming';
    if(done) status = 'done';
    else if(days >= startDay) status = 'due';
    const dueDateApprox = addDays(child.birthDate, startDay);
    return Object.assign({}, v, {startDay, done, status, dueDateApprox});
  });
}
function currentVisit(child){
  const list = visitsWithStatus(child);
  const dueNotDone = list.filter(v=>v.status==='due');
  if(dueNotDone.length) return dueNotDone[dueNotDone.length-1];
  const upcoming = list.filter(v=>v.status==='upcoming');
  return upcoming[0] || list[list.length-1];
}
function nextUpcomingVisit(child){
  const list = visitsWithStatus(child);
  return list.find(v=>v.status==='upcoming') || null;
}


})();
