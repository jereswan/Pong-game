// =============================================================================
// PlayState - Main Game Loop (Direct port from Python)
// =============================================================================

import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import {
    WIDTH,
    HEIGHT,
    BLACK,
    WHITE,
    GRAY,
    ACCENT,
    PADDLE_W,
    SCORE_TO_WIN,
    POWERUP_TYPES,
    COLOR_THEMES,
    COUNTRIES,
} from '../../config';
import { clamp, lerp, randomChoice, randomRange, randomInt } from '../../utils';
import { input } from '../systems/Input';
import { Paddle } from '../entities/Paddle';
import { Ball } from '../entities/Ball';
import { PowerUp, ActiveEffect, Notification } from '../entities/PowerUp';
import { Level } from '../levels/Level';
import { AI } from '../systems/AI';
import { reflectBallOffRect, ballCollidesWithRect } from '../systems/Collision';
import { MenuSettings } from './MenuState';

export class PlayState {
    private container: Container;
    private settings: MenuSettings;

    // Game state
    private scoreL: number = 0;
    private scoreR: number = 0;
    private levelIdx: number = 1;
    private level!: Level;
    private player!: Paddle;
    private ai!: Paddle;
    private aiSystem: AI;
    private balls: Ball[] = [];
    private paused: boolean = false;
    private t: number = 0.0;
    private lastPlayerY: number = 0;

    // Power-up system
    private powerups: PowerUp[] = [];
    private activeEffects: ActiveEffect[] = [];
    private notifications: Notification[] = [];
    private powerupSpawnTimer: number = 0;
    private basePlayerH: number = 0;
    private baseAiH: number = 0;
    private ballSpeedMultiplier: number = 1.0;

    // Callback
    private onReturnToMenu: (() => void) | null = null;

    // Text styles
    private bigStyle: TextStyle;
    private smallStyle: TextStyle;

    constructor(_app: Application, settings: MenuSettings) {
        this.settings = settings;
        this.container = new Container();
        this.aiSystem = new AI();

        // Create text styles
        this.bigStyle = new TextStyle({
            fontFamily: 'Courier New, monospace',
            fontSize: 34,
            fontWeight: 'bold',
            fill: WHITE,
        });

        this.smallStyle = new TextStyle({
            fontFamily: 'Courier New, monospace',
            fontSize: 18,
            fill: 0xb4b4be,
        });

        this.initGame();
    }

    setOnReturnToMenu(callback: () => void): void {
        this.onReturnToMenu = callback;
    }

    getContainer(): Container {
        return this.container;
    }

    private initGame(): void {
        this.scoreL = 0;
        this.scoreR = 0;
        this.levelIdx = 1;
        this.paused = false;
        this.t = 0.0;
        this.powerups = [];
        this.activeEffects = [];
        this.notifications = [];
        this.ballSpeedMultiplier = 1.0;

        this.newLevel();
        this.powerupSpawnTimer = randomRange(3.0, 6.0);
    }

    private newLevel(): void {
        this.levelIdx++;
        this.level = new Level(this.levelIdx, this.settings.aiSkill);

        this.player = new Paddle(
            40,
            HEIGHT / 2 - this.level.playerPaddleH / 2,
            this.level.playerPaddleH
        );
        this.ai = new Paddle(
            WIDTH - 40 - PADDLE_W,
            HEIGHT / 2 - this.level.aiPaddleH / 2,
            this.level.aiPaddleH
        );

        this.balls = [this.serveBall(randomChoice([-1, 1]))];
        this.t = 0.0;
        this.lastPlayerY = this.player.y;
        this.powerups = [];
        this.activeEffects = [];
        this.basePlayerH = this.level.playerPaddleH;
        this.baseAiH = this.level.aiPaddleH;
        this.ballSpeedMultiplier = 1.0;
    }

    private serveBall(direction: number): Ball {
        const angle = randomRange(-0.55, 0.55);
        const sp = this.level.ballSpeed;
        let vx = Math.cos(angle) * sp * direction;
        let vy = Math.sin(angle) * sp;

        // Ensure y speed not too tiny
        if (Math.abs(vy) < 60) {
            vy = 60 * (Math.random() < 0.5 ? 1 : -1);
        }

        return new Ball(WIDTH / 2, HEIGHT / 2, vx, vy, 1500.0);
    }

    private resetAfterScore(scoredLeft: boolean): void {
        // scoredLeft = true => left player scored (ball went right out)
        // serve toward the player who got scored on
        const direction = scoredLeft ? -1 : 1;
        this.balls = [this.serveBall(direction)];

        // Possibly add extra ball(s)
        if (Math.random() < this.level.extraBallChance) {
            this.balls.push(this.serveBall(direction));
        }
        this.t = 0.0;
    }

    update(dt: number): void {
        // Handle input
        if (input.isJustPressed('Space')) {
            this.paused = !this.paused;
        }

        if (input.isJustPressed('KeyR')) {
            this.initGame();
        }

        if (input.isJustPressed('Escape')) {
            if (this.onReturnToMenu) {
                this.onReturnToMenu();
            }
        }

        if (!this.paused) {
            this.updateGameplay(dt);
        }

        this.render();
    }

    private updateGameplay(dt: number): void {
        this.t += dt;

        // Player control
        let dy = 0.0;
        if (input.isUpPressed()) {
            dy -= this.player.speed;
        }
        if (input.isDownPressed()) {
            dy += this.player.speed;
        }
        this.player.move(dy);

        const playerDy = this.player.y - this.lastPlayerY;
        this.lastPlayerY = this.player.y;

        // AI control
        this.aiSystem.update(
            this.ai,
            this.balls,
            dt,
            this.level.aiReaction,
            this.level.aiMaxSpeed,
            this.level.aiErrorMargin
        );

        // Update obstacles
        for (const o of this.level.obstacles) {
            o.update(this.t);
        }

        // Spawn power-ups periodically
        this.powerupSpawnTimer -= dt;
        if (this.powerupSpawnTimer <= 0 && this.powerups.length < 3) {
            const px = randomInt(200, WIDTH - 200);
            const py = randomInt(60, HEIGHT - 60);
            const ptype = randomChoice(Object.keys(POWERUP_TYPES));
            this.powerups.push(new PowerUp(px, py, ptype));
            this.powerupSpawnTimer = randomRange(4.0, 8.0);
        }

        // Update power-ups
        for (const p of this.powerups) {
            p.update(dt);
        }

        // Check power-up collisions with balls
        for (const b of this.balls) {
            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const p = this.powerups[i]!;
                if (p.checkCollision(b)) {
                    // Determine which side triggered it based on ball direction
                    const triggeredByLeft = b.vel.x > 0;

                    // Add notification
                    this.notifications.push(new Notification(p.data.name, p.data.color, HEIGHT / 2));

                    // Apply effect
                    this.applyPowerUp(p, triggeredByLeft);
                    this.powerups.splice(i, 1);
                    break;
                }
            }
        }

        // Update active effects
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i]!;
            if (!effect.update(dt)) {
                // Effect expired - reset
                this.expireEffect(effect);
                this.activeEffects.splice(i, 1);
            }
        }

        // Update notifications
        this.notifications = this.notifications.filter((n) => n.update(dt));

        // Update balls with speed boost over time
        const speedBoost = 1.0 + (this.t / 2.0) * 0.03;
        const windAx = this.level.wind.x;
        const windAy = this.level.wind.y;

        for (const b of this.balls) {
            // Apply speed boost to ball velocity
            if (speedBoost > 1.0) {
                const currentSpeed = b.vel.length();
                const targetSpeed = currentSpeed * (1.0 + 0.03 * dt);
                if (currentSpeed > 0 && targetSpeed < b.speedCap) {
                    b.vel.scaleToLength(Math.min(targetSpeed, b.speedCap));
                }
            }

            // Apply power-up speed multiplier
            if (this.ballSpeedMultiplier !== 1.0) {
                const currentSpeed = b.vel.length();
                const targetSp = currentSpeed * this.ballSpeedMultiplier;
                const newSpeed = lerp(currentSpeed, targetSp, 0.1);
                if (currentSpeed > 0) {
                    b.vel.scaleToLength(clamp(newSpeed, 200, b.speedCap));
                }
            }

            b.update(dt, windAx, windAy);

            // Paddle collisions
            if (ballCollidesWithRect(b, this.player.rect)) {
                b.pos.x = this.player.right + b.r + 0.5;
                b.vel.x = Math.abs(b.vel.x);
                b.vel.y += playerDy * (this.level.spin * 25.0);
            } else if (ballCollidesWithRect(b, this.ai.rect)) {
                b.pos.x = this.ai.left - b.r - 0.5;
                b.vel.x = -Math.abs(b.vel.x);
                b.vel.y += randomRange(-1, 1) * this.level.spin * 20.0;
            }

            // Obstacle collisions
            for (const o of this.level.obstacles) {
                if (reflectBallOffRect(b, o.rect)) {
                    b.vel.y += randomRange(-18, 18);
                }
            }

            // Clamp tiny y velocity
            if (Math.abs(b.vel.y) < 35) {
                b.vel.y = 35 * (Math.random() < 0.5 ? 1 : -1);
            }
        }

        // Scoring
        let scored = false;
        for (const b of this.balls) {
            if (b.pos.x + b.r < 0) {
                this.scoreR++;
                scored = true;
                this.resetAfterScore(false);
                break;
            } else if (b.pos.x - b.r > WIDTH) {
                this.scoreL++;
                scored = true;
                this.resetAfterScore(true);
                break;
            }
        }

        // Level up after each score
        if (scored) {
            this.newLevel();
        }

        // Win condition
        if (this.scoreL >= SCORE_TO_WIN || this.scoreR >= SCORE_TO_WIN) {
            this.paused = true;
        }
    }

    private applyPowerUp(p: PowerUp, triggeredByLeft: boolean): void {
        switch (p.ptype) {
            case 'speed_boost':
                this.ballSpeedMultiplier = 1.5;
                this.activeEffects.push(new ActiveEffect(p.ptype, p.data.duration, 'both'));
                break;
            case 'slow_ball':
                this.ballSpeedMultiplier = 0.6;
                this.activeEffects.push(new ActiveEffect(p.ptype, p.data.duration, 'both'));
                break;
            case 'big_paddle':
                if (triggeredByLeft) {
                    this.player.height = Math.floor(this.basePlayerH * 1.6);
                    this.player.y = clamp(this.player.y, 0, HEIGHT - this.player.height);
                } else {
                    this.ai.height = Math.floor(this.baseAiH * 1.6);
                    this.ai.y = clamp(this.ai.y, 0, HEIGHT - this.ai.height);
                }
                this.activeEffects.push(
                    new ActiveEffect(p.ptype, p.data.duration, triggeredByLeft ? 'left' : 'right')
                );
                break;
            case 'shrink_paddle':
                if (triggeredByLeft) {
                    this.ai.height = Math.floor(this.baseAiH * 0.5);
                } else {
                    this.player.height = Math.floor(this.basePlayerH * 0.5);
                }
                this.activeEffects.push(
                    new ActiveEffect(p.ptype, p.data.duration, triggeredByLeft ? 'right' : 'left')
                );
                break;
            case 'multi_ball':
                const b = this.balls[0]!;
                const newBall = new Ball(
                    b.pos.x,
                    b.pos.y,
                    -b.vel.x,
                    b.vel.y + randomRange(-100, 100),
                    b.speedCap
                );
                this.balls.push(newBall);
                break;
        }
    }

    private expireEffect(effect: ActiveEffect): void {
        switch (effect.ptype) {
            case 'speed_boost':
            case 'slow_ball':
                this.ballSpeedMultiplier = 1.0;
                break;
            case 'big_paddle':
                if (effect.affectedSide === 'left') {
                    this.player.height = this.basePlayerH;
                } else {
                    this.ai.height = this.baseAiH;
                }
                break;
            case 'shrink_paddle':
                if (effect.affectedSide === 'left') {
                    this.player.height = this.basePlayerH;
                } else {
                    this.ai.height = this.baseAiH;
                }
                break;
        }
    }

    private render(): void {
        this.container.removeChildren();

        const g = new Graphics();
        this.container.addChild(g);

        // Background
        g.rect(0, 0, WIDTH, HEIGHT);
        g.fill(BLACK);

        // Center line
        for (let y = 0; y < HEIGHT; y += 26) {
            g.roundRect(WIDTH / 2 - 3, y, 6, 16, 3);
            g.fill(0x28283c);
        }

        // Obstacles
        for (const o of this.level.obstacles) {
            g.roundRect(o.rect.x, o.rect.y, o.rect.width, o.rect.height, 10);
            g.fill(GRAY);
        }

        // Paddles
        this.drawGamePaddle(g, this.player.rect, this.settings.playerColor, this.settings.playerCountry);
        this.drawGamePaddle(g, this.ai.rect, this.settings.opponentColor, this.settings.opponentCountry);

        // Balls
        for (const b of this.balls) {
            g.circle(b.pos.x, b.pos.y, b.r);
            g.fill(WHITE);
        }

        // Power-ups
        for (const p of this.powerups) {
            this.drawPowerUp(g, p);
        }

        // Notifications
        for (const n of this.notifications) {
            const notifText = new Text({
                text: n.text,
                style: new TextStyle({
                    fontFamily: 'Courier New, monospace',
                    fontSize: 34,
                    fontWeight: 'bold',
                    fill: n.color,
                }),
            });
            notifText.x = WIDTH / 2 - notifText.width / 2;
            notifText.y = n.y;
            notifText.alpha = n.alpha;
            this.container.addChild(notifText);
        }

        // Active effects indicator
        let effectY = 72;
        for (const effect of this.activeEffects) {
            const timerText = new Text({
                text: `${effect.data.name}: ${effect.timeLeft.toFixed(1)}s`,
                style: new TextStyle({
                    fontFamily: 'Courier New, monospace',
                    fontSize: 22,
                    fill: effect.data.color,
                }),
            });
            timerText.x = 18;
            timerText.y = effectY;
            this.container.addChild(timerText);
            effectY += 24;
        }

        // HUD
        const scoreText = new Text({
            text: `${this.scoreL}   ${this.scoreR}`,
            style: this.bigStyle,
        });
        scoreText.x = WIDTH / 2 - scoreText.width / 2;
        scoreText.y = 18;
        this.container.addChild(scoreText);

        const lvlText = new Text({
            text: this.level.name,
            style: new TextStyle({
                fontFamily: 'Courier New, monospace',
                fontSize: 22,
                fill: ACCENT,
            }),
        });
        lvlText.x = 18;
        lvlText.y = 16;
        this.container.addChild(lvlText);

        // Wind indicator
        const windMag = this.level.wind.length();
        const windKph = windMag * 0.36;
        let windStr: string;
        if (windMag < 1) {
            windStr = 'Wind: 0 kph';
        } else {
            const windAngle = Math.atan2(this.level.wind.y, this.level.wind.x);
            let arrow: string;
            if (-0.4 < windAngle && windAngle < 0.4) {
                arrow = '→';
            } else if (windAngle > 2.7 || windAngle < -2.7) {
                arrow = '←';
            } else if (windAngle > 0) {
                arrow = windAngle > 1.2 ? '↓' : '↘';
            } else {
                arrow = windAngle < -1.2 ? '↑' : '↗';
            }
            windStr = `Wind: ${Math.round(windKph)} kph ${arrow}`;
        }
        const windText = new Text({
            text: windStr,
            style: this.smallStyle,
        });
        windText.x = 18;
        windText.y = 44;
        this.container.addChild(windText);

        // Ball speed indicator
        if (this.balls.length > 0) {
            const maxBallSpeed = Math.max(...this.balls.map((b) => b.vel.length()));
            const ballKph = maxBallSpeed * 0.36;
            let speedColor: number;
            if (ballKph < 200) {
                speedColor = 0x64dc64; // Green
            } else if (ballKph < 350) {
                speedColor = 0xdcc850; // Yellow
            } else {
                speedColor = 0xdc5050; // Red
            }
            const ballSpeedText = new Text({
                text: `Ball: ${Math.round(ballKph)} kph`,
                style: new TextStyle({
                    fontFamily: 'Courier New, monospace',
                    fontSize: 22,
                    fill: speedColor,
                }),
            });
            ballSpeedText.x = WIDTH - ballSpeedText.width - 18;
            ballSpeedText.y = 16;
            this.container.addChild(ballSpeedText);
        }

        // Controls hint
        const hintText = new Text({
            text: 'W/S or Up/Down to move | SPACE pause | R reset | ESC menu',
            style: new TextStyle({
                fontFamily: 'Courier New, monospace',
                fontSize: 22,
                fill: 0xa0a0aa,
            }),
        });
        hintText.x = 18;
        hintText.y = HEIGHT - 34;
        this.container.addChild(hintText);

        // Pause/Win overlay
        if (this.paused) {
            let msg: string;
            if (this.scoreL >= SCORE_TO_WIN || this.scoreR >= SCORE_TO_WIN) {
                const winner = this.scoreL > this.scoreR ? 'LEFT' : 'RIGHT';
                msg = `${winner} WINS! Press R to restart`;
            } else {
                msg = 'PAUSED (SPACE to resume)';
            }
            const pauseText = new Text({
                text: msg,
                style: this.bigStyle,
            });
            pauseText.x = WIDTH / 2 - pauseText.width / 2;
            pauseText.y = HEIGHT / 2 - 18;
            this.container.addChild(pauseText);
        }
    }

    private drawGamePaddle(
        g: Graphics,
        rect: { x: number; y: number; width: number; height: number },
        colorIdx: number,
        countryIdx: number
    ): void {
        const country = COUNTRIES[countryIdx]!;
        const colorTheme = COLOR_THEMES[colorIdx]!;

        if (country.colors) {
            // Draw flag stripes
            const stripeH = rect.height / 3;
            for (let i = 0; i < 3; i++) {
                const isFirst = i === 0;
                const isLast = i === 2;
                if (isFirst || isLast) {
                    g.roundRect(rect.x, rect.y + i * stripeH, rect.width, stripeH + (isLast ? 0 : 1), 3);
                } else {
                    g.rect(rect.x, rect.y + i * stripeH, rect.width, stripeH + 1);
                }
                g.fill(country.colors[i]!);
            }
        } else {
            // Draw solid color with gradient effect
            g.roundRect(rect.x, rect.y, rect.width, rect.height, 10);
            g.fill(colorTheme.primary);

            // Add subtle highlight
            const highlightColor = Math.min(0xffffff, colorTheme.primary + 0x1e1e1e);
            g.roundRect(rect.x + 2, rect.y + 2, rect.width - 4, rect.height / 3, 6);
            g.fill(highlightColor);
        }
    }

    private drawPowerUp(g: Graphics, p: PowerUp): void {
        // Pulsing glow effect
        const pulse = 1.0 + 0.15 * Math.sin(p.pulseTime * 4);
        const glowR = Math.floor(p.r * pulse * 1.3);

        // Outer glow (dimmer version of color)
        const glowColor = (p.data.color & 0xfefefe) >> 1;
        g.circle(p.pos.x, p.pos.y, glowR);
        g.fill({ color: glowColor, alpha: 0.4 });

        // Main circle
        g.circle(p.pos.x, p.pos.y, p.r);
        g.fill(p.data.color);

        // Inner highlight
        g.circle(p.pos.x - 5, p.pos.y - 5, 6);
        g.fill(0xffffff);

        // Icon text
        const iconText = new Text({
            text: p.data.icon,
            style: new TextStyle({
                fontFamily: 'Courier New, monospace',
                fontSize: 18,
                fill: BLACK,
            }),
        });
        iconText.x = p.pos.x - iconText.width / 2;
        iconText.y = p.pos.y - iconText.height / 2;
        this.container.addChild(iconText);
    }
}
