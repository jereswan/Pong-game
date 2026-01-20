// =============================================================================
// Utility Functions and Classes - Direct port from Python
// =============================================================================

/**
 * Clamp a value between min and max.
 */
export function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
}

/**
 * Linear interpolation between a and b.
 */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/**
 * Simple 2D Vector class (replaces pygame.Vector2)
 */
export class Vector2 {
    constructor(
        public x: number = 0,
        public y: number = 0
    ) { }

    clone(): Vector2 {
        return new Vector2(this.x, this.y);
    }

    add(other: Vector2): Vector2 {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    sub(other: Vector2): Vector2 {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    scale(s: number): Vector2 {
        return new Vector2(this.x * s, this.y * s);
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize(): Vector2 {
        const len = this.length();
        if (len === 0) return new Vector2(0, 0);
        return new Vector2(this.x / len, this.y / len);
    }

    scaleToLength(newLen: number): void {
        const len = this.length();
        if (len > 0) {
            const scale = newLen / len;
            this.x *= scale;
            this.y *= scale;
        }
    }

    addInPlace(other: Vector2): void {
        this.x += other.x;
        this.y += other.y;
    }

    scaleInPlace(s: number): void {
        this.x *= s;
        this.y *= s;
    }
}

/**
 * Axis-Aligned Bounding Box (replaces pygame.Rect)
 */
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Create a Rect from position and dimensions.
 */
export function createRect(x: number, y: number, width: number, height: number): Rect {
    return { x, y, width, height };
}

/**
 * Get the right edge of a rect.
 */
export function rectRight(r: Rect): number {
    return r.x + r.width;
}

/**
 * Get the bottom edge of a rect.
 */
export function rectBottom(r: Rect): number {
    return r.y + r.height;
}

/**
 * Get the center X of a rect.
 */
export function rectCenterX(r: Rect): number {
    return r.x + r.width / 2;
}

/**
 * Get the center Y of a rect.
 */
export function rectCenterY(r: Rect): number {
    return r.y + r.height / 2;
}

/**
 * Check if two rects collide (AABB intersection).
 */
export function rectsCollide(a: Rect, b: Rect): boolean {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

/**
 * Create an inflated copy of a rect.
 */
export function inflateRect(r: Rect, dx: number, dy: number): Rect {
    return {
        x: r.x - dx / 2,
        y: r.y - dy / 2,
        width: r.width + dx,
        height: r.height + dy,
    };
}

/**
 * Random number between min and max (inclusive for floats).
 */
export function randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

/**
 * Random integer between min and max (inclusive).
 */
export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random choice from an array.
 */
export function randomChoice<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]!;
}

/**
 * Convert RGB tuple (0-255 each) to hex number.
 */
export function rgbToHex(r: number, g: number, b: number): number {
    return (r << 16) | (g << 8) | b;
}

/**
 * Convert hex number to RGB components.
 */
export function hexToRgb(hex: number): { r: number; g: number; b: number } {
    return {
        r: (hex >> 16) & 0xff,
        g: (hex >> 8) & 0xff,
        b: hex & 0xff,
    };
}
