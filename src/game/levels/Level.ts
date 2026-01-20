// =============================================================================
// Level - Procedural Generation (Direct port from Python)
// =============================================================================

import {
    WIDTH,
    HEIGHT,
    PADDLE_H_BASE,
    AI_REACTION_BASE,
    AI_MAX_SPEED_BASE,
    AI_SKILL_LEVELS,
    MAX_OBS,
    MAX_WIND,
    MAX_EXTRA_BALL_CHANCE,
} from '../../config';
import { Vector2, lerp, randomRange, randomInt, Rect, rectsCollide, inflateRect } from '../../utils';
import { Obstacle } from '../entities/Obstacle';

export class Level {
    public idx: number;
    public aiSkill: number;
    public playerPaddleH: number;
    public aiPaddleH: number;
    public ballSpeed: number;
    public wind: Vector2;
    public obstacles: Obstacle[];
    public extraBallChance: number;
    public aiReaction: number;
    public aiMaxSpeed: number;
    public aiErrorMargin: number;
    public spin: number;
    public name: string;

    constructor(idx: number, aiSkill: number = 2) {
        this.idx = idx;
        this.aiSkill = aiSkill;
        const skill = AI_SKILL_LEVELS[aiSkill]!;

        // Difficulty ramps with idx, but stays fun
        const d = Math.min(1.0, idx / 18.0);

        // Paddle sizes change (can get smaller)
        this.playerPaddleH = Math.floor(lerp(PADDLE_H_BASE, 70, d) + randomInt(-10, 10));
        this.aiPaddleH = Math.floor(lerp(PADDLE_H_BASE, 85, d) + randomInt(-8, 8));

        // Ball base speed increases
        this.ballSpeed = lerp(520.0, 900.0, d) + randomRange(-30, 40);

        // Wind (random direction and strength, sometimes none)
        if (Math.random() < lerp(0.10, 0.65, d)) {
            const strength = randomRange(0.0, lerp(60.0, MAX_WIND, d));
            const angle = randomRange(-Math.PI, Math.PI);
            this.wind = new Vector2(Math.cos(angle) * strength, Math.sin(angle) * strength);
        } else {
            this.wind = new Vector2(0, 0);
        }

        // Obstacles: count grows with idx
        const obsCount = Math.floor(lerp(0, MAX_OBS, d));
        this.obstacles = this.generateObstacles(obsCount, d);

        // Chance for extra ball (multi-ball)
        this.extraBallChance = lerp(0.0, MAX_EXTRA_BALL_CHANCE, d) * (0.65 + Math.random() * 0.7);

        // AI tuning (affected by skill level)
        const baseReaction = lerp(AI_REACTION_BASE, 0.22, d) + randomRange(-0.015, 0.02);
        const baseMaxSpeed = lerp(AI_MAX_SPEED_BASE, 10.2, d) + randomRange(-0.5, 0.8);
        this.aiReaction = baseReaction * skill.reaction_mult;
        this.aiMaxSpeed = baseMaxSpeed * skill.max_speed_mult;
        this.aiErrorMargin = skill.error_margin;

        // "Spin" effect magnitude (depends on paddle movement at impact)
        this.spin = lerp(0.18, 0.33, d);

        // Cosmetic name
        this.name = this.generateName();
    }

    private generateName(): string {
        const tags: string[] = [];
        if (this.wind.length() > 1) {
            tags.push('WIND');
        }
        if (this.obstacles.length > 0) {
            tags.push('MAZE');
        }
        if (this.extraBallChance > 0.12) {
            tags.push('MULTI');
        }
        if (tags.length === 0) {
            tags.push('CLASSIC');
        }
        return `LEVEL ${this.idx} - ${tags.join(' / ')}`;
    }

    private generateObstacles(n: number, d: number): Obstacle[] {
        const obs: Obstacle[] = [];
        if (n <= 0) return obs;

        const safeMargin = 120;
        const midMinX = safeMargin + 160;
        const midMaxX = WIDTH - safeMargin - 160;

        let attempts = 0;
        while (obs.length < n && attempts < 200) {
            attempts++;

            const w = randomInt(26, Math.floor(lerp(60, 95, d)));
            const h = randomInt(70, Math.floor(lerp(120, 200, d)));
            const x = randomInt(midMinX, midMaxX - w);
            const y = randomInt(40, HEIGHT - 40 - h);

            const rect: Rect = { x, y, width: w, height: h };

            // Avoid stacking too tightly
            let ok = true;
            for (const o of obs) {
                const inflated = inflateRect(o.rect, 22, 22);
                if (rectsCollide(rect, inflated)) {
                    ok = false;
                    break;
                }
            }

            if (ok) {
                const moving = Math.random() < lerp(0.0, 0.55, d);
                if (moving) {
                    const amp = randomRange(16, lerp(20, 90, d));
                    const freq = randomRange(0.10, lerp(0.18, 0.55, d));
                    const phase = randomRange(0, Math.PI * 2);
                    obs.push(new Obstacle(rect, true, amp, freq, phase));
                } else {
                    obs.push(new Obstacle(rect, false));
                }
            }
        }

        return obs;
    }
}
