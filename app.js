/* ANKAN · concept writing-instrument house */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)), lerp=(a,b,t)=>a+(b-a)*t;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE=matchMedia('(pointer: fine)').matches;
const INK={gold:'#d9bd84',neel:'#7d96e8',sindoor:'#d8584a',kesar:'#eaa448'};

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
let openRes; const openedP=new Promise(r=>openRes=r);
function openPage(){ setTimeout(openRes,500); $('#ld').classList.add('out'); document.body.classList.remove('locked'); document.documentElement.classList.add('ready'); onScroll(); }
Promise.all([readyP,document.fonts?document.fonts.ready:0,new Promise(r=>setTimeout(r,RM?100:1400))]).then(()=>{ ldSet(1); setTimeout(openPage,RM?0:700); });
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
  const hv=1-clamp(p/.06); hero.style.opacity=hv; hero.style.transform=`translateY(${(1-hv)*-40}px)`; cue.style.opacity=hv;
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
  const full=path.toPathData(2).split(/(?=M)/).filter(x=>!x.includes('NaN')).join(''); const col=ink==='gold'?'url(#gGold)':INK[ink];
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
  seal.classList.remove('on'); stage.classList.remove('shake'); void seal.offsetWidth; seal.classList.add('on'); stage.classList.add('shake'); };
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
    if(d<tot) requestAnimationFrame(st); else { bead.remove(); h.classList.add('filled'); setTimeout(()=>{ h.classList.remove('pending'); svg.style.transition='opacity .8s'; svg.style.opacity=0; setTimeout(()=>{ svg.remove(); h.innerHTML=orig; },900); },650); } })(performance.now()); }
const iho=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ iho.unobserve(e.target); Promise.all([bodP,openedP]).then(()=>inkWrite(e.target)); } }),{threshold:.5});
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
  const fp=clamp(p/hit), fy=lerp(-30,cy,fp*fp); drop.setAttribute('cx',cx); drop.setAttribute('cy',fy); drop.setAttribute('r',p<hit?9:0); drop.setAttribute('transform',`translate(${cx} ${fy}) scale(${1-fp*.15} ${1+fp*.5}) translate(${-cx} ${-fy})`);
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
const GS=[['film','The pen'],['nib','The nib'],['pad','Grinds'],['write','Your name'],['collection','The case'],['anatomy','Anatomy'],['karigar','The maker'],['edition','The edition'],['commission','Commission']];
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
$('#pdCom').addEventListener('click',()=>{ closePen(); const f=$('#cForm'); f.c.selectedIndex=pdIdx; setTimeout(()=>{ const t=$('#commission'); lenis?lenis.scrollTo(t,{duration:1.8}):t.scrollIntoView(); },460); });

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
  $('#lw1').textContent='Dear Ankan,'; $('#lw2').textContent=`Please make a ${f.c.value} pen for ${n.value.trim()}, with a ${f.b.value.toLowerCase()} nib.`; $('#lw3').textContent=`Write to me at ${em.value}`;
  const lws=$$('.lw',post); lws.forEach(w=>{ w.style.clipPath='inset(0 100% 0 0)'; w.style.transition='clip-path 1.3s cubic-bezier(.4,0,.2,1)'; });
  const T=RM?[0,0,0,0,0,0,0]:[200,1500,2900,3700,4600,5400,6200];
  lws.forEach((w,i)=>setTimeout(()=>w.style.clipPath='inset(0 0 0 0)',T[0]+i*(T[1]-T[0])/1.5));
  setTimeout(()=>lt.classList.add('fold3'),T[2]); setTimeout(()=>lt.classList.add('fold1'),T[3]);
  setTimeout(()=>{ lt.classList.add('inenv'); env.classList.add('closed'); },T[4]); setTimeout(()=>env.classList.add('sealed'),T[5]);
  setTimeout(()=>{ $('#postMsg').classList.add('on'); if(!RM) env.classList.add('sent'); },T[6]); });

/* ── extend the scroll loop ── */
function onScroll3(){ bleedFrame(); gaugeFrame(); }
if(lenis) lenis.on('scroll',onScroll3); addEventListener('scroll',onScroll3,{passive:true}); addEventListener('resize',()=>{ onScroll3(); anatLine(false); }); onScroll3();
