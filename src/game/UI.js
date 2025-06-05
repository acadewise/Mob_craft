import { BlockTypes } from './BlockTypes.js';

export class UI {
    constructor(player, world) {
        this.player = player;
        this.world = world;
        
        this.elements = {};
        this.createUI();
        
        console.log('UI initialized');
    }

    createUI() {
        const gameUI = document.getElementById('gameUI');
        
        // Create crosshair
        this.createCrosshair(gameUI);
        
        // Create HUD info
        this.createHUD(gameUI);
        
        // Create inventory bar
        this.createInventoryBar(gameUI);
        
        // Create block selector
        this.createBlockSelector(gameUI);
        
        // Create performance info
        this.createPerformanceInfo(gameUI);
        
        // Create AI info
        this.createAIInfo(gameUI);
        
        // Create instructions
        this.createInstructions(gameUI);
    }

    createCrosshair(parent) {
        const crosshair = document.createElement('div');
        crosshair.className = 'crosshair';
        parent.appendChild(crosshair);
        this.elements.crosshair = crosshair;
    }

    createHUD(parent) {
        const hud = document.createElement('div');
        hud.className = 'hud-info';
        hud.innerHTML = `
            <h3>Player Info</h3>
            <p>Position: <span id="position">0, 0, 0</span></p>
            <p>Chunk: <span id="chunk">0, 0</span></p>
            <p>On Ground: <span id="onGround">false</span></p>
            <p>Selected: <span id="selectedBlock">Grass</span></p>
        `;
        parent.appendChild(hud);
        this.elements.hud = hud;
    }

    createInventoryBar(parent) {
        const inventoryBar = document.createElement('div');
        inventoryBar.className = 'inventory-bar';
        
        const placeableBlocks = this.world.blockTypeManager.getPlaceableBlocks();
        
        placeableBlocks.forEach((blockType, index) => {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            if (index === 0) slot.classList.add('selected');
            
            const preview = document.createElement('div');
            preview.className = 'block-preview';
            preview.style.backgroundColor = `#${this.world.blockTypeManager.getBlockColor(blockType).toString(16).padStart(6, '0')}`;
            
            const number = document.createElement('div');
            number.className = 'slot-number';
            number.textContent = index + 1;
            
            slot.appendChild(preview);
            slot.appendChild(number);
            
            slot.addEventListener('click', () => {
                this.selectInventorySlot(index);
                this.player.setSelectedBlockType(blockType);
            });
            
            inventoryBar.appendChild(slot);
        });
        
        parent.appendChild(inventoryBar);
        this.elements.inventoryBar = inventoryBar;
    }

    createBlockSelector(parent) {
        const selector = document.createElement('div');
        selector.className = 'block-selector';
        
        const title = document.createElement('h3');
        title.textContent = 'Block Types';
        selector.appendChild(title);
        
        const blockTypes = document.createElement('div');
        blockTypes.className = 'block-types';
        
        const placeableBlocks = this.world.blockTypeManager.getPlaceableBlocks();
        
        placeableBlocks.forEach((blockType, index) => {
            const blockDiv = document.createElement('div');
            blockDiv.className = 'block-type';
            if (index === 0) blockDiv.classList.add('selected');
            
            blockDiv.style.backgroundColor = `#${this.world.blockTypeManager.getBlockColor(blockType).toString(16).padStart(6, '0')}`;
            blockDiv.title = this.world.blockTypeManager.getBlockName(blockType);
            
            const key = document.createElement('div');
            key.className = 'type-key';
            key.textContent = index + 1;
            blockDiv.appendChild(key);
            
            blockDiv.addEventListener('click', () => {
                this.selectBlockType(index);
                this.player.setSelectedBlockType(blockType);
            });
            
            blockTypes.appendChild(blockDiv);
        });
        
        selector.appendChild(blockTypes);
        parent.appendChild(selector);
        this.elements.blockSelector = selector;
    }

    createPerformanceInfo(parent) {
        const perf = document.createElement('div');
        perf.className = 'perf-info';
        perf.innerHTML = `
            FPS: <span id="fps">0</span> | 
            Triangles: <span id="triangles">0</span> | 
            Chunks: <span id="chunks">0</span> | 
            AI: <span id="aiCount">0</span>
        `;
        parent.appendChild(perf);
        this.elements.perf = perf;
    }

    createAIInfo(parent) {
        const aiInfo = document.createElement('div');
        aiInfo.className = 'ai-info';
        aiInfo.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-size: 12px;
            max-width: 200px;
            border: 2px solid #ff4444;
        `;
        aiInfo.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #ff4444;">🤖 AI Challenge</h3>
            <p>AI Entities: <span id="aiEntityCount">0</span></p>
            <p>AI Blocks Built: <span id="aiBlocksBuilt">0</span></p>
            <p>AI Blocks Destroyed: <span id="aiBlocksDestroyed">0</span></p>
            <p style="margin-top: 10px; font-weight: bold; color: #ffaa44;">
                Compete with AI builders!
            </p>
        `;
        parent.appendChild(aiInfo);
        this.elements.aiInfo = aiInfo;
    }

    createInstructions(parent) {
        const instructions = document.createElement('div');
        instructions.className = 'instructions';
        instructions.innerHTML = `
            <strong>Controls:</strong><br>
            WASD - Move<br>
            Mouse - Look<br>
            Left Click - Break<br>
            Right Click - Place<br>
            1-5 - Select block<br>
            Space - Jump<br>
            ESC - Release mouse
        `;
        parent.appendChild(instructions);
        this.elements.instructions = instructions;
    }

    selectInventorySlot(index) {
        const slots = this.elements.inventoryBar.querySelectorAll('.inventory-slot');
        slots.forEach((slot, i) => {
            if (i === index) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }
        });
    }

    selectBlockType(index) {
        const blocks = this.elements.blockSelector.querySelectorAll('.block-type');
        blocks.forEach((block, i) => {
            if (i === index) {
                block.classList.add('selected');
            } else {
                block.classList.remove('selected');
            }
        });
        
        // Also update inventory bar
        this.selectInventorySlot(index);
    }

    update(deltaTime) {
        this.updateHUD();
        this.updatePerformanceInfo();
    }

    updateHUD() {
        const info = this.player.getInfo();
        
        // Update position
        const positionElement = document.getElementById('position');
        if (positionElement) {
            positionElement.textContent = `${Math.round(info.position.x)}, ${Math.round(info.position.y)}, ${Math.round(info.position.z)}`;
        }
        
        // Update chunk
        const chunkElement = document.getElementById('chunk');
        if (chunkElement) {
            chunkElement.textContent = `${info.chunk.x}, ${info.chunk.z}`;
        }
        
        // Update on ground status
        const onGroundElement = document.getElementById('onGround');
        if (onGroundElement) {
            onGroundElement.textContent = info.onGround ? 'Yes' : 'No';
            onGroundElement.style.color = info.onGround ? '#4CAF50' : '#FF5722';
        }
        
        // Update selected block
        const selectedBlockElement = document.getElementById('selectedBlock');
        if (selectedBlockElement) {
            selectedBlockElement.textContent = info.selectedBlock;
        }
    }

    updatePerformanceInfo() {
        // Update FPS
        const fpsElement = document.getElementById('fps');
        if (fpsElement && window.game) {
            fpsElement.textContent = window.game.getFPS();
        }
        
        // Update triangle count
        const trianglesElement = document.getElementById('triangles');
        if (trianglesElement && window.game) {
            trianglesElement.textContent = window.game.getTriangleCount().toLocaleString();
        }
        
        // Update chunk count
        const chunksElement = document.getElementById('chunks');
        if (chunksElement) {
            chunksElement.textContent = this.world.getChunkCount();
        }
        
        // Update AI count
        const aiCountElement = document.getElementById('aiCount');
        if (aiCountElement && window.game && window.game.aiManager) {
            aiCountElement.textContent = window.game.aiManager.getEntityCount();
        }
        
        // Update AI info
        this.updateAIInfo();
    }

    updateAIInfo() {
        if (!window.game || !window.game.aiManager) return;
        
        const entities = window.game.aiManager.getEntitiesInfo();
        const totalBuilt = entities.reduce((sum, entity) => sum + entity.blocksPlaced, 0);
        const totalDestroyed = entities.reduce((sum, entity) => sum + entity.blocksBroken, 0);
        
        const aiEntityCountElement = document.getElementById('aiEntityCount');
        const aiBlocksBuiltElement = document.getElementById('aiBlocksBuilt');
        const aiBlocksDestroyedElement = document.getElementById('aiBlocksDestroyed');
        
        if (aiEntityCountElement) {
            aiEntityCountElement.textContent = entities.length;
        }
        if (aiBlocksBuiltElement) {
            aiBlocksBuiltElement.textContent = totalBuilt;
        }
        if (aiBlocksDestroyedElement) {
            aiBlocksDestroyedElement.textContent = totalDestroyed;
        }
    }

    // Handle block type selection from keyboard
    handleBlockSelection(number) {
        const placeableBlocks = this.world.blockTypeManager.getPlaceableBlocks();
        const index = number - 1;
        
        if (index >= 0 && index < placeableBlocks.length) {
            this.selectBlockType(index);
            this.player.setSelectedBlockType(placeableBlocks[index]);
        }
    }

    // Show/hide UI elements
    showElement(elementName) {
        if (this.elements[elementName]) {
            this.elements[elementName].classList.remove('hidden');
        }
    }

    hideElement(elementName) {
        if (this.elements[elementName]) {
            this.elements[elementName].classList.add('hidden');
        }
    }

    // Toggle mobile-specific UI
    toggleMobileUI(show) {
        const mobileControls = document.getElementById('mobileControls');
        if (mobileControls) {
            mobileControls.style.display = show ? 'flex' : 'none';
        }
        
        // Hide some desktop elements on mobile
        if (show) {
            this.hideElement('instructions');
        } else {
            this.showElement('instructions');
        }
    }
}
