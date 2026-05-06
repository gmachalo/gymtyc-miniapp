import Phaser from "phaser";
import { EventBus } from "@/lib/game/EventBus";

export type NpcState = "ENTERING" | "WALKING_TO_EQUIPMENT" | "WAITING" | "WORKING_OUT" | "WALKING_OUT" | "DONE";

const NPC_EMOJIS = ["😀", "💪", "🧑", "👩", "🏃", "🤸"];
const WORKOUT_DURATION_MS = 20_000 + Math.random() * 20_000; // 20–40s

export class Npc extends Phaser.GameObjects.Container {
  readonly npcId: string;
  npcState: NpcState = "ENTERING";
  satisfaction = 100;
  targetEquipmentId: string | null = null;

  private emojiText: Phaser.GameObjects.Text;
  private satisfactionBar: Phaser.GameObjects.Graphics;
  private workoutTimer = 0;
  private readonly payAmount: number;

  constructor(scene: Phaser.Scene, x: number, y: number, payAmount: number) {
    super(scene, x, y);
    this.npcId = `npc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.payAmount = payAmount;

    // Shadow
    scene.add.ellipse(0, 16, 24, 6, 0x000000, 0.25);

    // Emoji body
    const emoji = NPC_EMOJIS[Math.floor(Math.random() * NPC_EMOJIS.length)];
    this.emojiText = scene.add
      .text(0, 0, emoji, { fontSize: "24px" })
      .setOrigin(0.5);
    this.add(this.emojiText);

    // Satisfaction bar (shown above NPC)
    this.satisfactionBar = scene.add.graphics();
    this.add(this.satisfactionBar);
    this.drawSatisfactionBar();

    scene.add.existing(this);
    this.setDepth(y);

    // Idle bob
    scene.tweens.add({
      targets: this.emojiText,
      y: -3,
      duration: 900 + Math.random() * 300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    EventBus.emit("npc:entered", { npcId: this.npcId });
  }

  private drawSatisfactionBar() {
    this.satisfactionBar.clear();
    const w = 28;
    const pct = this.satisfaction / 100;
    const color = pct > 0.6 ? 0x00d4aa : pct > 0.3 ? 0xf59e0b : 0xef4444;
    this.satisfactionBar.fillStyle(0x1a1a2e, 0.8).fillRect(-14, -28, w, 4);
    this.satisfactionBar.fillStyle(color, 1).fillRect(-14, -28, w * pct, 4);
  }

  walkTo(scene: Phaser.Scene, tx: number, ty: number, onComplete?: () => void) {
    scene.tweens.add({
      targets: this,
      x: tx,
      y: ty,
      duration: Phaser.Math.Distance.Between(this.x, this.y, tx, ty) / 0.1,
      ease: "Linear",
      onComplete,
      onUpdate: () => {
        this.setDepth(this.y);
        // Flip emoji based on direction
        this.emojiText.setFlipX(tx < this.x);
      },
    });
  }

  startWorkout() {
    this.npcState = "WORKING_OUT";
    this.workoutTimer = 0;
    this.scene.tweens.add({
      targets: this.emojiText,
      y: -8,
      scaleX: 1.2,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: "Bounce.easeOut",
    });
  }

  updateWorkout(delta: number): boolean {
    if (this.npcState !== "WORKING_OUT") return false;
    this.workoutTimer += delta;
    // Satisfaction slowly increases during workout
    this.satisfaction = Math.min(100, this.satisfaction + 0.005 * delta);
    this.drawSatisfactionBar();
    return this.workoutTimer >= WORKOUT_DURATION_MS;
  }

  decreaseSatisfaction(amount: number) {
    this.satisfaction = Math.max(0, this.satisfaction - amount);
    this.drawSatisfactionBar();
    if (this.satisfaction <= 0) {
      this.leave(true);
    }
  }

  leave(dissatisfied = false) {
    this.npcState = "DONE";
    this.scene.tweens.killTweensOf(this.emojiText);
    if (!dissatisfied) {
      EventBus.emit("npc:paid", { amount: this.payAmount });
    } else {
      EventBus.emit("npc:left_dissatisfied", { npcId: this.npcId });
    }
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y + 20,
      duration: 500,
      onComplete: () => this.destroy(),
    });
  }
}
