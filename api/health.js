const {redis,send,dateBJ}=require('./_lib');
module.exports=async(req,res)=>{try{const raw=await redis('GET','markets:index');const index=raw?JSON.parse(raw):{latest:null};const today=dateBJ();send(res,index.latest===today?200:503,{today,latest:index.latest||null,upToDate:index.latest===today});}catch(e){send(res,503,{upToDate:false,error:'Database unavailable or unconfigured'});}};
