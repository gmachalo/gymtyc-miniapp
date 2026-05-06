import Phaser from "phaser";
import { Player } from "@/lib/game/entities/Player";

// ── Joystick config ──────────────────────────────────────────────────────────
const JOYSTICK_RADIUS = 50;

export class PlayerController {
  private scene: Phaser.Scene;
  private player: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };

  // Virtual joystick state
  private joystickBase!: Phaser.GameObjects.Image;
  private joystickThumb!: Phaser.GameObjects.Image;
  private joystickActive = false;
  private joystickOrigin = new Phaser.Math.Vector2();
  private joystickVector = new Phaser.Math.Vector2();
  private joystickPointerId = -1;

  // For interaction detection
  onInteractCallback?: (x: number, y: number) => void;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.setupKeyboard();
    this.setupJoystick();
  }

  private setupKeyboard() {
    if (!this.scene.input.keyboard) return;
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.wasd = {
      up:    this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  private setupJoystick() {
    const { width, height } = this.scene.scale;

    // Only show joystick on touch devices
    this.joystickBase = this.scene.add
      .image(80, height - 90, "joystick_base")
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0.6);

    this.joystickThumb = this.scene.add
      .image(80, height - 90, "joystick_thumb")
      .setScrollFactor(0)
      .setDepth(201)
      .setAlpha(0.8);

    this.scene.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      // Left side of screen = joystick, right side = interact / tap
      if (ptr.x < width * 0.45) {
        this.joystickActive = true;
        this.joystickPointerId = ptr.id;
        this.joystickOrigin.set(ptr.x, ptr.y);
        this.joystickBase.setPosition(ptr.x, ptr.y).setAlpha(0.7);
        this.joystickThumb.setPosition(ptr.x, ptr.y).setAlpha(1);
      } else {
        // Right side tap → interact callback
        this.onInteractCallback?.(ptr.worldX, ptr.worldY);
      }
    });

    this.scene.input.on("pointermove", (ptr: Phaser.Input.Pointer) => {
      if (!this.joystickActive || ptr.id !== this.joystickPointerId) return;
      const dx = ptr.x - this.joystickOrigin.x;
      const dy = ptr.y - this.joystickOrigin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(dist, JOYSTICK_RADIUS);
      const angle = Math.atan2(dy, dx);
      this.joystickThumb.setPosition(
        this.joystickOrigin.x + Math.cos(angle) * clamped,
        this.joystickOrigin.y + Math.sin(angle) * clamped
      );
      this.joystickVector.set(
        (clamped / JOYSTICK_RADIUS) * Math.cos(angle),
        (clamped / JOYSTICK_RADIUS) * Math.sin(angle)
      );
    });

    this.scene.input.on("pointerup", (ptr: Phaser.Input.Pointer) => {
      if (ptr.id !== this.joystickPointerId) return;
      this.joystickActive = false;
      this.joystickPointerId = -1;
      this.joystickVector.reset();
      this.joystickThumb.setPosition(this.joystickBase.x, this.joystickBase.y);
    });
  }

  update(delta: number) {
    if (this.player.state === "WORKING_OUT") return;

    const speed = this.player.speed;
    const dt = delta / 1000;
    let vx = 0;
    let vy = 0;

    // Keyboard input
    if (this.cursors?.left.isDown  || this.wasd?.left.isDown)  vx -= 1;
    if (this.cursors?.right.isDown || this.wasd?.right.isDown) vx += 1;
    if (this.cursors?.up.isDown    || this.wasd?.up.isDown)    vy -= 1;
    if (this.cursors?.down.isDown  || this.wasd?.down.isDown)  vy += 1;

    // Joystick input
    if (this.joystickActive) {
      vx += this.joystickVector.x;
      vy += this.joystickVector.y;
    }

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    if (vx !== 0 || vy !== 0) {
      this.player.x = Phaser.Math.Clamp(this.player.x + vx * speed * dt, 40, this.scene.scale.width - 40);
      this.player.y = Phaser.Math.Clamp(this.player.y + vy * speed * dt, 40, this.scene.scale.height - 80);
      this.player.setPlayerState("WALKING");
      this.player.updateDepth();

      // Flip sprite on horizontal direction
      const sp = this.player.getAt(2) as Phaser.GameObjects.Image;
      if (sp?.setFlipX) sp.setFlipX(vx < 0);
    } else {
      if (this.player.state === "WALKING") {
        this.player.setPlayerState("IDLE");
      }
    }
  }

  destroy() {
    this.scene.input.off("pointerdown");
    this.scene.input.off("pointermove");
    this.scene.input.off("pointerup");
  }
}
