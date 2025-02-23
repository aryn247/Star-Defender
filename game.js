const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const restartButton = document.getElementById('restart-button');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const healthElement = document.getElementById('health');
const highScoreElement = document.getElementById('high-score');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreElement = document.getElementById('final-score');
const nameModal = document.getElementById('name-modal');
const playerNameInput = document.getElementById('player-name');
const submitNameButton = document.getElementById('submit-name-button');
const leaderboardList = document.getElementById('leaderboard-list');

canvas.width = window.innerWidth * 0.9;
canvas.height = window.innerHeight * 0.7;

let playerName = '';
let score = 0;
let level = 1;
let health = 100;
let highScore = localStorage.getItem('highScore') || 0;
let gameInterval;
let player;
let enemies = [];
let powerUps = [];
let projectiles = [];
let isPaused = false;
let isGameOver = false;
let lastTouchTime = 0;

highScoreElement.textContent = highScore;

class Player {
    constructor() {
        this.width = 50;
        this.height = 50;
        this.x = canvas.width / 2;
        this.y = canvas.height - this.height - 10;
        this.speed = 5;
        this.dx = 0;
        this.isInvincible = false;
    }

    draw() {
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.width / 2, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height);
        ctx.closePath();
        ctx.fill();
    }

    update() {
        this.x += this.dx;

        if (this.x < this.width / 2) {
            this.x = this.width / 2;
        }
        if (this.x + this.width / 2 > canvas.width) {
            this.x = canvas.width - this.width / 2;
        }
    }

    move(direction) {
        if (direction === 'left') {
            this.dx = -this.speed;
        } else if (direction === 'right') {
            this.dx = this.speed;
        }
    }

    stop() {
        this.dx = 0;
    }

    shoot() {
        const projectile = new Projectile(this.x, this.y, 5, 10, 5);
        projectiles.push(projectile);
    }
}

class Projectile {
    constructor(x, y, width, height, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
    }

    draw() {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
    }

    update() {
        this.y -= this.speed;
    }
}

class Enemy {
    constructor(x, y, width, height, speed, type) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.type = type;
    }

    draw() {
        ctx.fillStyle = this.type === 'fast' ? 'orange' : this.type === 'zigzag' ? 'purple' : 'red';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.y += this.speed;

        if (this.type === 'zigzag') {
            this.x += Math.sin(this.y / 20) * 5;
        }

        if (this.y > canvas.height) {
            this.y = -this.height;
            this.x = Math.random() * (canvas.width - this.width);
            score++;
            scoreElement.textContent = score;

            if (score % 10 === 0) {
                level++;
                levelElement.textContent = level;
                increaseDifficulty();
            }
        }
    }
}

class PowerUp {
    constructor(x, y, size, type) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.type = type;
    }

    draw() {
        ctx.fillStyle = this.type === 'shield' ? 'cyan' : this.type === 'health' ? 'pink' : 'green';
        if (this.type === 'shield') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'health') {
            ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        } else {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.size / 2);
            ctx.lineTo(this.x - this.size / 2, this.y + this.size / 2);
            ctx.lineTo(this.x + this.size / 2, this.y + this.size / 2);
            ctx.closePath();
            ctx.fill();
        }
    }

    update() {
        this.y += 2;

        if (this.y > canvas.height) {
            const index = powerUps.indexOf(this);
            powerUps.splice(index, 1);
        }
    }

    applyEffect(player) {
        if (this.type === 'speed') {
            player.speed += 2;
            setTimeout(() => {
                player.speed -= 2;
            }, 5000);
        } else if (this.type === 'shield') {
            player.isInvincible = true;
            setTimeout(() => {
                player.isInvincible = false;
            }, 5000);
        } else if (this.type === 'health') {
            health = Math.min(100, health + 20);
            healthElement.textContent = health;
        }
    }
}

function createEnemies(numEnemies) {
    for (let i = 0; i < numEnemies; i++) {
        const width = 50;
        const height = 50;
        const x = Math.random() * (canvas.width - width);
        const y = Math.random() * -canvas.height - height; // Start enemies above the canvas
        const speed = Math.random() * 2 + 1;
        const type = Math.random() > 0.7 ? 'fast' : Math.random() > 0.4 ? 'zigzag' : 'normal';
        enemies.push(new Enemy(x, y, width, height, speed, type));
    }
}

function createPowerUp() {
    const size = 30;
    const x = Math.random() * (canvas.width - size);
    const y = -size;
    const type = Math.random() > 0.7 ? 'shield' : Math.random() > 0.4 ? 'health' : 'speed';
    powerUps.push(new PowerUp(x, y, size, type));
}

function updateGame() {
    if (isPaused || isGameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.update();
    player.draw();

    enemies.forEach(enemy => {
        enemy.update();
        enemy.draw();
    });

    projectiles.forEach(projectile => {
        projectile.update();
        projectile.draw();
    });

    powerUps.forEach(powerUp => {
        powerUp.update();
        powerUp.draw();
    });

    enemies.forEach((enemy, enemyIndex) => {
        if (player.x - player.width / 2 < enemy.x + enemy.width &&
            player.x + player.width / 2 > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            if (!player.isInvincible) {
                health -= 20;
                healthElement.textContent = health;

                if (health <= 0) {
                    gameOver();
                }
            }
        }

        projectiles.forEach((projectile, projectileIndex) => {
            if (projectile.x < enemy.x + enemy.width &&
                projectile.x + projectile.width > enemy.x &&
                projectile.y < enemy.y + enemy.height &&
                projectile.y + projectile.height > enemy.y) {
                enemies.splice(enemyIndex, 1);
                projectiles.splice(projectileIndex, 1);
                score++;
                scoreElement.textContent = score;

                if (score % 10 === 0) {
                    level++;
                    levelElement.textContent = level;
                    increaseDifficulty();
                }
            }
        });
    });

    powerUps.forEach((powerUp, index) => {
        if (player.x - player.width / 2 < powerUp.x + powerUp.size / 2 &&
            player.x + player.width / 2 > powerUp.x - powerUp.size / 2 &&
            player.y < powerUp.y + powerUp.size / 2 &&
            player.y + player.height > powerUp.y - powerUp.size / 2) {
            powerUp.applyEffect(player);
            powerUps.splice(index, 1);
        }
    });

    requestAnimationFrame(updateGame);
}

function increaseDifficulty() {
    enemies.forEach(enemy => {
        enemy.speed += 0.5;
    });

    createEnemies(level);
}

function gameOver() {
    isGameOver = true;
    gameOverModal.classList.remove('hidden');
    finalScoreElement.textContent = score;

    updateLeaderboard();

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreElement.textContent = highScore;
    }
}

function resetGame() {
    score = 0;
    level = 1;
    health = 100;
    scoreElement.textContent = score;
    levelElement.textContent = level;
    healthElement.textContent = health;
    player = new Player();
    enemies = [];
    powerUps = [];
    projectiles = [];
    createEnemies(5);
    gameOverModal.classList.add('hidden');
    isGameOver = false;
}

function startGame() {
    resetGame();
    requestAnimationFrame(updateGame);
    setupEventListeners();
}

function showNameModal() {
    nameModal.style.display = 'block';
}

function hideNameModal() {
    nameModal.style.display = 'none';
}

function updateLeaderboard() {
    let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
    leaderboard.push({ name: playerName, score: score });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    localStorage.setItem('leaderboard', JSON.stringify(leaderboard));

    leaderboardList.innerHTML = '';
    leaderboard.forEach(entry => {
        const li = document.createElement('li');
        li.textContent = `${entry.name}: ${entry.score}`;
        leaderboardList.appendChild(li);
    });
}

startButton.addEventListener('click', () => {
    showNameModal();
});

submitNameButton.addEventListener('click', () => {
    playerName = playerNameInput.value;
    if (playerName) {
        hideNameModal();
        startGame();
    }
});

pauseButton.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
});

restartButton.addEventListener('click', () => {
    startGame();
});

function setupEventListeners() {
    // Key controls
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            player.move('left');
        } else if (e.key === 'ArrowRight') {
            player.move('right');
        } else if (e.key === ' ') {
            player.shoot();
        }
    });

    document.addEventListener('keyup', () => {
        if (player) player.stop();
    });

    // Touch controls
    canvas.addEventListener('touchstart', (e) => {
        const touchX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
        if (touchX < player.x) {
            player.move('left');
        } else {
            player.move('right');
        }
    });

    canvas.addEventListener('touchend', (e) => {
        if (player) player.stop();
    });

    canvas.addEventListener('touchstart', (e) => {
        const now = Date.now();
        if (now - lastTouchTime > 100) { // Debounce touch events to reduce lag
            lastTouchTime = now;
            if (player) player.shoot();
        }
    });

    // Resize canvas on window resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth * 0.9;
        canvas.height = window.innerHeight * 0.7;
        if (player) {
            player.x = canvas.width / 2;
            player.y = canvas.height - player.height - 10;
        }
    });
}

setInterval(createPowerUp, 10000);
