'use strict';
const TOKEN=()=>process.env.UPSTASH_REDIS_REST_TOKEN;
const URLBASE=()=>process.env.UPSTASH_REDIS_REST_URL;
async function redis(...command){
 if(!TOKEN()||!URLBASE())throw Error('Storage not configured');
 const r=await fetch(URLBASE(),{method:'POST',headers:{Authorization:'Bearer '+TOKEN(),'Content-Type':'application/json'},body:JSON.stringify(command)});
 if(!r.ok)throw Error('Storage HTTP '+r.status);
 const data=await r.json();if(data.error)throw Error('Storage: '+data.error);return data.result;
}
const send=(res,status,data)=>{res.setHeader('Cache-Control','no-store');res.status(status).json(data);};
function dateBJ(d=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
function entity(s){return s.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
function tag(xml,name){const match=xml.match(new RegExp('<(?:[\\w-]+:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?'+name+'>','i'));return match?entity(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()):'';}
function parseRSS(xml,source,section,cutoff,earliest){
 return Array.from(xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)).slice(0,80).map(m=>{const x=m[1];const title=tag(x,'title');const url=tag(x,'link');const published=tag(x,'pubDate')||tag(x,'published');const ts=Date.parse(published);const description=tag(x,'description').slice(0,750);return {title,url,published,description,source,section,ts};}).filter(x=>x.title&&/^https:\/\//.test(x.url)&&Number.isFinite(x.ts)&&x.ts<=cutoff&&x.ts>=earliest);
}
const FEEDS=[
 ['BBC World','world','https://feeds.bbci.co.uk/news/world/rss.xml'],
 ['The Guardian World','world','https://www.theguardian.com/world/rss'],
 ['The Guardian Business','global','https://www.theguardian.com/uk/business/rss'],
 ['CNBC World','global','https://www.cnbc.com/id/100727362/device/rss/rss.html'],
 ['SCMP China','mainland','https://www.scmp.com/rss/4/feed'],
 ['China Daily','mainland','https://www.chinadaily.com.cn/rss/china_rss.xml'],
 ['SCMP Hong Kong','hongkong','https://www.scmp.com/rss/2/feed']
];
module.exports={redis,send,dateBJ,parseRSS,FEEDS};
