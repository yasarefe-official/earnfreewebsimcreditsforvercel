// --- GLOBAL STATE ---
let currentUser = null;
let gameData = {
    coins: 0,
    vipUntil: null,
};
window.gameData = gameData; // Expose to global scope for game scripts

// --- SOUND MANAGER (Unchanged) ---
const soundManager = {
    audioContext: null,
    soundBuffers: {},
    sounds: {
        uiClick: 'sfx/ui_click.mp3',
        gameStart: 'sfx/game_start.mp3',
        gameOver: 'sfx/game_over.mp3',
        coinCollect: 'sfx/coin_collect.mp3',
        balloonPop: 'sfx/balloon_pop.mp3',
        targetHit: 'sfx/target_hit.mp3',
        squareCatch: 'sfx/square_catch.mp3',
        bonusHit: 'sfx/bonus_hit.mp3',
        slotSpin: 'sfx/slot_spin.mp3',
        slotWin: 'sfx/slot_win.mp3',
    },
    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this._loadAllSounds();
        } catch (e) { console.error("Web Audio API is not supported"); }
    },
    _loadSound(name, url) {
        if (!this.audioContext) return;
        fetch(url).then(response => response.arrayBuffer()).then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer)).then(audioBuffer => { this.soundBuffers[name] = audioBuffer; }).catch(e => console.error(`Error loading sound: ${name}`, e));
    },
    _loadAllSounds() { for (const key in this.sounds) { this._loadSound(key, this.sounds[key]); } },
    play(name, volume = 1) {
        if (!this.audioContext || !this.soundBuffers[name]) return;
        if (this.audioContext.state === 'suspended') { this.audioContext.resume(); }
        const source = this.audioContext.createBufferSource();
        source.buffer = this.soundBuffers[name];
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start(0);
    }
};
soundManager.init();
window.soundManager = soundManager;

// --- DOM ELEMENTS ---
let loadingScreen, app, coinBalance, username, userAvatar;

function getDomElements() {
    loadingScreen = document.getElementById('loadingScreen');
    app = document.getElementById('app');
    coinBalance = document.getElementById('coinBalance');
    username = document.getElementById('username');
    userAvatar = document.getElementById('userAvatar');
}

// --- NEW API-DRIVEN FUNCTIONS ---

async function getUserRecord(username) {
    try {
        const response = await fetch(`/api/users/${username}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch user data: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error getting user record:', error);
        return null;
    }
}

async function awardCoins(amount, source = 'game') {
    if (!currentUser) return false;

    const roundedAmount = parseFloat(Number(amount).toFixed(2));
    if (isNaN(roundedAmount) || roundedAmount <= 0) {
        console.warn("Attempted to award invalid or zero amount:", amount);
        return false;
    }

    try {
        const response = await fetch('/api/coins/award', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser.name,
                amount: roundedAmount,
                source: source,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to award coins');
        }

        const result = await response.json();
        gameData.coins = result.newBalance;
        updateCoinBalance();
        showCoinEarned(roundedAmount, "");
        return true;

    } catch (error) {
        console.error('Failed to award coins:', error);
        return false;
    }
}
window.awardCoins = awardCoins;

async function loadLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '<div class="loading-state">Loading leaderboard...</div>';
    try {
        const response = await fetch('/api/leaderboard');
        if (!response.ok) throw new Error('Failed to fetch leaderboard');
        const users = await response.json();

        leaderboardList.innerHTML = '';
        if (users.length === 0) {
            leaderboardList.innerHTML = '<div class="empty-state">No players on the leaderboard yet.</div>';
            return;
        }

        users.forEach((user, index) => {
            const rank = index + 1;
            let rankClass = '';
            if (rank === 1) rankClass = 'gold';
            else if (rank === 2) rankClass = 'silver';
            else if (rank === 3) rankClass = 'bronze';
            const isVip = user.vip_until && new Date(user.vip_until) > new Date();
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            item.innerHTML = `
                <div class="rank ${rankClass}">${rank}</div>
                <div class="player-info">
                    <img src="https://images.websim.com/avatar/${user.username}" alt="${user.username}" class="player-avatar">
                    <span class="player-name">${user.username} ${isVip ? '<span class="vip-badge">🏆</span>' : ''}</span>
                </div>
                <div class="player-coins" style="color: var(--coin-color)">
                    🪙 ${Math.floor(user.coins || 0).toLocaleString()}
                </div>
            `;
            leaderboardList.appendChild(item);
        });
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        leaderboardList.innerHTML = '<div class="empty-state" style="color: var(--danger-color);">Error loading leaderboard.</div>';
    }
}

// --- UI & EVENT LISTENERS ---

function updateCoinBalance() {
    if (coinBalance) {
        coinBalance.textContent = Math.floor(gameData.coins).toLocaleString();
    }
}

function showCoinEarned(amount, bonusText = "") {
    const coinEarned = document.getElementById('coinEarned');
    const coinsEarnedText = document.getElementById('coinsEarnedText');
    if (!coinEarned || !coinsEarnedText) return;

    coinsEarnedText.innerHTML = `+${amount.toFixed(2)} ${bonusText}`;
    coinEarned.style.display = 'flex';
    coinEarned.style.animation = 'none';
    coinEarned.offsetHeight;
    coinEarned.style.animation = 'coinEarned 2s ease-out forwards';
    setTimeout(() => { coinEarned.style.display = 'none'; }, 2000);
}

function switchTab(tabName) {
    soundManager.play('uiClick');
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');

    if (tabName === 'leaderboard') {
        loadLeaderboard();
    } else if (tabName === 'credits') {
        loadConversionHistory();
    } else if (tabName === 'admin' && currentUser?.name === 'ysr') {
        // For now, load only credit requests in admin panel
        loadAdminCreditRequests();
    }
}

async function approveRequest(requestId) {
    try {
        const response = await fetch('/api/admin/requests/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error);
        }
        alert('Request approved!');
        loadAdminCreditRequests(); // Refresh list
    } catch (error) {
        console.error('Failed to approve request:', error);
        alert(`Error: ${error.message}`);
    }
}

async function rejectRequest(requestId) {
    if (!confirm('Are you sure you want to reject this request? The user\'s coins will be refunded.')) return;
    try {
        const response = await fetch('/api/admin/requests/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error);
        }
        alert('Request rejected and coins refunded.');
        loadAdminCreditRequests(); // Refresh list
    } catch (error) {
        console.error('Failed to reject request:', error);
        alert(`Error: ${error.message}`);
    }
}


async function loadAdminCreditRequests() {
    const requestsList = document.getElementById('adminCreditRequestsList');
    if (!requestsList) {
        // This is okay if the user is not an admin and the panel doesn't exist.
        return;
    }
    requestsList.innerHTML = '<div class="loading-state">Loading requests...</div>';

    try {
        const response = await fetch('/api/admin/requests');
        if (!response.ok) throw new Error('Failed to fetch requests');
        const requests = await response.json();

        requestsList.innerHTML = '';
        if (requests.length === 0) {
            requestsList.innerHTML = '<div class="empty-state">No credit requests found</div>';
            return;
        }

        requests.forEach((request) => {
            const card = document.createElement('div');
            card.className = 'request-card';
            card.innerHTML = `
                <div class="card-info">
                    <h4>@${request.username}</h4>
                    <p><strong>${request.coinsamount} coins → ${request.creditsamount} credits</strong></p>
                    <p style="font-size: 0.8rem">Submitted: ${new Date(request.requestedat).toLocaleString()}</p>
                </div>
                <div class="card-actions" data-request-id="${request.id}">
                    ${request.status === 'pending' ? `
                        <button class="btn btn-approve">Approve</button>
                        <button class="btn btn-reject">Reject</button>
                    ` : `<span class="status-badge status-${request.status}">${request.status.toUpperCase()}</span>`}
                </div>
            `;
            requestsList.appendChild(card);
        });

    } catch (error) {
        console.error('Failed to load credit requests:', error);
        requestsList.innerHTML = '<div class="empty-state" style="color: var(--danger-color);">Error loading requests.</div>';
    }
}


async function loadConversionHistory() {
    const historyList = document.getElementById('conversionHistory');
    if (!historyList || !currentUser) return;

    historyList.innerHTML = '<div class="loading-state">Loading history...</div>';
    try {
        const response = await fetch(`/api/credits/history/${currentUser.name}`);
        if (!response.ok) throw new Error('Failed to fetch conversion history');
        const requests = await response.json();

        historyList.innerHTML = '';
        if (requests.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No conversion history</p>';
            return;
        }

        requests.forEach(request => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div>
                    <div>${request.coinsamount} coins → ${request.creditsamount} credits</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">
                        ${new Date(request.requestedat).toLocaleDateString()}
                    </div>
                </div>
                <div class="history-status ${request.status}">${request.status}</div>
            `;
            historyList.appendChild(item);
        });
    } catch (error) {
        console.error('Failed to load conversion history:', error);
        historyList.innerHTML = '<p style="text-align: center; color: var(--danger-color);">Failed to load history</p>';
    }
}

async function initiateCreditConversion(e) {
    const convertBtn = e.target;
    const coinsToConvertInput = document.getElementById('coinsToConvert');
    const coins = parseInt(coinsToConvertInput.value) || 0;

    if (coins < 100) {
        return alert('Minimum conversion is 100 coins.');
    }
    if (coins > gameData.coins) {
        return alert(`You don't have enough coins. Your current balance is ${Math.floor(gameData.coins)} coins.`);
    }

    convertBtn.disabled = true;
    convertBtn.textContent = 'Processing...';

    try {
        const credits = Math.floor(coins / 4); // Basic conversion rule

        const response = await fetch('/api/credits/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser.name,
                coinsAmount: coins,
                creditsAmount: credits,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to submit request');
        }

        const result = await response.json();

        // Update local state and UI
        gameData.coins = result.newBalance;
        updateCoinBalance();

        alert('Conversion request submitted successfully!');
        coinsToConvertInput.value = '';
        document.getElementById('conversionPreview').textContent = '= 0 Credits';
        loadConversionHistory(); // Refresh the list

    } catch (error) {
        console.error('Credit conversion error:', error);
        alert(`Conversion failed: ${error.message}`);
    } finally {
        convertBtn.disabled = false;
        convertBtn.textContent = 'Convert Coins';
    }
}

function initEventListeners() {
    const navTabsContainer = document.querySelector('.nav-tabs');
    if (navTabsContainer) {
        navTabsContainer.addEventListener('click', (e) => {
            if (e.target.matches('.nav-tab')) {
                switchTab(e.target.dataset.tab);
            }
        });
    }

    document.getElementById('catchBtn')?.addEventListener('click', () => openGame('catch'));
    document.getElementById('snakeBtn')?.addEventListener('click', () => openGame('snake'));
    document.getElementById('targetBtn')?.addEventListener('click', () => openGame('target'));
    document.getElementById('balloonsBtn')?.addEventListener('click', () => openGame('balloons'));
    document.getElementById('squaresBtn')?.addEventListener('click', () => openGame('squares'));
    document.getElementById('clickerBtn')?.addEventListener('click', () => openGame('clicker'));
    document.getElementById('slotBtn')?.addEventListener('click', () => openGame('slot'));

    document.getElementById('closeModal')?.addEventListener('click', closeModal);

    // Credits conversion
    const convertBtn = document.getElementById('convertBtn');
    if (convertBtn) {
        convertBtn.addEventListener('click', initiateCreditConversion);
    }
    const coinsToConvert = document.getElementById('coinsToConvert');
    if (coinsToConvert) {
        coinsToConvert.addEventListener('input', () => {
            const coins = parseInt(coinsToConvert.value) || 0;
            const credits = Math.floor(coins / 4);
            const conversionPreview = document.getElementById('conversionPreview');
            if (conversionPreview) {
                 if (coins >= 100) {
                    conversionPreview.textContent = `= ${credits} Credits`;
                } else {
                     conversionPreview.textContent = '= 0 Credits';
                }
            }
        });
    }

    // Admin panel actions
    const adminTab = document.getElementById('adminTab');
    if (adminTab) {
        adminTab.addEventListener('click', (e) => {
            if (e.target.matches('.btn-approve')) {
                const requestId = e.target.closest('.card-actions').dataset.requestId;
                approveRequest(requestId);
            } else if (e.target.matches('.btn-reject')) {
                const requestId = e.target.closest('.card-actions').dataset.requestId;
                rejectRequest(requestId);
            }
        });
    }
}

function openGame(gameName) {
    soundManager.play('uiClick');
    const gameModal = document.getElementById('gameModal');
    const gameTitle = document.getElementById('gameTitle');
    const gameContainer = document.getElementById('gameContainer');

    const gameTitles = {
        catch: 'Catch the Falling Coins', snake: 'Coin Snake', target: 'Click the Target',
        balloons: 'Pop the Balloons', squares: 'Catch the Square', clicker: 'Click & Win',
        slot: 'Coin Slot Machine'
    };

    gameTitle.textContent = gameTitles[gameName] || 'Game';
    gameContainer.innerHTML = '';

    switch (gameName) {
        case 'catch': if(window.initCatchGame) window.initCatchGame(); break;
        case 'snake': if(window.initSnakeGame) window.initSnakeGame(); break;
        case 'target': if(window.initTargetGame) window.initTargetGame(); break;
        case 'balloons': if(window.initBalloonsGame) window.initBalloonsGame(); break;
        case 'squares': if(window.initSquaresGame) window.initSquaresGame(); break;
        case 'clicker': if(window.initClickerGame) window.initClickerGame(); break;
        case 'slot': if(window.initSlotGame) window.initSlotGame(); break;
    }

    gameModal.classList.add('active');
}

function closeModal() {
    const gameModal = document.getElementById('gameModal');
    if (!gameModal || !gameModal.classList.contains('active')) return;

    soundManager.play('uiClick', 0.8);

    if (window.currentGame && typeof window.currentGame.destroy === 'function') {
        window.currentGame.destroy();
        window.currentGame = null;
    }
    gameModal.classList.remove('active');
}

async function initApp(sessionUser) {
    if (!sessionUser || !sessionUser.name) {
        console.error("initApp called without a valid user.");
        return;
    }

    currentUser = sessionUser;
    getDomElements();

    try {
        const userRecord = await getUserRecord(currentUser.name);
        if (!userRecord) {
            throw new Error(`Could not load user data for ${currentUser.name}`);
        }

        gameData.coins = userRecord.coins || 0;
        gameData.vipUntil = userRecord.vip_until ? new Date(userRecord.vip_until) : null;

        updateCoinBalance();

        if (currentUser.name === 'ysr') {
            const adminTabButton = document.querySelector('[data-tab="admin"]');
            if(adminTabButton) adminTabButton.style.display = 'block';
        }

        initEventListeners();

        loadingScreen.style.display = 'none';
        app.style.display = 'block';

    } catch (error) {
        console.error('Failed to initialize app:', error);
        loadingScreen.style.display = 'none';
        document.body.innerHTML = `<div style="text-align: center; padding: 2rem; color: red;"><h1>Failed to load app</h1><p>${error.message}</p></div>`;
    }
}

window.initApp = initApp;
