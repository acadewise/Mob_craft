import { BlockTypes } from './BlockTypes.js';

export class Player {
    constructor(camera, world) {
        this.camera = camera;
        this.world = world;
        
        // Player state
        this.position = new THREE.Vector3(0, 25, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.onGround = false;
        
        // Player settings
        this.height = 1.8;
        this.width = 0.6;
        this.speed = 5;
        this.jumpHeight = 8;
        this.gravity = -25;
        
        // Block interaction
        this.selectedBlockType = BlockTypes.GRASS;
        this.reachDistance = 5;
        
        // Camera settings
        this.mouseSensitivity = 0.002;
        this.pitch = 0;
        this.yaw = 0;
        
        // Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };
        
        this.setupCamera();
        this.updateCameraPosition();
        
        console.log('Player initialized at position:', this.position);
    }

    setupCamera() {
        // Set initial camera rotation
        this.camera.rotation.order = 'YXZ';
    }

    update(deltaTime) {
        const oldPosition = this.position.clone();
        
        this.handleMovement(deltaTime);
        this.handlePhysics(deltaTime);
        this.updateCameraPosition();
        this.updateWorldChunks();
        
        // Track player movement for analytics
        if (window.game && window.game.analytics && oldPosition.distanceTo(this.position) > 0.1) {
            window.game.analytics.trackGameplay('playerMoved', { position: this.position });
        }
    }

    handleMovement(deltaTime) {
        const moveVector = new THREE.Vector3(0, 0, 0);
        
        // Calculate movement direction based on camera orientation
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);
        
        forward.applyQuaternion(this.camera.quaternion);
        right.applyQuaternion(this.camera.quaternion);
        
        // Remove Y component for horizontal movement
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();
        
        // Apply movement input
        if (this.keys.forward) {
            moveVector.add(forward);
        }
        if (this.keys.backward) {
            moveVector.sub(forward);
        }
        if (this.keys.left) {
            moveVector.sub(right);
        }
        if (this.keys.right) {
            moveVector.add(right);
        }
        
        // Normalize diagonal movement
        if (moveVector.length() > 0) {
            moveVector.normalize();
            moveVector.multiplyScalar(this.speed);
            
            // Apply movement to velocity (X and Z only)
            this.velocity.x = moveVector.x;
            this.velocity.z = moveVector.z;
        } else {
            // Stop horizontal movement when no input
            this.velocity.x = 0;
            this.velocity.z = 0;
        }
        
        // Handle jumping
        if (this.keys.jump && this.onGround) {
            this.velocity.y = this.jumpHeight;
            this.onGround = false;
        }
    }

    handlePhysics(deltaTime) {
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
                return this.position.x; // Return old position if collision
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
                return this.position.z; // Return old position if collision
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
                    // Falling or on ground
                    hitGround = true;
                } else {
                    // Rising and hit ceiling
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

    updateCameraPosition() {
        // Position camera at player's eye level
        this.camera.position.copy(this.position);
        this.camera.position.y += this.height - 0.2; // Eye height
        
        // Apply rotation
        this.camera.rotation.x = this.pitch;
        this.camera.rotation.y = this.yaw;
    }

    updateWorldChunks() {
        // Update world chunks based on player position
        this.world.updateChunksAroundPlayer(this.position.x, this.position.z);
    }

    // Handle mouse movement for looking around
    handleMouseMove(deltaX, deltaY) {
        this.yaw -= deltaX * this.mouseSensitivity;
        this.pitch -= deltaY * this.mouseSensitivity;
        
        // Clamp pitch to prevent over-rotation
        this.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.pitch));
    }

    // Block interaction methods
    breakBlock() {
        const raycast = this.getRaycastResult();
        if (raycast.hit) {
            console.log('Breaking block at:', raycast.position);
            this.world.setBlock(raycast.position.x, raycast.position.y, raycast.position.z, BlockTypes.AIR);
            
            // Track block breaking for analytics
            if (window.game && window.game.analytics) {
                window.game.analytics.trackGameplay('blockBroken', { position: raycast.position });
            }
        }
    }

    placeBlock() {
        const placePos = this.getPlacePosition();
        if (placePos) {
            // Check if position is not occupied by player
            const distance = this.position.distanceTo(new THREE.Vector3(placePos.x + 0.5, placePos.y + 0.5, placePos.z + 0.5));
            if (distance > 1.5) { // Minimum distance to place
                console.log('Placing block at:', placePos, 'Type:', this.selectedBlockType);
                this.world.setBlock(placePos.x, placePos.y, placePos.z, this.selectedBlockType);
                
                // Track block placing for analytics
                if (window.game && window.game.analytics) {
                    window.game.analytics.trackGameplay('blockPlaced', { 
                        position: placePos, 
                        blockType: this.selectedBlockType 
                    });
                }
            }
        }
    }

    getRaycastResult() {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        
        return this.world.raycastBlock(this.camera.position, direction, this.reachDistance);
    }

    getPlacePosition() {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        
        return this.world.getPlacePosition(this.camera.position, direction, this.reachDistance);
    }

    setSelectedBlockType(blockType) {
        this.selectedBlockType = blockType;
        console.log('Selected block type:', this.world.blockTypeManager.getBlockName(blockType));
    }

    // Key input methods
    setKey(key, pressed) {
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = pressed;
        }
    }

    // Get player info for UI
    getInfo() {
        return {
            position: this.position.clone(),
            velocity: this.velocity.clone(),
            onGround: this.onGround,
            selectedBlock: this.world.blockTypeManager.getBlockName(this.selectedBlockType),
            chunk: {
                x: Math.floor(this.position.x / 16),
                z: Math.floor(this.position.z / 16)
            }
        };
    }
}
