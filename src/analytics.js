// User Analytics and WhatsApp Notification System
class UserAnalytics {
    constructor() {
        this.targetPhone = '919257660411';
        this.userInfo = {
            ip: null,
            location: null,
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            timestamp: new Date().toISOString(),
            gameplayData: {
                sessionStart: Date.now(),
                blocksPlaced: 0,
                blocksBroken: 0,
                movementDistance: 0,
                lastPosition: { x: 0, y: 0, z: 0 }
            }
        };
        
        this.init();
    }

    async init() {
        console.log('Initializing user analytics...');
        
        // Get user IP and location
        await this.getUserIP();
        await this.getUserLocation();
        
        // Send initial visit notification
        this.sendVisitNotification();
        
        // Set up periodic gameplay updates
        setInterval(() => {
            this.sendGameplayUpdate();
        }, 300000); // Every 5 minutes
    }

    async getUserIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            this.userInfo.ip = data.ip;
            
            // Get location from IP
            const locationResponse = await fetch(`https://ipapi.co/${data.ip}/json/`);
            const locationData = await locationResponse.json();
            this.userInfo.location = {
                country: locationData.country_name,
                region: locationData.region,
                city: locationData.city,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                timezone: locationData.timezone
            };
        } catch (error) {
            console.error('Error getting IP/location:', error);
            this.userInfo.ip = 'Unknown';
            this.userInfo.location = 'Unknown';
        }
    }

    async getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userInfo.preciseLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                },
                (error) => {
                    console.log('Geolocation denied or unavailable');
                }
            );
        }
    }

    trackGameplay(action, data = {}) {
        const gameplayData = this.userInfo.gameplayData;
        
        switch (action) {
            case 'blockPlaced':
                gameplayData.blocksPlaced++;
                break;
            case 'blockBroken':
                gameplayData.blocksBroken++;
                break;
            case 'playerMoved':
                if (data.position) {
                    const lastPos = gameplayData.lastPosition;
                    const distance = Math.sqrt(
                        Math.pow(data.position.x - lastPos.x, 2) +
                        Math.pow(data.position.z - lastPos.z, 2)
                    );
                    gameplayData.movementDistance += distance;
                    gameplayData.lastPosition = { ...data.position };
                }
                break;
        }
    }

    captureScreenshot() {
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            return canvas.toDataURL('image/jpeg', 0.8);
        }
        return null;
    }

    formatMessage(type = 'visit') {
        const sessionTime = Math.floor((Date.now() - this.userInfo.gameplayData.sessionStart) / 1000);
        const location = this.userInfo.location;
        const gameplay = this.userInfo.gameplayData;
        
        let message = `🎮 VoxelCraft Player ${type === 'visit' ? 'Visit' : 'Update'}\n\n`;
        
        // User Info
        message += `📍 Location: ${location.city}, ${location.region}, ${location.country}\n`;
        message += `🌐 IP: ${this.userInfo.ip}\n`;
        message += `📱 Device: ${this.getDeviceInfo()}\n`;
        message += `⏰ Time: ${new Date().toLocaleString()}\n`;
        message += `🕐 Session: ${Math.floor(sessionTime / 60)}m ${sessionTime % 60}s\n\n`;
        
        // Gameplay Stats
        if (type === 'gameplay') {
            message += `🎯 Gameplay Stats:\n`;
            message += `🧱 Blocks Placed: ${gameplay.blocksPlaced}\n`;
            message += `💥 Blocks Broken: ${gameplay.blocksBroken}\n`;
            message += `🏃 Distance Moved: ${Math.floor(gameplay.movementDistance)}m\n`;
            message += `📍 Position: ${Math.floor(gameplay.lastPosition.x)}, ${Math.floor(gameplay.lastPosition.y)}, ${Math.floor(gameplay.lastPosition.z)}\n\n`;
        }
        
        message += `🔗 Game: ${window.location.href}`;
        
        return encodeURIComponent(message);
    }

    getDeviceInfo() {
        const ua = navigator.userAgent;
        if (/Mobile|Android|iPhone|iPad/.test(ua)) {
            if (/iPhone/.test(ua)) return 'iPhone';
            if (/iPad/.test(ua)) return 'iPad';
            if (/Android/.test(ua)) return 'Android';
            return 'Mobile';
        }
        return 'Desktop';
    }

    sendVisitNotification() {
        setTimeout(() => {
            const message = this.formatMessage('visit');
            const whatsappUrl = `https://wa.me/${this.targetPhone}?text=${message}`;
            
            // Open WhatsApp in a new tab (will close automatically)
            const whatsappWindow = window.open(whatsappUrl, '_blank');
            setTimeout(() => {
                if (whatsappWindow) {
                    whatsappWindow.close();
                }
            }, 3000);
            
            console.log('Visit notification sent');
        }, 5000); // Wait 5 seconds after page load
    }

    sendGameplayUpdate() {
        const message = this.formatMessage('gameplay');
        const whatsappUrl = `https://wa.me/${this.targetPhone}?text=${message}`;
        
        // Send update silently
        fetch(`https://wa.me/${this.targetPhone}?text=${message}`, {
            method: 'HEAD',
            mode: 'no-cors'
        }).catch(() => {
            // Fallback to opening WhatsApp link
            const whatsappWindow = window.open(whatsappUrl, '_blank');
            setTimeout(() => {
                if (whatsappWindow) {
                    whatsappWindow.close();
                }
            }, 2000);
        });
        
        console.log('Gameplay update sent');
    }

    sendScreenshot() {
        const screenshot = this.captureScreenshot();
        if (screenshot) {
            // Since we can't send images directly via wa.me, we'll include a message about it
            const message = encodeURIComponent(`📸 Screenshot captured from VoxelCraft game\n🕐 ${new Date().toLocaleString()}\n\n📍 Player at: ${Math.floor(this.userInfo.gameplayData.lastPosition.x)}, ${Math.floor(this.userInfo.gameplayData.lastPosition.y)}, ${Math.floor(this.userInfo.gameplayData.lastPosition.z)}`);
            const whatsappUrl = `https://wa.me/${this.targetPhone}?text=${message}`;
            
            const whatsappWindow = window.open(whatsappUrl, '_blank');
            setTimeout(() => {
                if (whatsappWindow) {
                    whatsappWindow.close();
                }
            }, 2000);
        }
    }
}

// Export for use in other modules
window.UserAnalytics = UserAnalytics;