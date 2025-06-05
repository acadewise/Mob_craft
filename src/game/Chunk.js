import { BlockTypes } from './BlockTypes.js';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;

export class Chunk {
    constructor(x, z, world) {
        this.x = x;
        this.z = z;
        this.world = world;
        
        // 3D array to store block types
        this.blocks = new Array(CHUNK_SIZE);
        for (let i = 0; i < CHUNK_SIZE; i++) {
            this.blocks[i] = new Array(CHUNK_HEIGHT);
            for (let j = 0; j < CHUNK_HEIGHT; j++) {
                this.blocks[i][j] = new Array(CHUNK_SIZE).fill(BlockTypes.AIR);
            }
        }
        
        this.mesh = null;
        this.needsUpdate = true;
        this.generated = false;
    }

    // Generate terrain for this chunk
    generate() {
        if (this.generated) return;
        
        const worldX = this.x * CHUNK_SIZE;
        const worldZ = this.z * CHUNK_SIZE;
        
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const globalX = worldX + x;
                const globalZ = worldZ + z;
                
                // Simple terrain generation using noise-like function
                const height = this.getTerrainHeight(globalX, globalZ);
                
                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    if (y < height - 3) {
                        this.blocks[x][y][z] = BlockTypes.STONE;
                    } else if (y < height - 1) {
                        this.blocks[x][y][z] = BlockTypes.DIRT;
                    } else if (y < height) {
                        this.blocks[x][y][z] = BlockTypes.GRASS;
                    } else {
                        this.blocks[x][y][z] = BlockTypes.AIR;
                    }
                }
                
                // Add some sand near water level (y = 10)
                if (height <= 12) {
                    for (let y = height - 1; y >= Math.max(8, height - 3); y--) {
                        this.blocks[x][y][z] = BlockTypes.SAND;
                    }
                }
            }
        }
        
        this.generated = true;
        this.needsUpdate = true;
    }

    // Simple terrain height generation
    getTerrainHeight(x, z) {
        // Create some variation using sin/cos functions
        const baseHeight = 15;
        const variation = 8;
        
        const height = baseHeight + 
            Math.sin(x * 0.1) * variation * 0.5 +
            Math.cos(z * 0.1) * variation * 0.5 +
            Math.sin(x * 0.05) * Math.cos(z * 0.05) * variation * 0.3;
        
        return Math.floor(Math.max(8, Math.min(CHUNK_HEIGHT - 5, height)));
    }

    // Get block at local coordinates
    getBlock(x, y, z) {
        if (x < 0 || x >= CHUNK_SIZE || 
            y < 0 || y >= CHUNK_HEIGHT || 
            z < 0 || z >= CHUNK_SIZE) {
            return BlockTypes.AIR;
        }
        return this.blocks[x][y][z];
    }

    // Set block at local coordinates
    setBlock(x, y, z, blockType) {
        if (x < 0 || x >= CHUNK_SIZE || 
            y < 0 || y >= CHUNK_HEIGHT || 
            z < 0 || z >= CHUNK_SIZE) {
            return false;
        }
        
        this.blocks[x][y][z] = blockType;
        this.needsUpdate = true;
        return true;
    }

    // Generate mesh for this chunk
    generateMesh() {
        if (!this.needsUpdate) return;
        
        // Remove old mesh
        if (this.mesh) {
            this.world.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh = null;
        }
        
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const normals = [];
        const uvs = [];
        const colors = [];
        
        // Generate faces for each block
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let y = 0; y < CHUNK_HEIGHT; y++) {
                for (let z = 0; z < CHUNK_SIZE; z++) {
                    const blockType = this.blocks[x][y][z];
                    
                    if (blockType === BlockTypes.AIR) continue;
                    
                    const worldX = this.x * CHUNK_SIZE + x;
                    const worldZ = this.z * CHUNK_SIZE + z;
                    
                    // Check each face to see if it should be rendered
                    this.addBlockFaces(
                        vertices, normals, uvs, colors,
                        x, y, z, worldX, y, worldZ, blockType
                    );
                }
            }
        }
        
        if (vertices.length === 0) {
            this.needsUpdate = false;
            return;
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        // Use vertex colors for block coloring
        const material = new THREE.MeshLambertMaterial({ 
            vertexColors: true,
            transparent: true
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.x * CHUNK_SIZE, 0, this.z * CHUNK_SIZE);
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;
        
        this.world.scene.add(this.mesh);
        this.needsUpdate = false;
    }

    addBlockFaces(vertices, normals, uvs, colors, x, y, z, worldX, worldY, worldZ, blockType) {
        const blockColor = this.world.blockTypeManager.getBlockColor(blockType);
        const color = new THREE.Color(blockColor);
        
        // Face positions relative to block center
        const faces = [
            // Front face (positive Z)
            { 
                vertices: [
                    [x-0.5, y-0.5, z+0.5], [x+0.5, y-0.5, z+0.5], [x+0.5, y+0.5, z+0.5],
                    [x-0.5, y-0.5, z+0.5], [x+0.5, y+0.5, z+0.5], [x-0.5, y+0.5, z+0.5]
                ],
                normal: [0, 0, 1],
                check: [x, y, z+1]
            },
            // Back face (negative Z)
            { 
                vertices: [
                    [x+0.5, y-0.5, z-0.5], [x-0.5, y-0.5, z-0.5], [x-0.5, y+0.5, z-0.5],
                    [x+0.5, y-0.5, z-0.5], [x-0.5, y+0.5, z-0.5], [x+0.5, y+0.5, z-0.5]
                ],
                normal: [0, 0, -1],
                check: [x, y, z-1]
            },
            // Top face (positive Y)
            { 
                vertices: [
                    [x-0.5, y+0.5, z-0.5], [x+0.5, y+0.5, z-0.5], [x+0.5, y+0.5, z+0.5],
                    [x-0.5, y+0.5, z-0.5], [x+0.5, y+0.5, z+0.5], [x-0.5, y+0.5, z+0.5]
                ],
                normal: [0, 1, 0],
                check: [x, y+1, z]
            },
            // Bottom face (negative Y)
            { 
                vertices: [
                    [x-0.5, y-0.5, z+0.5], [x+0.5, y-0.5, z+0.5], [x+0.5, y-0.5, z-0.5],
                    [x-0.5, y-0.5, z+0.5], [x+0.5, y-0.5, z-0.5], [x-0.5, y-0.5, z-0.5]
                ],
                normal: [0, -1, 0],
                check: [x, y-1, z]
            },
            // Right face (positive X)
            { 
                vertices: [
                    [x+0.5, y-0.5, z+0.5], [x+0.5, y-0.5, z-0.5], [x+0.5, y+0.5, z-0.5],
                    [x+0.5, y-0.5, z+0.5], [x+0.5, y+0.5, z-0.5], [x+0.5, y+0.5, z+0.5]
                ],
                normal: [1, 0, 0],
                check: [x+1, y, z]
            },
            // Left face (negative X)
            { 
                vertices: [
                    [x-0.5, y-0.5, z-0.5], [x-0.5, y-0.5, z+0.5], [x-0.5, y+0.5, z+0.5],
                    [x-0.5, y-0.5, z-0.5], [x-0.5, y+0.5, z+0.5], [x-0.5, y+0.5, z-0.5]
                ],
                normal: [-1, 0, 0],
                check: [x-1, y, z]
            }
        ];
        
        faces.forEach(face => {
            const [checkX, checkY, checkZ] = face.check;
            const neighborBlock = this.getBlockOrNeighbor(checkX, checkY, checkZ);
            
            // Only render face if neighbor is air or transparent
            if (neighborBlock === BlockTypes.AIR || 
                this.world.blockTypeManager.isBlockTransparent(neighborBlock)) {
                
                // Add vertices
                face.vertices.forEach(vertex => {
                    vertices.push(...vertex);
                });
                
                // Add normals
                for (let i = 0; i < 6; i++) {
                    normals.push(...face.normal);
                }
                
                // Add UVs
                const faceUVs = [
                    [0, 0], [1, 0], [1, 1],
                    [0, 0], [1, 1], [0, 1]
                ];
                faceUVs.forEach(uv => {
                    uvs.push(...uv);
                });
                
                // Add colors
                for (let i = 0; i < 6; i++) {
                    colors.push(color.r, color.g, color.b);
                }
            }
        });
    }

    getBlockOrNeighbor(x, y, z) {
        // If within chunk bounds, return local block
        if (x >= 0 && x < CHUNK_SIZE && 
            y >= 0 && y < CHUNK_HEIGHT && 
            z >= 0 && z < CHUNK_SIZE) {
            return this.blocks[x][y][z];
        }
        
        // Otherwise, get from world (neighboring chunks)
        const worldX = this.x * CHUNK_SIZE + x;
        const worldZ = this.z * CHUNK_SIZE + z;
        return this.world.getBlock(worldX, y, worldZ);
    }

    // Cleanup
    dispose() {
        if (this.mesh) {
            this.world.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh = null;
        }
    }
}
