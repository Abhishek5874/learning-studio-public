'use strict';
(function(root){
 const stamp=x=>new Date(x).getTime();
 const key=(ms,zone)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
 function elapsed(session,segments,now=Date.now()){return segments.filter(s=>s.session_id===session.id).reduce((n,s)=>n+Math.max(0,Math.min(s.ended_at?stamp(s.ended_at):now,stamp(session.planned_end),now)-stamp(s.started_at)),0)/1000;}
 function week(sessions,segments,now=Date.now(),zone=Intl.DateTimeFormat().resolvedOptions().timeZone){
  const today=key(now,zone),[y,m,d]=today.split('-').map(Number),days=Array.from({length:7},(_,i)=>new Date(Date.UTC(y,m-1,d-6+i)).toISOString().slice(0,10));
  const buckets=Object.fromEntries(days.map(d=>[d,0])),topics={},ids=new Set();
  for(const s of sessions){let contribution=0;for(const seg of segments.filter(x=>x.session_id===s.id)){
   let start=stamp(seg.started_at),end=Math.min(seg.ended_at?stamp(seg.ended_at):now,stamp(s.planned_end),now);if(!Number.isFinite(start)||!Number.isFinite(end))continue;
   while(start<end){const date=key(start,zone);let boundary=end;
    if(key(end-1,zone)!==date){let low=start+1,high=Math.min(end,start+36*3600000);while(low<high){const mid=Math.floor((low+high)/2);if(key(mid,zone)===date)low=mid+1;else high=mid;}boundary=low;}
    const seconds=(boundary-start)/1000;if(date in buckets){buckets[date]+=seconds;contribution+=seconds;}start=boundary;
   }
  }if(contribution>0){ids.add(s.id);const topic=s.subject||'Unspecified';topics[topic]=(topics[topic]||0)+contribution;}}
  const total=Object.values(buckets).reduce((a,b)=>a+b,0),studyDays=Object.values(buckets).filter(x=>x>0).length;
  return {days,buckets,total,averageDay:total/7,averageStudyDay:studyDays?total/studyDays:0,averageSession:ids.size?total/ids.size:0,topics,zone};
 }
 function expire(data,now=Date.now()){for(const s of data.sessions)if(['active','paused'].includes(s.state)&&stamp(s.planned_end)<=now){for(const seg of data.segments)if(seg.session_id===s.id&&!seg.ended_at)seg.ended_at=s.planned_end;s.state='finished';s.ended_at=s.planned_end;}return data;}
 function start(data,{subject='',minutes=25},now=Date.now(),id=crypto.randomUUID()){
  expire(data,now);if(data.sessions.some(s=>['active','paused'].includes(s.state)))throw Error('Finish your current session first.');if(!Number.isFinite(minutes)||minutes<5||minutes>240)throw Error('Choose 5–240 minutes.');
  const s={id,subject:subject.trim().slice(0,120),state:'active',started_at:new Date(now).toISOString(),planned_end:new Date(now+minutes*60000).toISOString(),share_topic:false};data.sessions.push(s);data.segments.push({session_id:id,started_at:s.started_at,ended_at:null});return s;
 }
 function action(data,id,op,now=Date.now()){expire(data,now);const s=data.sessions.find(x=>x.id===id);if(s?.state==='finished'&&op==='finish')return s;if(!s||s.state==='finished')throw Error('This session has ended.');
  if(op==='pause'&&s.state==='active'||op==='finish'){for(const seg of data.segments)if(seg.session_id===id&&!seg.ended_at)seg.ended_at=new Date(Math.min(now,stamp(s.planned_end))).toISOString();s.state=op==='finish'?'finished':'paused';if(op==='finish')s.ended_at=new Date(now).toISOString();}
  else if(op==='resume'&&s.state==='paused'){s.state='active';data.segments.push({session_id:id,started_at:new Date(now).toISOString(),ended_at:null});}else throw Error('Refresh: session state changed.');return s;
 }
 const api={elapsed,week,expire,start,action};if(typeof module!=='undefined')module.exports=api;else root.StudyCore=api;
})(typeof window==='undefined'?globalThis:window);
