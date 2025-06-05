import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './Chunk.js';
import { BlockTypes, BlockTypeManager } from './BlockTypes.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.blockTypeManager = new BlockTypeManager();
        
        // World settings
        this.renderDistance = 3; // chunks in each direction
        this.lastPlayerChunkX = null;
        this.lastPlayerChunkZ = null;
        
        console.log('World initialized');
    }

    // Generate initial chunks around spawn
    async generateChunks() {
        console.log('Generating initial chunks...');
        
        const chunkPromises = [];
        
        for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
            for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
                chunkPromises.push(this.loadChunk(x, z));
            }
        }
        
        await Promise.all(chunkPromises);
        console.log(`Generated ${chunkPromises.length} chunks`);
    }

    // Load a chunk at given chunk coordinates
    async loadChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        
        if (this.chunks.has(chunkKey)) {
            return this.chunks.get(chunkKey);
        }
        
        const chunk = new Chunk(chunkX, chunkZ, this);
        this.chunks.set(chunkKey, chunk);
        
        // Generate terrain and mesh
        chunk.generate();
        chunk.generateMesh();
        
        return chunk;
    }

    // Unload chunk
    unloadChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        const chunk = this.chunks.get(chunkKey);
        
        if (chunk) {
            chunk.dispose();
            this.chunks.delete(chunkKey);
        }
    }

    // Update world based on player position
    update(deltaTime) {
        // This would be called from the game loop if needed
        // For now, we'll keep it simple and only generate chunks on demand
    }

    // Update chunks around player position
    updateChunksAroundPlayer(playerX, playerZ) {
        const chunkX = Math.floor(playerX / CHUNK_SIZE);
        const chunkZ = Math.floor(playerZ / CHUNK_SIZE);
        
        // Only update if player moved to a different chunk
        if (chunkX === this.lastPlayerChunkX && chunkZ === this.lastPlayerChunkZ) {
            return;
        }
        
        this.lastPlayerChunkX = chunkX;
        this.lastPlayerChunkZ = chunkZ;
        
        // Load new chunks
        const loadPromises = [];
        for (let x = chunkX - this.renderDistance; x <= chunkX + this.renderDistance; x++) {
            for (let z = chunkZ - this.renderDistance; z <= chunkZ + this.renderDistance; z++) {
                const chunkKey = `${x},${z}`;
                if (!this.chunks.has(chunkKey)) {
                    loadPromises.push(this.loadChunk(x, z));
                }
            }
        }
        
        // Unload distant chunks
        const chunksToUnload = [];
        for (const [chunkKey, chunk] of this.chunks) {
            const distance = Math.max(
                Math.abs(chunk.x - chunkX),
                Math.abs(chunk.z - chunkZ)
            );
            
            if (distance > this.renderDistance + 1) {
                chunksToUnload.push([chunk.x, chunk.z]);
            }
        }
        
        chunksToUnload.forEach(([x, z]) => {
            this.unloadChunk(x, z);
        });
        
        // Wait for new chunks to load
        Promise.all(loadPromises).then(() => {
            console.log(`Loaded ${loadPromises.length} new chunks around player`);
        });
    }

    // Get block at world coordinates
    getBlock(x, y, z) {
        if (y < 0 || y >= CHUNK_HEIGHT) {
            return BlockTypes.AIR;
        }
        
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        const chunkKey = `${chunkX},${chunkZ}`;
        
        const chunk = this.chunks.get(chunkKey);
        if (!chunk || !chunk.generated) {
            return BlockTypes.AIR;
        }
        
        const localX = x - chunkX * CHUNK_SIZE;
        const localZ = z - chunkZ * CHUNK_SIZE;
        
        return chunk.getBlock(localX, y, localZ);
    }

    // Set block at world coordinates
    setBlock(x, y, z, blockType) {
        if (y < 0 || y >= CHUNK_HEIGHT) {
            return false;
        }
        
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        const chunkKey = `${chunkX},${chunkZ}`;
        
        const chunk = this.chunks.get(chunkKey);
        if (!chunk || !chunk.generated) {
            return false;
        }
        
        const localX = x - chunkX * CHUNK_SIZE;
        const localZ = z - chunkZ * CHUNK_SIZE;
        
        const success = chunk.setBlock(localX, y, localZ, blockType);
        
        if (success) {
            // Mark chunk for mesh regeneration
            chunk.generateMesh();
            
            // Also update neighboring chunks if block is on chunk boundary
            if (localX === 0) {
                this.updateNeighborChunk(chunkX - 1, chunkZ);
            } else if (localX === CHUNK_SIZE - 1) {
                this.updateNeighborChunk(chunkX + 1, chunkZ);
            }
            
            if (localZ === 0) {
                this.updateNeighborChunk(chunkX, chunkZ - 1);
            } else if (localZ === CHUNK_SIZE - 1) {
                this.updateNeighborChunk(chunkX, chunkZ + 1);
            }
        }
        
        return success;
    }

    updateNeighborChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        const chunk = this.chunks.get(chunkKey);
        if (chunk) {
            chunk.needsUpdate = true;
            chunk.generateMesh();
        }
    }

    // Raycast to find block intersection
    raycastBlock(origin, direction, maxDistance = 10) {
        const step = 0.1;
        const steps = Math.floor(maxDistance / step);
        
        for (let i = 1; i <= steps; i++) {
            const x = Math.floor(origin.x + direction.x * step * i);
            const y = Math.floor(origin.y + direction.y * step * i);
            const z = Math.floor(origin.z + direction.z * step * i);
            
            const blockType = this.getBlock(x, y, z);
            
            if (this.blockTypeManager.isBlockSolid(blockType)) {
                return {
                    hit: true,
                    position: { x, y, z },
                    blockType: blockType,
                    distance: step * i
                };
            }
        }
        
        return { hit: false };
    }

    // Get position just before hitting a block (for placing)
    getPlacePosition(origin, direction, maxDistance = 10) {
        const step = 0.1;
        const steps = Math.floor(maxDistance / step);
        let lastAirPosition = null;
        
        for (let i = 1; i <= steps; i++) {
            const x = Math.floor(origin.x + direction.x * step * i);
            const y = Math.floor(origin.y + direction.y * step * i);
            const z = Math.floor(origin.z + direction.z * step * i);
            
            const blockType = this.getBlock(x, y, z);
            
            if (this.blockTypeManager.isBlockSolid(blockType)) {
                return lastAirPosition;
            }
            
            if (blockType === BlockTypes.AIR) {
                lastAirPosition = { x, y, z };
            }
        }
        
        return lastAirPosition;
    }

    // Check if position is solid (for collision)
    isPositionSolid(x, y, z) {
        const blockType = this.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
        return this.blockTypeManager.isBlockSolid(blockType);
    }

    // Get chunk count for debugging
    getChunkCount() {
        return this.chunks.size;
    }

    // Get loaded chunk positions for debugging
    getLoadedChunks() {
        return Array.from(this.chunks.keys());
    }
}
