"""Fetch ODbL network geography; backend/manual refresh, never a browser dependency.
Run: python3 scripts/fetch-network-geography.py && node scripts/build-network-geography.mjs
Public output remains unchanged if any fetch fails. Respect the public Overpass service.
"""
import json, pathlib, urllib.request, urllib.parse
queries = {
 'network-osm': '[out:json][timeout:60];way["power"="line"]["voltage"="400000"](50,-6,60,2);out geom;',
 'network-275': '[out:json][timeout:60];way["power"="line"]["voltage"="275000"](50,-6,60,2);out geom;',
 'network-132': '[out:json][timeout:60];way["power"="line"]["voltage"="132000"](55,-6.5,61,-.5);out geom;',
 'network-stations': '[out:json][timeout:60];way["power"="substation"]["substation"="transmission"](50,-6,61,2);out center;'
}
pathlib.Path('.cache').mkdir(exist_ok=True)
for name, query in queries.items():
 url='https://overpass-api.de/api/interpreter?'+urllib.parse.urlencode({'data':query})
 request=urllib.request.Request(url,headers={'User-Agent':'EnergyMix.info/1.0 (educational electricity map; https://energymix.info)'})
 with urllib.request.urlopen(request,timeout=80) as response:
  raw=response.read()
 data=json.loads(raw)
 if not data.get('elements') or data.get('remark'): raise RuntimeError('Incomplete network source: '+name)
 pathlib.Path('.cache/'+name+'.json').write_bytes(raw)
 print(name, len(data['elements']))
