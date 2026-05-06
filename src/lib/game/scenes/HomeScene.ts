import Phaser from "phaser";
import { Player } from "@/lib/game/entities/Player";
import { PlayerController } from "@/lib/game/systems/PlayerController";
import { Equipment } from "@/lib/game/entities/Equipment";
import { IncomeSystem } from "@/lib/game/systems/IncomeSystem";
import { EventBus } from "@/lib/game/EventBus";

const HOME_EQUIPMENT = [
  { id: "yoga",   name: "Yoga Mat",   tex: "eq_yoga",   x: 120, y: 220, xpCost: 5, xpReward: 8,  tokens: 3, intensity: "LOW"    as const },
  { id: "pushups",name: "Push-ups",   tex: "eq_cable",  x: 260, y: 220, xpCost: 5, xpReward: 8,  tokens: 3, intensity: "MEDIUM" as const },
  { id: "pullup", name: "Pull-up Bar",tex: "eq_pullup", x: 200, y: 340, xpCost: 8, xpReward: 12, tokens: 5, intensity: "HIGH"   as const },
];

export interface HomeSceneInitData {
  playerBodyType?: "SKINNY" | "AVERAGE" | "OVERWEIGHT";
  playerName?: string;
  playerTransformationStage?: number;
}

export class HomeScene extends Phaser.Scene {
  private player!: Player;
  private controller!: PlayerController;
  private equipment: Equipment[] = [];
  private incomeSystem!: IncomeSystem;
  private initData: HomeSceneInitData = {};

  constructor() {
    super({ key: "HomeScene" });
  }

  init(data: HomeSceneInitData) {
    this.initData = data;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor(0x0f0e0a);
    this.drawHomeLayout(W, H);

    // Equipment
    HOME_EQUIPMENT.forEach((cfg) => {
      const eq = new Equipment({
        scene: this, x: cfg.x, y: cfg.y,
        id: cfg.id, name: cfg.name, textureKey: cfg.tex,
        xpCost: cfg.xpCost, xpReward: cfg.xpReward,
        tokenReward: cfg.tokens, intensity: cfg.intensity,
      });
      this.equipment.push(eq);
    });

    // Player
    this.player = new Player({
      scene: this, x: W / 2, y: H - 100,
      bodyType: this.initData.playerBodyType ?? "AVERAGE",
      name: this.initData.playerName ?? "You",
      transformationStage: this.initData.playerTransformationStage ?? 0,
    });

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // Controller
    this.controller = new PlayerController(this, this.player);
    this.controller.onInteractCallback = (wx, wy) => this.tryInteract(wx, wy);

    this.incomeSystem = new IncomeSystem(this);

    EventBus.on("workout:complete", ({ xpEarned, tokensEarned, equipmentId }) => {
      const eq = this.equipment.find((e) => e.equipId === equipmentId);
      if (eq) {
        this.incomeSystem.spawnXpReward(eq.x, eq.y - 40, xpEarned);
        this.incomeSystem.spawnTokenReward(eq.x + 20, eq.y - 20, tokensEarned);
      }
      this.player.setPlayerState("IDLE");
    });

    EventBus.on("scene:switch", ({ to }) => {
      if (to !== "HomeScene") this.scene.start(to);
    });

    EventBus.emit("scene:ready", { name: "HomeScene" });
  }

  private drawHomeLayout(W: number, H: number) {
    const g = this.add.graphics();
    // Warm home floor
    g.fillStyle(0x1a160d).fillRect(0, 0, W, H);
    g.fillStyle(0x1e1a10).fillRect(20, 60, W - 40, H - 120);
    // Wood plank lines
    g.lineStyle(1, 0x2a2415, 0.8);
    for (let y = 80; y < H - 60; y += 24) g.lineBetween(20, y, W - 20, y);
    // Window (left wall)
    g.fillStyle(0x1a3a4a, 0.4).fillRect(25, 80, 40, 80);
    g.lineStyle(2, 0x4cc9f0, 0.4).strokeRect(25, 80, 40, 80);
    // Mirror (right wall)
    g.fillStyle(0x1e2235, 0.5).fillRect(W - 55, 80, 30, H * 0.45);
    g.lineStyle(2, 0x6c47ff, 0.5).strokeRect(W - 55, 80, 30, H * 0.45);
    // Wall accent
    g.lineStyle(2, 0xf59e0b, 0.3).strokeRect(20, 60, W - 40, H - 120);

    // Room label
    this.add.text(W / 2, 38, "🏠 HOME WORKOUT", {
      fontFamily: "Inter, sans-serif", fontSize: "10px",
      color: "#f59e0b", letterSpacing: 2,
    }).setOrigin(0.5).setDepth(1);
  }

  private tryInteract(worldX: number, worldY: number) {
    void worldX; void worldY;
    for (const eq of this.equipment) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, eq.x, eq.y);
      if (dist < 70 && !eq.isOccupied) {
        this.player.x = eq.x;
        this.player.y = eq.y + 50;
        this.player.setPlayerState("WORKING_OUT");
        eq.startWorkout(20_000);
        EventBus.emit("workout:started", { equipmentId: eq.equipId, intensity: eq.intensity });
        return;
      }
    }
  }

  update(_time: number, delta: number) {
    this.controller.update(delta);
    for (const eq of this.equipment) eq.updateWorkout(delta);
    for (const eq of this.equipment) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, eq.x, eq.y);
      eq.showPrompt(dist < 70 && !eq.isOccupied);
    }
    this.player.updateDepth();
  }

  shutdown() {
    EventBus.off("workout:complete");
    EventBus.off("scene:switch");
    this.controller.destroy();
  }
}
