'use strict';
(()=>{
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 document.documentElement.classList.add('folio-js');
 // Keep previously shared learning links working if the portfolio becomes the root page.
 const legacy=location.hash.match(/^#(python\/py-[a-z-]+|mysql\/sql-[a-z-]+|salesforce\/sf-[a-z-]+)$/);
 if(legacy&&!location.pathname.includes('/projects/')){location.replace(new URL('learn.html'+location.hash,location.href));return;}
 const menu=$('.menu-toggle'),nav=$('#site-nav');
 if(menu&&nav){
  menu.hidden=false;
  const close=()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.querySelector('span').textContent='+';};
  menu.onclick=()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.querySelector('span').textContent=open?'−':'+';};
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){close();menu.focus();}});
  document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))close();});
 }
 const panels={
  build:{kicker:'TURN QUESTIONS INTO SOFTWARE',title:'Small ideas.\nWorking examples.',text:'Python applications, product ideas and a learning workspace you can try for yourself.',href:'#work',label:'See the selected projects ↗'},
  deliver:{kicker:'UNDERSTAND THE WHOLE RELEASE',title:'Every check\nneeds a reason.',text:'Salesforce training, Azure DevOps support and personal experiments in how software gets validated and delivered.',href:'#experience',label:'Explore the professional context ↗'},
  learn:{kicker:'LEARNING THROUGH PRACTICE',title:'Try it. Explain it.\nCome back to it.',text:'Start with a two-line example, follow each step, then try the browser practice. The full roadmap is there when you are ready.',href:'learn.html#python/py-first',label:'Try the first Python activity ↗'}
 };
 $$('[data-focus]').forEach(button=>button.onclick=()=>{
  const p=panels[button.dataset.focus];$$('[data-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  const panel=$('#focus-panel');panel.replaceChildren();const kicker=document.createElement('span');kicker.className='eyebrow';kicker.textContent=p.kicker;const h=document.createElement('h2');p.title.split('\n').forEach((line,i)=>{if(i)h.append(document.createElement('br'));h.append(document.createTextNode(line));});const text=document.createElement('p');text.textContent=p.text;const a=document.createElement('a');a.className='text-link';a.href=p.href;a.textContent=p.label;panel.append(kicker,h,text,a);
 });
 $$('[data-filter]').forEach(button=>button.onclick=()=>{const category=button.dataset.filter;let visible=0;$$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$$('.project-card').forEach(card=>{card.hidden=category!=='all'&&card.dataset.category!==category;if(!card.hidden)visible++;});$('#filter-status').textContent=`${visible} ${visible===1?'project':'projects'}`;});
 let toastTimer;function toast(text){const el=$('.toast');if(!el)return;el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3500);}
 const readingProgress=$('.reading-progress');
 if(readingProgress){const updateReadingProgress=()=>{const max=document.documentElement.scrollHeight-innerHeight;readingProgress.style.width=`${max>0?scrollY/max*100:0}%`;};addEventListener('scroll',updateReadingProgress,{passive:true});addEventListener('resize',updateReadingProgress);updateReadingProgress();}
 const momentCards=$$('.moment-card'),momentDialog=$('.moment-viewer');
 if(momentCards.length&&momentDialog){let momentIndex=0,activeMoment=null;const visibleMoments=()=>momentCards.filter(card=>!card.hidden);const renderMoment=()=>{const cards=visibleMoments();if(!cards.length)return;momentIndex=(momentIndex+cards.length)%cards.length;const card=cards[momentIndex],image=momentDialog.querySelector('figure img');image.src=card.dataset.momentImage;image.alt=card.querySelector('img').alt;momentDialog.querySelector('figcaption').textContent=card.dataset.momentTitle+' · '+card.dataset.momentCaption;};momentCards.forEach(card=>card.addEventListener('click',()=>{activeMoment=card;momentIndex=visibleMoments().indexOf(card);renderMoment();momentDialog.showModal();}));$('.moment-close').addEventListener('click',()=>momentDialog.close());$('.moment-previous').addEventListener('click',()=>{momentIndex--;renderMoment();});$('.moment-next').addEventListener('click',()=>{momentIndex++;renderMoment();});momentDialog.addEventListener('close',()=>{if(activeMoment&&!activeMoment.hidden)activeMoment.focus();activeMoment=null;});momentDialog.addEventListener('click',event=>{if(event.target===momentDialog)momentDialog.close();});momentDialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){momentIndex--;renderMoment();}if(event.key==='ArrowRight'){momentIndex++;renderMoment();}});$$('[data-moment-filter]').forEach(button=>button.addEventListener('click',()=>{const category=button.dataset.momentFilter;$$('[data-moment-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));momentCards.forEach(card=>{card.hidden=category!=='all'&&card.dataset.momentCategory!==category;});const count=visibleMoments().length;$('#moment-status').textContent=`${count} ${count===1?'moment':'moments'} from the journey`;if(momentDialog.open&&activeMoment?.hidden){momentDialog.close();button.focus();}}));}
 $('.copy-project')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href.split('#')[0]);toast('Project link copied.');}catch{toast('Copy the project address from your browser to share it.');}});
 $('#print-brief')?.addEventListener('click',()=>window.print());
 const prefersStill=matchMedia('(prefers-reduced-motion: reduce)'),finePointer=matchMedia('(hover: hover) and (pointer: fine)');
 $('.portrait-peek')?.addEventListener('click',()=>momentCards.find(card=>card.dataset.momentCategory==='profile')?.click());
 if(finePointer.matches&&!prefersStill.matches){
  const cursor=document.createElement('div');cursor.className='folio-cursor';cursor.setAttribute('aria-hidden','true');cursor.innerHTML='<span class="cursor-dot"></span><span class="cursor-ring"><span>EXPLORE</span></span>';document.body.append(cursor);
  const dot=cursor.querySelector('.cursor-dot'),ring=cursor.querySelector('.cursor-ring');let mx=0,my=0,rx=0,ry=0,frame=0,seen=false;
  const settle=()=>{rx+=(mx-rx)*.18;ry+=(my-ry)*.18;ring.style.transform=`translate3d(${rx}px,${ry}px,0)`;if(Math.abs(mx-rx)+Math.abs(my-ry)>.25)frame=requestAnimationFrame(settle);else frame=0;};
  document.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse'||!finePointer.matches||prefersStill.matches)return;mx=event.clientX;my=event.clientY;if(!seen){rx=mx;ry=my;seen=true;}document.documentElement.classList.add('custom-cursor-active');cursor.classList.add('visible');dot.style.transform=`translate3d(${mx}px,${my}px,0)`;const target=event.target.closest('a,button,summary');cursor.classList.toggle('over-control',Boolean(target));cursor.classList.toggle('over-text',Boolean(event.target.closest('input,textarea')));ring.querySelector('span').textContent=event.target.closest('.moment-card,.portrait-peek')?'VIEW':'EXPLORE';if(!frame)frame=requestAnimationFrame(settle);},{passive:true});
  const hideCursor=()=>{cursor.classList.remove('visible');document.documentElement.classList.remove('custom-cursor-active');};document.documentElement.addEventListener('pointerleave',hideCursor);window.addEventListener('blur',hideCursor);finePointer.addEventListener('change',hideCursor);prefersStill.addEventListener('change',hideCursor);
  document.addEventListener('pointerdown',()=>cursor.classList.add('pressed'));document.addEventListener('pointerup',()=>cursor.classList.remove('pressed'));
  const board=$('.hero-board');if(board){board.addEventListener('pointermove',event=>{if(prefersStill.matches||!finePointer.matches)return;const rect=board.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;board.style.setProperty('--tilt-x',`${(0.5-y)*5}deg`);board.style.setProperty('--tilt-y',`${(x-0.5)*7}deg`);board.style.setProperty('--spot-x',`${x*100}%`);board.style.setProperty('--spot-y',`${y*100}%`);board.classList.add('hero-engaged');},{passive:true});board.addEventListener('pointerleave',()=>{board.style.setProperty('--tilt-x','0deg');board.style.setProperty('--tilt-y','0deg');board.classList.remove('hero-engaged');});}
  $$('.hero-actions .button').forEach(button=>{button.addEventListener('pointermove',event=>{if(prefersStill.matches||!finePointer.matches)return;const r=button.getBoundingClientRect();button.style.setProperty('--magnet-x',`${(event.clientX-r.left-r.width/2)*.08}px`);button.style.setProperty('--magnet-y',`${(event.clientY-r.top-r.height/2)*.12}px`);},{passive:true});button.addEventListener('pointerleave',()=>{button.style.setProperty('--magnet-x','0px');button.style.setProperty('--magnet-y','0px');});});
 }
 $$('[data-focus]').forEach(button=>button.addEventListener('click',()=>{if(!prefersStill.matches)$('#focus-panel')?.animate([{opacity:.4,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'});}));
 const form=$('#guide-form');if(!form)return;
 let guide=null;
 async function getGuide(){if(guide)return guide;const response=await fetch('folio/guide.json?v=1');if(!response.ok)throw Error('The guide could not load.');guide=await response.json();return guide;}
 function showAnswer(item){const box=$('#guide-answer');box.replaceChildren();const p=document.createElement('p');p.textContent=item.answer;box.append(p);if(item.link){const a=document.createElement('a');a.href=item.link;a.className='text-link';a.textContent=item.linkLabel+' ↗';if(item.link.startsWith('https:')){a.target='_blank';a.rel='noopener';}box.append(a);}$('#guide-status').textContent='Answer from the professional portfolio.';}
 async function answer(question,id){
  try{const entries=await getGuide();let item;
   if(id)item=entries.find(x=>x.id===id);
   else{
    const text=question.toLowerCase().replace(/[^a-z0-9/ -]/g,' '),words=text.split(/\s+/).filter(w=>w.length>1);
    if(/salary|phone number|mobile number|home address|password|private|personal email|financial/.test(text)){showAnswer({answer:'Private contact details and personal information are not included in this guide. Use LinkedIn for a professional conversation.',link:'https://www.linkedin.com/in/abhishek-kumar-047b45229/',linkLabel:'Connect on LinkedIn'});return;}
    const scores=entries.map(entry=>({entry,score:entry.keywords.split(' ').reduce((n,w)=>n+(words.includes(w)?1:0),0)})).sort((a,b)=>b.score-a.score);
    if(scores[0]?.score)item=scores[0].entry;
   }
   showAnswer(item||{answer:'I don’t have a documented answer to that question. Try asking about current work, Python projects, the learning studio, research or professional contact.',link:'#work',linkLabel:'Browse the selected work'});
   $$('[data-guide]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.guide===item?.id)));
  }catch{$('#guide-status').textContent='The guide is unavailable. Work, Experience and Research are still available above.';}
 }
 $$('[data-guide]').forEach(b=>b.onclick=()=>answer('',b.dataset.guide));
 form.onsubmit=e=>{e.preventDefault();const q=$('#guide-question').value.trim();if(q)answer(q);};
})();
