"""Read official DUKES workbook cells without executing macros or formulae."""
import sys,zipfile,xml.etree.ElementTree as ET,json
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(sys.argv[1]) as z:
 strings=[]
 if 'xl/sharedStrings.xml' in z.namelist():
  strings=[''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)]
 result={}
 for name in z.namelist():
  if name.startswith('xl/worksheets/sheet') and name.endswith('.xml'):
   rows=[]
   for row in ET.fromstring(z.read(name)).findall('.//s:row',ns):
    cells={}
    for c in row.findall('s:c',ns):
     v=c.find('s:v',ns);text=v.text if v is not None else ''
     if c.attrib.get('t')=='s':text=strings[int(text)] if text else ''
     elif c.attrib.get('t')=='inlineStr':text=''.join(c.find('s:is',ns).itertext())
     cells[''.join(i for i in c.attrib['r'] if i.isalpha())]=text
    rows.append(cells)
   result[name]=rows
 print(json.dumps(result))
