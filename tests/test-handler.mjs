import assert from 'node:assert/strict';
import handler from '../netlify/functions/generate-plan.mjs';

function req(payload, opts={}){
 return new Request('https://example.netlify.app/.netlify/functions/generate-plan', {
   method:'POST', headers:{'Content-Type':'application/json',host:'example.netlify.app',origin:'https://example.netlify.app'},
   body:JSON.stringify(payload)
 });
}
const base={topic:'Evaluating Online Information',audience:'First-year college students',duration:'40',setting:'Online',objective:'Compare the credibility of two online sources and support a choice with evidence.',materials:'Online chat only; no breakout rooms or slides',activities:'',each:''};
async function result(input){ const r=await handler(req(input));return {status:r.status,data:await r.json()};}
let called=0;
const originalFetch=globalThis.fetch;
const oldKey=process.env.GEMINI_API_KEY;
try {
  delete process.env.GEMINI_API_KEY;
  for(const [name,input,expect] of [
    ['missing duration',{...base,duration:''},'CLARIFY'],
    ['missing objective',{...base,objective:''},'CLARIFY'],
    ['ambiguous objective',{...base,objective:'Learn something about AI.'},'CLARIFY'],
    ['short 8min',{...base,duration:'8'},'CLARIFY'],
    ['impossible timing',{...base,duration:'20',activities:'6',each:'15'},'HUMAN_REVIEW'],
    ['guaranteed mastery',{...base,objective:'Guarantee that all students will master the topic.'},'HUMAN_REVIEW'],
    ['final grades',{...base,objective:'Assign final grades to individual students based only on their names.'},'HUMAN_REVIEW'],
    ['equivalent natural conflict',{...base,duration:'20',objective:'Explain online information. Include six activities, with fifteen minutes allocated to each one.'},'HUMAN_REVIEW'],
  ]) {
    const {data,status}=await result(input);
    assert.equal(status,200,name+': status');assert.equal(data.action,expect,name);
    console.log('PASS:',name,'->',data.action);
  }
  const unconfigured=await result(base);
  assert.equal(unconfigured.status,503);assert.match(unconfigured.data.error,/not configured/);
  console.log('PASS: API key missing -> explicit error, no template fallback');

  process.env.GEMINI_API_KEY='test-synthetic-not-a-real-secret';
  const generated={title:'Evaluating Online Information',stimulus:'Fictional Source A: The Student Media Desk, a 2024 unsigned opinion post with no evidence. Fictional Source B: University Research Bulletin, a 2025 signed research summary with cited methodology.',
    phases:[0,1,2,3].map(i=>({name:['Quick source vote','Model credibility criteria','Side-by-side source analysis','Exit ticket with evidence'][i],goal:'Evaluate authorship and evidence to justify which online source is more credible.',teacher:'Paste both fictional source descriptions into the shared chat and ask: Which source has stronger evidence, and why?',students:'Type an individual claim in the shared chat, citing two concrete credibility indicators.',check:'Students name at least two criteria, cite evidence, and justify a credibility conclusion.'})),
    notes:['Check whether examples are suitable for this class.']};
  globalThis.fetch=async (url,options)=>{
    called+=1;
    assert.match(url,/generativelanguage.googleapis.com\/v1beta\/models\/gemini-2.5-flash:generateContent/);
    assert.equal(options.headers['x-goog-api-key'],'test-synthetic-not-a-real-secret');
    const payload=JSON.parse(options.body);
    assert.equal(payload.generationConfig.responseMimeType,'application/json');
    assert.equal(payload.generationConfig.responseSchema.type,'object');
    assert.equal(payload.generationConfig.thinkingConfig.thinkingBudget,0);
    assert.equal(JSON.parse(payload.contents[0].parts[0].text).phase_minutes.reduce((a,b)=>a+b,0),40);
    assert.match(payload.systemInstruction.parts[0].text,/shared main chat/i);
    return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(generated)}]}}]}),{status:200});
  };
  const live=await result(base);
  assert.equal(live.status,200);assert.equal(live.data.action,'GENERATE');
  assert.equal(live.data.lesson.phases.length,4);
  assert.equal(live.data.lesson.phases.reduce((sum,p)=>sum+p.minutes,0),40);
  assert.match(live.data.lesson.pack,/Live LLM/);
  assert.equal(called,1);
  console.log('PASS: mocked live provider -> 4 tailored phases, exact 40-minute total');

  const invalid={...generated,phases:generated.phases.slice(0,2)};
  globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(invalid)}]}}]}),{status:200});
  const bad=await result(base);assert.equal(bad.status,502);assert.match(bad.data.error,/four-phase structure/);
  console.log('PASS: invalid AI output -> rejected, no fake success');

  const forbidden=JSON.parse(JSON.stringify(generated));
  forbidden.phases[0].teacher='Make slides to introduce credibility criteria, then invite each learner to present.';
  globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(forbidden)}]}}]}),{status:200});
  const unsafe=await result(base);assert.equal(unsafe.data.action,'HUMAN_REVIEW');assert.match(unsafe.data.message,/slides/);
  console.log('PASS: forbidden resource in AI output -> HUMAN_REVIEW');
} finally {
 globalThis.fetch=originalFetch;
 if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;
}
