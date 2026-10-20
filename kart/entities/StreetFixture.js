/** Roadside tree or lamp; all physical city props inherit Vehicle. */
class StreetFixture extends ArenaObstacle {
 constructor(spec){super(spec.id,spec.x,spec.y,spec.w,spec.d,spec.height,'street-fixture');this.fixture=spec.kind;this.heading=spec.heading;}
 blocks(k){return (k.elevation||0)<this.height+25;}
}
