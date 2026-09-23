(function(){
"use strict";
const K = window.KOODAK;
const esc = K.esc;
const $ = sel => document.querySelector(sel);
const appEl = () => $('#app');

/* ---------------- toast & modal ---------------- */
function toast(msg){
  const old = document.querySelector('.toast'); if(old) old.remove();
  const t = document.createElement('div'); t.className='toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2200);
}
function modal(title, html){
  closeModal();
  const bg = document.createElement('div'); bg.className='modal-bg'; bg.id='modalBg';
  bg.onclick = (e)=>{ if(e.target===bg) closeModal(); };
  bg.innerHTML = `<div class="modal-box"><button class="modal-close" onclick="KUI.closeModal()">×</button>
    <h2>${K.esc(title)}</h2><div>${html}</div></div>`;
  document.body.appendChild(bg);
}
function closeModal(){ const m=document.getElementById('modalBg'); if(m) m.remove(); }

/* ---------------- routing ---------------- */
function go(hash){ location.hash = hash; }
function route(){
  const child = K.getActiveChild();
  const h = location.hash.replace('#','') || '/home';
  if(!child && h !== '/new'){ renderChrome(null); renderScreenInto(screenNewChild(true)); return; }
  renderChrome(child);
  const parts = h.split('/').filter(Boolean);
  let html = '';
  if(parts[0]==='new') html = screenNewChild(false);
  else if(parts[0]==='home' || parts.length===0) html = screenHome(child);
  else if(parts[0]==='today' || parts[0]==='age') html = screenAge(child);
  else if(parts[0]==='nutrition') html = screenNutrition(child);
  else if(parts[0]==='visit' && parts[1]) html = screenVisit(child, parts[1]);
  else if(parts[0]==='growth') html = screenGrowth(child);
  else if(parts[0]==='vaccines') html = screenVaccines(child);
  else if(parts[0]==='supplements') html = screenSupplements(child);
  else if(parts[0]==='danger') html = screenDanger(child);
  else if(parts[0]==='library' && parts[1]) html = screenChapter(parts[1]);
  else if(parts[0]==='library') html = screenLibrary();
  else if(parts[0]==='records') html = screenRecords(child);
  else if(parts[0]==='settings') html = screenSettings();
  else html = screenHome(child);
  renderScreenInto(html);
  updateTabs(parts[0]||'home');
  window.scrollTo(0,0);
  setTimeout(()=>{ if(parts[0]==='growth') drawGrowthChart(child); }, 30);
}
function renderScreenInto(html){ appEl().innerHTML = html; }

/* ---------------- chrome: header + tabs ---------------- */
function renderChrome(child){
  const list = K.loadChildren();
  const opts = list.map(c=>`<option value="${c.id}" ${child&&c.id===child.id?'selected':''}>${K.esc(c.name||'کودک')}</option>`).join('');
  document.getElementById('appShell').innerHTML = `
    <header class="top">
      <div class="row"><div class="brand">کودک من<small>همراه مراقبت کودک سالم</small></div>
      ${list.length?`<select class="childpick" onchange="KUI.switchChild(this.value)">${opts}<option value="__new">+ کودک جدید</option></select>`:''}</div>
    </header><main id="app"></main>
    <nav class="tabs" id="tabs">
      ${tabBtn('home','🏠','امروز')}
      ${tabBtn('growth','📈','رشد')}
      ${tabBtn('vaccines','💉','واکسن')}
      ${tabBtn('nutrition','🍽️','تغذیه')}
      ${tabBtn('records','🗂️','پرونده')}
    </nav>`;
}

function tabBtn(key,ic,label){
  return `<button data-tab="${key}" onclick="KUI.go('/${key}')"><span class="ic">${ic}</span>${label}</button>`;
}
function updateTabs(current){
  document.querySelectorAll('#tabs button').forEach(b=>{
    b.classList.toggle('active', b.dataset.tab===current);
  });
}
function switchChild(id){
  if(id==='__new'){ go('/new'); return; }
  K.setActiveId(id); go('/home');
}

/* ================= SCREENS ================= */

function screenNewChild(first){
  return `<div class="card">
    <h3>${first? 'خوش آمدید 👋' : 'افزودن کودک جدید'}</h3>
    <p class="small muted">اطلاعات پایه کودک را وارد کنید. همه داده‌ها فقط روی همین دستگاه ذخیره می‌شود.</p>
    <div class="field"><label>نام کودک</label><input id="nf_name" placeholder="مثلاً آیدا"></div>
    <div class="grid2">
      <div class="field"><label>جنسیت</label><select id="nf_gender"><option value="f">دختر</option><option value="m">پسر</option></select></div>
      <div class="field"><label>تاریخ تولد (میلادی)</label><input id="nf_bdate" type="date" value="${K.todayISO()}"></div>
    </div>
    <div class="grid2">
      <div class="field"><label>وزن تولد (گرم)</label><input id="nf_bw" type="number" value="3200"></div>
      <div class="field"><label>سن حاملگی هنگام تولد (هفته)</label><input id="nf_ga" type="number" value="39"></div>
    </div>
    <button class="btn block" onclick="KUI.createChild()">ثبت و شروع</button>
    ${!first? `<button class="btn ghost block" style="margin-top:8px" onclick="history.back()">انصراف</button>`:''}
  </div>`;
}
function createChild(){
  const name = $('#nf_name').value.trim() || 'کودک من';
  const gender = $('#nf_gender').value;
  const birthDate = $('#nf_bdate').value || K.todayISO();
  const bw = Number($('#nf_bw').value)||3200;
  const ga = Number($('#nf_ga').value)||39;
  const c = K.newChildObj({name, gender, birthDate, birthWeightGrams: bw, gestationalWeeks: ga});
  const list = K.loadChildren(); list.push(c); K.saveChildren(list); K.setActiveId(c.id);
  toast('پرونده کودک ایجاد شد');
  go('/home');
}

function latestLog(child){
  const d=K.todayISO(); return (child.dailyLogs&&child.dailyLogs[d])||null;
}
function stageFor(child){ return K.ageStage(child) || ((K.DATA.agepacks||{}).stages||[])[0] || {}; }
function formatDueBadge(date){
  if(!date) return '';
  const d=K.daysBetween(K.todayISO(),date);
  if(d<0) return `<span class="badge orange">${K.fa(Math.abs(d))} روز گذشته</span>`;
  if(d===0) return `<span class="badge red">امروز</span>`;
  if(d<=14) return `<span class="badge blue">${K.fa(d)} روز دیگر</span>`;
  return `<span class="badge gray">${K.faDateShort(date)}</span>`;
}
function growthSummary(child){
  const m=K.latestMeasurement(child), flags=K.trendFlags(child);
  if(!m) return {title:'هنوز اندازه‌گیری ثبت نشده',desc:'قد، وزن و دور سر را وارد کنید تا جایگاه کودک روی نمودارهای استاندارد دیده شود.',tone:'orange'};
  if(flags.length) return {title:'روند رشد نیاز به توجه دارد',desc:flags[0],tone:'orange'};
  return {title:'اطلاعات رشد ثبت شده',desc:'برای تفسیر دقیق، نقطه کودک را روی چهار نمودار استاندارد ببینید.',tone:'green'};
}

function personalizationBlock(child){
  const f=child.profileFlags||{},m=K.latestMeasurement(child),items=[];
  if(f.digestive) items.push('<div class="notice orange"><b>گوارش:</b> اگر استفراغ مکرر، ناتوانی در نوشیدن، بی‌حالی یا نشانه‌های کم‌آبی/خطر وجود دارد، ارزیابی پزشکی را عقب نیندازید. جزئیات بیماری را از بخش علائم خطر ببینید.</div>');
  if(f.allergy) items.push('<div class="notice orange"><b>حساسیت غذایی:</b> ماده غذایی مشکوک و علامت ایجادشده را در ثبت روزانه یادداشت کنید و برای واکنش شدید یا علائم تنفسی/کاهش هوشیاری فوراً اقدام کنید.</div>');
  if(f.lowWeight) items.push('<div class="notice orange"><b>کم‌وزنی/لاغری ثبت‌شده:</b> هدف فقط افزایش مقدار غذا نیست؛ وزن برای سن، قد برای سن و وزن برای قد و روند آنها باید بررسی شود و مشاوره تغذیه طبق بوکلت انجام شود.</div>');
  if(f.overweight) items.push('<div class="notice orange"><b>اضافه‌وزن/چاقی ثبت‌شده:</b> حجم وعده و کیفیت خوراکی‌ها را با توصیه تغذیه‌ای بوکلت تطبیق دهید و روند وزن برای قد را پیگیری کنید؛ رژیم محدودکننده خودسرانه برای کودک نگذارید.</div>');
  return items.length?`<div class="card"><h3>🎯 توصیه‌های شخصی‌سازی‌شده</h3>${items.join('')}</div>`:'';
}
function screenHome(child){
  const age=K.ageInfo(child), stage=stageFor(child), visits=K.visitsWithStatus(child), cur=K.currentVisit(child), next=K.nextUpcomingVisit(child), nv=K.nextVaccine(child), m=K.latestMeasurement(child), log=latestLog(child), gs=growthSummary(child);
  const due=visits.filter(v=>v.status==='due');
  const daily=(K.DATA.agepacks&&K.DATA.agepacks.common&&K.DATA.agepacks.common.dailyTips)||[]; const todayTip=daily.length?daily[age.days%daily.length]:(stage.nutrition||'امروز فقط یک قدم کوچک برای سلامت کودک ثبت کنید.');
  return `
  <div class="hero">
    <div class="row between"><div>
      <div class="small muted">${K.esc(child.name)} • ${child.gender==='m'?'پسر':'دختر'}</div>
      <div class="hero-age">${age.label}</div>
      <div class="hero-sub">تاریخ تولد: ${K.faDate(child.birthDate)}<br>سن دقیق محاسبه‌شده بر اساس تاریخ امروز</div>
    </div><div style="font-size:46px">${child.gender==='m'?'👦':'👧'}</div></div>
  </div>

  <div class="card">
    <div class="section-title"><h3>امروز برای ${K.esc(child.name||'کودک')} چه چیزهایی مهم است؟</h3><span>${K.esc(stage.label||'')}</span></div>
    <div class="notice blue">💡 ${esc(todayTip)}</div>
    <div class="quick-grid">
      <button class="quick" onclick="KUI.openQuickLog()"><span class="qic">📝</span><b>ثبت امروز</b></button>
      <button class="quick" onclick="KUI.go('/age')"><span class="qic">🎯</span><b>بسته سن من</b></button>
      <button class="quick" onclick="KUI.go('/growth')"><span class="qic">📊</span><b>رشد من</b></button>
      <button class="quick" onclick="KUI.go('/danger')"><span class="qic">🚨</span><b>علائم خطر</b></button>
    </div>
  </div>

  <div class="dashboard-grid">
    <div class="dash-card"><h4>💉 واکسن بعدی</h4>${nv?`<p><b>${esc(nv.age)}</b></p><p>${esc((nv.items||[]).join(' • '))}</p><p>${formatDueBadge(nv.dueDate)}</p>`:'<p>برنامه روتین ثبت‌شده کامل است؛ کارت واکسن را با مرکز تطبیق دهید.</p>'}</div>
    <div class="dash-card"><h4>🏥 مراقبت بعدی</h4>${next?`<p><b>${esc(next.label)}</b></p><p>${formatDueBadge(next.dueDateApprox)}</p>`:`<p>مراقبت برنامه‌ریزی‌شده بعدی یافت نشد.</p>`}${due.length?`<p class="badge orange">${K.fa(due.length)} مراقبت رسیده</p>`:''}</div>
    <div class="dash-card"><h4>📈 رشد</h4><p><b>${esc(gs.title)}</b></p><p>${esc(gs.desc)}</p>${m?`<p>وزن: ${m.weightKg!=null?K.fa(m.weightKg)+' kg':'—'} | قد: ${m.heightCm!=null?K.fa(m.heightCm)+' cm':'—'}</p>`:''}</div>
    <div class="dash-card"><h4>💊 مکمل‌ها</h4><p>${esc((K.DATA.supplements||{}).note||'')}</p><button class="btn light sm" onclick="KUI.go('/supplements')">مکمل اختصاصی کودک</button></div>
  </div>

  ${personalizationBlock(child)}

  <div class="card"><div class="section-title"><h3>🍽️ تغذیه و خواب همین سن</h3><span>بدون چک‌لیست</span></div><p style="line-height:2;font-size:13px">${esc(stage.nutrition||'')}</p><div class="notice green">😴 ${esc(stage.sleep||'')}</div></div>

  <div class="card"><div class="section-title"><h3>🧠 تکامل مورد انتظار</h3><span>سن ${esc(stage.label||'')}</span></div>${(stage.development||[]).map(x=>`<div class="list-item"><span>• ${esc(x)}</span></div>`).join('')}</div>

  <div class="card"><div class="section-title"><h3>🚑 چه زمانی مرکز بهداشت/درمان؟</h3><span>هشدارهای مهم</span></div>${(stage.danger||[]).slice(0,6).map(x=>`<div class="notice red">${esc(x)}</div>`).join('')}<button class="btn danger block" onclick="KUI.go('/danger')">بررسی کامل علائم خطر</button></div>

  <div class="card"><div class="section-title"><h3>📚 سؤال‌های رایج این سن</h3><span>پاسخ کوتاه</span></div><div class="faq">${(stage.faq||[]).slice(0,3).map(f=>`<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div><button class="btn light block" style="margin-top:10px" onclick="KUI.go('/age')">دیدن تمام بسته مراقبتی سن کودک</button></div>

  <div class="card"><div class="section-title"><h3>📅 مسیر مراقبت</h3><span>برنامه رسمی</span></div><div class="timeline">${visits.slice(0,8).map(v=>`<div class="tl"><b>${esc(v.label)}</b> — ${v.status==='due'?'زمان مراجعه رسیده':v.status==='done'?'در پرونده ثبت شده':'موعد آینده'}<div class="small muted">${K.faDate(v.dueDateApprox)}</div></div>`).join('')}</div></div>

  <div class="card"><div class="section-title"><h3>📝 ثبت امروز</h3><span>${log?K.faDateShort(K.todayISO()):'هنوز ثبت نشده'}</span></div>${log?`<div class="pillbar">${log.sleepHours!=null?`<span class="pill">خواب ${K.fa(log.sleepHours)} ساعت</span>`:''}${log.meals!=null?`<span class="pill">${K.fa(log.meals)} وعده</span>`:''}${log.waterMl!=null?`<span class="pill">آب ${K.fa(log.waterMl)} ml</span>`:''}${log.symptoms?`<span class="pill warn">${esc(log.symptoms)}</span>`:''}</div>`:'<p class="small muted">با ثبت ساده خواب، غذا و علائم، توصیه‌های صفحه امروز شخصی‌تر می‌شوند.</p>'}<button class="btn light block" style="margin-top:9px" onclick="KUI.openQuickLog()">ثبت/ویرایش اطلاعات امروز</button></div>`;
}

function motherAgeGroup(child){
  const m=K.ageInfo(child).totalMonths;
  if(m<4) return 'infant_0_3';
  if(m<6) return 'infant_4_5';
  if(m<9) return 'comp_6_8';
  if(m<12) return 'comp_9_11';
  if(m<24) return 'comp_12_23';
  return 'child_2_5';
}
function motherSleepFor(child){
  const m=K.ageInfo(child).totalMonths, g=K.DATA.motherGuide||{};
  if(m<4) return g.sleep?.[0]; if(m<12) return g.sleep?.[1]; if(m<36) return g.sleep?.[2]; return g.sleep?.[3];
}
function motherFoodRow(child){
  const m=K.ageInfo(child).totalMonths,g=K.DATA.motherGuide||{};
  if(m<6) return null; if(m<9) return g.complementary?.[0]; if(m<12) return g.complementary?.[1]; if(m<24) return g.complementary?.[2]; return g.complementary?.[3];
}
function personalizedGrowthText(child){
  const m=K.latestMeasurement(child),f=child.profileFlags||{};
  if(!m) return 'هنوز اندازه‌گیری ثبت نشده؛ وزن، قد/طول و دور سر را وارد کنید تا اطلاعات رشد کودک در کنار سن دقیق او دیده شود.';
  const tags=[]; if(f.lowWeight)tags.push('کم‌وزنی/لاغری'); if(f.overweight)tags.push('اضافه‌وزن/چاقی');
  return tags.length?`برای ${tags.join(' و ')} ثبت‌شده، فقط یک عدد کافی نیست؛ روند وزن، قد و وزن نسبت به قد را کنار هم بررسی کنید.`:'آخرین اندازه‌گیری ثبت شده است. برای قضاوت درباره رشد، روند چند اندازه‌گیری و هر سه شاخص اصلی رشد را کنار هم ببینید.';
}
function renderMotherTable(headers,rows,cls='mother-table'){
  return `<div class="table-scroll"><table class="${cls}"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function screenNutrition(child){
  const g=K.DATA.motherGuide||{}, age=K.ageInfo(child), food=motherFoodRow(child), sleep=motherSleepFor(child), logs=child.dailyLogs||{};
  const feeding=age.totalMonths<6?g.breastfeeding?.slice(0,3):g.breastfeeding?.slice(3);
  return `<div class="hero"><div class="small muted">${esc(child.name)} • ${age.label}</div><div class="hero-age">🍽️ برنامه تغذیه و خواب من</div><div class="hero-sub">این صفحه به‌جای زبان مراقبتی، می‌گوید در سن فعلی کودک چه چیزی معمولاً مناسب است و شما چه چیزهایی را می‌توانید ثبت و مقایسه کنید.</div></div>
  <div class="card"><h3>🍼 شیر خوردن کودک من</h3>${feeding.map(x=>`<div class="guide-card"><h4>${esc(x.age)}</h4><p>${esc(x.what)}</p><ul>${x.check.map(y=>`<li>${esc(y)}</li>`).join('')}</ul></div>`).join('')}</div>
  ${food?`<div class="card"><h3>🥣 جدول غذای تکمیلی مناسب سن ${age.label}</h3>${renderMotherTable(['سن','وعده اصلی','میان‌وعده','مقدار تقریبی هر وعده','بافت غذا','چه چیزهایی؟'],[[food.age,food.meals,food.snacks,food.amount,food.texture,food.foods]])}<div class="notice blue">این جدول «هدف تغذیه‌ای» است، نه چک‌لیست اجباری. اشتها، رشد و وضعیت پزشکی کودک باید در نظر گرفته شود.</div></div>`:'<div class="card"><h3>🥣 غذای تکمیلی</h3><div class="notice blue">غذای تکمیلی از پایان حدود ۶ ماهگی شروع می‌شود؛ قبل از آن، برای کودک سالم، شیر مادر تغذیه اصلی است و افزودن غذا/مایعات بدون توصیه حرفه‌ای انجام نشود.</div></div>'}
  <div class="card"><h3>📋 جدول کامل تغذیه تکمیلی</h3>${renderMotherTable(['سن','وعده‌ها','میان‌وعده','مقدار هر وعده','بافت'],g.complementary.map(x=>[x.age,x.meals,x.snacks,x.amount,x.texture]))}</div>
  <div class="card"><h3>🍎 قواعدی که واقعاً به درد مادر می‌خورد</h3>${g.feeding_rules.map(x=>`<div class="notice green">✓ ${esc(x)}</div>`).join('')}</div>
  <div class="card"><h3>🥤 آبمیوه طبیعی</h3>${renderMotherTable(['سن','حداکثر مقدار ذکرشده در بوکلت'],g.juice.map(x=>[x.age,x.max]))}</div>
  <div class="card"><h3>😴 خواب در ۲۴ ساعت</h3>${renderMotherTable(['سن','مقدار خواب','توضیح'],g.sleep.map(x=>[x.age,x.sleep,x.note]))}<div class="notice blue">مقدار خواب شامل چرت‌هاست. اگر کودک از نظر حال عمومی یا رشد نگرانی دیگری دارد، فقط عدد خواب را ملاک سلامت قرار ندهید.</div></div>
  <div class="card"><h3>🏃 فعالیت و بازی</h3>${renderMotherTable(['سن','هدف روزانه'],g.activity.map(x=>[x.age,x.target]))}</div>
  <div class="card"><h3>📊 ثبت امروز من</h3><div class="pillbar">${logs[K.todayISO()]?.sleepHours!=null?`<span class="pill">خواب امروز: ${K.fa(logs[K.todayISO()].sleepHours)} ساعت</span>`:'<span class="pill">خواب امروز ثبت نشده</span>'}${logs[K.todayISO()]?.meals!=null?`<span class="pill">وعده‌ها: ${K.fa(logs[K.todayISO()].meals)}</span>`:''}</div><button class="btn block" onclick="KUI.openQuickLog()">ثبت خواب و تغذیه امروز</button></div>`;
}
function screenAge(child){
  const stage=stageFor(child), age=K.ageInfo(child), common=(K.DATA.agepacks||{}).common||{}, g=K.DATA.motherGuide||{}, sleep=motherSleepFor(child), food=motherFoodRow(child), flags=child.profileFlags||{};
  const scr=g.screening||[]; const currentScreen=scr.filter(x=>{const n=parseInt((x.age||'').replace(/[^0-9]/g,''));return isNaN(n)||Math.abs(n-age.totalMonths)<=1}).slice(0,4);
  const pers=(g.personalization||[]).filter(x=>flags[x.flag]);
  return `<div class="card"><div class="row between"><div><div class="small muted">${esc(child.name)} • ${child.gender==='m'?'پسر':'دختر'}</div><h2 style="margin:4px 0">${age.label}</h2><div class="small muted">تاریخ تولد: ${K.faDate(child.birthDate)}</div></div><span class="badge blue">${esc(stage.label||'')}</span></div><div class="age-nav"><button onclick="KUI.go('/growth')">📈 رشد</button><button onclick="KUI.go('/nutrition')">🍽️ تغذیه</button><button onclick="KUI.go('/vaccines')">💉 واکسن</button><button onclick="KUI.go('/danger')">🚨 خطر</button></div></div>
  <div class="card"><h3>🎯 الان برای مادر چه چیزهایی مهم است؟</h3><div class="notice blue">سن دقیق کودک شما <b>${age.label}</b> است. این صفحه به‌جای «بسته مراقبتی»، اطلاعاتی را نشان می‌دهد که مستقیماً برای زندگی روزمره شما کاربرد دارد.</div>${(stage.care||[]).map(x=>`<div class="guide-card"><b>✓ ${esc(x)}</b></div>`).join('')}</div>
  <div class="card"><h3>📈 رشد کودک من</h3><p>${esc(personalizedGrowthText(child))}</p>${K.latestMeasurement(child)?`<div class="pillbar"><span class="pill">وزن: ${K.fa(K.latestMeasurement(child).weightKg??'—')} kg</span><span class="pill">قد: ${K.fa(K.latestMeasurement(child).heightCm??'—')} cm</span><span class="pill">دور سر: ${K.fa(K.latestMeasurement(child).headCm??'—')} cm</span></div>`:''}<button class="btn block" onclick="KUI.go('/growth')">دیدن نمودارهای رشد و ثبت اندازه‌گیری</button></div>
  ${food?`<div class="card"><h3>🥣 تغذیه تکمیلی همین سن</h3>${renderMotherTable(['سن','وعده','میان‌وعده','مقدار','بافت'],[[food.age,food.meals,food.snacks,food.amount,food.texture]])}<button class="btn light block" onclick="KUI.go('/nutrition')">جزئیات غذا، آب، شیر و خواب</button></div>`:`<div class="card"><h3>🍼 تغذیه همین سن</h3><p>${esc(stage.nutrition||'')}</p><button class="btn light block" onclick="KUI.go('/nutrition')">راهنمای کامل شیرخوردن و خواب</button></div>`}
  <div class="card"><h3>😴 خواب کودک من</h3><div class="metric-big">${sleep?esc(sleep.sleep):'—'}</div><p>${sleep?esc(sleep.note):esc(stage.sleep||'')}</p></div>
  ${pers.length?`<div class="card"><h3>🎯 چون این وضعیت را برای کودک ثبت کرده‌اید</h3>${pers.map(x=>`<div class="guide-card"><h4>${esc(x.title)}</h4>${x.steps.map(y=>`<div class="notice orange">${esc(y)}</div>`).join('')}</div>`).join('')}</div>`:''}
  <div class="card"><h3>🧠 چیزهایی که در این سن می‌توانید ببینید</h3>${(stage.development||[]).map(x=>`<div class="notice green">${esc(x)}</div>`).join('')}<div class="notice orange">اگر مهارتی که کودک قبلاً داشته از بین برود یا نگرانی واضحی درباره تکامل دارید، برای ارزیابی مراجعه کنید.</div></div>
  <div class="card"><h3>🩺 علائم هشدار که نباید منتظر بمانید</h3>${(stage.danger||[]).map(x=>`<div class="notice red">${esc(x)}</div>`).join('')}<button class="btn danger block" onclick="KUI.go('/danger')">بررسی کامل علائم خطر</button></div>
  <div class="card"><h3>🔎 غربالگری‌های نزدیک به سن ${age.label}</h3>${currentScreen.map(x=>`<div class="guide-card"><b>${esc(x.age)}</b><p>${esc(x.what)}</p></div>`).join('')||'<p class="muted">برای این چند روز/ماه، مورد جدیدی از جدول غربالگری استخراج نشد.</p>'}</div>
  <div class="card"><h3>💉 واکسن مرتبط با این سن</h3>${(K.DATA.vaccines.schedule||[]).filter(v=>v.ageMonths>=Math.max(0,age.totalMonths-1)&&v.ageMonths<=age.totalMonths+1).map(v=>`<div class="notice blue"><b>${esc(v.age)}</b><br>${esc(v.items.join(' • '))}</div>`).join('')||'<p class="muted">در این بازه نوبت روتین جدیدی در جدول واکسن نیست؛ کارت واکسن را بررسی کنید.</p>'}<button class="btn light block" onclick="KUI.go('/vaccines')">تقویم کامل واکسن</button></div>
  <div class="card"><h3>🛡️ ایمنی متناسب با سن</h3>${(g.safety||[]).find(x=>{const n=age.totalMonths; return (n<4&&x.age.includes('۴'))||(n>=4&&n<12&&x.age.includes('۴–۱۲'))||(n>=12&&n<36&&x.age.includes('۱–۲'))||(n>=36&&x.age.includes('۳–۵'))})?.items.map(x=>`<div class="notice green">✓ ${esc(x)}</div>`).join('')||''}</div>
  <div class="card"><h3>❓ پرسش‌های متداول</h3><div class="faq">${(stage.faq||[]).map(f=>`<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div></div>
  <div class="card"><h3>📚 منبع حرفه‌ای</h3><p class="small muted">محتوای مادرپسند این صفحه از بوکلت‌های موجود در اپ استخراج و بازنویسی شده است؛ متن حرفه‌ای برای استفاده مادر به زبان اجرایی نمایش داده نمی‌شود.</p><button class="btn ghost block" onclick="KUI.go('/library')">مشاهده متن کامل بوکلت (اختیاری)</button></div>`;
}

function openQuickLog(){
  const c=K.getActiveChild(), l=latestLog(c)||{};
  modal('ثبت سریع امروز',`<div class="field"><label>مجموع خواب ۲۴ ساعت (ساعت)</label><input id="ql_sleep" type="number" step="0.1" value="${l.sleepHours??''}"></div><div class="field"><label>تعداد وعده‌های اصلی</label><input id="ql_meals" type="number" step="1" value="${l.meals??''}"></div><div class="field"><label>آب/مایعات ثبت‌شده (ml) — اختیاری</label><input id="ql_water" type="number" value="${l.waterMl??''}"></div><div class="field"><label>یک علامت یا نگرانی امروز</label><input id="ql_symptoms" value="${K.esc(l.symptoms||'')}" placeholder="مثلاً اسهال، استفراغ، بی‌اشتهایی، خواب نامناسب..."></div><button class="btn block" onclick="KUI.saveQuickLog()">ذخیره امروز</button>`);
}
function saveQuickLog(){
  const c=K.getActiveChild(), d=K.todayISO(), logs=Object.assign({},c.dailyLogs||{});
  logs[d]={sleepHours:$('#ql_sleep').value?Number($('#ql_sleep').value):null,meals:$('#ql_meals').value?Number($('#ql_meals').value):null,waterMl:$('#ql_water').value?Number($('#ql_water').value):null,symptoms:$('#ql_symptoms').value.trim()};
  K.updateChild(c.id,{dailyLogs:logs}); K.addEvent(c.id,'daily','ثبت اطلاعات روزانه'); closeModal(); toast('اطلاعات امروز ذخیره شد ✅'); route();
}

function screenVisit(child, visitId){
  const v = (K.DATA.visits||[]).find(x=>x.id===visitId);
  if(!v) return `<div class="empty">مراقبت پیدا نشد</div>`;
  const D = K.DATA.domains;
  const inList = (arr)=> Array.isArray(arr) && arr.includes(visitId);
  const rows = [];
  (D.alwaysEveryVisit||[]).forEach(d=> rows.push({key:'always_'+d.key, label:d.label}));
  if(inList(D.physicianExam.visits)) rows.push({key:'physicianExam', label:D.physicianExam.label});
  if(inList(D.dentistExam.visits)) rows.push({key:'dentistExam', label:D.dentistExam.label, note:D.dentistExam.note});
  if(inList(D.oralHealthAssessment.visits)) rows.push({key:'oralHealthAssessment', label:D.oralHealthAssessment.label});
  if(inList(D.fingerToothbrush.visits)) rows.push({key:'fingerToothbrush', label:D.fingerToothbrush.label});
  if(inList(D.fluorideVarnish.visits)) rows.push({key:'fluorideVarnish', label:D.fluorideVarnish.label});
  if(inList(D.vitaminAD.visits)) rows.push({key:'vitaminAD', label:D.vitaminAD.label});
  if(inList(D.iron.visits)) rows.push({key:'iron', label:D.iron.label});
  if(inList(D.motherFertility.visits)) rows.push({key:'motherFertility', label:D.motherFertility.label});
  Object.entries(D.screenings||{}).forEach(([k,s])=>{ if(inList(s.visits)) rows.push({key:'scr_'+k, label:s.label, note:s.note}); });
  const guidance = [];
  Object.entries(D.parentGuidance||{}).forEach(([k,s])=>{ if(inList(s.visits)) guidance.push({key:'pg_'+k, label:s.label, note:s.note}); });

  const saved = (child.visitsDone && child.visitsDone[visitId]) || {tasks:{}};
  const checkedCount = Object.values(saved.tasks||{}).filter(Boolean).length;

  return `
  <div class="card">
    <button class="btn ghost sm" onclick="KUI.go('/home')">‹ بازگشت</button>
    <h3 style="margin-top:10px">مراقبت ${esc(v.label)}</h3>
    ${v.note?`<div class="small muted">${esc(v.note)}</div>`:''}
    ${saved.date ? `<div class="notice green">این مراقبت در تاریخ ${K.faDate(saved.date)} ثبت شده است.</div>` : ''}
    <div class="progress" style="margin:10px 0"><div style="width:${rows.length? Math.round(checkedCount/rows.length*100):0}%"></div></div>
  </div>

  <div class="card">
    <h3>موارد ارزیابی این مراقبت <small>(طبق فصل ۱ بوکلت)</small></h3>
    ${rows.map(r=>`<label class="check-item">
      <input type="checkbox" ${saved.tasks && saved.tasks[r.key]?'checked':''} onchange="KUI.toggleVisitTask('${visitId}','${r.key}', this.checked)">
      <span class="txt"><b>${esc(r.label)}</b>${r.note?`<small>${esc(r.note)}</small>`:''}</span>
    </label>`).join('') || '<p class="muted small">موردی ثبت نشده</p>'}
  </div>

  ${guidance.length? `<div class="card">
    <h3>موضوعات مشاوره با مادر/والدین</h3>
    ${guidance.map(g=>`<div class="list-item"><span>${esc(g.label)}</span></div>`).join('')}
  </div>`:''}

  <div class="card">
    <button class="btn block" onclick="KUI.completeVisit('${visitId}')">ثبت این مراقبت به‌عنوان انجام‌شده</button>
    <button class="btn ghost block" style="margin-top:8px" onclick="KUI.go('/danger')">بررسی نشانه‌های خطر برای این مراجعه</button>
  </div>`;
}
function toggleVisitTask(visitId, key, checked){
  const child = K.getActiveChild();
  const vd = Object.assign({}, child.visitsDone||{});
  vd[visitId] = vd[visitId] || {tasks:{}};
  vd[visitId].tasks = Object.assign({}, vd[visitId].tasks||{}, {[key]: checked});
  K.updateChild(child.id, {visitsDone: vd});
}
function completeVisit(visitId){
  const child = K.getActiveChild();
  const vd = Object.assign({}, child.visitsDone||{});
  vd[visitId] = Object.assign({}, vd[visitId]||{tasks:{}}, {date: K.todayISO()});
  K.updateChild(child.id, {visitsDone: vd});
  K.addEvent(child.id, 'visit', 'مراقبت ثبت شد: ' + ((K.DATA.visits||[]).find(v=>v.id===visitId)||{}).label);
  toast('ثبت شد ✅');
  go('/home');
}

/* ---------------- growth ---------------- */
const WHO_CHARTS={
  wfa:{f:'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/cht-wfa-girls-z-0-5.pdf?sfvrsn=e113a2fa_10',m:'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/cht-wfa-boys-z-0-5.pdf?sfvrsn=9d3adc06_12',title:'وزن برای سن'},
  hfa:{f:'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/length-height-for-age/cht-lhfa-girls-z-0-5.pdf?sfvrsn=252d03a5_14',m:'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/length-height-for-age/cht-lhfa-boys-z-0-5.pdf?sfvrsn=a839cd27_10',title:'قد/طول برای سن'},
  wfh:{f:'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-length-height/cht-wflh-girls-z-0-5.pdf?sfvrsn=7abd186d_9',m:'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-length-height/cht-wflh-boys-z-0-5.pdf?sfvrsn=6bcd4d28_11',title:'وزن برای قد/طول'},
  hcfa:{f:'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/head-circumference-for-age/cht_hcfa_girls_z_0_5.pdf?sfvrsn=1809418c_10',m:'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/head-circumference-for-age/cht_hcfa_boys_z_0_5.pdf?sfvrsn=bd5f23aa_7',title:'دور سر برای سن'}
};
function chartPoint(type,child,m){
  if(!m) return '';
  const age=K.ageInfo(child).totalDays/30.4375, sex=child.gender==='m'?'m':'f';
  let left,top;
  if(type==='wfa'){ if(m.weightKg==null)return ''; left=12.4+(Math.min(60,age)/60)*70.2; top=85.2-((Math.max(1,Math.min(30,m.weightKg))-1)/29)*64.8; }
  if(type==='hfa'){ if(m.heightCm==null)return ''; left=12.4+(Math.min(60,age)/60)*70.2; top=85.2-((Math.max(45,Math.min(125,m.heightCm))-45)/80)*64.8; }
  if(type==='hcfa'){ if(m.headCm==null)return ''; left=12.4+(Math.min(60,age)/60)*70.2; top=85.2-((Math.max(30,Math.min(54,m.headCm))-30)/24)*64.8; }
  if(type==='wfh'){ if(m.weightKg==null||m.heightCm==null)return ''; left=12.4+((Math.max(45,Math.min(120,m.heightCm))-45)/75)*70.2; top=85.2-((Math.max(1,Math.min(34,m.weightKg))-1)/33)*64.8; }
  return `<span class="chart-point" title="نقطه اندازه‌گیری کودک" style="left:${left}%;top:${top}%"></span>`;
}
function growthChartCard(type,child,m){ const c=WHO_CHARTS[type], src=child.gender==='m'?c.m:c.f; return `<div class="card"><div class="section-title"><h3>${c.title}</h3><span>WHO z-score</span></div><div class="mini-chart" style="height:310px"><iframe src="${src}" title="${c.title} — WHO Child Growth Standards" style="width:100%;height:100%;border:0"></iframe>${chartPoint(type,child,m)}</div><div class="chart-caption">نقطه قرمز در صورت نمایش، جای تقریبی آخرین اندازه‌گیری کودک را نشان می‌دهد. چارت داخل برنامه مستقیماً از نمودار رسمی WHO باز می‌شود؛ برای طبقه‌بندی رسمی، روند رشد و Z-score ثبت‌شده در مرکز بهداشت/پزشک ملاک است.</div></div>`; }
function screenGrowth(child){
  const ms=(child.measurements||[]).slice().sort((a,b)=>a.date<b.date?-1:1), m=K.latestMeasurement(child), flags=K.trendFlags(child);
  return `<div class="card"><h3>📏 رشد واقعی کودک</h3><p class="small muted">فقط سه عدد ساده وارد کنید: وزن، قد/طول و دور سر. بعد برنامه آن‌ها را روی چهار چارت استاندارد نشان می‌دهد.</p><div class="grid3"><div class="field"><label>وزن (kg)</label><input id="gf_w" type="number" step="0.01"></div><div class="field"><label>قد/طول (cm)</label><input id="gf_h" type="number" step="0.1"></div><div class="field"><label>دور سر (cm)</label><input id="gf_hc" type="number" step="0.1"></div></div><div class="field"><label>تاریخ اندازه‌گیری</label><input id="gf_date" type="date" value="${K.todayISO()}"></div><button class="btn block" onclick="KUI.addMeasurement()">ثبت اندازه‌گیری</button></div>
  <div class="card"><h3>وضعیت فعلی</h3>${m?`<div class="pillbar"><span class="pill">وزن ${m.weightKg!=null?K.fa(m.weightKg)+' kg':'—'}</span><span class="pill">قد ${m.heightCm!=null?K.fa(m.heightCm)+' cm':'—'}</span><span class="pill">دور سر ${m.headCm!=null?K.fa(m.headCm)+' cm':'—'}</span></div>`:'<div class="notice orange">هنوز اندازه‌گیری نداریم.</div>'}${flags.map(f=>`<div class="notice orange">${esc(f)} — بهتر است با مرکز بهداشت/پزشک بررسی شود.</div>`).join('')}</div>
  ${growthChartCard('wfa',child,m)}${growthChartCard('hfa',child,m)}${growthChartCard('wfh',child,m)}${growthChartCard('hcfa',child,m)}
  <div class="card"><h3>چرا چهار نمودار؟</h3><p style="line-height:2;font-size:13px">بوکلت تأکید می‌کند برای تفسیر کامل رشد، وزن برای سن، قد برای سن و وزن برای قد بررسی شوند و دور سر نیز تا ۲ سالگی پایش شود. یک عدد منفرد به‌تنهایی کافی نیست.</p><a class="link" href="https://www.who.int/tools/child-growth-standards" target="_blank">منبع رسمی نمودارهای رشد WHO</a></div>
  <div class="card"><h3>تاریخچه اندازه‌گیری‌ها</h3>${ms.length?`<table class="simple"><tr><th>تاریخ</th><th>وزن</th><th>قد</th><th>دورسر</th><th></th></tr>${ms.slice().reverse().map(x=>`<tr><td>${K.faDateShort(x.date)}</td><td>${x.weightKg??'—'}</td><td>${x.heightCm??'—'}</td><td>${x.headCm??'—'}</td><td><span class="linklike small" onclick="KUI.deleteMeasurement('${x.id}')">حذف</span></td></tr>`).join('')}</table>`:'<div class="empty">هنوز داده‌ای ثبت نشده</div>'}</div>`;
}
function addMeasurement(){ const c=K.getActiveChild(),date=$('#gf_date').value||K.todayISO(),w=$('#gf_w').value?Number($('#gf_w').value):null,h=$('#gf_h').value?Number($('#gf_h').value):null,hc=$('#gf_hc').value?Number($('#gf_hc').value):null;if(w==null&&h==null&&hc==null){toast('حداقل یک مقدار وارد کنید');return;}const ms=(c.measurements||[]).concat([{id:K.uid(),date,weightKg:w,heightCm:h,headCm:hc}]);K.updateChild(c.id,{measurements:ms});K.addEvent(c.id,'measurement','اندازه‌گیری رشد ثبت شد');toast('اندازه‌گیری ذخیره شد ✅');route();}
function deleteMeasurement(id){const c=K.getActiveChild();K.updateChild(c.id,{measurements:(c.measurements||[]).filter(m=>m.id!==id)});route();}
function drawGrowthChart(){ }

/* ---------------- vaccines ---------------- */
function screenVaccines(child){
  const V=K.DATA.vaccines||{},given=child.vaccinesGiven||{};
  return `<div class="card"><h3>💉 تقویم واکسیناسیون به‌روز</h3><p class="small muted">${esc(V.note||'')}</p><div class="notice blue">نوبت بعدی را صفحه «امروز» هم به شما نشان می‌دهد. اگر کارت واکسن با این جدول تفاوت دارد، کارت و دستور مرکز بهداشت محل را ملاک قرار دهید.</div></div>${(V.schedule||[]).map((row,ri)=>{const due=K.addMonths(child.birthDate,row.ageMonths);return `<div class="card"><div class="row between"><h3 style="margin:0">${esc(row.age)}</h3>${row.conditional?'<span class="badge orange">شرطی</span>':formatDueBadge(due)}</div><p class="small muted">موعد تقویمی: ${K.faDate(due)}</p>${(row.items||[]).map((it,ii)=>{const key=row.id+'-'+ii;const oldKey=ri+'-'+ii;const g=given[key]||given[oldKey];return `<label class="check-item"><input type="checkbox" ${g?'checked':''} onchange="KUI.toggleVaccine('${key}',this.checked,'${esc(row.age)} — ${esc(it)}')"><span class="txt"><b>${esc(it)}</b>${g?`<small>ثبت‌شده: ${K.faDateShort(g)}</small>`:''}</span></label>`}).join('')}${row.note?`<div class="notice orange">${esc(row.note)}</div>`:''}</div>`}).join('')}<div class="card"><h3>نکات مهم</h3>${(V.specialNotes||[]).map(n=>`<div class="notice blue">${esc(n)}</div>`).join('')}</div>`;
}
function toggleVaccine(key,checked,label){const c=K.getActiveChild(),g=Object.assign({},c.vaccinesGiven||{});if(checked)g[key]=K.todayISO();else delete g[key];K.updateChild(c.id,{vaccinesGiven:g});if(checked)K.addEvent(c.id,'vaccine','ثبت واکسن: '+label);route();}

/* ---------------- supplements ---------------- */
function screenSupplements(child){
  const S=K.DATA.supplements||{},p=S.profiles?.[K.birthWeightProfile(child.birthWeightGrams)]||{}; const age=K.ageInfo(child);
  const special=child.profileFlags||{};
  return `<div class="card"><h3>💊 مکمل اختصاصی ${esc(child.name||'کودک')}</h3><div class="notice blue">${esc(p.label||'پروفایل تولد ثبت نشده')}</div><p class="small muted">این صفحه بر اساس فصل ۱۹ بوکلت ساخته شده؛ مقدار نهایی مکمل باید با وزن و وضعیت کودک و دستور مرکز بهداشت تطبیق داده شود.</p></div><div class="card"><h3>ویتامین A+D</h3><p style="line-height:2">${esc(p.vitaminAD||'اطلاعات پروفایل موجود نیست.')}</p></div><div class="card"><h3>آهن</h3><p style="line-height:2">${esc(p.iron||'اطلاعات پروفایل موجود نیست.')}</p>${p.otherSupplements?`<div class="notice orange">${esc(p.otherSupplements)}</div>`:''}</div><div class="card"><h3>بر اساس سن امروز</h3><p>سن کودک: <b>${age.label}</b></p>${age.totalMonths<6?'<div class="notice green">برای کودک ترم، آهن روتین هنوز شروع نشده؛ در نارس/وزن تولد پایین زمان شروع متفاوت است.</div>':age.totalMonths<=24?'<div class="notice blue">در گروه سنی زیر ۲ سال، مصرف صحیح و منظم مکمل‌ها بخشی از مراقبت روتین است.</div>':'<div class="notice orange">بعد از ۲ سالگی، آهن را خودسرانه ادامه ندهید مگر پزشک/مرکز بهداشت توصیه کند.</div>'}</div><div class="card"><h3>وضعیت‌های خاص ثبت‌شده</h3><div class="pillbar">${special.digestive?'<span class="pill warn">مشکل گوارشی</span>':''}${special.allergy?'<span class="pill warn">حساسیت غذایی</span>':''}${special.lowWeight?'<span class="pill warn">کم‌وزن/لاغر</span>':''}${special.overweight?'<span class="pill warn">اضافه‌وزن/چاقی</span>':''}${!Object.values(special).some(Boolean)?'<span class="pill">مورد خاص ثبت نشده</span>':''}</div><p class="small muted">این موارد در پرونده برای شخصی‌سازی توصیه‌ها استفاده می‌شوند.</p></div>`;
}

/* ---------------- danger sign checker ---------------- */
function screenDanger(child){const age=K.ageInfo(child),under2m=age.days<60,D=K.DATA.dangerSigns||{},set=under2m?D.under2months:D.from2mTo5y;return `<div class="card"><h3>🚨 بررسی علائم خطر</h3><p class="small muted">گروه سنی: <b>${under2m?'کمتر از ۲ ماه':'۲ ماه تا ۵ سال'}</b>. این ابزار جایگزین معاینه نیست.</p><div class="notice red">اگر کودک نمی‌تواند بنوشد/شیر بخورد، تشنج دارد، سطح هوشیاری پایین آمده یا مشکل واضح تنفسی دارد، منتظر نتیجه اپ نمانید و برای ارزیابی فوری اقدام کنید.</div></div><div class="card"><h3>سؤال‌های مهم</h3>${(set.ask||[]).map((q,i)=>`<label class="check-item"><input type="checkbox" id="da_${i}"><span class="txt">${esc(q)}</span></label>`).join('')}</div><div class="card"><h3>چه چیزهایی را ببینم؟</h3>${(set.observe||[]).map((q,i)=>`<label class="check-item"><input type="checkbox" id="do_${i}"><span class="txt">${esc(q)}</span></label>`).join('')}</div><div class="card"><button class="btn danger block" onclick="KUI.evalDanger(${under2m})">نتیجه را ببین</button><div id="dangerResult"></div></div>`;}
function evalDanger(under2m){const D=K.DATA.dangerSigns||{},set=under2m?D.under2months:D.from2mTo5y;const any=[...(set.ask||[]),...(set.observe||[])].some((_,i)=>{const id=i<(set.ask||[]).length?'da_'+i:'do_'+(i-(set.ask||[]).length);return document.getElementById(id)?.checked});const result=any?(set.classify||[]).find(c=>c.color==='red'):(set.classify||[]).find(c=>c.color==='green');const box=document.getElementById('dangerResult');if(!result){box.innerHTML='<div class="notice orange">اطلاعات کافی برای طبقه‌بندی وجود ندارد.</div>';return;}box.innerHTML=`<div class="notice ${result.color}"><b>${esc(result.label)}</b><br>${(result.advice||[]).map(esc).join('؛ ')}</div>${result.color==='red'?'<div class="notice red">🚑 مراجعه فوری را عقب نیندازید.</div>':''}`;if(result.color==='red')K.addEvent(K.getActiveChild().id,'danger','بررسی علائم خطر: '+result.label);}

/* ---------------- library ---------------- */
function screenLibrary(){
  const chs = K.DATA.chapters||[];
  return `
  <div class="card">
    <h3>کتابخانه بوکلت رسمی</h3>
    <p class="small muted">${esc((K.DATA.meta||{}).source_title||'')} — ${esc((K.DATA.meta||{}).publisher||'')} (${esc((K.DATA.meta||{}).edition_year||'')})</p>
    <input id="libSearch" placeholder="جست‌وجو در متن بوکلت..." oninput="KUI.filterLibrary(this.value)">
  </div>
  <div class="card" id="libList">
    ${chs.map(c=>`<div class="list-item" style="cursor:pointer" onclick="KUI.go('/library/${c.id}')">
      <div><b>فصل ${K.fa(c.id)}</b> — ${esc(c.title)}</div><span class="small muted">ص ${esc(c.pages)}</span>
    </div>`).join('')}
  </div>`;
}
function filterLibrary(q){
  q = (q||'').trim();
  const chs = K.DATA.chapters||[];
  const list = document.getElementById('libList');
  if(!q){ list.innerHTML = chs.map(c=>`<div class="list-item" style="cursor:pointer" onclick="KUI.go('/library/${c.id}')">
      <div><b>فصل ${K.fa(c.id)}</b> — ${esc(c.title)}</div><span class="small muted">ص ${esc(c.pages)}</span></div>`).join(''); return; }
  const filtered = chs.filter(c=> c.title.includes(q) || c.text.includes(q));
  list.innerHTML = filtered.length? filtered.map(c=>`<div class="list-item" style="cursor:pointer" onclick="KUI.go('/library/${c.id}')">
      <div><b>فصل ${K.fa(c.id)}</b> — ${esc(c.title)}</div></div>`).join('') : '<div class="empty">نتیجه‌ای یافت نشد</div>';
}
function screenChapter(id){
  const c = (K.DATA.chapters||[]).find(x=>String(x.id)===String(id));
  if(!c) return '<div class="empty">فصل پیدا نشد</div>';
  return `<div class="card">
    <button class="btn ghost sm" onclick="KUI.go('/library')">‹ فهرست فصل‌ها</button>
    <h3 style="margin-top:10px">فصل ${K.fa(c.id)} — ${esc(c.title)}</h3>
    <div class="small muted">صفحات ${esc(c.pages)} بوکلت رسمی</div>
    <hr class="sep">
    <div class="chapter-text">${esc(c.text)}</div>
  </div>`;
}

/* ---------------- records ---------------- */
function screenRecords(child){
  const evs = (child.events||[]).slice(0,60);
  const bp = K.birthWeightProfile(child.birthWeightGrams);
  return `
  <div class="card">
    <h3>پروفایل کودک</h3>
    <div class="field"><label>نام</label><input id="rf_name" value="${K.esc(child.name)}"></div>
    <div class="grid2">
      <div class="field"><label>جنسیت</label><select id="rf_gender"><option value="f" ${child.gender==='f'?'selected':''}>دختر</option><option value="m" ${child.gender==='m'?'selected':''}>پسر</option></select></div>
      <div class="field"><label>تاریخ تولد</label><input id="rf_bdate" type="date" value="${child.birthDate}"></div>
    </div>
    <div class="grid2">
      <div class="field"><label>وزن تولد (گرم)</label><input id="rf_bw" type="number" value="${child.birthWeightGrams}"></div>
      <div class="field"><label>سن حاملگی (هفته)</label><input id="rf_ga" type="number" value="${child.gestationalWeeks}"></div>
    </div>
    <div class="field"><label>وضعیت‌های خاص (برای شخصی‌سازی)</label><div class="pillbar"><label class="pill"><input id="rf_digestive" type="checkbox" ${child.profileFlags?.digestive?'checked':''}> مشکل گوارشی</label><label class="pill"><input id="rf_allergy" type="checkbox" ${child.profileFlags?.allergy?'checked':''}> حساسیت غذایی</label><label class="pill"><input id="rf_low" type="checkbox" ${child.profileFlags?.lowWeight?'checked':''}> کم‌وزن/لاغر</label><label class="pill"><input id="rf_over" type="checkbox" ${child.profileFlags?.overweight?'checked':''}> اضافه‌وزن/چاقی</label></div></div>
    <button class="btn block" onclick="KUI.saveProfile()">ذخیره تغییرات</button>
  </div>

  <div class="card">
    <h3>خط زمانی</h3>
    ${evs.length? evs.map(e=>`<div class="list-item"><div>${esc(e.title)}</div><span class="small muted">${K.faDateShort(e.date)}</span></div>`).join('') : `<div class="empty">رویدادی ثبت نشده</div>`}
  </div>

  <div class="card">
    <h3>پشتیبان‌گیری</h3>
    <div class="row wrap" style="gap:8px">
      <button class="btn light" onclick="KUI.exportData()">خروجی JSON همه کودکان</button>
      <button class="btn light" onclick="document.getElementById('importFile').click()">ورود از فایل JSON</button>
      <input type="file" id="importFile" accept="application/json" style="display:none" onchange="KUI.importData(this.files[0])">
    </div>
  </div>

  <div class="card">
    <h3>مدیریت کودکان</h3>
    ${K.loadChildren().map(c=>`<div class="list-item"><span>${esc(c.name)} ${c.id===child.id?'<span class="badge blue">فعال</span>':''}</span>
      <span class="row" style="gap:6px">
        ${c.id!==child.id? `<button class="btn sm light" onclick="KUI.switchChild('${c.id}')">انتخاب</button>`:''}
        <button class="btn sm danger" onclick="KUI.deleteChild('${c.id}')">حذف</button>
      </span></div>`).join('')}
    <button class="btn ghost block" style="margin-top:10px" onclick="KUI.go('/new')">+ افزودن کودک جدید</button>
  </div>`;
}
function saveProfile(){
  const child = K.getActiveChild();
  K.updateChild(child.id, {
    name: $('#rf_name').value.trim()||'کودک من',
    gender: $('#rf_gender').value,
    birthDate: $('#rf_bdate').value,
    birthWeightGrams: Number($('#rf_bw').value)||3000,
    gestationalWeeks: Number($('#rf_ga').value)||39,
    profileFlags: {digestive:$('#rf_digestive')?.checked||false, allergy:$('#rf_allergy')?.checked||false, lowWeight:$('#rf_low')?.checked||false, overweight:$('#rf_over')?.checked||false}
  });
  toast('ذخیره شد ✅'); route();
}
function deleteChild(id){
  modal('حذف پرونده کودک', `<p>این عمل غیرقابل بازگشت است. آیا مطمئن هستید؟</p>
    <button class="btn danger block" onclick="KUI.confirmDeleteChild('${id}')">بله، حذف شود</button>
    <button class="btn ghost block" style="margin-top:8px" onclick="KUI.closeModal()">انصراف</button>`);
}
function confirmDeleteChild(id){
  let list = K.loadChildren().filter(c=>c.id!==id);
  K.saveChildren(list);
  if(K.getActiveId()===id){ K.setActiveId(list[0]? list[0].id : ''); }
  closeModal();
  go(list.length? '/home' : '/new');
}
function exportData(){
  const blob = new Blob([JSON.stringify({children:K.loadChildren(), exportedAt:new Date().toISOString()}, null, 1)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'koodak-man-backup-'+K.todayISO()+'.json';
  document.body.appendChild(a); a.click(); a.remove();
}
function importData(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(reader.result);
      if(!data.children || !Array.isArray(data.children)) throw new Error('فرمت نامعتبر');
      const existing = K.loadChildren();
      const merged = existing.concat(data.children.filter(nc=>!existing.some(ec=>ec.id===nc.id)));
      K.saveChildren(merged);
      if(!K.getActiveId() && merged[0]) K.setActiveId(merged[0].id);
      toast('بازیابی انجام شد ✅'); route();
    }catch(e){ toast('فایل نامعتبر است'); }
  };
  reader.readAsText(file);
}

function screenSettings(){
  const m = K.DATA.meta||{};
  return `<div class="card">
    <h3>درباره برنامه</h3>
    <p class="small">نسخه ۲۰ — بازسازی‌شده با معماری واحد و داده‌محور.</p>
    <p class="small"><b>منبع محتوای مراقبتی:</b> ${esc(m.source_title)}<br>${esc(m.publisher)} — ${esc(m.edition_year)}</p>
    <p class="small muted">${esc(m.note)}</p>
    <p class="small"><a class="link" href="${esc(m.official_url)}" target="_blank">لینک فایل رسمی PDF</a></p>
  </div>`;
}

/* expose */
window.KUI = { go, route, switchChild, createChild, toggleVisitTask, completeVisit, addMeasurement,
  deleteMeasurement, toggleVaccine, evalDanger, filterLibrary, saveProfile, deleteChild, confirmDeleteChild,
  exportData, importData, closeModal, openQuickLog, saveQuickLog };
window.addEventListener('hashchange', route);
})();
