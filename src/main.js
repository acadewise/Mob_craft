import { World } from './game/World.js';
import { Player } from './game/Player.js';
import { Controls } from './game/Controls.js';
import { UI } from './game/UI.js';
import { AIManager } from './game/AIManager.js';

class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.player = null;
        this.controls = null;
        this.ui = null;
        this.analytics = null;
        this.aiManager = null;
        
        this.isRunning = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // Performance monitoring
        this.frameCount = 0;
        this.fps = 0;
        this.lastFpsUpdate = 0;
        
        this.init();
    }

    async init() {
        console.log('Initializing VoxelCraft...');
        
        // Check if THREE.js is loaded
        if (typeof THREE === 'undefined') {
            throw new Error('THREE.js library not loaded');
        }
        
        console.log('THREE.js version:', THREE.REVISION);
        
        try {
            this.setupRenderer();
            this.setupScene();
            this.setupCamera();
            
            // Initialize game components
            this.world = new World(this.scene);
            this.player = new Player(this.camera, this.world);
            this.controls = new Controls(this.player);
            this.ui = new UI(this.player, this.world);
            
            // Initialize analytics system
            this.analytics = new UserAnalytics();
            
            // Initialize AI system
            this.aiManager = new AIManager(this.world);
            
            // Generate initial world
            await this.world.generateChunks();
            
            this.hideLoadingScreen();
            this.showStartScreen();
            
            console.log('Game initialized successfully!');
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showError('Failed to initialize game. Please refresh and try again.');
        }
    }

    setupRenderer() {
        const canvas = document.getElementById('gameCanvas');
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true,
            powerPreference: "high-performance"
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0xB8E6FF, 1); // Bright sky blue
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setupScene() {
        this.scene = new THREE.Scene();
        
        // Add fog for atmosphere
        this.scene.fog = new THREE.Fog(0xB8E6FF, 80, 250);
        
        // Bright lighting setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
        
        // Additional fill light for better visibility
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
        fillLight.position.set(-50, 50, -50);
        this.scene.add(fillLight);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 20, 0);
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.style.display = 'none';
    }

    showStartScreen() {
        const startScreen = document.getElementById('startScreen');
        startScreen.style.display = 'flex';
        
        const startButton = document.getElementById('startGameBtn');
        startButton.addEventListener('click', () => {
            this.startGame();
        });
    }

    startGame() {
        const startScreen = document.getElementById('startScreen');
        startScreen.style.display = 'none';
        
        // Setup mobile controls if on mobile
        this.setupMobileControls();
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
        
        // Set up screenshot capture for analytics
        this.setupScreenshotCapture();
        
        console.log('Game started!');
    }

    setupScreenshotCapture() {
        // Capture screenshot every 2 minutes during gameplay
        setInterval(() => {
            if (this.isRunning && this.analytics) {
                this.analytics.sendScreenshot();
            }
        }, 120000); // Every 2 minutes
    }

    setupMobileControls() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            const mobileControls = document.getElementById('mobileControls');
            mobileControls.style.display = 'flex';
            
            // Setup virtual joystick
            this.setupVirtualJoystick();
            
            // Setup mobile buttons
            this.setupMobileButtons();
        }
    }

    setupVirtualJoystick() {
        const joystick = document.getElementById('joystick');
        const handle = document.getElementById('joystickHandle');
        let isPressed = false;
        let startX = 0;
        let startY = 0;
        
        const handleStart = (e) => {
            isPressed = true;
            const touch = e.touches ? e.touches[0] : e;
            const rect = joystick.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.top + rect.height / 2;
        };
        
        const handleMove = (e) => {
            if (!isPressed) return;
            e.preventDefault();
            
            const touch = e.touches ? e.touches[0] : e;
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = 35;
            
            if (distance > maxDistance) {
                const angle = Math.atan2(deltaY, deltaX);
                handle.style.transform = `translate(${Math.cos(angle) * maxDistance}px, ${Math.sin(angle) * maxDistance}px)`;
            } else {
                handle.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            }
            
            // Update controls based on joystick position
            const normalizedX = Math.max(-1, Math.min(1, deltaX / maxDistance));
            const normalizedY = Math.max(-1, Math.min(1, deltaY / maxDistance));
            
            if (this.controls) {
                this.controls.setMobileInput(normalizedX, normalizedY);
            }
        };
        
        const handleEnd = () => {
            isPressed = false;
            handle.style.transform = 'translate(0px, 0px)';
            if (this.controls) {
                this.controls.setMobileInput(0, 0);
            }
        };
        
        joystick.addEventListener('touchstart', handleStart);
        joystick.addEventListener('mousedown', handleStart);
        document.addEventListener('touchmove', handleMove);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('mouseup', handleEnd);
    }

    setupMobileButtons() {
        const jumpBtn = document.getElementById('jumpBtn');
        const breakBtn = document.getElementById('breakBtn');
        const placeBtn = document.getElementById('placeBtn');
        
        jumpBtn.addEventListener('touchstart', () => {
            if (this.controls) this.controls.jump = true;
        });
        jumpBtn.addEventListener('touchend', () => {
            if (this.controls) this.controls.jump = false;
        });
        
        breakBtn.addEventListener('touchstart', () => {
            if (this.player) this.player.breakBlock();
        });
        
        placeBtn.addEventListener('touchstart', () => {
            if (this.player) this.player.placeBlock();
        });
    }

    gameLoop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Limit delta time to prevent large jumps
        this.deltaTime = Math.min(this.deltaTime, 1/30);

        // Update game components
        if (this.controls) this.controls.update(this.deltaTime);
        if (this.player) this.player.update(this.deltaTime);
        if (this.world) this.world.update(this.deltaTime);
        if (this.ui) this.ui.update(this.deltaTime);
        if (this.aiManager) this.aiManager.update(this.deltaTime);

        // Render
        this.renderer.render(this.scene, this.camera);

        // Update performance stats
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    showError(message) {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.innerHTML = `
            <div style="color: #ff6b6b; font-size: 24px; margin-bottom: 20px;">❌</div>
            <h2 style="color: #ff6b6b;">Error</h2>
            <p>${message}</p>
            <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Reload Game
            </button>
        `;
    }

    getFPS() {
        return this.fps;
    }

    getTriangleCount() {
        let triangles = 0;
        this.scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                const geometry = child.geometry;
                if (geometry.index) {
                    triangles += geometry.index.count / 3;
                } else if (geometry.attributes.position) {
                    triangles += geometry.attributes.position.count / 3;
                }
            }
        });
        return Math.floor(triangles);
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    window.game = new Game();
});

// Export for debugging
window.Game = Game;
