import * as C from './core.mjs';
import {View} from './view.mjs';
import {bridge} from './sdk.mjs';

const byId = id => document.getElementById(id);
const key = 'parcel-press-v1';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch {}
let profile = C.profile(saved.profile);
let parcel = C.restore(saved.parcel, profile);
let host;
let audio;
let gesture;
let menuMode;
let toastTimer;
let resultTimer;
const table = new View(byId('table'));
let values = C.symbols.map((_,i) => Number(parcel.folds.includes(i)));
let animations = [];
let frame = 0;

function persist() {
  try { localStorage.setItem(key, JSON.stringify({profile,parcel})); } catch {}
}

function makeHost() {
  return bridge({
    read: () => C.profile(profile),
    write(incoming, merge) {
      profile = merge ? C.mergeProfile(profile,incoming) : C.profile(incoming);
      persist();
      if (byId('menu').open) fillMenu();
    },
    changed(event) {
      if (byId('menu').open) fillMenu();
      if (event.type === 'reward') announce(event.kind === 'like' ? 'Blue Porcelain paper unlocked' : 'Berry Foil paper unlocked');
    }
  });
}

function notes(kind) {
  if(profile.mute) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if(audio.state==='suspended') audio.resume().catch(()=>{});
    const tones = {paper:[225,320], bump:[126], stamp:[180,440,660,880], select:[440]};
    const at=audio.currentTime;
    tones[kind].forEach((pitch,i)=>{
      const osc=audio.createOscillator(), amp=audio.createGain(), time=at+i*.048;
      osc.type=kind==='paper'?'triangle':'sine';
      osc.frequency.setValueAtTime(pitch,time);
      amp.gain.setValueAtTime(.0001,time);
      amp.gain.exponentialRampToValueAtTime(kind==='stamp'?.16:.095,time+.014);
      amp.gain.exponentialRampToValueAtTime(.0001,time+.18);
      osc.connect(amp);amp.connect(audio.destination);
      osc.start(time);osc.stop(time+.19);
    });
  } catch {}
}

function announce(message) {
  clearTimeout(toastTimer);
  byId('toast').textContent=message;
  toastTimer=setTimeout(()=>byId('toast').textContent='',1550);
}

function requestDraw() {
  if (!frame) frame=requestAnimationFrame(render);
}

function render(now) {
  frame=0;
  animations=animations.filter(animation=>{
    const elapsed=Math.min(1,(now-animation.start)/animation.duration);
    const t=1-(1-elapsed)**3;
    values[animation.flap]=animation.from+(animation.to-animation.from)*t;
    return elapsed<1;
  });
  table.draw(parcel,values,now);
  if(animations.length || table.fx.length) requestDraw();
}

function animate(flap,to,duration) {
  animations=animations.filter(a=>a.flap!==flap);
  animations.push({flap,from:values[flap],to,start:performance.now(),duration});
  requestDraw();
}

function positionControls() {
  const job=C.jobs[parcel.job];
  table.resize(job);
  flapButtons.forEach((button,i)=>{
    const [x,y]=table.marker(job,i);
    button.style.left=x+'px'; button.style.top=y+'px';
  });
  const [x,y]=table.target(job);
  byId('dropTarget').style.left=x+'px';
  byId('dropTarget').style.top=y+'px';
  requestDraw();
}

function update() {
  const job=C.jobs[parcel.job], count=parcel.folds.length, done=!!parcel.seal;
  byId('orderId').textContent=String(parcel.job+1).padStart(2,'0');
  byId('title').textContent=job.name;
  byId('count').textContent=done ? '✓' : count+' / 4';
  byId('count').setAttribute('aria-label',done?'Sealed':count+' of 4 folds completed');
  byId('clue').textContent=done?'Sealed':count===4?'Drag to the circle or tap Seal.':'Tap or drag to fold.';
  byId('ruleIcons').replaceChildren();
  if(count<4) for (const [above, below] of job.over) {
    const rule=document.createElement('span');
    rule.className='rule';
    const label=C.symbols[below]+' before '+C.symbols[above];
    rule.setAttribute('aria-label',label);
    rule.setAttribute('role','img');
    rule.title=label;
    rule.textContent=C.glyphs[below]+' → '+C.glyphs[above];
    byId('ruleIcons').append(rule);
  }
  flapButtons.forEach((button,i)=>{
    button.hidden=parcel.folds.includes(i)||done;
    button.dataset.ready=String(C.missingUnder(parcel,i).length===0);
  });
  byId('dropTarget').hidden=count!==4||done;
  byId('stamp').hidden=count!==4||done;
  byId('receipt').hidden=!done;
  byId('sound').setAttribute('aria-pressed',String(!profile.mute));
  byId('sound').textContent=profile.mute?'Sound off':'Sound on';
  positionControls();
}

function commitFold(flap) {
  const outcome=C.fold(parcel,flap);
  if(outcome.kind==='ignored') return;
  host.start();
  persist();
  if(outcome.kind==='blocked') {
    animate(flap,0,230);
    notes('bump');
    announce(C.symbols[flap]+' goes over '+outcome.missing.map(i=>C.symbols[i]).join(' and ')+'.');
    return;
  }
  clearTimeout(toastTimer);
  byId('toast').textContent='';
  notes('paper');
  animate(flap,1,420);
  const [x,y]=table.marker(C.jobs[parcel.job],flap);
  table.burst(x,y,C.papers[parcel.paper].pale,performance.now());
  update();
}

function commitSeal(dx,dy) {
  if(!C.seal(parcel,dx,dy)) {
    notes('bump');
    announce('Bring the seal closer to the center.');
    return;
  }
  host.start();
  profile.best[parcel.job]=Math.max(profile.best[parcel.job],parcel.stars);
  persist();
  host.save();
  host.end();
  notes('stamp');
  const [x,y]=table.target(C.jobs[parcel.job]);
  table.burst(x,y,C.papers[parcel.paper].pale,performance.now());
  update();
  resultTimer=setTimeout(showResult,520);
}

function showResult() {
  if (!parcel.seal || byId('result').open || byId('menu').open) return;
  byId('resultTitle').textContent='For '+C.jobs[parcel.job].to;
  byId('stars').textContent='★'.repeat(parcel.stars)+'☆'.repeat(3-parcel.stars);
  const detail=parcel.slips ? parcel.slips+' stacking '+(parcel.slips===1?'slip':'slips') : 'Clean folds';
  const alignment=Math.hypot(...parcel.seal)<=.30?'centered seal':'seal attached';
  byId('details').textContent=detail+' · '+alignment;
  byId('next').textContent=parcel.job===C.jobs.length-1?'Orders →':'Next →';
  byId('result').showModal();
}

function resetParcel(index,preservePaper=false) {
  cancelGesture();
  clearTimeout(resultTimer);
  if (!parcel.seal) host.end();
  host.prepare();
  parcel=C.newParcel(index,preservePaper?parcel.paper:undefined);
  values=C.symbols.map(()=>0);
  animations=[];
  table.fx=[];
  announce('');
  persist();
  update();
}

function fillMenu() {
  const orderMode=menuMode==='orders';
  byId('menuTitle').textContent=orderMode?'Orders · '+C.total(profile)+' / 24 ★':'Paper';
  byId('menuTools').hidden=!orderMode;
  byId('close').textContent=orderMode?'×':'‹';
  byId('close').setAttribute('aria-label',orderMode?'Close menu':'Back to orders');
  const container=byId('menuBody');
  container.replaceChildren();
  if(orderMode) {
    C.jobs.forEach((job,index)=>{
      const button=document.createElement('button');
      button.className='order';
      button.disabled=!C.unlocked(profile,index);
      const name=document.createElement('b'), rating=document.createElement('small');
      name.textContent=(index+1)+'. '+job.name;
      rating.textContent=button.disabled?'Locked':profile.best[index]?'★'.repeat(profile.best[index]):'Ready';
      button.append(name,rating);
      button.onclick=()=>{
        byId('menu').close();
        if(index!==parcel.job) resetParcel(index);
      };
      container.append(button);
    });
    return;
  }
  C.papers.forEach((paper,index)=>{
    const button=document.createElement('button');
    button.className='swatch';
    button.disabled=!C.canUsePaper(profile,index);
    button.setAttribute('aria-pressed',String(parcel.paper===index));
    const sample=document.createElement('i'), name=document.createElement('b'), label=document.createElement('small');
    sample.style.setProperty('--color',paper.base);
    name.textContent=paper.name;
    label.textContent=parcel.paper===index?'In use':button.disabled?paper.earned+' stars':'Ready';
    button.append(sample,name,label);
    button.onclick=()=>{
      if(parcel.seal) { byId('menu').close();announce('Start a new parcel to change paper.'); return; }
      parcel.paper=index;
      notes('select');
      persist();
      byId('menu').close();
      update();
    };
    container.append(button);
  });
  const support=host?.support();
  if(support?.like || support?.comment) {
    const hint=document.createElement('p');
    hint.className='hint';
    const options=[];
    if(support.like) options.push('A confirmed GameWave like unlocks Blue Porcelain.');
    if(support.comment) options.push('A confirmed GameWave comment unlocks Berry Foil.');
    hint.textContent=options.join(' ')+' You can also earn both papers with stars.';
    container.append(hint);
  }
}

function openMenu(mode) {
  cancelGesture();
  menuMode=mode;
  fillMenu();
  if(!byId('menu').open) byId('menu').showModal();
}

function cancelGesture() {
  if(!gesture) return;
  if(gesture.flap!==null) animate(gesture.flap,0,160);
  gesture=undefined;
  byId('heldSeal').hidden=true;
}

function bindGesture(button,flap) {
  button.onpointerdown=e=>{
    if(e.button!==0 || gesture) return;
    gesture={id:e.pointerId,flap,x:e.clientX,y:e.clientY,amount:0,moved:false};
    if(flap!==null) animations=animations.filter(a=>a.flap!==flap);
    button.setPointerCapture(e.pointerId);
  };
  button.onpointermove=e=>{
    if(gesture?.id!==e.pointerId || gesture.flap!==flap) return;
    const dx=e.clientX-gesture.x, dy=e.clientY-gesture.y;
    gesture.moved ||= Math.hypot(dx,dy)>8;
    if(flap===null) {
      if(!gesture.moved) return;
      const held=byId('heldSeal');
      held.hidden=false;held.style.left=e.clientX+'px';held.style.top=e.clientY+'px';
      return;
    }
    const [x,y]=table.marker(C.jobs[parcel.job],flap), [tx,ty]=table.target(C.jobs[parcel.job]);
    const distance=Math.hypot(tx-x,ty-y);
    gesture.amount=(dx*(tx-x)+dy*(ty-y))/Math.max(1,distance);
    values[flap]=Math.max(0,Math.min(.89,gesture.amount/Math.max(26,distance*.77)));
    requestDraw();
  };
  button.onpointerup=e=>{
    if(gesture?.id!==e.pointerId || gesture.flap!==flap) return;
    const {moved,amount}=gesture;
    gesture=undefined;
    byId('heldSeal').hidden=true;
    if(flap!==null) {
      if(!moved || amount>=15) commitFold(flap);
      else animate(flap,0,160);
      return;
    }
    if(!moved) { commitSeal(0,0); return; }
    const rect=byId('desk').getBoundingClientRect(), [x,y]=table.target(C.jobs[parcel.job]);
    commitSeal((e.clientX-rect.left-x)/table.scale,(e.clientY-rect.top-y)/table.scale);
  };
  button.onpointercancel=cancelGesture;
  button.onlostpointercapture=e=>{if(gesture?.id===e.pointerId) cancelGesture();};
  button.onclick=e=>{
    if(e.detail!==0) return;
    if(flap===null) commitSeal(0,0); else commitFold(flap);
  };
}

const flapButtons=C.symbols.map((label,index)=>{
  const button=document.createElement('button');
  button.className='flap';
  button.textContent=C.glyphs[index];
  button.setAttribute('aria-label','Fold '+label);
  byId('flaps').append(button);
  bindGesture(button,index);
  return button;
});
bindGesture(byId('stamp'),null);
byId('orders').onclick=()=>openMenu('orders');
byId('paper').onclick=()=>openMenu('paper');
byId('close').onclick=()=>menuMode==='paper'?openMenu('orders'):byId('menu').close();
byId('restart').onclick=()=>{byId('menu').close();resetParcel(parcel.job,true);};
byId('receipt').onclick=showResult;
byId('back').onclick=()=>byId('result').close();
byId('next').onclick=()=>{
  byId('result').close();
  if(parcel.job<C.jobs.length-1) resetParcel(parcel.job+1);
  else openMenu('orders');
};
byId('sound').onclick=()=>{profile.mute=!profile.mute;persist();update();notes('select');};
new ResizeObserver(positionControls).observe(byId('desk'));
window.addEventListener('pagehide',()=>{cancelGesture();host.stop();});
window.addEventListener('pageshow',event=>{if(event.persisted)host=makeHost();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelGesture();});

host=makeHost();
update();
