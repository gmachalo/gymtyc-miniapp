import Phaser from "phaser";
import { EventBus } from "@/lib/game/EventBus";

export interface EquipmentConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  id: string;
  name: string;
  textureKey: string;
  xpCost: number;
  xpReward: number;
  tokenReward: number;
  intensity: "LOW" | "MEDIUM" | "HIGH";
  level?: number;
}

export class Equipment extends Phaser.GameObjects.Container {
  readonly equipId: string;
  readonly equipName: string;
  readonly xpCost: number;
  readonly xpReward: number;
  readonly tokenReward: number;
  readonly intensity: "LOW" | "MEDIUM" | "HIGH";
  level: number;
  isOccupied = false;
  interactionZone: Phaser.Geom.Circle;

  private sprite: Phaser.GameObjects.Image;
  private labelText: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private workoutTimer = 0;
  private workoutDuration = 0;
  private promptText: Phaser.GameObjects.Text;
  private glowEffect: Phaser.GameObjects.Arc;

  constructor(config: EquipmentConfig) {
    super(config.scene, config.x, config.y);

    this.equipId = config.id;
    this.equipName = config.name;
    this.xpCost = config.xpCost;
    this.xpReward = config.xpReward;
    this.tokenReward = config.tokenReward;
    this.intensity = config.intensity;
    this.level = config.level ?? 1;
    this.interactionZone = new Phaser.Geom.Circle(config.x, config.y, 64);

    // Glow ring (shows when player is near)
    this.glowEffect = config.scene.add
      .arc(0, 0, 36, 0, 360, false, 0x6c47ff, 0)
      .setDepth(-1);
    this.add(this.glowEffect);

    // Equipment sprite
    this.sprite = config.scene.add.image(0, 0, config.textureKey).setScale(0.9);
    this.add(this.sprite);

    // Label
    this.labelText = config.scene.add
      .text(0, 38, config.name, {
        fontFamily: "Inter, sans-serif",
        fontSize: "9px",
        color: "#a0a0b0",
        backgroundColor: "#00000066",
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5);
    this.add(this.labelText);

    // Interaction prompt (hidden until player nearby)
    this.promptText = config.scene.add
      .text(0, -50, `${config.xpCost}⚡ → +${config.xpReward}XP`, {
        fontFamily: "Inter, sans-serif",
        fontSize: "10px",
        color: "#a78bfa",
        backgroundColor: "#1a1a2ecc",
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.add(this.promptText);

    // Progress bar container
    this.progressBar = config.scene.add.graphics();
    this.add(this.progressBar);

    config.scene.add.existing(this);
    this.setDepth(config.y);
  }

  showPrompt(visible: boolean) {
    this.scene.tweens.add({
      targets: this.promptText,
      alpha: visible ? 1 : 0,
      duration: 200,
      ease: "Sine.easeInOut",
    });
    // Glow effect
    this.scene.tweens.add({
      targets: this.glowEffect,
      fillAlpha: visible ? 0.2 : 0,
      duration: 300,
    });
  }

  startWorkout(duration: number) {
    this.isOccupied = true;
    this.workoutTimer = 0;
    this.workoutDuration = duration;
    this.labelText.setText("💪 IN USE").setColor("#00d4aa");
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 1.1,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: "Bounce.easeOut",
    });
  }

  updateWorkout(delta: number): boolean {
    if (!this.isOccupied) return false;
    this.workoutTimer += delta;
    const pct = Math.min(1, this.workoutTimer / this.workoutDuration);

    // Draw progress bar
    this.progressBar.clear();
    // Background
    this.progressBar.fillStyle(0x1a1a2e, 0.8).fillRect(-28, -46, 56, 6);
    // Fill
    const fillColor = pct > 0.7 ? 0x00d4aa : 0x6c47ff;
    this.progressBar.fillStyle(fillColor, 1).fillRect(-28, -46, 56 * pct, 6);

    if (pct >= 1) {
      this.finishWorkout();
      return true;
    }
    return false;
  }

  private finishWorkout() {
    this.isOccupied = false;
    this.workoutTimer = 0;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setScale(0.9);
    this.progressBar.clear();
    this.labelText.setText(this.equipName).setColor("#a0a0b0");
    EventBus.emit("workout:complete", {
      equipmentId:  this.equipId,
      xpEarned:     this.xpReward,
      tokensEarned: this.tokenReward,
      intensity:    this.intensity,
    });
  }

  upgrade() {
    this.level++;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 200,
      yoyo: true,
      ease: "Back.easeOut",
    });
    EventBus.emit("equipment:upgraded", { equipmentId: this.equipId, newLevel: this.level });
  }
}
