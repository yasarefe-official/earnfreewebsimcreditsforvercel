function initClickerGame() {
    const gameContainer = document.getElementById('gameContainer');
    
    gameContainer.innerHTML = `
        <div class="clicker-game">
            <div class="game-ui">
                <div class="game-timer">Time Left: <span id="timeLeft">45</span>s</div>
                <div class="game-clicks">Clicks: <span id="clicksMade">0</span></div>
                <div class="coins-earned">Coins: <span id="coinsEarned">🪙 0.00</span></div>
            </div>
            
            <div class="clicker-area" id="clickerArea">
                <button class="click-btn" id="clickBtn" disabled>
                    <span class="click-icon">🖱️</span>
                    <span class="click-text">CLICK ME!</span>
                </button>
            </div>
            
            <div class="game-controls">
                <button class="start-btn" id="startBtn">START</button>
                <div id="aiNotice" class="ai-notice" style="display: none;">
                     ⚠️ Gameplay is analyzed for cheats. Suspicious activity may result in forfeiture of rewards.
                </div>
            </div>
        </div>
        
        <style>
        .clicker-game {
            text-align: center;
        }
        
        .clicker-area {
            position: relative;
            width: 100%;
            height: 300px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(15, 23, 42, 0.5);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            overflow: hidden;
            user-select: none;
            backdrop-filter: blur(5px);
        }
        
        .click-btn {
            width: 200px;
            height: 200px;
            border-radius: 50%;
            background: var(--gradient-2);
            border: 5px solid white;
            color: white;
            font-size: 2rem;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 30px rgba(244, 114, 182, 0.4);
            transition: transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s;
            will-change: transform;
        }

        .click-btn .click-text {
            font-size: 1.2rem;
        }
        
        .click-btn:hover:not(:disabled) {
            transform: scale(1.05);
            box-shadow: 0 15px 35px rgba(244, 114, 182, 0.5);
        }

        .click-btn:active:not(:disabled) {
            transform: scale(0.95);
        }
        
        .click-btn:disabled {
            background: var(--border-color);
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
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
        
        .start-btn:disabled {
            background: var(--border-color);
            cursor: not-allowed;
        }

        .coins-earned {
            color: var(--coin-color);
            font-weight: 600;
        }

        .click-effect {
            position: absolute;
            color: var(--coin-color);
            font-size: 1.5rem;
            font-weight: bold;
            pointer-events: none;
            animation: clickEffect 0.7s ease-out forwards;
            z-index: 10;
        }
        
        @keyframes clickEffect {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-60px) scale(1.5); }
        }

        .ai-notice {
            margin-top: 1rem;
            color: var(--warning-color);
            background: var(--surface-color);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.8rem;
            max-width: 400px;
            margin-left: auto;
            margin-right: auto;
            border: 1px solid rgba(251, 191, 36, 0.3);
        }
        </style>
    `;

    const timeLeftEl = document.getElementById('timeLeft');
    const clicksMadeEl = document.getElementById('clicksMade');
    const coinsEarnedEl = document.getElementById('coinsEarned');
    const startBtn = document.getElementById('startBtn');
    const clickBtn = document.getElementById('clickBtn');
    const clickerArea = document.getElementById('clickerArea');
    const aiNoticeEl = document.getElementById('aiNotice');
    
    let gameActive = false;
    let gameTimer = null;
    let timeRemaining = 45;
    let clicks = 0;
    let coins = 0;

    const COIN_PER_CLICK = 0.05;

    // Anti-cheat analytics data
    let analyticsData = {};

    function resetAnalytics() {
        analyticsData = {
            timestamps: [],
            positions: [],
            mouseMovements: 0,
            tabWasHidden: false,
            startTime: 0,
            endTime: 0,
        };
    }

    const onMouseMove = () => {
        if (gameActive) {
            analyticsData.mouseMovements++;
        }
    };
    
    const onVisibilityChange = () => {
        if (document.hidden && gameActive) {
            analyticsData.tabWasHidden = true;
        }
    };

    async function startGame() {
        // Check if user is banned before starting
        const userRecord = await getOrCreateUserRecord();
        if (userRecord && userRecord.banned_until) {
            const banExpires = new Date(userRecord.banned_until);
            if (banExpires > new Date()) {
                alert(`You are temporarily banned from this game. Please try again after ${banExpires.toLocaleString()}.`);
                closeModal();
                return;
            }
        }

        soundManager.play('gameStart');
        gameActive = true;
        resetAnalytics();
        analyticsData.startTime = Date.now();
        
        startBtn.style.display = 'none';
        aiNoticeEl.style.display = 'none';
        clickBtn.disabled = false;
        clickBtn.innerHTML = `
            <span class="click-icon">🖱️</span>
            <span class="click-text">CLICK ME!</span>
        `;

        timeRemaining = 45;
        clicks = 0;
        coins = 0;
        updateUI();

        document.addEventListener('visibilitychange', onVisibilityChange);
        clickerArea.addEventListener('mousemove', onMouseMove);

        gameTimer = setInterval(() => {
            timeRemaining--;
            updateUI();
            if (timeRemaining <= 0) {
                endGame();
            }
        }, 1000);
    }

    function handleClick(event) {
        if (!gameActive) return;

        clicks++;
        coins += COIN_PER_CLICK;
        soundManager.play('uiClick', 0.6);
        updateUI();
        
        // Collect analytics data
        analyticsData.timestamps.push(Date.now());
        analyticsData.positions.push({ x: event.clientX, y: event.clientY });
        
        const effect = document.createElement('div');
        effect.className = 'click-effect';
        effect.textContent = `+${COIN_PER_CLICK.toFixed(2)}`;
        
        const rect = clickerArea.getBoundingClientRect();
        effect.style.left = `${event.clientX - rect.left}px`;
        effect.style.top = `${event.clientY - rect.top}px`;
        
        clickerArea.appendChild(effect);
        setTimeout(() => effect.remove(), 700);
    }
    
    function updateUI() {
        timeLeftEl.textContent = Math.max(0, timeRemaining);
        clicksMadeEl.textContent = clicks;
        coinsEarnedEl.innerHTML = `🪙 ${coins.toFixed(2)}`;
    }

    function analyzeGameplay() {
        const { timestamps, positions, mouseMovements, tabWasHidden, startTime, endTime } = analyticsData;
        const durationSeconds = (endTime - startTime) / 1000;
        const clickCount = timestamps.length;
        
        if (clickCount < 10) return { suspicious: false, reason: 'Not enough data' };

        const reasons = [];

        // 1. Click Speed (CPS)
        const cps = clickCount / durationSeconds;
        if (cps > 20) {
            reasons.push(`High CPS: ${cps.toFixed(1)}`);
        }

        // 2. Click Interval Regularity
        const intervals = [];
        for (let i = 1; i < clickCount; i++) {
            intervals.push(timestamps[i] - timestamps[i-1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const stdDev = Math.sqrt(intervals.map(x => Math.pow(x - avgInterval, 2)).reduce((a, b) => a + b, 0) / intervals.length);
        if (stdDev < 8 && intervals.length > 15) { // Unnaturally consistent clicks
            reasons.push(`Low interval variance: ${stdDev.toFixed(2)}ms`);
        }

        // 3. Click Position Variety
        const uniquePositions = new Set(positions.map(p => `${p.x},${p.y}`)).size;
        if (uniquePositions === 1 && clickCount > 15) {
            reasons.push('All clicks at the same coordinate');
        }

        // 4. Tab Visibility
        if (tabWasHidden) {
            reasons.push('Tab was hidden during gameplay');
        }

        // 5. Mouse Movement
        if (mouseMovements < clickCount / 5 && clickCount > 20) {
            reasons.push('Very low mouse movement');
        }

        const isSuspicious = reasons.length > 0;
        console.log(`Anti-cheat analysis: ${isSuspicious ? 'SUSPICIOUS' : 'OK'}. Reasons: ${isSuspicious ? reasons.join(', ') : 'None'}`);

        return { suspicious: isSuspicious, reasons: reasons };
    }

    async function endGame() {
        if (!gameActive) return; // Prevent endGame from running multiple times
        gameActive = false;
        clearInterval(gameTimer);
        clickBtn.disabled = true;
        soundManager.play('gameOver');
        analyticsData.endTime = Date.now();
        
        document.removeEventListener('visibilitychange', onVisibilityChange);
        clickerArea.removeEventListener('mousemove', onMouseMove);

        const analysis = analyzeGameplay();

        if (analysis.suspicious) {
            alert(`Suspicious activity detected. Coins for this round will not be awarded. Reason: ${analysis.reasons[0]}.`);
            // Optional: Implement banning logic here
            // const userRecord = await getOrCreateUserRecord();
            // const banUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            // await room.collection('users_v2_1').update(userRecord.id, { banned_until: banUntil });
        } else if (coins > 0) {
            await window.awardCoins(coins, 'clicker');
        }

        clickBtn.innerHTML = `
            <span class="click-icon">🎉</span>
            <span class="click-text" style="font-size: 1rem;">Finished! +${analysis.suspicious ? '0.00' : coins.toFixed(2)} coins</span>
        `;
        startBtn.textContent = 'PLAY AGAIN';
        startBtn.disabled = false;
        startBtn.style.display = 'block';
        aiNoticeEl.style.display = 'block';
    }

    startBtn.addEventListener('click', startGame);
    clickBtn.addEventListener('click', handleClick);
    
    aiNoticeEl.style.display = 'block';

    window.currentGame = {
        destroy: () => {
            if (gameActive) {
                // If game is active when closing, don't award points and just clean up
                gameActive = false;
                if (gameTimer) clearInterval(gameTimer);
                document.removeEventListener('visibilitychange', onVisibilityChange);
                clickerArea.removeEventListener('mousemove', onMouseMove);
            }
        }
    };
}