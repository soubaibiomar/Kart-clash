class TeamBase extends Vehicle {
 constructor(team,x,y){super(x,y,0,0);this.vel.set(0,0);this.id='base'+team;this.team=team;this.r=85;this.name=team===0?'Base azur':'Base corail';}
}
