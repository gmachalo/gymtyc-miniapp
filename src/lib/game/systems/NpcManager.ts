import Phaser from "phaser";
import { Npc } from "@/lib/game/entities/Npc";
import { Equipment } from "@/lib/game/entities/Equipment";

const MAX_NPCS = 10;
const SPAWN_INTERVAL_MS = 18_000; // 18s base

export class NpcManager {
  private scene: Phaser.Scene;
  private npcs: Npc[] = [];
  private equipment: Equipment[];
  private spawnTimer = 0;
  private spawnInterval: number;
  private spawnX: number;
  private spawnY: number;
  private exitX: number;
  private exitY: number;
  private gymReputation: number;

  constructor(
    scene: Phaser.Scene,
    equipment: Equipment[],
    spawnPoint: { x: number; y: number },
    exitPoint: { x: number; y: number },
    gymReputation = 50
  ) {
    this.scene = scene;
    this.equipment = equipment;
    this.spawnX = spawnPoint.x;
    this.spawnY = spawnPoint.y;
    this.exitX = exitPoint.x;
    this.exitY = exitPoint.y;
    this.gymReputation = gymReputation;
    // Better reputation → faster spawn
    this.spawnInterval = Math.max(8_000, SPAWN_INTERVAL_MS - gymReputation * 60);
  }

  update(delta: number) {
    this.spawnTimer += delta;

    // Spawn new NPC
    if (this.spawnTimer >= this.spawnInterval && this.npcs.length < MAX_NPCS) {
      this.spawnTimer = 0;
      this.spawnNpc();
    }

    // Update active NPCs
    for (const npc of [...this.npcs]) {
      if (npc.npcState === "DONE") {
        this.npcs = this.npcs.filter((n) => n !== npc);
        continue;
      }

      if (npc.npcState === "WORKING_OUT") {
        const done = npc.updateWorkout(delta);
        if (done) {
          npc.npcState = "WALKING_OUT";
          npc.walkTo(this.scene, this.exitX, this.exitY, () => npc.leave());
        }
      }

      if (npc.npcState === "WAITING") {
        // Decrease satisfaction while waiting (0.5% per second)
        npc.decreaseSatisfaction(0.0005 * delta);
      }
    }
  }

  private spawnNpc() {
    const payAmount = Math.floor(5 + this.gymReputation * 0.2 + Math.random() * 10);
    const npc = new Npc(this.scene, this.spawnX, this.spawnY, payAmount);
    this.npcs.push(npc);

    // Find free equipment
    const free = this.equipment.filter((e) => !e.isOccupied);
    if (free.length === 0) {
      // No free equipment — NPC waits briefly then leaves
      npc.npcState = "WAITING";
      this.scene.time.delayedCall(12_000, () => {
        if (npc.npcState === "WAITING") {
          npc.npcState = "WALKING_OUT";
          npc.walkTo(this.scene, this.exitX, this.exitY, () => npc.leave(true));
        }
      });
      return;
    }

    // Pick random free equipment
    const target = free[Math.floor(Math.random() * free.length)];
    npc.targetEquipmentId = target.equipId;
    npc.npcState = "WALKING_TO_EQUIPMENT";

    npc.walkTo(this.scene, target.x, target.y, () => {
      if (target.isOccupied) {
        // Equipment was taken — find another or leave
        npc.npcState = "WALKING_OUT";
        npc.walkTo(this.scene, this.exitX, this.exitY, () => npc.leave(true));
        return;
      }
      target.isOccupied = true;
      npc.startWorkout();
      // Release equipment when NPC is done (handled in update)
      this.scene.time.delayedCall(30_000, () => {
        target.isOccupied = false;
      });
    });
  }

  setReputation(rep: number) {
    this.gymReputation = rep;
    this.spawnInterval = Math.max(8_000, SPAWN_INTERVAL_MS - rep * 60);
  }

  getNpcCount() {
    return this.npcs.length;
  }
}
