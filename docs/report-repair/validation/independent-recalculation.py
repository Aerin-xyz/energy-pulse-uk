import json,gzip,glob,datetime,hashlib,sys
root=sys.argv[1]
m=json.load(open(root+'/manifest.json')); data=[]
for p in glob.glob(root+'/elexon-*.json.gz'):data.extend(json.load(gzip.open(p))['data'])
fuels={'BIOMASS','CCGT','COAL','NPSHYD','NUCLEAR','OCGT','OIL','OTHER','WIND'}
chosen={}
for r in data:
 if r['fuelType'] not in fuels or not ('2026-11-10'<=r['startTime'][:10]<='2026-11-16'):continue
 key=(r['startTime'],r['fuelType']);old=chosen.get(key)
 if old is None or r['publishTime']>old['publishTime']:chosen[key]=r
assert len(chosen)==336*9
energy=sum(r['generation']/2 for r in chosen.values());assert energy==m['modules']['metered']['totalMWh']
renewable=sum(r['generation']/2 for r in chosen.values() if r['fuelType'] in {'WIND','NPSHYD'})
assert abs(100*renewable/energy-m['modules']['metered']['renewableShare'])<1e-10
print(json.dumps({'independent_language':'Python','intervals':336,'fuel_interval_values':len(chosen),'energyMWh':energy,'renewableShare':100*renewable/energy,'result':'exact match to retained Elexon observations'},indent=2))
