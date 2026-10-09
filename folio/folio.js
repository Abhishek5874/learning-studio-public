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
  learn:{kicker:'LEARNING THROUGH PRACTICE',title:'Try it. Explain it.\nCome back to it.',text:'A personal learning studio with executable foundations, deeper assignments, project briefs and delayed recall.',href:'learn.html',label:'Enter the Learning Studio ↗'}
 };
 $$('[data-focus]').forEach(button=>button.onclick=()=>{
  const p=panels[button.dataset.focus];$$('[data-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  const panel=$('#focus-panel');panel.replaceChildren();const kicker=document.createElement('span');kicker.className='eyebrow';kicker.textContent=p.kicker;const h=document.createElement('h2');p.title.split('\n').forEach((line,i)=>{if(i)h.append(document.createElement('br'));h.append(document.createTextNode(line));});const text=document.createElement('p');text.textContent=p.text;const a=document.createElement('a');a.className='text-link';a.href=p.href;a.textContent=p.label;panel.append(kicker,h,text,a);
 });
 $$('[data-filter]').forEach(button=>button.onclick=()=>{const category=button.dataset.filter;let visible=0;$$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$$('.project-card').forEach(card=>{card.hidden=category!=='all'&&card.dataset.category!==category;if(!card.hidden)visible++;});$('#filter-status').textContent=`${visible} ${visible===1?'project':'projects'}`;});
 let toastTimer;function toast(text){const el=$('.toast');if(!el)return;el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3500);}
 $('.copy-project')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href.split('#')[0]);toast('Project link copied.');}catch{toast('Copy the project address from your browser to share it.');}});
 $('#print-brief')?.addEventListener('click',()=>window.print());
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
