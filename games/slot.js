function initSlotGame() {
    const gameContainer = document.getElementById('gameContainer');
    
    gameContainer.innerHTML = `
        <div class="slot-game">
            <div class="game-ui">
                <div class="game-balance">Your Coins: <span id="slotBalance">...</span></div>
                <div class="last-win">Last Win: <span id="lastWin">🪙 0</span></div>
            </div>
            
            <div class="slot-machine">
                <div class="reels-container" id="reelsContainer">
                    <div class="reel"><div class="reel-inner"></div></div>
                    <div class="reel"><div class="reel-inner"></div></div>
                    <div class="reel"><div class="reel-inner"></div></div>
                </div>
                <div class="payout-line"></div>
                <div class="slot-shadow"></div>
            </div>
            
            <div class="game-controls">
                 <div class="bet-controls">
                    <label for="betAmount">Bet:</label>
                    <input type="number" id="betAmount" value="1" min="1" max="15">
                </div>
                <button class="spin-btn" id="spinBtn">SPIN</button>
            </div>
            <div id="slotMessage" class="slot-message"></div>
        </div>
        
        <style>
        .slot-game {
            text-align: center;
            max-width: 450px;
            margin: 0 auto;
        }

        .slot-machine {
            position: relative;
            width: 100%;
            height: 180px;
            background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
            border-radius: 12px;
            border: 4px solid #475569;
            box-shadow: 0 8px 0 #334155, 0 15px 25px rgba(0,0,0,0.5);
            padding: 20px;
            display: flex;
            justify-content: center;
            margin: 1rem 0;
        }

        .reels-container {
            display: flex;
            gap: 15px;
            overflow: hidden;
            width: 100%;
            height: 120px;
            mask-image: linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%);
        }
        
        .reel {
            width: 33.33%;
            height: 120px;
            overflow: hidden;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
        }

        .reel-inner {
            transition: transform 3s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .reel-symbol {
            width: 100%;
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 4rem;
            text-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        
        .payout-line {
            position: absolute;
            top: 50%;
            left: 10px;
            right: 10px;
            height: 4px;
            background: rgba(251, 191, 36, 0.6);
            border-radius: 2px;
            transform: translateY(-50%);
            box-shadow: 0 0 10px #fbbf24;
            z-index: 2;
        }
        
        .slot-shadow {
             position: absolute;
             top: 0;
             left: 0;
             width: 100%;
             height: 100%;
             box-shadow: inset 0 10px 15px rgba(0,0,0,0.4), inset 0 -10px 15px rgba(0,0,0,0.4);
             border-radius: 8px;
             pointer-events: none;
        }

        .game-controls {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            margin-top: 1.5rem;
        }
        
        .bet-controls {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: var(--surface-color);
            padding: 0.5rem 1rem;
            border-radius: 25px;
        }

        .bet-controls input {
            width: 50px;
            background: none;
            border: none;
            color: white;
            font-size: 1.2rem;
            font-weight: bold;
            text-align: center;
        }
        .bet-controls input:focus {
            outline: none;
        }

        .spin-btn {
            background: var(--gradient-2);
            color: white;
            border: none;
            padding: 1rem 3rem;
            border-radius: 25px;
            font-size: 1.2rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 5px 0 #b91c1c;
        }
        
        .spin-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 7px 0 #b91c1c, 0 10px 20px rgba(244, 63, 94, 0.4);
        }
        
        .spin-btn:active:not(:disabled) {
            transform: translateY(2px);
            box-shadow: 0 3px 0 #b91c1c;
        }
        
        .spin-btn:disabled {
            background: #475569;
            cursor: not-allowed;
            transform: none;
            box-shadow: 0 5px 0 #334155;
            opacity: 0.7;
        }

        .slot-message {
            margin-top: 1rem;
            font-size: 1.1rem;
            font-weight: bold;
            min-height: 1.5em;
            color: var(--warning-color);
        }
        </style>
    `;

    const spinBtn = document.getElementById('spinBtn');
    const betAmountInput = document.getElementById('betAmount');
    const reelsContainer = document.getElementById('reelsContainer');
    const slotBalanceEl = document.getElementById('slotBalance');
    const lastWinEl = document.getElementById('lastWin');
    const messageEl = document.getElementById('slotMessage');
    const reelElements = reelsContainer.querySelectorAll('.reel-inner');

    const SYMBOL_MAP = {
        '🍒': { id: 'CHERRY', multiplier: { 2: 2, 3: 5 } },
        '🍋': { id: 'LEMON', multiplier: { 3: 10 } },
        '🍊': { id: 'ORANGE', multiplier: { 3: 20 } },
        '🍉': { id: 'WATERMELON', multiplier: { 3: 50 } },
        '⭐': { id: 'STAR', multiplier: { 3: 100 } },
        '💎': { id: 'DIAMOND', multiplier: { 3: 250 } }
    };

    const REEL_STRIPS = [
        ['💎', '🍒', '🍋', '⭐', '🍒', '🍊', '🍒', '🍋', '🍉', '🍒', '🍋', '🍊', '🍒', '🍒', '🍋'], // Reel 1
        ['🍒', '🍋', '💎', '🍒', '🍊', '⭐', '🍋', '🍒', '🍉', '🍊', '🍒', '🍋', '🍒', '🍋', '🍒'], // Reel 2
        ['🍋', '🍒', '🍊', '🍋', '🍉', '🍒', '💎', '🍋', '⭐', '🍒', '🍊', '🍒', '🍋', '🍒', '🍒'], // Reel 3
    ];
    
    let isSpinning = false;
    
    function setupReels() {
        reelElements.forEach((reel, i) => {
            reel.innerHTML = '';
            // Shuffle the strip and add a lot of symbols for a long scroll effect
            const longStrip = [...REEL_STRIPS[i], ...REEL_STRIPS[i], ...REEL_STRIPS[i], ...REEL_STRIPS[i]].sort(() => 0.5 - Math.random());
            for(let j = 0; j < 50; j++) {
                const symbol = longStrip[j % longStrip.length];
                const symbolEl = document.createElement('div');
                symbolEl.className = 'reel-symbol';
                symbolEl.textContent = symbol;
                reel.appendChild(symbolEl);
            }
        });
    }

    function updateBalance() {
        slotBalanceEl.textContent = `🪙 ${Math.floor(gameData.coins)}`;
    }

    async function handleSpin() {
        if (isSpinning) return;

        const betAmount = parseInt(betAmountInput.value);
        if (isNaN(betAmount) || betAmount < 1 || betAmount > 15) {
            messageEl.textContent = "Bet must be between 1 and 15.";
            return;
        }

        if (gameData.coins < betAmount) {
            messageEl.textContent = "Not enough coins!";
            return;
        }

        isSpinning = true;
        spinBtn.disabled = true;
        messageEl.textContent = "";
        lastWinEl.innerHTML = '🪙 0';

        // Deduct bet and send to vault
        const betPlaced = await window.spendCoinsToVault(betAmount, 'slot_bet');
        if (!betPlaced) {
            messageEl.textContent = "Error placing bet. Please try again.";
            isSpinning = false;
            spinBtn.disabled = false;
            return;
        }

        updateBalance();
        soundManager.play('slotSpin');

        // Generate results
        const results = REEL_STRIPS.map(strip => strip[Math.floor(Math.random() * strip.length)]);
        
        // Spin animation
        reelElements.forEach((reel, i) => {
            reel.style.transition = 'none';
            reel.style.transform = `translateY(0)`;
            
            // Trigger reflow
            reel.offsetHeight;

            let resultIndex = Array.from(reel.children).findIndex((child, index) => index > 20 && child.textContent === results[i]);
            if (resultIndex === -1) { // Fallback if not found far down
                 resultIndex = Array.from(reel.children).findIndex(child => child.textContent === results[i]);
            }
            const position = resultIndex * 120; // 120 is symbol height
            
            reel.style.transition = `transform ${6 + i * 1}s cubic-bezier(0.25, 1, 0.5, 1)`;
            reel.style.transform = `translateY(-${position}px)`;
        });

        // Wait for spin to finish
        setTimeout(() => {
            checkWinnings(results, betAmount);
            isSpinning = false;
            spinBtn.disabled = false;
        }, 8500);
    }
    
    async function checkWinnings(results, bet) {
        const [r1, r2, r3] = results;
        let winAmount = 0;
        let winMessage = "Try again!";

        const counts = {};
        results.forEach(s => { counts[s] = (counts[s] || 0) + 1; });

        for (const symbol in counts) {
            if (counts[symbol] === 3) {
                const multiplier = SYMBOL_MAP[symbol].multiplier[3];
                winAmount = bet * multiplier;
                winMessage = `${symbol}${symbol}${symbol} - You won ${winAmount} coins!`;
                break;
            }
        }
        
        if (winAmount === 0 && counts['🍒'] === 2) {
             const multiplier = SYMBOL_MAP['🍒'].multiplier[2];
             winAmount = bet * multiplier;
             winMessage = `🍒🍒 - You won ${winAmount} coins!`;
        }

        messageEl.textContent = winMessage;
        
        if (winAmount > 0) {
            lastWinEl.innerHTML = `🪙 ${winAmount}`;
            await window.awardCoins(winAmount, 'slot_win');
            updateBalance();
        }
    }

    spinBtn.addEventListener('click', handleSpin);
    
    // Initial setup
    setupReels();
    updateBalance();

    window.currentGame = {
        destroy: () => {
            // No ongoing processes to stop for this game
        }
    };
}