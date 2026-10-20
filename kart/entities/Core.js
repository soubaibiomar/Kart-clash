class Core extends Vehicle {
 constructor(){super(900,850,0,0);this.vel.set(0,0);this.id='core';this.name='Noyau';this.r=22;this.carrier=null;this.readyAt=0;}
 // Attachment, drop and respawn are explicit objective rules, never autonomous locomotion.
 attach(k){this.carrier=k.id;this.pos.set(k.pos);}
 drop(w){this.carrier=null;this.readyAt=w.time+.6;w.emit('core-drop',this);}
 reset(w){this.carrier=null;this.pos.set(900,850);this.readyAt=w.time+2;}
}
