function initCatchGame() {
    const gameContainer = document.getElementById('gameContainer');
    
    gameContainer.innerHTML = `
        <div class="catch-game">
            <div class="game-ui">
                <div class="game-score">Score: <span id="gameScore">0</span></div>
                <div class="coins-collected">Coins: <span id="coinsCollected">🪙 0</span></div>
            </div>
            
            <div class="game-area" id="gameArea">
                <div class="player" id="player"></div>
                <div class="controls-help" id="controlsHelp">
                    <div class="desktop-controls">Use ← → arrow keys to move</div>
                    <div class="mobile-controls">Tap left/right side of screen to move</div>
                </div>
            </div>
            
            <div class="game-controls">
                <button class="start-btn" id="startBtn">START GAME</button>
            </div>
        </div>
        
        <style>
        .catch-game {
            text-align: center;
        }
        
        .game-area {
            position: relative;
            background: rgba(15, 23, 42, 0.5);
            user-select: none;
            height: 400px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }
        
        .player {
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, #fbbf24 0%, #f59e0b 70%);
            border-radius: 50%;
            border: 3px solid #fff;
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.6);
            transition: left 0.1s cubic-bezier(0.25, 1, 0.5, 1);
            z-index: 10;
        }
        
        .player::before {
            content: '😊';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 1.8rem;
        }
        
        .falling-coin {
            position: absolute;
            width: 30px;
            height: 30px;
            background: radial-gradient(circle, #fbbf24 0%, #f59e0b 70%);
            border-radius: 50%;
            border: 2px solid #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            animation: coinFall linear;
            box-shadow: 0 0 10px rgba(251, 191, 36, 0.4);
            z-index: 5;
        }
        
        .falling-coin::before {
            content: '🪙';
        }
        
        @keyframes coinFall {
            from {
                top: -40px;
                transform: rotate(360deg);
            }
            to {
                top: 100%;
                transform: rotate(360deg);
            }
        }
        
        .controls-help {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.7);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }
        
        .desktop-controls {
            display: block;
        }
        
        .mobile-controls {
            display: none;
        }
        
        @media (max-width: 768px) {
            .desktop-controls {
                display: none;
            }
            
            .mobile-controls {
                display: block;
            }
            .game-area {
                height: 350px;
            }
        }
        
        .start-btn {
            background: var(--gradient-3);
            color: white;
            border: none;
            padding: 1rem 2rem;
            border-radius: 25px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 1rem;
            transition: all 0.3s ease;
        }
        
        .start-btn:hover:not(:disabled) {
            transform: scale(1.05);
            box-shadow: 0 10px 25px rgba(79, 172, 254, 0.4);
        }
        
        .start-btn:disabled {
            background: var(--border-color);
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        
        .coins-collected {
            color: var(--coin-color);
            font-weight: 600;
        }
        </style>
    `;
    
    const gameArea = document.getElementById('gameArea');
    const player = document.getElementById('player');
    const gameScore = document.getElementById('gameScore');
    const coinsCollected = document.getElementById('coinsCollected');
    const startBtn = document.getElementById('startBtn');
    const controlsHelp = document.getElementById('controlsHelp');
    
    let gameActive = false;
    let coinSpawnTimer = null;
    let score = 0;
    let coins = 0;
    let playerPosition = 50; // percentage
    let fallingCoins = [];
    let animationFrame = null;
    
    // Touch controls for mobile
    let touchStartX = null;
    
    startBtn.addEventListener('click', startGame);
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (!gameActive) return;
        
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            movePlayer(-1);
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            movePlayer(1);
        }
    });
    
    // Touch controls
    gameArea.addEventListener('touchstart', handleTouchStart, { passive: false });
    gameArea.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    gameArea.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Mouse controls for mobile-like behavior
    gameArea.addEventListener('click', (e) => {
        if (!gameActive) return;
        
        const rect = gameArea.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const centerX = rect.width / 2;
        
        if (clickX < centerX) {
            movePlayer(-1);
        } else {
            movePlayer(1);
        }
    });
    
    function handleTouchStart(e) {
        if (!gameActive) return;
        touchStartX = e.touches[0].clientX;
    }
    
    function handleTouchEnd(e) {
        if (!gameActive || touchStartX === null) return;
        
        const rect = gameArea.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        
        if (touchStartX < centerX) {
            movePlayer(-1);
        } else {
            movePlayer(1);
        }
        
        touchStartX = null;
    }
    
    function movePlayer(direction) {
        if (!gameActive) return;
        
        soundManager.play('uiClick', 0.3);
        playerPosition += direction * 8;
        playerPosition = Math.max(5, Math.min(95, playerPosition)); // Keep within bounds, adjust for smaller screens
        
        player.style.left = `${playerPosition}%`;
    }
    
    function startGame() {
        soundManager.play('gameStart');
        gameActive = true;
        startBtn.disabled = true;
        startBtn.textContent = 'Playing... Close modal to stop';
        controlsHelp.style.display = 'none';
        
        score = 0;
        coins = 0;
        playerPosition = 50;
        fallingCoins = [];
        
        player.style.left = '50%';
        updateUI();
        
        // Start spawning coins
        spawnCoin();
        coinSpawnTimer = setInterval(spawnCoin, 1500);
        
        // Start game loop
        gameLoop();
    }
    
    function spawnCoin() {
        if (!gameActive) return;
        
        const coin = document.createElement('div');
        coin.className = 'falling-coin';
        coin.style.left = `${Math.random() * 80 + 10}%`;
        coin.style.animationDuration = `${2 + Math.random() * 2}s`;
        
        gameArea.appendChild(coin);
        fallingCoins.push({
            element: coin,
            x: parseFloat(coin.style.left),
            speed: 2 + Math.random() * 2
        });
        
        // Remove coin after animation
        setTimeout(() => {
            if (coin.parentNode) {
                coin.parentNode.removeChild(coin);
                fallingCoins = fallingCoins.filter(c => c.element !== coin);
            }
        }, 5000);
    }
    
    function gameLoop() {
        if (!gameActive) return;
        
        checkCollisions();
        animationFrame = requestAnimationFrame(gameLoop);
    }
    
    function checkCollisions() {
        const playerRect = player.getBoundingClientRect();
        const gameAreaRect = gameArea.getBoundingClientRect();
        
        fallingCoins.forEach((coinObj, index) => {
            const coinRect = coinObj.element.getBoundingClientRect();
            
            // Check if coin is in collision range with player
            if (
                coinRect.bottom >= playerRect.top &&
                coinRect.top <= playerRect.bottom &&
                coinRect.right >= playerRect.left &&
                coinRect.left <= playerRect.right
            ) {
                // Collision detected!
                collectCoin(coinObj, index);
            }
        });
    }
    
    function collectCoin(coinObj, index) {
        // Remove coin from DOM and array
        if (coinObj.element.parentNode) {
            coinObj.element.parentNode.removeChild(coinObj.element);
        }
        fallingCoins.splice(index, 1);
        
        // Update score
        score += 1;
        coins += 0.05;
        soundManager.play('coinCollect', 0.8);
        
        updateUI();
        
        // Visual feedback
        createCollectEffect(player.getBoundingClientRect());
    }
    
    function createCollectEffect(playerRect) {
        const effect = document.createElement('div');
        effect.style.position = 'absolute';
        effect.style.left = `${playerRect.left + playerRect.width / 2}px`;
        effect.style.bottom = `${playerRect.height + 10}px`;
        effect.style.color = '#fbbf24';
        effect.style.fontSize = '1.2rem';
        effect.style.fontWeight = 'bold';
        effect.style.pointerEvents = 'none';
        effect.style.animation = 'collectEffect 1s ease-out forwards';
        effect.textContent = '+0.05';
        
        gameArea.appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 1000);
    }
    
    function updateUI() {
        gameScore.textContent = score;
        coinsCollected.textContent = `🪙 ${coins.toFixed(2)}`;
    }
    
    // Add collect effect CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes collectEffect {
            0% {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateY(-50px) scale(1.5);
            }
        }
    `;
    document.head.appendChild(style);
    
    // Store game instance for cleanup
    window.currentGame = {
        destroy: () => {
            if (!gameActive) return;
            gameActive = false;
            
            if (coinSpawnTimer) clearInterval(coinSpawnTimer);
            if (animationFrame) cancelAnimationFrame(animationFrame);

            // Award coins
            if (coins > 0) {
                window.awardCoins(parseFloat(coins.toFixed(2)), 'catch');
            }
            
            // Clean up falling coins
            fallingCoins.forEach(coinObj => {
                if (coinObj.element.parentNode) {
                    coinObj.element.parentNode.removeChild(coinObj.element);
                }
            });
            fallingCoins = [];
        }
    };
}