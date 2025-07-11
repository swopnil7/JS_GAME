console.log("JS loaded");

class Rect {
  constructor(x, y, width, height) {
    this.x = x; this.y = y;
    this.width = width; this.height = height;
  }
  left() { return this.x; }
  right() { return this.x + this.width; }
  top() { return this.y; }
  bottom() { return this.y + this.height; }
  
  get centerX() {
  return this.x + (this.width / 2);
  }
  get centerY() {
  return this.y + (this.height / 2);
  }
  get center() {
  return [this.centerX, this.centerY];
  }
  
  collideRect(other) {
    return (
      this.x < other.x + other.width &&
      this.x + this.width > other.x &&
      this.y < other.y + other.height &&
      this.y + this.height > other.y
    );
  }
  
  collidePoint(point) {
    return (
      (point[0] > this.x && point[0] < (this.x + this.width)) &&
      (point[1] > this.y && point[1] < (this.y + this.height))
    )
  }
}

function drawPolygon(ctx, points, fill = true, stroke = true, fColor = 'white', sColor="black") {
  if (points.length < 2) return;
  
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fColor;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = sColor;
    ctx.stroke();
  }
}

// --------------------- UTILS -----------------------
const BASE_IMG_PATH = "data/images/";
function loadImg(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const processed = applyColorKey(img, { r: 0, g: 0, b: 0 });
      resolve(processed);
      img.onerror = () => {
      console.error("Failed to load image:", BASE_IMG_PATH + path);
      reject("Image load error: " + BASE_IMG_PATH + path);
    };
    };
    img.src = BASE_IMG_PATH + path;
  });
}
async function loadImages(path, len) {
  const imgs = [];
  for (let i = 0; i <= len; i++) {
    if(len > 9)
    {
      const num = i.toString().padStart(2, '0');
      const img = await loadImg(`${path}/${num}.png`);
      imgs.push(img);
    }
    else{
      const num = i;
      const img = await loadImg(`${path}/${num}.png`);
      imgs.push(img);
    }
  }
  return imgs;
}
function applyColorKey(img, colorKey) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    if (
      data[i] === colorKey.r &&
      data[i + 1] === colorKey.g &&
      data[i + 2] === colorKey.b
    ) {
      data[i + 3] = 0; // Make pixel transparent
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}
//flip image 
function flipImage(image, flipX = false, flipY = false) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  
  ctx.save();
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  
  ctx.drawImage(
    image,
    flipX ? -image.width : 0,
    flipY ? -image.height : 0,
    image.width,
    image.height
  );
  
  ctx.restore();
  return canvas;
}

async function cutImages(path, count) {
  const img = await loadImg(path);
  const imgs = [];
  const frameWidth = Math.floor(img.width / count);
  
  for (let i = 0; i < count; i++) {
    const canvas = document.createElement("canvas");
    canvas.width = frameWidth;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    
    const sx = i * frameWidth;
    
    ctx.drawImage(
      img,
      sx, 0,
      frameWidth, img.height,
      0, 0,
      frameWidth, img.height
    );
    
    imgs.push(canvas);
  }
  
  return imgs;
}


function playSound(buffer, audioCtx) {
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start();
}
async function loadSound(url, audioCtx) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioCtx.decodeAudioData(arrayBuffer);
}


//-----------------ANIMATION----------
class Animation{
  constructor(images, imgDur=5, loop=true) {
    this.images = images;
    this.imgDur = imgDur;
    this.loop = loop;
    this.done = false;
    this.frame = 0;
  }
  
  copy()
  {
    return new Animation(this.images, this.imgDur, this.loop);
  }
  
  update()
  {
    if(this.loop)
    {
      this.frame = (this.frame + 1) % (this.imgDur * this.images.length);
    } else {
      this.frame = Math.min(this.frame + 1, this.imgDur * this.images.length - 1);
      if(this.frame >= this.imgDur * this.images.length -1)
      {
        this.done = true;
      }
    }
  }
  img()
  {
    return this.images[Math.floor(this.frame / this.imgDur)];
  }
}

//---------------Particles.js-----------
class Particle {
  constructor(game, pType, pos, velocity=[0, 0], frame=0) {
    this.game = game;
    this.pType = pType;
    this.pos = [...pos];
    this.velocity = [...velocity];
    this.animation = this.game.assets['particle' + this.pType].copy();
    this.animation.frame = frame;
  }
  
  update()
  {
    let kill = false;
    if(this.animation.done){kill=true;}
    
    this.pos[0] += this.velocity[0];
    this.pos[1] += this.velocity[1];
    
    this.animation.update();
    return kill;
  }
  
  render(surf, offset=[0, 0])
  {
    const img = this.animation.img();
    surf.drawImage(img,
    this.pos[0] - offset[0] - Math.floor(img.width / 2),
    this.pos[1] - offset[1] - Math.floor(img.height / 2),
      img.width * 2,
      img.height * 2
    );
  }
}

//-------------Sparks.js--------------
class Spark{
  constructor (pos, angle, speed, fColor = "white", sColor = "black") {
    this.pos = [...pos];
    this.angle = angle;
    this.speed = speed;
    this.fColor = fColor;
    this.sColor = sColor;
  }
  
  update() {
    this.pos[0] += Math.cos(this.angle) * this.speed;
    this.pos[1] += Math.sin(this.angle) * this.speed;
    
    this.speed = Math.max(0, this.speed - 0.1);
    return !this.speed;
  }
  
  render(surf, offset=[0, 0]) {
    //making a pointy fiamond spark
    let renderPoints = [
      [this.pos[0] + Math.cos(this.angle) * this.speed * 6 - offset[0], this.pos[1] + Math.sin(this.angle) * this.speed * 6 - offset[1]],
      
      [this.pos[0] + Math.cos(this.angle + Math.PI * 0.5) * this.speed * 0.5 - offset[0], this.pos[1] + Math.sin(this.angle + Math.PI * 0.5) * this.speed * 0.5 - offset[1]],
      [this.pos[0] + Math.cos(this.angle + Math.PI) * this.speed * 6 - offset[0], this.pos[1] + Math.sin(this.angle + Math.PI) * this.speed * 6 - offset[1]],
      
      [this.pos[0] + Math.cos(this.angle - Math.PI * 0.5) * this.speed * 0.5 - offset[0], this.pos[1] + Math.sin(this.angle - Math.PI * 0.5) * this.speed * 0.5 - offset[1]],
    ];
    
    drawPolygon(surf, renderPoints, true, true, this.fColor, this.sColor);
  }
  
}

//--------------Clouds.js--------------
class Cloud {
  constructor(pos, img, speed, depth) {
    this.pos = [...pos];
    this.img = img;
    this.speed = speed;
    this.depth = depth;
  }
  
  update() {
    this.pos[0] += this.speed;
  }
  
  render(surf, offset = [0, 0]) {
    let renderX = this.pos[0] - offset[0] * this.depth;
    let renderY = this.pos[1] - offset[1] * this.depth;
    
    surf.drawImage(
      this.img,
      (renderX % (surf.canvas.width + this.img.width)) - this.img.width,
      (renderY % (surf.canvas.height + this.img.height)) - this.img.height
    );
  }
}

class Clouds {
  constructor(cloudImgs, count = 16) {
    this.clouds = [];
    
    for (let i = 0; i < count; i++) {
      const img = cloudImgs[Math.floor(Math.random() * cloudImgs.length)];
      const speed = Math.random() * 0.05 + 0.08;
      const depth = Math.random() * 0.7 + 0.2;
      const x = Math.random() * 99999;
      const y = Math.random() * 99999;
      this.clouds.push(new Cloud([x, y], img, speed, depth));
    }
    
    this.clouds.sort((a, b) => a.depth - b.depth); // closest clouds drawn last
  }
  
  update() {
    for (let cloud of this.clouds) {
      cloud.update();
    }
  }
  
  render(surf, offset = [0, 0]) {
    for (let cloud of this.clouds) {
      cloud.render(surf, offset);
    }
  }
}

// --------------------- TILEMAP -----------------------
//const NEIGHBOUR_OFFSETS = [[-1,0],[-1,-1],[0,-1],[0,0],[1,0],[0,1],[1,1],[-1,1],[1,-1]];

//Caching Offset to avoid regeneration of same Neighbour Offsets
const OffsetCache = {};

function generateNeighbourOffsets(entitySize, tileSize) {
  const key = entitySize.join(",") + "|" + tileSize;
  if (OffsetCache[key]) return OffsetCache[key];
  //Example Key : "34,34|32"
  
  const checkTileX = Math.ceil(entitySize[0] / tileSize);
  const checkTileY = Math.ceil(entitySize[1] / tileSize);
  const offsets = [];
  
  for (let i = -checkTileX; i <= checkTileX; i++) {
    for (let j = -checkTileY; j <= checkTileY; j++) {
      offsets.push([i, j]);
    }
  }
  
  OffsetCache[key] = offsets;
  return offsets;
}

const PHYSICS_TILES = new Set(['grass', 'stone']);


class Tilemap {
  constructor(game, tileSize = 16) {
    this.game = game;
    this.tileSize = tileSize;
    this.offGridScale = this.tileSize / this.game.assets["stone"][0].width;
    this.tilemap = {};
    this.offGridTiles = [];
    /*
    for (let i = 0; i < 10; i++) {
      this.tilemap[`8;${1+i}`] = { type: 'stone', variant: 1, pos: [8, 1+i] };
      this.tilemap[`${2+i};8`] = { type: 'grass', variant: 1, pos: [2+i, 8] };
    }*/
  }
  async load(path) 
  {
    const res = await fetch(path);
    const data = await res.json();
  
    this.tilemap = data.tilemap;
    this.offGridTiles = data.offgrid || [];
    //this.tileSize = data.tile_size || 16;
  }
  
  solidCheck(pos)
  {
    const tileLoc = `${Math.floor(pos[0] / this.tileSize)};${Math.floor(pos[1] / this.tileSize)}`;
  
    if (tileLoc in this.tilemap) {
    const tile = this.tilemap[tileLoc];
      if (PHYSICS_TILES.has(tile.type)) {
          return tile;
        }
    }
    return null;
  }
  
  extract(idPair, keep = false) {
  const matches = [];
  
  this.offGridTiles = this.offGridTiles.filter(tile => {
  if (idPair.some(pair => pair[0] === tile.type && pair[1] === tile.variant)) {
    matches.push({ ...tile, pos: [tile.pos[0] * 2, tile.pos[1] * 2] });
    return keep; // keep = false → remove it
  }
  return true; // keep tiles that don't match
});
  
  for (let loc in this.tilemap) {
    const tile = this.tilemap[loc];
    if (idPair.some(pair => pair[0] === tile.type && pair[1] === tile.variant)) {
      const copiedTile = { ...tile, pos: [...tile.pos] };
      copiedTile.pos[0] *= this.tileSize;
      copiedTile.pos[1] *= this.tileSize;
      matches.push(copiedTile);
      
      if (!keep) {
        delete this.tilemap[loc];
      }
    }
  }
  
  return matches;
}
  
  tilesAround(pos, nOffsets) {
    //Corrected tileLoc coordinate flip
    let tileLoc = [Math.floor(pos[0] / this.tileSize), Math.floor(pos[1] / this.tileSize)];
    let tilesAround = [];
    for (let offset of nOffsets) {
      let key = `${tileLoc[0] + offset[0]};${tileLoc[1] + offset[1]}`;
      if (this.tilemap[key])
      {
        tilesAround.push(this.tilemap[key]);}
      }
    return tilesAround;
  }
  physicsRectsAround(pos, nOffsets) {
    return this.tilesAround(pos, nOffsets).filter(t => PHYSICS_TILES.has(t.type))
      .map(t => new Rect(t.pos[0]*this.tileSize, t.pos[1]*this.tileSize, this.tileSize, this.tileSize));
  }
  
  render(surf, offset = [0, 0]) {
    
    
  
for (let tile of this.offGridTiles) {
  const x = tile.pos[0] * this.offGridScale - offset[0];
  const y = tile.pos[1] * this.offGridScale - offset[1];
  
  const assetGroup = this.game.assets[tile.type];
  if (!assetGroup) {
    console.warn("Missing asset group for type:", tile.type);
    continue;
  }
  
  const img = assetGroup[tile.variant];
  if (!img) {
    console.warn("Missing image variant:", tile.variant, "for type:", tile.type);
    continue;
  }
  
  surf.drawImage(img, x, y, img.width*this.offGridScale, img.height*this.offGridScale);
}
  
  // render visible on-grid tiles
  const xStart = Math.floor(offset[0] / this.tileSize);
  const xEnd = Math.floor((offset[0] + surf.canvas.width) / this.tileSize);
  const yStart = Math.floor(offset[1] / this.tileSize);
  const yEnd = Math.floor((offset[1] + surf.canvas.height) / this.tileSize);
  let drawCount = 0;
  for (let x = xStart; x <= xEnd; x++) {
    for (let y = yStart; y <= yEnd; y++) {
      const loc = `${x};${y}`;
      if (loc in this.tilemap) {
        
        drawCount++;
        const tile = this.tilemap[loc];
        surf.drawImage(
          this.game.assets[tile.type][tile.variant],
          tile.pos[0] * this.tileSize - offset[0],
          tile.pos[1] * this.tileSize - offset[1],
          this.tileSize,
          this.tileSize
        );
      }
    }
  }
  //console.log('Tiles drawn ', drawCount);
}
}

// --------------------- PHYSICS ENTITY -----------------------
class PhysicsEntity {
  constructor(game, eType, pos, size) {
    this.game = game;
    this.eType = eType;
    this.pos = [...pos];
    this.size = [...size];
    this.velocity = [0, 0];
    this.xSpeed = 1;
    this.grounded = false;
    this.lastMovement = [0, 0];
    this.collisions = {'up': false, 'down': false, 'left': false, 'right': false};
    this.NEIGHBOUR_OFFSETS = generateNeighbourOffsets(this.size, this.game.tilemap.tileSize);
    console.log("Offset count:", this.NEIGHBOUR_OFFSETS.length);
    this.action = '';
    this.animOffset = [0, 0];
    this.sizeOffset = [0, 0];
    this.flip = false;
    this.setAction('idle');
  }
  rect() {
    return new Rect(this.pos[0], this.pos[1], ...this.size);
  }
  
  setAction(action)
  {
    if(action != this.action)
    {
      this.action = action;
      this.animation = this.game.assets[this.eType + action].copy();
    }
  }
  
  update(tilemap, movement = [0, 0]) {
    this.collisions = {'up': false, 'down': false, 'left': false, 'right': false};
  this.grounded = false;
  
  //To check which rect is colliding
  //this.collidingTileRect = null;
  
  const frameMovementX = (movement[0] * this.xSpeed) + this.velocity[0];
  const frameMovementY = movement[1] + this.velocity[1];
  
  // ----- Horizontal movement -----
  this.pos[0] += frameMovementX;
  let rectX = this.rect();
  for (let rect of tilemap.physicsRectsAround(this.pos, this.NEIGHBOUR_OFFSETS)) {
    if (rectX.collideRect(rect)) {
      if (frameMovementX > 0) {
        this.pos[0] = rect.left() - this.size[0];
        this.collisions.right = true;
      } else if (frameMovementX < 0) {
        this.pos[0] = rect.right();
        this.collisions.left = true;
      }
      break; // only resolve first horizontal collision
    }
  }
  
  // ----- Vertical movement -----
  this.pos[1] += frameMovementY;
  let rectY = this.rect();
  for (let rect of tilemap.physicsRectsAround(this.pos, this.NEIGHBOUR_OFFSETS)) {
    if (rectY.collideRect(rect)) {
      if (frameMovementY > 0) {
        this.pos[1] = rect.top() - this.size[1];
        this.collisions.down = true;
        this.grounded = true;
      } else if (frameMovementY < 0) {
        this.pos[1] = rect.bottom();
        this.collisions.up = true;
      }
      this.collidingTileRect = rect;
      
      break; // only resolve first vertical collision
    }
  }
  
  if(movement[0] > 0)
  {
    this.flip = false;
  }
  if(movement[0] < 0)
  {
    this.flip = true;
  }
  this.lastMovement = movement;
  // ----- Gravity -----
  if (!this.grounded) {
    this.velocity[1] = Math.min(7, this.velocity[1] + 0.125);
  }
  //resetting momentum of player.
  if(this.collisions.down || this.collisions.up) {
    this.velocity[1] = 0;
  }
  
  this.animation.update();

}
    render(surf, offset = [0, 0]) {
    surf.drawImage(flipImage(this.animation.img(), this.flip, false), this.pos[0] - offset[0] + this.animOffset[0], this.pos[1] - offset[1] + this.animOffset[1], this.size[0] + this.sizeOffset[0], this.size[1] + this.sizeOffset[1]);
    //surf.drawImage(this.game.assets['player'], this.pos[0] - offset[0], this.pos[1] - offset[1], ...this.size);
    
    
    //const centerPos = [this.pos[0] + this.size[0] / 2, this.pos[1] + this.size[1] / 2];
    /*for (let r of this.game.tilemap.physicsRectsAround(centerPos)) {
      surf.strokeStyle = 'red';
      surf.lineWidth = 1;
      surf.strokeRect(r.x, r.y, r.width, r.height);
    }*/
    
    
    //Physics Entity Degugbox
    /*
    let entityRect = this.rect();
    surf.strokeStyle = 'blue';
    surf.strokeRect(this.pos[0] - offset[0], this.pos[1] - offset[1], entityRect.width, entityRect.height);*/
    
    
    
    /*
    
    //colliding Box debug code
    if (this.collidingTileRect) {
  surf.fillStyle = 'rgba(255, 0, 0, 0.4)'; // red with transparency
  surf.fillRect(
    this.collidingTileRect.x,
    this.collidingTileRect.y,
    this.collidingTileRect.width,
    this.collidingTileRect.height
    );
    }*/
  }

}

class Enemy extends PhysicsEntity {
  constructor (game, pos, size) {
    super(game, "enemy", pos, size);
    
    this.walking = 0;
    this.animOffset = [-3, -5];
    this.sizeOffset = [6, 6];
    this.xSpeed = 2;
    
  }
  
  update(tilemap, movement = [0, 0]) 
  {
    const feetY = this.pos[1] + this.size[1] + 1;
    const frontX = this.flip
    ? this.pos[0] - 2       // slightly ahead to the left
    : this.pos[0] + this.size[0] + 2; // slightly ahead to the right

    const groundCheckPos = [frontX, feetY];
    const groundTile = tilemap.solidCheck(groundCheckPos);

    if (this.walking > 0) {
    // Flip if there's wall ahead
      if(this.collisions.left || this.collisions.right)
      {
        this.flip = !this.flip;
      }
      if (!groundTile) {
      this.flip = !this.flip;
      }

    // Walk in direction
      movement = [this.flip ? -0.5 : 0.5, 0];
      this.walking = Math.max(0, this.walking - 1);
      if(!this.walking)
      {
        let disBtwn = [this.game.player.pos[0] - this.pos[0], this.game.player.pos[1] - this.pos[1]];
        if(Math.abs(disBtwn[1]) < 32)
        {
          if(this.flip && disBtwn[0] < 0)
          {
            this.game.projectiles.push([[this.rect().centerX - 14, this.rect().centerY], -5, 0]);
            this.game.sfx.shoot.play();
            for(let i=0; i<4; i++) {
              this.game.sparks.push(new Spark(
                [this.rect().centerX - 14, this.rect().centerY],
                Math.random() - 0.5 + Math.PI,
                3 + Math.random(),"#FFD700","#FF4500"
              ));
            }
          }
          if(!this.flip && disBtwn[0] > 0)
          {
            this.game.projectiles.push([[this.rect().centerX + 13, this.rect().centerY], 5, 0]);
            this.game.sfx.shoot.play();
            for (let i = 0; i < 4; i++) {
              this.game.sparks.push(new Spark(
                [this.rect().centerX + 13, this.rect().centerY],
                Math.random() - 0.5,
                3 + Math.random(),"#FFD700","#FF4500"
                ));
            }
          }
        }
      }
    } else if (Math.random() < 0.01) {
    this.walking = Math.floor(Math.random() * (120 - 30 + 1)) + 30;
    }
    super.update(tilemap, movement);
  
    if(movement[0] != 0)
    {
      this.setAction("run");
    } else {
      this.setAction("idle");
    }
    
    //Killing Enemy
    if(Math.abs(this.game.player.dashing) >= 50) {
      if(this.rect().collideRect(this.game.player.rect())) {
        this.game.screenShake = Math.max(20, this.game.screenShake);
        for (let i = 0; i < 30; i++) {
          let angle = Math.random() * Math.PI * 2;
          let speed = Math.random() * 5;
          this.game.sparks.push(new Spark(
          this.rect().center,
          angle,
          4 + Math.random()
          ));
          this.game.particles.push(new Particle(
            this.game, "dash",
            this.rect().center,
            [Math.cos(angle + Math.PI) * speed * 0.5, Math.sin(angle + Math.PI) * speed * 0.5],
            Math.floor(Math.random() * 8)
            ));
        }
        this.game.sparks.push(new Spark(
          this.rect().center,
          0,
          7 + Math.random()
        ));
        this.game.sparks.push(new Spark(
          this.rect().center,
          Math.PI,
          7 + Math.random()
        ));
      return true; }
      else {
        return false;
      }
    }
    
  }
  
  render(surf, offset = [0, 0])
  {
    super.render(surf, offset);
    const gunImg = flipImage(this.game.assets.gun, this.flip, false);
    if(this.flip)
    {
      surf.drawImage(gunImg, 
        ((this.rect().centerX - 10 - gunImg.width) - offset[0]), 
        (this.rect().centerY  - offset[1]),
        gunImg.width * 2,
        gunImg.height * 2
      );
    } else {
      surf.drawImage(
        gunImg,
        ((this.rect().centerX + 10 - gunImg.width) - offset[0]),
        (this.rect().centerY - offset[1]),
        gunImg.width * 2,
        gunImg.height * 2
      );
    }
  }

}

class Executioner extends PhysicsEntity {
  constructor(game, pos, size) {
    super(game, "executioner", pos, size);
    this.animOffset = [-100, -102];
    this.sizeOffset = [200, 150];
    this.xSpeed = 0.8;
    this.walkShake = 0;
    this.attacking = 0;
    this.dealtDamage = false;
    this.currentAttackIndex = 0;
    this.comboTimer = 60;
    this.hurtTimer = 30;
    this.attacks = [
    { action: "attack1", duration: 110, hitboxDur: [80, 90], hitboxSize: [27, 40] },
    { action: "attack2", duration: 90, hitboxDur: [30, 40], hitboxSize: [27, 40] },
    ];
  }
    attack() {
    if (this.attacking) return;
  
    // Reset combo if time ran out
    if (this.comboTimer <= 0) this.currentAttackIndex = 0;
  
    // Set current attack
    const attackData = this.attacks[this.currentAttackIndex];
    this.attacking = attackData.duration;
    this.currentAnim = attackData.action;
    this.frameCounter = 0; //Resetting frame at start of each attack
    this.setAction(this.currentAnim);
  
    // Move to next attack in combo
    this.currentAttackIndex = (this.currentAttackIndex + 1) % this.attacks.length;
    // Reset combo timer
    this.comboTimer = 60;
  }
  
  getHitbox() {
    let index = null;
    if(this.action == "attack2") {
      index = 1;
    } else {
      index = Math.max(this.currentAttackIndex - 1, 0);
    }
    const hSize = [
      this.attacks[index].hitboxSize[0],
      this.attacks[index].hitboxSize[1]
    ];
    const hPos = [0, this.rect().centerY - hSize[1] / 2];
    if(this.flip) {
      hPos[0] = this.rect().left() - hSize[0];
    } else{
      hPos[0] = this.rect().right();
    }
    const rect = new Rect(hPos[0], hPos[1], hSize[0], hSize[1]);
    return rect;
  }

  update(tilemap, movement=[0, 0]) {
    super.update(tilemap, movement);
    if(this.attacking) this.attacking -= 1;
    if(this.comboTimer) this.comboTimer -= 1;
    if(this.hurtTimer) this.hurtTimer -= 1;
    if(movement[0] != 0) this.flip = !this.flip;
    if(this.pos[0] < this.game.player.pos[0] && this.flip) {
    this.attack();
    }
    
    if (this.hurtTimer) {
      this.setAction("hurt");
      this.walkShake = 0;
    } else if(movement[0]!=0) {
        this.setAction("walk");
        this.walkShake += 1;
      if(this.walkShake == 37) {
        this.walkShake = 0;
        this.game.screenShake = Math.max(12, this.game.screenShake);
      }
    }else {
      this.setAction("idle");
      this.walkShake = 0;
    }
  }
  
  render(surf, offset=[0, 0]) {
    super.render(surf, offset);
  }
}

class Player extends PhysicsEntity {
  constructor(game, pos, size) {
    super(game, "player", pos, size);
    this.airTime = 0;
    this.animOffset = [-48, -67];
    this.sizeOffset = [95, 80];
    this.jumps = 2;
    this.wallSlide = false;
    this.dashing = 0;
    this.xSpeed = 2.5;
    this.invincible = 0;
    this.attacking = 0;
    this.frameCounter = 0;
    this.currentAttackIndex = 0;
    this.currentAnim = null;
    this.attacks = [
    { action: "attack1", duration: 35 , hitboxDur: [18, 24], hitboxSize: [27,40]},
    { action: "attack2", duration: 35 ,hitboxDur: [18, 24], hitboxSize: [27,40]},
    { action: "attack3", duration: 40 ,hitboxDur: [18, 24], hitboxSize: [33,60]}
    ];
    this.comboTimer = 60;
    this.atkHitbox = null;
  }
  attack() {
    if (this.attacking) return;
  
    // Reset combo if time ran out
    if (this.comboTimer <= 0) this.currentAttackIndex = 0;
  
    // Set current attack
    const attackData = this.attacks[this.currentAttackIndex];
    this.attacking = attackData.duration;
    this.currentAnim = attackData.action;
    this.frameCounter = 0; //Resetting frame at start of each attack
    this.setAction(this.currentAnim);
  
    // Move to next attack in combo
    this.currentAttackIndex = (this.currentAttackIndex + 1) % this.attacks.length;
    // Reset combo timer
    this.comboTimer = 60;
  }
  
  getHitbox() {
    let index = null;
    if(this.action == "attack3") {
      index = 2;
    } else {
      index = Math.max(this.currentAttackIndex - 1, 0);
    }
    const hSize = [
      this.attacks[index].hitboxSize[0],
      this.attacks[index].hitboxSize[1]
    ];
    const hPos = [0, this.rect().centerY - hSize[1] / 2];
    if(this.flip) {
      hPos[0] = this.rect().left() - hSize[0];
    } else{
      hPos[0] = this.rect().right();
    }
    const rect = new Rect(hPos[0], hPos[1], hSize[0], hSize[1]);
    return rect;
  }
  
  takeDamage() {
  if (this.invincible) return;
  
  this.game.screenShake = 20;
  this.invincible = 30; // frames of invincibility
  if(this.game.executioner.action == "attack1") {
    this.velocity[1] = -4;
    } else {
      this.velocity[1] = -3;
      this.velocity[0] = this.game.executioner.flip ? 5 : -5;
    }
}
  
  update(tilemap, movement=[0, 0])
  {
    if(this.attacking) movement = [movement[0] * 0.5, 0];
    super.update(tilemap, movement);
    //Resetting counters
    this.atkHitbox = null;
    if (this.invincible) this.invincible--;
    if(this.attacking) this.attacking -= 1;
    if(this.comboTimer) {
      this.comboTimer = Math.max(0, this.comboTimer - 1);
      if(this.comboTimer === 0) {
        this.currentAttackIndex = 0;
      }
    }
    this.frameCounter += 1;
    this.airTime += 1;
    
    if(this.collisions.down)
    {
      this.airTime = 0;
      this.jumps = 2;
    }
    
    if(this.airTime > 240)
    {
      this.game.dead = 1;
    }
    this.wallSlide = false;
    
    //Animation Logic
    
    
    if((this.collisions.right || this.collisions.left) && this.airTime > 4 && !this.grounded)
    {
      this.wallSlide = true;
      this.velocity[1] = Math.min(this.velocity[1], 0.5);
      this.airTime = 5;
      if(this.collisions.right)
      {
        this.flip = false;
      } else {
        this.flip = true;
      }
      this.setAction('wallSlide');
    }
    
    if (Math.abs(this.dashing) > 50) {
      if (this.action !== "dash") {
        this.setAction("dash");
      }
    }else if (this.attacking) {
      if(this.frameCounter >= this.attacks[Math.max(this.currentAttackIndex -1 , 0)].hitboxDur[0] && this.frameCounter <= this.attacks[Math.max(this.currentAttackIndex -1 , 0)].hitboxDur[1]) {
        this.atkHitbox = this.getHitbox();
        if(this.atkHitbox.collideRect(this.game.executioner.rect())) {
          if(!this.game.executioner.hurtTimer) {
            this.game.executioner.hurtTimer = 30;
          }
        }
      }
      this.setAction(this.currentAnim);
    } else if(!this.wallSlide)
    {
      if (this.airTime > 4)
      {
        this.setAction("jump");
      } else if (movement[0] != 0) {
        this.setAction("run");
      } else {
      this.setAction("idle");
      }
    }
    //to make dash particle spawn at player
    let pPos = [
      this.rect().centerX + (this.flip? -7:7), this.rect().centerY
    ];
    
    if ([60, 50].includes(Math.abs(this.dashing)))
    {
      for (let i = 0; i < 20; i++)
      {   
        //For burst of particles at startand end of dashing
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 0.5 + 0.5;
        let pVelocity = [Math.cos(angle) * speed, Math.sin(angle) * speed];
        this.game.particles.push(new Particle(this.game, 'dash', pPos, pVelocity, Math.floor(Math.random() * 8)));
      }
    }
    
    if(this.dashing > 0)
    {
      this.dashing = Math.max(0, this.dashing - 1);
    }else if(this.dashing < 0)
    {
      this.dashing = Math.min(0, this.dashing + 1);
    }
    if(Math.abs(this.dashing) > 50)
    {
      this.velocity[0] = Math.sign(this.dashing) * 10;
      if(Math.abs(this.dashing) == 51)
        this.velocity[0] *= 0.3;
      if (Math.abs(this.dashing) >= 51 && Math.abs(this.dashing) <= 65)
      {
        const pVelocity = [Math.sign(this.dashing) * 3, 0];
        this.game.particles.push(new Particle(this.game, 'dash', pPos, pVelocity, Math.floor(Math.random() * 8)));
      }
    }
    
    if(this.velocity[0] > 0)
    {
      this.velocity[0] = Math.max(this.velocity[0] - 0.1, 0);
    } else
    {
      this.velocity[0] = Math.min(this.velocity[0] + 0.1, 0);
    }
    
  }
  
  render(surf, offset = [0, 0]) {
    super.render(surf, offset);
    if(this.atkHitbox){
      surf.fillStyle = "green";
      surf.fillRect(this.atkHitbox.x - offset[0], this.atkHitbox.y - offset[1], this.atkHitbox.width, this.atkHitbox.height);
    }
  }
  
  jump()
  {
    if(this.wallSlide)
    {
      if(this.flip && this.lastMovement[0] < 0)
      {
        this.velocity[0] = 4;
        this.velocity[1] = -3.5;
        this.jumps = Math.max(0, this.jumps-1);
        return true;
      } else if(!this.flip && this.lastMovement[0] > 0)
      {
        this.velocity[0] = -4;
        this.velocity[1] = -3.5;
        this.jumps = Math.max(0, this.jumps - 1);
        return true;
      }
    }
    else if(this.jumps)
    {
      this.velocity[1] = -4.5;
      this.jumps -= 1;
      this.airTime = 5;
      return true;
    }
  }
  
  dash()
  {
    if(!this.dashing)
    {
      if(this.flip)
      {
        this.dashing = -65;
      } else {
        this.dashing = 65;
      }
      /*const source = this.game.audioCtx.createBufferSource();
      source.buffer = this.game.sfx.dash;
      source.connect(this.game.audioCtx.destination);
      source.start(0);*/
      this.attacking = 0;
    }
  }
  
}

/*class Player2 extends Player {
  constructor(game, pos, size) {
    super(game, pos, size);
  }
}

*/
// --------------------- GAME -----------------------

class Game {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    this.virtualWidth = 360;
    this.virtualHeight = 640;
    this.virtualCanvas = document.createElement("canvas");
    this.virtualCanvas.width = this.virtualWidth;
    this.virtualCanvas.height = this.virtualHeight;
    this.vctx = this.virtualCanvas.getContext("2d");
    this.vctx.imageSmoothingEnabled = false;
    
    this.transitionSurf = document.createElement("canvas");
    this.transitionSurf.width = this.virtualWidth;
    this.transitionSurf.height = this.virtualHeight;
    this.tCtx = this.transitionSurf.getContext("2d");
    this.running = false;
    this.currentLevel = 3;

    this.movement = [false, false];
    
    this.screenShake = 0;
    
    this.lastTime = performance.now();
  }
  

  async assetLoadAll() {
    this.assets = {
      grass: await loadImages("tiles/grass", 8),
      stone: await loadImages("tiles/stone", 8),
      decor: await loadImages("tiles/decor", 3),
      large_decor: await loadImages("tiles/largeDecor", 2),
      player: await loadImg("entities/player.png"),
      background: await loadImg("background.png"),
      clouds: await loadImages("clouds", 1),
      enemyidle: new Animation(await loadImages("entities/enemy/idle", 15), 6),
      enemyrun: new Animation(await loadImages("entities/enemy/run", 7), 4),
      playeridle: new Animation(await cutImages("entities/player1/idle.png", 14), 6),
      playerrun: new Animation(await cutImages("entities/player1/run.png", 8), 7),
      playerjump: new Animation(await cutImages("entities/player1/jump.png", 3), 24),
      playerdash: new Animation(await cutImages("entities/player1/dash.png", 7), 4),
      playerattack1: new Animation(await cutImages("entities/player1/attack1.png", 5), 8),
      playerattack2: new Animation(await cutImages("entities/player1/attack2.png", 5), 8),
      playerattack3: new Animation(await cutImages("entities/player1/attack3.png", 5), 8),
      playerwallSlide: new Animation(await loadImages("entities/player/wall_slide", 0)),
      particleleaf: new Animation(await loadImages("particles/leaf", 17), 20, false),
      particledash: new Animation(await loadImages("particles/particle", 3), 6, false),
      spawners: await loadImages("tiles/spawners", 2),
      gun: await loadImg("gun.png"),
      projectile: await loadImg("projectile.png"),
      executioneridle: new Animation(await cutImages("entities/executioner/idle.png", 12), 8),
      executionerwalk: new Animation(await cutImages("entities/executioner/walk.png", 12), 7
      ),
      executionerattack1: new Animation(await cutImages("entities/executioner/attack1.png", 11), 10),
      executionerattack2: new Animation(await cutImages("entities/executioner/attack2.png", 9), 10),
      executionerhurt: new Animation(await cutImages("entities/executioner/hurt.png", 6), 5, false),
      executionerdeath: new Animation(await cutImages("entities/executioner/death.png", 11), 7),
    };
    
    /*this.audioCtx = new(window.AudioContext || window.webkitAudioContext)();*/
    
    this.sfx = {
      hit: new Audio("data/sfx/hit.wav"),
      bg: new Audio("data/sfx/ambience.wav"),
      shoot: new Audio("data/sfx/shoot.wav"),
    }
    /*
    this.sfx.bg.volume = 0.2;
    this.sfx.bg.loop = true;
    this.sfx.shoot.volume = 0.4;
    this.sfx.jump.volume = 0.7;
    this.sfx.hit.volume = 0.8;*/
    
    this.clouds = new Clouds(this.assets.clouds, 16);
    this.tilemap = new Tilemap(this, 32);
    this.player = new Player(this, [100, 50], [22, 46]);
    this.executioner = new Executioner(this, [100, 100], [64, 128]);
    await this.loadLevel(this.currentLevel);
    
    this.start();
    
  }
  
  async loadLevel(level)
  {
    await this.tilemap.load(`data/maps/${level}.json`);
    
    this.projectiles = [];
    
    this.particles = [];
    this.sparks = [];
    this.scroll = [0, 0];
    this.renderScroll = [0, 0];
    this.screenShake = 0;
    this.dead = 0;
    this.transition = -30;
    this.loadingLevel = false;
    
    this.leafSpawnners = [];
    for(let tree of this.tilemap.extract([["large_decor", 2]], true))
    {
      this.leafSpawnners.push(new Rect(tree.pos[0] + 4, tree.pos[1] + 4, 23, 13));
    }
    
    this.enemies = [];
    for (let spawner of this.tilemap.extract([["spawners", 0], ["spawners", 1],["spawners", 2]], false)) {
      // extract their positions
      if (spawner.variant == 0) {
        //console.log('player spawnner');
        this.player.pos = [...spawner.pos];
        this.player.airTime = 0;
      } else if(spawner.variant == 1){
        this.enemies.push(new Enemy(this, [...spawner.pos], [16, 32]));
      } else if(spawner.variant == 2){
        this.executioner.pos = [...spawner.pos];
      }
    }
    this.lastTime = performance.now();
  }

  start() {
    if(!this.running) {
      this.running = true;
      requestAnimationFrame(this.gameLoop.bind(this));
    }
  }

  gameLoop(currentTime) {
    
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    /*
    if(!this.enemies.length)
    {
      this.transition = Math.min(50, this.transition + 1);
      if(this.transition >= 30) {
        if(!this.loadingLevel) {
          this.loadingLevel = true;
          this.currentLevel = Math.min(2, this.currentLevel + 1);
          this.loadLevel(this.currentLevel);
        }
        
      }
    }*/
    if(this.transition < 0) {
      this.transition += 1;
    }
    
    // Dead transition timer and level reset
    if(this.dead) {
      this.dead += 1;
      if(this.dead >= 10)
      {
        this.transition = Math.min(30, this.transition + 1);
      }
      this.screenShake = Math.max(20, this.screenShake);
      if(this.dead > 40) {
        this.loadLevel(this.currentLevel);
      }
    }
    
    
    this.scroll[0] += ((this.player.pos[0] + this.player.size[0] / 2) - this.virtualWidth / 2 - this.scroll[0]) / 20;
    this.scroll[1] += ((this.player.pos[1] + this.player.size[1] / 2) - this.virtualHeight / 2 - this.scroll[1]) / 20;

    this.renderScroll = [Math.floor(this.scroll[0]), Math.floor(this.scroll[1])];

    this.update(deltaTime);
    this.render();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  update(dt) {
    
    this.screenShake = Math.max(0, this.screenShake - 1);
    
    this.clouds.update();
    
    //Projectile Update
    for (let i = this.projectiles.length - 1; i >= 0; i--) 
    {
      let projectile = this.projectiles[i];
      projectile[0][0] += projectile[1];
      projectile[2] += 1;
      
      //Remove Projectile Condition
      if (this.tilemap.solidCheck(projectile[0]))
      {
        this.projectiles.splice(i, 1);
        for(let i=0; i<4; i++) {
          this.sparks.push(new Spark(projectile[0],
          Math.random() - 0.5 + (projectile[1] > 0 ? Math.PI:0),
            3 + Math.random(),"#AAAAAA","#555555"
          ));
        }
      } else if (projectile[2] > 360)
      {
        this.projectiles.splice(i, 1);
      } else if (Math.abs(this.player.dashing) < 50)
      {
        if(this.player.rect().collidePoint(projectile[0]))
        {
          this.dead += 1;
          this.screenShake = Math.max(20, this.screenShake);
          this.projectiles.splice(i, 1);
          for(let i=0; i<30; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 5;
            this.sparks.push(new Spark(
              this.player.rect().center,
              angle,
              4 + Math.random(),"#8B0000","#B22222"
            ));
            this.particles.push(new Particle(
              this, "dash",
              this.player.rect().center,
              [Math.cos(angle + Math.PI) * speed * 0.5, Math.sin(angle + Math.PI) * speed * 0.5],
              Math.floor(Math.random() * 8)
            ));
          }
        }
      }
    }
    
    //Leaf Update
    for(let rect of this.leafSpawnners)
    {
      if(Math.random() * 49999 < rect.width * rect.height)
      {
        let pos = [rect.x + Math.random()* rect.width, rect.y + Math.random()*rect.height];
        this.particles.push(new Particle(this, 'leaf' ,pos, [-0.1, 0.3]));
      }
    }
    
    //Enemy Update
    for(let i = this.enemies.length - 1; i>=0; i--)
    {
      const kill = this.enemies[i].update(this.tilemap, [0, 0]);
      if(kill) {
        this.enemies.splice(i, 1);
      }
    }
    //Sparks Update
    for(let i = this.sparks.length - 1; i>=0; i--) {
      const kill = this.sparks[i].update();
      if(kill) {
        this.sparks.splice(i, 1);
      }
      
    }
    
    //Particle Update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const kill = this.particles[i].update();
      if (this.particles[i].pType == 'leaf')
        {
          this.particles[i].pos[0] += Math.sin(this.particles[i].animation.frame * 0.035) * 0.3;
        }
        if (kill) {
        this.particles.splice(i, 1);
        }
    }
    
    //Executioner Update
    this.executioner.update(this.tilemap, [this.movement[1] - this.movement[0], 0]);
    
    //Player Update
    if(!this.dead) {
      this.player.update(this.tilemap, [ this.movement[1] - this.movement[0], 0]);
    }
    
  }

  render() {
    this.vctx.drawImage(this.assets.background, 0, 0, this.virtualWidth, this.virtualHeight);
    
    this.clouds.render(this.vctx, this.renderScroll);
    
    this.tilemap.render(this.vctx, this.renderScroll);
    
    
    //Projectile Render
    for (let i = this.projectiles.length - 1; i >= 0; i--)
    {
      const p = this.projectiles[i];
      const img = this.assets.projectile;
      this.vctx.drawImage(img,
      p[0][0] - img.width / 2 - this.renderScroll[0],
      p[0][1] - img.height / 2 - this.renderScroll[1],
      img.width * 2,
      img.height * 2
      );
    }

    for (let enemy of [...this.enemies])
    {
      enemy.render(this.vctx, this.renderScroll);
    }
    
    //Executioner Render
    
    this.executioner.render(this.vctx, this.renderScroll);
    this.vctx.strokeStyle = "red";
    this.vctx.strokeRect(
    this.executioner.pos[0] - this.renderScroll[0],
    this.executioner.pos[1] - this.renderScroll[1],
    this.executioner.size[0],
    this.executioner.size[1]
    );
    
    
    //Player Render
    if(!this.dead) {
      this.player.render(this.vctx, this.renderScroll);
    }
    //player debug box
    this.vctx.strokeStyle = 'blue';
    this.vctx.strokeRect(this.player.pos[0]- this.renderScroll[0],this.player.pos[1] - this.renderScroll[1], ...this.player.size);
    
    //Sparks Render
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      this.sparks[i].render(this.vctx, this.renderScroll);
    }
    
    //Particle Render
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].render(this.vctx, this.renderScroll);
    }
    
    const scale = Math.max(1, Math.floor(Math.min(
      this.canvas.width / this.virtualWidth,
      this.canvas.height / this.virtualHeight
    )));
    const offsetX = (this.canvas.width - this.virtualWidth * scale) / 2;
    const offsetY = (this.canvas.height - this.virtualHeight * scale) / 2;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.transition) {
      this.tCtx.clearRect(0, 0, this.virtualWidth, this.virtualHeight);
      this.tCtx.fillStyle = "black";
      this.tCtx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
      const radius = Math.abs((30 - Math.abs(this.transition)) * 16);
      //Yesle aaba j sukai draw garyk teslai canvas bata cutout gardinxa Basicly pen is erazer
      this.tCtx.globalCompositeOperation = "destination-out";
      this.tCtx.beginPath();
      this.tCtx.arc(
      Math.floor(this.virtualWidth / 2),
      Math.floor(this.virtualHeight / 2),
      radius,
      0,
      Math.PI * 2
      );
      this.tCtx.fill();
      this.tCtx.globalCompositeOperation = "source-over"; // Basicly Removing erazer
      this.vctx.drawImage(this.transitionSurf, 0, 0);
    }
    
    let screenShakeOffset = [Math.random() * this.screenShake - this.screenShake / 2, Math.random() * this.screenShake - this.screenShake / 2];
    this.ctx.drawImage(
      this.virtualCanvas,
      Math.floor(offsetX) + screenShakeOffset[0],
      Math.floor(offsetY) + screenShakeOffset[1],
      Math.floor(this.virtualWidth * scale),
      Math.floor(this.virtualHeight * scale)
    );
  }
}

window.addEventListener("load", () => {
  (async () => {
    console.log("window loaded");
    const game = new Game("gameCanvas");
    await game.assetLoadAll();
    
    /*document.body.addEventListener("touchstart", () => {
      game.sfx.bg.loop = true;
      game.sfx.bg.volume = 0.5;
      game.sfx.bg.play();
      }, { once: true });*/
    document.getElementById("leftBtn").addEventListener("touchstart", () => {
      game.movement[0] = true;
    });
    document.getElementById("leftBtn").addEventListener("touchend", () => {
      game.movement[0] = false;
    });
    document.getElementById("rightBtn").addEventListener("touchstart", () => {
      game.movement[1] = true;
    });
    document.getElementById("rightBtn").addEventListener("touchend", () => {
      game.movement[1] = false;
    });
    document.getElementById("jumpBtn").addEventListener("touchstart", () => {
      game.player.jump();
    });
    document.getElementById("dashBtn").addEventListener("touchstart", () => {
      game.player.dash();
    });
    document.getElementById("attackBtn").addEventListener("touchstart", () => {
      game.player.attack();
    });
  })();
});