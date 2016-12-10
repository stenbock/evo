// TODO: Herbivores and Carnivores (and Omnivores?)
// TODO: Control panel
// TODO: Optionally skip rendering frames to increase ticks per second
var screenW = document.body.clientWidth;
var screenH = document.body.clientHeight;

var datadiv = document.getElementById("datadiv");
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
cfg.startPlants = 100;
cfg.startAnimals = 10;
cfg.endOnEmpty = true;
cfg.gamespeed = 16;
cfg.tilesize = 10;
cfg.plantBorder = 1;
cfg.eatlimit = 40;
cfg.animalMutation = 15;

var game;

function Game(config) {
  this.config = copyCfg(config);
  this.frameNumber = 0;
  this.interval;
  this.rerender = [[]];

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
      this.plants[x][y] = new Plant(x, y, new Color(1, 255, 1));
    }

    /*
    if (plotFree && i%2 == 0) {
      this.plants[x][y] = new Plant(x, y, new Color(1, 255, 1));
    } else if (plotFree) {
      this.plants[x][y] = new Plant(x, y, new Color(1, 128, 1));
    }
    */
  }
  for (var i = 0; i < this.config.startAnimals; i++) {
    var x = randomInt(0, this.max_x);
    var y = randomInt(0, this.max_x);
    var na = new Animal(x, y, new Color(1, 255, 1));
    na.life += 100;
    this.animals.push(na);
  }

  this.lastRenderTime = 0;
  this.fpsa = [];
  this.fps = 0;
}
Game.prototype.start = function (time) {
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
    console.log("Ran out of plants");
    this.stop();
  } else if (this.config.endOnEmpty && this.animals.length == 0) {
    console.log("Animals went extinct");
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

  
  datadiv.innerHTML = "Size: " + this.max_x + "x" + this.max_y + "<br>" +
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
  // TODO: should probably track energy appart from size
  this.x = x;
  this.y = y;
  this.color = color;
  this.size = 10;
}
Plant.prototype.draw = function(context) {
  // TODO: needs variability

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
    var f;
    var nx, ny;
    // TODO: position object? with generalized features
    //       or just have inheritance shared with Animals
    var r = randomInt(0, 3);
    switch (r) {
      case 0:
        nx = this.x+1;
        ny = this.y;
        break;
      case 1:
        nx = this.x;
        ny = this.y+1;
        break;
      case 2:
        nx = this.x-1;
        ny = this.y;
        break;
      default:
        nx = this.x;
        ny = this.y-1;
    }
    if (nx > game.max_x) { nx = game.max_x; }
    if (nx < 0) { nx = 0; }
    if (ny > game.max_y) { ny = game.max_y; }
    if (ny < 0) { ny = 0; }
    f = game.getPlant(nx, ny);
    if (!f) {
      nf = new Plant(nx, ny, this.color.mutate(game.config.plantMutation));
      game.plantsAlive++;
      nf.size = 30;
      this.size = 60;
      if (!game.plants[nx]) {
        game.plants[nx] = [];
      }
      game.plants[nx][ny] = nf;
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
  this.life = randomInt(100, 150);
  this.energy = 0;
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
  // TODO: generalized class, inherit this func. See Plant
  var nx, ny;
  var r = randomInt(0, 3);
  switch (r) {
    case 0:
      nx = this.x+1;
      ny = this.y;
      break;
    case 1:
      nx = this.x;
      ny = this.y+1;
      break;
    case 2:
      nx = this.x-1;
      ny = this.y;
      break;
    default:
      nx = this.x;
      ny = this.y-1;
  }
  if (nx >= game.max_x) { nx = game.max_x; }
  if (nx < 0) { nx = 0; }
  if (ny >= game.max_y) { ny = game.max_y; }
  if (ny < 0) { ny = 0; }
  this.x = nx;
  this.y = ny;
}
Animal.prototype.ai = function() {
  // TODO: split ai into parts, and make it modular
  var f = game.getPlant(this.x, this.y);
  if (f) { f.visited = true; }
  game.rerenderRq(f != null ? f : new RerenderSq(this.x, this.y));
  this.life--;
  if (this.life <= 0) {
    deleteAnimal(this);
    return null;
  }
  if (f == null) {  // move
    this.move();
  } else {  // eat
    var eff = Math.abs(this.color.r - f.color.r);
    eff += Math.abs(this.color.g - f.color.g);
    eff += Math.abs(this.color.b - f.color.b);
    eff = 1-eff/765;
    var eat = Math.floor(50*eff);
     if (eat < game.config.eatlimit) {
       this.move();
      return null;
     }
    this.energy += eat;
    f.size -= eat;
    if (f.size <= 0) {
      game.plants[f.x][f.y] = null;
      game.plantsAlive--;
    }
  }
  if (this.energy > 2000) {  // breed
    var na = new Animal(this.x, this.y, this.color.mutate(game.config.animalMutation));
    this.energy = 0;
    game.animals.push(na);
  }
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

function copyCfg(cfg) {
  return JSON.parse(JSON.stringify(cfg));   // weird way to copy object
}

game = new Game(cfg);
game.start();
