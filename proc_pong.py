import math
import random
import pygame

# -----------------------------
# Procedural Pong
# -----------------------------

WIDTH, HEIGHT = 1100, 650
FPS = 60

WHITE = (245, 245, 245)
BLACK = (15, 15, 18)
GRAY = (120, 120, 130)
ACCENT = (120, 180, 255)

PADDLE_W = 16
PADDLE_H_BASE = 120

BALL_R = 10

AI_REACTION_BASE = 0.12  # higher = stronger AI
AI_MAX_SPEED_BASE = 7.5

# AI Skill Levels: (reaction_mult, max_speed_mult, error_margin, name)
# reaction_mult: multiplier for AI reaction (lower = worse)
# max_speed_mult: multiplier for AI max speed (lower = worse)
# error_margin: random offset added to AI target (higher = worse)
AI_SKILL_LEVELS = {
    0: {"name": "Easy", "reaction_mult": 0.35, "max_speed_mult": 0.55, "error_margin": 80, "color": (100, 220, 100)},
    1: {"name": "Medium", "reaction_mult": 0.65, "max_speed_mult": 0.75, "error_margin": 40, "color": (220, 200, 80)},
    2: {"name": "Hard", "reaction_mult": 1.0, "max_speed_mult": 1.0, "error_margin": 15, "color": (220, 130, 60)},
    3: {"name": "Expert", "reaction_mult": 1.4, "max_speed_mult": 1.25, "error_margin": 0, "color": (220, 70, 70)},
}

SCORE_TO_WIN = 15

# Level progression knobs
MAX_OBS = 6
MAX_WIND = 220.0  # pixels/sec^2 equivalent (applied as accel)
MAX_EXTRA_BALL_CHANCE = 0.35


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def lerp(a, b, t):
    return a + (b - a) * t


class Paddle:
    def __init__(self, x, y, h):
        self.rect = pygame.Rect(x, y, PADDLE_W, h)
        self.speed = 9.0

    def move(self, dy):
        self.rect.y += dy
        self.rect.y = clamp(self.rect.y, 0, HEIGHT - self.rect.height)

    def center_y(self):
        return self.rect.centery


class Obstacle:
    """
    Axis-aligned rectangle obstacle, optionally moving vertically in a sine wave.
    """
    def __init__(self, rect, moving=False, amp=0.0, freq=0.0, phase=0.0):
        self.base_rect = rect.copy()
        self.rect = rect
        self.moving = moving
        self.amp = amp
        self.freq = freq
        self.phase = phase

    def update(self, t):
        if self.moving:
            yoff = self.amp * math.sin(self.phase + t * self.freq * 2 * math.pi)
            self.rect.y = int(self.base_rect.y + yoff)

    def draw(self, screen):
        pygame.draw.rect(screen, GRAY, self.rect, border_radius=10)


class Ball:
    def __init__(self, x, y, vx, vy, speed_cap=1200.0):
        self.pos = pygame.Vector2(x, y)
        self.vel = pygame.Vector2(vx, vy)
        self.r = BALL_R
        self.speed_cap = speed_cap
        self.alive = True

    def rect(self):
        return pygame.Rect(int(self.pos.x - self.r), int(self.pos.y - self.r), self.r * 2, self.r * 2)

    def update(self, dt, wind_ax, wind_ay):
        # Apply "wind" as acceleration
        self.vel.x += wind_ax * dt
        self.vel.y += wind_ay * dt

        # Cap speed
        sp = self.vel.length()
        if sp > self.speed_cap:
            self.vel.scale_to_length(self.speed_cap)

        self.pos += self.vel * dt

        # Bounce off top/bottom
        if self.pos.y - self.r <= 0:
            self.pos.y = self.r
            self.vel.y *= -1
        elif self.pos.y + self.r >= HEIGHT:
            self.pos.y = HEIGHT - self.r
            self.vel.y *= -1

    def draw(self, screen):
        pygame.draw.circle(screen, WHITE, (int(self.pos.x), int(self.pos.y)), self.r)


# Power-up types with their effects
POWERUP_TYPES = {
    "speed_boost": {
        "name": "SPEED UP!",
        "color": (255, 80, 80),
        "icon": "↑↑",
        "duration": 4.0,
        "is_buff": False,  # Bad for player who hit it
        "description": "Ball speeds up!"
    },
    "slow_ball": {
        "name": "SLOW MO",
        "color": (80, 200, 255),
        "icon": "~~",
        "duration": 5.0,
        "is_buff": True,
        "description": "Ball slows down"
    },
    "big_paddle": {
        "name": "BIG PADDLE",
        "color": (100, 255, 100),
        "icon": "▐▌",
        "duration": 6.0,
        "is_buff": True,
        "description": "Your paddle grows!"
    },
    "shrink_paddle": {
        "name": "SHRINK!",
        "color": (255, 100, 255),
        "icon": "><",
        "duration": 5.0,
        "is_buff": False,
        "description": "Enemy paddle grows!"
    },
    "multi_ball": {
        "name": "MULTI-BALL",
        "color": (255, 220, 80),
        "icon": "●●",
        "duration": 0.0,  # Instant effect
        "is_buff": None,  # Chaotic
        "description": "Extra ball spawned!"
    }
}


class PowerUp:
    """
    A collectible power-up bubble that triggers effects when hit by the ball.
    """
    def __init__(self, x, y, ptype):
        self.pos = pygame.Vector2(x, y)
        self.r = 22
        self.ptype = ptype
        self.data = POWERUP_TYPES[ptype]
        self.alive = True
        self.pulse_time = 0.0
        
    def update(self, dt):
        self.pulse_time += dt
        
    def draw(self, screen, font):
        # Pulsing glow effect
        pulse = 1.0 + 0.15 * math.sin(self.pulse_time * 4)
        glow_r = int(self.r * pulse * 1.3)
        
        # Outer glow
        glow_color = tuple(min(255, int(c * 0.4)) for c in self.data["color"])
        pygame.draw.circle(screen, glow_color, (int(self.pos.x), int(self.pos.y)), glow_r)
        
        # Main circle
        pygame.draw.circle(screen, self.data["color"], (int(self.pos.x), int(self.pos.y)), self.r)
        
        # Inner highlight
        highlight_pos = (int(self.pos.x - 5), int(self.pos.y - 5))
        pygame.draw.circle(screen, (255, 255, 255), highlight_pos, 6)
        
        # Icon text
        icon = font.render(self.data["icon"], True, BLACK)
        screen.blit(icon, (self.pos.x - icon.get_width() // 2, self.pos.y - icon.get_height() // 2))
        
    def check_collision(self, ball):
        dist = (self.pos - ball.pos).length()
        return dist < (self.r + ball.r)


class ActiveEffect:
    """
    Tracks an active power-up effect with a timer.
    """
    def __init__(self, ptype, duration, affected_side):
        self.ptype = ptype
        self.time_left = duration
        self.affected_side = affected_side  # "left", "right", or "both"
        self.data = POWERUP_TYPES[ptype]
        
    def update(self, dt):
        self.time_left -= dt
        return self.time_left > 0


class Notification:
    """
    Floating notification text that fades out.
    """
    def __init__(self, text, color, y_pos):
        self.text = text
        self.color = color
        self.y = y_pos
        self.alpha = 255
        self.lifetime = 2.0
        self.age = 0.0
        
    def update(self, dt):
        self.age += dt
        self.y -= 30 * dt  # Float upward
        self.alpha = int(255 * (1 - self.age / self.lifetime))
        return self.age < self.lifetime
        
    def draw(self, screen, font):
        if self.alpha > 0:
            text_surf = font.render(self.text, True, self.color)
            text_surf.set_alpha(self.alpha)
            screen.blit(text_surf, (WIDTH // 2 - text_surf.get_width() // 2, int(self.y)))


class Level:
    """
    Procedurally generated rule-set + obstacles for a "level".
    """
    def __init__(self, idx, ai_skill=2):
        self.idx = idx
        self.ai_skill = ai_skill
        skill = AI_SKILL_LEVELS[ai_skill]

        # Difficulty ramps with idx, but stays fun
        d = min(1.0, idx / 18.0)

        # Paddle sizes change (can get smaller)
        self.player_paddle_h = int(lerp(PADDLE_H_BASE, 70, d) + random.randint(-10, 10))
        self.ai_paddle_h = int(lerp(PADDLE_H_BASE, 85, d) + random.randint(-8, 8))

        # Ball base speed increases
        self.ball_speed = lerp(520.0, 900.0, d) + random.uniform(-30, 40)

        # Wind (random direction and strength, sometimes none)
        if random.random() < lerp(0.10, 0.65, d):
            strength = random.uniform(0.0, lerp(60.0, MAX_WIND, d))
            angle = random.uniform(-math.pi, math.pi)
            self.wind = pygame.Vector2(math.cos(angle), math.sin(angle)) * strength
        else:
            self.wind = pygame.Vector2(0, 0)

        # Obstacles: count grows with idx
        obs_count = int(lerp(0, MAX_OBS, d))
        self.obstacles = self._generate_obstacles(obs_count, d)

        # Chance for extra ball (multi-ball)
        self.extra_ball_chance = lerp(0.0, MAX_EXTRA_BALL_CHANCE, d) * (0.65 + random.random() * 0.7)

        # AI tuning (affected by skill level)
        base_reaction = lerp(AI_REACTION_BASE, 0.22, d) + random.uniform(-0.015, 0.02)
        base_max_speed = lerp(AI_MAX_SPEED_BASE, 10.2, d) + random.uniform(-0.5, 0.8)
        self.ai_reaction = base_reaction * skill["reaction_mult"]
        self.ai_max_speed = base_max_speed * skill["max_speed_mult"]
        self.ai_error_margin = skill["error_margin"]

        # “Spin” effect magnitude (depends on paddle movement at impact)
        self.spin = lerp(0.18, 0.33, d)

        # Cosmetic name
        self.name = self._name()

    def _name(self):
        tags = []
        if self.wind.length() > 1:
            tags.append("WIND")
        if len(self.obstacles) > 0:
            tags.append("MAZE")
        if self.extra_ball_chance > 0.12:
            tags.append("MULTI")
        if not tags:
            tags = ["CLASSIC"]
        return f"LEVEL {self.idx} - " + " / ".join(tags)

    def _generate_obstacles(self, n, d):
        obs = []
        if n <= 0:
            return obs

        safe_margin = 120  # keep clear near paddles
        mid_min_x = safe_margin + 160
        mid_max_x = WIDTH - safe_margin - 160

        attempts = 0
        while len(obs) < n and attempts < 200:
            attempts += 1

            w = random.randint(26, int(lerp(60, 95, d)))
            h = random.randint(70, int(lerp(120, 200, d)))
            x = random.randint(mid_min_x, mid_max_x - w)
            y = random.randint(40, HEIGHT - 40 - h)

            rect = pygame.Rect(x, y, w, h)

            # Avoid stacking too tightly
            ok = True
            for o in obs:
                if rect.colliderect(o.rect.inflate(22, 22)):
                    ok = False
                    break

            if ok:
                moving = (random.random() < lerp(0.0, 0.55, d))
                if moving:
                    amp = random.uniform(16, lerp(20, 90, d))
                    freq = random.uniform(0.10, lerp(0.18, 0.55, d))
                    phase = random.uniform(0, math.pi * 2)
                    obs.append(Obstacle(rect, moving=True, amp=amp, freq=freq, phase=phase))
                else:
                    obs.append(Obstacle(rect, moving=False))

        return obs


def reflect_ball_off_rect(ball, rect, inflate=0):
    """
    Reflect the ball when it collides with an axis-aligned rect.
    Uses minimal overlap axis to choose reflection.
    """
    brect = ball.rect()
    if inflate:
        rect = rect.inflate(inflate, inflate)

    if not brect.colliderect(rect):
        return False

    # Compute overlap on x and y
    dx_left = rect.right - brect.left
    dx_right = brect.right - rect.left
    dy_top = rect.bottom - brect.top
    dy_bottom = brect.bottom - rect.top

    overlap_x = min(dx_left, dx_right)
    overlap_y = min(dy_top, dy_bottom)

    if overlap_x < overlap_y:
        # reflect X
        ball.vel.x *= -1
        # nudge out
        if dx_left < dx_right:
            ball.pos.x = rect.right + ball.r + 0.5
        else:
            ball.pos.x = rect.left - ball.r - 0.5
    else:
        # reflect Y
        ball.vel.y *= -1
        if dy_top < dy_bottom:
            ball.pos.y = rect.bottom + ball.r + 0.5
        else:
            ball.pos.y = rect.top - ball.r - 0.5

    return True


def serve_ball(level, direction):
    """
    Create a new ball served toward direction: +1 (right) or -1 (left)
    """
    angle = random.uniform(-0.55, 0.55)  # radians, small spread
    sp = level.ball_speed
    vx = math.cos(angle) * sp * direction
    vy = math.sin(angle) * sp
    # ensure y speed not too tiny
    if abs(vy) < 60:
        vy = 60 * (1 if random.random() < 0.5 else -1)
    return Ball(WIDTH / 2, HEIGHT / 2, vx, vy, speed_cap=1500.0)


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Procedural Pong")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont("menlo", 22)
    big = pygame.font.SysFont("menlo", 34, bold=True)
    title_font = pygame.font.SysFont("menlo", 48, bold=True)

    # --- SKILL SELECTION MENU ---
    ai_skill = 1  # Default to Medium
    in_menu = True
    
    while in_menu:
        clock.tick(FPS)
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    return
                elif event.key == pygame.K_UP or event.key == pygame.K_w:
                    ai_skill = max(0, ai_skill - 1)
                elif event.key == pygame.K_DOWN or event.key == pygame.K_s:
                    ai_skill = min(3, ai_skill + 1)
                elif event.key == pygame.K_RETURN or event.key == pygame.K_SPACE:
                    in_menu = False
                elif event.key in [pygame.K_1, pygame.K_2, pygame.K_3, pygame.K_4]:
                    ai_skill = event.key - pygame.K_1
                    in_menu = False
        
        # Render menu
        screen.fill(BLACK)
        
        # Title
        title = title_font.render("PROCEDURAL PONG", True, ACCENT)
        screen.blit(title, (WIDTH // 2 - title.get_width() // 2, 80))
        
        # Subtitle
        subtitle = font.render("Select AI Difficulty", True, WHITE)
        screen.blit(subtitle, (WIDTH // 2 - subtitle.get_width() // 2, 160))
        
        # Skill options
        for i, skill_data in AI_SKILL_LEVELS.items():
            color = skill_data["color"] if i == ai_skill else GRAY
            prefix = "> " if i == ai_skill else "  "
            text = big.render(f"{prefix}{i + 1}. {skill_data['name']}", True, color)
            y_pos = 220 + i * 60
            screen.blit(text, (WIDTH // 2 - text.get_width() // 2, y_pos))
            
            # Show description for selected
            if i == ai_skill:
                desc_texts = {
                    0: "Slow reactions, makes lots of mistakes",
                    1: "Moderate challenge, good for beginners",
                    2: "Fast and accurate, original difficulty",
                    3: "Lightning reflexes, nearly unbeatable!"
                }
                desc = font.render(desc_texts[i], True, (180, 180, 190))
                screen.blit(desc, (WIDTH // 2 - desc.get_width() // 2, y_pos + 35))
        
        # Controls hint
        hint = font.render("Use UP/DOWN or W/S to select, ENTER or 1-4 to start", True, (120, 120, 130))
        screen.blit(hint, (WIDTH // 2 - hint.get_width() // 2, HEIGHT - 60))
        
        pygame.display.flip()

    # --- GAME INITIALIZATION ---
    # Game state
    score_l = 0
    score_r = 0
    level_idx = 1
    level = Level(level_idx, ai_skill)

    # Paddles
    player = Paddle(40, HEIGHT // 2 - level.player_paddle_h // 2, level.player_paddle_h)
    ai = Paddle(WIDTH - 40 - PADDLE_W, HEIGHT // 2 - level.ai_paddle_h // 2, level.ai_paddle_h)

    # Balls
    balls = [serve_ball(level, direction=random.choice([-1, 1]))]

    paused = False
    running = True
    t = 0.0
    ai_error_offset = 0.0  # Current AI aiming error
    ai_error_timer = 0.0   # Time until next error change
    
    # Power-up system
    powerups = []
    active_effects = []
    notifications = []
    powerup_spawn_timer = random.uniform(3.0, 6.0)  # Time until next power-up spawns
    base_player_h = level.player_paddle_h
    base_ai_h = level.ai_paddle_h
    ball_speed_multiplier = 1.0

    last_player_y = player.rect.y

    def new_level():
        nonlocal level_idx, level, player, ai, balls, t, last_player_y, powerups, active_effects, base_player_h, base_ai_h, ball_speed_multiplier
        level_idx += 1
        level = Level(level_idx, ai_skill)
        player = Paddle(40, HEIGHT // 2 - level.player_paddle_h // 2, level.player_paddle_h)
        ai = Paddle(WIDTH - 40 - PADDLE_W, HEIGHT // 2 - level.ai_paddle_h // 2, level.ai_paddle_h)
        balls = [serve_ball(level, direction=random.choice([-1, 1]))]
        t = 0.0
        last_player_y = player.rect.y
        powerups = []
        active_effects = []
        base_player_h = level.player_paddle_h
        base_ai_h = level.ai_paddle_h
        ball_speed_multiplier = 1.0

    def reset_after_score(scored_left):
        nonlocal balls, t
        # scored_left = True => left player scored (ball went right out)
        # serve toward the player who got scored on
        direction = -1 if scored_left else 1
        balls = [serve_ball(level, direction=direction)]
        # possibly add extra ball(s)
        if random.random() < level.extra_ball_chance:
            balls.append(serve_ball(level, direction=direction))
        t = 0.0

    while running:
        dt = clock.tick(FPS) / 1000.0
        t += dt

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                if event.key == pygame.K_SPACE:
                    paused = not paused
                if event.key == pygame.K_r:
                    # full reset
                    score_l = score_r = 0
                    level_idx = 1
                    level = Level(level_idx, ai_skill)
                    player = Paddle(40, HEIGHT // 2 - level.player_paddle_h // 2, level.player_paddle_h)
                    ai = Paddle(WIDTH - 40 - PADDLE_W, HEIGHT // 2 - level.ai_paddle_h // 2, level.ai_paddle_h)
                    balls = [serve_ball(level, direction=random.choice([-1, 1]))]
                    paused = False
                    t = 0.0
                    last_player_y = player.rect.y
                    powerups = []
                    active_effects = []
                    notifications = []
                    base_player_h = level.player_paddle_h
                    base_ai_h = level.ai_paddle_h
                    ball_speed_multiplier = 1.0

        keys = pygame.key.get_pressed()
        if not paused:
            # Player control
            dy = 0.0
            if keys[pygame.K_w] or keys[pygame.K_UP]:
                dy -= player.speed
            if keys[pygame.K_s] or keys[pygame.K_DOWN]:
                dy += player.speed
            player.move(dy)

            player_dy = player.rect.y - last_player_y
            last_player_y = player.rect.y

            # AI control: tracks nearest ball moving toward it, with imperfect reaction
            target_ball = None
            best = 1e9
            for b in balls:
                if b.vel.x > 0:  # moving toward AI (right)
                    dist = (WIDTH - b.pos.x)
                    if dist < best:
                        best = dist
                        target_ball = b
            if target_ball is None:
                # fallback: track any ball
                target_ball = min(balls, key=lambda b: abs(b.pos.x - ai.rect.centerx))

            # AI movement with lag and error margin based on skill
            # Update AI error offset periodically for imperfect tracking
            ai_error_timer -= dt
            if ai_error_timer <= 0:
                ai_error_offset = random.uniform(-level.ai_error_margin, level.ai_error_margin)
                ai_error_timer = random.uniform(0.3, 0.8)  # Change error every 0.3-0.8 seconds
            
            desired = target_ball.pos.y + ai_error_offset
            error = desired - ai.center_y()
            ai_step = clamp(error * level.ai_reaction, -level.ai_max_speed, level.ai_max_speed)
            ai.move(ai_step)

            # Update obstacles
            for o in level.obstacles:
                o.update(t)
            
            # Spawn power-ups periodically
            powerup_spawn_timer -= dt
            if powerup_spawn_timer <= 0 and len(powerups) < 3:
                # Spawn in middle area of field
                px = random.randint(200, WIDTH - 200)
                py = random.randint(60, HEIGHT - 60)
                ptype = random.choice(list(POWERUP_TYPES.keys()))
                powerups.append(PowerUp(px, py, ptype))
                powerup_spawn_timer = random.uniform(4.0, 8.0)
            
            # Update power-ups
            for p in powerups:
                p.update(dt)
            
            # Check power-up collisions with balls
            for b in balls:
                for p in powerups[:]:
                    if p.check_collision(b):
                        # Determine which side triggered it based on ball direction
                        triggered_by_left = b.vel.x > 0  # Ball going right = left player hit it
                        
                        # Add notification
                        notifications.append(Notification(p.data["name"], p.data["color"], HEIGHT // 2))
                        
                        # Apply effect
                        if p.ptype == "speed_boost":
                            ball_speed_multiplier = 1.5
                            active_effects.append(ActiveEffect(p.ptype, p.data["duration"], "both"))
                        elif p.ptype == "slow_ball":
                            ball_speed_multiplier = 0.6
                            active_effects.append(ActiveEffect(p.ptype, p.data["duration"], "both"))
                        elif p.ptype == "big_paddle":
                            # Buff for the player who hit it
                            if triggered_by_left:
                                player.rect.height = int(base_player_h * 1.6)
                                player.rect.y = clamp(player.rect.y, 0, HEIGHT - player.rect.height)
                            else:
                                ai.rect.height = int(base_ai_h * 1.6)
                                ai.rect.y = clamp(ai.rect.y, 0, HEIGHT - ai.rect.height)
                            active_effects.append(ActiveEffect(p.ptype, p.data["duration"], "left" if triggered_by_left else "right"))
                        elif p.ptype == "shrink_paddle":
                            # Debuff for the opponent
                            if triggered_by_left:
                                ai.rect.height = int(base_ai_h * 0.5)
                            else:
                                player.rect.height = int(base_player_h * 0.5)
                            active_effects.append(ActiveEffect(p.ptype, p.data["duration"], "right" if triggered_by_left else "left"))
                        elif p.ptype == "multi_ball":
                            # Spawn extra ball
                            new_ball = Ball(b.pos.x, b.pos.y, -b.vel.x, b.vel.y + random.uniform(-100, 100), b.speed_cap)
                            balls.append(new_ball)
                        
                        powerups.remove(p)
                        break
            
            # Update active effects and remove expired ones
            for effect in active_effects[:]:
                if not effect.update(dt):
                    # Effect expired - reset
                    if effect.ptype == "speed_boost" or effect.ptype == "slow_ball":
                        ball_speed_multiplier = 1.0
                    elif effect.ptype == "big_paddle":
                        if effect.affected_side == "left":
                            player.rect.height = base_player_h
                        else:
                            ai.rect.height = base_ai_h
                    elif effect.ptype == "shrink_paddle":
                        if effect.affected_side == "left":
                            player.rect.height = base_player_h
                        else:
                            ai.rect.height = base_ai_h
                    active_effects.remove(effect)
            
            # Update notifications
            notifications = [n for n in notifications if n.update(dt)]

            # Update balls
            # Increase ball speed over time to prevent infinite rallies
            # Speed increases by 3% every 2 seconds of rally time
            speed_boost = 1.0 + (t / 2.0) * 0.03
            
            wind_ax = level.wind.x
            wind_ay = level.wind.y
            for b in balls:
                # Apply speed boost to ball velocity
                if speed_boost > 1.0:
                    current_speed = b.vel.length()
                    target_speed = current_speed * (1.0 + 0.03 * dt)  # Gradual increase
                    if current_speed > 0 and target_speed < b.speed_cap:
                        b.vel.scale_to_length(min(target_speed, b.speed_cap))
                
                # Apply power-up speed multiplier
                if ball_speed_multiplier != 1.0:
                    current_speed = b.vel.length()
                    target_sp = current_speed * ball_speed_multiplier
                    # Smoothly adjust speed
                    new_speed = lerp(current_speed, target_sp, 0.1)
                    if current_speed > 0:
                        b.vel.scale_to_length(clamp(new_speed, 200, b.speed_cap))
                
                b.update(dt, wind_ax, wind_ay)

                # Paddle collisions
                if b.rect().colliderect(player.rect):
                    # reflect x and add spin based on paddle motion
                    b.pos.x = player.rect.right + b.r + 0.5
                    b.vel.x = abs(b.vel.x)
                    b.vel.y += player_dy * (level.spin * 25.0)
                elif b.rect().colliderect(ai.rect):
                    b.pos.x = ai.rect.left - b.r - 0.5
                    b.vel.x = -abs(b.vel.x)
                    # AI "spin" smaller
                    b.vel.y += (random.uniform(-1, 1) * level.spin * 20.0)

                # Obstacle collisions
                for o in level.obstacles:
                    if reflect_ball_off_rect(b, o.rect):
                        # small randomness to prevent perfectly repeating loops
                        b.vel.y += random.uniform(-18, 18)

                # Clamp tiny y velocity to keep motion interesting
                if abs(b.vel.y) < 35:
                    b.vel.y = 35 * (1 if random.random() < 0.5 else -1)

            # Scoring: if ANY ball exits, score, but keep it simple (one score per frame)
            scored = False
            for b in balls:
                if b.pos.x + b.r < 0:
                    score_r += 1
                    scored = True
                    reset_after_score(scored_left=False)
                    break
                elif b.pos.x - b.r > WIDTH:
                    score_l += 1
                    scored = True
                    reset_after_score(scored_left=True)
                    break

            # Level up after each score (procedural generation)
            if scored:
                new_level()

            # Win condition
            if score_l >= SCORE_TO_WIN or score_r >= SCORE_TO_WIN:
                paused = True

        # -----------------------------
        # Render
        # -----------------------------
        screen.fill(BLACK)

        # Center line
        for y in range(0, HEIGHT, 26):
            pygame.draw.rect(screen, (40, 40, 50), (WIDTH // 2 - 3, y, 6, 16), border_radius=3)

        # Obstacles
        for o in level.obstacles:
            o.draw(screen)

        # Paddles
        pygame.draw.rect(screen, WHITE, player.rect, border_radius=10)
        pygame.draw.rect(screen, WHITE, ai.rect, border_radius=10)

        # Balls
        for b in balls:
            b.draw(screen)
        
        # Power-ups
        for p in powerups:
            p.draw(screen, font)
        
        # Notifications
        for n in notifications:
            n.draw(screen, big)
        
        # Active effects indicator
        effect_y = 72
        for effect in active_effects:
            timer_text = f"{effect.data['name']}: {effect.time_left:.1f}s"
            timer_surf = font.render(timer_text, True, effect.data["color"])
            screen.blit(timer_surf, (18, effect_y))
            effect_y += 24

        # HUD
        score_text = big.render(f"{score_l}   {score_r}", True, WHITE)
        screen.blit(score_text, (WIDTH // 2 - score_text.get_width() // 2, 18))

        lvl = font.render(level.name, True, ACCENT)
        screen.blit(lvl, (18, 16))

        wind_mag = level.wind.length()
        wind_txt = font.render(
            f"Wind: {wind_mag:.0f}" + ("" if wind_mag < 1 else f"  ({level.wind.x:.0f},{level.wind.y:.0f})"),
            True,
            (180, 180, 190)
        )
        screen.blit(wind_txt, (18, 44))

        hint = font.render("W/S or Up/Down to move | SPACE pause | R reset | ESC quit", True, (160, 160, 170))
        screen.blit(hint, (18, HEIGHT - 34))

        if paused:
            if score_l >= SCORE_TO_WIN or score_r >= SCORE_TO_WIN:
                winner = "LEFT" if score_l > score_r else "RIGHT"
                msg = big.render(f"{winner} WINS! Press R to restart", True, WHITE)
            else:
                msg = big.render("PAUSED (SPACE to resume)", True, WHITE)
            screen.blit(msg, (WIDTH // 2 - msg.get_width() // 2, HEIGHT // 2 - 18))

        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    main()
