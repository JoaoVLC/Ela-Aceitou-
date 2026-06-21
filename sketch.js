const CANVAS_W = 960;
const CANVAS_H = 540;
const INTERACT_DISTANCE = 62;
const MAIN_THEME_VOLUME = 0.32;
const MOONWISHER_VOLUME = 0.34;
const MOONWISHER_DELAY = 1000;

let game;
const audioAssets = {
  mainTheme: null,
  moonwisherTheme: null,
};

function preload() {
  // Músicas são opcionais; carregar fora do preload evita travar sem MP3.
}

function setup() {
  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  canvas.parent("game-shell");
  pixelDensity(1);
  noSmooth();
  textFont("Courier New");
  game = new GameManager();
}

function draw() {
  game.update();
  game.draw();
}

function keyPressed() {
  if (game) {
    game.keyPressed(key, keyCode);
  }
  if ([UP_ARROW, DOWN_ARROW, LEFT_ARROW, RIGHT_ARROW].includes(keyCode)) {
    return false;
  }
  return true;
}

function mousePressed() {
  if (game) {
    game.mousePressed();
  }
  return false;
}

class Player {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.speed = 2.2;
    this.facing = 1;
  }

  setPosition(v) {
    this.pos.set(v.x, v.y);
    this.vel.set(0, 0);
  }

  update() {
    const move = createVector(0, 0);

    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) move.x -= 1;
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) move.x += 1;
    if (keyIsDown(UP_ARROW) || keyIsDown(87)) move.y -= 1;
    if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) move.y += 1;

    if (move.magSq() > 0) {
      move.normalize().mult(this.speed);
      this.vel.lerp(move, 0.72);
      if (abs(move.x) > 0.1) this.facing = move.x > 0 ? 1 : -1;
    } else {
      this.vel.mult(0.6);
    }

    this.pos.add(this.vel);
    this.pos.x = constrain(this.pos.x, 34, width - 34);
    this.pos.y = constrain(this.pos.y, 68, height - 50);
  }

  draw() {
    const x = round(this.pos.x);
    const y = round(this.pos.y);
    const step = sin(frameCount * 0.18) * 2;

    push();
    translate(x, y);
    scale(this.facing, 1);
    noStroke();

    rectMode(CENTER);
    drawPixelShadow(0, 26, 42, 12, 120);

    drawBiancaCurls();

    fill(74, 46, 61);
    rect(0, 8, 30, 30);
    fill(255, 196, 220);
    rect(0, 8, 24, 24);
    fill(241, 129, 171);
    rect(0, 20, 28, 10);
    fill(255, 227, 237, 120);
    rect(-5, 3, 10, 4);

    fill(49, 37, 50);
    rect(-18, 8, 8, 22);
    rect(18, 8, 8, 22);
    fill(239, 184, 156);
    rect(-17, 7, 6, 18);
    rect(17, 7, 6, 18);

    fill(40, 37, 61);
    rect(-7, 35 + step * 0.15, 10, 20);
    rect(7, 35 - step * 0.15, 10, 20);
    fill(255, 209, 221);
    rect(-7, 46 + step * 0.15, 12, 5);
    rect(7, 46 - step * 0.15, 12, 5);

    fill(239, 184, 156);
    rect(0, -14, 18, 18);
    rect(0, -2, 10, 8);
    fill(65, 38, 47);
    rect(-5, -15, 3, 3);
    fill(255, 238, 244);
    rect(5, -15, 3, 3);
    fill(219, 122, 136);
    rect(2, -8, 6, 2);
    pop();
  }
}

class MemoryPoint {
  constructor(config) {
    this.pos = config.pos;
    this.label = config.label;
    this.lines = config.lines;
    this.kind = config.kind || "memory";
    this.nextScene = Boolean(config.nextScene);
    this.openLetter = Boolean(config.openLetter);
    this.requiresAll = Boolean(config.requiresAll);
    this.visited = false;
    this.radius = config.radius || INTERACT_DISTANCE;
  }

  canUse(playerPos) {
    return p5.Vector.dist(this.pos, playerPos) <= this.radius;
  }

  interact(manager, scene) {
    if (this.requiresAll && !scene.memoriesComplete()) {
      manager.startDialogue(["Ainda existe uma memória brilhando por aqui."]);
      return;
    }

    manager.startDialogue(this.lines, () => {
      this.visited = true;
      if (this.nextScene) {
        manager.transitionToScene(manager.currentSceneIndex + 1);
      }
      if (this.openLetter) {
        manager.openLetter();
      }
    });
  }

  draw() {
    const pulse = sin(frameCount * 0.08) * 0.5 + 0.5;
    const glow = this.visited && !this.nextScene && !this.openLetter ? 50 : 150 + pulse * 80;
    const size = this.visited && !this.nextScene && !this.openLetter ? 14 : 18 + pulse * 5;

    push();
    translate(round(this.pos.x), round(this.pos.y));
    noStroke();

    rectMode(CENTER);
    fill(255, 206, 226, glow * 0.16);
    rect(0, 0, size + 54, size + 54);
    fill(255, 229, 157, glow * 0.28);
    rect(0, 0, size + 34, size + 34);
    fill(255, 245, 176, glow);
    rect(0, 0, size, size);
    fill(255, 255, 255, glow);
    rect(0, 0, max(5, size * 0.42), max(5, size * 0.42));
    fill(255, 255, 255, glow * 0.7);
    rect(-18, -12 + pulse * 4, 4, 4);
    rect(18, 9 - pulse * 4, 3, 3);

    if (this.kind === "joao") {
      drawJoaoSprite(0, 15);
    }

    if (this.kind === "letter") {
      drawEnvelope(0, 7, 1.15);
    }

    pop();
  }
}

class DialogueBox {
  constructor() {
    this.active = false;
    this.lines = [];
    this.index = 0;
    this.visibleChars = 0;
    this.lastTick = 0;
    this.onFinish = null;
  }

  start(lines, onFinish) {
    this.active = true;
    this.lines = lines;
    this.index = 0;
    this.visibleChars = 0;
    this.lastTick = millis();
    this.onFinish = onFinish || null;
  }

  update() {
    if (!this.active) return;
    const line = this.lines[this.index] || "";
    if (this.visibleChars < line.length && millis() - this.lastTick > 22) {
      this.visibleChars += 1;
      this.lastTick = millis();
    }
  }

  advance() {
    if (!this.active) return;
    const line = this.lines[this.index] || "";

    if (this.visibleChars < line.length) {
      this.visibleChars = line.length;
      return;
    }

    if (this.index < this.lines.length - 1) {
      this.index += 1;
      this.visibleChars = 0;
      this.lastTick = millis();
      return;
    }

    this.active = false;
    const done = this.onFinish;
    this.onFinish = null;
    if (done) done();
  }

  draw() {
    if (!this.active) return;

    const boxX = 44;
    const boxY = height - 158;
    const boxW = width - 88;
    const boxH = 122;
    const line = this.lines[this.index] || "";
    const shown = line.slice(0, this.visibleChars);

    push();
    rectMode(CORNER);
    noStroke();
    drawPixelShadow(boxX + boxW / 2, boxY + boxH / 2 + 8, boxW + 10, boxH + 8, 115);

    fill(11, 13, 24, 236);
    rect(boxX, boxY, boxW, boxH);
    fill(33, 36, 58, 245);
    rect(boxX + 8, boxY + 8, boxW - 16, boxH - 16);
    fill(255, 224, 235);
    rect(boxX, boxY, boxW, 4);
    rect(boxX, boxY + boxH - 4, boxW, 4);
    rect(boxX, boxY, 4, boxH);
    rect(boxX + boxW - 4, boxY, 4, boxH);
    fill(255, 189, 215, 170);
    rect(boxX + 16, boxY + 16, 58, 4);
    rect(boxX + boxW - 76, boxY + boxH - 20, 58, 4);

    fill(255, 248, 250);
    textAlign(LEFT, TOP);
    textSize(19);
    textLeading(28);
    text(shown, boxX + 32, boxY + 28, boxW - 64, boxH - 48);

    fill(255, 219, 119, 220);
    textAlign(RIGHT, BOTTOM);
    textSize(14);
    text("E / Enter", boxX + boxW - 24, boxY + boxH - 18);
    pop();
  }
}

class Scene {
  constructor(config) {
    this.title = config.title;
    this.subtitle = config.subtitle;
    this.kind = config.kind;
    this.start = config.start;
    this.points = config.points;
  }

  memoriesComplete() {
    return this.points
      .filter((point) => !point.nextScene && !point.openLetter)
      .every((point) => point.visited);
  }

  nearestPoint(playerPos) {
    let nearest = null;
    let nearestDistance = Infinity;

    this.points.forEach((point) => {
      const d = p5.Vector.dist(point.pos, playerPos);
      if (d < point.radius && d < nearestDistance) {
        nearest = point;
        nearestDistance = d;
      }
    });

    return nearest;
  }

  draw() {
    if (this.kind === "ti") drawTiRoom();
    if (this.kind === "igreja") drawChurch();
    if (this.kind === "cinema") drawCinema();
    if (this.kind === "jardim") drawGarden();

    this.points.forEach((point) => point.draw());
  }
}

class Button {
  constructor(x, y, w, h, label, onClick) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.label = label;
    this.onClick = onClick;
    this.visible = true;
    this.disabled = false;
  }

  contains(px, py) {
    return (
      this.visible &&
      !this.disabled &&
      px >= this.x &&
      px <= this.x + this.w &&
      py >= this.y &&
      py <= this.y + this.h
    );
  }

  draw(style = {}) {
    if (!this.visible) return;
    const hovered = this.contains(mouseX, mouseY);
    const bg = style.bg || color(255, 214, 230);
    const hoverBg = style.hoverBg || color(255, 236, 244);
    const ink = style.ink || color(64, 35, 52);

    push();
    rectMode(CORNER);
    noStroke();
    fill(hovered ? hoverBg : bg);
    rect(round(this.x), round(this.y), round(this.w), round(this.h));
    fill(110, 68, 92);
    rect(round(this.x), round(this.y + this.h - 6), round(this.w), 6);
    fill(255, 255, 255, hovered ? 90 : 45);
    rect(round(this.x + 6), round(this.y + 6), round(this.w - 12), 5);

    fill(ink);
    textAlign(CENTER, CENTER);
    textSize(style.textSize || 22);
    textStyle(BOLD);
    text(this.label, this.x + this.w / 2, this.y + this.h / 2 - 2);
    textStyle(NORMAL);
    pop();
  }

  click() {
    if (this.onClick) this.onClick();
  }
}

class GameManager {
  constructor() {
    this.state = "menu";
    this.player = new Player(120, 320);
    this.dialogueBox = new DialogueBox();
    this.currentSceneIndex = 0;
    this.scenes = this.createScenes();
    this.menuButton = new Button(width / 2 - 92, 360, 184, 54, "Iniciar", () => this.startGame());
    this.transition = {
      active: false,
      target: 0,
      started: 0,
      swapped: false,
    };
    this.letterLines = [
      "Bianca Hadassa de Paula...",
      "Quando entrei naquela sala da TI...",
      "eu não imaginava o quanto minha vida mudaria.",
      "Você transformou conversas simples em momentos especiais.",
      "Me fez rir.",
      "Me fez pensar.",
      "De todas as coincidências da minha vida, você é a mais bonita.",
      "E hoje existe apenas uma pergunta que eu quero fazer.",
    ];
    this.letterStarted = 0;
    this.letterIndex = 0;
    this.letterMode = "lines";
    this.letterPhraseStarted = 0;
    this.proposalStarted = 0;
    this.proposalSkipIntro = false;
    this.noAttempts = 0;
    this.noMessage = false;
    this.finalStarted = 0;
    this.petals = Array.from({ length: 38 }, () => ({
      x: random(width),
      y: random(-height, height),
      speed: random(0.35, 0.95),
      drift: random(0.5, 1.5),
      size: random([5, 7, 9]),
    }));
    this.currentMusic = null;
    this.currentMusicName = "";
    this.currentMusicVolume = 0;
    this.mainTheme = null;
    this.moonwisherTheme = null;
    this.musicFade = null;
    this.moonwisherPendingAt = 0;
    this.audioUnlocked = false;
    this.musicRequested = false;
    this.autoMusicAttempted = false;
    this.menuMusicStarted = false;
    this.makeProposalButtons();
    this.loadMusic();
  }

  createScenes() {
    return [
      new Scene({
        title: "Capítulo 1 - A Sala da TI",
        subtitle: "onde um dia comum mudou de cor",
        kind: "ti",
        start: createVector(116, 380),
        points: [
          new MemoryPoint({
            pos: createVector(214, 314),
            label: "Memória",
            lines: ["Era só mais um dia comum."],
          }),
          new MemoryPoint({
            pos: createVector(430, 256),
            label: "Memória",
            lines: ["Uma sala nova. Pessoas novas. Uma rotina nova."],
          }),
          new MemoryPoint({
            pos: createVector(650, 332),
            label: "Memória",
            lines: [
              "Mas naquele lugar, sem que eu soubesse, algo importante estava prestes a começar.",
            ],
          }),
          new MemoryPoint({
            pos: createVector(810, 300),
            label: "João",
            kind: "joao",
            requiresAll: true,
            nextScene: true,
            lines: ["19 de fevereiro de 2026.", "Foi aqui que tudo começou."],
          }),
        ],
      }),
      new Scene({
        title: "Capítulo 2 - A Igreja",
        subtitle: "silêncio, luz e caminhos",
        kind: "igreja",
        start: createVector(480, 440),
        points: [
          new MemoryPoint({
            pos: createVector(285, 354),
            label: "Memória",
            lines: ["Você me apresentou uma parte importante da sua vida."],
          }),
          new MemoryPoint({
            pos: createVector(480, 250),
            label: "Memória",
            lines: [
              "Talvez algumas coincidências sejam apenas a forma que Deus encontra de unir duas histórias.",
            ],
          }),
          new MemoryPoint({
            pos: createVector(680, 354),
            label: "Memória",
            lines: ["Talvez algumas histórias também sejam guiadas por algo maior."],
          }),
          new MemoryPoint({
            pos: createVector(480, 116),
            label: "Caminho",
            requiresAll: true,
            nextScene: true,
            lines: [
              "E olhando para a nossa trajetória, eu gosto de acreditar que Deus sempre soube onde ela iria começar.",
            ],
          }),
        ],
      }),
      new Scene({
        title: "Capítulo 3 - O Cinema",
        subtitle: "a primeira lembrança guardada",
        kind: "cinema",
        start: createVector(120, 410),
        points: [
          new MemoryPoint({
            pos: createVector(250, 338),
            label: "Pipoca",
            lines: ["E finalmente, o nosso primeiro date..."],
          }),
          new MemoryPoint({
            pos: createVector(412, 386),
            label: "Ingresso",
            lines: ["Um dos meus lugares favoritos..."],
          }),
          new MemoryPoint({
            pos: createVector(590, 240),
            label: "Tela",
            lines: [
              "Um lugar onde, na maior parte do tempo, eu sempre estive sozinho.",
              "Mas naquela noite eu tinha a sua companhia.",
            ],
          }),
          new MemoryPoint({
            pos: createVector(810, 392),
            label: "Saída",
            requiresAll: true,
            nextScene: true,
            lines: [
              "E aquela noite foi muito especial...",
              "Porque não era apenas um filme.",
              "Era a primeira lembrança que eu queria guardar com você.",
            ],
          }),
        ],
      }),
      new Scene({
        title: "Capítulo Final - O Pedido",
        subtitle: "um jardim para a pergunta",
        kind: "jardim",
        start: createVector(480, 118),
        points: [
          new MemoryPoint({
            pos: createVector(480, 424),
            label: "Carta",
            kind: "letter",
            openLetter: true,
            lines: ["Uma carta espera por você."],
          }),
        ],
      }),
    ];
  }

  makeProposalButtons() {
    this.yesButton = new Button(width / 2 - 170, 344, 160, 54, "Sim ❤️", () => this.acceptProposal());
    this.noButton = new Button(width / 2 + 28, 344, 116, 54, "Não", () => this.dodgeNoButton());
  }

  update() {
    this.updateMusicFade();

    if (this.state === "menu") {
      this.tryAutoplayMainTheme();
    }

    if (this.state === "playing") {
      this.player.update();
    }

    if (this.state === "dialogue") {
      this.dialogueBox.update();
    }

    if (this.state === "transition") {
      this.updateTransition();
    }

    if (this.state === "letter" && this.letterMode === "music-wait" && this.currentMusicName === "moonwisherTheme") {
      this.letterMode = "lines";
      this.letterPhraseStarted = millis();
    }

    if (this.state === "letter" && this.letterMode === "pause" && millis() - this.letterStarted > 950) {
      this.letterMode = "bianca";
      this.letterPhraseStarted = millis();
    }
  }

  draw() {
    if (this.state === "menu") {
      this.drawMenu();
      return;
    }

    if (this.state === "letter") {
      this.drawLetter();
      return;
    }

    if (this.state === "proposal") {
      this.drawProposal();
      return;
    }

    if (this.state === "final") {
      this.drawFinal();
      return;
    }

    this.drawSceneLayer();

    if (this.state === "dialogue") {
      this.dialogueBox.draw();
    }

    if (this.state === "transition") {
      this.drawTransitionOverlay();
    }
  }

  drawSceneLayer() {
    const scene = this.scenes[this.currentSceneIndex];
    scene.draw();
    this.player.draw();
    this.drawHud(scene);
    this.drawInteractionHint(scene);
    if (scene.kind === "jardim") {
      this.drawGardenPhrase();
    }
  }

  drawMenu() {
    background(14, 15, 25);
    drawStarField();
    drawSoftMoon(width / 2, 120);

    push();
    textAlign(CENTER, CENTER);
    fill(255, 238, 246);
    textStyle(BOLD);
    textSize(56);
    text("Serendipia", width / 2, 176);
    textStyle(NORMAL);
    textSize(20);
    fill(255, 210, 226);
    text("Uma história iniciada em 19/02/2026", width / 2, 224);

    fill(218, 229, 255);
    textSize(17);
    text("WASD ou setas para mover.", width / 2, 266);
    text("E ou Enter para interagir.", width / 2, 294);
    text("Espaço para avançar a carta.", width / 2, 322);
    pop();

    this.menuButton.draw({
      bg: color(255, 205, 225),
      hoverBg: color(255, 236, 244),
      ink: color(68, 31, 50),
      textSize: 22,
    });

    push();
    textAlign(CENTER, CENTER);
    fill(255, 245, 248, 160);
    textSize(13);
    text(
      this.menuMusicStarted
        ? "Música pronta."
        : "Clique uma vez para ativar a música antes de iniciar.",
      width / 2,
      444
    );
    pop();
  }

  drawHud(scene) {
    push();
    rectMode(CORNER);
    noStroke();
    drawPixelShadow(226, 62, 430, 88, 88);
    fill(12, 14, 24, 188);
    rect(18, 18, 416, 82);
    fill(31, 35, 57, 226);
    rect(26, 26, 400, 66);
    fill(255, 202, 223, 190);
    rect(34, 34, 56, 4);
    rect(360, 84, 48, 4);
    fill(255, 235, 243);
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    textSize(18);
    text(scene.title, 42, 38);
    textStyle(NORMAL);
    fill(219, 230, 255);
    textSize(13);
    text(scene.subtitle, 42, 66);
    pop();
  }

  drawInteractionHint(scene) {
    const point = scene.nearestPoint(this.player.pos);
    if (!point || this.state !== "playing") return;

    push();
    rectMode(CENTER);
    noStroke();
    fill(16, 19, 32, 210);
    rect(width / 2, height - 40, 384, 38);
    fill(255, 235, 132);
    textAlign(CENTER, CENTER);
    textSize(15);
    text(`E / Enter - ${point.label}`, width / 2, height - 40);
    pop();
  }

  drawGardenPhrase() {
    let phrase = "";
    if (this.player.pos.y < 210) {
      phrase = "Algumas histórias começam sem aviso.";
    } else if (this.player.pos.y < 330) {
      phrase = "Algumas pessoas chegam devagar...";
    } else {
      phrase = "E ficam.";
    }

    push();
    textAlign(CENTER, CENTER);
    fill(255, 247, 250, 230);
    textStyle(BOLD);
    textSize(22);
    text(phrase, width / 2, 120);
    textStyle(NORMAL);
    pop();
  }

  startGame() {
    this.unlockAudio();
    this.playMainTheme();
    this.currentSceneIndex = 0;
    this.player.setPosition(this.scenes[0].start);
    this.state = "playing";
  }

  startDialogue(lines, onFinish) {
    this.state = "dialogue";
    this.dialogueBox.start(lines, () => {
      if (onFinish) onFinish();
      if (this.state === "dialogue") {
        this.state = "playing";
      }
    });
  }

  transitionToScene(index) {
    if (index >= this.scenes.length) {
      this.openLetter();
      return;
    }

    this.state = "transition";
    this.transition = {
      active: true,
      target: index,
      started: millis(),
      swapped: false,
    };
  }

  updateTransition() {
    const elapsed = millis() - this.transition.started;
    const halfway = 650;

    if (!this.transition.swapped && elapsed >= halfway) {
      this.currentSceneIndex = this.transition.target;
      this.player.setPosition(this.scenes[this.currentSceneIndex].start);
      this.transition.swapped = true;
    }

    if (elapsed >= halfway * 2) {
      this.state = "playing";
      this.transition.active = false;
    }
  }

  drawTransitionOverlay() {
    const elapsed = millis() - this.transition.started;
    const halfway = 650;
    const alpha = elapsed < halfway
      ? map(elapsed, 0, halfway, 0, 255)
      : map(elapsed, halfway, halfway * 2, 255, 0);

    push();
    noStroke();
    fill(10, 11, 18, constrain(alpha, 0, 255));
    rect(0, 0, width, height);
    pop();
  }

  openLetter() {
    this.playMoonwisher();
    this.state = "letter";
    this.letterStarted = millis();
    this.letterPhraseStarted = millis();
    this.letterIndex = 0;
    this.letterMode = "music-wait";
  }

  drawLetter() {
    background(10, 10, 18);
    drawLetterBackdrop();

    const letterX = 118;
    const letterY = 86;
    const letterW = 724;
    const letterH = 344;
    const padding = 72;
    const textMaxWidth = letterW - padding * 2;
    const centerX = letterX + letterW / 2;
    const centerY = letterY + letterH / 2 + 2;

    push();
    rectMode(CORNER);
    noStroke();
    fill(255, 203, 221, 28);
    rect(92, 64, 776, 388);
    fill(15, 17, 30, 228);
    rect(letterX, letterY, letterW, letterH);
    fill(255, 231, 240, 42);
    rect(letterX + 16, letterY + 16, letterW - 32, letterH - 32);
    fill(255, 221, 236);
    rect(letterX, letterY, letterW, 4);
    rect(letterX, letterY + letterH - 4, letterW, 4);
    rect(letterX, letterY, 4, letterH);
    rect(letterX + letterW - 4, letterY, 4, letterH);

    if (this.letterMode === "music-wait") {
      fill(0, 0, 0, 154);
      rect(0, 0, width, height);
      fill(255, 221, 235, 120);
      rect(width / 2 - 42, height / 2, 84, 4);
    } else if (this.letterMode === "pause") {
      fill(0, 0, 0, 140);
      rect(0, 0, width, height);
    } else if (this.letterMode === "bianca") {
      drawLetterNameMoment("Bianca...");
    } else {
      const phrase = this.letterLines[this.letterIndex] || "";
      const fade = constrain((millis() - this.letterPhraseStarted) / 550, 0, 1);
      const fontSize = phrase.length > 62 ? 24 : phrase.length > 42 ? 27 : 31;
      const lineGap = fontSize + 10;

      fill(255, 244, 248, 235 * fade);
      textAlign(CENTER, CENTER);
      textSize(fontSize);
      textLeading(lineGap);

      const lines = wrapText(phrase, textMaxWidth);
      const totalTextHeight = lines.length * lineGap;
      const firstLineY = centerY - totalTextHeight / 2 + lineGap / 2;
      lines.forEach((line, index) => {
        text(line, centerX, firstLineY + index * lineGap);
      });

      fill(255, 212, 226, 150);
      textSize(14);
      text(`${this.letterIndex + 1} / ${this.letterLines.length}`, centerX, letterY + letterH - 52);
    }

    fill(255, 231, 180, 190);
    textAlign(RIGHT, BOTTOM);
    textSize(14);
    text("Pressione ESPAÇO para continuar", width - 44, height - 34);
    pop();
  }

  advanceLetter() {
    if (this.letterMode === "music-wait") {
      return;
    }

    if (this.letterMode === "pause") {
      return;
    }

    if (this.letterMode === "bianca") {
      this.openProposal(true);
      return;
    }

    if (this.letterIndex < this.letterLines.length - 1) {
      this.letterIndex += 1;
      this.letterPhraseStarted = millis();
      return;
    }

    this.letterMode = "pause";
    this.letterStarted = millis();
  }

  openProposal(skipIntro = false) {
    this.state = "proposal";
    this.proposalStarted = skipIntro ? millis() - 1800 : millis();
    this.proposalSkipIntro = skipIntro;
    this.noAttempts = 0;
    this.noMessage = false;
    this.makeProposalButtons();
  }

  drawProposal() {
    const elapsed = millis() - this.proposalStarted;
    background(8, 9, 15);
    drawProposalStars();

    push();
    textAlign(CENTER, CENTER);
    fill(255, 241, 248);

    if (!this.proposalSkipIntro && elapsed < 1700) {
      textSize(34);
      text("Bianca...", width / 2, height / 2);
      pop();
      return;
    }

    textStyle(BOLD);
    textSize(40);
    text("Quer namorar comigo?", width / 2, 230);
    textStyle(NORMAL);
    fill(255, 216, 232);
    textSize(16);
    text("Escolha com o coração.", width / 2, 274);
    pop();

    this.yesButton.draw({
      bg: color(255, 187, 211),
      hoverBg: color(255, 226, 238),
      ink: color(86, 28, 52),
      textSize: 21,
    });

    this.noButton.draw({
      bg: color(214, 225, 255),
      hoverBg: color(237, 242, 255),
      ink: color(34, 43, 76),
      textSize: max(14, 21 - this.noAttempts * 2),
    });

    if (this.noMessage) {
      push();
      textAlign(CENTER, CENTER);
      fill(255, 232, 171);
      textSize(17);
      text("Essa opção está temporariamente indisponível. 😌", width / 2, 426);
      pop();
    }
  }

  dodgeNoButton() {
    this.noAttempts += 1;

    if (this.noAttempts >= 4) {
      this.noButton.visible = false;
      this.noMessage = true;
      return;
    }

    this.noButton.w = max(58, this.noButton.w * 0.8);
    this.noButton.h = max(38, this.noButton.h * 0.88);

    let newX = this.noButton.x;
    let newY = this.noButton.y;
    let tries = 0;
    do {
      newX = random(80, width - this.noButton.w - 80);
      newY = random(306, height - this.noButton.h - 72);
      tries += 1;
    } while (dist(newX, newY, this.yesButton.x, this.yesButton.y) < 190 && tries < 30);

    this.noButton.x = newX;
    this.noButton.y = newY;
  }

  acceptProposal() {
    this.state = "final";
    this.finalStarted = millis();
  }

  drawFinal() {
    background(16, 14, 24);
    drawProposalStars();

    const lines = [
      "Melhor resposta possível. ❤️",
      "Quero apoiar os seus sonhos.",
      "Quero admirar as suas conquistas.",
      "Quero caminhar ao seu lado na fé.",
      "Quero criar novas lembranças com você.",
      "Quero estar presente nos próximos capítulos da sua vida.",
      "Eu te amo. ❤️",
    ];
    const elapsed = millis() - this.finalStarted;

    push();
    textAlign(CENTER, CENTER);
    fill(255, 238, 246);
    for (let i = 0; i < lines.length; i += 1) {
      if (elapsed > i * 1150) {
        textSize(i === 0 ? 30 : 20);
        text(lines[i], width / 2, 150 + i * 44);
      }
    }
    pop();
  }

  keyPressed(k, code) {
    const isAction = code === ENTER || String(k).toLowerCase() === "e";
    const isSpace = code === 32;

    if (this.state === "dialogue" && isAction) {
      this.dialogueBox.advance();
      return;
    }

    if (this.state === "playing" && isAction) {
      const scene = this.scenes[this.currentSceneIndex];
      const point = scene.nearestPoint(this.player.pos);
      if (point) point.interact(this, scene);
      return;
    }

    if (this.state === "letter" && isSpace) {
      this.advanceLetter();
    }
  }

  mousePressed() {
    if (this.state === "menu") {
      const clickedStart = this.menuButton.contains(mouseX, mouseY);
      const musicAlreadyStarted = this.currentMusicName === "mainTheme";
      this.unlockAudio();
      this.playMainTheme();

      if (clickedStart && !musicAlreadyStarted) {
        return;
      }

      if (clickedStart) {
        this.menuButton.click();
      }
      return;
    }

    if (this.state !== "proposal" || millis() - this.proposalStarted < 1700) {
      return;
    }

    if (this.yesButton.contains(mouseX, mouseY)) {
      this.yesButton.click();
      return;
    }

    if (this.noButton.contains(mouseX, mouseY)) {
      this.noButton.click();
    }
  }

  unlockAudio() {
    if (this.audioUnlocked) return;
    this.audioUnlocked = true;
    if (typeof userStartAudio === "function") {
      const startPromise = userStartAudio();
      if (startPromise && typeof startPromise.then === "function") {
        startPromise.then(() => {
          if (this.state === "menu") {
            this.playMainTheme();
          }
        });
      }
    }
    this.loadMusic();
  }

  tryAutoplayMainTheme() {
    if (this.autoMusicAttempted || this.currentMusicName === "mainTheme") {
      return;
    }

    this.autoMusicAttempted = true;
    this.loadMusic();

    if (typeof getAudioContext === "function") {
      const audioContext = getAudioContext();
      if (audioContext && audioContext.state === "running") {
        this.audioUnlocked = true;
        this.playMainTheme();
      }
    }
  }

  loadMusic() {
    if (this.musicRequested || typeof loadSound !== "function") {
      return;
    }

    this.musicRequested = true;
    if (typeof soundFormats === "function") {
      soundFormats("mp3");
    }

    const files = {
      mainTheme: ["assets/music/main_theme.mp3", "assets/music/01 To the Moon - Main Theme.mp3"],
      moonwisherTheme: ["assets/music/moonwisher.mp3", "assets/music/02 Moonwisher.mp3"],
    };

    Object.entries(files).forEach(([name, candidates]) => {
      this.loadMusicCandidate(name, candidates, 0);
    });
  }

  loadMusicCandidate(name, candidates, index) {
    if (index >= candidates.length || typeof loadSound !== "function") {
      audioAssets[name] = null;
      return;
    }

    try {
      const track = loadSound(
        candidates[index],
        () => {
          audioAssets[name] = track;
          this[name] = track;
          if (this.audioUnlocked && this.currentMusicName === name && this.currentMusic !== track) {
            this.startMusicTrack(name, this.currentMusicVolume || this.targetVolumeFor(name));
          }
        },
        () => {
          if (audioAssets[name] === track || audioAssets[name] === null) {
            this[name] = null;
            this.loadMusicCandidate(name, candidates, index + 1);
          }
        }
      );
      audioAssets[name] = track;
      this[name] = track;
    } catch (error) {
      this.loadMusicCandidate(name, candidates, index + 1);
    }
  }

  playMainTheme() {
    if (!this.audioUnlocked || this.currentMusicName === "mainTheme") {
      return;
    }

    this.moonwisherPendingAt = 0;
    this.startMusicTrack("mainTheme", MAIN_THEME_VOLUME);
  }

  playMoonwisher() {
    if (
      !this.audioUnlocked ||
      this.currentMusicName === "moonwisherTheme" ||
      this.currentMusicName === "moonwisher-pending"
    ) {
      return;
    }

    this.fadeOutCurrentMusic(1000);
    this.currentMusicName = "moonwisher-pending";
    this.moonwisherPendingAt = millis() + MOONWISHER_DELAY;
  }

  startMusicTrack(name, volume) {
    this.stopCurrentMusic();
    this.currentMusicName = name;
    this.currentMusicVolume = volume;

    const track = this.getMusicTrack(name);
    if (track && typeof track.isLoaded === "function" && track.isLoaded()) {
      track.setVolume(0);
      track.loop();
      track.setVolume(volume, 1.1);
      this.currentMusic = track;
      if (name === "mainTheme") {
        this.menuMusicStarted = true;
      }
      return;
    }

    this.currentMusic = null;
  }

  stopCurrentMusic() {
    Object.values(audioAssets).forEach((track) => {
      if (track && typeof track.isPlaying === "function" && track.isPlaying()) {
        track.stop();
      }
    });

    this.currentMusic = null;
    this.musicFade = null;
  }

  fadeOutCurrentMusic(duration = 1000) {
    if (this.currentMusic && typeof this.currentMusic.setVolume === "function") {
      this.musicFade = {
        track: this.currentMusic,
        from: this.currentMusicVolume || MAIN_THEME_VOLUME,
        started: millis(),
        duration,
      };
    }
  }

  updateMusicFade() {
    if (this.musicFade) {
      const elapsed = millis() - this.musicFade.started;
      const t = constrain(elapsed / this.musicFade.duration, 0, 1);
      const nextVolume = lerp(this.musicFade.from, 0, t);
      this.musicFade.track.setVolume(nextVolume);
      if (t >= 1) {
        if (typeof this.musicFade.track.stop === "function") {
          this.musicFade.track.stop();
        }
        this.musicFade = null;
        this.currentMusic = null;
      }
    }

    if (this.moonwisherPendingAt && millis() >= this.moonwisherPendingAt) {
      this.moonwisherPendingAt = 0;
      this.startMusicTrack("moonwisherTheme", MOONWISHER_VOLUME);
    }
  }

  targetVolumeFor(name) {
    return name === "moonwisherTheme" ? MOONWISHER_VOLUME : MAIN_THEME_VOLUME;
  }

  getMusicTrack(name) {
    if (name === "mainTheme") return this.mainTheme;
    if (name === "moonwisherTheme") return this.moonwisherTheme;
    return null;
  }
}

function drawTiRoom() {
  drawVerticalGradient(color(48, 57, 80), color(32, 39, 58));
  drawTileFloor(color(54, 63, 84), color(42, 51, 72));

  noStroke();
  fill(65, 74, 98);
  rect(0, 0, width, 126);
  fill(44, 52, 74);
  rect(0, 104, width, 22);
  fill(255, 230, 185, 48);
  rect(116, 31, 236, 14);
  rect(540, 31, 250, 14);
  fill(255, 240, 209, 38);
  rect(80, 52, 320, 76);
  rect(508, 52, 328, 76);

  drawWallGrid(0, 0, 126, color(76, 86, 112, 80));
  drawCorkBoard(462, 26);
  drawWhiteboard(684, 34);
  drawDoor(54, 180, color(74, 49, 56));
  drawPlant(84, 390);

  drawDesk(160, 238);
  drawDesk(376, 178);
  drawDesk(608, 256);
  drawDesk(706, 170);

  drawComputer(196, 220);
  drawComputer(412, 160);
  drawComputer(646, 238);
  drawComputer(742, 152);
  drawChair(206, 300);
  drawChair(430, 240);
  drawChair(658, 320);
  drawChair(748, 234);
  drawLooseCable(250, 248);
  drawLooseCable(700, 266);
  drawTinyDust(18, color(255, 230, 194, 45));
  drawRoomVignette();
}

function drawChurch() {
  drawVerticalGradient(color(50, 58, 84), color(31, 29, 47));

  noStroke();
  fill(78, 59, 75);
  rect(0, 0, width, 118);
  fill(47, 38, 56);
  rect(0, 104, width, 18);
  fill(232, 202, 142);
  rect(width / 2 - 12, 28, 24, 76);
  rect(width / 2 - 40, 55, 80, 20);

  drawStainedGlass(166, 54, color(120, 177, 217));
  drawStainedGlass(794, 54, color(234, 152, 183));
  drawStainedGlass(318, 42, color(154, 206, 177));
  drawStainedGlass(642, 42, color(220, 178, 113));

  fill(92, 67, 72);
  rect(0, 398, width, 142);
  fill(124, 88, 85);
  rect(width / 2 - 80, 112, 160, 428);
  fill(158, 120, 100);
  rect(width / 2 - 56, 112, 112, 428);
  fill(190, 148, 115, 90);
  for (let y = 132; y < height; y += 46) {
    rect(width / 2 - 48, y, 96, 4);
  }

  for (let y = 192; y < 418; y += 78) {
    drawPew(128, y, 210);
    drawPew(width - 338, y, 210);
  }

  drawAltar(width / 2 - 70, 124);
  drawCandles(width / 2 - 108, 190);
  drawCandles(width / 2 + 86, 190);

  fill(255, 236, 183, 34);
  quad(160, 94, 346, 540, 430, 540, 210, 94);
  quad(800, 94, 620, 540, 536, 540, 750, 94);
  drawTinyDust(24, color(255, 231, 174, 58));
  drawRoomVignette();
}

function drawCinema() {
  drawVerticalGradient(color(42, 30, 48), color(25, 22, 36));
  drawTileFloor(color(48, 38, 55), color(37, 30, 45));

  noStroke();
  fill(92, 38, 59);
  rect(0, 0, width, 120);
  fill(120, 48, 70);
  rect(0, 100, width, 20);
  fill(255, 216, 118);
  for (let x = 36; x < width; x += 44) {
    rect(x, 32, 16, 16);
    fill(255, 240, 184, 64);
    rect(x - 8, 24, 32, 32);
    fill(255, 216, 118);
  }
  fill(255, 232, 170);
  textAlign(CENTER, CENTER);
  textSize(24);
  textStyle(BOLD);
  text("CINEMA", width / 2, 72);
  textStyle(NORMAL);

  drawPoster(110, 154, color(92, 151, 191));
  drawPoster(214, 154, color(224, 133, 150));
  drawPoster(318, 154, color(174, 126, 214));
  drawSnackCounter(86, 318);
  drawTicketStand(380, 314);
  drawScreen(548, 156);

  fill(68, 38, 54);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      rect(570 + col * 38, 318 + row * 34, 28, 20);
      rect(574 + col * 38, 338 + row * 34, 20, 8);
    }
  }

  fill(78, 47, 58);
  rect(816, 278, 78, 150);
  fill(255, 220, 146);
  rect(840, 340, 28, 42);
  drawMarqueeGlow();
  drawTinyDust(14, color(255, 215, 141, 40));
  drawRoomVignette();
}

function drawGarden() {
  drawVerticalGradient(color(238, 151, 137), color(75, 94, 143));

  noStroke();
  fill(255, 225, 174, 46);
  rect(0, 0, width, 294);
  fill(70, 130, 105);
  rect(0, 300, width, 240);
  fill(93, 154, 118);
  rect(0, 356, width, 184);
  drawGrassTexture();

  fill(226, 190, 139);
  beginShape();
  vertex(418, 82);
  vertex(542, 82);
  vertex(626, height);
  vertex(334, height);
  endShape(CLOSE);
  fill(244, 215, 163, 145);
  beginShape();
  vertex(458, 82);
  vertex(502, 82);
  vertex(540, height);
  vertex(420, height);
  endShape(CLOSE);

  drawFlowerBed(80, 392, 260);
  drawFlowerBed(620, 392, 260);
  drawTree(110, 256);
  drawTree(822, 248);
  drawLantern(262, 300);
  drawLantern(698, 300);
  drawFireflies();
  drawPetals(game.petals);
  drawRoomVignette();
}

function drawTileFloor(a, b) {
  noStroke();
  const tile = 32;
  for (let y = 112; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      fill((x / tile + y / tile) % 2 === 0 ? a : b);
      rect(x, y, tile, tile);
      fill(255, 255, 255, 12);
      rect(x + 3, y + 3, tile - 6, 2);
      fill(0, 0, 0, 18);
      rect(x, y + tile - 3, tile, 3);
      rect(x + tile - 3, y, 3, tile);
      if ((x / tile + y / tile) % 3 === 0) {
        fill(255, 226, 210, 16);
        rect(x + 9, y + 10, 5, 5);
      }
    }
  }
}

function drawVerticalGradient(topColor, bottomColor) {
  for (let y = 0; y < height; y += 3) {
    const amt = y / height;
    stroke(lerpColor(topColor, bottomColor, amt));
    line(0, y, width, y);
    line(0, y + 1, width, y + 1);
    line(0, y + 2, width, y + 2);
  }
  noStroke();
}

function drawPixelShadow(x, y, w, h, alpha = 90) {
  push();
  noStroke();
  rectMode(CENTER);
  fill(0, 0, 0, alpha * 0.25);
  rect(round(x), round(y), round(w), round(h));
  fill(0, 0, 0, alpha * 0.18);
  rect(round(x), round(y + 2), round(w * 0.72), round(h * 0.72));
  pop();
}

function wrapText(value, maxWidth) {
  const words = String(value).split(/\s+/);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (textWidth(testLine) <= maxWidth || !currentLine) {
      currentLine = testLine;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function drawBiancaCurls() {
  rectMode(CENTER);

  const outline = color(31, 22, 31);
  const hair = color(76, 43, 53);
  const hairMid = color(96, 55, 65);
  const shine = color(129, 76, 86);

  const curls = [
    [-15, -25, 10], [-7, -30, 11], [3, -31, 12], [13, -26, 11],
    [-20, -16, 11], [-15, -6, 10], [-13, 5, 9],
    [20, -15, 11], [15, -4, 10], [13, 6, 9],
    [-2, -23, 12], [8, -20, 10],
  ];

  fill(outline);
  curls.forEach(([x, y, size]) => {
    rect(x, y, size + 4, size + 4);
  });
  rect(0, -18, 28, 22);
  rect(-12, -2, 14, 28);
  rect(12, -2, 14, 28);

  fill(hair);
  curls.forEach(([x, y, size], index) => {
    rect(x, y, size, size);
    if (index % 2 === 0) {
      fill(hairMid);
      rect(x + 2, y - 1, max(4, size - 5), max(4, size - 6));
      fill(hair);
    }
  });

  fill(hairMid);
  rect(0, -20, 24, 20);
  rect(-10, -4, 10, 24);
  rect(10, -4, 10, 24);

  fill(shine);
  rect(-5, -28, 5, 4);
  rect(7, -25, 6, 4);
  rect(-18, -12, 4, 5);
  rect(18, -10, 4, 5);
}

function drawRoomVignette() {
  noStroke();
  fill(7, 8, 16, 34);
  rect(0, 0, width, 26);
  rect(0, height - 28, width, 28);
  rect(0, 0, 28, height);
  rect(width - 28, 0, 28, height);
  fill(255, 226, 205, 16);
  rect(120, 108, width - 240, height - 180);
}

function drawWallGrid(x, y, h, c) {
  stroke(c);
  strokeWeight(1);
  for (let gx = x; gx < width; gx += 48) line(gx, y, gx, y + h);
  for (let gy = y + 24; gy < y + h; gy += 28) line(x, gy, width, gy);
  noStroke();
}

function drawTinyDust(count, c) {
  noStroke();
  fill(c);
  for (let i = 0; i < count; i += 1) {
    const x = (i * 73 + frameCount * 0.15) % width;
    const y = 132 + ((i * 41 + frameCount * 0.08) % 330);
    rect(round(x), round(y), i % 3 === 0 ? 3 : 2, i % 3 === 0 ? 3 : 2);
  }
}

function drawCorkBoard(x, y) {
  drawPixelShadow(x + 74, y + 42, 158, 76, 80);
  fill(86, 58, 56);
  rect(x, y, 148, 72);
  fill(173, 117, 78);
  rect(x + 8, y + 8, 132, 56);
  fill(255, 230, 160);
  rect(x + 22, y + 18, 34, 22);
  fill(255, 178, 199);
  rect(x + 70, y + 16, 44, 28);
  fill(211, 237, 255);
  rect(x + 42, y + 44, 52, 12);
}

function drawWhiteboard(x, y) {
  drawPixelShadow(x + 94, y + 40, 196, 78, 75);
  fill(37, 42, 60);
  rect(x, y, 188, 76);
  fill(218, 231, 235);
  rect(x + 8, y + 8, 172, 54);
  fill(92, 136, 171);
  rect(x + 24, y + 22, 62, 5);
  fill(213, 114, 142);
  rect(x + 24, y + 34, 98, 5);
  fill(78, 86, 112);
  rect(x + 122, y + 66, 40, 4);
}

function drawPlant(x, y) {
  drawPixelShadow(x + 16, y + 42, 48, 12, 90);
  fill(92, 61, 67);
  rect(x, y + 32, 34, 32);
  fill(71, 134, 98);
  rect(x - 8, y + 14, 18, 22);
  rect(x + 10, y, 18, 36);
  fill(98, 158, 112);
  rect(x + 20, y + 18, 18, 18);
}

function drawLooseCable(x, y) {
  noFill();
  stroke(24, 27, 39, 150);
  strokeWeight(3);
  beginShape();
  vertex(x, y);
  vertex(x + 18, y + 8);
  vertex(x + 36, y + 2);
  vertex(x + 54, y + 14);
  endShape();
  noStroke();
}

function drawDesk(x, y) {
  noStroke();
  drawPixelShadow(x + 76, y + 52, 152, 18, 90);
  fill(63, 43, 49);
  rect(x - 4, y + 4, 158, 30);
  fill(126, 82, 75);
  rect(x, y, 150, 28);
  fill(159, 102, 86);
  rect(x + 8, y + 4, 134, 5);
  fill(83, 58, 63);
  rect(x + 12, y + 28, 18, 44);
  rect(x + 120, y + 28, 18, 44);
  fill(55, 42, 50);
  rect(x + 38, y + 32, 72, 8);
}

function drawComputer(x, y) {
  fill(20, 23, 36);
  rect(x - 3, y - 3, 50, 36);
  fill(35, 40, 58);
  rect(x, y, 44, 30);
  fill(101, 192, 210);
  rect(x + 6, y + 5, 32, 18);
  fill(187, 245, 244, 90);
  rect(x + 10, y + 8, 14, 4);
  fill(19, 23, 35);
  rect(x + 18, y + 30, 8, 10);
  rect(x + 10, y + 40, 24, 6);
  fill(255, 225, 154, 64);
  rect(x - 4, y + 27, 52, 10);
}

function drawChair(x, y) {
  drawPixelShadow(x + 21, y + 34, 48, 10, 90);
  fill(37, 41, 61);
  rect(x + 6, y - 26, 32, 28);
  fill(70, 80, 106);
  rect(x, y, 42, 14);
  rect(x + 8, y - 24, 26, 24);
  fill(98, 109, 138);
  rect(x + 12, y - 19, 18, 5);
  fill(40, 46, 65);
  rect(x + 6, y + 14, 8, 26);
  rect(x + 28, y + 14, 8, 26);
}

function drawDoor(x, y, doorColor) {
  drawPixelShadow(x + 46, y + 88, 96, 172, 95);
  fill(39, 31, 41);
  rect(x - 5, y - 5, 96, 174);
  fill(doorColor);
  rect(x, y, 86, 164);
  fill(100, 65, 70);
  rect(x + 8, y + 14, 70, 56);
  rect(x + 8, y + 86, 70, 58);
  fill(255, 220, 132);
  rect(x + 62, y + 78, 8, 8);
}

function drawPew(x, y, w) {
  drawPixelShadow(x + w / 2, y + 62, w + 18, 14, 80);
  fill(64, 39, 49);
  rect(x - 4, y + 5, w + 8, 24);
  fill(104, 62, 63);
  rect(x, y, w, 22);
  fill(142, 89, 75);
  rect(x + 8, y + 4, w - 16, 4);
  fill(70, 44, 52);
  rect(x, y + 22, w, 12);
  rect(x + 18, y + 34, 14, 36);
  rect(x + w - 32, y + 34, 14, 36);
}

function drawStainedGlass(x, y, accent) {
  fill(19, 21, 34);
  rect(x - 38, y - 4, 76, 120);
  fill(31, 33, 52);
  rect(x - 34, y, 68, 112);
  fill(accent);
  rect(x - 24, y + 10, 20, 42);
  fill(255, 222, 128);
  rect(x + 4, y + 10, 20, 42);
  fill(174, 120, 207);
  rect(x - 24, y + 60, 20, 40);
  fill(114, 202, 172);
  rect(x + 4, y + 60, 20, 40);
  fill(255, 242, 196, 48);
  rect(x - 26, y + 12, 52, 90);
}

function drawPoster(x, y, posterColor) {
  drawPixelShadow(x + 40, y + 60, 86, 112, 70);
  fill(18, 18, 28);
  rect(x, y, 76, 108);
  fill(posterColor);
  rect(x + 8, y + 8, 60, 74);
  fill(255, 255, 255, 65);
  rect(x + 16, y + 15, 22, 8);
  fill(20, 20, 30, 72);
  rect(x + 12, y + 58, 52, 18);
  fill(255, 235, 210);
  rect(x + 18, y + 90, 40, 8);
}

function drawSnackCounter(x, y) {
  drawPixelShadow(x + 100, y + 82, 214, 18, 90);
  fill(92, 40, 58);
  rect(x - 6, y + 6, 212, 78);
  fill(148, 57, 74);
  rect(x, y, 200, 74);
  fill(255, 232, 170);
  rect(x, y, 200, 18);
  fill(255, 249, 224);
  rect(x + 38, y - 52, 38, 52);
  fill(236, 52, 74);
  rect(x + 38, y - 52, 38, 12);
  fill(255, 245, 220);
  rect(x + 112, y - 26, 42, 26);
  fill(94, 63, 75);
  rect(x + 118, y - 18, 30, 4);
  fill(255, 214, 116);
  for (let i = 0; i < 5; i += 1) {
    rect(x + 42 + i * 7, y - 68 - (i % 2) * 5, 5, 18);
  }
}

function drawTicketStand(x, y) {
  drawPixelShadow(x + 65, y + 98, 140, 16, 80);
  fill(34, 31, 47);
  rect(x - 4, y - 4, 134, 98);
  fill(45, 40, 59);
  rect(x, y, 126, 90);
  fill(101, 151, 191);
  rect(x + 16, y + 14, 94, 36);
  fill(182, 224, 233, 70);
  rect(x + 24, y + 21, 34, 8);
  fill(255, 236, 177);
  rect(x + 36, y + 62, 54, 12);
}

function drawScreen(x, y) {
  drawPixelShadow(x + 139, y + 68, 300, 132, 82);
  fill(12, 12, 20);
  rect(x, y, 278, 116);
  fill(226, 229, 238);
  rect(x + 14, y + 12, 250, 82);
  fill(255, 216, 232, 100);
  rect(x + 14, y + 12, 250, 82);
  fill(255, 255, 255, 70);
  rect(x + 28, y + 26, 74, 8);
  fill(83, 54, 70);
  rect(x + 80, y + 102, 118, 6);
}

function drawFlowerBed(x, y, w) {
  drawPixelShadow(x + w / 2, y + 66, w, 14, 72);
  fill(51, 102, 80);
  rect(x - 4, y + 6, w + 8, 64);
  fill(61, 120, 88);
  rect(x, y, w, 62);
  for (let i = 0; i < 24; i += 1) {
    const fx = x + 10 + i * (w - 20) / 24;
    const fy = y + 12 + (i % 4) * 10;
    fill(i % 2 === 0 ? color(255, 190, 218) : color(255, 226, 132));
    rect(fx, fy, 8, 8);
    fill(74, 146, 94);
    rect(fx + 3, fy + 8, 2, 10);
  }
}

function drawTree(x, y) {
  drawPixelShadow(x + 50, y + 206, 116, 18, 86);
  fill(108, 75, 58);
  rect(x + 26, y + 82, 34, 118);
  fill(135, 92, 64);
  rect(x + 35, y + 100, 8, 74);
  fill(61, 119, 88);
  rect(x, y + 34, 88, 80);
  fill(77, 142, 102);
  rect(x + 16, y, 92, 76);
  fill(92, 157, 112);
  rect(x + 42, y + 18, 54, 24);
  fill(255, 196, 214, 120);
  rect(x + 22, y + 18, 14, 14);
  rect(x + 70, y + 42, 12, 12);
}

function drawPetals(petals) {
  petals.forEach((petal) => {
    petal.y += petal.speed;
    petal.x += sin((frameCount + petal.y) * 0.03) * petal.drift;
    if (petal.y > height + 20) {
      petal.y = random(-80, -20);
      petal.x = random(width);
    }
    fill(255, 196, 214, 170);
    rect(round(petal.x), round(petal.y), petal.size, max(3, petal.size - 2));
  });
}

function drawAltar(x, y) {
  drawPixelShadow(x + 70, y + 76, 158, 22, 80);
  fill(82, 60, 65);
  rect(x, y + 62, 140, 56);
  fill(198, 166, 124);
  rect(x - 10, y + 48, 160, 22);
  fill(255, 235, 218);
  rect(x + 18, y + 58, 104, 12);
  fill(255, 219, 139);
  rect(x + 60, y + 20, 20, 36);
}

function drawCandles(x, y) {
  for (let i = 0; i < 3; i += 1) {
    const cx = x + i * 16;
    fill(255, 241, 207);
    rect(cx, y, 8, 26 - i * 3);
    fill(255, 205, 103, 170);
    rect(cx + 1, y - 8 - i, 6, 8);
    fill(255, 231, 143, 45);
    rect(cx - 8, y - 16, 24, 24);
  }
}

function drawMarqueeGlow() {
  noStroke();
  fill(255, 199, 126, 22);
  rect(0, 76, width, 74);
  fill(255, 230, 166, 40);
  rect(452, 30, 58, 84);
}

function drawGrassTexture() {
  noStroke();
  for (let i = 0; i < 80; i += 1) {
    const x = (i * 53) % width;
    const y = 318 + ((i * 37) % 190);
    fill(i % 2 === 0 ? color(67, 132, 91, 110) : color(126, 175, 113, 88));
    rect(x, y, 4, 12);
  }
}

function drawLantern(x, y) {
  drawPixelShadow(x + 20, y + 102, 54, 12, 70);
  fill(81, 55, 62);
  rect(x + 18, y, 6, 110);
  rect(x + 4, y, 34, 6);
  fill(255, 218, 134, 75);
  rect(x - 16, y + 18, 72, 54);
  fill(42, 38, 50);
  rect(x + 8, y + 14, 26, 32);
  fill(255, 225, 145);
  rect(x + 14, y + 20, 14, 18);
}

function drawFireflies() {
  noStroke();
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 89 + sin(frameCount * 0.018 + i) * 30 + width) % width;
    const y = 160 + ((i * 67 + cos(frameCount * 0.014 + i) * 18) % 210);
    fill(255, 239, 166, 48);
    rect(round(x - 8), round(y - 8), 18, 18);
    fill(255, 246, 184, 150);
    rect(round(x), round(y), 4, 4);
  }
}

function drawJoaoSprite(x, y) {
  push();
  translate(x, y);
  noStroke();
  rectMode(CENTER);
  drawPixelShadow(0, 23, 42, 11, 115);
  fill(27, 24, 34);
  rect(0, -18, 28, 20);
  fill(44, 34, 37);
  rect(0, -20, 22, 18);
  fill(75, 50, 45);
  rect(-5, -26, 12, 5);
  fill(224, 166, 132);
  rect(0, -12, 18, 18);
  fill(33, 36, 55);
  rect(0, 8, 30, 30);
  fill(67, 107, 151);
  rect(0, 8, 24, 28);
  fill(91, 141, 184);
  rect(5, 1, 10, 5);
  fill(41, 48, 78);
  rect(-7, 34, 10, 18);
  rect(7, 34, 10, 18);
  fill(235, 197, 160);
  rect(-4, -13, 3, 3);
  fill(255, 236, 220);
  rect(5, -13, 3, 3);
  pop();
}

function drawEnvelope(x, y, s = 1) {
  push();
  translate(x, y);
  scale(s);
  rectMode(CENTER);
  noStroke();
  drawPixelShadow(0, 22, 64, 12, 100);
  fill(255, 236, 192, 45);
  rect(0, 0, 88, 68);
  fill(255, 246, 220);
  rect(0, 0, 54, 34);
  fill(222, 179, 156);
  triangle(-27, -17, 0, 5, 27, -17);
  triangle(-27, 17, 0, -4, 27, 17);
  fill(235, 104, 139);
  rect(0, 5, 10, 10);
  pop();
}

function drawStarField() {
  noStroke();
  for (let i = 0; i < 80; i += 1) {
    const x = (i * 137) % width;
    const y = (i * 83) % height;
    const twinkle = 90 + sin(frameCount * 0.025 + i) * 50;
    fill(255, 235, 247, twinkle);
    rect(x, y, i % 5 === 0 ? 3 : 2, i % 5 === 0 ? 3 : 2);
  }
}

function drawSoftMoon(x, y) {
  noStroke();
  fill(255, 226, 232, 14);
  rect(x - 150, y - 88, 300, 176);
  fill(255, 226, 232, 22);
  rect(x - 116, y - 64, 232, 128);
  fill(255, 229, 190, 220);
  rect(x - 32, y - 32, 64, 64);
  fill(14, 15, 25, 210);
  rect(x - 8, y - 36, 52, 64);
}

function drawLetterBackdrop() {
  noStroke();
  drawProposalStars();
  fill(255, 196, 214, 30);
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 89 + frameCount * 0.2) % width;
    const y = 40 + ((i * 47) % 440);
    rect(x, y, 12, 8);
  }
  fill(255, 226, 185, 18);
  rect(160, 76, 640, 388);
}

function drawLetterNameMoment(label) {
  fill(0, 0, 0, 90);
  rect(0, 0, width, height);
  fill(255, 219, 235, 38);
  rect(width / 2 - 170, height / 2 - 42, 340, 84);
  fill(255, 245, 248);
  textAlign(CENTER, CENTER);
  textSize(38);
  text(label, width / 2, height / 2 - 6);
  fill(255, 225, 160, 130);
  rect(width / 2 - 30, height / 2 + 38, 60, 4);
}

function drawProposalStars() {
  drawStarField();
  noStroke();
  fill(255, 196, 214, 20);
  rect(width / 2 - 220, 106, 440, 34);
  rect(width / 2 - 150, 150, 300, 22);
  fill(255, 226, 182, 18);
  rect(width / 2 - 90, 190, 180, 140);
}
