export const BlockTypes = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    WOOD: 4,
    SAND: 5
};

export class BlockTypeManager {
    constructor() {
        this.blockData = {
            [BlockTypes.AIR]: {
                name: 'Air',
                color: 0x000000,
                transparent: true,
                solid: false,
                texture: null
            },
            [BlockTypes.GRASS]: {
                name: 'Grass',
                color: 0x4CAF50,
                transparent: false,
                solid: true,
                texture: '/textures/grass.png'
            },
            [BlockTypes.DIRT]: {
                name: 'Dirt',
                color: 0x8B4513,
                transparent: false,
                solid: true,
                texture: null
            },
            [BlockTypes.STONE]: {
                name: 'Stone',
                color: 0x808080,
                transparent: false,
                solid: true,
                texture: null
            },
            [BlockTypes.WOOD]: {
                name: 'Wood',
                color: 0xDEB887,
                transparent: false,
                solid: true,
                texture: '/textures/wood.jpg'
            },
            [BlockTypes.SAND]: {
                name: 'Sand',
                color: 0xF4A460,
                transparent: false,
                solid: true,
                texture: '/textures/sand.jpg'
            }
        };

        this.materials = new Map();
        this.geometry = null;
        this.textureLoader = new THREE.TextureLoader();
        
        this.initializeMaterials();
        this.initializeGeometry();
    }

    initializeMaterials() {
        for (const [type, data] of Object.entries(this.blockData)) {
            if (data.texture) {
                // Load texture
                const texture = this.textureLoader.load(data.texture);
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                
                this.materials.set(parseInt(type), new THREE.MeshLambertMaterial({ 
                    map: texture,
                    transparent: data.transparent
                }));
            } else {
                // Use solid color
                this.materials.set(parseInt(type), new THREE.MeshLambertMaterial({ 
                    color: data.color,
                    transparent: data.transparent
                }));
            }
        }
    }

    initializeGeometry() {
        this.geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    getMaterial(blockType) {
        return this.materials.get(blockType) || this.materials.get(BlockTypes.STONE);
    }

    getGeometry() {
        return this.geometry;
    }

    getBlockData(blockType) {
        return this.blockData[blockType] || this.blockData[BlockTypes.AIR];
    }

    isBlockSolid(blockType) {
        const data = this.getBlockData(blockType);
        return data.solid;
    }

    isBlockTransparent(blockType) {
        const data = this.getBlockData(blockType);
        return data.transparent;
    }

    getBlockName(blockType) {
        const data = this.getBlockData(blockType);
        return data.name;
    }

    getBlockColor(blockType) {
        const data = this.getBlockData(blockType);
        return data.color;
    }

    // Get list of placeable block types for UI
    getPlaceableBlocks() {
        return [
            BlockTypes.GRASS,
            BlockTypes.DIRT,
            BlockTypes.STONE,
            BlockTypes.WOOD,
            BlockTypes.SAND
        ];
    }

    // Create a small preview cube for UI
    createPreviewBlock(blockType, size = 1) {
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = this.getMaterial(blockType);
        const mesh = new THREE.Mesh(geometry, material);
        return mesh;
    }
}
