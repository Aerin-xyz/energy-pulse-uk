import fs from 'node:fs';
const files=['network-osm','network-275','network-132','network-stations'];
const sources=files.map(name=>JSON.parse(fs.readFileSync('.cache/'+name+'.json','utf8')));
const lines=[],substations=[],seen=new Set();
const project=p=>[(p.lon+12)*40,(61-p.lat)*63];
// Existing Natural Earth outline uses the same map projection. Restrict domestic
// network features to GB land polygons, excluding the separate Northern Ireland polygon.
const outline=JSON.parse(fs.readFileSync('src/data/atlas/countries.json')).find(c=>c.name==='United Kingdom').path;
const polygons=outline.split('M').slice(1).map(p=>[...p.matchAll(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g)].map(m=>[+m[1],+m[2]])).filter(p=>{const x=p.reduce((s,v)=>s+v[0],0)/p.length,y=p.reduce((s,v)=>s+v[1],0)/p.length;return !(x<270&&y>300&&y<470)});
function within([x,y]){return polygons.some(poly=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside})}
for(const source of sources)for(const e of source.elements){
 const id=e.type+'/'+e.id;if(seen.has(id))continue;seen.add(id);const t=e.tags||{};
 if(t.power==='substation'){if(!/400000|275000/.test(t.voltage||''))continue;const p=e.center||e;if(Number.isFinite(p.lat)&&p.lat>=50&&p.lat<=61&&p.lon>=-6&&p.lon<=2){const[x,y]=project(p);if(!within([x,y]))continue;substations.push({id,name:t.name||'',x:+x.toFixed(2),y:+y.toFixed(2),latitude:p.lat,longitude:p.lon,voltage:t.voltage})}continue}
 const voltage=Number(t.voltage);if(![400000,275000,132000].includes(voltage)||!e.geometry?.length)continue;
 // The 132 kV extract is Scotland context only; omit the NI overlap of the query rectangle.
 if(voltage===132000&&e.geometry.some(p=>p.lat<55.45&&p.lon< -5.4))continue;
 const points=e.geometry.filter(p=>Number.isFinite(p.lon)&&Number.isFinite(p.lat)).map(project);
 if(!points.some(within))continue;
 // Retain turns and endpoints while dropping sub-display-scale intermediate points.
 const reduced=points.filter((p,i)=>!i||i===points.length-1||Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1])>.12);
 if(reduced.length<2)continue;
 lines.push({id,name:t.name||t.ref||'',voltage,path:reduced.map((p,i)=>(i?'L':'M')+p.map(v=>v.toFixed(2)).join(',')).join('')});
}
if(lines.length<100||substations.length<10)throw Error('Network source coverage check failed');
const result={schemaVersion:1,asOf:sources.map(s=>s.osm3s.timestamp_osm_base).sort()[0],retrievedAt:new Date().toISOString(),attribution:'© OpenStreetMap contributors',licence:'https://opendatacommons.org/licenses/odbl/1-0/',source:'https://overpass-api.de/api/interpreter',coverage:'Community-mapped 400/275 kV overhead lines in GB and partial 132 kV Scotland context, plus tagged 400/275 kV substations. Incomplete, approximate and not operator-verified. Not live flows, ratings or switching state. No connections inferred between assets and lines.',lines,substations};
fs.writeFileSync('public/data/network-geography.json',JSON.stringify(result));
console.log({lines:lines.length,substations:substations.length,asOf:result.asOf});
