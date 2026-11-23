/* ANKAN · concept writing-instrument house */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)), lerp=(a,b,t)=>a+(b-a)*t;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE=matchMedia('(pointer: fine)').matches;
const INK={gold:'#d9bd84',neel:'#7d96e8',sindoor:'#d8584a',kesar:'#eaa448'};

/* ───── the sound of the nib (off until asked for) ───── */
const snd=(()=>{ let ctx=null, on=false, g=null, bp=null;
  function init(){ if(ctx) return; ctx=new (window.AudioContext||window.webkitAudioContext)(); const n=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate), d=n.getChannelData(0); let l=0; for(let i=0;i<d.length;i++){ const w=Math.random()*2-1; l=(l+.02*w)/1.02; d[i]=w*.6+l*3; }
    const src=ctx.createBufferSource(); src.buffer=n; src.loop=true; bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2600; bp.Q.value=.9; const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=900; g=ctx.createGain(); g.gain.value=0; src.connect(bp).connect(hp).connect(g).connect(ctx.destination); src.start(); }
  function tone(f0,f1,dur,vol,type='sine'){ if(!on) return; const o=ctx.createOscillator(), a=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(f0,ctx.currentTime); o.frequency.exponentialRampToValueAtTime(f1,ctx.currentTime+dur); a.gain.setValueAtTime(vol,ctx.currentTime); a.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+dur); o.connect(a).connect(ctx.destination); o.start(); o.stop(ctx.currentTime+dur); }
  function burst(dur,vol,freq){ if(!on) return; g.gain.cancelScheduledValues(ctx.currentTime); bp.frequency.setValueAtTime(freq,ctx.currentTime); g.gain.setValueAtTime(vol,ctx.currentTime); g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+dur); }
  return {
    toggle(){ init(); on=!on; if(ctx.state==='suspended') ctx.resume(); if(on) tone(880,1320,.25,.05); return on; },
    scratch(v){ if(!on||!g) return; const t=ctx.currentTime; bp.frequency.setTargetAtTime(2200+Math.random()*1600,t,.02); g.gain.setTargetAtTime(Math.min(.09,v*.05),t,.015); g.gain.setTargetAtTime(0,t+.06,.05); },
    drop(){ tone(1100,280,.35,.12); setTimeout(()=>tone(640,200,.4,.05),80); },
    chime(){ tone(1568,1560,1.4,.04); tone(2349,2340,1.1,.025); },
    whoosh(){ burst(.9,.08,700); },
    fold(){ burst(.25,.07,1800); },
    thump(){ tone(160,50,.35,.35,'triangle'); }
  }; })();

/* ───── smooth scroll ───── */
let lenis=null;
if(!RM&&window.Lenis){ lenis=new Lenis({lerp:.09,smoothWheel:true}); window.__lenis=lenis; const raf=t=>{lenis.raf(t);requestAnimationFrame(raf)}; requestAnimationFrame(raf); }
$$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{ const t=$(a.getAttribute('href')); if(!t) return; e.preventDefault(); lenis?lenis.scrollTo(t,{duration:1.6}):t.scrollIntoView({behavior:RM?'auto':'smooth'}); }));

/* ───── the film: 366 frames in four interleaved passes ───── */
const fc=$('#fc'), fx=fc.getContext('2d'); let FW=1280, FH=720, N=366, blobs=[], bmp=new Map(), decoding=new Set(), curF=0, tgtF=0, poster=null, lastDrawn=-1;
let geo={s:1,ox:0,oy:0};
function fsize(){ const d=Math.min(devicePixelRatio||1,2); fc.width=Math.round(innerWidth*d); fc.height=Math.round(innerHeight*d); lastDrawn=-1;
  const s=Math.max(innerWidth/FW,innerHeight/FH); geo={s,ox:(innerWidth-FW*s)/2,oy:(innerHeight-FH*s)/2}; placeParts(); }
function drawImg(im){ const cw=fc.width, ch=fc.height, s=Math.max(cw/FW,ch/FH), w=FW*s, h=FH*s; fx.drawImage(im,(cw-w)/2,(ch-h)/2,w,h); }
function decode(i){ if(i<0||i>=N||bmp.has(i)||decoding.has(i)||!blobs[i]||decoding.size>3) return; decoding.add(i);
  createImageBitmap(blobs[i]).then(b=>{ decoding.delete(i); bmp.set(i,b); if(bmp.size>70){ let far=-1,fd=-1; for(const k of bmp.keys()){ const d=Math.abs(k-curF); if(d>fd){fd=d;far=k;} } if(far>=0&&far!==i){ bmp.get(far).close&&bmp.get(far).close(); bmp.delete(far);} } lastDrawn=-1; },()=>decoding.delete(i)); }
function nearest(i){ for(let d=0;d<N;d++){ if(bmp.has(i-d)) return i-d; if(bmp.has(i+d)) return i+d; } return -1; }
let filmVis=true;
function filmLoop(){ requestAnimationFrame(filmLoop); if(!filmVis) return; curF+=(tgtF-curF)*(RM?1:.16); const i=Math.round(curF);
  for(let d=0;d<8;d++) decode(i+(tgtF>=curF?d:-d)); decode(i);
  const n=bmp.has(i)?i:nearest(i);
  if(n>=0&&n!==lastDrawn){ drawImg(bmp.get(n)); lastDrawn=n; } else if(n<0&&poster&&poster.complete&&lastDrawn!==-2){ drawImg(poster); lastDrawn=-2; } }
let readyRes; const readyP=new Promise(r=>readyRes=r);
async function loadFilm(onProg){
  poster=new Image(); poster.src='img/film-first.webp'; await poster.decode().catch(()=>{}); lastDrawn=-1;
  const mf=await (await fetch('pack/film.json')).json(); N=mf.n; FW=mf.w; FH=mf.h; blobs=new Array(N);
  const P=mf.parts.length, sizes=mf.parts.map(p=>p.reduce((s,e)=>s+e[2],0));
  for(let k=0;k<P;k++){
    const r=await fetch(`pack/film-${k}.webp`); let buf; const rd=r.body&&r.body.getReader?r.body.getReader():null;
    if(rd){ const ch=[]; let got=0; for(;;){ const {done,value}=await rd.read(); if(done) break; ch.push(value); got+=value.length; onProg(k,got/sizes[k]); } buf=new Blob(ch); } else { buf=await r.blob(); onProg(k,1); }
    for(const [i,o,l] of mf.parts[k]) blobs[i]=buf.slice(o,o+l,'image/webp');
    if(k===0) readyRes();
  } }

/* ───── loader: the nib signs "Ankan" as the film fills the pen ───── */
const LD=$('#ld'), ldN=$('#ldN'), ldSvg=$('#ldSig'), ldInkG=$('#ldInk'), ldTrG=$('#ldTrack'), ldFill=$('#ldFill'), ldNib=$('#ldNib');
let ldTarget=0, shown=0, ldEls=[], ldTot=0, ldReady=false;
const NSv='http://www.w3.org/2000/svg';
const mkL=(t,a)=>{ const e=document.createElementNS(NSv,t); for(const k in a) e.setAttribute(k,a[k]); return e; };
const ldFontP=(window.opentype?fetch('fonts/pinyon.woff').then(r=>r.arrayBuffer()).then(b=>opentype.parse(b)):Promise.reject()).then(f=>{
  const size=230, p0=f.getPath('Ankan',0,0,size), bb=p0.getBoundingBox(), ox=400-(bb.x1+bb.x2)/2, oy=150-(bb.y1+bb.y2)/2;
  const p=f.getPath('Ankan',ox,oy,size); const full=p.toPathData(2).split(/(?=M)/).filter(x=>!x.includes('NaN'));
  ldFill.setAttribute('d',full.join(''));
  full.forEach(d=>{ ldTrG.append(mkL('path',{d})); const e=mkL('path',{d}); ldInkG.append(e); const L=e.getTotalLength(); e.style.strokeDasharray=`${L} ${L}`; e.style.strokeDashoffset=L; ldEls.push({e,L}); ldTot+=L; });
  ldReady=true; }).catch(()=>{});
function ldDraw(){ if(!ldReady) return; let d=shown*ldTot, acc=0, tip=null; for(const o of ldEls){ const k=clamp((d-acc)/o.L); o.e.style.strokeDashoffset=o.L*(1-k); if(k>0&&k<1) tip=o.e.getPointAtLength(o.L*k); acc+=o.L; }
  if(tip){ ldNib.setAttribute('transform',`translate(${tip.x} ${tip.y}) rotate(26)`); if(!RM&&!LD.classList.contains('done')) ldNib.setAttribute('opacity',1); } }
function ldSet(p){ ldTarget=Math.max(ldTarget,p); }
let ldLoopOn=true;
(function ll(){ if(!ldLoopOn) return; requestAnimationFrame(ll); const prev=shown; shown=Math.min(ldTarget,shown+Math.max(.0025,(ldTarget-shown)*.06)); if(RM) shown=ldTarget; ldN.textContent=Math.round(shown*100); ldDraw(); if(shown>prev) snd.scratch((shown-prev)*60); })();
loadFilm((k,g)=>{ if(k===0) ldSet(g*.97); }).catch(()=>readyRes());
requestAnimationFrame(filmLoop);
let openRes; const openedP=new Promise(r=>openRes=r);
function ldBurst(){ const c=$('#ldDust'), x=c.getContext('2d'), d=Math.min(devicePixelRatio||1,2); c.width=innerWidth*d; c.height=innerHeight*d; x.setTransform(d,0,0,d,0,0);
  const m=ldSvg.getScreenCTM(); const pts=[]; ldEls.forEach(o=>{ for(let l=0;l<o.L;l+=3.2){ const q=o.e.getPointAtLength(l); pts.push({x:m.a*q.x+m.e, y:m.d*q.y+m.f, vx:(Math.random()-.5)*2.4, vy:-Math.random()*2.6-.4, s:Math.random()*2.2+.6, a:Math.random()*6.28, life:1}); } });
  const t0=performance.now(); (function b(t){ const k=(t-t0)/1700; x.clearRect(0,0,innerWidth,innerHeight); if(k>=1) return c.remove();
    for(const p of pts){ p.x+=p.vx; p.y+=p.vy; p.vy+=.035; p.vx*=.99; p.a+=.12; x.globalAlpha=(1-k)*(.5+.5*Math.sin(p.a*2)); x.fillStyle=Math.sin(p.a)>.6?'#fff4d6':'#d9bd84'; x.save(); x.translate(p.x,p.y); x.rotate(p.a); x.fillRect(-p.s,-p.s*.3,p.s*2,p.s*.6); x.restore(); }
    requestAnimationFrame(b); })(t0); }
function openPage(){
  const finish=()=>{ setTimeout(openRes,650); LD.classList.add('out'); snd.whoosh(); document.body.classList.remove('locked'); document.documentElement.classList.add('ready'); onScroll(); setTimeout(()=>{ ldLoopOn=false; LD.remove(); document.documentElement.classList.add('settled'); },1800); };
  if(RM||!ldReady) return finish();
  LD.classList.add('done'); ldNib.setAttribute('opacity',0);
  setTimeout(()=>{ ldBurst(); $('#ldSig').style.transition='opacity .5s'; $('#ldSig').style.opacity=0; LD.classList.add('slit'); snd.chime(); },900);
  setTimeout(finish,1500); }
Promise.all([readyP,document.fonts?document.fonts.ready:0,new Promise(r=>setTimeout(r,RM?100:2200))]).then(()=>{ ldSet(1); const w=()=>{ if(shown>=.999||RM||!ldReady) setTimeout(openPage,250); else setTimeout(w,80); }; w(); });
setTimeout(()=>readyRes(),15000);


/* ───── film choreography ─────
   0 → .36  the pen turns into line     frames 0 → 189
   .36 → .62 it comes apart              frames 190 → 365
   .62 → .70 held apart, parts named
   .70 → 1   it reassembles              frames 365 → 176 (reverse)            */
const film=$('#film'), hero=$('#hero'), cue=$('#cue');
new IntersectionObserver(e=>filmVis=e[0].isIntersecting).observe(film);
const CH=[['#ch1',.12,.32],['#ch2',.84,1.1]].map(([s,a,b])=>({el:$(s),a,b}));
const PTS=$$('.pt'), hudL=$$('#hud li');
function placeParts(){ const y=358*geo.s+geo.oy; PTS.forEach((p,i)=>{ const x=+p.dataset.x*geo.s+geo.ox; const l=Math.max(34,Math.min(90,innerHeight*.09)); p.style.setProperty('--l',l+'px');
  p.style.visibility=(x<24||x>innerWidth-24)?'hidden':''; p.style.transform=`translate(${x}px,${p.classList.contains('up')?y-42*geo.s:y+42*geo.s}px)`; p.style.top='0'; }); }
function mapFrame(p){ if(p<.36) return p/.36*189; if(p<.62) return 190+(p-.36)/.26*175; if(p<.70) return 365; return 365-(p-.70)/.30*189; }
function filmFrame(){ const r=film.getBoundingClientRect(), tot=r.height-innerHeight; const p=clamp(-r.top/tot); tgtF=mapFrame(p);
  const hv=1-clamp(p/.06); hero.style.opacity=hv; hero.style.transform=`translateY(${(1-hv)*-40}px)`; cue.style.opacity=hv; const hf=$('#heroFoot'), pl=$('#plate'); hf.style.opacity=hv; hf.style.transform=`translateY(${(1-hv)*30}px)`; if(pl) pl.style.opacity=hv;
  CH.forEach(({el,a,b})=>{ const tin=clamp((p-a)/.06), tout=b>1?0:clamp((p-(b-.05))/.05); el.style.opacity=tin*(1-tout); el.style.transform=`translateY(${(1-tin)*30-tout*30}px)`; });
  const on=p>.585&&p<.72; PTS.forEach((pt,i)=>{ pt.classList.toggle('on',on); pt.style.transitionDelay=on?(i*.07)+'s':'0s'; });
  [[0,.36],[.36,.70],[.70,1]].forEach(([a,b],i)=>{ hudL[i].classList.toggle('on',p>=a&&(p<b||i==2)); hudL[i].querySelector('b').style.setProperty('--k',clamp((p-a)/(b-a))); }); }
fsize(); addEventListener('resize',()=>{ fsize(); onScroll(); });

/* ───── header ───── */
const hd=$('#hd'); let lastY=0;
function hdState(){ const y=scrollY, inFilm=film.getBoundingClientRect().bottom>80; hd.classList.toggle('solid',!inFilm); const lt=$$('.light').some(s=>{ const r=s.getBoundingClientRect(); return r.top<=40&&r.bottom>40; }); hd.classList.toggle('lt',lt); hd.classList.toggle('hide',y>lastY+4&&y>innerHeight*1.2); if(y<lastY-4) hd.classList.remove('hide'); lastY=y; }

/* ───── split + reveal ───── */
const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }),{rootMargin:'0px 0px -12% 0px'});
$$('.rv').forEach(el=>io.observe(el));

/* ───── grinding loop ───── */
const gv=$('#grindV'), gs=$('#nib');
new IntersectionObserver(e=>{ if(e[0].isIntersecting){ gv.preload='auto'; gv.play().catch(()=>{}); } else gv.pause(); },{rootMargin:'200px'}).observe(gs);
function grindFrame(){ const r=gs.getBoundingClientRect(); const p=clamp(1-(r.bottom)/(innerHeight+r.height)); gv.style.setProperty('--s',(1.18-p*.14).toFixed(3)); }

/* ───── ink trail cursor ───── */
const tr=$('#trail'), tx=tr.getContext('2d'); let pts=[];
function tsize(){ const d=Math.min(devicePixelRatio||1,2); tr.width=innerWidth*d; tr.height=innerHeight*d; tx.setTransform(d,0,0,d,0,0); }
if(FINE&&!RM){ tsize(); addEventListener('resize',tsize);
  addEventListener('pointermove',e=>{ if(e.pointerType!=='mouse') return; pts.push({x:e.clientX,y:e.clientY,t:performance.now()}); });
  (function tl(){ requestAnimationFrame(tl); const now=performance.now(); pts=pts.filter(p=>now-p.t<520); tx.clearRect(0,0,innerWidth,innerHeight); if(pts.length<2) return;
    tx.lineCap='round'; tx.lineJoin='round';
    for(let i=1;i<pts.length;i++){ const a=pts[i-1],b=pts[i],k=1-(now-b.t)/520; tx.strokeStyle=`rgba(217,189,132,${(k*.75).toFixed(3)})`; tx.lineWidth=.6+k*2.2; tx.beginPath(); tx.moveTo(a.x,a.y); tx.lineTo(b.x,b.y); tx.stroke(); }
    const h=pts[pts.length-1]; tx.fillStyle='#f1d79a'; tx.beginPath(); tx.arc(h.x,h.y,2.2,0,7); tx.fill(); })();
} else tr.remove();

/* ───── test pad ───── */
const pc=$('#padC'), px=pc.getContext('2d'); let nibW=2.2, nibK=0, drawing=false, lp=null, padTouched=false;
function psize(){ const d=Math.min(devicePixelRatio||1,2), r=pc.getBoundingClientRect(); const old=document.createElement('canvas'); old.width=pc.width; old.height=pc.height; old.getContext('2d').drawImage(pc,0,0);
  pc.width=r.width*d; pc.height=r.height*d; px.setTransform(d,0,0,d,0,0); px.drawImage(old,0,0,old.width/d,old.height/d); }
psize(); addEventListener('resize',psize);
const EDGE=-35*Math.PI/180;
function seg(a,b){ const dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy); if(len<.4) return; const th=Math.atan2(dy,dx);
  const dirW=nibK?nibW*((1-nibK)+nibK*Math.abs(Math.sin(th-EDGE))):nibW; const sp=clamp(len/24); const w=Math.max(.8,dirW*(1-sp*.25));
  const steps=Math.ceil(len/1.2); for(let i=0;i<=steps;i++){ const t=i/steps, x=a.x+dx*t, y=a.y+dy*t;
    if(nibK){ px.save(); px.translate(x,y); px.rotate(EDGE); px.fillStyle='rgba(217,189,132,.55)'; px.fillRect(-nibW/2,-Math.max(.7,nibW*(1-nibK))/2,nibW,Math.max(.7,nibW*(1-nibK))); px.restore(); }
    else { px.fillStyle='rgba(217,189,132,.5)'; px.beginPath(); px.arc(x,y,w/2,0,7); px.fill(); } } }
function ppos(e){ const r=pc.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
pc.addEventListener('pointerdown',e=>{ drawing=true; lp=ppos(e); pc.setPointerCapture(e.pointerId); if(!padTouched){ padTouched=true; $('.sheet-hint').style.opacity=0; } });
pc.addEventListener('pointermove',e=>{ if(!drawing) return; const p=ppos(e); snd.scratch(clamp(Math.hypot(p.x-lp.x,p.y-lp.y)/12)); seg(lp,p); lp=p; });
['pointerup','pointercancel'].forEach(t=>pc.addEventListener(t,()=>drawing=false));
$('#padClear').addEventListener('click',()=>{ px.clearRect(0,0,pc.width,pc.height); demo(); });
$$('.nibs button').forEach(b=>b.addEventListener('click',()=>{ $$('.nibs button').forEach(x=>{x.classList.remove('on');x.setAttribute('aria-checked','false')}); b.classList.add('on'); b.setAttribute('aria-checked','true'); nibW=+b.dataset.w; nibK=+b.dataset.k; px.clearRect(0,0,pc.width,pc.height); demo(); }));
let demoId=0;
function demo(){ const id=++demoId, r=pc.getBoundingClientRect(), W=r.width, H=r.height; const path=[]; const x0=W*.12, x1=W*.88;
  for(let i=0;i<=260;i++){ const t=i/260, x=lerp(x0,x1,t)+Math.sin(t*Math.PI*9)*W*.03, y=H*.5+Math.cos(t*Math.PI*9)*H*.16+Math.sin(t*Math.PI*2)*H*.08; path.push({x,y}); }
  let i=1; (function st(){ if(id!==demoId) return; for(let k=0;k<(RM?260:5)&&i<path.length;k++,i++) seg(path[i-1],path[i]); if(i<path.length) requestAnimationFrame(st); })(); }
let demoed=false; new IntersectionObserver(e=>{ if(e[0].isIntersecting&&!demoed){ demoed=true; demo(); } },{threshold:.4}).observe(pc);

/* ───── write your name ───── */
const sig=$('#sig'), sS=$('#sigStroke'), sF=$('#sigFill'), nibG=$('#nibG'), drops=$('#drops'), shine=$('#shine'), clipP=$('#sigClipP');
let font=null, ink='gold', writeId=0;
const fontP=(window.opentype?fetch('fonts/pinyon.woff').then(r=>r.arrayBuffer()).then(b=>{ font=opentype.parse(b); return font; }):Promise.resolve(null)).catch(()=>null);
$$('.inks button').forEach(b=>b.addEventListener('click',()=>{ $$('.inks button').forEach(x=>{x.classList.remove('on');x.setAttribute('aria-checked','false')}); b.classList.add('on'); b.setAttribute('aria-checked','true'); ink=b.dataset.ink; write(); }));
$('#wForm').addEventListener('submit',e=>{ e.preventDefault(); write(); });
const NS='http://www.w3.org/2000/svg';
function mk(t,a){ const e=document.createElementNS(NS,t); for(const k in a) e.setAttribute(k,a[k]); return e; }
async function write(){ await fontP; if(!font) return; const id=++writeId; const name=($('#wName').value.trim()||'Ankan').slice(0,18);
  sig.setAttribute('aria-label',`${name}, written in ink`);
  const size=200, path=font.getPath(name,0,0,size), bb=path.getBoundingBox(); const pad=40;
  sig.setAttribute('viewBox',`${bb.x1-pad} ${bb.y1-pad} ${bb.x2-bb.x1+pad*2} ${bb.y2-bb.y1+pad*2}`); sig.setAttribute('preserveAspectRatio','xMidYMid meet');
  // split into contours
  const cs=[]; let cur=[]; path.commands.forEach(c=>{ if(c.type==='M'&&cur.length){ cs.push(cur); cur=[]; } cur.push(c); }); if(cur.length) cs.push(cur);
  const toD=cmds=>cmds.map(c=>c.type==='M'?`M${c.x} ${c.y}`:c.type==='L'?`L${c.x} ${c.y}`:c.type==='Q'?`Q${c.x1} ${c.y1} ${c.x} ${c.y}`:c.type==='C'?`C${c.x1} ${c.y1} ${c.x2} ${c.y2} ${c.x} ${c.y}`:'Z').join('');
  const full=path.toPathData(2).split(/(?=M)/).filter(x=>!x.includes('NaN')).join(''); const col=ink==='gold'?'url(#gGold)':INK[ink];
  sS.innerHTML=''; sF.innerHTML=''; drops.innerHTML=''; sF.classList.remove('on'); shine.setAttribute('opacity',0); clipP.setAttribute('d',full);
  sF.append(mk('path',{d:full,fill:col}));
  const sw=size*.011; const els=cs.map(c=>{ const p=mk('path',{d:toD(c),stroke:col,'stroke-width':sw}); sS.append(p); const L=p.getTotalLength(); p.style.strokeDasharray=`${L} ${L}`; p.style.strokeDashoffset=L; return {p,L}; });
  const total=els.reduce((s,e)=>s+e.L,0); const dur=RM?1:clamp(total/6,1800,5200); let t0=null; nibG.setAttribute('opacity',RM?0:1); sS.style.opacity=1;
  const nibS=size/150;
  function step(ts){ if(id!==writeId) return; if(!t0) t0=ts; let d=clamp((ts-t0)/dur)*total;
    let acc=0, tip=null; for(const e of els){ const k=clamp((d-acc)/e.L); e.p.style.strokeDashoffset=e.L*(1-k); if(k>0&&k<1){ tip=e.p.getPointAtLength(e.L*k); } acc+=e.L; }
    if(tip){ snd.scratch(1); nibG.setAttribute('transform',`translate(${tip.x} ${tip.y}) rotate(28) scale(${nibS})`);
      if(Math.random()<.18&&drops.childElementCount<60){ const c=mk('circle',{cx:tip.x+(Math.random()-.5)*6,cy:tip.y+(Math.random()-.5)*6,r:(Math.random()*1.6+.4)*nibS,fill:col}); drops.append(c); c.animate([{opacity:.9},{opacity:0,transform:`translate(0px,${4+Math.random()*6}px)`}],{duration:900,fill:'forwards'}); } }
    if(d<total) requestAnimationFrame(step); else finish(); }
  function finish(){ snd.chime(); nibG.setAttribute('opacity',0); sF.classList.add('on'); sS.animate([{opacity:1},{opacity:.25}],{duration:1400,fill:'forwards'});
    if(ink==='gold'&&!RM){ const vb=sig.viewBox.baseVal; shine.setAttribute('x',vb.x-vb.width*.2); shine.setAttribute('y',vb.y); shine.setAttribute('width',vb.width*.18); shine.setAttribute('height',vb.height); shine.setAttribute('opacity',1);
      shine.animate([{transform:'translateX(0)'},{transform:`translateX(${vb.width*1.4}px)`}],{duration:1800,delay:600,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}); } }
  requestAnimationFrame(step); }
let wrote=false; new IntersectionObserver(e=>{ if(e[0].isIntersecting&&!wrote){ wrote=true; write(); } },{threshold:.45}).observe($('.stage'));

/* ───── collection rail ───── */
const coll=$('#collection'), rail=$('#rail'), cbar=$('#collBar');
function collFrame(){ const r=coll.getBoundingClientRect(), tot=r.height-innerHeight; const p=clamp(-r.top/tot); const max=Math.max(0,rail.scrollWidth-innerWidth); rail.style.transform=`translate3d(${-p*max}px,0,0)`; cbar.style.transform=`scaleX(${p})`; }

/* ───── anatomy ───── */
const hs=$$('.hs'), al=$$('.anat-list li');
function anat(i){ hs.forEach((h,j)=>h.classList.toggle('on',i===j)); al.forEach((l,j)=>l.classList.toggle('on',i===j)); }
hs.forEach((h,i)=>h.addEventListener('click',()=>anat(i))); al.forEach((l,i)=>l.addEventListener('click',()=>anat(i))); anat(0);

/* ───── karigar parallax ───── */
const kimg=$('.kar-img img');
function karFrame(){ const r=kimg.parentElement.getBoundingClientRect(); if(r.bottom<0||r.top>innerHeight) return; const p=(r.top+r.height/2-innerHeight/2)/innerHeight; kimg.style.setProperty('--py',(p*-6).toFixed(2)+'%'); }

/* ───── commission: handled by the letter (see below) ───── */

/* ───── scroll loop ───── */
function onScroll(){ filmFrame(); hdState(); grindFrame(); collFrame(); karFrame(); }
if(lenis) lenis.on('scroll',onScroll); addEventListener('scroll',onScroll,{passive:true}); onScroll();

/* ═════ richness layer ═════ */

/* guilloché: layered hypotrochoid rosettes, like an engraved watch dial */
$$('.guil').forEach(svg=>{ const n=+svg.dataset.n||9, k=+svg.dataset.k||70; svg.setAttribute('viewBox','-500 -500 1000 1000'); let html='';
  const rings=[[460,1],[380,.85],[300,.7],[210,.55]];
  rings.forEach(([R,f],ri)=>{ for(let j=0;j<3;j++){ const ph=j*Math.PI/(n*3); let d=''; const steps=1400;
    for(let i=0;i<=steps;i++){ const t=i/steps*Math.PI*2; const r=R*(1-.07*f)+k*f*.5*Math.sin(n*(t+ph))+k*f*.22*Math.sin((n*2+ri)*t); d+=(i?'L':'M')+(r*Math.cos(t)).toFixed(1)+' '+(r*Math.sin(t)).toFixed(1); }
    html+=`<path d="${d}Z"/>`; } });
  svg.innerHTML=html; });

/* gold leaf dust drifting through the film */
const dc=$('#dust'), dx=dc.getContext('2d'); let flakes=[], dustOn=true;
function dsize(){ const d=Math.min(devicePixelRatio||1,2); dc.width=innerWidth*d; dc.height=innerHeight*d; dx.setTransform(d,0,0,d,0,0); }
dsize(); addEventListener('resize',dsize);
for(let i=0;i<(innerWidth<700?38:80);i++) flakes.push({x:Math.random()*innerWidth,y:Math.random()*innerHeight,z:Math.random(),a:Math.random()*6.28,s:Math.random()*.5+.2,w:Math.random()*6.28});
let filmPg=0;
if(!RM)(function dl(){ requestAnimationFrame(dl); if(!filmVis) return; dx.clearRect(0,0,innerWidth,innerHeight); const vis=1-clamp((filmPg-.3)/.1)+clamp((filmPg-.8)/.15); if(vis<=0.01) return;
  for(const f of flakes){ f.y-=f.s*(.4+f.z); f.x+=Math.sin(f.w+=.01)*.3; f.a+=.02*(f.z+.3); if(f.y<-10){ f.y=innerHeight+10; f.x=Math.random()*innerWidth; }
    const tw=(Math.sin(f.a*2)+1)/2, sz=(1+f.z*2.6); dx.globalAlpha=vis*(.15+tw*.7)*(.4+f.z*.6);
    dx.fillStyle=tw>.85?'#fff4d6':'#e7cf9c'; dx.save(); dx.translate(f.x,f.y); dx.rotate(f.a); dx.fillRect(-sz/2,-sz*.18,sz,sz*.36+tw*sz*.4); dx.restore(); } })();

/* wax seal after the signature */
const seal=$('#seal'), stage=$('.stage');
const _finishHook=()=>{ const sr=stage.getBoundingClientRect(), fr=sF.getBoundingClientRect(), w=seal.offsetWidth;
  let x=fr.right-sr.left+w*.05, y=fr.bottom-sr.top-w*.55; if(x+w>sr.width){ x=sr.width-w-4; y=fr.bottom-sr.top+8; } seal.style.left=x+'px'; seal.style.right='auto'; seal.style.top=y+'px'; seal.style.bottom='auto';
  seal.classList.remove('on'); stage.classList.remove('shake'); void seal.offsetWidth; seal.classList.add('on'); setTimeout(()=>snd.thump(),500); stage.classList.add('shake'); };
new MutationObserver(()=>{ if(sF.classList.contains('on')) setTimeout(_finishHook,RM?0:900); else seal.classList.remove('on'); }).observe(sF,{attributes:true,attributeFilter:['class']});

/* collection: edition numbers, focus the centred pen, tilt on hover */
const pens=$$('.pen');
pens.forEach((p,i)=>{ const no=document.createElement('span'); no.className='no'; no.textContent=`No. ${String(i+1).padStart(2,'0')}`; p.querySelector('figure').append(no);
  if(FINE) { const fg=p.querySelector('figure'); fg.addEventListener('pointermove',e=>{ const r=fg.getBoundingClientRect(); fg.style.setProperty('--ry',((e.clientX-r.left)/r.width-.5)*10+'deg'); fg.style.setProperty('--rx',(.5-(e.clientY-r.top)/r.height)*8+'deg'); });
    fg.addEventListener('pointerleave',()=>{ fg.style.setProperty('--ry','0deg'); fg.style.setProperty('--rx','0deg'); }); } });
function penFocus(){ const cx=innerWidth*.5; pens.forEach(p=>{ const r=p.getBoundingClientRect(); const d=Math.abs(r.left+r.width/2-cx)/innerWidth; const k=clamp(1-d*1.6); p.style.setProperty('--op',(.5+k*.5).toFixed(3)); p.style.setProperty('--sc',(.94+k*.06).toFixed(3)); p.style.setProperty('--ty',((1-k)*18).toFixed(1)+'px'); }); }

/* extend the scroll loop */
const _baseScroll=onScroll;
function onScroll2(){ const r=film.getBoundingClientRect(); filmPg=clamp(-r.top/(r.height-innerHeight)); penFocus(); }
if(lenis) lenis.on('scroll',onScroll2); addEventListener('scroll',onScroll2,{passive:true}); onScroll2();

/* ═════════════ the pen house layer ═════════════ */

/* ── headings written in ink ── */
let BF=null, BFI=null;
const bodP=window.opentype?Promise.all(['fonts/bodoni-400.woff','fonts/bodoni-400i.woff'].map(u=>fetch(u).then(r=>r.arrayBuffer()).then(b=>opentype.parse(b)))).then(([a,b])=>{BF=a;BFI=b;}).catch(()=>{}):Promise.resolve();
const inkHs=$$('.ink-h');
if(!RM) inkHs.forEach(h=>h.classList.add('pending'));
function inkWrite(h){ if(h.dataset.done) return; h.dataset.done=1; const f=getComputedStyle(h).fontStyle==='italic'?BFI:BF;
  if(!f||RM){ h.classList.remove('pending'); return; }
  const orig=h.innerHTML; const lines=orig.split(/<br\s*\/?>/i).map(l=>l.replace(/<[^>]+>/g,'').trim().split(/\s+/).filter(Boolean)); const words=lines.flat(); h.innerHTML=lines.map(ws=>ws.map(w=>`<span class="wd">${w}</span>`).join(' ')).join('<br>');
  const cs=getComputedStyle(h), fs=parseFloat(cs.fontSize), col=cs.color, hr=h.getBoundingClientRect();
  const asc=f.ascender/f.unitsPerEm*fs, des=-f.descender/f.unitsPerEm*fs;
  const svg=mk('svg',{class:'ih',width:hr.width,height:hr.height,viewBox:`0 0 ${hr.width} ${hr.height}`}); const gS=mk('g',{}), gF=mk('g',{});
  const strokes=[];
  $$('.wd',h).forEach((sp,i)=>{ const r=sp.getBoundingClientRect(), x=r.left-hr.left, base=r.top-hr.top+(r.height-(asc+des))/2+asc;
    const p=f.getPath(words[i],0,0,fs); p.commands=p.commands.filter(c=>Object.values(c).every(v=>typeof v!=='number'||isFinite(v))); const adv=f.getAdvanceWidth(words[i],fs)||1, sx=r.width/adv, d=p.toPathData(2).split(/(?=M)/).filter(x=>!x.includes('NaN')).join(''), tf=`translate(${x} ${base}) scale(${sx} 1)`;
    const pf=mk('path',{d,class:'fl',fill:col,transform:tf}); gF.append(pf);
    const ps=mk('path',{d,class:'st',stroke:col,'stroke-width':Math.max(.6,fs*.012),transform:tf}); gS.append(ps); strokes.push(ps); });
  const bead=mk('circle',{r:Math.max(2,fs*.035),class:'bead'}); svg.append(gF,gS,bead); h.append(svg);
  const L=strokes.map(p=>{ const l=p.getTotalLength(); p.style.strokeDasharray=`${l} ${l}`; p.style.strokeDashoffset=l; return l; }), tot=L.reduce((a,b)=>a+b,0);
  const dur=clamp(tot*.45,900,1900); let t0=null;
  (function st(ts){ if(!t0) t0=ts; const d=clamp((ts-t0)/dur)*tot; let acc=0, tip=null, tpath=null;
    strokes.forEach((p,i)=>{ const k=clamp((d-acc)/L[i]); p.style.strokeDashoffset=L[i]*(1-k); if(k>0&&k<1){ tip=p.getPointAtLength(L[i]*k); tpath=p; } acc+=L[i]; });
    if(tip){ const m=tpath.getCTM(), sm=svg.getCTM().inverse().multiply(m); const q=svg.createSVGPoint(); q.x=tip.x; q.y=tip.y; const g=q.matrixTransform(sm); bead.setAttribute('cx',g.x); bead.setAttribute('cy',g.y); }
    if(tip) snd.scratch(.9);
    if(d<tot) requestAnimationFrame(st); else { bead.remove(); h.classList.add('filled'); setTimeout(()=>{ h.classList.remove('pending'); svg.style.transition='opacity .8s'; svg.style.opacity=0; setTimeout(()=>{ svg.remove(); h.innerHTML=orig; },900); },650); } })(performance.now()); }
const iho=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ iho.unobserve(e.target); Promise.all([bodP,openedP]).then(()=>inkWrite(e.target)); } }),{threshold:.3});
inkHs.forEach(h=>iho.observe(h));
setTimeout(()=>inkHs.forEach(h=>{ if(!BF) h.classList.remove('pending'); }),8000);

/* ── photos soak in like ink, from where they were first seen ── */
const soakO=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ $$(':scope > .soak',e.target).forEach(w=>{ w.style.setProperty('--mx',(30+Math.random()*40)+'%'); w.style.setProperty('--my',(30+Math.random()*40)+'%'); w.classList.add('in'); }); soakO.unobserve(e.target); } }),{rootMargin:'0px 0px -15% 0px'});
[...new Set($$('.soak').map(w=>w.parentElement))].forEach(p=>soakO.observe(p));

/* ── the drop: one bead of gold falls, the paper spreads ── */
const bleed=$('#bleed'), bsv=$('#bleedSvg'), blot=$('#blot'), drop=$('#drop'), spl=$('#splash'), bl=$('#bleedL');
const SPL=Array.from({length:14},(_,i)=>({a:i/14*6.283+Math.random()*.3, v:.6+Math.random()*.8, r:2+Math.random()*5}));
SPL.forEach(()=>spl.append(mk('circle',{r:0})));
const ripples=[0,1,2].map(()=>{ const c=mk('circle',{fill:'none',stroke:'#e7cf9c','stroke-width':1}); bsv.insertBefore(c,blot); return c; });
function bleedFrame(){ const r=bleed.getBoundingClientRect(); if(r.bottom<0||r.top>innerHeight) return; const W=innerWidth,H=innerHeight; bsv.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const p=clamp(-r.top/(r.height-H)), cx=W/2, cy=H*.5, hit=.26;
  const fp=clamp(p/hit), fy=lerp(-30,cy,fp*fp); if(p>=hit&&!bleed._hit){ bleed._hit=1; snd.drop(); } if(p<hit*.8) bleed._hit=0; drop.setAttribute('cx',cx); drop.setAttribute('cy',fy); drop.setAttribute('r',p<hit?9:0); drop.setAttribute('transform',`translate(${cx} ${fy}) scale(${1-fp*.15} ${1+fp*.5}) translate(${-cx} ${-fy})`);
  const g=clamp((p-hit)/(1-hit-.06)), e=1-Math.pow(1-g,2.2), R=e*Math.hypot(W,H)*.62;
  let d=''; const n=200; for(let i=0;i<=n;i++){ const t=i/n*6.283; const rr=R*(1+.07*Math.sin(5*t+g*3)+.045*Math.sin(9*t-g*5)+.03*Math.sin(14*t)); d+=(i?'L':'M')+(cx+rr*Math.cos(t)).toFixed(1)+' '+(cy+rr*Math.sin(t)).toFixed(1); }
  blot.setAttribute('d',R>0?d+'Z':'');
  [...spl.children].forEach((c,i)=>{ const s=SPL[i], k=clamp((p-hit)/.2), dist=(R+30+k*120*s.v); c.setAttribute('cx',cx+Math.cos(s.a)*dist); c.setAttribute('cy',cy+Math.sin(s.a)*dist); c.setAttribute('r',p>hit?s.r*(1-clamp((p-hit-.12)/.25)):0); });
  ripples.forEach((c,i)=>{ const k=clamp((p-hit-i*.03)/.25); c.setAttribute('cx',cx); c.setAttribute('cy',cy); c.setAttribute('r',20+k*Math.min(W,H)*.45); c.setAttribute('opacity',p>hit?(1-k)*.6:0); });
  bl.style.opacity=clamp((p-.06)/.1)*(1-clamp((p-.3)/.08)); bl.style.transform=`translateY(${(1-clamp((p-.06)/.1))*14}px)`; }

/* ── nib cursor ── */
const nibc=$('#nibc');
if(FINE&&!RM){ document.documentElement.classList.add('has-nib'); let nx=-100,ny=-100,tx3=-100,ty3=-100,lx=0,rot=28;
  addEventListener('pointermove',e=>{ if(e.pointerType!=='mouse') return; tx3=e.clientX; ty3=e.clientY; nibc.style.opacity=1; });
  document.addEventListener('pointerleave',()=>nibc.style.opacity=0);
  (function nl(){ requestAnimationFrame(nl); const vx=tx3-nx; nx=lerp(nx,tx3,.35); ny=lerp(ny,ty3,.35); rot=lerp(rot,28+clamp(vx*.8,-16,16),.15); nibc.style.transform=`translate(${nx}px,${ny-78}px)`; nibc.style.setProperty('--r',rot.toFixed(1)+'deg'); })();
  document.addEventListener('pointerover',e=>{ const t=e.target; nibc.classList.toggle('dip',!!t.closest('a,button,.pen,.hs,.anat-list li,[data-close]')); nibc.classList.toggle('hide',!!t.closest('input,select,textarea,#padC')); });
} else nibc.remove();

/* ── ink gauge ── */
const GS=[['film','The pen'],['nib','The nib'],['pad','Grinds'],['write','Your name'],['collection','The case'],['make','Make yours'],['hand','In the hand'],['anatomy','Anatomy'],['fill','The ritual'],['karigar','The maker'],['edition','The edition'],['care','Care'],['commission','Commission']];
const gauge=$('#gauge'), gInk=$('#gInk'), gT=$('#gTicks');
GS.forEach(([id,l])=>{ const li=document.createElement('li'); li.innerHTML=`<span>${l}</span>`; li.addEventListener('click',()=>{ const t=$('#'+id); lenis?lenis.scrollTo(t,{duration:1.8}):t.scrollIntoView({behavior:'smooth'}); }); gT.append(li); });
function gaugeFrame(){ const H=document.documentElement.scrollHeight-innerHeight; const p=clamp(scrollY/H); gInk.style.setProperty('--lv',(1-p).toFixed(4));
  const lis=[...gT.children]; let act=0; GS.forEach(([id],i)=>{ const el=$('#'+id), y=clamp((el.offsetTop)/H); lis[i].style.top=(y*200)+'px'; if(scrollY+innerHeight*.4>=el.offsetTop) act=i; }); lis.forEach((l,i)=>l.classList.toggle('on',i===act));
  const gy=innerHeight/2; gauge.classList.toggle('lt',$$('.light').some(s=>{ const r=s.getBoundingClientRect(); return r.top<=gy&&r.bottom>gy; })); }

/* ── the case: lift a pen out ── */
const PEN=[
 {ink:'gold',  spec:[['Barrel','Zinc alloy, pure silver inlay'],['Nib','18k gold, medium'],['Filling','Piston converter, 1.1 ml'],['Made in','41 hours, Bidar']], d:'The house pen. Each barrel is blackened with soil from the Bidar fort and inlaid with silver wire, one petal at a time.'},
 {ink:'sindoor',spec:[['Barrel','Engraved silver, kiln-fired enamel'],['Nib','18k gold, fine'],['Filling','Piston converter, 1.1 ml'],['Made in','56 hours, Jaipur']], d:'Ruby, emerald and white enamel, fired seven times over engraved silver by a Jaipur meenakar family.'},
 {ink:'neel',  spec:[['Barrel','Silver filigree over sterling'],['Nib','18k gold, extra fine'],['Filling','Piston converter, 1.0 ml'],['Made in','64 hours, Cuttack']], d:'Silver drawn finer than hair, coiled into flowers and soldered by hand. The lightest pen we make.'},
 {ink:'kesar', spec:[['Barrel','Carved Mysuru sandalwood'],['Nib','18k gold, stub'],['Filling','Piston converter, 1.2 ml'],['Made in','33 hours, Mysuru']], d:'Carved from a single billet of sandalwood. It warms in the hand and smells of sandal for years.'},
 {ink:'kesar', spec:[['Barrel','Ivory-wood, natural lac'],['Nib','14k gold, medium'],['Filling','Cartridge or converter'],['Made in','18 hours, Channapatna']], d:'Turned on a hand lathe and polished with lac and screw-pine leaf until it glows like lacquer.'},
 {ink:'gold',  spec:[['Barrel','Ebony, chased gold cap'],['Nib','18k gold, italic'],['Filling','Piston converter, 1.1 ml'],['Made in','38 hours, Hoshiarpur']], d:'Dense black ebony with a cap chased in gold by the inlay workshops of Hoshiarpur.'}];
const pd=$('#pd'); let pdIdx=0, pdFrom=null;
pens.forEach((p,i)=>{ p.tabIndex=0; p.setAttribute('role','button'); p.setAttribute('aria-label',`Lift out the ${p.querySelector('h3').textContent} pen`); const l=document.createElement('span'); l.className='lift'; l.textContent='Lift out'; p.append(l);
  p.addEventListener('click',()=>openPen(i)); p.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openPen(i); } }); });
function openPen(i){ pdIdx=i; const p=pens[i], img=p.querySelector('img'), D=PEN[i]; pdFrom=p;
  $('#pdI').src=img.src; $('#pdI').alt=img.alt; $('#pdNo').textContent=`No. ${String(i+1).padStart(2,'0')} of the case`; $('#pdN').textContent=p.querySelector('h3').textContent; $('#pdO').textContent=p.querySelector('.o').textContent; $('#pdD').textContent=D.d; $('#pdP').textContent=p.querySelector('.pr').textContent;
  $('#pdS').innerHTML=D.spec.map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  const a=img.getBoundingClientRect(); pd.hidden=false; lenis&&lenis.stop(); const tgt=$('#pdI'); tgt.style.opacity=0;
  const fly=img.cloneNode(); fly.className='pd-fly'; Object.assign(fly.style,{left:a.left+'px',top:a.top+'px',width:a.width+'px',height:a.height+'px'}); document.body.append(fly);
  requestAnimationFrame(()=>{ pd.classList.add('on'); const b=tgt.getBoundingClientRect(); requestAnimationFrame(()=>Object.assign(fly.style,{left:b.left+'px',top:b.top+'px',width:b.width+'px',height:b.height+'px'})); });
  setTimeout(()=>{ tgt.style.opacity=1; fly.remove(); $('.pd-x').focus(); },RM?0:780); }
function closePen(){ if(pd.hidden) return; pd.classList.remove('on'); setTimeout(()=>{ pd.hidden=true; lenis&&lenis.start(); pdFrom&&pdFrom.focus({preventScroll:true}); },450); }
$$('[data-close]',pd).forEach(b=>b.addEventListener('click',closePen)); addEventListener('keydown',e=>{ if(e.key==='Escape') closePen(); });
$('#pdWrite').addEventListener('click',()=>{ closePen(); const b=$(`.inks button[data-ink="${PEN[pdIdx].ink}"]`); setTimeout(()=>{ const t=$('#write'); lenis?lenis.scrollTo(t,{duration:1.6}):t.scrollIntoView(); setTimeout(()=>b.click(),1500); },460); });
$('#pdCom').addEventListener('click',()=>{ closePen(); const f=$('#cForm'); f.c.selectedIndex=pdIdx; setTimeout(()=>{ const t=$('#commission'); lenis?lenis.scrollTo(t,{duration:1.8,offset:-70}):t.scrollIntoView(); },460); });

/* ── anatomy: ink a line from the part to its note ── */
const anatS=$('#anatomy'), aP=$('#anatP'); let aI=0;
function anatLine(draw){ if(innerWidth<860) return; const sr=anatS.getBoundingClientRect(), h=hs[aI].getBoundingClientRect(), t=al[aI].querySelector('h3').getBoundingClientRect();
  const x1=h.left+h.width/2-sr.left, y1=h.top+h.height/2-sr.top, x2=t.left-sr.left-14, y2=t.top+t.height/2-sr.top, mx=(x1+x2)/2;
  aP.setAttribute('d',`M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`); if(draw){ const L=aP.getTotalLength(); aP.style.transition='none'; aP.style.strokeDasharray=L; aP.style.strokeDashoffset=L; aP.getBoundingClientRect(); aP.style.transition='stroke-dashoffset 1s cubic-bezier(.2,.7,.1,1)'; aP.style.strokeDashoffset=0; } }
const _anat=anat; anat=function(i){ _anat(i); aI=i; setTimeout(()=>anatLine(true),60); };
new IntersectionObserver(e=>{ if(e[0].isIntersecting) setTimeout(()=>anat(aI),400); },{threshold:.5}).observe(anatS);

/* ── commission: write the letter, fold it, seal it, send it ── */
$('#cForm').addEventListener('submit',e=>{ e.preventDefault(); const f=e.target, n=f.n, em=f.e, err=$('#cErr'); let bad=null;
  [n,em].forEach(x=>x.removeAttribute('aria-invalid'));
  if(!n.value.trim()) bad=[n,'Add the name you want engraved.']; else if(!/^\S+@\S+\.\S+$/.test(em.value)) bad=[em,'Enter an email address so the craftsman can reply.'];
  if(bad){ bad[0].setAttribute('aria-invalid','true'); err.textContent=bad[1]; bad[0].focus(); return; }
  err.textContent=''; f.hidden=true; const post=$('#post'), env=$('.env',post), lt=$('#letter'); post.hidden=false;
  $('#lw1').textContent='Dear Ankan,'; $('#lw2').textContent=`Please make a ${f.c.value} pen for ${n.value.trim()}, with ${/^[aeiou]/i.test(f.b.value)?'an':'a'} ${f.b.value.toLowerCase()} nib in ${f.m.value.toLowerCase()}, filled with ${f.i.value.toLowerCase()} ink.`; $('#lw3').textContent=`Write to me at ${em.value}`;
  const lws=$$('.lw',post); lws.forEach(w=>{ w.style.clipPath='inset(0 100% 0 0)'; w.style.transition='clip-path 1.3s cubic-bezier(.4,0,.2,1)'; });
  const T=RM?[0,0,0,0,0,0,0]:[200,1500,2900,3700,4600,5400,6200];
  lws.forEach((w,i)=>setTimeout(()=>w.style.clipPath='inset(0 0 0 0)',T[0]+i*(T[1]-T[0])/1.5));
  setTimeout(()=>{ lt.classList.add('fold3'); snd.fold(); },T[2]); setTimeout(()=>{ lt.classList.add('fold1'); snd.fold(); },T[3]);
  setTimeout(()=>{ lt.classList.add('inenv'); env.classList.add('closed'); },T[4]); setTimeout(()=>{ env.classList.add('sealed'); setTimeout(()=>snd.thump(),450); },T[5]);
  setTimeout(()=>{ $('#postMsg').classList.add('on'); if(!RM){ env.classList.add('sent'); snd.whoosh(); } },T[6]); });

/* ── extend the scroll loop ── */
function onScroll3(){ bleedFrame(); gaugeFrame(); }
if(lenis) lenis.on('scroll',onScroll3); addEventListener('scroll',onScroll3,{passive:true}); addEventListener('resize',()=>{ onScroll3(); anatLine(false); }); onScroll3();


/* ═════ landing: light follows the hand, the pen leans toward it ═════ */
const glint=$('#glint'), fcv=$('#fc'); let gmx=.5,gmy=.5,gtx=.5,gty=.5;
if(FINE&&!RM){ $('#film').addEventListener('pointermove',e=>{ gtx=e.clientX/innerWidth; gty=e.clientY/innerHeight; });
  (function gl(){ requestAnimationFrame(gl); if(filmPg>.15) { glint.style.setProperty('--go',0); return; } gmx=lerp(gmx,gtx,.06); gmy=lerp(gmy,gty,.06); const k=1-clamp(filmPg/.12);
    glint.style.setProperty('--gx',(gmx*100)+'%'); glint.style.setProperty('--gy',(gmy*100)+'%'); glint.style.setProperty('--go',(.9*k).toFixed(3));
    if(document.documentElement.classList.contains('settled')){ fcv.style.setProperty('--ty2',((gmx-.5)*4*k).toFixed(2)+'deg'); fcv.style.setProperty('--tx2',((.5-gmy)*3*k).toFixed(2)+'deg'); } })(); }
/* edition plate: the number rolls down to the pen you are looking at */
openedP.then(()=>{ const el=$('#plateN'); let n=31; const t=setInterval(()=>{ n-=Math.max(1,Math.round((n-1)/5)); if(n<=1){ n=1; clearInterval(t); } el.textContent=String(n).padStart(2,'0'); },70); });
/* sound toggle + cues */
$('#snd').addEventListener('click',e=>{ const on=snd.toggle(); e.currentTarget.setAttribute('aria-pressed',on); });


/* ═════════════ the atelier layer (v4) ═════════════ */
const easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, easeO=t=>1-Math.pow(1-t,3);
const INKD={gold:['#d9bd84','#8d6c35','Gold'],neel:['#4f6bd0','#1f2f7a','Indigo'],sindoor:['#c9443a','#6e1a14','Vermilion'],kesar:['#e09a3a','#8a520f','Saffron']};
const fillS=$('#fill');
function setInk(k){ const d=INKD[k]||INKD.gold; fillS.style.setProperty('--fi',d[0]); fillS.style.setProperty('--fi2',d[1]); $('#bLab').textContent=d[2]; }
$$('.inks button').forEach(b=>b.addEventListener('click',()=>setInk(b.dataset.ink)));

/* the drop: when the paper has spread, the page speaks */
const bl2=$('#bleedL2');
function bleed2(){ const r=bleed.getBoundingClientRect(); if(r.bottom<0||r.top>innerHeight) return; const p=clamp(-r.top/(r.height-innerHeight)); bl2.classList.toggle('on',p>.62||(RM&&p>.3)); }

/* ── make it yours ── */
const CR=[['Bidri','Bidar, Karnataka',48000,'img/bidri.webp'],['Meenakari','Jaipur, Rajasthan',56000,'img/meena.webp'],['Tarakasi','Cuttack, Odisha',64000,'img/filigree.webp'],['Sandalwood','Mysuru, Karnataka',32000,'img/sandal.webp'],['Channapatna lac','Channapatna, Karnataka',18500,'img/lac.webp'],['Ebony & gold','Hoshiarpur, Punjab',41000,'img/ebony.webp']];
const FIN=[['18k gold',0],['Two-tone rhodium',4500],['Black ruthenium',6000]];
const GR=[['Extra fine','0.3 mm',1.4,0],['Fine','0.5 mm',2.4,0],['Medium','0.7 mm',3.6,0],['Broad','1.0 mm',5,0],['Stub','1.1 mm',6,2500],['Italic','1.5 mm',8,3500]];
const cfg={craft:0,fin:0,grind:1,ink:'gold'}; const fmt=n=>n.toLocaleString('en-IN');
const mkFig=$('#mkFig'), mkPriceEl=$('#mkPrice'); let mkShown=48000, mkPA=0;
function mkPrice(){ return CR[cfg.craft][2]+FIN[cfg.fin][1]+GR[cfg.grind][3]; }
function rollPrice(){ const from=mkShown, to=mkPrice(), id=++mkPA, t0=performance.now(), D=RM?1:750;
  (function r(t){ if(id!==mkPA) return; const k=clamp((t-t0)/D); mkShown=Math.round(lerp(from,to,easeO(k))/50)*50; if(k>=1) mkShown=to; mkPriceEl.textContent=fmt(mkShown); if(k<1) requestAnimationFrame(r); })(t0); }
let mkLast=48000, dT=0;
function mkSummary(){ $('#mkSum').textContent=`${CR[cfg.craft][0]} · ${FIN[cfg.fin][0]} · ${GR[cfg.grind][0]} · ${INKD[cfg.ink][2]} ink`; const np=mkPrice(), d=np-mkLast; mkLast=np;
  if(d){ const el=$('#mkDelta'); el.textContent=(d>0?'+ ₹':'− ₹')+fmt(Math.abs(d)); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }
  rollPrice(); }
const LP=[['#8a6420','#f3d998','#c79a45','#9c7330',0],['#7e8188','#f4f5f7','#b9bcc3','#6d7077',1],['#0e0f12','#5b5e66','#24262b','#0b0c0e',0]];
function loupe(){ const l=LP[cfg.fin]; ['lp0','lp1','lp2','lp3'].forEach((id,i)=>$('#'+id).setAttribute('stop-color',l[i])); $('#lpL').textContent=FIN[cfg.fin][0];
  const sh=$('#lpShine'); if(!RM) sh.animate([{transform:'skewX(-18deg) translateX(0)'},{transform:'skewX(-18deg) translateX(190px)'}],{duration:1100,easing:'cubic-bezier(.4,0,.2,1)'});
  const lo=$('#loupe'); lo.classList.remove('pop'); void lo.offsetWidth; lo.classList.add('pop'); }
function capSwap(el,txt){ if(RM){ el.textContent=txt; return; } el.animate([{transform:'none',opacity:1},{transform:'translateY(-100%)',opacity:0}],{duration:380,easing:'cubic-bezier(.6,0,.4,1)'}).onfinish=()=>{ el.textContent=txt; el.animate([{transform:'translateY(100%)',opacity:0},{transform:'none',opacity:1}],{duration:620,easing:'cubic-bezier(.2,.7,.1,1)'}); }; }
function mkSwap(i,ev){ const cur=$$('.mk-img',mkFig); const im=new Image(); im.src=CR[i][3]; im.alt=`The ${CR[i][0]} pen you are configuring`; im.className='mk-img enter';
  const r=mkFig.getBoundingClientRect(); let mx=50,my=50; if(ev&&ev.clientX){ mx=60+Math.random()*25; my=30+Math.random()*30; }
  im.style.setProperty('--mx',mx+'%'); im.style.setProperty('--my',my+'%'); im.style.setProperty('--r','0%'); mkFig.insertBefore(im,$('.mk-guil',mkFig));
  const go=()=>{ const t0=performance.now(), D=RM?1:1100; (function a(t){ const k=clamp((t-t0)/D); im.style.setProperty('--r',(easeIO(k)*120)+'%'); if(k<1) requestAnimationFrame(a); else { cur.forEach(c=>c.remove()); im.classList.remove('enter'); im.classList.add('on'); } })(t0); };
  im.decode().then(go,go);
  capSwap($('#mkCraftN'),CR[i][0]); setTimeout(()=>capSwap($('#mkTown'),CR[i][1]),90); }
function radio(group,btn){ $$('button',group).forEach(b=>{ b.classList.toggle('on',b===btn); b.setAttribute('aria-checked',b===btn); }); }
$$('.mk-crafts button').forEach(b=>b.addEventListener('click',e=>{ const i=+b.dataset.i; if(i===cfg.craft) return; radio(b.parentElement,b); cfg.craft=i; mkSwap(i,e); mkSummary(); }));
$$('.mk-opts [data-g]').forEach(g=>$$('button',g).forEach(b=>b.addEventListener('click',()=>{ radio(g,b); const k=g.dataset.g, v=b.dataset.v;
  if(k==='fin'){ cfg.fin=+v; loupe(); } if(k==='grind'){ cfg.grind=+v; mkLine(); } if(k==='ink'){ cfg.ink=v; mkLine(); setInk(v); } mkSummary(); })));
const mkS=$('#mkStroke'); let strokeL=0;
function mkLine(){ const g=GR[cfg.grind]; mkS.style.setProperty('--mkw',g[2]); mkS.style.setProperty('--mkc',cfg.ink==='gold'?'#b8955a':INKD[cfg.ink][0]); $('#mkLineL').textContent=`${g[0]}, ${g[1]}`; $('#mkInkL').textContent=`${INKD[cfg.ink][2]} ink`;
  if(!strokeL) strokeL=mkS.getTotalLength(); if(RM) return; mkS.style.transition='none'; mkS.style.strokeDasharray=strokeL; mkS.style.strokeDashoffset=strokeL; mkS.getBoundingClientRect(); mkS.style.transition=''; mkS.style.transition='stroke-dashoffset 1.4s cubic-bezier(.5,0,.2,1),stroke .6s,stroke-width .6s'; mkS.style.strokeDashoffset=0; }
/* engraving band */
const bandName=$('#bandName'), bandRev=$('#bandReveal'); let bandT=0, bandA=0;
async function band(){ await fontP; if(!font) return; const raw=$('#mkName').value.trim(), nm=raw||'Your name';
  const p0=font.getPath(nm,0,0,80), bb=p0.getBoundingBox(), w=bb.x2-bb.x1, h=bb.y2-bb.y1; const sc=Math.min(400/w,64/h); const ox=230-(bb.x1+w/2)*sc, oy=62-(bb.y1+h/2)*sc;
  const p=font.getPath(nm,0,0,80*sc); p.commands.forEach(c=>{ for(const k of ['x','x1','x2']) if(c[k]!=null) c[k]+=ox; for(const k of ['y','y1','y2']) if(c[k]!=null) c[k]+=oy; });
  bandName.setAttribute('d',p.toPathData(2)); bandName.classList.toggle('ph',!raw);
  if(RM){ bandRev.setAttribute('width',600); return; } const id=++bandA, t0=performance.now(); (function a(t){ if(id!==bandA) return; const k=clamp((t-t0)/1200); bandRev.setAttribute('width',(40+560*easeIO(k)).toFixed(1)); if(k<1) requestAnimationFrame(a); })(t0); }
$('#mkName').addEventListener('input',()=>{ $('#mkCount').textContent=`${$('#mkName').value.length} / 24`; clearTimeout(bandT); bandT=setTimeout(band,260); });
$('#mkGo').addEventListener('click',()=>{ const f=$('#cForm'); f.c.selectedIndex=cfg.craft; f.b.selectedIndex=cfg.grind; const nm=$('#mkName').value.trim(); if(nm) f.n.value=nm;
  f.m.selectedIndex=cfg.fin; f.i.value=INKD[cfg.ink][2]; const c=$('#cCfg'); c.hidden=false; c.textContent=`Carried over: ${$('#mkSum').textContent} · ₹${fmt(mkPrice())}`;
  const t=$('#commission'); lenis?lenis.scrollTo(t,{duration:2,offset:-70}):t.scrollIntoView({behavior:RM?'auto':'smooth'}); });
let mkSeen=false; new IntersectionObserver(e=>{ if(e[0].isIntersecting&&!mkSeen){ mkSeen=true; band(); mkLine(); } },{threshold:.2}).observe($('#make'));

/* ── in the hand: measured in gold ── */
const handFig=$('#handFig'); let handV='whole', handSeen=false;
$$('.hand-svg .dim path').forEach(p=>{ if(!p.classList.contains('dl')) p.style.setProperty('--L',Math.ceil(p.getTotalLength())+1); });
function handShow(v){ $$('.hf-img',handFig).forEach(i=>i.classList.toggle('on',i.dataset.v===v)); $$('.hand-svg .dim').forEach(d=>d.classList.remove('on')); setTimeout(()=>$(`.hand-svg .dim[data-v="${v}"]`).classList.add('on'),RM?0:450); }
$$('.hand-tabs button').forEach(b=>b.addEventListener('click',()=>{ if(b.dataset.v===handV) return; handV=b.dataset.v; $$('.hand-tabs button').forEach(x=>{ x.classList.toggle('on',x===b); x.setAttribute('aria-selected',x===b); }); handShow(handV); }));
function countUp(el){ const n=+el.dataset.n, dp=+(el.dataset.d||0), t0=performance.now(), D=RM?1:1600; (function c(t){ const k=clamp((t-t0)/D); el.textContent=(n*easeO(k)).toFixed(dp); if(k<1) requestAnimationFrame(c); })(t0); }
new IntersectionObserver(e=>{ if(e[0].isIntersecting&&!handSeen){ handSeen=true; handShow(handV); $$('.specs b').forEach((b,i)=>setTimeout(()=>countUp(b),i*120)); } },{threshold:.35}).observe(handFig);

/* ── the ritual: fill the converter as you scroll ── */
const fRing1=$('#fRing1'), fRing2=$('#fRing2'), penG=$('#penG'), tInk=$('#tInk'), piston=$('#piston'), rod=$('#rod'), knurl=$('#knurl'), bInk=$('#bInk'), bSurf=$('#bSurf'), fDrop=$('#fDrop'), fMl=$('#fillMl'), fSteps=$$('#fillSteps li'), bub=$('#bubbles');
const BUB=Array.from({length:9},()=>({x:180+Math.random()*60,ph:Math.random(),r:1.5+Math.random()*3}));
BUB.forEach(()=>bub.append(mk('circle',{r:0,fill:'none',stroke:'rgba(255,248,230,.55)','stroke-width':1})));
let fillP=0, fillVis=false;
function fillFrame(){ const r=fillS.getBoundingClientRect(); fillVis=r.bottom>0&&r.top<innerHeight; if(!fillVis) return; fillP=clamp(-r.top/(r.height-innerHeight)); }
new IntersectionObserver(e=>{ fillVis=e[0].isIntersecting; },{rootMargin:'100px'}).observe(fillS);
(function fl(t){ requestAnimationFrame(fl); if(!fillVis) return; const p=fillP, T=t/1000;
  const down=easeIO(clamp(p/.18)), up=easeIO(clamp((p-.74)/.16)), draw=easeIO(clamp((p-.22)/.48));
  const ty=lerp(lerp(-85,200,down),-85,up); penG.setAttribute('transform',`translate(0 ${ty.toFixed(1)})`);
  const py=lerp(300,106,draw); piston.setAttribute('y',py.toFixed(1)); rod.setAttribute('height',Math.max(0,py-92).toFixed(1)); tInk.setAttribute('y',(py+14).toFixed(1)); tInk.setAttribute('height',Math.max(0,328-py-14).toFixed(1));
  knurl.setAttribute('transform',`translate(0 ${((draw*60)%6).toFixed(2)})`);
  const lvl=lerp(640,664,draw)-clamp((p-.86)/.06)*2; bInk.setAttribute('y',lvl.toFixed(1));
  const amp=1.6+3*clamp(1-Math.abs(p-.2)*8)+2*clamp(1-Math.abs(p-.9)*12); let d=`M90 ${lvl+6}`; for(let x=90;x<=330;x+=8) d+=` L${x} ${(lvl+Math.sin(x*.05+T*2.2)*amp).toFixed(1)}`; bSurf.setAttribute('d',d+` L330 ${lvl+6} Z`); $('#meniscus').setAttribute('d',d);
  const dk=clamp((p-.84)/.08); const tip=520+ty; fDrop.setAttribute('cy',(lerp(tip+6,lvl,dk*dk)).toFixed(1)); fDrop.setAttribute('r',p>.8&&dk<1?(4.2*(1-dk*.25)).toFixed(2):0);
  const sk=clamp((p-.92)/.07); [fRing1,fRing2].forEach((c,i)=>{ const q=clamp(sk*1.2-i*.25); c.setAttribute('cy',lvl.toFixed(1)); c.setAttribute('rx',(4+q*70).toFixed(1)); c.setAttribute('ry',(1.5+q*9).toFixed(1)); c.setAttribute('opacity',sk>0&&q<1?((1-q)*.8).toFixed(2):0); });
  const drawing=p>.22&&p<.7; [...bub.children].forEach((c,i)=>{ const b=BUB[i], k=((T*.5+b.ph)%1); c.setAttribute('cx',(b.x+Math.sin(k*9+i)*4).toFixed(1)); c.setAttribute('cy',(lvl+130-k*120).toFixed(1)); c.setAttribute('r',drawing&&lvl+130-k*120>lvl+4?b.r:0); });
  fMl.textContent=(1.1*draw).toFixed(1);
  const st=p<.2?0:p<.74?1:2; fSteps.forEach((l,i)=>l.classList.toggle('on',i===st)); })(0);

/* ── care: answers open like a drawer ── */
$$('.faq details').forEach(d=>{ const sm=$('summary',d), body=$('div',d);
  let an=null, closing=false;
  sm.addEventListener('click',e=>{ e.preventDefault(); if(RM){ d.open=!d.open; return; }
    const cur=body.offsetHeight; if(an){ an.cancel(); an=null; }
    if(d.open&&!closing){ closing=true; d.classList.add('closing'); an=body.animate([{height:cur+'px',opacity:1},{height:'0px',opacity:0}],{duration:450,easing:'cubic-bezier(.4,0,.2,1)'}); an.onfinish=()=>{ d.open=false; closing=false; d.classList.remove('closing'); an=null; }; }
    else { closing=false; d.classList.remove('closing'); d.open=true; const h=body.scrollHeight; an=body.animate([{height:(d.open?cur:0)+'px',opacity:.2},{height:h+'px',opacity:1}],{duration:600,easing:'cubic-bezier(.2,.7,.1,1)'}); an.onfinish=()=>an=null; } }); });

/* ── footer letter ── */
$('#ftForm').addEventListener('submit',e=>{ e.preventDefault(); const v=$('#ftE').value.trim(), ok=$('#ftOk');
  if(!/^\S+@\S+\.\S+$/.test(v)){ ok.textContent='Add an email address and we will write to you.'; $('#ftE').focus(); return; }
  ok.textContent='Thank you. The first letter leaves the bench at the turn of the season.'; $('#ftE').value=''; });

/* extend the scroll loop */
function onScroll4(){ bleed2(); fillFrame(); }
if(lenis) lenis.on('scroll',onScroll4); addEventListener('scroll',onScroll4,{passive:true}); onScroll4();

/* keyboard: arrow keys move through radio groups and tabs, one tab stop each */
function roving(group,sel){ const bs=$$(sel,group); const sync=()=>bs.forEach(b=>b.tabIndex=(b.classList.contains('on')?0:-1)); sync();
  group.addEventListener('click',()=>setTimeout(sync,0));
  group.addEventListener('keydown',e=>{ const i=bs.indexOf(document.activeElement); if(i<0) return; let j=-1;
    if(['ArrowRight','ArrowDown'].includes(e.key)) j=(i+1)%bs.length; if(['ArrowLeft','ArrowUp'].includes(e.key)) j=(i-1+bs.length)%bs.length; if(e.key==='Home') j=0; if(e.key==='End') j=bs.length-1;
    if(j<0) return; e.preventDefault(); bs[j].focus(); bs[j].click(); setTimeout(sync,0); }); }
$$('.mk-opts [role=radiogroup]').forEach(g=>roving(g,'button')); roving($('.hand-tabs'),'button');
/* hand: caption under the figure, for small screens */
const HC={whole:'142 mm capped · 168 mm posted · ⌀ 14 mm',apart:'Cap 39 · Nib & feed 23 · Section 16 · Converter 20 · Barrel 41 (mm)'};
$$('.hand-tabs button').forEach(b=>b.addEventListener('click',()=>{ $('#handCap').textContent=HC[b.dataset.v]; $('#handFig').setAttribute('aria-labelledby',b.id); }));
