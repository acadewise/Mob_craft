import { AIEntity } from './AIEntity.js';

export class AIManager {
    constructor(world) {
        this.world = world;
        this.entities = [];
        this.maxEntities = 5;
        this.spawnCooldown = 0;
        this.spawnInterval = 30; // Spawn new AI every 30 seconds
        
        console.log('AI Manager initialized');
        this.spawnInitialEntities();
    }

    spawnInitialEntities() {
        // Spawn 3 AI entities at start
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.spawnEntity();
            }, i * 5000); // Stagger spawning
        }
    }

    spawnEntity() {
        if (this.entities.length >= this.maxEntities) return;

        // Find spawn position away from player
        let spawnPos = this.findSpawnPosition();
        if (!spawnPos) return;

        const entity = new AIEntity(this.world, spawnPos);
        this.entities.push(entity);
        
        console.log(`Spawned AI entity ${this.entities.length}/${this.maxEntities}`);
    }

    findSpawnPosition() {
        const attempts = 20;
        const playerPos = window.game?.player?.position || { x: 0, y: 20, z: 0 };
        
        for (let i = 0; i < attempts; i++) {
            // Spawn 15-30 blocks away from player
            const angle = Math.random() * Math.PI * 2;
            const distance = 15 + Math.random() * 15;
            
            const x = playerPos.x + Math.cos(angle) * distance;
            const z = playerPos.z + Math.sin(angle) * distance;
            
            // Find ground level
            const groundY = this.findGroundLevel(x, z);
            if (groundY !== null && groundY > 10) {
                return { x, y: groundY + 1, z };
            }
        }
        
        return null;
    }

    findGroundLevel(x, z) {
        for (let y = 40; y > 8; y--) {
            if (this.world.isPositionSolid(x, y, z)) {
                return y;
            }
        }
        return null;
    }

    update(deltaTime) {
        this.spawnCooldown -= deltaTime;
        
        // Update all entities
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            entity.update(deltaTime);
            
            // Remove entities that fall too far down
            if (entity.position.y < -10) {
                entity.dispose();
                this.entities.splice(i, 1);
                console.log('Removed fallen AI entity');
            }
        }
        
        // Spawn new entities periodically
        if (this.spawnCooldown <= 0 && this.entities.length < this.maxEntities) {
            this.spawnEntity();
            this.spawnCooldown = this.spawnInterval;
        }
    }

    getEntityCount() {
        return this.entities.length;
    }

    getEntitiesInfo() {
        return this.entities.map((entity, index) => ({
            id: index,
            ...entity.getInfo()
        }));
    }

    removeAllEntities() {
        this.entities.forEach(entity => entity.dispose());
        this.entities = [];
    }

    dispose() {
        this.removeAllEntities();
    }
}