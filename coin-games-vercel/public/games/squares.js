function initSquaresGame() {
    const gameContainer = document.getElementById('gameContainer');
    
    gameContainer.innerHTML = `
        <div class="squares-game">
            <div class="game-ui">
                <div class="game-timer">Time: <span id="timeLeft">30</span>s</div>
                <div class="squares-caught">Squares: <span id="squaresCaught">0</span></div>
                <div class="coins-earned">Coins: <span id="coinsEarned">🪙 0</span></div>
            </div>
            
            <div class="squares-area" id="squaresArea">
                <div class="instructions" id="instructions">
                    Click on the fast-moving squares!
                </div>
            </div>
            
            <div class="game-controls">
                <button class="start-btn" id="startBtn">START CATCHING!</button>
            </div>
        </div>
        
        <style>
        .squares-game {
            text-align: center;
        }
        
        .squares-area {
            position: relative;
            width: 100%;
            height: 350px;
            background: rgba(15, 23, 42, 0.5);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            overflow: hidden;
            user-select: none;
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }
        
        .instructions {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: var(--text-primary);
            font-size: 1.2rem;
            font-weight: 500;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }
        
        .moving-square {
            position: absolute;
            width: 40px;
            height: 40px;
            cursor: pointer;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 0.8rem;
            user-select: none;
            z-index: 5;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            transition: transform 0.1s ease;
        }
        
        .moving-square:hover {
            transform: scale(1.1);
        }
        
        .moving-square.normal {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            animation: moveSquareNormal linear;
        }
        
        .moving-square.fast {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            animation: moveSquareFast linear;
            box-shadow: 0 4px 8px rgba(239, 68, 68, 0.4);
        }
        
        .moving-square.bonus {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            animation: moveSquareBonus linear;
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.6);
        }
        
        .moving-square.bonus::before {
            content: '💎';
            font-size: 1rem;
        }
        
        @keyframes moveSquareNormal {
            0% {
                transform: translate(0, 0);
            }
            100% {
                transform: translate(var(--dx), var(--dy));
            }
        }
        
        @keyframes moveSquareFast {
            0% {
                transform: translate(0, 0) rotate(0deg);
            }
            100% {
                transform: translate(var(--dx), var(--dy)) rotate(360deg);
            }
        }
        
        @keyframes moveSquareBonus {
            0% {
                transform: translate(0, 0) scale(1);
            }
            25% {
                transform: translate(calc(var(--dx) * 0.25), calc(var(--dy) * 0.25)) scale(1.2);
            }
            50% {
                transform: translate(calc(var(--dx) * 0.5), calc(var(--dy) * 0.5)) scale(0.8);
            }
            75% {
                transform: translate(calc(var(--dx) * 0.75), calc(var(--dy) * 0.75)) scale(1.1);
            }
            100% {
                transform: translate(var(--dx), var(--dy)) scale(1);
            }
        }
        
        .start-btn {
            background: var(--gradient-1);
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
            box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
        }
        
        .start-btn:disabled {
            background: var(--border-color);
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        
        .coins-earned {
            color: var(--coin-color);
            font-weight: 600;
        }
        
        .catch-effect {
            position: absolute;
            pointer-events: none;
            font-size: 1.3rem;
            font-weight: bold;
            animation: catchEffect 1s ease-out forwards;
            z-index: 10;
        }
        
        .catch-effect.normal {
            color: var(--primary-color);
        }
        
        .catch-effect.fast {
            color: var(--danger-color);
        }
        
        .catch-effect.bonus {
            color: var(--warning-color);
        }
        
        @keyframes catchEffect {
            0% {
                opacity: 1;
                transform: scale(0.8);
            }
            20% {
                opacity: 1;
                transform: scale(1.3);
            }
            100% {
                opacity: 0;
                transform: scale(1) translateY(-40px);
            }
        }
        
        .trail {
            position: absolute;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            pointer-events: none;
            animation: trailFade 0.5s ease-out forwards;
        }
        
        @keyframes trailFade {
            0% {
                opacity: 0.8;
                transform: scale(1);
            }
            100% {
                opacity: 0;
                transform: scale(0.3);
            }
        }
        
        .streak-indicator {
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-weight: bold;
            display: none;
            animation: streakPulse 0.3s ease-out;
        }
        
        @keyframes streakPulse {
            0% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.1);
            }
            100% {
                transform: scale(1);
            }
        }
        
        @media (max-width: 480px) {
            .moving-square {
                width: 35px;
                height: 35px;
            }
            .squares-area {
                height: 300px;
            }
        }
        </style>
    `;
    
    const squaresArea = document.getElementById('squaresArea');
    const timeLeft = document.getElementById('timeLeft');
    const squaresCaught = document.getElementById('squaresCaught');
    const coinsEarned = document.getElementById('coinsEarned');
    const startBtn = document.getElementById('startBtn');
    const instructions = document.getElementById('instructions');
    
    let gameActive = false;
    let gameTimer = null;
    let spawnTimer = null;
    let timeRemaining = 30;
    let caughtCount = 0;
    let coins = 0;
    let activeSquares = [];
    let streak = 0;
    let streakTimer = null;
    
    // Square types with different behaviors
    const squareTypes = [
        { type: 'normal', probability: 0.6, coinValue: 1, speed: 2000, className: 'normal' },
        { type: 'fast', probability: 0.3, coinValue: 2, speed: 1000, className: 'fast' },
        { type: 'bonus', probability: 0.1, coinValue: 3, speed: 1500, className: 'bonus' }
    ];
    
    startBtn.addEventListener('click', startGame);
    
    function startGame() {
        soundManager.play('gameStart');
        gameActive = true;
        startBtn.disabled = true;
        startBtn.textContent = 'Catching...';
        instructions.style.display = 'none';
        
        timeRemaining = 30;
        caughtCount = 0;
        coins = 0;
        streak = 0;
        activeSquares = [];
        
        // Clear any existing squares
        clearSquares();
        updateUI();
        
        // Start game timer
        gameTimer = setInterval(() => {
            timeRemaining--;
            timeLeft.textContent = timeRemaining;
            
            if (timeRemaining <= 0) {
                endGame();
            }
        }, 1000);
        
        // Start spawning squares
        spawnSquare();
        spawnTimer = setInterval(spawnSquare, 800); // Spawn every 0.8 seconds
    }
    
    function spawnSquare() {
        if (!gameActive) return;
        
        // Select square type based on probability
        const random = Math.random();
        let cumulativeProbability = 0;
        let selectedType = squareTypes[0];
        
        for (const type of squareTypes) {
            cumulativeProbability += type.probability;
            if (random <= cumulativeProbability) {
                selectedType = type;
                break;
            }
        }
        
        const square = document.createElement('div');
        square.className = `moving-square ${selectedType.className}`;
        square.dataset.type = selectedType.type;
        square.dataset.coinValue = selectedType.coinValue;
        
        // Random starting position on edges
        const side = Math.floor(Math.random() * 4);
        const maxX = squaresArea.clientWidth - 40;
        const maxY = squaresArea.clientHeight - 40;
        
        let startX, startY, endX, endY;
        
        switch (side) {
            case 0: // Top
                startX = Math.random() * maxX;
                startY = -40;
                endX = Math.random() * maxX;
                endY = squaresArea.clientHeight;
                break;
            case 1: // Right
                startX = squaresArea.clientWidth;
                startY = Math.random() * maxY;
                endX = -40;
                endY = Math.random() * maxY;
                break;
            case 2: // Bottom
                startX = Math.random() * maxX;
                startY = squaresArea.clientHeight;
                endX = Math.random() * maxX;
                endY = -40;
                break;
            case 3: // Left
                startX = -40;
                startY = Math.random() * maxY;
                endX = squaresArea.clientWidth;
                endY = Math.random() * maxY;
                break;
        }
        
        square.style.left = `${startX}px`;
        square.style.top = `${startY}px`;
        
        // Set movement direction and speed
        const dx = endX - startX;
        const dy = endY - startY;
        square.style.setProperty('--dx', `${dx}px`);
        square.style.setProperty('--dy', `${dy}px`);
        square.style.animationDuration = `${selectedType.speed}ms`;
        
        square.addEventListener('click', (e) => {
            e.stopPropagation();
            catchSquare(square, e);
        });
        
        squaresArea.appendChild(square);
        activeSquares.push(square);
        
        // Create movement trail for fast squares
        if (selectedType.type === 'fast') {
            createMovementTrail(square, startX, startY, dx, dy, selectedType.speed);
        }
        
        // Auto-remove square after animation
        setTimeout(() => {
            if (square.parentNode) {
                square.parentNode.removeChild(square);
                activeSquares = activeSquares.filter(s => s !== square);
            }
        }, selectedType.speed + 100);
    }
    
    function createMovementTrail(square, startX, startY, dx, dy, duration) {
        const trailCount = 8;
        const interval = duration / trailCount;
        
        for (let i = 1; i <= trailCount; i++) {
            setTimeout(() => {
                if (!gameActive) return;
                
                const progress = i / trailCount;
                const trail = document.createElement('div');
                trail.className = 'trail';
                trail.style.left = `${startX + dx * progress}px`;
                trail.style.top = `${startY + dy * progress}px`;
                trail.style.background = '#ef4444';
                
                squaresArea.appendChild(trail);
                
                setTimeout(() => {
                    if (trail.parentNode) {
                        trail.parentNode.removeChild(trail);
                    }
                }, 500);
            }, interval * i);
        }
    }
    
    function catchSquare(square, event) {
        if (!gameActive) return;
        
        const type = square.dataset.type;
        const coinValue = parseInt(square.dataset.coinValue);
        
        // Play sound
        if (type === 'bonus') {
            soundManager.play('bonusHit');
        } else {
            soundManager.play('squareCatch');
        }

        // Remove square
        if (square.parentNode) {
            square.parentNode.removeChild(square);
        }
        activeSquares = activeSquares.filter(s => s !== square);
        
        // Update stats
        caughtCount++;
        streak++;
        
        // Bonus coins for streak
        let finalCoinValue = coinValue;
        if (streak >= 5) {
            finalCoinValue = Math.floor(coinValue * 1.25); // 25% bonus for 5+ streak
        }
        
        coins += finalCoinValue;
        updateUI();
        
        // Show catch effect
        createCatchEffect(event, finalCoinValue, type, coinValue !== finalCoinValue);
        
        // Reset streak timer
        resetStreakTimer();
        
        // Show streak indicator
        if (streak >= 3) {
            showStreakIndicator();
        }
    }
    
    function createCatchEffect(event, coinValue, type, isBonus) {
        const effect = document.createElement('div');
        effect.className = `catch-effect ${type}`;
        
        if (isBonus) {
            effect.innerHTML = `⚡ +${coinValue}!<br><small>STREAK!</small>`;
        } else {
            effect.textContent = `+${coinValue}`;
        }
        
        const rect = squaresArea.getBoundingClientRect();
        effect.style.left = `${event.clientX - rect.left}px`;
        effect.style.top = `${event.clientY - rect.top}px`;
        
        squaresArea.appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 1000);
    }
    
    function resetStreakTimer() {
        if (streakTimer) {
            clearTimeout(streakTimer);
        }
        
        // Reset streak after 3 seconds of inactivity
        streakTimer = setTimeout(() => {
            streak = 0;
            hideStreakIndicator();
        }, 3000);
    }
    
    function showStreakIndicator() {
        let indicator = squaresArea.querySelector('.streak-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'streak-indicator';
            squaresArea.appendChild(indicator);
        }
        
        indicator.textContent = `${streak}x STREAK!`;
        indicator.style.display = 'block';
    }
    
    function hideStreakIndicator() {
        const indicator = squaresArea.querySelector('.streak-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
    
    function clearSquares() {
        activeSquares.forEach(square => {
            if (square.parentNode) {
                square.parentNode.removeChild(square);
            }
        });
        activeSquares = [];
        hideStreakIndicator();
        
        // Clear any trails
        squaresArea.querySelectorAll('.trail').forEach(trail => {
            trail.parentNode.removeChild(trail);
        });
    }
    
    function updateUI() {
        squaresCaught.textContent = caughtCount;
        coinsEarned.textContent = `🪙 ${coins}`;
    }
    
    function endGame() {
        gameActive = false;
        
        // Clear timers
        if (gameTimer) clearInterval(gameTimer);
        if (spawnTimer) clearInterval(spawnTimer);
        if (streakTimer) clearTimeout(streakTimer);

        soundManager.play('gameOver');
        
        // Clear remaining squares
        clearSquares();
        
        // Award coins
        if (coins > 0) {
            window.awardCoins(coins, 'squares');
        }
        
        // Calculate accuracy (rough estimate)
        const accuracy = caughtCount > 0 ? Math.min(100, Math.round((caughtCount / (caughtCount + 3)) * 100)) : 0;
        
        // Reset UI
        startBtn.disabled = false;
        startBtn.textContent = `PLAY AGAIN - ${coins} coins earned!`;
        instructions.style.display = 'block';
        instructions.innerHTML = `
            <div style="background: rgba(0, 0, 0, 0.8); padding: 1rem; border-radius: 8px; border: 2px solid var(--success-color);">
                <h3 style="color: var(--success-color); margin-bottom: 0.5rem;">⬜ Game Complete!</h3>
                <p><strong>${caughtCount}</strong> squares caught</p>
                <p><strong>🪙 ${coins}</strong> coins earned</p>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">Lightning reflexes!</p>
            </div>
        `;
        
        setTimeout(() => {
            startBtn.textContent = 'PLAY AGAIN';
            instructions.innerHTML = 'Click on the fast-moving squares!';
        }, 3000);
    }
    
    // Store game instance for cleanup
    window.currentGame = {
        destroy: () => {
            gameActive = false;
            if (gameTimer) clearInterval(gameTimer);
            if (spawnTimer) clearInterval(spawnTimer);
            if (streakTimer) clearTimeout(streakTimer);
            clearSquares();
        }
    };
}