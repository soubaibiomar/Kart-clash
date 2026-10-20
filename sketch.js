// Les classes portent la logique ; ce fichier relie la scène à p5.js et au DOM.
let debug = false;
let race;
let placingObstacle = false;

function setup() {
  const toolbarHeight = document.querySelector(".toolbar").offsetHeight;
  createCanvas(windowWidth, Math.max(240, windowHeight - toolbarHeight - 36)).parent("race-canvas");
  race = new RaceSimulation(width, height);
  document.getElementById("separation-force").addEventListener("input", event => {
    race.separationWeight = Number(event.target.value);
    document.getElementById("separation-value").value = `${race.separationWeight.toFixed(1)}×`;
  });
  document.getElementById("restart").addEventListener("click", () => race.reset());
  document.getElementById("avoidance-force").addEventListener("input",event=>{
    race.avoidanceWeight=Number(event.target.value);
    document.getElementById("avoidance-value").value=`${race.avoidanceWeight.toFixed(1)}×`;
  });
  document.getElementById("add-obstacle").addEventListener("click",()=>{
    placingObstacle=!placingObstacle;
    const button=document.getElementById("add-obstacle");
    button.setAttribute("aria-pressed",String(placingObstacle));
    button.textContent=placingObstacle ? "Terminer le placement" : "+ Obstacle";
    button.title=placingObstacle ? "Cliquez sur la piste pour placer des obstacles" : "Activer le placement d'obstacles";
    document.querySelector("canvas").style.cursor=placingObstacle ? "crosshair" : "default";
  });
  document.getElementById("debug-toggle").addEventListener("change", event => setDebug(event.target.checked));
}

function draw() {
  race.frame();
  document.getElementById("car-count").textContent = race.cars.length;
}

function setDebug(value) {
  debug = value;
  Vehicle.debug = value;
  document.getElementById("debug-toggle").checked = value;
}

function pointerInCanvas() {
  return mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;
}

function mousePressed(event) {
  if (event.target.tagName === "CANVAS" && pointerInCanvas()) {
    if (placingObstacle) race.addObstacle(mouseX,mouseY);
    else race.addCar(mouseX, mouseY);
  }
}

function mouseDragged(event) {
  if (event.target.tagName !== "CANVAS" || !pointerInCanvas()) return;
  if (placingObstacle) return false;
  const last = race.cars[race.cars.length - 1];
  if (!last || dist(mouseX, mouseY, last.pos.x, last.pos.y) > 38) race.addCar(mouseX, mouseY);
  return false;
}

function keyPressed(event) {
  if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
  const pressed = (event.key || key).toLowerCase();
  if (pressed === "d") {
    // D reste disponible après utilisation des curseurs et des boutons.
    if (event.target.closest('textarea, select, [contenteditable="true"], input:not([type="range"]):not([type="checkbox"])')) return;
    setDebug(!debug);
    event.preventDefault();
    return false;
  }
  if (event.target.closest("input, button, select, textarea")) return;
  if (pressed === "s" || pressed === "w") {
    const point = pointerInCanvas() ? createVector(mouseX, mouseY) : race.track.points[0];
    race.addCar(point.x, point.y, pressed === "s" ? "fast" : "wander");
  }
}

function windowResized() {
  const toolbarHeight = document.querySelector(".toolbar").offsetHeight;
  resizeCanvas(windowWidth, Math.max(240, windowHeight - toolbarHeight - 36));
  race.resize(width, height);
}
