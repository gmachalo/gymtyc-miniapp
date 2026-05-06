import Phaser from "phaser";
import { EventBus } from "@/lib/game/EventBus";

// Generates passive income every tick based on gym tier & active NPCs
export class PassiveIncomeSystem {
  private scene: Phaser.Scene;
  private incomePerSec: number;
  private pendingPool = 0;
  private tickTimer = 0;
  private readonly TICK_INTERVAL = 5000; // emit every 5s
  private boostMultiplier = 1;
  private boostTimer = 0;
  private boostDuration = 0;
  private floatingTextPool: Phaser.GameObjects.Text[] = [];

  // Income collection zones — positions of cash registers
  private collectZones: Array<{ x: number; y: number; id: string; accumulated: number }> = [];

  constructor(scene: Phaser.Scene, baseIncomeSec: number) {
    this.scene = scene;
    this.incomePerSec = baseIncomeSec;
    this.initTextPool();
  }

  private initTextPool() {
    for (let i = 0; i < 12; i++) {
      const t = this.scene.add.text(0, 0, "", {
        fontFamily: "Inter, sans-serif",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#00d4aa",
        stroke: "#000000",
        strokeThickness: 4,
        shadow: { blur: 8, color: "#00d4aa", fill: true },
      }).setAlpha(0).setDepth(600);
      this.floatingTextPool.push(t);
    }
  }

  addCollectZone(id: string, x: number, y: number) {
    this.collectZones.push({ id, x, y, accumulated: 0 });
  }

  activateBoost(multiplier: number, durationMs: number) {
    this.boostMultiplier = multiplier;
    this.boostDuration = durationMs;
    this.boostTimer = 0;
    EventBus.emit("boost:activated", { multiplier, durationMs });
  }

  update(delta: number, npcCount: number) {
    // Boost timer
    if (this.boostTimer < this.boostDuration) {
      this.boostTimer += delta;
      if (this.boostTimer >= this.boostDuration) {
        this.boostMultiplier = 1;
        EventBus.emit("boost:expired", {});
      }
    }

    // Income tick
    this.tickTimer += delta;
    if (this.tickTimer >= this.TICK_INTERVAL) {
      this.tickTimer = 0;
      const earned = this.incomePerSec * (this.TICK_INTERVAL / 1000)
        * (1 + npcCount * 0.1)
        * this.boostMultiplier;
      const amount = Math.floor(earned);

      if (amount > 0) {
        this.pendingPool += amount;

        // Distribute across collect zones
        if (this.collectZones.length > 0) {
          const perZone = Math.floor(amount / this.collectZones.length);
          this.collectZones.forEach((z) => {
            z.accumulated += perZone;
            this.spawnFloat(z.x, z.y - 40, `+${perZone}`, "#ffd700");
          });
        }

        EventBus.emit("income:tick", { amount, pendingTotal: this.pendingPool });
      }
    }
  }

  collectZoneIncome(zoneId: string): number {
    const zone = this.collectZones.find((z) => z.id === zoneId);
    if (!zone || zone.accumulated <= 0) return 0;
    const amount = zone.accumulated;
    zone.accumulated = 0;
    return amount;
  }

  collectAll(): number {
    const total = this.pendingPool;
    this.pendingPool = 0;
    this.collectZones.forEach((z) => { z.accumulated = 0; });
    return total;
  }

  getPending() { return this.pendingPool; }
  getBoostMultiplier() { return this.boostMultiplier; }
  getBoostRemaining() { return Math.max(0, this.boostDuration - this.boostTimer); }

  spawnFloat(x: number, y: number, text: string, color = "#ffd700") {
    const available = this.floatingTextPool.find((t) => t.alpha === 0);
    if (!available) return;
    available.setText(text).setColor(color).setPosition(x, y).setAlpha(1).setScale(0.6);
    this.scene.tweens.add({
      targets: available,
      y: y - 64,
      alpha: 0,
      scale: 1.1,
      duration: 1600,
      ease: "Cubic.easeOut",
      onComplete: () => available.setAlpha(0),
    });
  }

  setIncomePerSec(n: number) { this.incomePerSec = n; }
}
