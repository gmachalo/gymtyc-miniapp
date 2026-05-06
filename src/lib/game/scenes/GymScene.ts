import Phaser from "phaser";
import { Player } from "@/lib/game/entities/Player";
import { PlayerController } from "@/lib/game/systems/PlayerController";
import { Equipment } from "@/lib/game/entities/Equipment";
import { NpcManager } from "@/lib/game/systems/NpcManager";
import { IncomeSystem } from "@/lib/game/systems/IncomeSystem";
import { EventBus } from "@/lib/game/EventBus";

// Equipment layout: [id, name, textureKey, x, y, xpCost, xpReward, tokens, intensity]
const GYM_EQUIPMENT: Array<{
  id: string; name: string; tex: string;
  x: number; y: number;
  xpCost: number; xpReward: number; tokens: number;
  intensity: "LOW" | "MEDIUM" | "HIGH";
}> = [
  { id: "bench",     name: "Bench Press", tex: "eq_bench",     x: 140, y: 200, xpCost: 10, xpReward: 15, tokens: 8,  intensity: "HIGH"   },
  { id: "treadmill", name: "Treadmill",   tex: "eq_treadmill", x: 280, y: 200, xpCost: 8,  xpReward: 12, tokens: 5,  intensity: "MEDIUM" },
  { id: "squat",     name: "Squat Rack",  tex: "eq_squat",     x: 420, y: 200, xpCost: 12, xpReward: 18, tokens: 10, intensity: "HIGH"   },
  { id: "cable",     name: "Cable Row",   tex: "eq_cable",     x: 140, y: 340, xpCost: 8,  xpReward: 12, tokens: 6,  intensity: "MEDIUM" },
  { id: "bike",      name: "Spin Bike",   tex: "eq_bike",      x: 280, y: 340, xpCost: 6,  xpReward: 10, tokens: 4,  intensity: "LOW"    },
];

export interface GymSceneInitData {
  playerBodyType?: "SKINNY" | "AVERAGE" | "OVERWEIGHT";
  playerName?: string;
  playerTransformationStage?: number;
  currentXp?: number;
  overflowXp?: number;
  gymReputation?: number;
}

export class GymScene extends Phaser.Scene {
  private player!: Player;
  private controller!: PlayerController;
  private equipment: Equipment[] = [];
  private npcManager!: NpcManager;
  private incomeSystem!: IncomeSystem;
  private camera!: Phaser.Cameras.Scene2D.Camera;
  private activeEquipment: Equipment | null = null;
  private workoutZone: Phaser.Geom.Circle | null = null;
  private initData: GymSceneInitData = {};

  // Income collection point
  private cashPoint!: Phaser.GameObjects.Container;
  private cashGlow!: Phaser.GameObjects.Arc;

  // Zone labels
  private zoneLabels: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: "GymScene" });
  }

  init(data: GymSceneInitData) {
    this.initData = data;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── Background ──────────────────────────────────────────────
    this.cameras.main.setBackgroundColor(0x0d1117);
    this.drawGymLayout(W, H);

    // ── Zone labels ──────────────────────────────────────────────
    this.addZoneLabel("Weight Zone", 280, 120);
    this.addZoneLabel("Cardio Zone", 280, 280);
    this.addZoneLabel("Reception", 50, 430);

    // ── Equipment ───────────────────────────────────────────────
    GYM_EQUIPMENT.forEach((cfg) => {
      const eq = new Equipment({
        scene: this,
        x: cfg.x, y: cfg.y,
        id: cfg.id, name: cfg.name,
        textureKey: cfg.tex,
        xpCost: cfg.xpCost, xpReward: cfg.xpReward,
        tokenReward: cfg.tokens,
        intensity: cfg.intensity,
      });
      this.equipment.push(eq);
    });

    // ── Cash collection point (reception desk) ───────────────────
    this.cashPoint = this.add.container(80, H - 100);
    this.cashGlow = this.add.arc(0, 0, 28, 0, 360, false, 0xffd700, 0).setDepth(-1);
    const cashLabel = this.add.text(0, 16, "💰 Collect", {
      fontFamily: "Inter, sans-serif", fontSize: "10px",
      color: "#ffd700", backgroundColor: "#00000088",
      padding: { x: 3, y: 2 },
    }).setOrigin(0.5);
    const cashIcon = this.add.image(0, 0, "income_indicator").setScale(1.8);
    this.cashPoint.add([this.cashGlow, cashIcon, cashLabel]);

    // ── Player ──────────────────────────────────────────────────
    this.player = new Player({
      scene: this,
      x: W / 2,
      y: H - 100,
      bodyType: this.initData.playerBodyType ?? "AVERAGE",
      name: this.initData.playerName ?? "You",
      transformationStage: this.initData.playerTransformationStage ?? 0,
    });

    // ── Camera ──────────────────────────────────────────────────
    this.camera = this.cameras.main;
    this.camera.startFollow(this.player, true, 0.1, 0.1);
    this.camera.setZoom(1.0);

    // Pinch-to-zoom (mobile)
    this.input.on("wheel", (_: unknown, __: unknown, ___: unknown, dy: number) => {
      const zoom = Phaser.Math.Clamp(this.camera.zoom - dy * 0.001, 0.6, 2.0);
      this.camera.setZoom(zoom);
    });

    // ── Player Controller ────────────────────────────────────────
    this.controller = new PlayerController(this, this.player);
    this.controller.onInteractCallback = (wx, wy) => this.tryInteract(wx, wy);

    // ── Systems ──────────────────────────────────────────────────
    this.incomeSystem = new IncomeSystem(this);
    this.npcManager = new NpcManager(
      this,
      this.equipment,
      { x: W / 2, y: 30 },     // spawn point (gym entrance)
      { x: W / 2, y: 30 },     // exit point (same)
      this.initData.gymReputation ?? 50
    );

    // ── EventBus listeners ────────────────────────────────────────
    EventBus.on("npc:paid", ({ amount }) => {
      this.incomeSystem.spawnNpcPay(
        this.cashPoint.x + Phaser.Math.Between(-20, 20),
        this.cashPoint.y - 30,
        amount
      );
      // Show cash glow
      this.tweens.add({ targets: this.cashGlow, fillAlpha: 0.4, duration: 300, yoyo: true });
    });

    EventBus.on("workout:complete", ({ xpEarned, tokensEarned, equipmentId }) => {
      const eq = this.equipment.find((e) => e.equipId === equipmentId);
      if (eq) {
        this.incomeSystem.spawnXpReward(eq.x, eq.y - 40, xpEarned);
        this.incomeSystem.spawnTokenReward(eq.x + 20, eq.y - 20, tokensEarned);
      }
      this.player.setPlayerState("IDLE");
      this.activeEquipment = null;
    });

    EventBus.on("scene:switch", ({ to }) => {
      if (to !== "GymScene") this.scene.start(to);
    });

    EventBus.emit("scene:ready", { name: "GymScene" });
  }

  private drawGymLayout(W: number, H: number) {
    const g = this.add.graphics();

    // Outer walls
    g.fillStyle(0x0d1117).fillRect(0, 0, W, H);

    // Floor zones
    g.fillStyle(0x181825).fillRect(20, 20, W - 40, H * 0.55);   // main workout floor
    g.fillStyle(0x12121e).fillRect(20, H * 0.6, W * 0.35, H * 0.35); // reception

    // Grid lines
    g.lineStyle(1, 0x1e2030, 0.6);
    for (let x = 20; x < W; x += 48) g.lineBetween(x, 20, x, H * 0.55);
    for (let y = 20; y < H * 0.55; y += 48) g.lineBetween(20, y, W - 20, y);

    // Zone dividers
    g.lineStyle(2, 0x6c47ff, 0.3);
    g.lineBetween(20, H * 0.28, W - 20, H * 0.28); // weight / cardio divider

    // Wall accent
    g.lineStyle(3, 0x6c47ff, 0.5);
    g.strokeRect(20, 20, W - 40, H * 0.55);

    // Mirrors (left wall decoration)
    g.fillStyle(0x4cc9f0, 0.06).fillRect(22, 30, 18, H * 0.55 - 20);
    g.lineStyle(1, 0x4cc9f0, 0.3).strokeRect(22, 30, 18, H * 0.55 - 20);
  }

  private addZoneLabel(text: string, x: number, y: number) {
    const t = this.add.text(x, y, text.toUpperCase(), {
      fontFamily: "Inter, sans-serif",
      fontSize: "9px",
      color: "#2d3148",
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(1);
    this.zoneLabels.push(t);
  }

  private tryInteract(worldX: number, worldY: number) {
    // Check if player is near any equipment
    for (const eq of this.equipment) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, eq.x, eq.y);
      if (dist < 70) {
        this.activateEquipment(eq);
        return;
      }
    }

    // Check cash collection
    const cashDist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.cashPoint.x, this.cashPoint.y
    );
    if (cashDist < 80) {
      const collected = this.incomeSystem.collectPending();
      if (collected > 0) {
        EventBus.emit("income:collected", { amount: collected, x: this.cashPoint.x, y: this.cashPoint.y });
        this.incomeSystem.spawnReward(this.cashPoint.x, this.cashPoint.y - 40, `+${collected} 💰 Collected!`, "#ffd700");
      }
    }
  }

  private activateEquipment(eq: Equipment) {
    if (eq.isOccupied) return;
    this.activeEquipment = eq;
    this.player.x = eq.x;
    this.player.y = eq.y + 50;
    this.player.setPlayerState("WORKING_OUT");
    eq.startWorkout(25_000); // 25s workout
    EventBus.emit("workout:started", {
      equipmentId: eq.equipId,
      intensity: eq.intensity,
    });
  }

  update(_time: number, delta: number) {
    this.controller.update(delta);

    // Update equipment workout progress
    for (const eq of this.equipment) {
      const finished = eq.updateWorkout(delta);
      if (finished && this.activeEquipment?.equipId === eq.equipId) {
        this.activeEquipment = null;
      }
    }

    // Check proximity to equipment for prompts
    for (const eq of this.equipment) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, eq.x, eq.y);
      eq.showPrompt(dist < 70 && !eq.isOccupied);
    }

    // Update NPC system
    this.npcManager.update(delta);

    // Depth sort player
    this.player.updateDepth();

    // Cash point glow when income pending
    if (this.incomeSystem.getPending() > 0) {
      this.tweens.add({
        targets: this.cashGlow,
        fillAlpha: 0.35,
        duration: 500,
        yoyo: true,
        repeat: 0,
      });
    }
  }

  shutdown() {
    EventBus.off("npc:paid");
    EventBus.off("workout:complete");
    EventBus.off("scene:switch");
    this.controller.destroy();
  }
}
