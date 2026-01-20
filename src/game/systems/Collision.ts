// =============================================================================
// Collision System - Direct port from Python
// =============================================================================

import { Rect, rectsCollide } from '../../utils';
import { Ball } from '../entities/Ball';

/**
 * Reflect the ball when it collides with an axis-aligned rect.
 * Uses minimal overlap axis to choose reflection.
 * Returns true if collision occurred.
 */
export function reflectBallOffRect(ball: Ball, rect: Rect, inflate: number = 0): boolean {
    const brect = ball.rect();

    // Optionally inflate the rect
    let targetRect = rect;
    if (inflate !== 0) {
        targetRect = {
            x: rect.x - inflate / 2,
            y: rect.y - inflate / 2,
            width: rect.width + inflate,
            height: rect.height + inflate,
        };
    }

    if (!rectsCollide(brect, targetRect)) {
        return false;
    }

    // Compute overlap on x and y
    const dxLeft = targetRect.x + targetRect.width - brect.x;
    const dxRight = brect.x + brect.width - targetRect.x;
    const dyTop = targetRect.y + targetRect.height - brect.y;
    const dyBottom = brect.y + brect.height - targetRect.y;

    const overlapX = Math.min(dxLeft, dxRight);
    const overlapY = Math.min(dyTop, dyBottom);

    if (overlapX < overlapY) {
        // Reflect X
        ball.vel.x *= -1;
        // Nudge out
        if (dxLeft < dxRight) {
            ball.pos.x = targetRect.x + targetRect.width + ball.r + 0.5;
        } else {
            ball.pos.x = targetRect.x - ball.r - 0.5;
        }
    } else {
        // Reflect Y
        ball.vel.y *= -1;
        if (dyTop < dyBottom) {
            ball.pos.y = targetRect.y + targetRect.height + ball.r + 0.5;
        } else {
            ball.pos.y = targetRect.y - ball.r - 0.5;
        }
    }

    return true;
}

/**
 * Check if a ball's rect collides with a paddle rect.
 */
export function ballCollidesWithRect(ball: Ball, rect: Rect): boolean {
    return rectsCollide(ball.rect(), rect);
}
