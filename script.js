const STEPS=["Submitted","Under Assessment","Medical Review","Approved","Settled"];
const ROLES={
 policyholder:{n:"Policyholder",d:"Submit claims, upload documents, track status",tabs:["My claims","New claim","My policy"]},
 hospital:{n:"Hospital coordinator",d:"Pre-authorization, treatment details, hospital bills",tabs:["Hospital claims","New claim"]},
 officer:{n:"Claims officer",d:"Verify documents, raise queries, approve or reject",tabs:["Queue","All claims"]},
 reviewer:{n:"Medical reviewer",d:"Medical necessity, duplicate and fraud check",tabs:["Review queue"]},
 finance:{n:"Finance officer",d:"Calculate settlement and release payment",tabs:["Payments"]},
 admin:{n:"Administrator",d:"Users, policies, hospitals, reports, audit log",tabs:["Overview","Users and plans","Audit log"]}
};
const REQ=[["bill","Hospital bill"],["discharge","Discharge summary"],["report","Diagnosis report"]];
const inr=n=>"₹"+Number(n||0).toLocaleString("en-IN");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const now=()=>new Date().toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"});
const today=()=>new Date().toISOString().slice(0,10);
const slug=t=>t.toLowerCase().replace(/\s+/g,"-");

function seed(){
 return{seq:2003,
 policies:[
  {id:"POL-1001",holder:"Anita Rao",plan:"Family Floater",sum:500000,remaining:300000,start:"2026-04-01",end:"2027-03-31",status:"Active"},
  {id:"POL-0877",holder:"Anita Rao",plan:"Senior Care",sum:300000,remaining:300000,start:"2024-01-01",end:"2025-12-31",status:"Expired"},
  {id:"POL-1042",holder:"Ravi Kumar",plan:"Individual Plus",sum:200000,remaining:50000,start:"2026-02-01",end:"2027-01-31",status:"Active"}],
 hospitals:[
  {id:"H1",name:"Sunrise Hospital",city:"Guntur",net:"Network"},
  {id:"H2",name:"City Care Clinic",city:"Vijayawada",net:"Network"},
  {id:"H3",name:"Lakeview Medical",city:"Hyderabad",net:"Non-network"}],
 users:[["anita","Policyholder","Active"],["sunrise.desk","Hospital coordinator","Active"],["officer1","Claims officer","Active"],["reviewer1","Medical reviewer","Active"],["finance1","Finance officer","Active"],["admin","Administrator","Active"]],
 payments:[],
 claims:[
  {id:"CLM-2001",policyId:"POL-1001",hospitalId:"H1",dx:"Appendicitis surgery",admit:"2026-09-02",disch:"2026-09-06",claimed:85000,approved:0,status:"Medical Review",rec:"",dup:false,
   log:[{s:"Submitted",r:"Claim registered",by:"Policyholder",on:"2 Oct 2026, 10:10 am"},{s:"Under Assessment",r:"Documents verified",by:"Claims officer",on:"3 Oct 2026, 11:30 am"},{s:"Medical Review",r:"Sent for medical review",by:"Claims officer",on:"3 Oct 2026, 11:32 am"}]},
  {id:"CLM-2002",policyId:"POL-1042",hospitalId:"H2",dx:"Fracture, right wrist",admit:"2026-08-14",disch:"2026-08-16",claimed:60000,approved:0,status:"Approved",rec:"approve",dup:false,
   log:[{s:"Submitted",r:"Claim registered",by:"Hospital coordinator",on:"20 Aug 2026, 9:00 am"},{s:"Approved",r:"Treatment necessary; approved",by:"Claims officer",on:"28 Aug 2026, 4:15 pm"}]}]};
}
let S;
try{S=JSON.parse(localStorage.getItem("hicts")||"null")}catch(e){}
S=S||seed();
const save=()=>{try{localStorage.setItem("hicts",JSON.stringify(S))}catch(e){}};
const toast=m=>{const t=document.getElementById("toast");t.textContent=m;t.style.display="block";clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display="none",3200)};
const pol=id=>S.policies.find(p=>p.id===id)||{};
const hos=id=>S.hospitals.find(h=>h.id===id)||{};
function setStatus(c,s,r,by,notify=true){
 c.status=s;c.log.push({s,r,by:by||ROLES[view.role].n,on:now()});
 if(notify)toast("Status: "+s+". SMS / e-mail sent to policyholder (simulated).");
}
function settle(claimed,np,ded,cp,rsi){
 const after=claimed-np-ded,pay=Math.max(0,after*(1-cp/100));
 return{after,copay:Math.max(0,after*cp/100),before:pay,final:Math.min(pay,rsi),capped:pay>rsi};
}

/* ---------- navigation: login -> role selection -> role page ---------- */
let view={screen:"login"};
const isAuth=()=>{try{return sessionStorage.getItem("hicts_auth")==="1"}catch(e){return false}};
const setAuth=v=>{try{v?sessionStorage.setItem("hicts_auth","1"):sessionStorage.removeItem("hicts_auth")}catch(e){}};
function hashOf(s){return s.screen==="dash"?"#"+s.role+"-"+slug(ROLES[s.role].tabs[s.tab]):"#"+s.screen}
function nav(state,replace){
 history[replace?"replaceState":"pushState"](state,"",hashOf(state));
 view={...state,open:null};render();
}
addEventListener("popstate",e=>{
 const s=e.state;
 if(!isAuth()){view={screen:"login"};render();return}
 if(!s||s.screen==="login"||(s.screen==="dash"&&!ROLES[s.role])){nav({screen:"roles"},true);return}
 view={...s,open:null};render();
});

/* ---------- views ---------- */
function render(){
 const a=document.getElementById("app");
 if(!isAuth()||view.screen==="login"){a.innerHTML=loginView();return}
 if(view.screen==="roles"){a.innerHTML=rolesView();return}
 const R=ROLES[view.role];
 a.innerHTML=`<header><button class="btn alt back" data-act="back" aria-label="Go back">Back</button><b>HICTS</b><span>Health Insurance Claim Tracking System</span><span class="sp"></span><span>${R.n}</span><button class="btn alt" data-act="logout">Log out</button></header>
 <nav aria-label="Sections">${R.tabs.map((t,i)=>`<button data-act="tab" data-i="${i}" ${i===view.tab?'aria-current="true"':""}>${t}</button>`).join("")}</nav>
 <main>${tabView(R.tabs[view.tab])}</main>`;
 document.querySelectorAll(".fin").forEach(updateFin);
}
function loginView(){
 return`<main class="loginwrap"><section class="card login"><h1>HICTS</h1>
 <p class="meta">Health Insurance Claim Tracking System. Log in to continue.</p>
 <form id="lf" novalidate>
  <label>Username<input name="u" autocomplete="username" required></label>
  <label>Password<input name="p" type="password" autocomplete="current-password" required></label>
  <p id="lerr" class="meta" style="color:var(--bad)" role="alert"></p>
  <button class="btn" type="submit">Log in</button>
 </form></section></main>`;
}
function rolesView(){
 return`<header><b>HICTS</b><span>Health Insurance Claim Tracking System</span><span class="sp"></span><button class="btn alt" data-act="logout">Log out</button></header>
 <main class="pick"><h1>Choose your role</h1>
 <p class="meta" style="max-width:62ch">Each role opens its own page with the forms and details it needs.</p>
 <div class="roles">${Object.entries(ROLES).map(([k,r])=>`<button data-act="role" data-r="${k}"><b>${r.n}</b><span>${r.d}</span></button>`).join("")}</div>
 <p><button class="btn alt" data-act="reset">Reset demo data</button></p></main>`;
}
function tabView(t){
 switch(t){
  case"My claims":return claimList(S.claims.filter(c=>pol(c.policyId).holder==="Anita Rao"),"No claims yet. Open New claim to submit one.");
  case"Hospital claims":return claimList(S.claims.filter(c=>c.hospitalId==="H1"),"No claims for this hospital yet.");
  case"New claim":return claimForm();
  case"My policy":return S.policies.filter(p=>p.holder==="Anita Rao").map(p=>`<div class="card"><h3>${p.plan} <span class="chip ${p.status==="Active"?"Approved":"Rejected"}">${p.status}</span></h3><p class="meta">${p.id} · valid ${p.start} to ${p.end}</p><p>Sum insured ${inr(p.sum)} · remaining ${inr(p.remaining)}</p></div>`).join("");
  case"Queue":return claimList(S.claims.filter(c=>["Submitted","Under Assessment"].includes(c.status)||(c.status==="Medical Review"&&c.rec)),"Nothing waiting for you.");
  case"All claims":return claimList(S.claims,"No claims.");
  case"Review queue":return claimList(S.claims.filter(c=>c.status==="Medical Review"),"No claims waiting for medical review.");
  case"Payments":return claimList(S.claims.filter(c=>["Approved","Settled"].includes(c.status)),"No approved claims yet.");
  case"Overview":return adminOverview();
  case"Users and plans":return adminUsers();
  case"Audit log":return auditView();
 }
}
function claimList(list,empty){
 if(!list.length)return`<p class="meta">${empty}</p>`;
 return`<div class="row" style="margin-bottom:.8rem"><input id="q" placeholder="Search by claim ID, diagnosis or status" style="max-width:340px" aria-label="Search claims"></div><div id="claims">${list.slice().reverse().map(claimCard).join("")}</div>`;
}
function claimCard(c){
 const p=pol(c.policyId),h=hos(c.hospitalId);
 let idx=STEPS.indexOf(c.status),extra="";
 if(c.status==="Query Raised"){idx=0;extra="hold"}
 if(c.status==="Rejected"){idx=Math.max(0,c.log.length>1?STEPS.indexOf(c.log[c.log.length-2].s):0);extra="stop"}
 const tl=STEPS.map((s,i)=>`<li class="${i<idx?"done":""}${i===idx?" done cur "+extra:""}">${s}</li>`).join("");
 const open=view.open===c.id;
 return`<div class="card" data-hay="${esc((c.id+c.dx+c.status).toLowerCase())}">
 <div class="row"><h3 style="margin:0">${c.id}</h3><span class="chip ${c.status.replace(/ /g,"")}">${c.status}</span>${c.dup?'<span class="chip dup">Possible duplicate</span>':""}<span class="sp" style="flex:1"></span><button class="btn alt" data-act="toggle" data-id="${c.id}">${open?"Hide timeline":"Show timeline"}</button></div>
 <p class="meta">${esc(c.dx)} · ${esc(h.name)} · ${c.admit} to ${c.disch} · policy ${c.policyId} (${esc(p.plan)})</p>
 <p>Claimed ${inr(c.claimed)}${c.approved?` · paid ${inr(c.approved)}`:""}</p>
 <ol class="tl" aria-label="Claim progress">${tl}</ol>
 ${open?`<ul class="log">${c.log.map(l=>`<li><b>${l.s}</b> – ${esc(l.r)} (${esc(l.by)}, ${l.on})</li>`).join("")}</ul>`:""}
 ${actions(c)}</div>`;
}
function actions(c){
 const r=view.role,s=c.status,id=c.id;
 const note=`<label>Remarks<input class="rm" placeholder="Reason or note"></label>`;
 if(r==="officer"){
  if(s==="Submitted")return`<button class="btn" data-act="verify" data-id="${id}">Verify documents</button>`;
  if(s==="Under Assessment")return note+`<div class="row"><button class="btn" data-act="toReview" data-id="${id}">Send to medical review</button><button class="btn warn" data-act="query" data-id="${id}">Raise query</button><button class="btn bad" data-act="reject" data-id="${id}">Reject</button></div>`;
  if(s==="Medical Review"&&c.rec)return`<p class="meta">Reviewer recommends: <b>${c.rec}</b>${c.rmk?" – "+esc(c.rmk):""}</p>`+note+`<div class="row"><button class="btn ok" data-act="approve" data-id="${id}">Approve</button><button class="btn bad" data-act="reject" data-id="${id}">Reject</button></div>`;
 }
 if(r==="reviewer"&&s==="Medical Review")return`<p class="meta">Duplicate check: ${c.dup?"<b>possible duplicate found</b>":"no duplicate found"}</p>`+note+`<div class="row"><button class="btn ok" data-act="recA" data-id="${id}">Recommend approval</button><button class="btn bad" data-act="recR" data-id="${id}">Recommend rejection</button></div>`;
 if(r==="policyholder"&&s==="Query Raised")return`<label>Upload the missing document (PDF or JPG, up to 2 MB)<input type="file" class="mf" accept=".pdf,.jpg,.jpeg"></label><button class="btn" data-act="resubmit" data-id="${id}">Send document</button>`;
 if(r==="finance"&&s==="Approved"){
  const p=pol(c.policyId);
  return`<div class="fin" data-id="${id}"><div class="grid">
  <label>Non-payable items (₹)<input type="number" min="0" value="5000" class="f-np"></label>
  <label>Deductible (₹)<input type="number" min="0" value="2000" class="f-d"></label>
  <label>Co-pay (%)<input type="number" min="0" max="100" value="10" class="f-c"></label>
  <label>Remaining sum insured (₹)<input type="number" min="0" value="${p.remaining}" class="f-r"></label></div>
  <p class="meta calc"></p><p class="out"></p><button class="btn ok" data-act="pay" data-id="${id}">Release payment</button></div>`;
 }
 return"";
}
function updateFin(box){
 const c=S.claims.find(x=>x.id===box.dataset.id),v=k=>+box.querySelector(k).value||0;
 const x=settle(c.claimed,v(".f-np"),v(".f-d"),v(".f-c"),v(".f-r"));
 box.querySelector(".calc").textContent=`After deductible ${inr(x.after)} · co-pay ${inr(x.copay)} · before limit ${inr(x.before)}${x.capped?" · capped at remaining sum insured":""}`;
 box.querySelector(".out").textContent="Final settlement: "+inr(x.final);
 box._x=x;
}
function claimForm(){
 const ps=S.policies.filter(p=>view.role==="hospital"||p.holder==="Anita Rao");
 return`<div class="card"><h2>New claim${view.role==="hospital"?" or pre-authorization":""}</h2>
 <form id="cf" novalidate><div class="grid">
 <label>Policy number<select name="policy">${ps.map(p=>`<option value="${p.id}">${p.id} – ${p.plan} (${p.status})</option>`).join("")}</select></label>
 <label>Hospital<select name="hospital">${S.hospitals.map(h=>`<option value="${h.id}">${h.name}, ${h.city}</option>`).join("")}</select></label>
 <label>Diagnosis<input name="dx" required></label>
 <label>Claimed amount (₹)<input name="amt" type="number" min="1" required></label>
 <label>Admission date<input name="admit" type="date" required></label>
 <label>Discharge date<input name="disch" type="date" required></label></div>
 <h3>Documents (PDF or JPG, up to 2 MB each)</h3><div class="grid">${REQ.map(([k,n])=>`<label>${n}<input type="file" name="${k}" accept=".pdf,.jpg,.jpeg"></label>`).join("")}</div>
 <p id="ferr" class="meta" style="color:var(--bad)" role="alert"></p>
 <button class="btn" type="submit">Submit claim</button></form></div>`;
}
function adminOverview(){
 const n=s=>S.claims.filter(c=>c.status===s).length;
 const paid=S.claims.reduce((a,c)=>a+(c.status==="Settled"?c.approved:0),0);
 const stats=[["Total claims",S.claims.length],["In progress",S.claims.filter(c=>["Submitted","Under Assessment","Medical Review","Query Raised"].includes(c.status)).length],["Approved, unpaid",n("Approved")],["Settled",n("Settled")],["Rejected",n("Rejected")],["Total paid",inr(paid)]];
 return`<div class="grid">${stats.map(([l,v])=>`<div class="card"><div class="meta">${l}</div><div class="out">${v}</div></div>`).join("")}</div>`+
 `<h2>All claims</h2><div class="card"><table><tr><th>Claim</th><th>Policy</th><th>Hospital</th><th>Claimed</th><th>Status</th></tr>${S.claims.map(c=>`<tr><td>${c.id}</td><td>${c.policyId}</td><td>${esc(hos(c.hospitalId).name)}</td><td>${inr(c.claimed)}</td><td>${c.status}</td></tr>`).join("")}</table></div>`;
}
function adminUsers(){
 return`<h2>Users and roles</h2><div class="card"><table><tr><th>Username</th><th>Role</th><th>Status</th></tr>${S.users.map(u=>`<tr><td>${u[0]}</td><td>${u[1]}</td><td>${u[2]}</td></tr>`).join("")}</table></div>
 <h2>Policies and plans</h2><div class="card"><table><tr><th>Policy</th><th>Holder</th><th>Plan</th><th>Sum insured</th><th>Remaining</th><th>Valid until</th><th>Status</th></tr>${S.policies.map(p=>`<tr><td>${p.id}</td><td>${p.holder}</td><td>${p.plan}</td><td>${inr(p.sum)}</td><td>${inr(p.remaining)}</td><td>${p.end}</td><td>${p.status}</td></tr>`).join("")}</table></div>
 <h2>Hospitals</h2><div class="card"><table><tr><th>Name</th><th>City</th><th>Network</th></tr>${S.hospitals.map(h=>`<tr><td>${h.name}</td><td>${h.city}</td><td>${h.net}</td></tr>`).join("")}</table></div>`;
}
function auditView(){
 const rows=S.claims.flatMap(c=>c.log.map(l=>({c:c.id,...l}))).reverse();
 return`<h2>Audit log</h2><div class="card"><table><tr><th>Claim</th><th>Status</th><th>Remarks</th><th>By</th><th>When</th></tr>${rows.map(l=>`<tr><td>${l.c}</td><td>${l.s}</td><td>${esc(l.r)}</td><td>${esc(l.by)}</td><td>${l.on}</td></tr>`).join("")}</table></div>`;
}

/* ---------- events ---------- */
const okFile=f=>/\.(pdf|jpe?g)$/i.test(f.name)&&f.size<=2*1024*1024;
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-act]");if(!b)return;
 const act=b.dataset.act,c=S.claims.find(x=>x.id===b.dataset.id);
 if(act==="back"){history.back();return}
 if(act==="logout"){setAuth(false);nav({screen:"login"},true);return}
 if(act==="role"){nav({screen:"dash",role:b.dataset.r,tab:0});return}
 if(act==="tab"){if(+b.dataset.i!==view.tab)nav({screen:"dash",role:view.role,tab:+b.dataset.i});return}
 const rm=()=>{const i=b.closest(".card").querySelector(".rm");return i&&i.value.trim()};
 if(act==="reset"){S=seed();toast("Demo data reset.")}
 else if(act==="toggle"){view.open=view.open===c.id?null:c.id}
 else if(act==="verify"){setStatus(c,"Under Assessment","Documents verified")}
 else if(act==="toReview"){setStatus(c,"Medical Review",rm()||"Sent for medical review")}
 else if(act==="query"){const r=rm();if(!r)return toast("Add a remark describing what is needed.");setStatus(c,"Query Raised",r)}
 else if(act==="reject"){const r=rm();if(!r)return toast("Add a reason for rejection.");setStatus(c,"Rejected",r)}
 else if(act==="recA"||act==="recR"){c.rec=act==="recA"?"approve":"reject";c.rmk=rm()||"";c.log.push({s:"Medical Review",r:"Recommendation: "+c.rec+(c.rmk?" – "+c.rmk:""),by:"Medical reviewer",on:now()});toast("Recommendation sent to the claims officer.")}
 else if(act==="approve"){setStatus(c,"Approved",rm()||"Approved after medical review")}
 else if(act==="resubmit"){const f=b.closest(".card").querySelector(".mf").files[0];if(!f)return toast("Choose a file first.");if(!okFile(f))return toast("Only PDF or JPG files up to 2 MB are accepted.");setStatus(c,"Submitted","Missing document sent: "+f.name)}
 else if(act==="pay"){
  const box=b.closest(".fin");updateFin(box);const x=box._x,p=pol(c.policyId);
  if(x.final<=0)return toast("Settlement amount is zero.");
  c.approved=Math.round(x.final);p.remaining=Math.max(0,p.remaining-c.approved);
  S.payments.push({claim:c.id,amount:c.approved,ref:"TXN"+Date.now().toString().slice(-8),on:now()});
  setStatus(c,"Settled","Paid "+inr(c.approved)+" · ref "+S.payments[S.payments.length-1].ref)}
 save();render();
});
document.addEventListener("input",e=>{
 const f=e.target.closest(".fin");if(f)updateFin(f);
 if(e.target.id==="q"){const q=e.target.value.toLowerCase();document.querySelectorAll("#claims .card").forEach(c=>c.style.display=c.dataset.hay.includes(q)?"":"none")}
});
document.addEventListener("submit",e=>{
 e.preventDefault();
 if(e.target.id==="lf"){
  const u=e.target.elements.u.value.trim(),p=e.target.elements.p.value,err=m=>document.getElementById("lerr").textContent=m;
  if(!u)return err("Enter your username.");
  if(p.length<4)return err("Enter a password of at least 4 characters.");
  setAuth(true);nav({screen:"roles"},true);return;
 }
 if(e.target.id!=="cf")return;
 const f=e.target,v=n=>f.elements[n].value,err=m=>document.getElementById("ferr").textContent=m;
 if(!v("dx").trim()||!v("amt")||!v("admit")||!v("disch"))return err("Fill in diagnosis, amount and both dates.");
 if(v("disch")<v("admit"))return err("Discharge date cannot be before admission date.");
 for(const[k,n]of REQ){const fl=f.elements[k].files[0];if(fl&&!okFile(fl))return err(n+": only PDF or JPG files up to 2 MB are accepted.")}
 const missing=REQ.filter(([k])=>!f.elements[k].files[0]).map(r=>r[1]);
 const p=pol(v("policy")),by=ROLES[view.role].n;
 const dup=S.claims.some(c=>c.policyId===p.id&&c.hospitalId===v("hospital")&&c.admit===v("admit")&&c.disch===v("disch"));
 const c={id:"CLM-"+(S.seq++),policyId:p.id,hospitalId:v("hospital"),dx:v("dx").trim(),admit:v("admit"),disch:v("disch"),claimed:+v("amt"),approved:0,status:"Submitted",rec:"",dup,log:[]};
 c.log.push({s:"Submitted",r:"Claim registered",by,on:now()});
 if(p.status!=="Active"||p.end<today()){setStatus(c,"Rejected","Policy not active (auto-rejected)","System")}
 else if(missing.length){setStatus(c,"Query Raised","Missing documents: "+missing.join(", "),"System")}
 else toast("Claim "+c.id+" registered.");
 S.claims.push(c);save();
 nav({screen:"dash",role:view.role,tab:0});view.open=c.id;render();
});

/* ---------- start ---------- */
(function init(){
 if(!isAuth()){nav({screen:"login"},true);return}
 const s=history.state;
 if(s&&s.screen==="dash"&&ROLES[s.role]&&s.tab<ROLES[s.role].tabs.length){view={...s,open:null};render()}
 else nav({screen:"roles"},true);
})();