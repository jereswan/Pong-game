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


class Level:
    """
    Procedurally generated rule-set + obstacles for a "level".
    """
    def __init__(self, idx):
        self.idx = idx

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

        # AI tuning
        self.ai_reaction = lerp(AI_REACTION_BASE, 0.22, d) + random.uniform(-0.015, 0.02)
        self.ai_max_speed = lerp(AI_MAX_SPEED_BASE, 10.2, d) + random.uniform(-0.5, 0.8)

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

    # Game state
    score_l = 0
    score_r = 0
    level_idx = 1
    level = Level(level_idx)

    # Paddles
    player = Paddle(40, HEIGHT // 2 - level.player_paddle_h // 2, level.player_paddle_h)
    ai = Paddle(WIDTH - 40 - PADDLE_W, HEIGHT // 2 - level.ai_paddle_h // 2, level.ai_paddle_h)

    # Balls
    balls = [serve_ball(level, direction=random.choice([-1, 1]))]

    paused = False
    running = True
    t = 0.0

    last_player_y = player.rect.y

    def new_level():
        nonlocal level_idx, level, player, ai, balls, t, last_player_y
        level_idx += 1
        level = Level(level_idx)
        player = Paddle(40, HEIGHT // 2 - level.player_paddle_h // 2, level.player_paddle_h)
        ai = Paddle(WIDTH - 40 - PADDLE_W, HEIGHT // 2 - level.ai_paddle_h // 2, level.ai_paddle_h)
        balls = [serve_ball(level, direction=random.choice([-1, 1]))]
        t = 0.0
        last_player_y = player.rect.y

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
                    level = Level(level_idx)
                    player = Paddle(40, HEIGHT // 2 - level.player_paddle_h // 2, level.player_paddle_h)
                    ai = Paddle(WIDTH - 40 - PADDLE_W, HEIGHT // 2 - level.ai_paddle_h // 2, level.ai_paddle_h)
                    balls = [serve_ball(level, direction=random.choice([-1, 1]))]
                    paused = False
                    t = 0.0
                    last_player_y = player.rect.y

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

            # AI movement with lag
            desired = target_ball.pos.y
            error = desired - ai.center_y()
            ai_step = clamp(error * level.ai_reaction, -level.ai_max_speed, level.ai_max_speed)
            ai.move(ai_step)

            # Update obstacles
            for o in level.obstacles:
                o.update(t)

            # Update balls
            wind_ax = level.wind.x
            wind_ay = level.wind.y
            for b in balls:
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
