// =============================================================================
// MenuState - Multi-page Menu System (Direct port from Python)
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
    AI_SKILL_LEVELS,
    COLOR_THEMES,
    COUNTRIES,
} from '../../config';
import { input } from '../systems/Input';

export interface MenuSettings {
    aiSkill: number;
    playerColor: number;
    playerCountry: number;
    opponentColor: number;
    opponentCountry: number;
}

export class MenuState {
    private container: Container;

    // Menu state
    private menuPage: number = 0; // 0=difficulty, 1=player, 2=opponent
    private aiSkill: number = 1; // Default to Medium
    private playerColor: number = 0;
    private playerCountry: number = 0;
    private opponentColor: number = 0;
    private opponentCountry: number = 0;
    private playerEditing: 'color' | 'country' = 'color';
    private opponentEditing: 'color' | 'country' = 'color';

    private onStartGame: ((settings: MenuSettings) => void) | null = null;

    // Text styles
    private titleStyle: TextStyle;
    private headerStyle: TextStyle;
    private smallStyle: TextStyle;

    constructor(_app: Application) {
        this.container = new Container();

        // Create text styles
        this.titleStyle = new TextStyle({
            fontFamily: 'Courier New, monospace',
            fontSize: 48,
            fontWeight: 'bold',
            fill: ACCENT,
        });

        this.headerStyle = new TextStyle({
            fontFamily: 'Courier New, monospace',
            fontSize: 22,
            fill: WHITE,
        });

        this.smallStyle = new TextStyle({
            fontFamily: 'Courier New, monospace',
            fontSize: 18,
            fill: 0xb4b4be,
        });
    }

    setOnStartGame(callback: (settings: MenuSettings) => void): void {
        this.onStartGame = callback;
    }

    getContainer(): Container {
        return this.container;
    }

    update(_dt: number): void {
        // Handle input
        if (input.isJustPressed('ArrowLeft') || input.isJustPressed('KeyA')) {
            this.menuPage = Math.max(0, this.menuPage - 1);
        }
        if (input.isJustPressed('ArrowRight') || input.isJustPressed('KeyD')) {
            this.menuPage = Math.min(2, this.menuPage + 1);
        }

        if (input.isJustPressed('ArrowUp') || input.isJustPressed('KeyW')) {
            this.handleUpDown(-1);
        }
        if (input.isJustPressed('ArrowDown') || input.isJustPressed('KeyS')) {
            this.handleUpDown(1);
        }

        if (input.isJustPressed('Tab')) {
            if (this.menuPage === 1) {
                this.playerEditing = this.playerEditing === 'color' ? 'country' : 'color';
            } else if (this.menuPage === 2) {
                this.opponentEditing = this.opponentEditing === 'color' ? 'country' : 'color';
            }
        }

        if (input.isJustPressed('Enter') || input.isJustPressed('Space')) {
            this.startGame();
        }

        if (input.isJustPressed('Escape')) {
            // Could add quit functionality
        }

        // Render
        this.render();
    }

    private handleUpDown(dir: number): void {
        const numColorThemes = Object.keys(COLOR_THEMES).length;
        const numCountries = Object.keys(COUNTRIES).length;

        if (this.menuPage === 0) {
            this.aiSkill = Math.max(0, Math.min(3, this.aiSkill + dir));
        } else if (this.menuPage === 1) {
            if (this.playerEditing === 'color') {
                this.playerColor = (this.playerColor + dir + numColorThemes) % numColorThemes;
            } else {
                this.playerCountry = (this.playerCountry + dir + numCountries) % numCountries;
            }
        } else if (this.menuPage === 2) {
            if (this.opponentEditing === 'color') {
                this.opponentColor = (this.opponentColor + dir + numColorThemes) % numColorThemes;
            } else {
                this.opponentCountry = (this.opponentCountry + dir + numCountries) % numCountries;
            }
        }
    }

    private startGame(): void {
        if (this.onStartGame) {
            this.onStartGame({
                aiSkill: this.aiSkill,
                playerColor: this.playerColor,
                playerCountry: this.playerCountry,
                opponentColor: this.opponentColor,
                opponentCountry: this.opponentCountry,
            });
        }
    }

    private render(): void {
        // Clear previous content
        this.container.removeChildren();

        const g = new Graphics();
        this.container.addChild(g);

        // Background
        g.rect(0, 0, WIDTH, HEIGHT);
        g.fill(BLACK);

        // Title
        const title = new Text({ text: 'PROCEDURAL PONG', style: this.titleStyle });
        title.x = WIDTH / 2 - title.width / 2;
        title.y = 40;
        this.container.addChild(title);

        // Page tabs
        const pages = ['DIFFICULTY', 'PLAYER', 'OPPONENT'];
        const tabWidth = 200;
        const tabStart = WIDTH / 2 - (pages.length * tabWidth) / 2;

        for (let i = 0; i < pages.length; i++) {
            const isActive = i === this.menuPage;
            const tabX = tabStart + i * tabWidth;

            if (isActive) {
                g.roundRect(tabX, 100, tabWidth - 10, 36, 8);
                g.fill(ACCENT);
            } else {
                g.roundRect(tabX, 100, tabWidth - 10, 36, 8);
                g.stroke({ color: GRAY, width: 2 });
            }

            const tabText = new Text({
                text: pages[i],
                style: new TextStyle({
                    fontFamily: 'Courier New, monospace',
                    fontSize: 22,
                    fill: isActive ? WHITE : GRAY,
                }),
            });
            tabText.x = tabX + tabWidth / 2 - tabText.width / 2 - 5;
            tabText.y = 108;
            this.container.addChild(tabText);
        }

        // Page content
        const contentY = 160;

        if (this.menuPage === 0) {
            this.renderDifficultyPage(g, contentY);
        } else if (this.menuPage === 1) {
            this.renderCustomizePage(g, contentY, 'player');
        } else {
            this.renderCustomizePage(g, contentY, 'opponent');
        }

        // Bottom hint
        const hint = new Text({
            text: 'LEFT/RIGHT: Switch Pages | UP/DOWN: Select | ENTER: Start Game',
            style: new TextStyle({
                fontFamily: 'Courier New, monospace',
                fontSize: 22,
                fill: 0x78788c,
            }),
        });
        hint.x = WIDTH / 2 - hint.width / 2;
        hint.y = HEIGHT - 50;
        this.container.addChild(hint);
    }

    private renderDifficultyPage(_g: Graphics, contentY: number): void {
        const subtitle = new Text({ text: 'Select AI Difficulty', style: this.headerStyle });
        subtitle.x = WIDTH / 2 - subtitle.width / 2;
        subtitle.y = contentY;
        this.container.addChild(subtitle);

        for (let i = 0; i < 4; i++) {
            const skill = AI_SKILL_LEVELS[i]!;
            const isSelected = i === this.aiSkill;
            const prefix = isSelected ? '> ' : '  ';
            const yPos = contentY + 50 + i * 55;

            const optionText = new Text({
                text: `${prefix}${skill.name}`,
                style: new TextStyle({
                    fontFamily: 'Courier New, monospace',
                    fontSize: 34,
                    fontWeight: 'bold',
                    fill: isSelected ? skill.color : GRAY,
                }),
            });
            optionText.x = WIDTH / 2 - optionText.width / 2;
            optionText.y = yPos;
            this.container.addChild(optionText);

            if (isSelected) {
                const descTexts: Record<number, string> = {
                    0: 'Slow reactions, makes lots of mistakes',
                    1: 'Moderate challenge, good for beginners',
                    2: 'Fast and accurate, original difficulty',
                    3: 'Lightning reflexes, nearly unbeatable!',
                };
                const desc = new Text({
                    text: descTexts[i]!,
                    style: this.smallStyle,
                });
                desc.x = WIDTH / 2 - desc.width / 2;
                desc.y = yPos + 32;
                this.container.addChild(desc);
            }
        }
    }

    private renderCustomizePage(g: Graphics, contentY: number, side: 'player' | 'opponent'): void {
        const isPlayer = side === 'player';
        const colorIdx = isPlayer ? this.playerColor : this.opponentColor;
        const countryIdx = isPlayer ? this.playerCountry : this.opponentCountry;
        const editing = isPlayer ? this.playerEditing : this.opponentEditing;

        const subtitleText = isPlayer
            ? 'Customize Your Paddle (YOU - Left Side)'
            : 'Customize Opponent Paddle (AI - Right Side)';

        const subtitle = new Text({ text: subtitleText, style: this.headerStyle });
        subtitle.x = WIDTH / 2 - subtitle.width / 2;
        subtitle.y = contentY;
        this.container.addChild(subtitle);

        // Color selection
        const colorLabel = editing === 'color' ? '> COLOR' : '  COLOR';
        const colorTheme = COLOR_THEMES[colorIdx]!;
        const colorText = new Text({
            text: `${colorLabel}: ${colorTheme.name}`,
            style: new TextStyle({
                fontFamily: 'Courier New, monospace',
                fontSize: 22,
                fill: editing === 'color' ? ACCENT : GRAY,
            }),
        });
        colorText.x = WIDTH / 2 - 180;
        colorText.y = contentY + 60;
        this.container.addChild(colorText);

        // Country selection
        const countryLabel = editing === 'country' ? '> COUNTRY' : '  COUNTRY';
        const country = COUNTRIES[countryIdx]!;
        const countryText = new Text({
            text: `${countryLabel}: ${country.name}`,
            style: new TextStyle({
                fontFamily: 'Courier New, monospace',
                fontSize: 22,
                fill: editing === 'country' ? ACCENT : GRAY,
            }),
        });
        countryText.x = WIDTH / 2 - 180;
        countryText.y = contentY + 100;
        this.container.addChild(countryText);

        // Preview label
        const previewLabel = new Text({ text: 'Preview:', style: this.headerStyle });
        previewLabel.x = WIDTH / 2 - 180;
        previewLabel.y = contentY + 160;
        this.container.addChild(previewLabel);

        // Draw paddle preview
        this.drawPaddlePreview(g, WIDTH / 2 - 180, contentY + 195, colorIdx, countryIdx, 100);

        // Tab hint
        const tabHint = new Text({
            text: 'Press TAB to switch between Color/Country',
            style: new TextStyle({
                fontFamily: 'Courier New, monospace',
                fontSize: 18,
                fill: 0x8c8c96,
            }),
        });
        tabHint.x = WIDTH / 2 - tabHint.width / 2;
        tabHint.y = contentY + 320;
        this.container.addChild(tabHint);
    }

    private drawPaddlePreview(
        g: Graphics,
        x: number,
        y: number,
        colorIdx: number,
        countryIdx: number,
        height: number
    ): void {
        const country = COUNTRIES[countryIdx]!;
        const colorTheme = COLOR_THEMES[colorIdx]!;
        const width = PADDLE_W * 2;

        if (country.colors) {
            // Draw flag stripes
            const stripeH = height / 3;
            for (let i = 0; i < 3; i++) {
                g.rect(x, y + i * stripeH, width, stripeH);
                g.fill(country.colors[i]!);
            }
        } else {
            // Draw solid color
            g.roundRect(x, y, width, height, 6);
            g.fill(colorTheme.primary);
        }
    }
}
