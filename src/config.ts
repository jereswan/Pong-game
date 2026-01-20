// =============================================================================
// Configuration Constants - Direct port from Python
// =============================================================================

export const WIDTH = 1100;
export const HEIGHT = 650;
export const FPS = 60;

// Colors
export const WHITE = 0xf5f5f5;
export const BLACK = 0x0f0f12;
export const GRAY = 0x78788c;
export const ACCENT = 0x78b4ff;

// Paddle dimensions
export const PADDLE_W = 16;
export const PADDLE_H_BASE = 120;

// Ball
export const BALL_R = 10;

// AI base values
export const AI_REACTION_BASE = 0.12;
export const AI_MAX_SPEED_BASE = 7.5;

// AI Skill Levels configuration
export interface AISkillConfig {
    name: string;
    reaction_mult: number;
    max_speed_mult: number;
    error_margin: number;
    color: number;
}

export const AI_SKILL_LEVELS: Record<number, AISkillConfig> = {
    0: { name: "Easy", reaction_mult: 0.35, max_speed_mult: 0.55, error_margin: 80, color: 0x64dc64 },
    1: { name: "Medium", reaction_mult: 0.65, max_speed_mult: 0.75, error_margin: 40, color: 0xdcc850 },
    2: { name: "Hard", reaction_mult: 1.0, max_speed_mult: 1.0, error_margin: 15, color: 0xdc823c },
    3: { name: "Expert", reaction_mult: 1.4, max_speed_mult: 1.25, error_margin: 0, color: 0xdc4646 },
};

export const SCORE_TO_WIN = 15;

// Color themes for paddles
export interface ColorTheme {
    name: string;
    primary: number;
    secondary: number;
}

export const COLOR_THEMES: Record<number, ColorTheme> = {
    0: { name: "Classic White", primary: 0xf5f5f5, secondary: 0xc8c8c8 },
    1: { name: "Neon Blue", primary: 0x50b4ff, secondary: 0x2864b4 },
    2: { name: "Hot Pink", primary: 0xff50b4, secondary: 0xb42878 },
    3: { name: "Lime Green", primary: 0x64ff64, secondary: 0x32b432 },
    4: { name: "Golden", primary: 0xffc850, secondary: 0xc89628 },
    5: { name: "Purple", primary: 0xb464ff, secondary: 0x783cb4 },
};

// Countries with flag colors (as hex)
export interface Country {
    name: string;
    colors: number[] | null; // 3 stripes top to bottom, or null for none
}

export const COUNTRIES: Record<number, Country> = {
    0: { name: "None", colors: null },
    1: { name: "France", colors: [0x0055a4, 0xffffff, 0xef4135] },
    2: { name: "Germany", colors: [0x000000, 0xdd0000, 0xffce00] },
    3: { name: "Italy", colors: [0x008c45, 0xffffff, 0xcd212a] },
    4: { name: "Spain", colors: [0xc6091e, 0xffc400, 0xc6091e] },
    5: { name: "Brazil", colors: [0x009c3b, 0xffdf00, 0x002776] },
    6: { name: "Argentina", colors: [0x74acdf, 0xffffff, 0x74acdf] },
    7: { name: "Japan", colors: [0xffffff, 0xbc002d, 0xffffff] },
    8: { name: "USA", colors: [0xbf0a30, 0xffffff, 0x002868] },
    9: { name: "UK", colors: [0x012169, 0xffffff, 0xc8102e] },
    10: { name: "Netherlands", colors: [0xae1c28, 0xffffff, 0x21468b] },
    11: { name: "Belgium", colors: [0x000000, 0xffe936, 0xef3340] },
    12: { name: "Portugal", colors: [0x006600, 0xff0000, 0xff0000] },
};

// Level progression knobs
export const MAX_OBS = 6;
export const MAX_WIND = 220.0;
export const MAX_EXTRA_BALL_CHANCE = 0.35;

// Power-up types
export interface PowerUpType {
    name: string;
    color: number;
    icon: string;
    duration: number;
    is_buff: boolean | null;
    description: string;
}

export const POWERUP_TYPES: Record<string, PowerUpType> = {
    speed_boost: {
        name: "SPEED UP!",
        color: 0xff5050,
        icon: "↑↑",
        duration: 4.0,
        is_buff: false,
        description: "Ball speeds up!",
    },
    slow_ball: {
        name: "SLOW MO",
        color: 0x50c8ff,
        icon: "~~",
        duration: 5.0,
        is_buff: true,
        description: "Ball slows down",
    },
    big_paddle: {
        name: "BIG PADDLE",
        color: 0x64ff64,
        icon: "▐▌",
        duration: 6.0,
        is_buff: true,
        description: "Your paddle grows!",
    },
    shrink_paddle: {
        name: "SHRINK!",
        color: 0xff64ff,
        icon: "><",
        duration: 5.0,
        is_buff: false,
        description: "Enemy paddle grows!",
    },
    multi_ball: {
        name: "MULTI-BALL",
        color: 0xffdc50,
        icon: "●●",
        duration: 0.0,
        is_buff: null,
        description: "Extra ball spawned!",
    },
};
