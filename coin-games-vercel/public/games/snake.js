function initSnakeGame() {
    const gameContainer = document.getElementById('gameContainer');
    
    gameContainer.innerHTML = `
        <div class="snake-game">
            <div class="game-ui">
                <div class="game-score">Score: <span id="snakeScore">0</span></div>
                <div class="coins-earned">Coins: <span id="snakeCoins">🪙 0</span></div>
                <div class="game-speed">Speed: <span id="gameSpeed">1x</span></div>
            </div>
            
            <div class="snake-canvas-container">
                <canvas id="snakeCanvas" width="600" height="600"></canvas>
                <div class="game-overlay" id="gameOverlay">
                    <div class="overlay-content">
                        <h3 id="overlayTitle">🐍 Coin Snake</h3>
                        <div class="instructions">
                            <p>🪙 Collect coins to grow your snake</p>
                            <p>💀 Don't hit the walls or yourself!</p>
                            <p class="controls">
                                <span class="desktop-controls">🖥️ Arrow Keys</span>
                                <span class="mobile-controls">📱 Swipe to move</span>
                            </p>
                        </div>
                        <button class="snake-start-btn" id="snakeStartBtn">START GAME</button>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
        .snake-game {
            text-align: center;
            width: 100%;
        }
        
        .snake-canvas-container {
            position: relative;
            display: inline-block;
            background: rgba(15, 23, 42, 0.5);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            overflow: hidden;
            margin: 1rem 0;
            max-width: 100%;
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }
        
        #snakeCanvas {
            display: block;
            background: transparent;
            max-width: 100%;
            height: auto;
        }
        
        .game-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: opacity 0.5s cubic-bezier(0.25, 1, 0.5, 1), visibility 0.5s;
            visibility: visible;
            opacity: 1;
        }
        
        .game-overlay.hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }
        
        .overlay-content {
            text-align: center;
            color: white;
            padding: 2rem;
            animation: fadeInScale 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        @keyframes fadeInScale {
            from {
                opacity: 0;
                transform: scale(0.9);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        
        #overlayTitle {
            font-size: 2rem;
            margin-bottom: 1rem;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }
        
        .instructions {
            margin: 1.5rem 0;
        }
        
        .instructions p {
            margin: 0.5rem 0;
            font-size: 1rem;
        }
        
        .controls {
            margin-top: 1rem;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
        
        .desktop-controls {
            display: inline;
        }
        
        .mobile-controls {
            display: none;
        }
        
        @media (max-width: 768px) {
            .desktop-controls {
                display: none;
            }
            .mobile-controls {
                display: inline;
            }
            #snakeCanvas {
                width: 100%;
                max-width: 400px;
            }
            .snake-canvas-container {
                margin: 1rem 0.5rem;
            }
        }
        
        @media (max-width: 480px) {
            #snakeCanvas {
                max-width: 320px;
            }
            .overlay-content {
                padding: 1rem;
            }
            #overlayTitle {
                font-size: 1.5rem;
            }
        }
        
        .snake-start-btn {
            background: var(--gradient-1);
            color: white;
            border: none;
            padding: 1rem 2rem;
            border-radius: 25px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 1rem;
        }
        
        .snake-start-btn:hover:not(:disabled) {
            transform: scale(1.05);
            box-shadow: 0 10px 20px rgba(99, 102, 241, 0.4);
        }
        
        .snake-start-btn:disabled {
            background: var(--border-color);
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        
        .coins-earned {
            color: var(--coin-color);
            font-weight: 600;
        }
        
        .game-speed {
            color: var(--accent-color);
            font-weight: 600;
        }
        </style>
    `;
    
    const canvas = document.getElementById('snakeCanvas');
    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('gameOverlay');
    const startBtn = document.getElementById('snakeStartBtn');
    const scoreEl = document.getElementById('snakeScore');
    const coinsEl = document.getElementById('snakeCoins');
    const speedEl = document.getElementById('gameSpeed');
    const overlayTitle = document.getElementById('overlayTitle');
    
    // Game settings
    const gridSize = 20;
    const tileCount = canvas.width / gridSize;
    
    // Game state
    let snake = [{ x: 10, y: 10 }];
    let food = { x: 15, y: 15 };
    let dx = 0;
    let dy = 0;
    let score = 0;
    let coins = 0;
    let gameRunning = false;
    let gameInterval = null;
    let gameSpeed = 200;
    let speedLevel = 1;
    
    // Touch handling for swipe gestures
    let touchStartX = null;
    let touchStartY = null;
    let touchEndX = null;
    let touchEndY = null;
    
    // Initialize
    updateUI();
    generateFood();
    draw();
    
    // Event listeners
    startBtn.addEventListener('click', startGame);
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (!gameRunning) return;
        
        let moved = false;
        switch (e.key) {
            case 'ArrowUp':
                if (dy !== 1) { dx = 0; dy = -1; moved = true; }
                break;
            case 'ArrowDown':
                if (dy !== -1) { dx = 0; dy = 1; moved = true; }
                break;
            case 'ArrowLeft':
                if (dx !== 1) { dx = -1; dy = 0; moved = true; }
                break;
            case 'ArrowRight':
                if (dx !== -1) { dx = 1; dy = 0; moved = true; }
                break;
        }
        if (moved) {
            soundManager.play('uiClick', 0.5);
        }
        e.preventDefault();
    });
    
    // Mobile swipe controls
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    
    function handleTouchStart(e) {
        e.preventDefault();
        if (!gameRunning) return;
        
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        touchStartX = touch.clientX - rect.left;
        touchStartY = touch.clientY - rect.top;
    }
    
    function handleTouchEnd(e) {
        e.preventDefault();
        if (!gameRunning || touchStartX === null || touchStartY === null) return;
        
        const touch = e.changedTouches[0];
        const rect = canvas.getBoundingClientRect();
        touchEndX = touch.clientX - rect.left;
        touchEndY = touch.clientY - rect.top;
        
        handleSwipe();
        
        // Reset touch coordinates
        touchStartX = null;
        touchStartY = null;
        touchEndX = null;
        touchEndY = null;
    }
    
    function handleSwipe() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const minSwipeDistance = 30; // Minimum distance for a swipe
        let moved = false;
        
        // Determine if it's a horizontal or vertical swipe
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    // Swipe right
                    if (dx !== -1) { dx = 1; dy = 0; moved = true; }
                } else {
                    // Swipe left
                    if (dx !== 1) { dx = -1; dy = 0; moved = true; }
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(deltaY) > minSwipeDistance) {
                if (deltaY > 0) {
                    // Swipe down
                    if (dy !== -1) { dx = 0; dy = 1; moved = true; }
                } else {
                    // Swipe up
                    if (dy !== 1) { dx = 0; dy = -1; moved = true; }
                }
            }
        }
        if (moved) {
            soundManager.play('uiClick', 0.5);
        }
    }
    
    function startGame() {
        soundManager.play('gameStart');
        // Reset game state
        snake = [{ x: 15, y: 15 }];
        dx = 0;
        dy = 0;
        score = 0;
        coins = 0;
        gameSpeed = 200;
        speedLevel = 1;
        
        generateFood();
        updateUI();
        
        // Hide overlay and start game
        overlay.classList.add('hidden');
        gameRunning = true;
        
        // Start game loop
        gameInterval = setInterval(gameLoop, gameSpeed);
    }
    
    function gameLoop() {
        if (!gameRunning) return;
        
        // Move snake
        if (dx !== 0 || dy !== 0) {
            const head = { x: snake[0].x + dx, y: snake[0].y + dy };
            
            // Check wall collision
            if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
                gameOver();
                return;
            }
            
            // Check self collision
            for (let segment of snake) {
                if (head.x === segment.x && head.y === segment.y) {
                    gameOver();
                    return;
                }
            }
            
            snake.unshift(head);
            
            // Check food collision
            if (head.x === food.x && head.y === food.y) {
                score++;
                coins++;
                soundManager.play('coinCollect');
                
                // Increase speed every 3 coins
                if (score % 3 === 0) {
                    speedLevel++;
                    gameSpeed = Math.max(80, 200 - (speedLevel * 15));
                    clearInterval(gameInterval);
                    gameInterval = setInterval(gameLoop, gameSpeed);
                }
                
                generateFood();
                updateUI();
            } else {
                snake.pop();
            }
        }
        
        draw();
    }
    
    function generateFood() {
        food = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        
        // Make sure food doesn't spawn on snake
        for (let segment of snake) {
            if (segment.x === food.x && segment.y === food.y) {
                generateFood();
                return;
            }
        }
    }
    
    function draw() {
        // Clear canvas
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid (subtle)
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let i = 0; i <= tileCount; i++) {
            ctx.beginPath();
            ctx.moveTo(i * gridSize, 0);
            ctx.lineTo(i * gridSize, canvas.height);
            ctx.moveTo(0, i * gridSize);
            ctx.lineTo(canvas.width, i * gridSize);
            ctx.stroke();
        }
        
        // Draw snake
        snake.forEach((segment, index) => {
            if (index === 0) {
                // Head
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
                
                // Eyes
                ctx.fillStyle = '#000';
                const eyeSize = 3;
                const eyeOffset = 5;
                if (dx === 1) { // Right
                    ctx.fillRect(segment.x * gridSize + eyeOffset + 5, segment.y * gridSize + eyeOffset, eyeSize, eyeSize);
                    ctx.fillRect(segment.x * gridSize + eyeOffset + 5, segment.y * gridSize + eyeOffset + 8, eyeSize, eyeSize);
                } else if (dx === -1) { // Left
                    ctx.fillRect(segment.x * gridSize + eyeOffset, segment.y * gridSize + eyeOffset, eyeSize, eyeSize);
                    ctx.fillRect(segment.x * gridSize + eyeOffset, segment.y * gridSize + eyeOffset + 8, eyeSize, eyeSize);
                } else if (dy === -1) { // Up
                    ctx.fillRect(segment.x * gridSize + eyeOffset, segment.y * gridSize + eyeOffset, eyeSize, eyeSize);
                    ctx.fillRect(segment.x * gridSize + eyeOffset + 8, segment.y * gridSize + eyeOffset, eyeSize, eyeSize);
                } else if (dy === 1) { // Down
                    ctx.fillRect(segment.x * gridSize + eyeOffset, segment.y * gridSize + eyeOffset + 8, eyeSize, eyeSize);
                    ctx.fillRect(segment.x * gridSize + eyeOffset + 8, segment.y * gridSize + eyeOffset + 8, eyeSize, eyeSize);
                }
            } else {
                // Body
                ctx.fillStyle = '#16a34a';
                ctx.fillRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
            }
        });
        
        // Draw food (coin)
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(food.x * gridSize + 2, food.y * gridSize + 2, gridSize - 4, gridSize - 4);
        
        // Draw coin emoji on food
        ctx.fillStyle = '#000';
        ctx.font = `${gridSize - 6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🪙', 
            food.x * gridSize + gridSize / 2, 
            food.y * gridSize + gridSize / 2
        );
    }
    
    function updateUI() {
        scoreEl.textContent = score;
        coinsEl.textContent = `🪙 ${coins}`;
        speedEl.textContent = `${speedLevel}x`;
    }
    
    function gameOver() {
        gameRunning = false;
        if (gameInterval) {
            clearInterval(gameInterval);
        }
        
        soundManager.play('gameOver');

        // Award coins
        if (coins > 0) {
            window.awardCoins(coins, 'snake');
            coins = 0; // Prevent double-awarding
        }
        
        // Show game over overlay
        overlayTitle.textContent = '💀 Game Over!';
        overlay.querySelector('.instructions').innerHTML = `
            <p>🏆 Final Score: ${score}</p>
            <p>🪙 Coins Earned: ${coins}</p>
            <p>⚡ Top Speed: ${speedLevel}x</p>
        `;
        startBtn.textContent = 'PLAY AGAIN';
        overlay.classList.remove('hidden');
        
        // Reset button text after delay
        setTimeout(() => {
            startBtn.textContent = 'START GAME';
            overlayTitle.textContent = '🐍 Coin Snake';
            overlay.querySelector('.instructions').innerHTML = `
                <p>🪙 Collect coins to grow your snake</p>
                <p>💀 Don't hit the walls or yourself!</p>
                <p class="controls">
                    <span class="desktop-controls">🖥️ Arrow Keys</span>
                    <span class="mobile-controls">📱 Swipe to move</span>
                </p>
            `;
        }, 3000);
    }
    
    // Cleanup function for modal close
    window.currentGame = {
        destroy: () => {
            if (!gameRunning) return; // Prevent re-running if game is already over
            gameRunning = false;
            if (gameInterval) {
                clearInterval(gameInterval);
            }
            
            // Award any coins earned if the modal is closed before game over
            if (coins > 0) {
                window.awardCoins(coins, 'snake');
                coins = 0;
            }

            // Reset touch coordinates
            touchStartX = null;
            touchStartY = null;
            touchEndX = null;
            touchEndY = null;
        }
    };
}