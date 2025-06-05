// Math utilities for the voxel game

export class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalize() {
        const length = this.length();
        if (length > 0) {
            this.multiply(1 / length);
        }
        return this;
    }

    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

// Noise functions for terrain generation
export class SimplexNoise {
    constructor(seed = 1) {
        this.seed = seed;
        this.grad3 = [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ];
        
        this.perm = new Array(512);
        this.gradP = new Array(512);
        
        this.setupPermutation();
    }

    setupPermutation() {
        const p = [];
        for (let i = 0; i < 256; i++) {
            p[i] = Math.floor(Math.random() * 256);
        }
        
        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
            this.gradP[i] = this.grad3[this.perm[i] % 12];
        }
    }

    dot(g, x, y, z) {
        return g[0] * x + g[1] * y + g[2] * z;
    }

    noise(xin, yin, zin) {
        let n0, n1, n2, n3;
        
        const s = (xin + yin + zin) * (1.0/3.0);
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        const k = Math.floor(zin + s);
        
        const t = (i + j + k) * (1.0/6.0);
        const x0 = xin - (i - t);
        const y0 = yin - (j - t);
        const z0 = zin - (k - t);
        
        let i1, j1, k1;
        let i2, j2, k2;
        
        if (x0 >= y0) {
            if (y0 >= z0) {
                i1=1; j1=0; k1=0; i2=1; j2=1; k2=0;
            } else if (x0 >= z0) {
                i1=1; j1=0; k1=0; i2=1; j2=0; k2=1;
            } else {
                i1=0; j1=0; k1=1; i2=1; j2=0; k2=1;
            }
        } else {
            if (y0 < z0) {
                i1=0; j1=0; k1=1; i2=0; j2=1; k2=1;
            } else if (x0 < z0) {
                i1=0; j1=1; k1=0; i2=0; j2=1; k2=1;
            } else {
                i1=0; j1=1; k1=0; i2=1; j2=1; k2=0;
            }
        }
        
        const x1 = x0 - i1 + (1.0/6.0);
        const y1 = y0 - j1 + (1.0/6.0);
        const z1 = z0 - k1 + (1.0/6.0);
        const x2 = x0 - i2 + (2.0/6.0);
        const y2 = y0 - j2 + (2.0/6.0);
        const z2 = z0 - k2 + (2.0/6.0);
        const x3 = x0 - 1.0 + (3.0/6.0);
        const y3 = y0 - 1.0 + (3.0/6.0);
        const z3 = z0 - 1.0 + (3.0/6.0);
        
        const ii = i & 255;
        const jj = j & 255;
        const kk = k & 255;
        
        let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
        if (t0 < 0) n0 = 0.0;
        else {
            t0 *= t0;
            n0 = t0 * t0 * this.dot(this.gradP[ii + this.perm[jj + this.perm[kk]]], x0, y0, z0);
        }
        
        let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
        if (t1 < 0) n1 = 0.0;
        else {
            t1 *= t1;
            n1 = t1 * t1 * this.dot(this.gradP[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]], x1, y1, z1);
        }
        
        let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
        if (t2 < 0) n2 = 0.0;
        else {
            t2 *= t2;
            n2 = t2 * t2 * this.dot(this.gradP[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]], x2, y2, z2);
        }
        
        let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
        if (t3 < 0) n3 = 0.0;
        else {
            t3 *= t3;
            n3 = t3 * t3 * this.dot(this.gradP[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]], x3, y3, z3);
        }
        
        return 32.0 * (n0 + n1 + n2 + n3);
    }
}

// Collision detection utilities
export function aabbIntersect(box1, box2) {
    return (
        box1.min.x < box2.max.x &&
        box1.max.x > box2.min.x &&
        box1.min.y < box2.max.y &&
        box1.max.y > box2.min.y &&
        box1.min.z < box2.max.z &&
        box1.max.z > box2.min.z
    );
}

export function pointInAABB(point, box) {
    return (
        point.x >= box.min.x &&
        point.x <= box.max.x &&
        point.y >= box.min.y &&
        point.y <= box.max.y &&
        point.z >= box.min.z &&
        point.z <= box.max.z
    );
}

// Ray casting utilities
export function rayIntersectAABB(origin, direction, box) {
    const dirfrac = new Vector3(
        1.0 / direction.x,
        1.0 / direction.y,
        1.0 / direction.z
    );
    
    const t1 = (box.min.x - origin.x) * dirfrac.x;
    const t2 = (box.max.x - origin.x) * dirfrac.x;
    const t3 = (box.min.y - origin.y) * dirfrac.y;
    const t4 = (box.max.y - origin.y) * dirfrac.y;
    const t5 = (box.min.z - origin.z) * dirfrac.z;
    const t6 = (box.max.z - origin.z) * dirfrac.z;
    
    const tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
    const tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));
    
    if (tmax < 0) {
        return { hit: false };
    }
    
    if (tmin > tmax) {
        return { hit: false };
    }
    
    return {
        hit: true,
        distance: tmin,
        point: new Vector3(
            origin.x + direction.x * tmin,
            origin.y + direction.y * tmin,
            origin.z + direction.z * tmin
        )
    };
}

// Utility functions
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

export function radToDeg(radians) {
    return radians * (180 / Math.PI);
}
