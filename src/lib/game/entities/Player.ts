import Phaser from "phaser";

export interface PlayerConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  bodyType: "SKINNY" | "AVERAGE" | "OVERWEIGHT";
  name: string;
  transformationStage: number;
}

const BODY_TYPE_KEY: Record<string, string> = {
  SKINNY: "char_skinny",
  AVERAGE: "char_average",
  OVERWEIGHT: "char_overweight",
};

export type PlayerState = "IDLE" | "WALKING" | "INTERACTING" | "WORKING_OUT" | "MANAGING";

export class Player extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Image;
  private nameTag: Phaser.GameObjects.Text;
  private stateLabel: Phaser.GameObjects.Text;
  private playerRing: Phaser.GameObjects.Arc;
  private shadowEllipse: Phaser.GameObjects.Ellipse;

  state: PlayerState = "IDLE";
  speed = 130;

  constructor(config: PlayerConfig) {
    super(config.scene, config.x, config.y);

    // Shadow
    this.shadowEllipse = config.scene.add.ellipse(0, 20, 32, 8, 0x000000, 0.3);
    this.add(this.shadowEllipse);

    // Player ring (pulsing glow)
    this.playerRing = config.scene.add.arc(0, 0, 26, 0, 360, false, 0x6c47ff, 0.25);
    this.add(this.playerRing);

    // Character sprite
    const texKey = BODY_TYPE_KEY[config.bodyType] ?? "char_average";
    this.sprite = config.scene.add.image(0, 0, texKey).setScale(0.75);
    this.add(this.sprite);

    // Name tag
    this.nameTag = config.scene.add.text(0, -36, `▶ ${config.name}`, {
      fontFamily: "Inter, sans-serif",
      fontSize: "10px",
      color: "#a78bfa",
      backgroundColor: "#00000088",
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
    this.add(this.nameTag);

    // State label (hidden by default)
    this.stateLabel = config.scene.add.text(0, 30, "", {
      fontFamily: "Inter, sans-serif",
      fontSize: "9px",
      color: "#00d4aa",
      backgroundColor: "#00000088",
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setAlpha(0);
    this.add(this.stateLabel);

    (config.scene.add as Phaser.GameObjects.GameObjectFactory).existing(this as unknown as Phaser.GameObjects.GameObject);

    // Pulsing ring animation
    config.scene.tweens.add({
      targets: this.playerRing,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Idle bob
    config.scene.tweens.add({
      targets: this.sprite,
      y: -4,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  setPlayerState(newState: PlayerState) {
    if (this.state === newState) return;
    this.state = newState;

    // Visual feedback
    const labels: Partial<Record<PlayerState, string>> = {
      WORKING_OUT: "💪 Working out...",
      MANAGING: "⚙️ Managing...",
      INTERACTING: "👆 Interacting...",
    };

    const label = labels[newState];
    if (label) {
      this.stateLabel.setText(label).setAlpha(1);
    } else {
      this.stateLabel.setAlpha(0);
    }

    // Speed adjustments
    this.speed = newState === "INTERACTING" ? 60 : newState === "WORKING_OUT" ? 0 : 130;

    // Workout bounce animation
    if (newState === "WORKING_OUT") {
      this.scene.tweens.killTweensOf(this.sprite);
      this.scene.tweens.add({ targets: this.sprite, y: -12, duration: 400, yoyo: true, repeat: -1, ease: "Bounce.easeOut" });
    } else if (newState === "IDLE") {
      this.scene.tweens.killTweensOf(this.sprite);
      this.scene.tweens.add({ targets: this.sprite, y: -4, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (newState === "WALKING") {
      this.scene.tweens.killTweensOf(this.sprite);
      this.scene.tweens.add({ targets: this.sprite, scaleX: 1, duration: 200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  // Update depth for isometric sorting
  updateDepth() {
    this.setDepth(this.y + 32);
  }
}
