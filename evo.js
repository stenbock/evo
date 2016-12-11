// TODO: Herbivores and Carnivores (and Omnivores?)
// TODO: Control panel
// TODO: Help Box
// TODO: Optionally skip rendering frames to increase ticks per second
var screenW = document.body.clientWidth;
var screenH = document.body.clientHeight;

var statsdiv = document.getElementById("stats");
var messagediv = document.getElementById("message");
var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");
canvas.width = screenW;
canvas.height = screenH;

var defaultCfg = {
  tilesize: 20,
  eatlimit: 40,
  endOnEmpty: true,
  startPlants: 100,
  startAnimals: 10,
  plantBorder: 1,
  gamespeed: 16,
  plantMutation: 10,
  animalMutation: 10
};
var cfg = copyCfg(defaultCfg);
cfg.startPlants = 200;
cfg.startAnimals = 20;
cfg.endOnEmpty = true;
cfg.gamespeed = 10;
cfg.tilesize = 10;
cfg.plantBorder = 1;
cfg.eatlimit = 40;
cfg.animalMutation = 15;
cfg.plantMutation = 5;

var game;

function Game(config) {
  this.config = copyCfg(config);
  this.frameNumber = 0;
  this.interval;
  this.rerender = [[]];
  this.running = false;

  this.plants = [[]];
  this.plantsAlive = 0;
  this.animals = [];

  // TODO: move these into a map based object?
  this.max_x = Math.floor(screenW/config.tilesize - 1);
  this.max_y = Math.floor(screenH/config.tilesize - 1);

  context.fillStyle = "black";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (var i = 0; i < this.config.startPlants; i++) {
    var x = randomInt(0, this.max_x);
    var y = randomInt(0, this.max_y);
    var plotFree = !(this.plants[x] != null && this.plants[x][y] != null);
    if (plotFree) {
      this.plantsAlive++;
      if (!this.plants[x]) {
        this.plants[x] = [];
      }
      this.plants[x][y] = new Plant(x, y, new Color(0, randomInt(128, 255), 0));
    }
  }
  for (var i = 0; i < this.config.startAnimals; i++) {
    var x = randomInt(0, this.max_x);
    var y = randomInt(0, this.max_x);
    var na = new Animal(x, y, new Color(0, 255, 0));
    na.life += 200;
    na.energy += 200;
    this.animals.push(na);
  }

  this.deaths = {
    oldage: 0,
    starvation: 0
  }

  this.lastRenderTime = 0;
  this.fpsa = [];
  this.fps = 0;
}
Game.prototype.start = function (time) {
  this.running = true;
  this.interval = setInterval(function() {
    game.tick();
    game.render();
    game.calculateFPS();
  }, this.config.gamespeed);
}
Game.prototype.calculateFPS = function () {
  var fps;
  if (this.lastRenderTime)
    fps = Math.floor(1000/(Date.now() - this.lastRenderTime));
  else
    fps = 0;

  this.fpsa.push(fps);

  if (this.fpsa.length > 60)
    this.fpsa.shift();

  sum = this.fpsa.reduce((pv, cv) => pv+cv, 0);
  sum = sum/this.fpsa.length;
  if (sum > 10) {
    sum = Math.floor(sum);
  } else {
    sum = Math.floor(sum*10)/10;
  }
  this.fps = sum;
  this.lastRenderTime = Date.now();
}
Game.prototype.stop = function () {
  this.running = false;
  clearInterval(this.interval);
  this.render();
}
Game.prototype.tick = function () {
  for (var i = 0; i <= game.max_x; i++) {
    for (var j = 0; j <= game.max_y; j++) {
      var plant = this.getPlant(i, j);
      if (plant) {
        plant.grow();
      }
    }
  }
  for (var i = 0; i < this.animals.length; i++) {
    this.animals[i].ai();
  }
  if (this.config.endOnEmpty && this.plantsAlive == 0) {
    messagediv.innerHTML = "Plants went extinct";
    messagediv.style.display = "block";
    this.stop();
  } else if (this.config.endOnEmpty && this.animals.length == 0) {
    messagediv.innerHTML = "<p>Animals went extinct!</p>" +
                           "Starvation: " + this.deaths.starvation + "<br>" +
                           "Old age: " + this.deaths.oldage;
    messagediv.style.display = "block";
    this.stop();
  }
}
Game.prototype.render = function () {
  this.frameNumber++;

  for (var i = 0; i < this.rerender.length; i++) {
    if (!this.rerender[i])
      continue;
    for (var j = 0; j < this.rerender[i].length; j++) {
      if (!this.rerender[i][j])
        continue;
      this.rerender[i][j].draw(context);
    }
  }

  this.rerender = [[]];
  
  for (var i = 0; i < this.animals.length; i++) {
    this.animals[i].draw(context);
  }

  
  statsdiv.innerHTML = "Size: " + this.max_x + "x" + this.max_y + "<br>" +
                      "Plants: " + this.plantsAlive + "<br>" +
                      "Animals: " + this.animals.length + "<br>" +
                      "FPS: " + this.fps;
}
Game.prototype.rerenderRq = function (obj) {
  if (!this.rerender[obj.x]) {
    this.rerender[obj.x] = [];
    this.rerender[obj.x][obj.y] = obj;
  } else if (!this.rerender[obj.x][obj.y]) {
    this.rerender[obj.x][obj.y] = obj;
  } else if (this.rerender[obj.x][obj.y] instanceof RerenderSq) {
    this.rerender[obj.x][obj.y] = obj;
  } 
}
Game.prototype.getPlant = function (x, y) {
  if (this.plants[x]) {
    return this.plants[x][y];
  }
  return null;
}

function Color(r, g, b) {
  this.r = r !== undefined ? r : randomInt(0, 255);
  this.g = g !== undefined ? g : randomInt(0, 255);
  this.b = b !== undefined ? b : randomInt(0, 255);
}
Color.prototype.toString = function () {
  return "rgb(" + this.r + "," + this.g + "," + this.b + ")";
}
Color.prototype.mutate = function (mut) {
  var c = new Color(this.r, this.g, this.b);
  c.r += randomInt(-mut, mut);
  c.g += randomInt(-mut, mut);
  c.b += randomInt(-mut, mut);
  if (c.r > 255) { c.r = 255; }
  if (c.r < 0) { c.r = 0; }
  if (c.g > 255) { c.g = 255; }
  if (c.g < 0) { c.g = 0; }
  if (c.b > 255) { c.b = 255; }
  if (c.b < 0) { c.b = 0; }
  return c;
}

function Plant(x, y, color) {
  this.x = x;
  this.y = y;
  this.color = color;
  this.size = 10;
}
Plant.prototype.draw = function(context) {
  var t = game.config.tilesize;

  var startx = this.x*t;
  var starty = this.y*t;

  if (this.visited) {
    context.fillStyle = 'black';
    context.fillRect(startx, starty, t, t);
    this.visited = false;
  }

  var size = t - game.config.plantBorder;

  /*
  startx = startx + Math.floor((t/2)*100/this.size);
  starty = starty + Math.floor((t/2)*100/this.size);
  */

  size = Math.floor(size * this.size/100);

  if (size > 0) {
    context.fillStyle = this.color.toString();
    context.fillRect(startx, starty, size, size);
  }
}
Plant.prototype.grow = function() {
  // TODO: could use a huge rethink
  if (this.size < 100) {
    this.size += randomInt(1, 10);
    game.rerenderRq(this);
  }
  if (this.size >= 100) {
    var d = randomDir(this.x, this.y);
    var p = game.getPlant(d.x, d.y);
    if (!p) {
      var np = new Plant(d.x, d.y, this.color.mutate(game.config.plantMutation));
      game.plantsAlive++;
      np.size = 30;
      this.size = 60;

      // TODO: addPlant
      if (!game.plants[d.x]) {
        game.plants[d.x] = [];
      }
      game.plants[d.x][d.y] = np;
      game.rerenderRq(this);
    } else {
      this.size = 100;
    }
  }
}

function Animal(x, y, color) {
  this.x = x;
  this.y = y;
  this.color = color;
  this.life = randomInt(500, 600);
  this.energy = 200;
  this.reproductionCooldown = 200;
}
Animal.prototype.draw = function(context) {
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
Animal.prototype.move = function() {
  var d = randomDir(this.x, this.y);
  var ps = [];
  var eat = 0;
  var eatp;

  // TODO: not map limit safe
  ps[0] = game.getPlant(this.x+1, this.y);
  ps[1] = game.getPlant(this.x, this.y+1);
  ps[2] = game.getPlant(this.x-1, this.y);
  ps[3] = game.getPlant(this.x, this.y-1);

  for (var i = 0; i < ps.length; i++) {
    var e = this.eatVal(ps[i]);

    if (ps[i] && ps[i].x == d.x && ps[i].y == d.y) {
      e += 1; // small incentive to get them going in random directions
    }

    if (e > eat) {
      eatp = ps[i];
      eat = e;
    }
  }

  if (eat > game.config.eatlimit) {
    this.x = eatp.x;
    this.y = eatp.y;
  } else {
    this.x = d.x;
    this.y = d.y;
  }
}
Animal.prototype.ai = function() {
  // TODO: split ai into parts, and make it modular
  // TODO: starvation
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
    var na = new Animal(this.x, this.y, this.color.mutate(game.config.animalMutation));
    this.energy = 2000;
    this.reproductionCooldown = 200;
    game.animals.push(na);
  }
}
Animal.prototype.eatVal = function (p) {
  if (!p)
    return 0;

  var eff = Math.abs(this.color.r - p.color.r);
  eff += Math.abs(this.color.g - p.color.g);
  eff += Math.abs(this.color.b - p.color.b);
  eff = 1-eff/765;
  return Math.floor(50*eff);
}

function RerenderSq(x, y) {
  this.x = x;
  this.y = y;
}
RerenderSq.prototype.draw = function (context) {
  var t = game.config.tilesize;

  context.fillStyle = 'black';
  context.fillRect(this.x*t, this.y*t, t, t);
}

function deleteAnimal(a) {
  var i = game.animals.indexOf(a);
  game.animals.splice(i, 1);
}

function randomInt(min, max) {
  return Math.floor(Math.random()*(max-min+1)+min);
}

function randomDir(x, y) {
  var d = {x, y};
  var r = randomInt(0, 3);
  switch (r) {
    case 0:
      d.x = x+1;
      d.y = y;
      break;
    case 1:
      d.x = x;
      d.y = y+1;
      break;
    case 2:
      d.x = x-1;
      d.y = y;
      break;
    default:
      d.x = x;
      d.y = y-1;
  }
  if (d.x > game.max_x) { d.x = game.max_x; }
  if (d.x < 0) { d.x = 0; }
  if (d.y > game.max_y) { d.y = game.max_y; }
  if (d.y < 0) { d.y = 0; }
  return d;
}

function copyCfg(cfg) {
  return JSON.parse(JSON.stringify(cfg));   // weird way to copy object
}

document.addEventListener("click", function (e) {
  if (!game.running) {
    messagediv.style.display = "none";
    game = new Game(cfg);
    game.start();
  } else {
    var p = game.getPlant(Math.floor(e.pageX/game.config.tilesize),
                          Math.floor(e.pageY/game.config.tilesize));
    if (p) {
      var a = new Animal(p.x, p.y, p.color);
      game.animals.push(a);
      console.log("Mouse click created:", a);
    }
  }
});

game = new Game(cfg);
game.start();
