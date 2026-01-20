// =============================================================================
// Obstacle Entity - Direct port from Python
// =============================================================================

import { Rect } from '../../utils';

export class Obstacle {
    private baseRect: Rect;
    public rect: Rect;
    public moving: boolean;
    public amp: number;
    public freq: number;
    public phase: number;

    constructor(
        rect: Rect,
        moving: boolean = false,
        amp: number = 0.0,
        freq: number = 0.0,
        phase: number = 0.0
    ) {
        this.baseRect = { ...rect };
        this.rect = { ...rect };
        this.moving = moving;
        this.amp = amp;
        this.freq = freq;
        this.phase = phase;
    }

    /**
     * Update the obstacle position (for moving obstacles).
     */
    update(t: number): void {
        if (this.moving) {
            const yoff = this.amp * Math.sin(this.phase + t * this.freq * 2 * Math.PI);
            this.rect.y = this.baseRect.y + yoff;
        }
    }
}
