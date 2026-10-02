const {redis,send,dateBJ,parseRSS,FEEDS}=require('./_lib');
const CAPS={world:3,global:3,mainland:5,hongkong:5};
const contentDate=(s)=>/^20\d{2}-\d{2}-\d{2}$/.test(s);
function clamp(output,items){const known=new Map(items.map(x=>[x.url,x]));const seen=new Set();const sections={world:[],global:[],mainland:[],hongkong:[]};
 for(const key of Object.keys(sections)){for(const x of output.sections?.[key]||[]){const src=known.get(x.url);if(!src||seen.has(x.url)||sections[key].length>=CAPS[key])continue;if(src.section!==key)continue;if(!x.headline||!x.summary||x.summary.length<90||!x.implication||x.implication.length<100)continue;sections[key].push({headline:String(x.headline).slice(0,220),source:src.source,published:new Date(src.ts).toISOString().slice(0,10),url:src.url,summary:String(x.summary),implication:String(x.implication),label:String(x.label||''),images:[]});seen.add(x.url);}}
 return sections;
}
async function run(){
 const keys=['CRON_SECRET','OPENAI_API_KEY','OPENAI_MODEL','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'];
 const missing=keys.filter(k=>!process.env[k]);if(missing.length)throw Error('Missing configuration: '+missing.join(', '));
 const now=new Date();const date=dateBJ(now);
 // Use actual server run time; explicit cutoff, never claim 07:00 if cron arrived later.
 const cutoff=now.getTime(),earliest=cutoff-72*3600*1000;
 const prior=await redis('GET','markets:index');
 const index=prior?JSON.parse(prior):{latest:null,dates:[]};
 if(index.latest===date){const existing=await redis('GET','markets:edition:'+date);if(existing)return {status:'already_published',date};}
 const results=await Promise.all(FEEDS.map(async ([source,section,url])=>{try{const resp=await fetch(url,{headers:{'User-Agent':'MarketsBrief/1.0 (RSS research)','Accept':'application/rss+xml, application/xml, text/xml'},signal:AbortSignal.timeout(11000)});if(!resp.ok) return [];return parseRSS(await resp.text(),source,section,cutoff,earliest);}catch{return [];}}));
 const all=results.flat().sort((a,b)=>b.ts-a.ts),uniq=[],heads=new Set();
 for(const x of all){const key=x.title.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();if(heads.has(key))continue;heads.add(key);uniq.push(x);}
 if(uniq.length<8)throw Error('Not enough recent source items: '+uniq.length);
 const lastDates=(index.dates||[]).slice(0,2),previous=[];
 for(const d of lastDates){if(!contentDate(d))continue;const raw=await redis('GET','markets:edition:'+d);if(raw){const e=JSON.parse(raw);previous.push(...Object.values(e.sections||{}).flat().map(x=>({headline:x.headline,url:x.url,published:x.published})));}}
 const candidates=uniq.slice(0,75).map(({ts,...x})=>({...x,published:new Date(ts).toISOString().slice(0,10)}));
 const instructions=`Produce an English Daily World & Markets Brief in JSON from SOURCE FEED METADATA ONLY. This is source metadata, not full articles: do not invent numbers, quotations, specifics, or causal assertions not evidenced by the supplied headline/description. If insufficient evidence, skip the item. Prioritize items published within 24h; 48-72h only if truly significant and marked BACKGROUND with the real date. Exclude last two editions' URLs/headlines without a verifiable distinct development. Respect category and exact source URL. Maximum World 3, Global Finance 3, Mainland 5, Hong Kong 5; fewer is better than repetition. Each summary at least ~2-4 grounded sentences, no unsupported details. Each implication provides causal mechanisms relevant to rates/FX/CB/DCM/ECM/credit/wealth as appropriate and flags uncertainty, at least ~3 substantive sentences. For world news focus on event importance rather than finance alone. No images because none are provenance-verified. Include 3 interview-ready one-sentence takeaways. Return JSON object only: {"sections":{"world":[{"headline":"","summary":"","implication":"","url":"","label":""}],"global":[],"mainland":[],"hongkong":[]},"takeaways":{"Global Macro":"","Mainland China":"","Hong Kong":""}}.`;
 const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL,messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify({date,cutoff:new Date(cutoff).toISOString(),candidates,previous})}],response_format:{type:'json_object'},temperature:0.1,max_completion_tokens:9500}),signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error('AI HTTP '+response.status+': '+(await response.text()).slice(0,220));
 const raw=await response.json(),answer=JSON.parse(raw.choices?.[0]?.message?.content||'{}');
 const sections=clamp(answer,uniq);
 const n=Object.values(sections).reduce((acc,a)=>acc+a.length,0);if(n<5)throw Error('Insufficient independently validated material after model output: '+n);
 const takeaways={};for(const k of ['Global Macro','Mainland China','Hong Kong'])takeaways[k]=String(answer.takeaways?.[k]||'Insufficient verified material for a fresh takeaway.');
 const edition={date:new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',dateStyle:'long'}).format(now),cutoff:new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',dateStyle:'medium',timeStyle:'short'}).format(now)+' CST',note:'Automated, source-grounded RSS digest. Headlines and publication dates verified from source feed metadata. Summaries are restricted to the supplied excerpts, not paid full-text articles. Unverified images are omitted. Fewer than 16 items may be published to protect freshness.',sections,takeaways};
 // Commit dated edition before switching public index; if index write fails prior edition remains accessible.
 await redis('SET','markets:edition:'+date,JSON.stringify(edition));
 const dates=[date,...(index.dates||[]).filter(x=>x!==date)].slice(0,120);
 await redis('SET','markets:index',JSON.stringify({latest:date,dates,updated_at:now.toISOString()}));
 return {status:'published',date,count:n,sections:Object.fromEntries(Object.entries(sections).map(([k,v])=>[k,v.length]))};
}
module.exports=async(req,res)=>{if(req.method!=='GET'&&req.method!=='POST')return send(res,405,{error:'Method not allowed'});
 if(!process.env.CRON_SECRET||req.headers.authorization!=='Bearer '+process.env.CRON_SECRET)return send(res,401,{error:'Unauthorized'});
 try{return send(res,200,await run());}catch(e){console.error('Daily brief failed:',e);return send(res,503,{status:'failed',error:String(e.message||e)});}
};
