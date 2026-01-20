// =============================================================================
// AI System - Direct port from Python
// =============================================================================

import { clamp, randomRange } from '../../utils';
import { Ball } from '../entities/Ball';
import { Paddle } from '../entities/Paddle';
import { WIDTH } from '../../config';

export class AI {
    public errorOffset: number = 0.0;
    public errorTimer: number = 0.0;

    /**
     * Update the AI paddle to track the ball.
     */
    update(
        aiPaddle: Paddle,
        balls: Ball[],
        dt: number,
        aiReaction: number,
        aiMaxSpeed: number,
        aiErrorMargin: number
    ): void {
        // Find target ball: nearest ball moving toward AI (right side)
        let targetBall: Ball | null = null;
        let best = Infinity;

        for (const b of balls) {
            if (b.vel.x > 0) {
                // Moving toward AI (right)
                const dist = WIDTH - b.pos.x;
                if (dist < best) {
                    best = dist;
                    targetBall = b;
                }
            }
        }

        // Fallback: track any ball
        if (targetBall === null && balls.length > 0) {
            targetBall = balls.reduce((closest, b) => {
                const distA = Math.abs(closest.pos.x - (aiPaddle.x + aiPaddle.width / 2));
                const distB = Math.abs(b.pos.x - (aiPaddle.x + aiPaddle.width / 2));
                return distB < distA ? b : closest;
            });
        }

        if (targetBall === null) return;

        // Update AI error offset periodically for imperfect tracking
        this.errorTimer -= dt;
        if (this.errorTimer <= 0) {
            this.errorOffset = randomRange(-aiErrorMargin, aiErrorMargin);
            this.errorTimer = randomRange(0.3, 0.8);
        }

        // Calculate desired position and move
        const desired = targetBall.pos.y + this.errorOffset;
        const error = desired - aiPaddle.centerY();
        const aiStep = clamp(error * aiReaction, -aiMaxSpeed, aiMaxSpeed);
        aiPaddle.move(aiStep);
    }
}
