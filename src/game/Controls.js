export class Controls {
    constructor(player) {
        this.player = player;
        this.isLocked = false;
        this.mobileInput = { x: 0, y: 0 };
        
        this.setupEventListeners();
        console.log('Controls initialized');
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Mouse controls
        document.addEventListener('click', () => this.requestPointerLock());
        document.addEventListener('pointerlockchange', () => this.handlePointerLockChange());
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // Mouse buttons for block interaction
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent right-click menu
        
        // Touch controls for mobile
        this.setupTouchControls();
    }

    setupTouchControls() {
        // Touch controls for camera movement
        let lastTouchX = 0;
        let lastTouchY = 0;
        let touchStarted = false;
        
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                lastTouchX = touch.clientX;
                lastTouchY = touch.clientY;
                touchStarted = true;
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            if (touchStarted && e.touches.length === 1) {
                const touch = e.touches[0];
                const deltaX = touch.clientX - lastTouchX;
                const deltaY = touch.clientY - lastTouchY;
                
                // Apply touch sensitivity
                this.player.handleMouseMove(deltaX * 0.5, deltaY * 0.5);
                
                lastTouchX = touch.clientX;
                lastTouchY = touch.clientY;
            }
        });
        
        document.addEventListener('touchend', () => {
            touchStarted = false;
        });
    }

    handleKeyDown(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.player.setKey('forward', true);
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.player.setKey('backward', true);
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.player.setKey('left', true);
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.player.setKey('right', true);
                break;
            case 'Space':
                event.preventDefault();
                this.player.setKey('jump', true);
                break;
            case 'Escape':
                this.exitPointerLock();
                break;
            // Block type selection
            case 'Digit1':
                this.player.setSelectedBlockType(1); // Grass
                break;
            case 'Digit2':
                this.player.setSelectedBlockType(2); // Dirt
                break;
            case 'Digit3':
                this.player.setSelectedBlockType(3); // Stone
                break;
            case 'Digit4':
                this.player.setSelectedBlockType(4); // Wood
                break;
            case 'Digit5':
                this.player.setSelectedBlockType(5); // Sand
                break;
        }
        
        console.log(`Key pressed: ${event.code}`);
    }

    handleKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.player.setKey('forward', false);
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.player.setKey('backward', false);
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.player.setKey('left', false);
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.player.setKey('right', false);
                break;
            case 'Space':
                this.player.setKey('jump', false);
                break;
        }
    }

    handleMouseMove(event) {
        if (!this.isLocked) return;
        
        const deltaX = event.movementX || 0;
        const deltaY = event.movementY || 0;
        
        this.player.handleMouseMove(deltaX, deltaY);
    }

    handleMouseDown(event) {
        if (!this.isLocked) return;
        
        event.preventDefault();
        
        switch (event.button) {
            case 0: // Left click - break block
                this.player.breakBlock();
                break;
            case 2: // Right click - place block
                this.player.placeBlock();
                break;
        }
    }

    requestPointerLock() {
        const canvas = document.getElementById('gameCanvas');
        canvas.requestPointerLock = canvas.requestPointerLock || 
                                   canvas.mozRequestPointerLock || 
                                   canvas.webkitRequestPointerLock;
        
        if (canvas.requestPointerLock) {
            canvas.requestPointerLock();
        }
    }

    exitPointerLock() {
        document.exitPointerLock = document.exitPointerLock || 
                                  document.mozExitPointerLock || 
                                  document.webkitExitPointerLock;
        
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    }

    handlePointerLockChange() {
        const canvas = document.getElementById('gameCanvas');
        this.isLocked = document.pointerLockElement === canvas ||
                       document.mozPointerLockElement === canvas ||
                       document.webkitPointerLockElement === canvas;
        
        console.log('Pointer lock:', this.isLocked ? 'enabled' : 'disabled');
        
        // Update cursor style
        if (this.isLocked) {
            canvas.style.cursor = 'none';
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }

    // Mobile control methods
    setMobileInput(x, y) {
        this.mobileInput.x = x;
        this.mobileInput.y = y;
    }

    update(deltaTime) {
        // Apply mobile joystick input to player movement
        if (Math.abs(this.mobileInput.x) > 0.1 || Math.abs(this.mobileInput.y) > 0.1) {
            // Convert joystick input to movement keys
            this.player.setKey('forward', this.mobileInput.y < -0.3);
            this.player.setKey('backward', this.mobileInput.y > 0.3);
            this.player.setKey('left', this.mobileInput.x < -0.3);
            this.player.setKey('right', this.mobileInput.x > 0.3);
        }
    }

    // Set jump state for mobile
    set jump(value) {
        this.player.setKey('jump', value);
    }

    // Check if controls are locked
    isControlsLocked() {
        return this.isLocked;
    }
}
