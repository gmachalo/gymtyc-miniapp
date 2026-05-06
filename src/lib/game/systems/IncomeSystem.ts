import Phaser from "phaser";

// Floating reward text pool — reusable text objects
const POOL_SIZE = 20;

export class IncomeSystem {
  private scene: Phaser.Scene;
  private pool: Phaser.GameObjects.Text[] = [];
  private pendingIncome = 0;
  private incomeIndicators: Map<string, Phaser.GameObjects.Image> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // Pre-create pool
    for (let i = 0; i < POOL_SIZE; i++) {
      const t = scene.add
        .text(0, 0, "", {
          fontFamily: "Inter, sans-serif",
          fontSize: "16px",
          fontStyle: "bold",
          color: "#ffd700",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setAlpha(0)
        .setDepth(500);
      this.pool.push(t);
    }
  }

  spawnReward(worldX: number, worldY: number, text: string, color = "#ffd700") {
    const available = this.pool.find((t) => t.alpha === 0);
    if (!available) return;

    available
      .setText(text)
      .setColor(color)
      .setPosition(worldX, worldY)
      .setAlpha(1)
      .setScale(0.5);

    this.scene.tweens.add({
      targets: available,
      y: worldY - 60,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 1400,
      ease: "Cubic.easeOut",
      onComplete: () => available.setAlpha(0),
    });
  }

  spawnXpReward(worldX: number, worldY: number, xp: number) {
    this.spawnReward(worldX, worldY - 20, `+${xp} XP`, "#a78bfa");
  }

  spawnTokenReward(worldX: number, worldY: number, tokens: number) {
    this.spawnReward(worldX, worldY, `+${tokens} 🪙`, "#ffd700");
  }

  spawnNpcPay(worldX: number, worldY: number, amount: number) {
    this.spawnReward(worldX, worldY, `💰 +${amount}`, "#00d4aa");
    this.pendingIncome += amount;
  }

  addIncomeIndicator(zoneId: string, x: number, y: number) {
    if (this.incomeIndicators.has(zoneId)) return;
    const ind = this.scene.add
      .image(x, y - 20, "income_indicator")
      .setDepth(300);

    // Pulse animation
    this.scene.tweens.add({
      targets: ind,
      y: y - 28,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.incomeIndicators.set(zoneId, ind);
  }

  removeIncomeIndicator(zoneId: string) {
    const ind = this.incomeIndicators.get(zoneId);
    if (ind) {
      this.scene.tweens.killTweensOf(ind);
      ind.destroy();
      this.incomeIndicators.delete(zoneId);
    }
  }

  collectPending(): number {
    const amount = this.pendingIncome;
    this.pendingIncome = 0;
    return amount;
  }

  getPending(): number {
    return this.pendingIncome;
  }
}
