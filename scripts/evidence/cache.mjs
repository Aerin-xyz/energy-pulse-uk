import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const root=process.env.GRID_CACHE_DIR||'.cache/grid-evidence';
export const digest=x=>createHash('sha256').update(x).digest('hex');
export async function cachedJSON(url,ttlMs=1800000){
 const file=`${root}/${digest(url)}.json`;await fs.mkdir(root,{recursive:true});let old;try{old=JSON.parse(await fs.readFile(file,'utf8'))}catch{}
 if(old&&Date.now()-Date.parse(old.checkedAt)<ttlMs)return old;
 const response=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{Accept:'application/json'}});if(!response.ok)throw Error(`Source HTTP ${response.status}`);
 const value=await response.json();const saved={value,checkedAt:new Date().toISOString(),revision:digest(JSON.stringify(value))};await fs.mkdir(root+'/revisions',{recursive:true});await fs.writeFile(root+'/revisions/'+saved.revision+'.json',JSON.stringify(saved));await fs.writeFile(file+'.tmp',JSON.stringify(saved));await fs.rename(file+'.tmp',file);return saved;
}
export async function atomicJSON(path,value){await fs.mkdir(path.slice(0,path.lastIndexOf('/')),{recursive:true});await fs.writeFile(path+'.tmp',JSON.stringify(value,null,2)+'\n');await fs.rename(path+'.tmp',path)}
export async function cachedText(url,ttlMs=86400000,encoding='utf-8'){
 const file=`${root}/${digest(url)}.text.json`;await fs.mkdir(root,{recursive:true});let old;try{old=JSON.parse(await fs.readFile(file,'utf8'))}catch{}
 if(old&&Date.now()-Date.parse(old.checkedAt)<ttlMs)return old;
 const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(`Source HTTP ${r.status}`);const value=new TextDecoder(encoding).decode(await r.arrayBuffer());const saved={value,checkedAt:new Date().toISOString(),revision:digest(value)};
 await fs.mkdir(root+'/revisions',{recursive:true});await fs.writeFile(root+'/revisions/'+saved.revision+'.json',JSON.stringify(saved));await fs.writeFile(file+'.tmp',JSON.stringify(saved));await fs.rename(file+'.tmp',file);return saved;
}
