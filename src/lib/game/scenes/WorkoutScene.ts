import Phaser from "phaser";
import { EventBus } from "@/lib/game/EventBus";

// First-person mirror workout scene — triggered when player starts a workout
export class WorkoutScene extends Phaser.Scene {
  private repCount = 0;
  private targetReps = 12;
  private formAccuracy = 80;
  private heartRate = 120;
  private effortPct = 0;
  private intensity: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";
  private equipmentId = "";
  private xpReward = 12;
  private tokenReward = 5;

  // UI elements
  private repText!: Phaser.GameObjects.Text;
  private formBar!: Phaser.GameObjects.Graphics;
  private effortBar!: Phaser.GameObjects.Graphics;
  private hrText!: Phaser.GameObjects.Text;
  private mirrorChar!: Phaser.GameObjects.Text;
  private tapZone!: Phaser.GameObjects.Rectangle;
  private tapRipple!: Phaser.GameObjects.Arc;
  private comboText!: Phaser.GameObjects.Text;
  private combo = 0;
  private formOscDir = 1;
  private formOscTimer = 0;
  private workoutTimer = 0;
  private totalDuration = 0;
  private doneButton!: Phaser.GameObjects.Container;
  private isComplete = false;

  constructor() {
    super({ key: "WorkoutScene" });
  }

  init(data: { equipmentId?: string; intensity?: "LOW" | "MEDIUM" | "HIGH"; xpReward?: number; tokenReward?: number }) {
    this.equipmentId = data.equipmentId ?? "";
    this.intensity = data.intensity ?? "MEDIUM";
    this.xpReward = data.xpReward ?? 12;
    this.tokenReward = data.tokenReward ?? 5;
    this.repCount = 0;
    this.combo = 0;
    this.formAccuracy = 80;
    this.effortPct = 0;
    this.isComplete = false;
    this.targetReps = this.intensity === "HIGH" ? 15 : this.intensity === "LOW" ? 8 : 12;
    this.totalDuration = this.intensity === "HIGH" ? 25_000 : this.intensity === "LOW" ? 15_000 : 20_000;
    this.heartRate = this.intensity === "HIGH" ? 145 : this.intensity === "LOW" ? 105 : 125;
    this.workoutTimer = 0;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2;

    // Dark immersive background
    this.cameras.main.setBackgroundColor(0x050508);

    // ── Mirror wall ───────────────────────────────────────────────
    const g = this.add.graphics();
    // Mirror frame
    g.fillStyle(0x1a1a2e).fillRect(cx - 100, 40, 200, H * 0.55);
    g.lineStyle(3, 0x6c47ff, 0.8).strokeRect(cx - 100, 40, 200, H * 0.55);
    // Mirror sheen
    g.fillStyle(0xffffff, 0.03).fillRect(cx - 95, 45, 30, H * 0.53);
    // Floor
    g.fillStyle(0x0d0d14).fillRect(0, H * 0.65, W, H * 0.35);
    g.lineStyle(1, 0x1e1e30).lineBetween(0, H * 0.65, W, H * 0.65);

    // "MIRROR" label
    this.add.text(cx, 28, "MIRROR VIEW", {
      fontFamily: "Inter, sans-serif", fontSize: "9px",
      color: "#4cc9f0", letterSpacing: 3,
    }).setOrigin(0.5);

    // ── Reflected character in mirror ─────────────────────────────
    this.mirrorChar = this.add.text(cx, H * 0.35, "🏋️", {
      fontSize: `${this.intensity === "HIGH" ? "52px" : "44px"}`,
    }).setOrigin(0.5).setDepth(2);

    this.tweens.add({
      targets: this.mirrorChar,
      y: H * 0.35 - 14,
      scaleX: 1.15,
      scaleY: 0.9,
      duration: this.intensity === "HIGH" ? 380 : 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // ── Stats HUD (top row) ────────────────────────────────────────
    const topY = H * 0.63;

    // Rep counter
    this.add.text(cx - 80, topY, "REPS", {
      fontFamily: "Inter, sans-serif", fontSize: "9px", color: "#6b7280", letterSpacing: 2,
    }).setOrigin(0.5);
    this.repText = this.add.text(cx - 80, topY + 18, `0/${this.targetReps}`, {
      fontFamily: "Inter, sans-serif", fontSize: "22px", fontStyle: "bold", color: "#ffffff",
    }).setOrigin(0.5);

    // HR
    this.add.text(cx + 80, topY, "HR (BPM)", {
      fontFamily: "Inter, sans-serif", fontSize: "9px", color: "#6b7280", letterSpacing: 2,
    }).setOrigin(0.5);
    this.hrText = this.add.text(cx + 80, topY + 18, `${this.heartRate}`, {
      fontFamily: "Inter, sans-serif", fontSize: "22px", fontStyle: "bold", color: "#ef4444",
    }).setOrigin(0.5);

    // ── Form accuracy bar ─────────────────────────────────────────
    this.add.text(cx, topY + 52, "FORM ACCURACY", {
      fontFamily: "Inter, sans-serif", fontSize: "9px", color: "#6b7280", letterSpacing: 2,
    }).setOrigin(0.5);
    this.formBar = this.add.graphics();
    this.drawBar(this.formBar, cx, topY + 64, this.formAccuracy / 100, 0x00d4aa, 160);

    // ── Effort bar ────────────────────────────────────────────────
    this.add.text(cx, topY + 84, "EFFORT", {
      fontFamily: "Inter, sans-serif", fontSize: "9px", color: "#6b7280", letterSpacing: 2,
    }).setOrigin(0.5);
    this.effortBar = this.add.graphics();
    this.drawBar(this.effortBar, cx, topY + 96, 0, 0x6c47ff, 160);

    // ── Tap zone (rhythm input) ────────────────────────────────────
    const tapY = topY + 130;
    this.tapZone = this.add.rectangle(cx, tapY, W - 48, 52, 0x6c47ff, 0.12)
      .setInteractive()
      .setStrokeStyle(2, 0x6c47ff, 0.5);

    this.add.text(cx, tapY, "TAP TO REP  ▶  HOLD FOR EFFORT", {
      fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#a78bfa",
    }).setOrigin(0.5);

    this.tapRipple = this.add.arc(cx, tapY, 0, 0, 360, false, 0x6c47ff, 0.4).setDepth(10);

    this.comboText = this.add.text(cx, tapY - 36, "", {
      fontFamily: "Inter, sans-serif", fontSize: "14px", fontStyle: "bold", color: "#ffd700",
      stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11);

    this.tapZone.on("pointerdown", () => this.onTap());
    this.input.keyboard?.on("keydown-SPACE", () => this.onTap());

    // ── Back button ───────────────────────────────────────────────
    const backBtn = this.add.text(24, 18, "← BACK", {
      fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6b7280",
      backgroundColor: "#0d0d1488", padding: { x: 8, y: 4 },
    }).setInteractive();
    backBtn.on("pointerdown", () => this.exitScene(false));

    // ── Done button (appears when reps complete) ──────────────────
    this.doneButton = this.add.container(cx, tapY).setAlpha(0);
    const doneBg = this.add.rectangle(0, 0, 200, 48, 0x6c47ff).setInteractive();
    const doneLabel = this.add.text(0, 0, "✅ FINISH WORKOUT", {
      fontFamily: "Inter, sans-serif", fontSize: "13px", fontStyle: "bold", color: "#fff",
    }).setOrigin(0.5);
    this.doneButton.add([doneBg, doneLabel]);
    doneBg.on("pointerdown", () => this.exitScene(true));

    EventBus.emit("workout:firstperson_toggle", { enabled: true });
  }

  private drawBar(g: Phaser.GameObjects.Graphics, cx: number, y: number, pct: number, color: number, width: number) {
    g.clear();
    g.fillStyle(0x1a1a2e).fillRoundedRect(cx - width / 2, y - 4, width, 8, 4);
    if (pct > 0) g.fillStyle(color).fillRoundedRect(cx - width / 2, y - 4, width * pct, 8, 4);
  }

  private onTap() {
    if (this.isComplete) return;
    this.repCount++;
    this.combo++;
    this.effortPct = Math.min(1, this.effortPct + 0.08);

    this.repText.setText(`${this.repCount}/${this.targetReps}`);

    // Ripple animation
    this.tapRipple.setRadius(0).setAlpha(0.6);
    this.tweens.add({
      targets: this.tapRipple,
      radius: 60,
      alpha: 0,
      duration: 400,
      ease: "Cubic.easeOut",
    });

    // Combo text
    if (this.combo >= 3) {
      this.comboText.setText(`🔥 x${this.combo} COMBO!`).setAlpha(1);
      this.tweens.add({ targets: this.comboText, alpha: 0, delay: 800, duration: 400 });
      this.formAccuracy = Math.min(100, this.formAccuracy + 3);
    }

    // HR rises with reps
    this.heartRate = Math.min(185, this.heartRate + 2);
    this.hrText.setText(`${this.heartRate}`);

    // Check completion
    if (this.repCount >= this.targetReps) {
      this.completeWorkout();
    }
  }

  private completeWorkout() {
    this.isComplete = true;
    this.tweens.add({ targets: this.doneButton, alpha: 1, duration: 400 });
    this.tweens.killTweensOf(this.mirrorChar);
    this.mirrorChar.setText("🏆");
  }

  private exitScene(success: boolean) {
    if (success) {
      const bonus = this.combo >= 5 ? Math.ceil(this.xpReward * 0.2) : 0;
      EventBus.emit("workout:complete", {
        equipmentId: this.equipmentId,
        xpEarned: this.xpReward + bonus,
        tokensEarned: this.tokenReward,
      });
    }
    EventBus.emit("workout:firstperson_toggle", { enabled: false });
    this.scene.stop("WorkoutScene");
    this.scene.resume("GymScene");
    this.scene.resume("HomeScene");
  }

  update(_time: number, delta: number) {
    if (this.isComplete) return;
    this.workoutTimer += delta;

    // Form accuracy oscillates — player must tap to keep it up
    this.formOscTimer += delta;
    if (this.formOscTimer > 800) {
      this.formOscTimer = 0;
      this.formAccuracy = Math.max(20, this.formAccuracy - 4 * this.formOscDir);
      this.formOscDir = this.formAccuracy <= 20 ? -1 : this.formAccuracy >= 100 ? 1 : this.formOscDir;
    }
    this.effortPct = Math.max(0, this.effortPct - 0.0003 * delta);

    this.drawBar(this.formBar, this.scale.width / 2, this.scale.height * 0.63 + 64, this.formAccuracy / 100, 0x00d4aa, 160);
    this.drawBar(this.effortBar, this.scale.width / 2, this.scale.height * 0.63 + 96, this.effortPct, 0x6c47ff, 160);

    // HR fluctuates
    if (Math.random() < 0.01) {
      this.heartRate += Phaser.Math.Between(-2, 2);
      this.hrText.setText(`${this.heartRate}`);
    }
  }
}
