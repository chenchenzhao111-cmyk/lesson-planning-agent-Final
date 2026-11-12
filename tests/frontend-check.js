const $=id=>document.getElementById(id);
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  const inputs=['topic','audience','duration','setting','objective','materials','activities','each'];
  let currentResult=null;
  let busy=false;
  function data(){return Object.fromEntries(inputs.map(id=>[id,$(id).value]));}
  function lessonText(l){return [l.title,l.audience+' | '+l.setting+' | '+l.duration+' minutes','Objective: '+l.objective,'Approach: '+l.pack,'', 'READY-TO-USE EXAMPLE / STIMULUS',l.stimulus,'',...l.phases.flatMap((p,i)=>['PHASE '+(i+1)+' — '+p.name+' ('+p.minutes+' min)','Purpose: '+p.goal,'Teacher: '+p.teacher,'Students: '+p.students,'Evidence of learning: '+p.check,'']),'Teacher review: '+l.notes.join(' ')].join('\n');}
  function render(r){
    currentResult=r;
    $('action').textContent=r.action;$('action').className='status '+(r.action==='HUMAN_REVIEW'?'review':r.action==='CLARIFY'?'clarify':r.action==='ERROR'?'error':'');
    $('decision').textContent=r.reason;$('decision').className='decision'+(r.action==='HUMAN_REVIEW'?' warning':'');
    let html='<p>'+escapeHTML(r.message)+'</p>';
    if(r.lesson){const l=r.lesson;
      html+='<h2 style="margin-top:20px;margin-bottom:5px">'+escapeHTML(l.title)+'</h2><div class="overview">'+[l.audience,l.setting,l.duration+' minutes',l.pack].map(s=>'<span class="pill">'+escapeHTML(s)+'</span>').join('')+'</div>';
      html+='<p><strong>Learning objective:</strong> '+escapeHTML(l.objective)+'</p>';
      html+='<div class="context"><strong>Ready-to-use example / stimulus</strong><div class="example">'+escapeHTML(l.stimulus)+'</div><div class="tiny">Hypothetical examples or teacher-created prompts, not verified outside sources.</div></div>';
      l.phases.forEach((p,i)=>{html+='<article class="phase"><div class="phase-head"><div><div class="eyebrow">Phase '+(i+1)+'</div><h3>'+escapeHTML(p.name)+'</h3></div><div class="time">'+p.minutes+' min</div></div>';
        for(const [label,key] of [['Learning purpose','goal'],['Teacher action','teacher'],['Learner task','students'],['Evidence / check','check']])html+='<p class="detail"><strong>'+label+':</strong> '+escapeHTML(p[key])+'</p>';html+='</article>';});
      html+='<div class="note"><strong>Teacher review notes</strong><ul>'+l.notes.map(n=>'<li>'+escapeHTML(n)+'</li>').join('')+'</ul></div>';
    }
    $('output').innerHTML=html;$('exportActions').hidden=!r.lesson;
  }
  function resetForm(){inputs.forEach(id=>$(id).value='');$('output').innerHTML='';$('action').textContent='AWAITING INPUT';$('action').className='status';$('decision').textContent='The server checks requirements, then uses an LLM only when generation is appropriate.';$('decision').className='decision';$('exportActions').hidden=true;currentResult=null;}
  $('runBtn').addEventListener('click',async()=>{
    if(busy)return;
    busy=true;currentResult=null;$('runBtn').disabled=true;$('runBtn').textContent='Generating…';
    $('action').textContent='PROCESSING';$('action').className='status';
    $('decision').textContent='Checking requirements and, if appropriate, generating a live AI lesson plan…';
    $('output').innerHTML='';$('exportActions').hidden=true;
    $('result-panel').setAttribute('aria-busy','true');
    try{
      const response=await fetch('/.netlify/functions/generate-plan',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(data())});
      let r;
      try{r=await response.json()}catch{throw new Error('The server returned an unreadable response. Check your Netlify function deployment.');}
      if(!response.ok)throw new Error(r.error||'The live AI request failed.');
      render(r);
    }catch(err){render({action:'ERROR',reason:'Unable to generate a live lesson plan',message:err.message||'Please try again.'});}
    finally{busy=false;$('runBtn').disabled=false;$('runBtn').textContent='Generate with live AI';$('result-panel').removeAttribute('aria-busy');}
  });
  $('clearBtn').addEventListener('click',resetForm);
  $('copyBtn').addEventListener('click',async()=>{
    if(!currentResult?.lesson)return;
    try{await navigator.clipboard.writeText(lessonText(currentResult.lesson));$('copyBtn').textContent='Copied';setTimeout(()=>$('copyBtn').textContent='Copy lesson plan',1600);}
    catch(e){const box=document.createElement('textarea');box.value=lessonText(currentResult.lesson);box.style.position='fixed';box.style.top='-9999px';document.body.appendChild(box);box.select();document.execCommand('copy');box.remove();$('copyBtn').textContent='Copied';setTimeout(()=>$('copyBtn').textContent='Copy lesson plan',1600);}
  });
  $('printBtn').addEventListener('click',()=>window.print());