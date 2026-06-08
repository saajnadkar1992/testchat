import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CSR Live Practice Simulator" },
      { name: "description", content: "Practice customer support live chat with AI-driven customers, real-time coaching, and per-turn feedback." },
      { property: "og:title", content: "CSR Live Practice Simulator" },
      { property: "og:description", content: "Practice customer support live chat with AI-driven customers, real-time coaching, and per-turn feedback." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    // Boot the simulator once after mount
    if ((window as unknown as { __csrBooted?: boolean }).__csrBooted) return;
    (window as unknown as { __csrBooted?: boolean }).__csrBooted = true;
    const s = document.createElement("script");
    s.src = "/csr.js";
    s.defer = true;
    document.body.appendChild(s);
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div dangerouslySetInnerHTML={{ __html: BODY }} />
    </>
  );
}

const CSS = `
:root{--g:#25c97a;--gd:#17a362;--gl:rgba(37,201,122,.12);--bg:#f4f6fb;--w:#fff;--bd:#e3e8f0;--t:#0f172a;--t2:#5b6578;--t3:#9ca3b0;--cin:#edf0f7;--cout:#25c97a;--sb:#fffbee;--sbd:#fde68a;--st:#92400e;}
html,body{height:100%;margin:0;padding:0}
body{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--t);font-size:14px;overflow:hidden}
.csr-app *{box-sizing:border-box}
.csr-app button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
.csr-app input,.csr-app textarea{font-family:inherit;font-size:14px;color:var(--t)}
.app{display:flex;height:100vh;width:100vw}
.main{flex:1;display:flex;flex-direction:column;min-width:0;background:var(--w);border-right:1px solid var(--bd)}
.side{width:295px;flex-shrink:0;background:var(--w);display:flex;flex-direction:column;overflow:hidden}
.topbar{display:flex;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid var(--bd);background:var(--w)}
.logo{width:36px;height:36px;border-radius:9px;background:var(--g);color:#fff;display:grid;place-items:center;font-weight:700;font-size:18px;flex-shrink:0}
.titles{flex:1;min-width:0}
.titles h1{font-size:15px;font-weight:600;line-height:1.2;margin:0}
.titles p{font-size:12px;color:var(--t2);margin:1px 0 0}
.chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:#f1f4f9;font-size:12px;font-weight:500;color:var(--t2);border:1px solid var(--bd)}
.chip.timer{font-family:'DM Mono',monospace}
.chip.urg{background:#fee2e2;color:#991b1b;border-color:#fecaca}
.chip.urg .dot{width:6px;height:6px;border-radius:50%;background:#dc2626;animation:blink 1s infinite}
.btn-end{background:#dc2626;color:#fff;padding:8px 14px;border-radius:8px;font-weight:600;font-size:13px}
.btn-end:hover{background:#b91c1c}
.btn-reset{background:#f1f4f9;color:var(--t);padding:8px 12px;border-radius:8px;font-weight:500;font-size:13px;border:1px solid var(--bd)}
.btn-reset:hover{background:#e3e8f0}
.btn-ideal{background:#eff6ff;color:#1d4ed8;padding:8px 12px;border-radius:8px;font-weight:600;font-size:13px;border:1px solid #bfdbfe}
.btn-ideal:hover{background:#dbeafe}
.cstrip{display:flex;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid var(--bd);background:#fafbfd}
.avatar{width:38px;height:38px;border-radius:50%;background:var(--g);color:#fff;display:grid;place-items:center;font-weight:600;font-size:14px;flex-shrink:0}
.cinfo{flex:1;min-width:0}
.cinfo .name{font-weight:600;font-size:14px}
.cinfo .role{font-size:12px;color:var(--t2)}
.status{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t2)}
.statusdot{width:8px;height:8px;border-radius:50%;background:#22c55e}
.statusdot.typing{background:#f59e0b;animation:blink 1s infinite}
.statusdot.off{background:#9ca3b0}
.msgs{flex:1;overflow-y:auto;padding:18px 22px;display:flex;flex-direction:column;gap:10px;background:#fafbfd}
.ts{align-self:center;font-size:11px;color:var(--t3);margin:6px 0}
.sysmsg{align-self:center;font-size:12px;color:var(--t2);background:var(--w);padding:6px 12px;border-radius:999px;border:1px solid var(--bd)}
.row{display:flex;gap:8px;max-width:78%;animation:fadeUp .25s ease}
.row.cust{align-self:flex-start}
.row.agent{align-self:flex-end;flex-direction:row-reverse}
.bubble{padding:10px 14px;border-radius:14px;line-height:1.45;font-size:14px;word-wrap:break-word;white-space:pre-wrap}
.row.cust .bubble{background:var(--cin);color:var(--t);border-radius:14px 14px 14px 3px}
.row.agent .bubble{background:var(--cout);color:#fff;border-radius:14px 14px 3px 14px}
.avatar-sm{width:28px;height:28px;border-radius:50%;background:var(--g);color:#fff;display:grid;place-items:center;font-weight:600;font-size:11px;flex-shrink:0;align-self:flex-end}
.avatar-sm.you{background:#0f172a}
.typing{display:flex;gap:4px;padding:14px 16px;background:var(--cin);border-radius:14px 14px 14px 3px;align-items:center}
.typing span{width:6px;height:6px;background:#9ca3b0;border-radius:50%;animation:dotPulse 1.1s infinite}
.typing span:nth-child(2){animation-delay:.15s}
.typing span:nth-child(3){animation-delay:.3s}
.fb{align-self:stretch;max-width:100%;background:var(--w);border:1px solid var(--bd);border-radius:12px;padding:14px 16px;animation:fadeUp .25s ease;box-shadow:0 1px 2px rgba(0,0,0,.03)}
.fb-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.fb-head h4{font-size:13px;font-weight:600;margin:0}
.fb-head .stars{color:#f59e0b;font-size:14px;letter-spacing:1px}
.verdict{padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;text-transform:capitalize}
.v-excellent{background:#d1fae5;color:#065f46}
.v-good{background:#dbeafe;color:#1d4ed8}
.v-average{background:#fef3c7;color:#92400e}
.v-poor{background:#fee2e2;color:#991b1b}
.fb-crit{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin:10px 0;padding:10px 0;border-top:1px solid var(--bd);border-bottom:1px solid var(--bd)}
.fb-crit > div{display:flex;align-items:center;gap:8px;font-size:12px}
.fb-crit .bar{flex:1;height:5px;background:#f1f4f9;border-radius:3px;overflow:hidden}
.fb-crit .bar i{display:block;height:100%;background:var(--g)}
.fb-crit .val{font-weight:600;color:var(--t);min-width:30px;text-align:right}
.fb h5{font-size:12px;font-weight:600;margin:8px 0 4px;color:var(--t)}
.fb p,.fb li{font-size:13px;color:var(--t2);line-height:1.5}
.fb ul{margin-left:18px}
.fb .model{background:#f0fdf4;border-left:3px solid var(--g);padding:8px 10px;border-radius:6px;margin-top:8px;font-style:italic;color:var(--t)}
.coach{margin:0 18px 8px;background:var(--sb);border:1px solid var(--sbd);border-radius:10px;padding:10px 12px;display:none;animation:fadeUp .25s ease}
.coach.show{display:block}
.coach-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.coach-head b{font-size:12px;color:var(--st);font-weight:600}
.coach-head button{font-size:14px;color:var(--st);padding:0 4px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.cchip{padding:5px 10px;background:#fff;border:1px solid var(--sbd);border-radius:999px;font-size:12px;color:var(--st);cursor:pointer;transition:all .15s}
.cchip:hover{background:#fef3c7}
.cchip.used{opacity:.35;pointer-events:none}
.hint{font-size:12px;color:var(--st);line-height:1.4}
.checklist{margin:0 18px 8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 12px;display:none;animation:fadeUp .25s ease}
.checklist.show{display:block}
.checklist b{font-size:12px;color:#1e40af;display:block;margin-bottom:6px}
.checklist ul{list-style:none;font-size:12px;color:#1e3a8a;margin:0;padding:0}
.checklist li{padding:3px 0;display:flex;gap:6px;align-items:flex-start}
.checklist li::before{content:"•";color:#3b82f6;font-weight:700}
.inputwrap{padding:10px 18px 14px;border-top:1px solid var(--bd);background:var(--w)}
.inputrow{display:flex;gap:8px;align-items:flex-end;background:#fafbfd;border:1px solid var(--bd);border-radius:12px;padding:8px;position:relative}
.inputrow:focus-within{border-color:var(--g)}
textarea#inp{flex:1;min-height:44px;max-height:110px;border:none;background:transparent;outline:none;resize:none;padding:8px 60px 8px 8px;line-height:1.4}
.charc{position:absolute;right:74px;bottom:14px;font-size:11px;color:var(--t3);font-family:'DM Mono',monospace}
.charc.warn{color:#d97706}.charc.err{color:#dc2626}
.btn-send{background:var(--g);color:#fff;width:46px;height:44px;border-radius:9px;display:grid;place-items:center;font-size:18px;flex-shrink:0}
.btn-send:hover{background:var(--gd)}
.btn-send:disabled{opacity:.5;cursor:not-allowed}
.inputmeta{display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:11px;color:var(--t3);padding:0 4px}
.inputmeta .on{color:var(--g);font-weight:500}
.tabs{display:flex;border-bottom:1px solid var(--bd)}
.tab{flex:1;padding:12px 8px;font-size:12px;font-weight:500;color:var(--t2);border-bottom:2px solid transparent;text-align:center}
.tab.active{color:var(--g);border-bottom-color:var(--g)}
.tabpane{display:none;flex:1;overflow-y:auto;padding:16px}
.tabpane.active{display:block}
.bigavatar{width:60px;height:60px;border-radius:50%;background:var(--g);color:#fff;display:grid;place-items:center;font-weight:600;font-size:22px;margin:0 auto 10px}
.cname{text-align:center;font-weight:600;font-size:16px;margin-bottom:4px}
.cbadge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;margin:0 auto;text-transform:capitalize}
.badge-row{text-align:center;margin-bottom:14px}
.badge-premium{background:#ede9fe;color:#6d28d9}
.badge-standard{background:#f1f4f9;color:#475569}
.sect{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--bd)}
.sect:last-child{border-bottom:none}
.sect h4{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin-bottom:8px;font-weight:600}
.kv{font-size:12px;margin-bottom:5px;line-height:1.4}
.kv b{color:var(--t);font-weight:500}
.kv span{color:var(--t2);word-break:break-all}
.tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.tag{padding:3px 8px;background:var(--gl);color:var(--gd);font-size:11px;border-radius:999px;font-weight:500}
.notes{background:#fffbee;border:1px solid var(--sbd);padding:8px 10px;border-radius:8px;font-size:12px;color:var(--st);line-height:1.4}
.ordgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
.ordstat{background:#fafbfd;border:1px solid var(--bd);padding:8px;border-radius:8px;text-align:center}
.ordstat b{display:block;font-size:16px;color:var(--t);font-weight:600}
.ordstat span{font-size:11px;color:var(--t2)}
.curord{background:#fafbfd;border:1px solid var(--bd);padding:10px;border-radius:8px;font-size:12px}
.curord div{margin-bottom:4px}
.polblock{margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--bd)}
.polblock:last-child{border-bottom:none}
.polblock h4{font-size:13px;font-weight:600;margin-bottom:6px}
.polblock ul{margin-left:18px;font-size:12px;color:var(--t2);line-height:1.6}
.scbtn{display:block;width:100%;padding:10px 12px;margin-bottom:6px;background:#fafbfd;border:1px solid var(--bd);border-radius:8px;text-align:left;font-size:13px;color:var(--t);position:relative;padding-right:32px}
.scbtn:hover{background:var(--gl);border-color:var(--g)}
.scbtn.active{background:var(--gl);border-color:var(--g);font-weight:600}
.scbtn .del{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:22px;height:22px;border-radius:50%;background:#fee2e2;color:#991b1b;font-size:12px;display:grid;place-items:center}
.scbtn .del:hover{background:#fecaca}
.scform{margin-top:14px;padding-top:14px;border-top:1px solid var(--bd)}
.scform h4{font-size:13px;font-weight:600;margin-bottom:10px}
.scform textarea,.scform input{width:100%;padding:8px 10px;border:1px solid var(--bd);border-radius:8px;margin-bottom:8px;background:#fafbfd;outline:none}
.scform textarea{min-height:60px;resize:vertical}
.scform textarea:focus,.scform input:focus{border-color:var(--g)}
.scform .btn-load{width:100%;background:var(--g);color:#fff;padding:9px;border-radius:8px;font-weight:600;font-size:13px}
.scform .btn-load:hover{background:var(--gd)}
.upload-zone{border:2px dashed var(--bd);border-radius:8px;padding:14px;text-align:center;font-size:12px;color:var(--t2);margin-bottom:8px;cursor:pointer;background:#fafbfd}
.upload-zone:hover{border-color:var(--g);background:var(--gl)}
.upload-zone.has{border-color:var(--g);color:var(--g);font-weight:500}
.upload-zone small{display:block;color:var(--t3);margin-top:4px;font-size:11px}
.thumb{display:inline-block;width:60px;height:60px;border-radius:6px;background-size:cover;background-position:center;margin:3px;border:1px solid var(--bd)}
.modal{position:fixed;inset:0;background:rgba(15,23,42,.5);display:none;align-items:center;justify-content:center;z-index:100;padding:20px}
.modal.show{display:flex}
.modal-card{background:var(--w);border-radius:14px;max-width:640px;width:100%;max-height:85vh;display:flex;flex-direction:column;animation:fadeUp .25s ease}
.modal-head{padding:16px 20px;border-bottom:1px solid var(--bd);display:flex;justify-content:space-between;align-items:center}
.modal-head h3{font-size:15px;font-weight:600;margin:0}
.modal-head button{font-size:20px;color:var(--t2);padding:2px 8px}
.modal-body{padding:18px 20px;overflow-y:auto;flex:1}
.modal-body .ideal-resp{background:#f0fdf4;border-left:3px solid var(--g);padding:12px 14px;border-radius:8px;margin-bottom:12px;line-height:1.5;font-size:14px;color:var(--t);white-space:pre-wrap}
.modal-body .ideal-resp .lbl{display:block;font-size:11px;font-weight:600;color:var(--gd);text-transform:uppercase;margin-bottom:4px;letter-spacing:.5px}
.modal-body .guide{background:#eff6ff;padding:10px 12px;border-radius:8px;font-size:12px;color:#1e3a8a;margin-bottom:12px;line-height:1.5}
.modal-body .loading{text-align:center;padding:30px;color:var(--t2)}
.sumcard{align-self:stretch;background:linear-gradient(135deg,#fff,#f0fdf4);border:1px solid var(--g);border-radius:14px;padding:18px;animation:fadeUp .25s ease}
.sumcard h3{font-size:16px;font-weight:600;margin-bottom:12px}
.sumgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
.sumcell{background:var(--w);padding:10px;border-radius:8px;text-align:center;border:1px solid var(--bd)}
.sumcell b{display:block;font-size:18px;font-weight:700;color:var(--t)}
.sumcell span{font-size:11px;color:var(--t2)}
.trend{margin:12px 0}
.trendrow{display:flex;align-items:center;gap:8px;margin-bottom:5px;font-size:12px}
.trendrow .lbl{width:60px;color:var(--t2)}
.trendrow .barwrap{flex:1;height:8px;background:#f1f4f9;border-radius:4px;overflow:hidden}
.trendrow .barwrap i{display:block;height:100%;background:var(--g)}
.trendrow .sc{width:40px;text-align:right;font-weight:600;font-family:'DM Mono',monospace}
.aisum{margin-top:10px;padding:10px 12px;background:var(--w);border-radius:8px;font-size:13px;color:var(--t2);line-height:1.5;border:1px solid var(--bd)}
.endbar{display:flex;gap:8px;justify-content:center;margin-top:12px}
.endbar button{padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600}
.endbar .b1{background:var(--g);color:#fff}
.endbar .b2{background:#f1f4f9;color:var(--t);border:1px solid var(--bd)}
@keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes dotPulse{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-4px);opacity:1}}
`;

const BODY = `
<div class="csr-app">
<div class="app">
  <div class="main">
    <div class="topbar">
      <div class="logo">CS</div>
      <div class="titles"><h1>CSR Live Practice</h1><p>Unlimited session · End Chat when ready</p></div>
      <div id="tt" class="chip timer">00:00</div>
      <div id="turnChip" class="chip">Turn 1</div>
      <button class="btn-ideal" onclick="showIdeal()">💡 Ideal Answer</button>
      <button class="btn-reset" onclick="resetConv()">↻ Reset</button>
      <button class="btn-end" onclick="endChat()">⏹ End &amp; Summary</button>
    </div>
    <div class="cstrip">
      <div id="cAv" class="avatar">SJ</div>
      <div class="cinfo"><div id="cName" class="name">Sarah Johnson</div><div class="role">Customer</div></div>
      <div class="status"><span id="cDot" class="statusdot"></span><span id="cStat">Active chat</span></div>
    </div>
    <div id="msgs" class="msgs"></div>
    <div id="checklist" class="checklist"><b>📋 Pre-Submit Checklist</b><ul id="checkList"></ul></div>
    <div id="policyCheck" class="checklist" style="background:#f0fdf4;border-color:#bbf7d0"></div>
    <div id="coach" class="coach">
      <div class="coach-head"><b>💡 Live Coaching</b><button onclick="closeSP()">✕</button></div>
      <div id="chips" class="chips"></div><div id="hint" class="hint"></div>
    </div>
    <div class="inputwrap">
      <div class="inputrow">
        <textarea id="inp" placeholder="Type your response as the CSR..." rows="1"></textarea>
        <span id="charc" class="charc">0</span>
        <button id="sendBtn" class="btn-send" onclick="sendMsg()">➤</button>
      </div>
      <div class="inputmeta"><span>Ctrl+Enter to send · <button onclick="checkPolicy()" style="background:none;border:none;color:#1d4ed8;cursor:pointer;font-weight:600;padding:0;font-size:11px">🛡 Check vs Policy</button> · <button onclick="humanizeDraft()" style="background:none;border:none;color:#7c3aed;cursor:pointer;font-weight:600;padding:0;font-size:11px">🧑 Humanise this</button> · <button onclick="checkAIDetection()" style="background:none;border:none;color:#6d28d9;cursor:pointer;font-weight:600;padding:0;font-size:11px">🔍 AI-Detector Check (30 tools)</button></span><span class="on">● Coaching on</span></div>
    </div>
  </div>
  <div class="side">
    <div class="tabs">
      <button class="tab active" data-tab="info" onclick="showSB('info')">Customer Info</button>
      <button class="tab" data-tab="pol" onclick="showSB('pol')">Policies</button>
      <button class="tab" data-tab="sc" onclick="showSB('sc')">Scenarios</button>
    </div>
    <div id="pane-info" class="tabpane active"></div>
    <div id="pane-pol" class="tabpane"></div>
    <div id="pane-sc" class="tabpane"></div>
  </div>
</div>
<div id="idealModal" class="modal">
  <div class="modal-card">
    <div class="modal-head"><h3>💡 Ideal CSR Responses</h3><button onclick="closeIdeal()">✕</button></div>
    <div class="modal-body">
      <div class="guide"><b>Assessment Guidelines:</b> Read customer messages carefully, use professional language, acknowledge feelings, use the customer's name, reference policy, and offer a concrete next step.</div>
      <div id="idealBody"></div>
    </div>
  </div>
</div>
</div>
`;
