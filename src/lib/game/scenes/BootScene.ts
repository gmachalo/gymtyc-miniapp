import Phaser from "phaser";
import { EventBus } from "@/lib/game/EventBus";

// BootScene — generates all isometric cartoon game textures procedurally
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;

    // Loading bar
    const barBg = this.add.rectangle(cx, cy, 320, 14, 0x1a1030, 1).setDepth(100);
    const bar   = this.add.rectangle(cx - 160, cy, 0, 14, 0x6c47ff, 1).setOrigin(0, 0.5).setDepth(101);
    this.add.text(cx, cy - 36, "Loading Gym Tycoon...", { fontFamily: "Inter,sans-serif", fontSize: "15px", color: "#a78bfa" }).setOrigin(0.5).setDepth(101);
    this.load.on("progress", (v: number) => { bar.width = 320 * v; });
    void barBg;
  }

  create() {
    this.generateTextures();
    EventBus.emit("scene:ready", { name: "BootScene" });
    this.scene.start("GymScene");
  }

  private generateTextures() {
    const g = this.make.graphics({ x: 0, y: 0 });

    // ── ISO FLOOR TILES ─────────────────────────────────────────────────────
    // Diamond-shaped iso tile (64×32)
    const drawIsoTile = (color: number, lineColor: number, w = 64, h = 32) => {
      g.clear();
      g.fillStyle(color, 1);
      g.fillPoints([
        { x: w/2, y: 0 }, { x: w, y: h/2 },
        { x: w/2, y: h }, { x: 0, y: h/2 },
      ], true);
      g.lineStyle(1, lineColor, 0.6);
      g.strokePoints([
        { x: w/2, y: 0 }, { x: w, y: h/2 },
        { x: w/2, y: h }, { x: 0, y: h/2 },
      ], true);
    };

    drawIsoTile(0x1e2340, 0x2d3566); g.generateTexture("tile_floor", 64, 32);
    drawIsoTile(0x251e40, 0x3d2d6a); g.generateTexture("tile_gym", 64, 32);
    drawIsoTile(0x1e1a0d, 0x2d2618); g.generateTexture("tile_home", 64, 32);

    // ISO wall tile (64×48 — has vertical face)
    g.clear();
    // Top face
    g.fillStyle(0x1a1530, 1);
    g.fillPoints([{ x:32,y:0},{x:64,y:16},{x:32,y:32},{x:0,y:16}], true);
    // Left face (lighter)
    g.fillStyle(0x241e42, 1);
    g.fillPoints([{ x:0,y:16},{x:32,y:32},{x:32,y:48},{x:0,y:32}], true);
    // Right face (darker)
    g.fillStyle(0x13102e, 1);
    g.fillPoints([{ x:32,y:32},{x:64,y:16},{x:64,y:32},{x:32,y:48}], true);
    g.lineStyle(1, 0x6c47ff, 0.3);
    g.lineBetween(32, 0, 64, 16); g.lineBetween(32, 0, 0, 16);
    g.generateTexture("tile_wall", 64, 48);

    // Rubber mat (cardio zone)
    drawIsoTile(0x0d2020, 0x00d4aa); g.generateTexture("tile_mat", 64, 32);
    // Reception carpet
    drawIsoTile(0x1f0d20, 0xf72585); g.generateTexture("tile_reception", 64, 32);

    // ── EQUIPMENT SPRITES (ISO 3D LOOK) ──────────────────────────────────
    type EqSpec = { key: string; topColor: number; sideColor: number; accent: number; label: string };
    const equipment: EqSpec[] = [
      { key: "eq_bench",     topColor: 0xd32f2f, sideColor: 0x8b1a1a, accent: 0xff6b6b, label: "🏋️" },
      { key: "eq_treadmill", topColor: 0x0d7a5a, sideColor: 0x065a40, accent: 0x00d4aa, label: "🏃" },
      { key: "eq_squat",     topColor: 0x4a2faa, sideColor: 0x2d1a80, accent: 0x9b59b6, label: "🦵" },
      { key: "eq_cable",     topColor: 0x0d6a8a, sideColor: 0x064a65, accent: 0x4cc9f0, label: "💪" },
      { key: "eq_bike",      topColor: 0xaa7a10, sideColor: 0x7a5a08, accent: 0xf59e0b, label: "🚴" },
      { key: "eq_yoga",      topColor: 0x6a2f8a, sideColor: 0x4a1a65, accent: 0xa78bfa, label: "🧘" },
      { key: "eq_pullup",    topColor: 0x0d8a4a, sideColor: 0x065a30, accent: 0x00d4aa, label: "🤸" },
    ];

    equipment.forEach(({ key, topColor, sideColor, accent }) => {
      g.clear();
      // Top face
      g.fillStyle(topColor, 1);
      g.fillPoints([{x:32,y:4},{x:58,y:17},{x:32,y:30},{x:6,y:17}], true);
      // Left face
      g.fillStyle(sideColor, 1);
      g.fillPoints([{x:6,y:17},{x:32,y:30},{x:32,y:46},{x:6,y:33}], true);
      // Right face (darker)
      g.fillStyle(Phaser.Display.Color.ValueToColor(sideColor).darken(20).color, 1);
      g.fillPoints([{x:32,y:30},{x:58,y:17},{x:58,y:33},{x:32,y:46}], true);
      // Accent stripe on top
      g.lineStyle(2, accent, 0.9);
      g.lineBetween(20, 17, 44, 17);
      // Outline
      g.lineStyle(1, accent, 0.5);
      g.strokePoints([{x:32,y:4},{x:58,y:17},{x:58,y:33},{x:32,y:46},{x:6,y:33},{x:6,y:17}], true);
      g.generateTexture(key, 64, 50);
    });

    // ── CHARACTER SPRITES (CARTOON STYLE) ─────────────────────────────────
    // Cartoon body helper: round head + trapezoid body + legs
    const drawCharacter = (
      bodyColor: number,
      headColor: number,
      shirtColor: number,
      w = 40, h = 52
    ) => {
      g.clear();
      // Shadow
      g.fillStyle(0x000000, 0.25).fillEllipse(w/2, h-4, w*0.7, 8);
      // Legs
      g.fillStyle(0x334455, 1).fillRect(w/2-9, h-20, 8, 18);
      g.fillRect(w/2+1, h-20, 8, 18);
      // Shoes
      g.fillStyle(0x111111, 1).fillRoundedRect(w/2-11, h-7, 10, 6, 3);
      g.fillRoundedRect(w/2, h-7, 10, 6, 3);
      // Body (shirt)
      g.fillStyle(shirtColor, 1).fillRoundedRect(w/2-12, h-40, 24, 22, 6);
      // Arms
      g.fillStyle(headColor, 1).fillRoundedRect(w/2-18, h-38, 7, 15, 3);
      g.fillRoundedRect(w/2+11, h-38, 7, 15, 3);
      // Neck
      g.fillStyle(headColor, 1).fillRect(w/2-4, h-44, 8, 6);
      // Head
      g.fillStyle(headColor, 1).fillCircle(w/2, h-50, 12);
      // Eyes
      g.fillStyle(0xffffff, 1).fillCircle(w/2-4, h-52, 3.5);
      g.fillCircle(w/2+4, h-52, 3.5);
      g.fillStyle(0x222222, 1).fillCircle(w/2-3.5, h-52, 2);
      g.fillCircle(w/2+4.5, h-52, 2);
      // Smile
      g.lineStyle(1.5, 0x333333, 1);
      g.beginPath();
      g.arc(w/2, h-48, 4, 0.2, Math.PI - 0.2, false);
      g.strokePath();
    };

    // Hair colors
    const chars: Array<{ key: string; body: number; head: number; shirt: number }> = [
      { key: "char_skinny",     body: 0x4cc9f0, head: 0xffd5a0, shirt: 0x4cc9f0 },
      { key: "char_average",    body: 0x6c47ff, head: 0xffc080, shirt: 0x6c47ff },
      { key: "char_overweight", body: 0xff6b35, head: 0xffb870, shirt: 0xff6b35 },
      { key: "char_npc_f",      body: 0xf72585, head: 0xffcba0, shirt: 0xf72585 },
      { key: "char_npc_m",      body: 0x00b4d8, head: 0xffd5a0, shirt: 0x00b4d8 },
      { key: "char_npc_g",      body: 0x00d4aa, head: 0xffb870, shirt: 0x00d4aa },
      { key: "char_npc_y",      body: 0xf59e0b, head: 0xffc890, shirt: 0xf59e0b },
    ];

    chars.forEach(({ key, head, shirt }) => {
      drawCharacter(shirt, head, shirt);
      g.generateTexture(key, 40, 52);
    });

    // Player highlight ring
    g.clear().fillStyle(0x6c47ff, 0.15).fillCircle(20, 20, 18)
      .lineStyle(2, 0x6c47ff, 0.8).strokeCircle(20, 20, 18);
    g.generateTexture("player_ring", 40, 40);

    // NPC (generic fallback)
    drawCharacter(0x888888, 0xffd5a0, 0x555577);
    g.generateTexture("char_npc", 40, 52);

    // ── UI TEXTURES ─────────────────────────────────────────────────────────
    // Joystick base
    g.clear().fillStyle(0xffffff, 0.08).fillCircle(52, 52, 48)
      .lineStyle(2, 0xffffff, 0.25).strokeCircle(52, 52, 48);
    g.generateTexture("joystick_base", 104, 104);

    // Joystick thumb
    g.clear().fillStyle(0x6c47ff, 0.9).fillCircle(24, 24, 22)
      .lineStyle(2, 0xa78bfa, 1).strokeCircle(24, 24, 22)
      .fillStyle(0xffffff, 0.3).fillCircle(20, 20, 8);
    g.generateTexture("joystick_thumb", 48, 48);

    // Income coin indicator
    g.clear().fillStyle(0xffd700, 1).fillCircle(14, 14, 12)
      .lineStyle(2, 0xffa500, 1).strokeCircle(14, 14, 12)
      .fillStyle(0xffa500, 0.5).fillCircle(11, 11, 5);
    g.generateTexture("income_indicator", 28, 28);

    // Collect button bg
    g.clear().fillStyle(0x00d4aa, 1).fillRoundedRect(0, 0, 100, 32, 10)
      .lineStyle(2, 0xffffff, 0.4).strokeRoundedRect(0, 0, 100, 32, 10);
    g.generateTexture("collect_btn", 100, 32);

    // Boost button
    g.clear().fillStyle(0x00d4aa, 1).fillRoundedRect(0, 0, 110, 40, 12)
      .fillStyle(0xffffff, 0.15).fillRoundedRect(4, 4, 102, 16, 8)
      .lineStyle(2, 0x00ffcc, 0.6).strokeRoundedRect(0, 0, 110, 40, 12);
    g.generateTexture("boost_btn", 110, 40);

    // Stars decoration
    g.clear().fillStyle(0xffd700, 1);
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const x = 8 + Math.cos(angle) * 7;
      const y = 8 + Math.sin(angle) * 7;
      g.fillCircle(x, y, 2);
    }
    g.generateTexture("stars_5", 16, 16);

    g.destroy();
  }
}
