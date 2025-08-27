function initTargetGame() {
    const gameContainer = document.getElementById('gameContainer');
    
    gameContainer.innerHTML = `
        <div class="target-game">
            <div class="game-ui">
                <div class="game-timer">Time: <span id="timeLeft">30</span>s</div>
                <div class="targets-hit">Targets Hit: <span id="targetsHit">0</span></div>
                <div class="coins-earned">Coins: <span id="coinsEarned"> 0</span></div>
            </div>
            
            <div class="targets-area" id="targetsArea">
                <div class="instructions" id="instructions">
                    Click on targets as they appear!
                </div>
            </div>
            
            <div class="game-controls">
                <button class="start-btn" id="startBtn">START HUNTING!</button>
            </div>
        </div>
        
        <style>
        .target-game {
            text-align: center;
        }
        
        .targets-area {
            position: relative;
            width: 100%;
            height: 350px;
            background: rgba(15, 23, 42, 0.5); /* Semi-transparent dark blue */
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
            color: var(--text-secondary);
            font-size: 1.2rem;
            font-weight: 500;
        }
        
        .target {
            position: absolute;
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, #ef4444 0%, #dc2626 70%);
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid white;
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.6);
            animation: targetAppear 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), targetPulse 2s ease-in-out infinite;
            user-select: none;
            z-index: 5;
            transition: transform 0.1s ease-out;
        }
        
        .target::before {
            content: '';
            font-size: 1.5rem;
        }
        
        .target:hover {
            transform: scale(1.1);
        }
        
        .target.bonus {
            background: radial-gradient(circle, #fbbf24 0%, #f59e0b 70%);
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.8);
            animation: targetAppear 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), bonusTargetPulse 1.5s ease-in-out infinite;
        }
        
        .target.bonus::before {
            content: '';
        }
        
        @keyframes targetAppear {
            0% {
                opacity: 0;
                transform: scale(0.5);
            }
            100% {
                opacity: 1;
                transform: scale(1);
            }
        }
        
        @keyframes targetPulse {
            0%, 100% {
                box-shadow: 0 0 15px rgba(239, 68, 68, 0.6);
            }
            50% {
                box-shadow: 0 0 25px rgba(239, 68, 68, 0.9);
            }
        }
        
        @keyframes bonusTargetPulse {
            0%, 100% {
                box-shadow: 0 0 20px rgba(251, 191, 36, 0.8);
            }
            50% {
                box-shadow: 0 0 35px rgba(251, 191, 36, 1);
            }
        }
        
        .start-btn {
            background: var(--gradient-2);
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
            box-shadow: 0 10px 25px rgba(245, 87, 108, 0.4);
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
        
        .hit-effect {
            position: absolute;
            color: var(--success-color);
            font-size: 1.5rem;
            font-weight: bold;
            pointer-events: none;
            animation: hitEffect 1s ease-out forwards;
            z-index: 10;
        }
        
        @keyframes hitEffect {
            0% {
                opacity: 1;
                transform: scale(1);
            }
            100% {
                opacity: 0;
                transform: scale(2) translateY(-50px);
            }
        }
        
        .bonus-hit-effect {
            position: absolute;
            color: var(--warning-color);
            font-size: 2rem;
            font-weight: bold;
            pointer-events: none;
            animation: bonusHitEffect 1.5s ease-out forwards;
            z-index: 10;
        }
        
        @keyframes bonusHitEffect {
            0% {
                opacity: 1;
                transform: scale(0.5);
            }
            20% {
                opacity: 1;
                transform: scale(1.5);
            }
            100% {
                opacity: 0;
                transform: scale(1) translateY(-80px);
            }
        }
        
        .miss-effect {
            position: absolute;
            color: var(--danger-color);
            font-size: 1rem;
            font-weight: bold;
            pointer-events: none;
            animation: missEffect 0.8s ease-out forwards;
            z-index: 10;
        }
        
        @keyframes missEffect {
            0% {
                opacity: 1;
                transform: scale(1);
            }
            100% {
                opacity: 0;
                transform: scale(1.2) translateY(-30px);
            }
        }
        
        @media (max-width: 480px) {
            .target {
                width: 50px;
                height: 50px;
            }
            .targets-area {
                height: 300px;
            }
        }
        </style>
    `;
    
    const targetsArea = document.getElementById('targetsArea');
    const timeLeft = document.getElementById('timeLeft');
    const targetsHit = document.getElementById('targetsHit');
    const coinsEarned = document.getElementById('coinsEarned');
    const startBtn = document.getElementById('startBtn');
    const instructions = document.getElementById('instructions');
    
    let gameActive = false;
    let gameTimer = null;
    let spawnTimer = null;
    let timeRemaining = 30;
    let hits = 0;
    let coins = 0;
    let activeTargets = [];
    
    startBtn.addEventListener('click', startGame);
    
    // Click handler for missing targets
    targetsArea.addEventListener('click', (e) => {
        if (!gameActive) return;
        
        // Check if click was on empty area (miss)
        if (e.target === targetsArea) {
            createMissEffect(e);
        }
    });
    
    function startGame() {
        soundManager.play('gameStart');
        gameActive = true;
        startBtn.disabled = true;
        startBtn.textContent = 'Hunting...';
        instructions.style.display = 'none';
        
        timeRemaining = 30;
        hits = 0;
        coins = 0;
        activeTargets = [];
        
        // Clear any existing targets
        clearTargets();
        updateUI();
        
        // Start game timer
        gameTimer = setInterval(() => {
            timeRemaining--;
            timeLeft.textContent = timeRemaining;
            
            if (timeRemaining <= 0) {
                endGame();
            }
        }, 1000);
        
        // Start spawning targets - faster spawn rate
        spawnTarget();
        spawnTimer = setInterval(spawnTarget, 650); // Spawn every 0.65 seconds
    }
    
    function spawnTarget() {
        if (!gameActive) return;
        
        // Random chance for bonus target (15%)
        const isBonus = Math.random() < 0.15;
        
        const target = document.createElement('div');
        target.className = isBonus ? 'target bonus' : 'target';
        
        // Random position within bounds
        const maxX = targetsArea.clientWidth - 60;
        const maxY = targetsArea.clientHeight - 60;
        const x = Math.random() * maxX;
        const y = Math.random() * maxY;
        
        target.style.left = `${x}px`;
        target.style.top = `${y}px`;
        
        target.addEventListener('click', (e) => {
            e.stopPropagation();
            hitTarget(target, isBonus, e);
        });
        
        targetsArea.appendChild(target);
        activeTargets.push(target);
        
        // Auto-remove target after 1.5 seconds - faster disappearing
        setTimeout(() => {
            if (target.parentNode) {
                target.parentNode.removeChild(target);
                activeTargets = activeTargets.filter(t => t !== target);
            }
        }, 1500);
    }
    
    function hitTarget(target, isBonus, event) {
        if (!gameActive) return;
        
        // Play sound
        if (isBonus) {
            soundManager.play('bonusHit');
        } else {
            soundManager.play('targetHit');
        }

        // Remove target
        if (target.parentNode) {
            target.parentNode.removeChild(target);
        }
        activeTargets = activeTargets.filter(t => t !== target);
        
        // Update stats
        hits++;
        const coinReward = isBonus ? 2 : 1; // Bonus targets give 2 coins
        coins += coinReward;
        
        updateUI();
        
        // Show hit effect
        if (isBonus) {
            createBonusHitEffect(event, coinReward);
        } else {
            createHitEffect(event, coinReward);
        }
    }
    
    function createHitEffect(event, coinReward) {
        const effect = document.createElement('div');
        effect.className = 'hit-effect';
        effect.textContent = `+${coinReward}`;
        
        const rect = targetsArea.getBoundingClientRect();
        effect.style.left = `${event.clientX - rect.left}px`;
        effect.style.top = `${event.clientY - rect.top}px`;
        
        targetsArea.appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 1000);
    }
    
    function createBonusHitEffect(event, coinReward) {
        const effect = document.createElement('div');
        effect.className = 'bonus-hit-effect';
        effect.innerHTML = ` +${coinReward}!<br><small>BONUS!</small>`;
        
        const rect = targetsArea.getBoundingClientRect();
        effect.style.left = `${event.clientX - rect.left}px`;
        effect.style.top = `${event.clientY - rect.top}px`;
        
        targetsArea.appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 1500);
    }
    
    function createMissEffect(event) {
        const effect = document.createElement('div');
        effect.className = 'miss-effect';
        effect.textContent = 'Miss!';
        
        const rect = targetsArea.getBoundingClientRect();
        effect.style.left = `${event.clientX - rect.left}px`;
        effect.style.top = `${event.clientY - rect.top}px`;
        
        targetsArea.appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 800);
    }
    
    function clearTargets() {
        activeTargets.forEach(target => {
            if (target.parentNode) {
                target.parentNode.removeChild(target);
            }
        });
        activeTargets = [];
    }
    
    function updateUI() {
        targetsHit.textContent = hits;
        coinsEarned.textContent = ` ${coins}`;
    }
    
    function endGame() {
        gameActive = false;
        
        // Clear timers
        if (gameTimer) clearInterval(gameTimer);
        if (spawnTimer) clearInterval(spawnTimer);

        soundManager.play('gameOver');
        
        // Clear remaining targets
        clearTargets();
        
        // Award coins
        if (coins > 0) {
            window.awardCoins(coins, 'target');
        }
        
        // Calculate accuracy
        const accuracy = hits > 0 ? Math.round((hits / (hits + 5)) * 100) : 0; // Rough estimate
        
        // Reset UI
        startBtn.disabled = false;
        startBtn.textContent = `PLAY AGAIN - ${coins} coins earned!`;
        instructions.style.display = 'block';
        instructions.innerHTML = `
            <div style="background: var(--surface-color); padding: 1rem; border-radius: 8px; border: 2px solid var(--success-color);">
                <h3 style="color: var(--success-color); margin-bottom: 0.5rem;"> Game Complete!</h3>
                <p><strong>${hits}</strong> targets hit</p>
                <p><strong> ${coins}</strong> coins earned</p>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">Great shooting!</p>
            </div>
        `;
        
        setTimeout(() => {
            startBtn.textContent = 'PLAY AGAIN';
            instructions.innerHTML = 'Click on targets as they appear!';
        }, 3000);
    }
    
    // Store game instance for cleanup
    window.currentGame = {
        destroy: () => {
            gameActive = false;
            if (gameTimer) clearInterval(gameTimer);
            if (spawnTimer) clearInterval(spawnTimer);
            clearTargets();
        }
    };
}