/* ANKAN · concept writing-instrument house */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)), lerp=(a,b,t)=>a+(b-a)*t;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE=matchMedia('(pointer: fine)').matches;
const INK={gold:'#d8b46a',neel:'#6f8be0',sindoor:'#d9503f',kesar:'#efa13a'};

/* ───── smooth scroll ───── */
let lenis=null;
if(!RM&&window.Lenis){ lenis=new Lenis({lerp:.09,smoothWheel:true}); const raf=t=>{lenis.raf(t);requestAnimationFrame(raf)}; requestAnimationFrame(raf); }
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

/* ───── loader: one gold line draws itself ───── */
const ldP=$('#ldP'), ldN=$('#ldN'); let shown=0;
function ldSet(p){ shown=Math.max(shown,p); ldP.setAttribute('stroke-dasharray',`${shown} 1`); ldN.textContent=Math.round(shown*100); }
loadFilm((k,g)=>{ if(k===0) ldSet(g*.97); }).catch(()=>readyRes());
requestAnimationFrame(filmLoop);
function openPage(){ $('#ld').classList.add('out'); document.body.classList.remove('locked'); document.documentElement.classList.add('ready'); onScroll(); }
Promise.all([readyP,document.fonts?document.fonts.ready:0,new Promise(r=>setTimeout(r,RM?100:1400))]).then(()=>{ ldSet(1); setTimeout(openPage,RM?0:700); });
setTimeout(()=>readyRes(),15000);

/* hero words */
(()=>{ const h=$('.hero h1'); const parts=h.innerHTML.split(/<br>/); h.innerHTML=parts.map(l=>l.split(' ').map((w,i)=>`<span class="w" style="transition-delay:${(i*.08+.15).toFixed(2)}s">${w}</span>`).join(' ')).join('<br>'); })();

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
  p.style.transform=`translate(${x}px,${p.classList.contains('up')?y-42*geo.s:y+42*geo.s}px)`; p.style.top='0'; }); }
function mapFrame(p){ if(p<.36) return p/.36*189; if(p<.62) return 190+(p-.36)/.26*175; if(p<.70) return 365; return 365-(p-.70)/.30*189; }
function filmFrame(){ const r=film.getBoundingClientRect(), tot=r.height-innerHeight; const p=clamp(-r.top/tot); tgtF=mapFrame(p);
  const hv=1-clamp(p/.06); hero.style.opacity=hv; hero.style.transform=`translateY(${(1-hv)*-40}px)`; cue.style.opacity=hv;
  CH.forEach(({el,a,b})=>{ const tin=clamp((p-a)/.06), tout=b>1?0:clamp((p-(b-.05))/.05); el.style.opacity=tin*(1-tout); el.style.transform=`translateY(${(1-tin)*30-tout*30}px)`; });
  const on=p>.585&&p<.72; PTS.forEach((pt,i)=>{ pt.classList.toggle('on',on); pt.style.transitionDelay=on?(i*.07)+'s':'0s'; });
  [[0,.36],[.36,.70],[.70,1]].forEach(([a,b],i)=>{ hudL[i].classList.toggle('on',p>=a&&(p<b||i==2)); hudL[i].querySelector('b').style.setProperty('--k',clamp((p-a)/(b-a))); }); }
fsize(); addEventListener('resize',()=>{ fsize(); onScroll(); });

/* ───── header ───── */
const hd=$('#hd'); let lastY=0;
function hdState(){ const y=scrollY, inFilm=film.getBoundingClientRect().bottom>80; hd.classList.toggle('solid',!inFilm); hd.classList.toggle('hide',y>lastY+4&&y>innerHeight*1.2); if(y<lastY-4) hd.classList.remove('hide'); lastY=y; }

/* ───── split + reveal ───── */
$$('.split').forEach(h=>{ h.innerHTML=h.textContent.trim().split(/\s+/).map(w=>`<span class="spl"><span class="spi">${w}</span></span>`).join(' '); $$('.spi',h).forEach((s,i)=>s.style.transitionDelay=(i*.045)+'s'); });
const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }),{rootMargin:'0px 0px -12% 0px'});
$$('.split,.rv').forEach(el=>io.observe(el));

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
    for(let i=1;i<pts.length;i++){ const a=pts[i-1],b=pts[i],k=1-(now-b.t)/520; tx.strokeStyle=`rgba(216,180,106,${(k*.75).toFixed(3)})`; tx.lineWidth=.6+k*2.2; tx.beginPath(); tx.moveTo(a.x,a.y); tx.lineTo(b.x,b.y); tx.stroke(); }
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
    if(nibK){ px.save(); px.translate(x,y); px.rotate(EDGE); px.fillStyle='rgba(216,180,106,.55)'; px.fillRect(-nibW/2,-Math.max(.7,nibW*(1-nibK))/2,nibW,Math.max(.7,nibW*(1-nibK))); px.restore(); }
    else { px.fillStyle='rgba(216,180,106,.5)'; px.beginPath(); px.arc(x,y,w/2,0,7); px.fill(); } } }
function ppos(e){ const r=pc.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
pc.addEventListener('pointerdown',e=>{ drawing=true; lp=ppos(e); pc.setPointerCapture(e.pointerId); if(!padTouched){ padTouched=true; $('.sheet-hint').style.opacity=0; } });
pc.addEventListener('pointermove',e=>{ if(!drawing) return; const p=ppos(e); seg(lp,p); lp=p; });
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
  const full=path.toPathData(2); const col=ink==='gold'?'url(#gGold)':INK[ink];
  sS.innerHTML=''; sF.innerHTML=''; drops.innerHTML=''; sF.classList.remove('on'); shine.setAttribute('opacity',0); clipP.setAttribute('d',full);
  sF.append(mk('path',{d:full,fill:col}));
  const sw=size*.011; const els=cs.map(c=>{ const p=mk('path',{d:toD(c),stroke:col,'stroke-width':sw}); sS.append(p); const L=p.getTotalLength(); p.style.strokeDasharray=`${L} ${L}`; p.style.strokeDashoffset=L; return {p,L}; });
  const total=els.reduce((s,e)=>s+e.L,0); const dur=RM?1:clamp(total/6,1800,5200); let t0=null; nibG.setAttribute('opacity',RM?0:1); sS.style.opacity=1;
  const nibS=size/150;
  function step(ts){ if(id!==writeId) return; if(!t0) t0=ts; let d=clamp((ts-t0)/dur)*total;
    let acc=0, tip=null; for(const e of els){ const k=clamp((d-acc)/e.L); e.p.style.strokeDashoffset=e.L*(1-k); if(k>0&&k<1){ tip=e.p.getPointAtLength(e.L*k); } acc+=e.L; }
    if(tip){ nibG.setAttribute('transform',`translate(${tip.x} ${tip.y}) rotate(28) scale(${nibS})`);
      if(Math.random()<.18&&drops.childElementCount<60){ const c=mk('circle',{cx:tip.x+(Math.random()-.5)*6,cy:tip.y+(Math.random()-.5)*6,r:(Math.random()*1.6+.4)*nibS,fill:col}); drops.append(c); c.animate([{opacity:.9},{opacity:0,transform:`translate(0px,${4+Math.random()*6}px)`}],{duration:900,fill:'forwards'}); } }
    if(d<total) requestAnimationFrame(step); else finish(); }
  function finish(){ nibG.setAttribute('opacity',0); sF.classList.add('on'); sS.animate([{opacity:1},{opacity:.25}],{duration:1400,fill:'forwards'});
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

/* ───── commission ───── */
$('#cForm').addEventListener('submit',e=>{ e.preventDefault(); const f=e.target, n=f.n, em=f.e, err=$('#cErr'); let bad=null;
  [n,em].forEach(x=>x.removeAttribute('aria-invalid'));
  if(!n.value.trim()) bad=[n,'Add the name you want engraved.']; else if(!/^\S+@\S+\.\S+$/.test(em.value)) bad=[em,'Enter an email address so the karigar can reply.'];
  if(bad){ bad[0].setAttribute('aria-invalid','true'); err.textContent=bad[1]; bad[0].focus(); return; }
  err.textContent=''; f.hidden=true; $('#cSig').textContent=n.value.trim(); $('#cDone').hidden=false; });

/* ───── scroll loop ───── */
function onScroll(){ filmFrame(); hdState(); grindFrame(); collFrame(); karFrame(); }
if(lenis) lenis.on('scroll',onScroll); addEventListener('scroll',onScroll,{passive:true}); onScroll();
