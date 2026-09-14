// Geographic terminal-area centres, rounded to town scale. Connecting paths are
// schematic, not surveyed cable routes. MW is nominal nameplate, not availability.
export const cables = [
 {id:'ifa',name:'IFA',code:'INTFR',country:'France',capacity:2000,gb:[1.00,51.10],other:[1.79,50.91],ends:['Sellindge','Les Mandarins, near Calais'],label:[540,667],source:'https://www.ifa1interconnector.com/'},
 {id:'ifa2',name:'IFA2',code:'INTIFA2',country:'France',capacity:1000,gb:[-1.20,50.82],other:[-0.30,49.12],ends:['Daedalus / Solent','Tourbe, Normandy'],label:[355,734],source:'https://www.ifa2interconnector.com/'},
 {id:'eleclink',name:'ElecLink',code:'INTELEC',country:'France',capacity:1000,gb:[1.14,51.09],other:[1.78,50.92],ends:['Folkestone terminal area','Peuplingues / Coquelles terminal area'],label:[570,723],source:'https://www.eleclink.co.uk/'},
 {id:'britned',name:'BritNed',code:'INTNED',country:'Netherlands',capacity:1000,gb:[0.71,51.44],other:[4.03,51.96],ends:['Isle of Grain','Maasvlakte'],label:[698,553],source:'https://www.britned.com/'},
 {id:'nemo',name:'Nemo Link',code:'INTNEM',country:'Belgium',capacity:1000,gb:[1.33,51.31],other:[3.22,51.31],ends:['Richborough','Herdersbrug / Bruges'],label:[709,620],source:'https://www.nemolink.co.uk/'},
 {id:'nsl',name:'North Sea Link',code:'INTNSL',country:'Norway',capacity:1400,gb:[-1.51,55.14],other:[6.98,59.51],ends:['Blyth','Kvilldal'],label:[690,165],source:'https://www.northsealink.com/'},
 {id:'viking',name:'Viking Link',code:'INTVKL',country:'Denmark',capacity:1400,gb:[-0.19,52.94],other:[9.09,55.49],ends:['Bicker Fen','Revsing'],label:[740,357],source:'https://www.viking-link.com/'},
 {id:'ewic',name:'East–West',code:'INTEW',country:'Ireland',capacity:500,gb:[-3.05,53.23],other:[-6.60,53.52],ends:['Deeside','Woodland'],label:[105,466],source:'https://www.eirgrid.ie/interconnection'},
 {id:'moyle',name:'Moyle',code:'INTIRL',country:'Northern Ireland',capacity:500,gb:[-5.00,55.03],other:[-5.78,54.84],ends:['Auchencrosh','Ballycronan More'],label:[108,360],source:'https://www.mutual-energy.com/moyle-interconnector/'},
 {id:'greenlink',name:'Greenlink',code:'INTGRNL',country:'Ireland',capacity:500,gb:[-4.99,51.69],other:[-6.98,52.28],ends:['Pembroke','Great Island'],label:[100,570],source:'https://www.greenlink.ie/'}
] as const;
export type Cable = typeof cables[number];
