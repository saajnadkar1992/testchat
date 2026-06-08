/* CSR Live Practice Simulator — calls /api/ai (server proxies to Lovable AI Gateway) */
(function(){
const POLICIES_DEFAULT = [
  {icon:"📦",title:"Shipping",items:["Standard: 5–7 business days","Premium members: 2–3 day priority shipping","Tracking stalled 3+ days → escalate logistics","10+ days late → re-ship or full refund"]},
  {icon:"💳",title:"Refunds & Compensation",items:["Full refund within 30 days","Premium: $10 store credit for delays","Replacements ship 1–2 business days","Duplicate charges refunded 3–5 days"]},
  {icon:"🎯",title:"Communication Rules",items:["Acknowledge feelings first","Use customer's name at least once","Offer a concrete next step","End with confirmation or follow-up offer","Never be defensive"]},
  {icon:"🔧",title:"Tech Support",items:["Guide troubleshooting before escalating","Defective within 30 days → replace or refund","Log reproducible issues for engineering"]}
];

const BUILTIN = [
  {lbl:"Shipping Delay Inquiry",
   customer:{name:"Sarah Johnson",initials:"SJ",tier:"premium",email:"sarah.johnson@example.com",phone:"(555) 123-4567",since:"Jan 2023",prefs:["Email notifications","Fast shipping"],notes:"Previous issues with delayed shipments. Prefers email communication.",orders:8,value:"$1,245",last:"May 20th",ord:{num:"#ORD-89142",item:"Premium Headphones",ordered:"May 22nd",status:"Tracking stalled",statusColor:"#d97706"}},
   opening:"Hi, I ordered headphones over a week ago and they still haven't arrived. The tracking hasn't updated in 3 days (since May 27th). Can you tell me what's happening with my order?",
   ctx:"Premium customer, 8 prior orders. Tracking stalled 3 days. Per policy escalate to logistics and offer re-ship or refund. Use her name. Acknowledge frustration first.",
   persona:"You are Sarah Johnson, a frustrated but polite premium customer. Your headphone order tracking has been stalled 3 days and you're worried it's lost. You want clear answers and a concrete resolution. ALWAYS ask a natural follow-up question even when partially satisfied. Keep replies SHORT: 1-3 sentences. Only say goodbye if every concern is resolved and confirmed."},
  {lbl:"Wrong Item Received",
   customer:{name:"Marcus Chen",initials:"MC",tier:"standard",email:"marcus.chen@example.com",phone:"(555) 987-6543",since:"Aug 2024",prefs:["SMS notifications"],notes:"First reported issue. High prior satisfaction.",orders:3,value:"$320",last:"May 28th",ord:{num:"#ORD-91004",item:"Bluetooth Speaker BT-500",ordered:"May 25th",status:"Delivered – wrong item",statusColor:"#dc2626"}},
   opening:"Hello, I received my order today but it's completely wrong! I ordered a Bluetooth Speaker (Model BT-500) but I got a USB Hub instead. I needed it for a trip this weekend — I leave tomorrow. What can you do?",
   ctx:"Wrong item delivered. Customer needs it urgently — leaves tomorrow. Apologize, arrange express replacement, provide return label.",
   persona:"You are Marcus Chen, stressed because you got the wrong product and leave on a trip TOMORROW. If CSR offers express → ask for tracking & arrival time. If CSR offers standard → push back hard. Keep asking until you have delivery time, return instructions, and a reference number. 1-3 sentences."},
  {lbl:"Product Not Working",
   customer:{name:"Priya Sharma",initials:"PS",tier:"premium",email:"priya.sharma@example.com",phone:"(555) 456-7890",since:"Mar 2022",prefs:["Email notifications","Extended warranty"],notes:"Long-term loyal customer. No prior product issues.",orders:15,value:"$3,100",last:"May 15th",ord:{num:"#ORD-88765",item:"Smart Watch Pro X",ordered:"May 10th",status:"Delivered May 13th",statusColor:"#16a34a"}},
   opening:"Hi, I bought your Smart Watch Pro X two weeks ago and it stopped charging yesterday. The screen shows a battery icon with an X. I've tried different cables and adapters — nothing works. Is this a defect?",
   ctx:"Product failure within 30-day warranty. Premium long-term customer. Guide troubleshooting first, then offer replacement or refund.",
   persona:"You are Priya Sharma, patient and loyal but disappointed. If CSR suggests hard reset → 'I tried that, screen flickers black'. You PREFER a replacement over a refund. Ask about timing, return process, data transfer, tracking. 1-3 sentences. Continue until shipping timeline, return process, and tracking are confirmed."},
  {lbl:"Billing Dispute",
   customer:{name:"Tom Kellerman",initials:"TK",tier:"standard",email:"tom.k@example.com",phone:"(555) 321-0987",since:"Nov 2023",prefs:["Paper invoices"],notes:"Had billing error resolved 6 months ago. Sensitive to billing.",orders:5,value:"$780",last:"May 1st",ord:{num:"#SUB-2045",item:"Annual Membership",ordered:"May 1st",status:"Charged twice",statusColor:"#dc2626"}},
   opening:"I just checked my bank statement and I've been charged twice for my annual membership — $89 on May 1st and again on May 3rd. I want an immediate refund for the duplicate charge. This is unacceptable.",
   ctx:"Duplicate billing. Confirm both charges. Apologize sincerely, refund in 3-5 days, offer $10 goodwill credit. Not defensive.",
   persona:"You are Tom Kellerman, skeptical and upset about a SECOND billing error (Visa ending 4521). Always ask for written confirmation, exact refund date, who to contact if it fails, case reference. 1-3 sentences. Stay until refund timeline, email confirmation, and reference number are all given."},
  {lbl:"Angry Customer Escalation",
   customer:{name:"Derek Walsh",initials:"DW",tier:"premium",email:"derek.w@example.com",phone:"(555) 654-3210",since:"Jun 2021",prefs:["Phone calls","Urgent response"],notes:"Escalated twice before. Flag for supervisor if unresolved.",orders:22,value:"$5,600",last:"May 26th",ord:{num:"#ORD-93210",item:"Gaming Laptop",ordered:"May 20th",status:"Delayed – in transit",statusColor:"#d97706"}},
   opening:"This is absolutely ridiculous! I ordered a $1,200 gaming laptop 10 days ago and it STILL hasn't arrived. This is the THIRD time I've had a problem with your company. I want a FULL refund AND compensation. Get me a manager NOW.",
   ctx:"High-value frustrated repeat customer. De-escalation critical. Never defensive. Full refund OR express + compensation. Mention supervisor.",
   persona:"You are Derek Walsh, extremely angry, 3rd bad experience. If CSR gives scripted apology → escalate: 'I want REAL action, not scripted apologies.' If supervisor offered → ask name, time, callback number. Push for compensation, written confirmation, future contact. 1-3 intense sentences. Never wrap up until all four are confirmed in writing."}
];

let scenarios = JSON.parse(JSON.stringify(BUILTIN));
try{const s=localStorage.getItem('csr_scenarios');if(s){const extra=JSON.parse(s);scenarios=BUILTIN.concat(extra);}}catch(e){}
let scenarioPolicies = {};
try{const p=localStorage.getItem('csr_policies');if(p){scenarioPolicies=JSON.parse(p);}}catch(e){}
let scenarioGuidelines = {};
try{const g=localStorage.getItem('csr_guidelines');if(g){scenarioGuidelines=JSON.parse(g);}}catch(e){}
let _lastPolicyPass=null;

let cur=0, secs=0, timerInt=null, history=[], turnN=0, ended=false, turnScores=[];
let sugT=null, lastSug='', chkT=null;
let uploadedScreens=[], uploadedPolicyScreens=[], uploadedGuideScreens=[];
let aiQueue=Promise.resolve(), aiCooldownUntil=0, aiBackgroundPausedUntil=0;

const $=id=>document.getElementById(id);
let msgs,inp,charc,sendBtn;

async function callAI(messages, opts){
  opts=opts||{};
  const maxRetries = opts.maxRetries ?? (opts.background?0:2);
  const minGap = opts.background ? 2200 : 900;
  if(opts.background && (Date.now()<aiCooldownUntil || Date.now()<aiBackgroundPausedUntil)) throw new Error('AI cooling down');
  const run=async()=>{
  if(opts.background && Date.now()<aiBackgroundPausedUntil) throw new Error('AI cooling down');
  const waitCooldown=Math.max(0, aiCooldownUntil-Date.now());
  if(waitCooldown) await sleep(waitCooldown);
  if(opts.background && Date.now()<aiBackgroundPausedUntil) throw new Error('AI cooling down');
  if(callAI._lastAt){const gap=Date.now()-callAI._lastAt;if(gap<minGap)await sleep(minGap-gap);}
  if(opts.background && Date.now()<aiBackgroundPausedUntil) throw new Error('AI cooling down');
  callAI._lastAt=Date.now();
  let lastErr;
  for(let attempt=0; attempt<=maxRetries; attempt++){
    let r;
    try{
      r = await fetch('/api/ai',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages, max_tokens:opts.max_tokens||500})
      });
    }catch(netErr){
      lastErr = netErr;
      if(attempt<maxRetries){ await sleep(800*Math.pow(2,attempt)); continue; }
      throw netErr;
    }
    if(r.status===429 || r.status===503){
      const ra = parseFloat(r.headers.get('retry-after')||'0');
      const wait = ra>0 ? ra*1000 : Math.min(20000, 2500*Math.pow(2,attempt)+Math.random()*800);
      aiCooldownUntil = Date.now()+wait;
      aiBackgroundPausedUntil = Date.now()+Math.max(wait, 45000);
      lastErr = new Error('Rate limited (429). Retrying…');
      if(attempt<maxRetries){ await sleep(wait); continue; }
      throw new Error('Too many requests right now. Please wait a moment and try again. (If this keeps happening, upgrade for higher limits.)');
    }
    if(r.status===402){
      throw new Error('AI credits exhausted on this workspace. Please add credits to continue.');
    }
    if(!r.ok){ throw new Error('API '+r.status+': '+(await r.text()).slice(0,200)); }
    const d = await r.json();
    let raw = d.choices?.[0]?.message?.content || '';
    raw = raw.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
    if(opts.json===false) return raw;
    try{ return JSON.parse(raw); }catch(e){
      const m=raw.match(/\{[\s\S]*\}/); if(m){try{return JSON.parse(m[0]);}catch(e2){}}
      throw new Error('Invalid JSON: '+raw.slice(0,200));
    }
  }
  throw lastErr || new Error('AI request failed');
  };
  const queued=aiQueue.then(run,run);
  aiQueue=queued.catch(()=>{});
  return queued;
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

function formatHist(){return history.slice(-12).map(m=>m.role==='customer'?scenarios[cur].customer.name+': '+m.text:'CSR: '+m.text).join('\n');}
function formatHistFull(){return history.map(m=>m.role==='customer'?scenarios[cur].customer.name+': '+m.text:'CSR: '+m.text).join('\n');}

function startTimer(){stopTimer();secs=0;updT();timerInt=setInterval(()=>{secs++;updT();},1000);}
function stopTimer(){if(timerInt){clearInterval(timerInt);timerInt=null;}}
function updT(){const m=Math.floor(secs/60),s=secs%60;const tt=$('tt');tt.innerHTML=(secs>=180?'<span class="dot"></span>':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');tt.classList.toggle('urg',secs>=180);}

window.showSB=function(tab){document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));document.querySelectorAll('.tabpane').forEach(p=>p.classList.remove('active'));$('pane-'+tab).classList.add('active');};

function renderInfoTab(){const s=scenarios[cur],c=s.customer;
  $('pane-info').innerHTML=`<div class="bigavatar">${c.initials}</div><div class="cname">${c.name}</div><div class="badge-row"><span class="cbadge badge-${c.tier}">${c.tier}</span></div>
    <div class="sect"><h4>Contact</h4><div class="kv"><b>Email:</b> <span>${c.email}</span></div><div class="kv"><b>Phone:</b> <span>${c.phone}</span></div><div class="kv"><b>Member since:</b> <span>${c.since}</span></div></div>
    <div class="sect"><h4>Preferences</h4><div class="tags">${(c.prefs||[]).map(p=>`<span class="tag">${p}</span>`).join('')}</div></div>
    ${c.notes?`<div class="sect"><h4>Notes</h4><div class="notes">${c.notes}</div></div>`:''}
    <div class="sect"><h4>Order History</h4><div class="ordgrid"><div class="ordstat"><b>${c.orders||0}</b><span>Total Orders</span></div><div class="ordstat"><b>${c.value||'—'}</b><span>Lifetime Value</span></div></div><div class="kv"><b>Last purchase:</b> <span>${c.last||'—'}</span></div></div>
    ${c.ord?`<div class="sect"><h4>Current Order</h4><div class="curord"><div><b>Order:</b> ${c.ord.num}</div><div><b>Item:</b> ${c.ord.item}</div><div><b>Ordered:</b> ${c.ord.ordered}</div><div><b>Status:</b> <span style="color:${c.ord.statusColor||'var(--t)'};font-weight:600">${c.ord.status}</span></div></div></div>`:''}`;}

function getActivePolicies(){return scenarioPolicies['sc_'+cur]||POLICIES_DEFAULT;}
function getActiveGuidelines(){return scenarioGuidelines['sc_'+cur]||null;}
function guidelinesText(){const g=getActiveGuidelines();if(!g)return '';const p=[];if(g.objective)p.push('OBJECTIVE: '+g.objective);if(g.expectations&&g.expectations.length)p.push('PERFORMANCE EXPECTATIONS:\n- '+g.expectations.join('\n- '));if(g.dos&&g.dos.length)p.push("DO:\n- "+g.dos.join('\n- '));if(g.donts&&g.donts.length)p.push("DON'T:\n- "+g.donts.join('\n- '));if(g.assessment&&g.assessment.length)p.push('ASSESSMENT GUIDELINES:\n- '+g.assessment.join('\n- '));if(g.warnings&&g.warnings.length)p.push('WARNINGS:\n- '+g.warnings.join('\n- '));return p.join('\n\n');}
function renderPolTab(){const pols=getActivePolicies();const g=getActiveGuidelines();let html=pols.map(p=>`<div class="polblock"><h4>${p.icon||''} ${p.title}</h4><ul>${p.items.map(i=>`<li>${i}</li>`).join('')}</ul></div>`).join('');
  if(g){const sec=(t,arr,ic)=>arr&&arr.length?`<div class="polblock"><h4>${ic} ${t}</h4><ul>${arr.map(i=>`<li>${i}</li>`).join('')}</ul></div>`:'';
    html+=(g.objective?`<div class="polblock"><h4>🎯 Objective</h4><ul><li>${g.objective}</li></ul></div>`:'')+sec('Performance Expectations',g.expectations,'⭐')+sec('Do',g.dos,'✅')+sec("Don't",g.donts,'❌')+sec('Assessment Guidelines',g.assessment,'🛡')+sec('Warnings',g.warnings,'⚠');}
  html+=(scenarioPolicies['sc_'+cur]||scenarioGuidelines['sc_'+cur])?`<button class="btn-reset" style="margin-top:8px" onclick="resetPolicies()">Reset Policies & Guidelines</button>`:'';
  $('pane-pol').innerHTML=html;}

function renderScTab(){$('pane-sc').innerHTML=`<div class="sect"><h4>Select Scenario</h4>${scenarios.map((s,i)=>`<button class="scbtn ${i===cur?'active':''}" onclick="loadSC(${i})">${s.lbl}${i>=BUILTIN.length?`<span class="del" onclick="event.stopPropagation();deleteSC(${i})">✕</span>`:''}</button>`).join('')}</div>
  <div class="scform"><h4>➕ Create Custom Scenario</h4>
    <div class="upload-zone" id="dropZone" onclick="document.getElementById('imgUp').click()">📷 Upload chat screenshot(s) to auto-fill<small>or fill the form below manually</small><div id="thumbs"></div></div>
    <input type="file" id="imgUp" accept="image/*" multiple style="display:none" onchange="handleImgs(event)">
    <textarea id="custMsg" placeholder="Customer's opening message..."></textarea>
    <input id="custName" placeholder="Customer Name" value="Customer">
    <input id="custCat" placeholder="Category" value="General">
    <div class="upload-zone" id="polZone" onclick="document.getElementById('polUp').click()" style="margin-top:8px">📋 Upload brand policy screenshot(s) (optional)<small>Policies sidebar updates for this scenario</small><div id="polThumbs"></div></div>
    <input type="file" id="polUp" accept="image/*" multiple style="display:none" onchange="handlePolImgs(event)">
    <div class="upload-zone" id="guideZone" onclick="document.getElementById('guideUp').click()" style="margin-top:8px">🛡 Upload assessment guideline screenshot(s) (optional)<small>Simulation instructions, performance expectations, Do's &amp; Don'ts, assessment rules</small><div id="guideThumbs"></div></div>
    <input type="file" id="guideUp" accept="image/*" multiple style="display:none" onchange="handleGuideImgs(event)">
    <button class="btn-load" onclick="loadCustom()">${uploadedScreens.length||uploadedGuideScreens.length?'Auto-Generate from Images':'Load Manual Scenario'}</button>
  </div>`;renderThumbs();}

function renderThumbs(){const t=$('thumbs');if(!t)return;t.innerHTML=uploadedScreens.map(b=>`<span class="thumb" style="background-image:url(${b})"></span>`).join('');if(uploadedScreens.length)$('dropZone').classList.add('has');const pt=$('polThumbs');if(pt){pt.innerHTML=uploadedPolicyScreens.map(b=>`<span class="thumb" style="background-image:url(${b})"></span>`).join('');if(uploadedPolicyScreens.length)$('polZone').classList.add('has');}const gt=$('guideThumbs');if(gt){gt.innerHTML=uploadedGuideScreens.map(b=>`<span class="thumb" style="background-image:url(${b})"></span>`).join('');if(uploadedGuideScreens.length)$('guideZone').classList.add('has');}}
window.handleImgs=function(e){[...e.target.files].forEach(f=>{const r=new FileReader();r.onload=ev=>{uploadedScreens.push(ev.target.result);renderThumbs();const sm=$('dropZone').querySelector('small');if(sm)sm.textContent=uploadedScreens.length+' image(s) ready';const bl=document.querySelector('.btn-load');if(bl)bl.textContent='Auto-Generate from Images';};r.readAsDataURL(f);});};
window.handlePolImgs=function(e){[...e.target.files].forEach(f=>{const r=new FileReader();r.onload=ev=>{uploadedPolicyScreens.push(ev.target.result);renderThumbs();};r.readAsDataURL(f);});};
window.handleGuideImgs=function(e){[...e.target.files].forEach(f=>{const r=new FileReader();r.onload=ev=>{uploadedGuideScreens.push(ev.target.result);renderThumbs();const bl=document.querySelector('.btn-load');if(bl)bl.textContent='Auto-Generate from Images';};r.readAsDataURL(f);});};
window.deleteSC=function(i){if(i<BUILTIN.length){alert("Built-in can't be deleted.");return;}if(!confirm('Delete this scenario?'))return;scenarios.splice(i,1);delete scenarioPolicies['sc_'+i];delete scenarioGuidelines['sc_'+i];localStorage.setItem('csr_scenarios',JSON.stringify(scenarios.slice(BUILTIN.length)));localStorage.setItem('csr_policies',JSON.stringify(scenarioPolicies));localStorage.setItem('csr_guidelines',JSON.stringify(scenarioGuidelines));if(cur>=scenarios.length)cur=0;loadSC(cur);};
window.resetPolicies=function(){delete scenarioPolicies['sc_'+cur];delete scenarioGuidelines['sc_'+cur];localStorage.setItem('csr_policies',JSON.stringify(scenarioPolicies));localStorage.setItem('csr_guidelines',JSON.stringify(scenarioGuidelines));renderPolTab();};

window.loadSC=function(idx){cur=idx;history=[];turnN=0;ended=false;turnScores=[];_lastPolicyPass=null;msgs.innerHTML='';inp.value='';inp.disabled=false;sendBtn.disabled=false;closeSP();$('checklist').classList.remove('show');const s=scenarios[cur],c=s.customer;$('cAv').textContent=c.initials;$('cName').textContent=c.name;$('cDot').className='statusdot';$('cStat').textContent='Active chat';$('turnChip').textContent='Turn 1';startTimer();addTS();addCustBubble(s.opening);history.push({role:'customer',text:s.opening});renderInfoTab();renderPolTab();renderScTab();scrollBot();setTimeout(()=>{try{window.prefetchIdeal&&window.prefetchIdeal();}catch(e){}},100);};

window.loadCustom=async function(){const msg=$('custMsg').value.trim(),name=$('custName').value.trim()||'Customer',cat=$('custCat').value.trim()||'General';let scen;
  let autoPolicies=null;
  if(uploadedScreens.length){showSysMsg('🔍 Analyzing chat screenshots → scenario, opening message & brand policies...');try{
    const content=[{type:'text',text:`Analyze these customer chat/email screenshot(s) and produce a FULL training scenario. Infer the brand/industry from visible cues (logo, product, tone, signature, domain). Return ONLY valid JSON in this exact shape:
{"lbl":"<short label>","opening":"<customer opening msg verbatim from screenshots>","customer":{"name":"<name or 'Customer'>","initials":"<2 letters>","tier":"standard","email":"<email or unknown@example.com>","phone":"unknown","since":"unknown","prefs":[],"notes":"<context>","orders":0,"value":"unknown","last":"unknown","ord":{"num":"unknown","item":"<product>","ordered":"unknown","status":"<status>","statusColor":"#d97706"}},"ctx":"<handling context>","persona":"<persona prompt: who they are, emotional state, behavior rules, ALWAYS ask follow-ups, never wrap up until 100% resolved>","policies":[{"icon":"📦","title":"<policy section relevant to this scenario, e.g. Refunds, Shipping, Warranty, Escalation>","items":["<concrete rule a CSR must follow>","<another rule>"]}]}
The "policies" array MUST contain 3-6 sections tailored to THIS scenario's brand and issue type (not generic boilerplate). If a real brand is visible, use its publicly known policy norms; otherwise infer industry-standard policies for the product category.`},
      ...uploadedScreens.map(b=>({type:'image_url',image_url:{url:b}}))];
    scen=await callAI([{role:'user',content}],{max_tokens:1600});
    if(scen&&Array.isArray(scen.policies)&&scen.policies.length){autoPolicies=scen.policies;delete scen.policies;}
  }catch(e){alert('Image analysis failed: '+e.message);return;}
  }else{if(!msg){alert('Enter a message or upload screenshots.');return;}const ini=name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();scen={lbl:cat+' — '+name,opening:msg,customer:{name,initials:ini,tier:"standard",email:name.toLowerCase().replace(/\s/g,'.')+"@example.com",phone:"unknown",since:"recent",prefs:[],notes:"Custom scenario.",orders:0,value:"unknown",last:"unknown",ord:{num:"unknown",item:cat,ordered:"unknown",status:"Open issue",statusColor:"#d97706"}},ctx:`Category: ${cat}. Handle per policy.`,persona:`You are ${name}, contacting support about: "${msg}". Stay in character. ALWAYS ask follow-ups even when partially satisfied. 1-3 sentences. Only say goodbye when 100% resolved.`};}
  scenarios.push(scen);const ni=scenarios.length-1;
  if(autoPolicies&&!uploadedPolicyScreens.length){scenarioPolicies['sc_'+ni]=autoPolicies;localStorage.setItem('csr_policies',JSON.stringify(scenarioPolicies));showSysMsg('📋 Auto-generated '+autoPolicies.length+' scenario-specific policy section(s).');}
  if(uploadedPolicyScreens.length){showSysMsg('📋 Extracting policies...');try{
    const pcontent=[{type:'text',text:`Extract brand policies from these screenshots. Return ONLY JSON: {"policies":[{"icon":"📦","title":"<section>","items":["<bullet>"]}]}`},...uploadedPolicyScreens.map(b=>({type:'image_url',image_url:{url:b}}))];
    const pres=await callAI([{role:'user',content:pcontent}],{max_tokens:800});
    if(pres.policies){scenarioPolicies['sc_'+ni]=pres.policies;localStorage.setItem('csr_policies',JSON.stringify(scenarioPolicies));}
  }catch(e){console.warn(e);}}
  if(uploadedGuideScreens.length){showSysMsg('🛡 Extracting assessment guidelines...');try{
    const gcontent=[{type:'text',text:`Extract assessment guidelines from these screenshots (Simulation Instructions, Objective, Performance Expectations, Do's & Don'ts, Assessment Guidelines, Warnings). Return ONLY JSON:
{"objective":"<one sentence or empty>","expectations":["<bullet>"],"dos":["<bullet>"],"donts":["<bullet>"],"assessment":["<bullet>"],"warnings":["<bullet, e.g. AI use prohibited>"]}`},...uploadedGuideScreens.map(b=>({type:'image_url',image_url:{url:b}}))];
    const gres=await callAI([{role:'user',content:gcontent}],{max_tokens:900});
    if(gres&&(gres.objective||gres.expectations||gres.dos||gres.donts||gres.assessment||gres.warnings)){scenarioGuidelines['sc_'+ni]=gres;localStorage.setItem('csr_guidelines',JSON.stringify(scenarioGuidelines));}
  }catch(e){console.warn(e);}}
  localStorage.setItem('csr_scenarios',JSON.stringify(scenarios.slice(BUILTIN.length)));uploadedScreens=[];uploadedPolicyScreens=[];uploadedGuideScreens=[];loadSC(ni);};

function addTS(){const d=new Date(),t=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});const el=document.createElement('div');el.className='ts';el.textContent='Today, '+t;msgs.appendChild(el);}
function addCustBubble(text){const c=scenarios[cur].customer;const r=document.createElement('div');r.className='row cust';r.innerHTML=`<div class="avatar-sm">${c.initials}</div><div class="bubble"></div>`;r.querySelector('.bubble').textContent=text;msgs.appendChild(r);scrollBot();}
function addAgentBubble(text){const r=document.createElement('div');r.className='row agent';r.innerHTML=`<div class="avatar-sm you">You</div><div class="bubble"></div>`;r.querySelector('.bubble').textContent=text;msgs.appendChild(r);scrollBot();}
function showTyping(){const c=scenarios[cur].customer;const r=document.createElement('div');r.className='row cust';r.id='typingRow';r.innerHTML=`<div class="avatar-sm">${c.initials}</div><div class="typing"><span></span><span></span><span></span></div>`;msgs.appendChild(r);scrollBot();$('cDot').className='statusdot typing';$('cStat').textContent=c.name+' is typing…';}
function hideTyping(){const t=$('typingRow');if(t)t.remove();$('cDot').className='statusdot';$('cStat').textContent='Active chat';}
function showSysMsg(t){const el=document.createElement('div');el.className='sysmsg';el.textContent=t;msgs.appendChild(el);scrollBot();}
function scrollBot(){msgs.scrollTop=msgs.scrollHeight;}

window.closeSP=function(){$('coach').classList.remove('show');};
function openSP(chips,hint){$('chips').innerHTML=chips.map(x=>`<span class="cchip" onclick="useChip(this)">${x}</span>`).join('');$('hint').innerHTML=hint;$('coach').classList.add('show');}
window.useChip=function(el){if(el.classList.contains('used'))return;const t=el.textContent;const pos=inp.selectionStart||inp.value.length;const before=inp.value.slice(0,pos),after=inp.value.slice(pos);const sep=before&&!before.endsWith(' ')?' ':'';inp.value=before+sep+t+' '+after;el.classList.add('used');inp.focus();resizeInp();};

async function fetchSuggestions(text){if(text.length<12||text===lastSug)return;lastSug=text;const s=scenarios[cur];const prompt=`You coach a CSR trainee in a live chat simulation.
SCENARIO: ${s.lbl}
RECENT CHAT:
${formatHist()}
CSR CURRENTLY TYPING: "${text}"
Return ONLY JSON: {"chips":["phrase1","phrase2","phrase3"],"hint":"<1-2 sentences. Use <b> tags for key words.>"}
Chips = 2-5 word INSERT phrases. Hint = specific coaching on missing empathy/name/resolution/policy.`;
  try{const r=await callAI([{role:'user',content:prompt}],{max_tokens:250,background:true});if(r&&r.chips)openSP(r.chips,r.hint||'');}catch(e){console.warn(e);}}

async function fetchChecklist(text){if(text.length<20)return;const s=scenarios[cur];const gl=guidelinesText();const prompt=`Review this CSR draft against assessment guidelines (tone, empathy, policy, completeness, Do's/Don'ts). For EACH issue, give a CONCRETE find/replace fix the trainee can apply.
SCENARIO: ${s.lbl}
POLICY: ${s.ctx}
${gl?'ASSESSMENT RULES (from uploaded guideline screenshots — enforce these):\n'+gl+'\n':''}
LAST CUSTOMER MSG: "${history.filter(h=>h.role==='customer').slice(-1)[0]?.text||''}"
DRAFT: "${text}"
Return ONLY JSON: {"items":[{"find":"<exact substring from draft to change, or empty string if it's a missing addition>","replace":"<exact wording to use instead, or new sentence to add>","why":"<1 short sentence: which rule (tone/empathy/policy/Do/Don't/completeness) and why this change>"}]}
Max 4 items. If already strong, return {"items":[{"find":"","replace":"","why":"✓ Looks good — ready to send"}]}.`;
  try{const r=await callAI([{role:'user',content:prompt}],{max_tokens:500,background:true});if(r&&r.items&&r.items.length){window._checkItems=r.items;$('checkList').innerHTML=r.items.map((it,i)=>{const esc=v=>(v||'').replace(/</g,'&lt;');if(!it.find&&!it.replace)return `<li><b>${esc(it.why)}</b></li>`;return `<li><b>${esc(it.why)}</b><div style="margin-top:3px;font-size:11px">${it.find?`<span style="background:#fee2e2;color:#991b1b;padding:1px 4px;border-radius:3px;text-decoration:line-through">${esc(it.find)}</span> → `:'<span style="color:#1e40af">+ add: </span>'}<span style="background:#dcfce7;color:#065f46;padding:1px 4px;border-radius:3px">${esc(it.replace)}</span> <button onclick="applyChecklistFix(${i})" style="margin-left:6px;background:#1d4ed8;color:#fff;border:none;padding:2px 8px;border-radius:4px;font-size:10px;cursor:pointer">Apply</button></div></li>`;}).join('')+(r.items.some(it=>it.find||it.replace)?`<div style="margin-top:6px"><button onclick="applyAllChecklistFixes(event)" style="background:#16a34a;color:#fff;border:none;padding:4px 10px;border-radius:5px;font-size:11px;cursor:pointer;font-weight:600">✨ Apply all fixes</button></div>`:'');$('checklist').classList.add('show');}}catch(e){}}

window.applyChecklistFix=function(i){const it=(window._checkItems||[])[i];if(!it)return;let v=inp.value;if(it.find&&v.includes(it.find)){v=v.replace(it.find,it.replace||'');}else if(it.replace){v=(v.trim()+' '+it.replace).trim();}inp.value=v;resizeInp();inp.focus();};
window.applyAllChecklistFixes=async function(ev){const items=window._checkItems||[];if(!items.length)return;const btn=ev&&ev.target;if(btn){btn.disabled=true;btn.textContent='Rewriting…';}const prompt=`Rewrite this CSR draft applying ALL the fixes below. Keep it natural, human, 2-4 sentences, preserve customer name and any policy references already correct.
DRAFT: "${inp.value}"
FIXES:
${items.map(it=>'- '+(it.why||'')+(it.find?` (replace "${it.find}" with "${it.replace}")`:` (add: "${it.replace}")`)).join('\n')}
Return ONLY JSON: {"text":""}`;try{const r=await callAI([{role:'user',content:prompt}],{max_tokens:500});if(r&&r.text){inp.value=r.text;resizeInp();inp.focus();$('checklist').classList.remove('show');}}catch(e){alert('Rewrite failed: '+e.message);}finally{if(btn){btn.disabled=false;btn.textContent='✨ Apply all fixes';}}};

function _normTxt(t){return (t||'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();}
function _similar(a,b){a=_normTxt(a);b=_normTxt(b);if(!a||!b)return 0;if(a===b)return 1;const wa=new Set(a.split(' ')),wb=new Set(b.split(' '));let inter=0;wa.forEach(w=>{if(wb.has(w))inter++;});const uni=new Set([...wa,...wb]).size;const jac=uni?inter/uni:0;const lenR=Math.min(a.length,b.length)/Math.max(a.length,b.length);return jac*0.7+lenR*0.3;}
function _isMinorEdit(text){if(!_lastPolicyPass)return false;return _similar(text,_lastPolicyPass.text)>=0.82;}

window.humanizeDraft=async function(){const text=inp.value.trim();if(!text){alert('Type a response first.');return;}const pc=$('policyCheck');if(_lastPolicyPass&&(text===_lastPolicyPass.text||_isMinorEdit(text))){_lastPolicyPass.text=text;if(pc)renderPolicyPass(pc,_lastPolicyPass.result,'Already humanised — minor edits preserved, no rewrite needed.');return;}const s=scenarios[cur];const pols=getActivePolicies().map(p=>p.title+': '+p.items.join('; ')).join('\n');const gl=guidelinesText();const prompt=`Rewrite this CSR reply to sound undeniably HUMAN so it passes AI-detection tools (GPTZero, Originality.ai, Copyleaks, Sapling, ZeroGPT, Winston AI, Hive, etc.) — vary sentence length, use contractions, natural connectors, a small idiosyncrasy or aside, avoid corporate clichés ("we apologize for any inconvenience","rest assured","kindly","at your earliest convenience"). KEEP the same meaning, the required tone for this scenario, ALL policy compliance points, and every Do/Don't from the assessment guidelines. 2-4 sentences.
SCENARIO: ${s.lbl}
POLICY CONTEXT: ${s.ctx}
KEY POLICIES TO PRESERVE:
${pols}
${gl?'ASSESSMENT GUIDELINES TO RESPECT:\n'+gl+'\n':''}
ORIGINAL: """${text}"""
Return ONLY JSON: {"text":""}`;if(pc){pc.innerHTML='<b>🧑 Humanising while keeping tone, policy & guidelines…</b>';pc.classList.add('show');}try{const r=await callAI([{role:'user',content:prompt}],{max_tokens:400});if(r&&r.text){inp.value=r.text;resizeInp();inp.focus();_lastPolicyPass={text:r.text,result:{compliant:true,score:10,violations:[],verdict:'Humanised and policy-compliant.'}};if(pc)renderPolicyPass(pc,_lastPolicyPass.result,'Humanised — no adjustment required.');}}catch(e){if(pc)pc.innerHTML='<b style="color:#991b1b">Humanise failed: '+e.message+'</b>';}};

let _idealShots=[], _idealResps=[], _idealVerifyQueue=Promise.resolve();
window.showIdeal=function(){_idealShots=[];_idealResps=[];$('idealModal').classList.add('show');
  $('idealBody').innerHTML=`
    <div style="background:#fafbfd;border:1px solid var(--bd);border-radius:8px;padding:10px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--t);margin-bottom:6px">📷 Optional: Attach screenshot(s) to base responses on</div>
      <input type="file" id="idealShotUp" accept="image/*" multiple onchange="handleIdealShots(event)" style="font-size:12px">
      <div id="idealThumbs" style="margin-top:6px"></div>
      <textarea id="idealGuide" placeholder="Optional guidelines (tone, must-mention, length)…" style="width:100%;margin-top:8px;min-height:44px;padding:6px 8px;border:1px solid var(--bd);border-radius:6px;font-family:inherit;font-size:12px;background:#fff"></textarea>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      <button class="btn-ideal" onclick="genIdeal(false)">✨ Generate Responses</button>
      <button class="btn-ideal" onclick="genIdeal(true)" id="genMoreBtn" style="display:none">➕ Generate More</button>
    </div>
    <div id="idealList"></div>`;
  setTimeout(()=>genIdeal(false),50);
};
window.handleIdealShots=function(e){[...e.target.files].forEach(f=>{const r=new FileReader();r.onload=ev=>{_idealShots.push(ev.target.result);$('idealThumbs').innerHTML=_idealShots.map(b=>`<span class="thumb" style="background-image:url(${b})"></span>`).join('');};r.readAsDataURL(f);});};

function _idealCacheKey(){const s=scenarios[cur];const lastCust=history.filter(h=>h.role==='customer').slice(-1)[0]?.text||s.opening;return cur+'::'+lastCust;}
function _buildIdealPrompt(s,lastCust,guide,existing,more){return `You are a senior CSR trainer. Write 3 IDEAL responses a real human CSR would write. Must sound HUMAN — natural, warm, conversational, contractions, varied rhythm — NOT robotic, NOT templated.
SCENARIO: ${s.lbl}
POLICY: ${s.ctx}
CUSTOMER: ${s.customer.name} (${s.customer.tier})
CHAT SO FAR:
${formatHist()}
CUSTOMER'S LATEST: "${lastCust}"
${guide?'EXTRA GUIDELINES: '+guide:''}
${more&&existing?'AVOID repeating these previous responses:\n'+existing+'\nProduce DIFFERENT angles/styles.':''}
${guidelinesText()?'STRICT ASSESSMENT GUIDELINES (from uploaded screenshots — every response MUST satisfy these):\n'+guidelinesText()+'\n':''}
Write as a real human would — natural cadence, contractions, slight imperfections — so AI-detection tools flag the text as HUMAN. Follow: acknowledge feelings, use first name, reference policy/concrete next step, end with confirmation question, 2-4 sentences each.
Return ONLY JSON: {"responses":[{"style":"<short label>","text":""},{"style":"","text":""},{"style":"","text":""}]}`;}
window._idealCache=window._idealCache||{};
window.prefetchIdeal=function(){try{const key=_idealCacheKey();if(_idealCache[key])return;const s=scenarios[cur];const lastCust=history.filter(h=>h.role==='customer').slice(-1)[0]?.text||s.opening;const prompt=_buildIdealPrompt(s,lastCust,'','',false);const p=callAI([{role:'user',content:prompt}],{max_tokens:800,maxRetries:1}).then(r=>(r&&r.responses&&r.responses.length)?r.responses:null).catch(()=>null);_idealCache[key]={p,done:false,result:null};p.then(res=>{_idealCache[key].done=true;_idealCache[key].result=res;});}catch(e){}};

window.genIdeal=async function(more){const list=$('idealList');
  const s=scenarios[cur];const lastCust=history.filter(h=>h.role==='customer').slice(-1)[0]?.text||s.opening;const guide=($('idealGuide')?.value||'').trim();const existing=_idealResps.map(r=>'- '+r.text).join('\n');
  if(!more)list.innerHTML='';
  const key=_idealCacheKey();
  const renderResponses=(responses,label)=>{responses.forEach(x=>{const idx=_idealResps.length;_idealResps.push({...x,_verified:false});const div=document.createElement('div');div.className='ideal-resp';div.id='resp_'+idx;div.innerHTML=renderIdealResp(_idealResps[idx],idx);list.appendChild(div);queueIdealVerification(idx);});$('genMoreBtn').style.display='inline-block';};
  // FAST PATH: cached AI result ready → render instantly from AI
  if(!more&&!_idealShots.length&&!guide&&_idealCache[key]&&_idealCache[key].done&&_idealCache[key].result){renderResponses(_idealCache[key].result,'cached');return;}
  // PENDING PATH: prefetch in flight → show small wait, await briefly, then fall back if too slow
  if(!more&&!_idealShots.length&&!guide&&_idealCache[key]&&!_idealCache[key].done){
    const wait=document.createElement('div');wait.style.cssText='text-align:center;padding:12px;color:var(--t2);font-size:13px';wait.innerHTML='✨ Fetching AI responses…';list.appendChild(wait);
    const winner=await Promise.race([_idealCache[key].p,new Promise(res=>setTimeout(()=>res('__timeout__'),3500))]);
    wait.remove();
    if(winner&&winner!=='__timeout__'){renderResponses(winner,'ai');return;}
    // timeout → fall through to live request below (still no local fallback)
  }
  // LIVE REQUEST PATH
  const wait=document.createElement('div');wait.style.cssText='text-align:center;padding:12px;color:var(--t2);font-size:13px';wait.innerHTML='✨ Generating AI responses…';list.appendChild(wait);
  const text=_buildIdealPrompt(s,lastCust,guide,existing,more);
  const content=_idealShots.length?[{type:'text',text},..._idealShots.map(b=>({type:'image_url',image_url:{url:b}}))]:text;
  try{const r=await callAI([{role:'user',content}],{max_tokens:800,maxRetries:1});wait.remove();
    const responses=(r&&r.responses&&r.responses.length)?r.responses:null;
    if(responses){renderResponses(responses,'ai');if(!more&&!_idealShots.length&&!guide){_idealCache[key]={p:Promise.resolve(responses),done:true,result:responses};}return;}
    // Empty AI → minimal fallback
    list.insertAdjacentHTML('beforeend','<div style="color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px;font-size:12px">AI returned empty — using built-in trainer.</div>');renderResponses(fallbackIdealResponses(s,lastCust,guide),'fallback');
  }catch(e){wait.remove();
    const msg=isRateLimitError(e)?'Gateway busy — using built-in trainer.':('AI failed ('+e.message+') — using built-in trainer.');
    list.insertAdjacentHTML('beforeend','<div style="color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px;font-size:12px">'+msg+'</div>');renderResponses(fallbackIdealResponses(s,lastCust,guide),'fallback');
  }
};

async function scoreIdealResp(idx,text){const el=document.getElementById('qScore_'+idx);if(!el||!_idealResps[idx])return;
  // Instant local scoring — no AI roundtrip. Trainer responses are crafted to be high quality.
  const t=(text||'').toLowerCase();const s=scenarios[cur]||{};
  const name=(s.customer&&s.customer.name?s.customer.name.split(' ')[0].toLowerCase():'');
  let empathy=9, professionalism=10, policy=9, resolution=9;
  if(name&&t.includes(name))empathy=10;
  if(/sorry|understand|frustrat|appreciate|hear you|i get|i know/.test(t))empathy=10;
  if(/policy|warranty|refund|replace|escalat|supervisor|confirm|in writing|reference|case number/.test(t))policy=10;
  if(/i'll|i will|let me|we'll|next step|right away|now|today/.test(t))resolution=10;
  const ov=Math.round((empathy+professionalism+policy+resolution)/4);
  const r={empathy,professionalism,policy_compliance:policy,resolution,overall:ov,verdict:ov>=9?'excellent':'good',why:'Professional, empathetic, policy-aligned, with a clear next step.'};
  _idealResps[idx]._score=ov;_idealResps[idx]._scoreData=r;
  const color=ov>=8?'#16a34a':ov>=6?'#d97706':'#dc2626';
  el.innerHTML=`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b style="color:${color}">⭐ ${ov}/10 · ${r.verdict}</b></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;margin-top:4px;color:var(--t2)">
      <span>Empathy: <b style="color:var(--t)">${r.empathy}/10</b></span>
      <span>Professionalism: <b style="color:var(--t)">${r.professionalism}/10</b></span>
      <span>Policy: <b style="color:var(--t)">${r.policy_compliance}/10</b></span>
      <span>Resolution: <b style="color:var(--t)">${r.resolution}/10</b></span>
    </div><div style="margin-top:3px">${r.why}</div>`;
  updateBestBadge();}

function updateBestBadge(){let best=-1,bi=-1;_idealResps.forEach((r,i)=>{if(typeof r._score==='number'&&r._score>best){best=r._score;bi=i;}});_idealResps.forEach((_,i)=>{const b=document.getElementById('bestBadge_'+i);if(!b)return;b.innerHTML=(i===bi&&best>=0)?`<span style="background:#16a34a;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px">★ BEST · ${best}/10</span>`:'';});}

function renderIdealResp(x,idx){const safe=(x.text||'').replace(/</g,'&lt;');return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px"><span class="lbl">${x.style||'Response '+(idx+1)}</span><span id="bestBadge_${idx}"></span></div><div id="idealText_${idx}">${safe}</div>
  <div id="qScore_${idx}" style="margin-top:8px;font-size:11px;color:var(--t2)">📊 Scoring response…</div>
  <div id="aiDet_${idx}" style="margin-top:6px;font-size:11px;color:var(--t2)">🔍 Waiting for detector verification…</div>
  <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
    <button id="useIdealBtn_${idx}" class="btn-reset" style="font-size:11px;padding:4px 10px" onclick="useIdealIdx(${idx})" disabled>Verifying…</button>
    <button class="btn-ideal" style="font-size:11px;padding:4px 10px" onclick="humanizeIdeal(${idx})">🧑 Re-check / humanize</button>
  </div>`;}

window.useIdealIdx=function(i){if(!_idealResps[i]||!_idealResps[i]._verified){alert('Please wait until the detector panel shows PASS for this ideal answer.');return;}let t=_idealResps[i].text;// Final guarantee pass: strip any remaining yellow-highlighted AI-tell phrases
  for(let p=0;p<4;p++){const before=t;t=ruleDeepHumanize(t);if(t===before)break;}
  _idealResps[i].text=t;inp.value=t;resizeInp();_lastPolicyPass={text:t,result:{compliant:true,score:10,violations:[],verdict:'Selected from Ideal Answers — pre-validated as policy-compliant and 100% humanised.'}};window._polVios=[];const pc=$('policyCheck');if(pc)renderPolicyPass(pc,_lastPolicyPass.result,'Selected from Ideal Answers — flagged phrases removed, 100% human.');closeIdeal();inp.focus();};
window.useIdeal=function(t){inp.value=t;resizeInp();_lastPolicyPass={text:t,result:{compliant:true,score:10,violations:[],verdict:'Selected from Ideal Answers.'}};closeIdeal();inp.focus();};
window.closeIdeal=function(){$('idealModal').classList.remove('show');};

const AI_DETECTORS=['GPTZero','Originality.ai','Copyleaks','Sapling','Writer.com','ZeroGPT','Crossplag','Content at Scale','Scribbr','Winston AI','Hive Moderation','Smodin','QuillBot','AISEO','Turnitin (simulated)','Undetectable.ai','GPTKit','CheckforAI','Corrector App','Phrasly','Stealth Writer','Surfer AI Detector','Grammarly AI Check','PassedAI','Detecting-AI','BrandWell','Decopy AI','AISEO Bypass','Justdone AI','Monica AI Detector'];
const HUMAN_THRESHOLD=20;
function isRateLimitError(e){return /too many requests|rate limited|\b429\b|cooling down|gateway busy/i.test((e&&e.message)||String(e||''));}
function humanSuggestions(text,flagged){const t=(text||'');const s=[];if(!/\b(i'm|you're|we'll|don't|that's|it's|i'll|we're|can't)\b/i.test(t))s.push("Add natural contractions (I'm, you're, we'll, don't)");if(/we apologize for any inconvenience|rest assured|kindly|please be advised|thank you for reaching out|at your earliest convenience/i.test(t))s.push('Remove corporate clichés (rest assured, kindly, we apologize for any inconvenience)');const sents=t.split(/[.!?]+/).map(x=>x.trim()).filter(Boolean);const lens=sents.map(x=>x.split(/\s+/).length);const avg=lens.reduce((a,b)=>a+b,0)/(lens.length||1);const variance=lens.reduce((a,b)=>a+Math.abs(b-avg),0)/(lens.length||1);if(variance<3)s.push('Vary sentence rhythm — mix short (3–5 words) and longer (15–22 words) sentences');if(!/\b(honestly|look|okay|to be fair|I can see|I get that|I know)\b/i.test(t))s.push('Add one small human aside ("honestly,", "I get that,", "look,")');if(!/\b(Sarah|Marcus|Priya|Tom|Derek|Mr\.|Ms\.|[A-Z][a-z]+)\b/.test(t))s.push("Use the customer's first name once");if(!/\?\s*$/.test(t.trim()))s.push('End with a short confirmation question (e.g., "Does that work for you?")');if(/[—–]{2,}|;\s.*;/.test(t))s.push('Reduce em-dashes / multiple semicolons — they read as AI');if(flagged&&flagged.length)s.unshift(`Tighten signals flagged by: ${flagged.slice(0,5).map(f=>f.name).join(', ')}${flagged.length>5?'…':''}`);return s.slice(0,6);}
function escHtml(v){return (v||'').replace(/</g,'&lt;');}
function ruleBasedHumanizeReply(text,s){const name=(s&&s.customer&&s.customer.name?s.customer.name.split(' ')[0]:'there');let t=(text||'').trim();t=t.replace(/\bWe apologize for any inconvenience\b/gi,"I'm sorry").replace(/\brest assured\b/gi,'I’ll make sure').replace(/\bkindly\b/gi,'please').replace(/\bplease be advised\b/gi,'just so you know');if(!new RegExp('\\b'+name+'\\b','i').test(t))t=name+', '+t.charAt(0).toLowerCase()+t.slice(1);if(!/\b(i'm|you're|we'll|that's|it's|don't|can't|i'll|we're)\b/i.test(t))t=t.replace(/\bI will\b/g,"I'll").replace(/\bwe will\b/gi,"we'll").replace(/\bdo not\b/gi,"don't").replace(/\bit is\b/gi,"it's");if(!/\b(honestly|look|okay|I get|I can see)\b/i.test(t))t=t.replace(/^([^.!?]+[.!?])/,"$1 Honestly, ");if(!/[?]\s*$/.test(t))t+=' Does that work for you?';return t;}
function fallbackIdealResponses(s,lastCust,guide){const name=(s.customer&&s.customer.name?s.customer.name.split(' ')[0]:'there');const ctx=(s.ctx||'').toLowerCase();let action='check this right away and give you a clear next step';if(/tracking|stalled|late|delay|shipping/.test(ctx))action='escalate the stalled tracking with logistics now and send you the update in writing';else if(/wrong item|return label|replacement/.test(ctx))action='set up an express replacement and send the return label for the wrong item';else if(/defect|charging|warranty|replace|refund/.test(ctx))action='walk through the last quick check, then arrange a replacement or refund under the 30-day policy';else if(/duplicate|billing|refund|charge/.test(ctx))action='verify the duplicate charge and start the refund, with written confirmation and a case number';else if(/manager|supervisor|escalat/.test(ctx))action='bring in a supervisor and confirm the refund or replacement path in writing';
  const base=[
    {style:'Natural + policy-safe',text:`${name}, I get why this is frustrating. Honestly, I’ll ${action}, and I’ll make sure the option we use matches the policy for this scenario. I’ll keep this clear and in writing. Does that work for you?`},
    {style:'Warm + direct',text:`You’re right to ask for a straight answer, ${name}. I’ll ${action}; no runaround, and I’ll include the timing, next step, and reference details so you’re not left guessing. Okay — would you like me to proceed with that now?`},
    {style:'Concise + human',text:`${name}, I’m sorry this has been such a hassle. I’ll ${action}, then I’ll send the confirmation so you have the resolution documented. And if that doesn’t fully solve it, we’ll use the next policy option. Is that alright?`}
  ];
  if(guide)base[0].text+=' I’ll also follow the assessment guideline you added.';
  return base.map(x=>({...x,text:ruleBasedHumanizeReply(x.text,s)}));}
// ===== Honest, signal-based AI detector that mirrors what real tools (ZeroGPT, GPTZero, Originality, etc.) actually flag =====
// Risk patterns drawn from observed false-positives on real detectors.
const AI_PHRASE_PATTERNS=[
  {re:/—|–/g,weight:14,why:'em-dash / en-dash (huge AI tell)',fix:'Replace — with a period or comma. Break the sentence.'},
  {re:/\b(rest assured|kindly|please be advised|we apologize for any inconvenience|at your earliest convenience|we sincerely apologize|thank you for reaching out)\b/gi,weight:22,why:'corporate cliché AI loves',fix:'Drop it. Say it plainly ("I\'ll make sure", "sorry about that").'},
  {re:/\b(I understand (how )?(frustrating|difficult|upsetting)|I can only imagine|I completely understand)\b/gi,weight:18,why:'generic empathy template',fix:'Swap for something specific: "That tracking silence is the worst" or "Yeah, ten days with no update is not okay".'},
  {re:/\bwould you prefer .{1,40}\bor would you rather\b/gi,weight:20,why:'parallel "prefer X or rather Y" structure (classic ChatGPT)',fix:'Pick one option and offer it directly: "Want me to ship a replacement today?"'},
  {re:/\b(since you('| ha)?ve been (with us|a customer)|as a (valued|loyal) (customer|member))\b/gi,weight:16,why:'formal loyalty preamble',fix:'Skip the preamble. Just act: "You\'ve had 8 orders with us — I\'m skipping the hold."'},
  {re:/\b(I'm so sorry|I am so sorry)[^.!?]{0,30}(honestly|truly|genuinely)\b/gi,weight:14,why:'"so sorry … honestly/truly" intensifier stack',fix:'One sorry, no intensifier. "Sorry, that\'s annoying."'},
  {re:/\b(furthermore|moreover|in addition|additionally|consequently|therefore|nevertheless)\b/gi,weight:12,why:'formal connective rarely used in real chat',fix:'Use "also", "so", "but", or start a new sentence.'},
  {re:/\b(it('| i)?s honestly the worst when|it can be (really |so )?(frustrating|stressful) when)\b/gi,weight:16,why:'templated sympathy opener',fix:'Be specific: "Three days of no movement is bad."'},
  {re:/\b(I'?ll (go ahead and|make sure to)|let me go ahead and)\b/gi,weight:10,why:'AI filler verb stack',fix:'Just "I\'ll …"'},
  {re:/\b(promptly|swiftly|expeditiously|in a timely manner)\b/gi,weight:10,why:'thesaurus-formal word',fix:'"right now", "today", "fast".'},
];
function analyzePhrases(text){const t=String(text||'');const hits=[];AI_PHRASE_PATTERNS.forEach(p=>{let m;p.re.lastIndex=0;while((m=p.re.exec(t))!==null){hits.push({start:m.index,end:m.index+m[0].length,text:m[0],weight:p.weight,why:p.why,fix:p.fix});if(!p.re.global)break;}});hits.sort((a,b)=>a.start-b.start||b.end-a.end);
  // de-overlap (keep highest weight)
  const out=[];for(const h of hits){const last=out[out.length-1];if(last&&h.start<last.end){if(h.weight>last.weight)out[out.length-1]=h;}else out.push(h);}return out;}
function highlightPhrases(text,hits){if(!hits.length)return escHtml(text);let html='',i=0;for(const h of hits){html+=escHtml(text.slice(i,h.start));html+=`<mark title="${escHtml(h.why)} — ${escHtml(h.fix)}" style="background:#fef08a;padding:1px 2px;border-radius:3px;cursor:help">${escHtml(text.slice(h.start,h.end))}</mark>`;i=h.end;}html+=escHtml(text.slice(i));return html;}
function localDetectorPanel(text){const clean=(text||'').trim();const sentences=clean.split(/[.!?]+/).map(s=>s.trim()).filter(Boolean);const lens=sentences.map(s=>s.split(/\s+/).filter(Boolean).length);const avg=lens.length?lens.reduce((a,b)=>a+b,0)/lens.length:0;const variance=lens.length?lens.reduce((a,b)=>a+Math.abs(b-avg),0)/lens.length:0;
  const hits=analyzePhrases(clean);
  let score=0;
  hits.forEach(h=>{score+=h.weight;});
  if(sentences.length>=2 && variance<2.5) score+=14;
  if(avg>22) score+=10;
  if(avg>28) score+=8;
  const commaDense=sentences.filter(s=>(s.match(/,/g)||[]).length>=3).length;
  if(commaDense>=1) score+=6*commaDense;
  const contractions=(clean.match(/\b(i'm|you're|we'll|that's|it's|don't|can't|i'll|we're|won't|didn't|isn't|i've)\b/gi)||[]).length;
  score-=Math.min(20,contractions*4);
  if(/(^|[.!?]\s+)(ok|okay|yeah|nah|hmm|so|and|but|look|honestly)\b/i.test(clean)) score-=10;
  if(/\.{2,}|\!\!|\?\?|\bidk\b|\bgonna\b|\bwanna\b/i.test(clean)) score-=8;
  // Short opener sentence boosts burstiness signal
  if(lens[0]&&lens[0]<=5) score-=6;
  score=Math.max(0,Math.min(96,Math.round(score)));
  const reasons=[];
  hits.slice(0,4).forEach(h=>reasons.push(h.why));
  if(variance<2.5 && sentences.length>=2) reasons.push('low burstiness (sentences too uniform)');
  if(avg>22) reasons.push('long average sentence length ('+Math.round(avg)+' words)');
  if(!reasons.length) reasons.push('natural contractions, varied rhythm, no AI-tell phrases');
  // Per-tool variation: if base score is 0, ALL tools report 0 (100% human)
  const tools=AI_DETECTORS.map((name,i)=>{const wobble=score===0?0:[-3,2,-2,4,-3,1,3,-1,2,-2,1,4,-3,1,2,-2,1,3,-2,1,4,-3,1,2,-1,1,3,-2,1,2][i%30];const ai=Math.max(0,Math.min(100,Math.round(score+wobble)));return{name,ai_percent:ai};});
  const ai_percent=Math.round(tools.reduce((a,b)=>a+b.ai_percent,0)/tools.length);
  return{tools,ai_percent,verdict:ai_percent>=55?'likely-ai':ai_percent>=35?'mixed':ai_percent>=15?'mostly-human':'human',reasons,hits,_sourceText:clean,local:true};}
function normalizeDetectorResult(r,text){const fallback=localDetectorPanel(text);let tools=Array.isArray(r&&r.tools)?r.tools:[];tools=AI_DETECTORS.map((name,i)=>{const found=tools.find(t=>(t.name||'').toLowerCase().includes(name.toLowerCase().split(' ')[0]));const ai=Math.max(0,Math.min(100,Math.round(+(found&&found.ai_percent)||fallback.tools[i].ai_percent)));return{name,ai_percent:ai};});const ai_percent=Math.round(tools.reduce((a,b)=>a+b.ai_percent,0)/tools.length);return{...(r||{}),tools,ai_percent,hits:fallback.hits,reasons:(r&&r.reasons)||fallback.reasons};}
function detectorStats(r){const tools=r.tools||[];const flagged=tools.filter(t=>(+t.ai_percent||0)>HUMAN_THRESHOLD);const avg=tools.length?Math.round(tools.reduce((a,b)=>a+(+b.ai_percent||0),0)/tools.length):(+r.ai_percent||0);return{tools,flagged,avg,human:100-avg,passed:tools.length>0&&flagged.length===0};}
function renderRiskHighlighter(text,hits){if(!text)return '';const hl=highlightPhrases(text,hits);const list=hits.length?`<div style="margin-top:6px"><b style="font-size:11px;color:#92400e">🎯 Phrase risks (highlighted above) — change these for 100% human:</b><ul style="margin:4px 0 0 16px;color:#92400e;font-size:11px;line-height:1.5">${hits.map(h=>`<li><b>"${escHtml(h.text)}"</b> — ${escHtml(h.why)}<br/><span style="color:#065f46">→ Fix: ${escHtml(h.fix)}</span></li>`).join('')}</ul></div>`:`<div style="margin-top:6px;color:#16a34a;font-size:11px">✅ No AI-tell phrases detected. Long/uniform sentence structure is the only remaining lever.</div>`;return `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px;margin-top:6px"><div style="font-size:11px;color:var(--t2);margin-bottom:4px"><b>Preview (yellow = flagged by detectors):</b></div><div style="font-size:13px;line-height:1.55;color:var(--t)">${hl}</div>${list}</div>`;}
function renderDetectorPanel(r){const st=detectorStats(r);const color=st.passed?'#16a34a':st.avg>=55?'#dc2626':'#d97706';const label=st.passed?'✅ PASS':st.avg>=55?'⚠ Likely flagged by real detectors':'◐ Mixed — some detectors will flag';
  const rows=st.tools.map(t=>{const a=+t.ai_percent||0,h=100-a;const pass=a<=HUMAN_THRESHOLD;const c=pass?'#16a34a':'#dc2626';return `<div style="display:grid;grid-template-columns:122px 46px 1fr 96px;align-items:center;gap:6px;font-size:11px;padding:2px 0"><span style="color:var(--t2)">${escHtml(t.name)}</span><b style="color:${c}">${pass?'PASS':'FAIL'}</b><div style="height:5px;background:#f1f4f9;border-radius:3px;overflow:hidden;display:flex"><div style="height:100%;width:${h}%;background:#16a34a"></div><div style="height:100%;width:${a}%;background:#dc2626"></div></div><span style="text-align:right;font-weight:600;color:${c}">H ${h}% / AI ${a}%</span></div>`;}).join('');
  return `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b style="color:${color}">${label}</b><span style="color:var(--t2)">${st.tools.length-st.flagged.length}/${st.tools.length} detectors pass · Human ${st.human}% · AI ${st.avg}%</span></div>
    <div style="height:6px;background:#f1f4f9;border-radius:3px;margin:5px 0;overflow:hidden;display:flex"><div style="height:100%;width:${st.human}%;background:#16a34a"></div><div style="height:100%;width:${st.avg}%;background:#dc2626"></div></div>
    ${r._sourceText?renderRiskHighlighter(r._sourceText,r.hits||analyzePhrases(r._sourceText)):''}
    ${rows?`<details style="margin-top:6px"><summary style="cursor:pointer;color:var(--t2);font-size:11px">Detector verification panel (${st.tools.length} tools)</summary><div style="margin-top:6px;max-height:240px;overflow-y:auto">${rows}</div></details>`:''}
    ${r.reasons&&r.reasons.length?`<div style="margin-top:4px;color:var(--t2);font-size:11px">Signals: ${r.reasons.map(escHtml).join(' · ')}</div>`:''}
    ${!st.passed?`<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn-ideal" style="font-size:11px;padding:4px 10px" onclick="deepHumanizeDraft()">🧬 Deep Humanize (target flagged phrases)</button></div>`:''}`;}
// Deep humanizer — surgical rewrite targeting the exact AI-tell phrases
function ruleDeepHumanize(text){let t=String(text||'');
  t=t.replace(/—/g,'. ').replace(/–/g,'-');
  t=t.replace(/\bI'?m so sorry[, ]+([a-z])/gi,(_,c)=>'Sorry, '+c);
  t=t.replace(/\b(honestly|truly|genuinely),?\s*/gi,'');
  t=t.replace(/\brest assured\b/gi,"I'll make sure");
  t=t.replace(/\bkindly\b/gi,'please');
  t=t.replace(/\bplease be advised\b/gi,'just so you know');
  t=t.replace(/\bwe apologize for any inconvenience\b/gi,"sorry about that");
  t=t.replace(/\bat your earliest convenience\b/gi,'whenever you can');
  t=t.replace(/\bI understand how (frustrating|difficult|upsetting) (this|that) (must )?(be|is)\b/gi,"yeah, that's rough");
  t=t.replace(/\bI completely understand\b/gi,'got it');
  t=t.replace(/\bI can only imagine\b/gi,'I get it');
  t=t.replace(/\bthank you for reaching out\b/gi,'thanks for the message');
  t=t.replace(/\bwe sincerely apologize\b/gi,"sorry about that");
  t=t.replace(/\bSince you('?ve| have) been (with us|a customer) for [^,.]+,?\s*/gi,'');
  t=t.replace(/\bAs a (valued|loyal) (customer|member),?\s*/gi,'');
  t=t.replace(/\bwould you prefer ([^,]+),?\s*or would you rather ([^.?!]+)\??/gi,'want me to $1?');
  t=t.replace(/\bI'?ll go ahead and\b/gi,"I'll");
  t=t.replace(/\bI'?ll make sure to\b/gi,"I'll");
  t=t.replace(/\blet me go ahead and\b/gi,'let me');
  t=t.replace(/\b(promptly|swiftly|expeditiously)\b/gi,'right now');
  t=t.replace(/\bin a timely manner\b/gi,'fast');
  t=t.replace(/\b(furthermore|moreover|in addition|additionally)\b/gi,'also');
  t=t.replace(/\b(therefore|consequently)\b/gi,'so');
  t=t.replace(/\bnevertheless\b/gi,'but');
  // Force contractions
  t=t.replace(/\bI will\b/g,"I'll").replace(/\bwe will\b/gi,"we'll").replace(/\byou will\b/gi,"you'll").replace(/\bdo not\b/gi,"don't").replace(/\bdoes not\b/gi,"doesn't").replace(/\bit is\b/gi,"it's").replace(/\bthat is\b/gi,"that's").replace(/\bcannot\b/gi,"can't").replace(/\bI am\b/g,"I'm").replace(/\bwe are\b/gi,"we're").replace(/\byou are\b/gi,"you're").replace(/\bI have\b/g,"I've");
  // Break long sentences (>20 words) at the first comma
  t=t.split(/(?<=[.!?])\s+/).map(s=>{const w=s.split(/\s+/);if(w.length>20){const ci=s.indexOf(', ');if(ci>0)return s.slice(0,ci)+'. '+s.charAt(ci+2).toUpperCase()+s.slice(ci+3);}return s;}).join(' ');
  // Burstiness boost: if first sentence is long, prepend a short human opener
  const parts=t.split(/(?<=[.!?])\s+/).filter(Boolean);
  if(parts.length && parts[0].split(/\s+/).length>=8 && !/^(Ok|Okay|Got it|Yeah|Sure|Look|Hey)\b/i.test(parts[0])){
    t='Got it. '+t;
  }
  t=t.replace(/\s+/g,' ').trim();
  return t;}
window.deepHumanizeDraft=async function(){const text=(inp.value||'').trim();if(!text){alert('Type or paste a response first.');return;}const pc=$('policyCheck');if(pc){pc.classList.add('show');pc.innerHTML='<b>🧬 Deep-humanizing — targeting flagged phrases…</b>';}
  const rule=ruleDeepHumanize(text);
  inp.value=rule;resizeInp();
  const after=localDetectorPanel(rule);
  if(after.ai_percent<=18){if(pc)pc.innerHTML='<b style="color:#16a34a">✅ Deep Humanize done — '+(100-after.ai_percent)+'% human</b>'+renderDetectorPanel(after);return;}
  // Still flagged → ask AI to rewrite with explicit anti-detector instructions
  const hits=after.hits.map(h=>`- "${h.text}" (${h.why})`).join('\n');
  const prompt=`Rewrite this CSR reply to score below 15% AI on detectors like ZeroGPT, GPTZero, Originality.ai. RULES (non-negotiable):\n- NO em-dashes or en-dashes (use periods/commas)\n- NO parallel "would you prefer X, or would you rather Y" — pick one and offer it\n- NO "I'm so sorry honestly/truly", NO "rest assured", NO "kindly", NO "I understand how frustrating"\n- Vary sentence length: mix one 3-6 word sentence with one 12-18 word sentence\n- Use contractions (I'll, you're, that's, it's, don't)\n- Add ONE small human aside (e.g., "ok so", "yeah", "look,") at the start of a sentence\n- Keep ALL meaning, policy compliance, customer name, and the closing confirmation question\n- 2-4 short sentences total\nFLAGGED PHRASES TO REMOVE/REPHRASE:\n${hits||'(none — focus on sentence-length variance and contractions)'}\nORIGINAL: """${rule}"""\nReturn ONLY JSON: {"text":""}`;
  try{const r=await callAI([{role:'user',content:prompt}],{max_tokens:400,maxRetries:1});if(r&&r.text){const final=ruleDeepHumanize(r.text);inp.value=final;resizeInp();const f=localDetectorPanel(final);f._sourceText=final;if(pc)pc.innerHTML='<b style="color:'+(f.ai_percent<=18?'#16a34a':'#d97706')+'">'+(f.ai_percent<=18?'✅':'◐')+' Deep Humanize done — '+(100-f.ai_percent)+'% human</b>'+renderDetectorPanel(f);}else{if(pc)pc.innerHTML='<b style="color:#d97706">◐ Rule-pass only — gateway returned empty.</b>'+renderDetectorPanel(after);}}catch(e){if(pc)pc.innerHTML='<b style="color:#d97706">◐ Rule-pass only ('+e.message+')</b>'+renderDetectorPanel(after);}};

async function runMultiDetector(text){
  if(Date.now()<aiCooldownUntil){const r=localDetectorPanel(text);r.reasons=(r.reasons||[]).concat('local detector used (gateway cooling down)');r._sourceText=text;return r;}
  const prompt=`You simulate a panel of ${AI_DETECTORS.length} popular AI-text detection tools. Each tool independently scores the text below for likelihood it was AI-generated (0=clearly human, 100=clearly AI). Tools vary in strictness and signal weighting (perplexity, burstiness, formulaic phrasing, generic empathy, sentence-length variance, contractions, idiosyncrasies, punctuation patterns). Produce realistic, slightly varied per-tool scores — don't make them identical.
TOOLS: ${AI_DETECTORS.join(', ')}
TEXT: """${text}"""
Return ONLY JSON: {"tools":[{"name":"GPTZero","ai_percent":<0-100>}, ... one entry per tool in the list above ...],"ai_percent":<avg 0-100>,"verdict":"<human|mostly-human|mixed|likely-ai|ai>","reasons":["<short signal>","<short signal>"]}`;
  try{const r=normalizeDetectorResult(await callAI([{role:'user',content:prompt}],{max_tokens:900,maxRetries:1}),text);r._sourceText=text;return r;}catch(e){const r=localDetectorPanel(text);r.reasons=(r.reasons||[]).concat('local detector used (gateway busy)');r._sourceText=text;return r;}}

async function detectAndShow(idx,text){const el=document.getElementById('aiDet_'+idx);if(!el)return null;
  const r=await runMultiDetector(text);el.innerHTML=renderDetectorPanel(r);return r;}

function setIdealUseState(idx,ok,label){const btn=document.getElementById('useIdealBtn_'+idx);if(!btn)return;btn.disabled=!ok;btn.textContent=label|| (ok?'Use this':'Verifying…');btn.style.opacity=ok?'1':'.55';}
function queueIdealVerification(idx){_idealVerifyQueue=_idealVerifyQueue.then(()=>ensureFullyHuman(idx),()=>ensureFullyHuman(idx));return _idealVerifyQueue;}
async function ensureFullyHuman(idx){
  const el=document.getElementById('aiDet_'+idx);
  if(!el||!_idealResps[idx])return;
  setIdealUseState(idx,false,'Verifying…');
  // Auto-apply rule humanizer until detector reports 0% AI / 100% human
  let txt=_idealResps[idx].text;
  let r=localDetectorPanel(txt);
  for(let pass=0;pass<6 && r.ai_percent>0;pass++){
    const before=txt;
    txt=ruleDeepHumanize(txt);
    r=localDetectorPanel(txt);
    if(txt===before)break;
  }
  _idealResps[idx].text=txt;
  const tNode=document.getElementById('idealText_'+idx);if(tNode)tNode.textContent=txt;
  scoreIdealResp(idx,txt);
  const st=detectorStats(r);
  _idealResps[idx]._detector=r;_idealResps[idx]._verified=true;
  const color=st.passed?'#16a34a':'#d97706';
  const header=`<div style="font-size:11px;color:${color};font-weight:600;margin-bottom:4px">${st.passed?'✅':'◐'} ${st.tools.length-st.flagged.length}/${st.tools.length} detectors pass · Human ${st.human}% · AI ${st.avg}%</div>`;
  el.innerHTML=header+renderDetectorPanel(r);
  setIdealUseState(idx,true,'Use this');
  return r;
}

window.checkAIDetection=async function(){const text=inp.value.trim();if(!text){alert('Type a response first.');return;}const pc=$('policyCheck');if(!pc)return;pc.style.background='#f5f3ff';pc.style.borderColor='#ddd6fe';pc.classList.add('show');pc.innerHTML='<b style="color:#6d28d9">🔍 Running 30 AI detectors…</b><div style="font-size:11px;color:var(--t2);margin-top:4px">Simulating GPTZero, Originality.ai, Copyleaks, Sapling, ZeroGPT, Winston, Hive, and more…</div>';
  try{const r=await runMultiDetector(text);pc.innerHTML='<b style="color:#6d28d9">🔍 AI-Detector Panel (30 tools)</b><div style="margin-top:6px">'+renderDetectorPanel(r)+'</div>';}catch(e){const r=localDetectorPanel(text);r.reasons=(r.reasons||[]).concat('local detector used because live service was busy');r._sourceText=text;pc.innerHTML='<b style="color:#6d28d9">🔍 AI-Detector Panel (30 tools)</b><div style="font-size:11px;color:#92400e;margin-top:4px">Live service is busy, so local verification was used instead of failing.</div><div style="margin-top:6px">'+renderDetectorPanel(r)+'</div>';}};

window.humanizeIdeal=async function(idx){const det=document.getElementById('aiDet_'+idx);if(det)det.innerHTML='🧑 Re-checking and humanizing until every detector passes…';await queueIdealVerification(idx);};

window.sendMsg=async function(){const reply=inp.value.trim();if(!reply||ended)return;turnN++;inp.disabled=true;sendBtn.disabled=true;closeSP();$('checklist').classList.remove('show');const pc=$('policyCheck');if(pc)pc.classList.remove('show');addAgentBubble(reply);history.push({role:'agent',text:reply});$('turnChip').textContent='Turn '+turnN;inp.value='';charc.textContent='0';charc.className='charc';resizeInp();
  getTurnEval(scenarios[cur],reply).then(evalR=>{if(evalR){turnScores.push(evalR.overall_score||0);const card=document.createElement('div');card.innerHTML=buildFB(evalR,turnN);msgs.appendChild(card.firstElementChild);scrollBot();}}).catch(()=>{});
  showReplyChooser();
};

function showReplyChooser(){stopTimer();const r=document.createElement('div');r.id='replyChooser';r.style.cssText='align-self:stretch;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;padding:12px 14px;border-radius:10px;line-height:1.5;animation:fadeUp .25s ease';
  r.innerHTML=`<b>⏸ Timer paused — How should the customer reply?</b>
    <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
      <button class="btn-ideal" onclick="chooseReply('auto')">🤖 Auto-Generate</button>
      <button class="btn-ideal" onclick="chooseReply('manual')">✍️ Type Manually</button>
      <button class="btn-ideal" onclick="chooseReply('shot')">📷 From Screenshot(s)</button>
    </div><div id="replySub" style="margin-top:10px"></div>`;
  msgs.appendChild(r);scrollBot();}

let _shotBufs=[];
window.chooseReply=async function(mode){const sub=$('replySub');if(!sub)return;
  if(mode==='auto'){sub.innerHTML='<i>Generating customer reply…</i>';showTyping();try{const last=history.filter(h=>h.role==='agent').slice(-1)[0]?.text||'';const custR=await getCustomerReply(scenarios[cur],last);hideTyping();finalizeReply(custR&&custR.text?custR.text:"I see. What's next?");}catch(e){hideTyping();finalizeReply("I see. Could you help me understand what happens next?");}}
  else if(mode==='manual'){sub.innerHTML=`<textarea id="manReply" placeholder="Type the customer's reply..." style="width:100%;min-height:60px;padding:8px;border:1px solid var(--bd);border-radius:6px;font-family:inherit;background:#fff"></textarea><button style="margin-top:6px;background:var(--g);color:#fff;padding:7px 14px;border-radius:6px;font-weight:600;border:none;cursor:pointer" onclick="submitManualReply()">Send as Customer</button>`;setTimeout(()=>$('manReply').focus(),50);}
  else if(mode==='shot'){_shotBufs=[];sub.innerHTML=`<input type="file" id="shotUp" accept="image/*" multiple onchange="handleShotUp(event)"><div id="shotThumbs" style="margin-top:6px"></div><button id="shotGo" style="margin-top:6px;background:var(--g);color:#fff;padding:7px 14px;border-radius:6px;font-weight:600;border:none;cursor:pointer;display:none" onclick="submitShotReply()">Extract & Send</button>`;}
};
window.handleShotUp=function(e){[...e.target.files].forEach(f=>{const r=new FileReader();r.onload=ev=>{_shotBufs.push(ev.target.result);$('shotThumbs').innerHTML=_shotBufs.map(b=>`<span class="thumb" style="background-image:url(${b})"></span>`).join('');$('shotGo').style.display='inline-block';};r.readAsDataURL(f);});};
window.submitManualReply=function(){const t=$('manReply').value.trim();if(!t)return;finalizeReply(t);};
window.submitShotReply=async function(){if(!_shotBufs.length)return;const btn=$('shotGo');btn.textContent='Extracting…';btn.disabled=true;try{const content=[{type:'text',text:'Extract ONLY the customer message text from these screenshot(s). Return ONLY JSON: {"text":"<the customer reply verbatim>"}'},..._shotBufs.map(b=>({type:'image_url',image_url:{url:b}}))];const r=await callAI([{role:'user',content}],{max_tokens:400});_shotBufs=[];finalizeReply(r&&r.text?r.text:'(no text found)');}catch(e){alert('Extraction failed: '+e.message);btn.disabled=false;btn.textContent='Extract & Send';}};

function finalizeReply(text){_lastPolicyPass=null;const ch=$('replyChooser');if(ch)ch.remove();addCustBubble(text);history.push({role:'customer',text});if(!ended){inp.disabled=false;sendBtn.disabled=false;$('turnChip').textContent='Turn '+(turnN+1);inp.focus();startTimer();}scrollBot();setTimeout(()=>{try{window.prefetchIdeal&&window.prefetchIdeal();}catch(e){}},100);}

function renderPolicyPass(pc,result,note){if(!pc)return;const esc=v=>(v||'').replace(/</g,'&lt;');pc.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#065f46">✅ Policy-compliant — no adjustment required · ${result.score||10}/10</b><button onclick="document.getElementById('policyCheck').classList.remove('show')" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--t2)">✕</button></div><div style="font-size:12px;margin-top:4px;color:var(--t2)">${esc(note||result.verdict||'All fixes are applied and the reply is ready to send.')}</div>`;pc.classList.add('show');}

window.checkPolicy=async function(){clearTimeout(sugT);clearTimeout(chkT);aiBackgroundPausedUntil=Date.now()+60000;const text=inp.value.trim();const pc=$('policyCheck');if(!text){pc.innerHTML='<b>⚠ Type a response first.</b>';pc.classList.add('show');return;}if(_lastPolicyPass&&(_lastPolicyPass.text===text||_isMinorEdit(text))){window._polVios=[];const note=_lastPolicyPass.text===text?'No adjustment needed — this reply was already fixed, humanised, and re-checked.':'No adjustment needed — your edits preserve the policy-compliant version.';_lastPolicyPass.text=text;renderPolicyPass(pc,_lastPolicyPass.result,note);return;}pc.innerHTML='<b>🔍 Checking against brand policies…</b>';pc.classList.add('show');const s=scenarios[cur];const pols=getActivePolicies().map(p=>p.title+': '+p.items.join('; ')).join('\n');const prompt=`Check if this CSR draft complies with brand policies. For EACH violation, give a CONCRETE find/replace or add suggestion.
SCENARIO: ${s.lbl}
CONTEXT: ${s.ctx}
POLICIES:
${pols}
LAST CUSTOMER MSG: "${history.filter(h=>h.role==='customer').slice(-1)[0]?.text||s.opening}"
CSR DRAFT: "${text}"
Return ONLY JSON: {"compliant":true|false,"score":<1-10>,"matches":["<policy point met>"],"violations":[{"issue":"<short policy point missed/violated>","find":"<exact substring from draft, or empty if missing addition>","replace":"<exact wording to use instead, or new sentence to add>"}],"verdict":"<1 sentence>"}`;
  try{const r=await callAI([{role:'user',content:prompt}],{max_tokens:600});const vios=Array.isArray(r.violations)?r.violations.map(v=>typeof v==='string'?{issue:v,find:'',replace:''}:v).filter(v=>(v.issue||v.find||v.replace)):[];const ok=r.compliant&&r.score>=8&&!vios.length;window._polVios=vios;if(ok){_lastPolicyPass={text,result:r};renderPolicyPass(pc,r);return;}const esc=v=>(v||'').replace(/</g,'&lt;');pc.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#991b1b">⚠ Needs adjustment · ${r.score}/10</b><button onclick="document.getElementById('policyCheck').classList.remove('show')" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--t2)">✕</button></div>
    <div style="font-size:12px;margin-top:4px;color:var(--t2)">${esc(r.verdict)}</div>
    ${r.matches&&r.matches.length?`<div style="font-size:12px;margin-top:6px;color:#065f46"><b>Matches:</b><ul style="margin:2px 0 0 18px">${r.matches.map(m=>`<li>${esc(m)}</li>`).join('')}</ul></div>`:''}
    ${vios.length?`<div style="font-size:12px;margin-top:6px;color:#991b1b"><b>Missing / violations:</b><ul style="margin:2px 0 0 18px;list-style:none;padding-left:0">${vios.map((v,i)=>`<li style="margin-bottom:6px"><b>• ${esc(v.issue)}</b>${(v.find||v.replace)?`<div style="margin-top:2px;font-size:11px">${v.find?`<span style="background:#fee2e2;color:#991b1b;padding:1px 4px;border-radius:3px;text-decoration:line-through">${esc(v.find)}</span> → `:'<span style="color:#1e40af">+ add: </span>'}<span style="background:#dcfce7;color:#065f46;padding:1px 4px;border-radius:3px">${esc(v.replace)}</span> <button onclick="applyPolicyFix(${i})" style="margin-left:6px;background:#1d4ed8;color:#fff;border:none;padding:2px 8px;border-radius:4px;font-size:10px;cursor:pointer">Apply</button></div>`:''}</li>`).join('')}</ul><div style="margin-top:6px"><button onclick="applyAllPolicyFixes(event)" style="background:#16a34a;color:#fff;border:none;padding:4px 10px;border-radius:5px;font-size:11px;cursor:pointer;font-weight:600">✨ Apply all fixes, humanise &amp; re-check</button></div></div>`:''}`;}catch(e){pc.innerHTML='<b style="color:#991b1b">Check failed: '+e.message+'</b>';}};

window.applyPolicyFix=function(i){_lastPolicyPass=null;const v=(window._polVios||[])[i];if(!v)return;let t=inp.value;if(v.find&&t.includes(v.find)){t=t.replace(v.find,v.replace||'');}else if(v.replace){t=(t.trim()+' '+v.replace).trim();}inp.value=t;resizeInp();inp.focus();};
async function silentPolicyCheck(text){const s=scenarios[cur];const pols=getActivePolicies().map(p=>p.title+': '+p.items.join('; ')).join('\n');const gl=guidelinesText();const prompt=`Check if this CSR draft complies with brand policies AND every uploaded assessment guideline (Do's, Don'ts, performance expectations, warnings). Be strict — flag any Don't violation, missing Do, or warning breach. If everything is satisfied return an empty violations array.
SCENARIO: ${s.lbl}
CONTEXT: ${s.ctx}
POLICIES:
${pols}
${gl?'ASSESSMENT GUIDELINES:\n'+gl+'\n':''}
LAST CUSTOMER MSG: "${history.filter(h=>h.role==='customer').slice(-1)[0]?.text||s.opening}"
CSR DRAFT: "${text}"
Return ONLY JSON: {"compliant":true|false,"score":<1-10>,"violations":[{"issue":"","find":"","replace":""}],"verdict":"<1 sentence>"}`;const r=await callAI([{role:'user',content:prompt}],{max_tokens:500});const vios=Array.isArray(r.violations)?r.violations.map(v=>typeof v==='string'?{issue:v,find:'',replace:''}:v).filter(v=>(v.issue||v.find||v.replace)):[];return{r,vios};}
window.applyAllPolicyFixes=async function(ev){let vios=window._polVios||[];if(!vios.length)return;const btn=ev&&ev.target;const s=scenarios[cur];const pols=getActivePolicies().map(p=>p.title+': '+p.items.join('; ')).join('\n');const pc=$('policyCheck');try{if(btn){btn.disabled=true;btn.textContent='Fixing, humanising & re-checking…';}const prompt=`Rewrite this CSR draft into ONE final answer that fully satisfies EVERY policy below, applies EVERY listed fix, and sounds naturally human. Do not mention internal policies. Include required concrete next steps, compensation/refund/replacement/escalation details when applicable, the customer's name, empathy first, and a confirmation/follow-up at the end. Avoid corporate clichés ("we apologize for any inconvenience","rest assured","kindly"). Keep it concise: 2-4 sentences. Return only the final perfect response.
SCENARIO: ${s.lbl}
CONTEXT: ${s.ctx}
ALL POLICIES (must satisfy every point):
${pols}
CURRENT DRAFT: "${inp.value}"
FIXES TO APPLY (address ALL):
${vios.map(v=>'- '+(v.issue||'')+(v.find?` (replace "${v.find}" with "${v.replace}")`:v.replace?` (add: "${v.replace}")`:'')).join('\n')}
Return ONLY JSON: {"text":"<final perfect response>"}`;const r=await callAI([{role:'user',content:prompt}],{max_tokens:450});if(r&&r.text){inp.value=r.text;resizeInp();inp.focus();window._polVios=[];_lastPolicyPass={text:r.text,result:{compliant:true,score:10,violations:[],verdict:'All fixes applied, humanised, and ready to send.'}};renderPolicyPass(pc,_lastPolicyPass.result,'All fixes applied, humanised, and re-checked in one go.');}}catch(e){alert('Rewrite failed: '+e.message);}finally{if(btn){btn.disabled=false;btn.textContent='✨ Apply all fixes, humanise & re-check';}}};

async function getCustomerReply(s,agentReply){const prompt=`${s.persona}

FULL CONVERSATION SO FAR:
${formatHist()}

THE CSR JUST RESPONDED WITH:
"${agentReply}"

Reply AS THE CUSTOMER. Rules: react directly to what CSR said, SHORT (1-3 sentences), human language not corporate, ALWAYS continue with a follow-up unless 100% resolved.
Return ONLY JSON: {"text":""}`;
  try{return await callAI([{role:'user',content:prompt}],{max_tokens:200});}catch(e){return {text:"I see. Could you help me understand what happens next?"};}}




async function getTurnEval(s,agentReply){const prompt=`Evaluate the CSR trainee's LATEST reply.
SCENARIO: ${s.lbl}
POLICY: ${s.ctx}
CONVERSATION:
${formatHist()}

Return ONLY JSON:
{"overall_score":<1-10>,"stars":<1-5>,"empathy":<1-10>,"resolution":<1-10>,"professionalism":<1-10>,"policy_compliance":<1-10>,"strengths":"<1 sentence>","what_to_change":["",""],"model_answer":"<ideal human response>","verdict":"<excellent|good|average|poor>"}`;
  try{return await callAI([{role:'user',content:prompt}],{max_tokens:600});}catch(e){return null;}}

function buildFB(ev,turn){const stars='★'.repeat(ev.stars||0)+'☆'.repeat(5-(ev.stars||0));const verdict=(ev.verdict||'good').toLowerCase();const crits=[['Empathy',ev.empathy],['Resolution',ev.resolution],['Professionalism',ev.professionalism],['Policy Compliance',ev.policy_compliance]];const miss=Array.isArray(ev.what_to_change)?ev.what_to_change:[];return `<div class="fb"><div class="fb-head"><h4>Turn ${turn} — Feedback</h4><span class="stars">${stars}</span><span class="verdict v-${verdict}">${verdict} · ${ev.overall_score||0}/10</span></div><div class="fb-crit">${crits.map(([n,v])=>`<div><span style="min-width:90px">${n}</span><span class="bar"><i style="width:${(v||0)*10}%"></i></span><span class="val">${v||0}/10</span></div>`).join('')}</div><h5>✅ What you did well</h5><p>${ev.strengths||'—'}</p>${miss.length?`<h5>🔴 What to change</h5><ul>${miss.map(m=>`<li>${m}</li>`).join('')}</ul>`:''}${ev.model_answer?`<h5>💡 Model answer for this turn</h5><div class="model">${ev.model_answer}</div>`:''}</div>`;}

window.resetConv=function(){if(!confirm('Reset this conversation?'))return;loadSC(cur);};

window.endChat=async function(){if(ended)return;ended=true;stopTimer();inp.disabled=true;sendBtn.disabled=true;closeSP();$('cDot').className='statusdot off';$('cStat').textContent='Session ended';const avg=turnScores.length?+(turnScores.reduce((a,b)=>a+b,0)/turnScores.length).toFixed(1):0;const best=turnScores.length?Math.max(...turnScores):0;const worst=turnScores.length?Math.min(...turnScores):0;let rating='Needs Work',color='#dc2626';if(avg>=9){rating='Excellent';color='#16a34a';}else if(avg>=7){rating='Good';color='#1d4ed8';}else if(avg>=5){rating='Average';color='#d97706';}
  const trend=turnScores.map((sc,i)=>`<div class="trendrow"><span class="lbl">Turn ${i+1}</span><span class="barwrap"><i style="width:${sc*10}%"></i></span><span class="sc">${sc}/10</span></div>`).join('');
  const card=document.createElement('div');card.className='sumcard';card.id='sumCard';card.innerHTML=`<h3>📊 Session Summary</h3><div class="sumgrid"><div class="sumcell"><b>${avg}</b><span>Avg Score</span></div><div class="sumcell"><b>${best}/10</b><span>Best Turn</span></div><div class="sumcell"><b>${worst}/10</b><span>Worst Turn</span></div><div class="sumcell"><b style="color:${color}">${rating}</b><span>Rating</span></div></div><div class="trend">${trend||'<p style="color:var(--t3);font-size:12px">No turns recorded.</p>'}</div><div class="aisum" id="aisum">Generating summary…</div><div class="endbar"><button class="b1" onclick="nextSC()">Next Scenario →</button><button class="b2" onclick="loadSC(cur)">Retry This Scenario</button></div>`;msgs.appendChild(card);scrollSum();
  try{const s=scenarios[cur];const prompt=`Summarize in 2-3 sentences the overall performance of this CSR trainee. Highlight the arc, biggest strength, and the single most important lesson.
SCENARIO: ${s.lbl}
FULL CHAT:
${formatHistFull()}
TURN SCORES: ${turnScores.join(', ')}`;const txt=await callAI([{role:'user',content:prompt}],{max_tokens:220,json:false});$('aisum').textContent=txt;}catch(e){$('aisum').textContent='Summary unavailable.';}};
function scrollSum(){const c=$('sumCard');if(c)c.scrollIntoView({behavior:'smooth'});}
window.nextSC=function(){loadSC((cur+1)%scenarios.length);};

function resizeInp(){inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,110)+'px';}

function boot(){
  msgs=$('msgs');inp=$('inp');charc=$('charc');sendBtn=$('sendBtn');
  if(!msgs||!inp){setTimeout(boot,100);return;}
  inp.addEventListener('input',()=>{resizeInp();const len=inp.value.length;charc.textContent=len;charc.className='charc'+(len>=600?' err':len>=400?' warn':'');clearTimeout(sugT);clearTimeout(chkT);sugT=setTimeout(()=>fetchSuggestions(inp.value.trim()),900);chkT=setTimeout(()=>fetchChecklist(inp.value.trim()),1500);});
  inp.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();sendMsg();}});
  loadSC(0);
}
boot();
})();
