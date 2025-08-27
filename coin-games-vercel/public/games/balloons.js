function initBalloonsGame() {
    const gameContainer = document.getElementById('gameContainer');
    
    gameContainer.innerHTML = `
        <div class="balloons-game">
            <div class="game-ui">
                <div class="game-timer">Time: <span id="timeLeft">45</span>s</div>
                <div class="balloons-popped">Balloons: <span id="balloonsPopped">0</span></div>
                <div class="coins-earned">Coins: <span id="coinsEarned">🪙 0</span></div>
            </div>
            
            <div class="balloons-area" id="balloonsArea">
                <div class="instructions" id="instructions">
                    Pop the floating balloons to collect coins!
                </div>
            </div>
            
            <div class="game-controls">
                <button class="start-btn" id="startBtn">START POPPING!</button>
            </div>
        </div>
        
        <style>
        .balloons-game {
            text-align: center;
        }
        
        .balloons-area {
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
            color: white;
            font-size: 1.2rem;
            font-weight: 500;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }
        
        .balloon {
            position: absolute;
            width: 50px;
            height: 70px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 0.9rem;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
            animation: balloonFloat linear infinite;
            user-select: none;
            z-index: 5;
            border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
            box-shadow: inset -5px -5px 0 rgba(0, 0, 0, 0.1);
            transition: transform 0.1s ease-out;
        }
        
        .balloon::after {
            content: '';
            position: absolute;
            bottom: -20px;
            left: 50%;
            transform: translateX(-50%);
            width: 2px;
            height: 20px;
            background: #8b5cf6;
            border-radius: 1px;
        }
        
        .balloon.value-1 {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }
        
        .balloon.value-3 {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }
        
        .balloon.value-5 {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }
        
        .balloon.value-10 {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            box-shadow: 0 0 15px rgba(139, 92, 246, 0.5), inset -5px -5px 0 rgba(0, 0, 0, 0.1);
        }
        
        .balloon:hover {
            transform: scale(1.1);
        }
        
        @keyframes balloonFloat {
            0% {
                bottom: -80px;
                transform: translateX(0) rotate(0deg);
            }
            25% {
                transform: translateX(10px) rotate(2deg);
            }
            50% {
                transform: translateX(-5px) rotate(-1deg);
            }
            75% {
                transform: translateX(5px) rotate(1deg);
            }
            100% {
                bottom: 370px;
                transform: translateX(0) rotate(0deg);
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
        
        .coins-earned {
            color: var(--coin-color);
            font-weight: 600;
        }
        
        .pop-effect {
            position: absolute;
            pointer-events: none;
            font-size: 1.5rem;
            font-weight: bold;
            animation: popEffect 1s ease-out forwards;
            z-index: 10;
        }
        
        @keyframes popEffect {
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
                transform: scale(1) translateY(-60px);
            }
        }
        
        .balloon-particles {
            position: absolute;
            pointer-events: none;
            z-index: 15;
        }
        
        .particle {
            position: absolute;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            animation: particle 0.8s ease-out forwards;
        }
        
        @keyframes particle {
            0% {
                opacity: 1;
                transform: scale(1) translate(0, 0);
            }
            100% {
                opacity: 0;
                transform: scale(0) translate(var(--dx), var(--dy));
            }
        }
        
        .combo-indicator {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-weight: bold;
            display: none;
            animation: comboAppear 0.3s ease-out;
        }
        
        @keyframes comboAppear {
            0% {
                opacity: 0;
                transform: scale(0.8);
            }
            100% {
                opacity: 1;
                transform: scale(1);
            }
        }
        
        @media (max-width: 480px) {
            .balloon {
                width: 40px;
                height: 55px;
            }
            .balloons-area {
                height: 300px;
            }
        }
        </style>
    `;
    
    const balloonsArea = document.getElementById('balloonsArea');
    const timeLeft = document.getElementById('timeLeft');
    const balloonsPopped = document.getElementById('balloonsPopped');
    const coinsEarned = document.getElementById('coinsEarned');
    const startBtn = document.getElementById('startBtn');
    const instructions = document.getElementById('instructions');
    
    let gameActive = false;
    let gameTimer = null;
    let spawnTimer = null;
    let timeRemaining = 45;
    let poppedCount = 0;
    let coins = 0;
    let activeBalloons = [];
    let combo = 0;
    let comboTimer = null;
    
    // Balloon values and their spawn probabilities
    const balloonTypes = [
        { value: 1, probability: 0.5, className: 'value-1' },
        { value: 2, probability: 0.35, className: "value-2" },
        { value: 3, probability: 0.15, className: "value-3" }
    ];
    
    startBtn.addEventListener('click', startGame);
    
    function startGame() {
        soundManager.play('gameStart');
        gameActive = true;
        startBtn.disabled = true;
        startBtn.textContent = 'Popping...';
        instructions.style.display = 'none';
        
        timeRemaining = 45;
        poppedCount = 0;
        coins = 0;
        combo = 0;
        activeBalloons = [];
        
        // Clear any existing balloons
        clearBalloons();
        updateUI();
        
        // Start game timer
        gameTimer = setInterval(() => {
            timeRemaining--;
            timeLeft.textContent = timeRemaining;
            
            if (timeRemaining <= 0) {
                endGame();
            }
        }, 1000);
        
        // Start spawning balloons - faster spawn rate
        spawnBalloon();
        spawnTimer = setInterval(spawnBalloon, 1200); // Spawn every 1.2 seconds (was 1.8)
    }
    
    function spawnBalloon() {
        if (!gameActive) return;
        
        // Select balloon type based on probability
        const random = Math.random();
        let cumulativeProbability = 0;
        let selectedType = balloonTypes[0];
        
        for (const type of balloonTypes) {
            cumulativeProbability += type.probability;
            if (random <= cumulativeProbability) {
                selectedType = type;
                break;
            }
        }
        
        const balloon = document.createElement('div');
        balloon.className = `balloon ${selectedType.className}`;
        balloon.textContent = selectedType.value;
        balloon.dataset.value = selectedType.value;
        
        // Random horizontal position
        const maxX = balloonsArea.clientWidth - 50;
        const x = Math.random() * maxX;
        balloon.style.left = `${x}px`;
        
        // Faster floating speed (2-5 seconds instead of 4-8)
        const floatDuration = 2 + Math.random() * 3;
        balloon.style.animationDuration = `${floatDuration}s`;
        
        balloon.addEventListener('click', (e) => {
            e.stopPropagation();
            popBalloon(balloon, e);
        });
        
        balloonsArea.appendChild(balloon);
        activeBalloons.push(balloon);
        
        // Auto-remove balloon after it floats away
        setTimeout(() => {
            if (balloon.parentNode) {
                balloon.parentNode.removeChild(balloon);
                activeBalloons = activeBalloons.filter(b => b !== balloon);
            }
        }, floatDuration * 1000 + 500);
    }
    
    function popBalloon(balloon, event) {
        if (!gameActive) return;
        
        const value = parseInt(balloon.dataset.value);
        
        // Play sound
        soundManager.play('balloonPop', 0.8 + value * 0.05);

        // Remove balloon
        if (balloon.parentNode) {
            balloon.parentNode.removeChild(balloon);
        }
        activeBalloons = activeBalloons.filter(b => b !== balloon);
        
        // Update stats
        poppedCount++;
        combo++;
        
        // Bonus coins for combos
        let coinReward = value;
        if (combo >= 5) {
            coinReward = Math.floor(value * 1.5); // 50% bonus for 5+ combo
        }
        
        coins += coinReward;
        updateUI();
        
        // Show pop effect
        createPopEffect(event, coinReward, value !== coinReward);
        
        // Create particle effect
        createParticleEffect(event, balloon.className);
        
        // Reset combo timer
        resetComboTimer();
        
        // Show combo indicator
        if (combo >= 3) {
            showComboIndicator();
        }
    }
    
    function createPopEffect(event, coinReward, isBonus) {
        const effect = document.createElement('div');
        effect.className = 'pop-effect';
        effect.style.color = isBonus ? '#fbbf24' : '#10b981';
        effect.innerHTML = isBonus ? `💥 +${coinReward}!<br><small>COMBO!</small>` : `+${coinReward}`;
        
        const rect = balloonsArea.getBoundingClientRect();
        effect.style.left = `${event.clientX - rect.left}px`;
        effect.style.top = `${event.clientY - rect.top}px`;
        
        balloonsArea.appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 1000);
    }
    
    function createParticleEffect(event, balloonClass) {
        const particles = document.createElement('div');
        particles.className = 'balloon-particles';
        
        const rect = balloonsArea.getBoundingClientRect();
        particles.style.left = `${event.clientX - rect.left}px`;
        particles.style.top = `${event.clientY - rect.top}px`;
        
        // Create 6 particles
        for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Set particle color based on balloon type
            if (balloonClass.includes('value-1')) {
                particle.style.background = '#ef4444';
            } else if (balloonClass.includes('value-3')) {
                particle.style.background = '#f59e0b';
            } else if (balloonClass.includes('value-5')) {
                particle.style.background = '#10b981';
            } else {
                particle.style.background = '#8b5cf6';
            }
            
            // Random direction
            const angle = (i / 6) * Math.PI * 2;
            const distance = 30 + Math.random() * 20;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;
            
            particle.style.setProperty('--dx', `${dx}px`);
            particle.style.setProperty('--dy', `${dy}px`);
            
            particles.appendChild(particle);
        }
        
        balloonsArea.appendChild(particles);
        
        setTimeout(() => {
            if (particles.parentNode) {
                particles.parentNode.removeChild(particles);
            }
        }, 800);
    }
    
    function resetComboTimer() {
        if (comboTimer) {
            clearTimeout(comboTimer);
        }
        
        // Reset combo after 2 seconds of inactivity
        comboTimer = setTimeout(() => {
            combo = 0;
            hideComboIndicator();
        }, 2000);
    }
    
    function showComboIndicator() {
        let indicator = balloonsArea.querySelector('.combo-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'combo-indicator';
            balloonsArea.appendChild(indicator);
        }
        
        indicator.textContent = `${combo}x COMBO!`;
        indicator.style.display = 'block';
    }
    
    function hideComboIndicator() {
        const indicator = balloonsArea.querySelector('.combo-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
    
    function clearBalloons() {
        activeBalloons.forEach(balloon => {
            if (balloon.parentNode) {
                balloon.parentNode.removeChild(balloon);
            }
        });
        activeBalloons = [];
        hideComboIndicator();
    }
    
    function updateUI() {
        balloonsPopped.textContent = poppedCount;
        coinsEarned.textContent = `🪙 ${coins}`;
    }
    
    function endGame() {
        gameActive = false;
        
        // Clear timers
        if (gameTimer) clearInterval(gameTimer);
        if (spawnTimer) clearInterval(spawnTimer);
        if (comboTimer) clearTimeout(comboTimer);
        
        soundManager.play('gameOver');

        // Clear remaining balloons
        clearBalloons();
        
        // Award coins
        if (coins > 0) {
            window.awardCoins(coins, 'balloons');
        }
        
        // Reset UI
        startBtn.disabled = false;
        startBtn.textContent = `PLAY AGAIN - ${coins} coins earned!`;
        instructions.style.display = 'block';
        instructions.innerHTML = `
            <div style="background: rgba(0, 0, 0, 0.8); padding: 1rem; border-radius: 8px; border: 2px solid var(--success-color);">
                <h3 style="color: var(--success-color); margin-bottom: 0.5rem;">🎈 Game Complete!</h3>
                <p><strong>${poppedCount}</strong> balloons popped</p>
                <p><strong>🪙 ${coins}</strong> coins earned</p>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">Pop pop pop!</p>
            </div>
        `;
        
        setTimeout(() => {
            startBtn.textContent = 'PLAY AGAIN';
            instructions.innerHTML = 'Pop the floating balloons to collect coins!';
        }, 3000);
    }
    
    // Store game instance for cleanup
    window.currentGame = {
        destroy: () => {
            gameActive = false;
            if (gameTimer) clearInterval(gameTimer);
            if (spawnTimer) clearInterval(spawnTimer);
            if (comboTimer) clearTimeout(comboTimer);
            clearBalloons();
        }
    };
}