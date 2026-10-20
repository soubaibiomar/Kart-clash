class WanderCar extends RaceCar {
  constructor(x, y, number) {
    super(x, y, number);
    this.teamColor = "#8de769";
    this.maxSpeed = 2;
    this.cruiseSpeed = 2;
    this.followPathWeight = 0;
    this.wanderWeight = 1;
    this.displaceRange = 0.2;
  }
}
