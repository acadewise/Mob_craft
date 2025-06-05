import { BlockTypes } from './BlockTypes.js';

export class AIEntity {
    constructor(world, position = { x: 0, y: 20, z: 0 }) {
        this.world = world;
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.targetPosition = null;
        this.mesh = null;
        
        // AI settings
        this.speed = 3;
        this.jumpHeight = 6;
        this.gravity = -25;
        this.onGround = false;
        this.height = 1.8;
        this.width = 0.6;
        
        // AI behavior
        this.state = 'wandering'; // wandering, building, destroying, following, aggressive
        this.buildingTarget = null;
        this.actionCooldown = 0;
        this.pathfindingCooldown = 0;
        this.selectedBlockType = this.getRandomBlockType();
        this.aggressionLevel = Math.random(); // 0-1, higher = more aggressive
        
        // Stats
        this.blocksPlaced = 0;
        this.blocksBroken = 0;
        
        this.createMesh();
        this.findNewTarget();
        
        console.log('AI Entity created at:', this.position);
    }

    getRandomBlockType() {
        const types = [BlockTypes.STONE, BlockTypes.DIRT, BlockTypes.WOOD, BlockTypes.SAND];
        return types[Math.floor(Math.random() * types.length)];
    }

    createMesh() {
        const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0xff4444,
            transparent: true,
            opacity: 0.8
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        this.world.scene.add(this.mesh);
        
        // Add a simple face
        const faceGeometry = new THREE.PlaneGeometry(0.3, 0.3);
        const faceMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        const face = new THREE.Mesh(faceGeometry, faceMaterial);
        face.position.set(0, 0.3, 0.31);
        this.mesh.add(face);
    }

    update(deltaTime) {
        this.actionCooldown = Math.max(0, this.actionCooldown - deltaTime);
        this.pathfindingCooldown = Math.max(0, this.pathfindingCooldown - deltaTime);
        
        this.updateAI(deltaTime);
        this.updatePhysics(deltaTime);
        this.updateMesh();
    }

    updateAI(deltaTime) {
        switch (this.state) {
            case 'wandering':
                this.wanderBehavior();
                break;
            case 'building':
                this.buildingBehavior();
                break;
            case 'destroying':
                this.destroyingBehavior();
                break;
            case 'following':
                this.followingBehavior();
                break;
            case 'aggressive':
                this.aggressiveBehavior();
                break;
        }
        
        // Random state changes
        if (Math.random() < 0.002) { // 0.2% chance per frame
            this.changeState();
        }
        
        // Move towards target
        if (this.targetPosition && this.pathfindingCooldown <= 0) {
            this.moveTowardsTarget(deltaTime);
        }
    }

    wanderBehavior() {
        if (!this.targetPosition || this.position.distanceTo(this.targetPosition) < 2) {
            this.findNewTarget();
        }
    }

    buildingBehavior() {
        if (this.actionCooldown <= 0 && this.targetPosition) {
            const distance = this.position.distanceTo(this.targetPosition);
            if (distance < 3) {
                this.placeBlock();
                this.actionCooldown = 1; // 1 second cooldown
            }
        }
        
        if (!this.targetPosition || this.position.distanceTo(this.targetPosition) < 1) {
            this.findBuildingTarget();
        }
    }

    destroyingBehavior() {
        if (this.actionCooldown <= 0 && this.targetPosition) {
            const distance = this.position.distanceTo(this.targetPosition);
            if (distance < 3) {
                this.breakBlock();
                this.actionCooldown = 0.8; // 0.8 second cooldown
            }
        }
        
        if (!this.targetPosition) {
            this.findDestroyTarget();
        }
    }

    followingBehavior() {
        // Follow the player
        if (window.game && window.game.player) {
            const playerPos = window.game.player.position;
            const distance = this.position.distanceTo(playerPos);
            
            if (distance > 5) {
                this.targetPosition = playerPos.clone();
            } else if (distance < 2) {
                this.targetPosition = null; // Stop following if too close
            }
        }
    }

    aggressiveBehavior() {
        // Aggressively seek player and try to block their path or destroy nearby blocks
        if (window.game && window.game.player) {
            const playerPos = window.game.player.position;
            const distance = this.position.distanceTo(playerPos);
            
            if (distance < 15) {
                // Get close to player
                this.targetPosition = playerPos.clone();
                
                // Destroy blocks near player if close enough
                if (distance < 5 && this.actionCooldown <= 0) {
                    this.destroyNearPlayer();
                    this.actionCooldown = 0.5;
                }
            } else {
                // Too far, switch to wandering
                this.state = 'wandering';
            }
        }
    }

    destroyNearPlayer() {
        if (!window.game || !window.game.player) return;
        
        const playerPos = window.game.player.position;
        
        // Look for blocks around the player to destroy
        for (let attempts = 0; attempts < 5; attempts++) {
            const x = Math.floor(playerPos.x + (Math.random() - 0.5) * 6);
            const y = Math.floor(playerPos.y + (Math.random() - 0.5) * 3);
            const z = Math.floor(playerPos.z + (Math.random() - 0.5) * 6);
            
            const blockType = this.world.getBlock(x, y, z);
            if (blockType !== BlockTypes.AIR && y > 10) {
                this.world.setBlock(x, y, z, BlockTypes.AIR);
                this.blocksBroken++;
                console.log('Aggressive AI destroyed block near player');
                break;
            }
        }
    }

    changeState() {
        const states = ['wandering', 'building', 'destroying', 'following'];
        
        // Higher aggression entities are more likely to be aggressive
        if (this.aggressionLevel > 0.7 && Math.random() < 0.3) {
            states.push('aggressive');
        }
        
        const newState = states[Math.floor(Math.random() * states.length)];
        this.state = newState;
        this.targetPosition = null;
        
        // Change block type occasionally
        if (Math.random() < 0.3) {
            this.selectedBlockType = this.getRandomBlockType();
        }
        
        console.log(`AI changed state to: ${newState}`);
    }

    findNewTarget() {
        // Find random position within 10 blocks
        const angle = Math.random() * Math.PI * 2;
        const distance = 5 + Math.random() * 10;
        
        this.targetPosition = new THREE.Vector3(
            this.position.x + Math.cos(angle) * distance,
            this.position.y,
            this.position.z + Math.sin(angle) * distance
        );
        
        // Make sure target is on solid ground
        const groundY = this.findGroundLevel(this.targetPosition.x, this.targetPosition.z);
        if (groundY !== null) {
            this.targetPosition.y = groundY + 1;
        }
    }

    findBuildingTarget() {
        // Find nearby air blocks to place blocks
        for (let attempts = 0; attempts < 10; attempts++) {
            const x = Math.floor(this.position.x + (Math.random() - 0.5) * 10);
            const y = Math.floor(this.position.y + (Math.random() - 0.5) * 5);
            const z = Math.floor(this.position.z + (Math.random() - 0.5) * 10);
            
            if (this.world.getBlock(x, y, z) === BlockTypes.AIR) {
                this.targetPosition = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5);
                this.buildingTarget = { x, y, z };
                break;
            }
        }
    }

    findDestroyTarget() {
        // Find nearby blocks to destroy (not stone/dirt foundation)
        for (let attempts = 0; attempts < 10; attempts++) {
            const x = Math.floor(this.position.x + (Math.random() - 0.5) * 8);
            const y = Math.floor(this.position.y + (Math.random() - 0.5) * 4);
            const z = Math.floor(this.position.z + (Math.random() - 0.5) * 8);
            
            const blockType = this.world.getBlock(x, y, z);
            if (blockType !== BlockTypes.AIR && y > 12) { // Don't destroy foundation
                this.targetPosition = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5);
                break;
            }
        }
    }

    moveTowardsTarget(deltaTime) {
        if (!this.targetPosition) return;
        
        const direction = this.targetPosition.clone().sub(this.position);
        const distance = direction.length();
        
        if (distance < 0.5) {
            this.targetPosition = null;
            return;
        }
        
        direction.normalize();
        
        // Apply movement
        this.velocity.x = direction.x * this.speed;
        this.velocity.z = direction.z * this.speed;
        
        // Jump if there's an obstacle
        if (this.shouldJump()) {
            if (this.onGround) {
                this.velocity.y = this.jumpHeight;
                this.onGround = false;
            }
        }
        
        this.pathfindingCooldown = 0.1; // Update pathfinding 10 times per second
    }

    shouldJump() {
        // Check if there's a block in front
        const frontX = Math.floor(this.position.x + this.velocity.x * 0.5);
        const frontZ = Math.floor(this.position.z + this.velocity.z * 0.5);
        const frontY = Math.floor(this.position.y);
        
        return this.world.isPositionSolid(frontX, frontY + 1, frontZ);
    }

    placeBlock() {
        if (this.buildingTarget) {
            const { x, y, z } = this.buildingTarget;
            if (this.world.getBlock(x, y, z) === BlockTypes.AIR) {
                this.world.setBlock(x, y, z, this.selectedBlockType);
                this.blocksPlaced++;
                console.log('AI placed block at:', x, y, z);
            }
            this.buildingTarget = null;
        }
    }

    breakBlock() {
        if (this.targetPosition) {
            const x = Math.floor(this.targetPosition.x);
            const y = Math.floor(this.targetPosition.y);
            const z = Math.floor(this.targetPosition.z);
            
            const blockType = this.world.getBlock(x, y, z);
            if (blockType !== BlockTypes.AIR) {
                this.world.setBlock(x, y, z, BlockTypes.AIR);
                this.blocksBroken++;
                console.log('AI broke block at:', x, y, z);
            }
        }
    }

    updatePhysics(deltaTime) {
        // Apply gravity
        this.velocity.y += this.gravity * deltaTime;
        
        // Calculate new position
        const newPosition = this.position.clone();
        newPosition.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Collision detection
        newPosition.x = this.checkCollisionX(newPosition.x);
        newPosition.z = this.checkCollisionZ(newPosition.z);
        newPosition.y = this.checkCollisionY(newPosition.y);
        
        this.position.copy(newPosition);
    }

    checkCollisionX(newX) {
        const positions = [
            { x: newX + this.width/2, y: this.position.y, z: this.position.z + this.width/2 },
            { x: newX + this.width/2, y: this.position.y, z: this.position.z - this.width/2 },
            { x: newX + this.width/2, y: this.position.y + this.height - 0.1, z: this.position.z + this.width/2 },
            { x: newX + this.width/2, y: this.position.y + this.height - 0.1, z: this.position.z - this.width/2 },
            
            { x: newX - this.width/2, y: this.position.y, z: this.position.z + this.width/2 },
            { x: newX - this.width/2, y: this.position.y, z: this.position.z - this.width/2 },
            { x: newX - this.width/2, y: this.position.y + this.height - 0.1, z: this.position.z + this.width/2 },
            { x: newX - this.width/2, y: this.position.y + this.height - 0.1, z: this.position.z - this.width/2 }
        ];
        
        for (const pos of positions) {
            if (this.world.isPositionSolid(pos.x, pos.y, pos.z)) {
                return this.position.x;
            }
        }
        
        return newX;
    }

    checkCollisionZ(newZ) {
        const positions = [
            { x: this.position.x + this.width/2, y: this.position.y, z: newZ + this.width/2 },
            { x: this.position.x - this.width/2, y: this.position.y, z: newZ + this.width/2 },
            { x: this.position.x + this.width/2, y: this.position.y + this.height - 0.1, z: newZ + this.width/2 },
            { x: this.position.x - this.width/2, y: this.position.y + this.height - 0.1, z: newZ + this.width/2 },
            
            { x: this.position.x + this.width/2, y: this.position.y, z: newZ - this.width/2 },
            { x: this.position.x - this.width/2, y: this.position.y, z: newZ - this.width/2 },
            { x: this.position.x + this.width/2, y: this.position.y + this.height - 0.1, z: newZ - this.width/2 },
            { x: this.position.x - this.width/2, y: this.position.y + this.height - 0.1, z: newZ - this.width/2 }
        ];
        
        for (const pos of positions) {
            if (this.world.isPositionSolid(pos.x, pos.y, pos.z)) {
                return this.position.z;
            }
        }
        
        return newZ;
    }

    checkCollisionY(newY) {
        const positions = [
            { x: this.position.x + this.width/2, y: newY, z: this.position.z + this.width/2 },
            { x: this.position.x - this.width/2, y: newY, z: this.position.z + this.width/2 },
            { x: this.position.x + this.width/2, y: newY, z: this.position.z - this.width/2 },
            { x: this.position.x - this.width/2, y: newY, z: this.position.z - this.width/2 },
            
            { x: this.position.x + this.width/2, y: newY + this.height, z: this.position.z + this.width/2 },
            { x: this.position.x - this.width/2, y: newY + this.height, z: this.position.z + this.width/2 },
            { x: this.position.x + this.width/2, y: newY + this.height, z: this.position.z - this.width/2 },
            { x: this.position.x - this.width/2, y: newY + this.height, z: this.position.z - this.width/2 }
        ];
        
        let hitGround = false;
        let hitCeiling = false;
        
        for (const pos of positions) {
            if (this.world.isPositionSolid(pos.x, pos.y, pos.z)) {
                if (this.velocity.y <= 0) {
                    hitGround = true;
                } else {
                    hitCeiling = true;
                }
            }
        }
        
        if (hitGround) {
            this.velocity.y = 0;
            this.onGround = true;
            return this.position.y;
        }
        
        if (hitCeiling) {
            this.velocity.y = 0;
            return this.position.y;
        }
        
        this.onGround = false;
        return newY;
    }

    findGroundLevel(x, z) {
        for (let y = 30; y > 5; y--) {
            if (this.world.isPositionSolid(x, y, z)) {
                return y + 1;
            }
        }
        return null;
    }

    updateMesh() {
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.position.y += this.height / 2; // Center the mesh
        }
    }

    getInfo() {
        return {
            position: this.position.clone(),
            state: this.state,
            blocksPlaced: this.blocksPlaced,
            blocksBroken: this.blocksBroken,
            onGround: this.onGround
        };
    }

    dispose() {
        if (this.mesh) {
            this.world.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }
    }
}