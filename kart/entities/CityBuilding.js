/** Static building with the same footprint in sensing, contacts and rendering. */
class CityBuilding extends ArenaObstacle {
 constructor(spec){super(spec.id,spec.x,spec.y,spec.w,spec.d,spec.height,'city-building');this.style=spec.style;this.seed=spec.seed;this.frontage=spec.frontage?{...spec.frontage}:null;}
 blocks(k){const elevation=k.elevation||0;return elevation>=-30&&elevation<this.height+30;}
}
