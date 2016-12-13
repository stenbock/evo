function Animal(x, y, color, def) {
  this.x = x;
  this.y = y;
  this.color = color;
  this.def = def;
  this.life = randomInt(600, 700);
  this.energy = 300;
  this.reproductionCooldown = 300;

  // TODO: do this better

  if (def.functions.draw == "herbivoreDraw") {
    this.draw = herbivoreDraw;
  } else if (def.functions.draw == "carnivoreDraw") {
    this.draw = carnivoreDraw;
  } else {
    throw new Error("No draw function");
  }

  if (def.functions.move == "herbivoreMove") {
    this.move = herbivoreMove;
  } else if (def.functions.move == "carnivoreMove") {
    this.move = carnivoreMove;
  } else {
    throw new Error("No move function");
  }

  if (def.functions.ai == "herbivoreAI") {
    this.ai = herbivoreAI;
    this.eatVal = herbivoreEatVal;
  } else if (def.functions.ai == "carnivoreAI") {
    this.ai = carnivoreAI;
  } else {
    throw new Error("No ai function");
  }
}

function herbivoreDraw(context) {
  context.beginPath();
  context.arc(this.x*game.config.tilesize+game.config.tilesize/2,
              this.y*game.config.tilesize+game.config.tilesize/2,
              game.config.tilesize/2-2, 0, 2 * Math.PI, false);
  context.fillStyle = this.color.toString();
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = '#003300';
  context.stroke();
}
function herbivoreMove() {
  var r = randomInt(0, 3);
  var ps = [];
  var eat = 0;
  var eatp;

  // TODO: not map limit safe
  ps[0] = game.getPlant(this.x+1, this.y);
  ps[1] = game.getPlant(this.x, this.y+1);
  ps[2] = game.getPlant(this.x-1, this.y);
  ps[3] = game.getPlant(this.x, this.y-1);

  for (var j = 0; j < ps.length; j++) {
    var i = (j+r) % 4;
    var e = this.eatVal(ps[i]);

    if (e > eat) {
      eatp = ps[i];
      eat = e;
    }
  }

  if (eat > game.config.eatlimit) {
    this.x = eatp.x;
    this.y = eatp.y;
  } else {
    var d = randomDir(this.x, this.y);
    this.x = d.x;
    this.y = d.y;
  }
}
function herbivoreAI() {
  // TODO: split ai into parts, and make it modular
  this.reproductionCooldown--;
  this.energy -= 10;
  this.life--;

  var p = game.getPlant(this.x, this.y);
  if (p) { p.visited = true; }
  game.rerenderRq(p != null ? p : new RerenderSq(this.x, this.y));
  if (this.life <= 0) {
    game.deaths.oldage++;
    deleteAnimal(this);
    return;
  }

  if (this.energy <= 0) {
    game.deaths.starvation++;
    deleteAnimal(this);
    return;
  }

  var eat = this.eatVal(p);
  if (eat < game.config.eatlimit) {  // move
    this.move();
  } else {  // eat
    if (p.size < eat && this.energy > 4000) { // graze
      this.move();
    } else if (p.size < eat) {
      this.energy += p.size;
      p.size = -1;
      game.plants[p.x][p.y] = null;
      game.plantsAlive--;
    } else {
      this.energy += eat;
      p.size -= eat;
    }
  }

  if (this.reproductionCooldown <= 0 && this.energy > 4000) {  // breed
    var na = new Animal(this.x, this.y, this.color.mutate(game.config.animalMutation), this.def);
    this.energy = 2000;
    this.reproductionCooldown = 200;
    game.animals.push(na);
  }
}
function herbivoreEatVal (p) {
  if (!p)
    return 0;

  var eff = Math.abs(this.color.r - p.color.r);
  eff += Math.abs(this.color.g - p.color.g);
  eff += Math.abs(this.color.b - p.color.b);
  eff = 1-eff/765;
  return Math.floor(50*eff);
}

function carnivoreDraw(context) {
  var leftx = this.x*game.config.tilesize;
  var lefty = (this.y+1)*game.config.tilesize - game.config.plantBorder;
  var rightx = leftx + game.config.tilesize - game.config.plantBorder;
  var righty = lefty;
  var topx = leftx + Math.floor(game.config.tilesize/2);
  var topy = this.y*game.config.tilesize;
  context.beginPath();
  context.moveTo(leftx, lefty);
  context.lineTo(rightx, righty);
  context.lineTo(topx, topy);
  context.fillStyle = this.color.toString();
  context.fill();
  context.lineWidth = 0.3;
  context.strokeStyle = '#003300';
  context.stroke();
}

function carnivoreAI() {
}

function carnivoreMove() {
}
