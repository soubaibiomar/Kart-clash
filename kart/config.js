const KC={DT:1/60,W:1800,H:1400,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),angle:a=>Math.atan2(Math.sin(a),Math.cos(a)),

 names:['Toi','Bolt','Miso','Pixel','Rivet','Pogo','Taffy','Nova','Flick','Pebble','Zip','Crumb','Echo'],

 colors:['#ff784c','#3dbbd3','#e993ed','#efd454','#7ae09a','#8489ff','#ef7291','#e6e3ce','#70afed','#bdb47c','#ca91f3','#ffb873','#62d4bb'],

 items:{rocket:{name:'Roquette',ammo:1,damage:60,life:2.5,speed:16},homing:{name:'Missile guidé',ammo:1,damage:45,life:4,speed:9},mine:{name:'Mine',ammo:1,damage:70,life:25},rapid:{name:'Rafale',ammo:10,damage:15,life:1.2,speed:22},shield:{name:'Bouclier',ammo:1,duration:6},boost:{name:'Turbo',ammo:1,duration:3}},

 challenges:{parking:['Parking précis','Rejoins les trois balises et arrête-toi dans chaque cercle.',75],slalom:['Slalom industriel','Traverse les cinq balises dans l’ordre sans dépasser huit contacts.',90],intercept:['Interception','Intercepte trois fois le kart qui anticipe tes déplacements.',75],escape:['Échappée','Reste en vie 45 secondes face à trois chasseurs.',45],convoy:['Escorte','Rassemble les trois alliés près de la balise de sortie.',90],snake:['Convoi serpent','Mène toute la chaîne jusqu’à la sortie.',90],patrol:['Tour de garde','Accompagne le patrouilleur dans quatre secteurs.',100]}};

class KartRandom{constructor(seed=1){this.state=seed>>>0||1;}next(){let n=this.state;n^=n<<13;n^=n>>>17;n^=n<<5;this.state=n>>>0;return this.state/4294967296;}range(a,b){return a+(b-a)*this.next();}pick(a){return a[Math.floor(this.next()*a.length)];}}

