import { WebsimSocket } from '@websim/websim-socket';

// Initialize WebsimSocket
const room = new WebsimSocket();

// Global app state
let currentUser = null;
let gameData = {
    coins: 0,
    vipUntil: null,
    coinBoostUses: 0,
};
window.gameData = gameData; // Expose to global scope for game scripts
let userRecordCreationPromise = null;
let vipInterval = null;

// --- Sound Manager ---
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
        } catch (e) {
            console.error("Web Audio API is not supported in this browser");
        }
    },

    _loadSound(name, url) {
        if (!this.audioContext) return;
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                this.soundBuffers[name] = audioBuffer;
            })
            .catch(error => console.error(`Error loading sound: ${name}`, error));
    },

    _loadAllSounds() {
        console.log('Pre-loading sounds...');
        for (const key in this.sounds) {
            this._loadSound(key, this.sounds[key]);
        }
    },

    play(name, volume = 1) {
        if (!this.audioContext || !this.soundBuffers[name]) {
            // Fallback for click sound if context is not ready
            if (name === 'uiClick') console.log('Click (audio not ready)');
            return;
        }
        
        // Resume context on first user interaction
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = this.soundBuffers[name];
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start(0);
    }
};

// Initialize the sound manager as soon as the script loads
soundManager.init();

// Expose soundManager to the global scope for game scripts
window.soundManager = soundManager;

// DOM elements
const loadingScreen = document.getElementById('loadingScreen');
const app = document.getElementById('app');
const userInfo = document.getElementById('userInfo');
const coinBalance = document.getElementById('coinBalance');
const username = document.getElementById('username');
const userAvatar = document.getElementById('userAvatar');

// --- DATABASE FUNCTIONS (Rewritten) ---

/**
 * Gets the user record from the database. If it doesn't exist, it creates one.
 * This "lazy creation" approach prevents race conditions on app load.
 * @returns {Promise<object|null>} The user record or null on failure.
 */
async function getOrCreateUserRecord() {
    if (!currentUser) return null;

    // Fast path: check if record is already loaded by subscription's cache
    let records = await room.collection('users_v2_1').filter({ username: currentUser.username }).getList();
    if (records.length > 0) {
        return records[0];
    }

    // If not found, a creation might be in progress, so await that promise.
    if (userRecordCreationPromise) {
        return await userRecordCreationPromise;
    }

    // If no creation in progress, start one. This is wrapped in a self-invoking async function
    // to create a promise that can be stored and awaited by subsequent calls.
    userRecordCreationPromise = (async () => {
        try {
            // Re-check inside the locked promise to handle race conditions
            let finalCheck = await room.collection('users_v2_1').filter({ username: currentUser.username }).getList();
            if (finalCheck.length > 0) {
                return finalCheck[0];
            }

            console.log(`Creating new user record for @${currentUser.username}`);
            const now = new Date().toISOString();
            const newUser = await room.collection('users_v2_1').create({
                userId: currentUser.id,
                username: currentUser.username,
                coins: 0,
                totalCoinsEarned: 0,
                gamesPlayed: 0,
                hasProjects: false,
                projectsCheckedAt: null,
                createdAt: now,
                lastActiveAt: now,
                lastPlayedClicker: null,
                vip_until: null,
            });
            return newUser;
        } catch (error) {
            console.error('Error creating user record:', error);
            userRecordCreationPromise = null; // Reset promise on error to allow retries
            throw error;
        }
    })();
    
    return await userRecordCreationPromise;
}

/**
 * Creates a transaction record for coin changes.
 * @param {number} amount - The amount of coins (can be negative).
 * @param {string} source - The source of the transaction (e.g., 'game_name', 'conversion').
 * @param {string} type - 'earned', 'spent', 'refund'.
 * @returns {Promise<boolean>} Success status.
 */
async function createCoinTransaction(amount, source, type = 'earned') {
    if (!currentUser) return false;
    
    // Enhanced input validation
    const validatedAmount = parseFloat(Number(amount).toFixed(2));
    if (isNaN(validatedAmount) || !isFinite(validatedAmount)) {
        console.error('Invalid transaction amount:', amount);
        return false;
    }

    if (!source || typeof source !== 'string') {
        console.error('Invalid transaction source:', source);
        return false;
    }

    if (!['earned', 'spent', 'refund'].includes(type)) {
        console.error('Invalid transaction type:', type);
        return false;
    }

    try {
        await room.collection('coin_transactions_v2_1').create({
            username: currentUser.username,
            userId: currentUser.id,
            amount: validatedAmount,
            source: source,
            type: type,
            timestamp: new Date().toISOString(),
            sessionId: generateSessionId()
        });
        return true;
    } catch (error) {
        console.error('Failed to create coin transaction:', error);
        return false;
    }
}

/**
 * Creates a record of a used tip to prevent double-spending.
 * @param {string} commentId - The ID of the comment that contained the tip.
 * @param {number} creditsSpent - The amount of credits tipped.
 * @param {number} coinsGained - The amount of coins the user received.
 * @returns {Promise<boolean>} Success status.
 */
async function recordUsedTip(commentId, creditsSpent, coinsGained) {
    if (!currentUser) return false;
    try {
        await room.collection('used_credit_tips_v2_1').create({
            id: commentId,
            user_id: currentUser.id,
            credits_spent: creditsSpent,
            coins_gained: coinsGained,
            processed_at: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Failed to record used tip:', error);
        return false;
    }
}

/**
 * Creates a credit conversion request for admin approval.
 * @param {number} coinsAmount - The amount of coins being converted.
 * @param {number} creditsAmount - The amount of credits to be received.
 * @returns {Promise<object|null>} The created request object or null.
 */
async function createCreditRequest(coinsAmount, creditsAmount) {
    if (!currentUser) return null;
    try {
        const request = await room.collection('credit_requests_v2_1').create({
            username: currentUser.username,
            userId: currentUser.id,
            coinsAmount: coinsAmount,
            creditsAmount: creditsAmount,
            status: 'pending',
            requestedAt: new Date().toISOString(),
            // Ensure all fields exist on creation to prevent schema issues
            approvedAt: null,
            approvedBy: null,
            rejectedAt: null,
            rejectedBy: null,
        });
        return request;
    } catch (error) {
        console.error('Failed to create credit request:', error);
        return null;
    }
}

function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// --- APP INITIALIZATION & STATE SYNC ---

/**
 * Subscribes to database changes for real-time updates.
 * This handles both initial data load and subsequent changes.
 */
function subscribeToChanges() {
    if (!currentUser) return;
    
    // Subscribe to the user's own data for coin balance updates
    room.collection('users_v2_1').filter({ username: currentUser.username }).subscribe(userRecords => {
        if (userRecords.length > 0) {
            const userData = userRecords[0];
            // Update local data only if it's different to avoid unnecessary UI updates
            if (gameData.coins !== (userData.coins || 0)) {
                gameData.coins = userData.coins || 0;
                updateCoinBalance();
            }
             // Update perks data
            gameData.vipUntil = userData.vip_until ? new Date(userData.vip_until) : null;
            
            handleVipStatus(); // Check and manage VIP payment interval
            updateStoreUI(); // Update store UI with new perks info
        }
        // If userRecords is empty, user is new. Their record will be created on their first action.
        // The coin balance will correctly show 0.
    });

    // Admin-specific subscriptions
    if (currentUser.username === 'ysr') {
        room.collection('credit_requests_v2_1').subscribe(() => {
            if (document.getElementById('adminTab')?.classList.contains('active')) {
                loadAdminOverview();
                loadAdminCreditRequests();
                loadAdminRecentActivity();
            }
        });
        room.collection('users_v2_1').subscribe(() => {
             if (document.getElementById('adminTab')?.classList.contains('active')) {
                loadAdminOverview();
                loadAdminUsers();
            }
        });
        room.collection('coin_transactions_v2_1').subscribe(() => {
             if (document.getElementById('adminTab')?.classList.contains('active')) {
                loadAdminOverview();
                loadAdminTransactions();
                loadAdminRecentActivity();
            }
        });
    } else {
         // Subscribe only to user-specific data for non-admins
         room.collection('credit_requests_v2_1').filter({ username: currentUser.username }).subscribe(loadConversionHistory);
    }
}

/**
 * Initializes the application.
 */
async function initApp() {
    try {
        // Get current user
        currentUser = await window.websim.getCurrentUser();
        
        if (!currentUser) {
            throw new Error('User not authenticated');
        }

        // Pre-fetch user record to get initial state before showing the app.
        const userRecord = await getOrCreateUserRecord();
        if (!userRecord) {
            throw new Error('Could not load user data.');
        }

        // --- All critical data is now loaded ---

        // Populate initial game state from the user record
        gameData.coins = userRecord.coins || 0;
        gameData.vipUntil = userRecord.vip_until ? new Date(userRecord.vip_until) : null;
        // Load boost uses from localStorage
        gameData.coinBoostUses = parseInt(localStorage.getItem(`coinBoostUses_${currentUser.username}`) || '0', 10);

        // Update all UI elements with initial data
        username.textContent = currentUser.username;
        userAvatar.src = `https://images.websim.com/avatar/${currentUser.username}`;
        updateCoinBalance(); // Show initial coin balance
        
        // Create admin controls if user is admin
        if (currentUser.username === 'ysr') {
            createAdminControls();
        }

        // Initialize event listeners now that the DOM is ready
        initEventListeners();
        
        // Subscribe to subsequent data changes for real-time updates
        subscribeToChanges();
        
        // Finally, hide loading screen and show the fully-loaded app
        loadingScreen.style.display = 'none';
        app.style.display = 'block';


    } catch (error) {
        console.error('Failed to initialize app:', error);
        loadingScreen.style.display = 'none';
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; text-align: center; color: #ef4444; padding: 1rem;">
                <div>
                    <h1>Failed to load</h1>
                    <p>Could not load your game data. Please refresh the page and try again.</p>
                    <p style="font-size: 0.875rem; opacity: 0.7;">${error.message}</p>
                </div>
            </div>
        `;
    }
}

// --- UI & CORE LOGIC FUNCTIONS ---

/**
 * Updates the coin balance display in the header.
 */
function updateCoinBalance() {
    if (coinBalance) {
        coinBalance.textContent = Math.floor(gameData.coins).toLocaleString();
    }
}

/**
 * Awards coins to the user with enhanced validation and error handling.
 * @param {number} amount - The amount of coins to award.
 * @param {string} source - The source of the coins (e.g., game name).
 */
async function awardCoins(amount, source = 'game') {
    if (!currentUser) return false;
    
    // Enhanced input validation
    const roundedAmount = parseFloat(Number(amount).toFixed(2));
    if (isNaN(roundedAmount) || !isFinite(roundedAmount)) {
        console.warn("Attempted to award invalid amount:", amount);
        return false;
    }
    
    if (roundedAmount === 0) {
        console.warn("Attempted to award zero coins");
        return false;
    }

    if (roundedAmount < 0 && source !== 'admin_adjustment') {
        console.warn("Attempted to award negative coins from non-admin source:", amount, source);
        return false;
    }
    
    try {
        // Force a fresh fetch from the database to get the most current user state
        let userRecords = await room.collection('users_v2_1').filter({ username: currentUser.username }).getList();
        let userRecord = userRecords[0];

        if (!userRecord) {
            // If for some reason the record is gone, try to recreate it.
            userRecord = await getOrCreateUserRecord();
        }

        if (!userRecord) {
            throw new Error("Could not get or create user record for awarding coins.");
        }
        
        let finalAmount = roundedAmount;
        let bonusDescription = "";
        let usedBoost = false;

        // 1. Apply VIP bonus (fixed amount) - only for positive earnings
        const isVip = userRecord.vip_until && new Date(userRecord.vip_until) > new Date();
        if (isVip && source !== 'credit_conversion' && roundedAmount > 0) {
            const vipBonus = 75;
            finalAmount += vipBonus;
            bonusDescription += " (VIP)";
        }

        // 2. Apply Coin Boost bonus (percentage) from localStorage - only for positive earnings
        const hasBoost = gameData.coinBoostUses > 0;
        if (hasBoost && source !== 'credit_conversion' && roundedAmount > 0) {
            const boostAmount = roundedAmount * 0.05;
            finalAmount += boostAmount;
            bonusDescription += " (Boost)";
            usedBoost = true;
        }

        // Enhanced calculation with safety checks
        const currentCoins = userRecord.coins || 0;
        const newCoins = Math.max(0, currentCoins + finalAmount); // Ensure never negative
        const newTotalEarned = Math.max(0, (userRecord.totalCoinsEarned || 0) + Math.max(0, finalAmount)); // Only add positive amounts to total
        const newGamesPlayed = (userRecord.gamesPlayed || 0) + (source !== 'credit_conversion' && roundedAmount > 0 ? 1 : 0);
        
        // Validate the calculation results
        if (!isFinite(newCoins) || !isFinite(newTotalEarned) || !isFinite(newGamesPlayed)) {
            throw new Error("Invalid calculation result detected");
        }
        
        const updatePayload = {
            id: userRecord.id, // Primary key
            coins: newCoins,
            totalCoinsEarned: newTotalEarned,
            gamesPlayed: newGamesPlayed,
            lastActiveAt: new Date().toISOString()
        };
        
        // Decrement boost uses if one was used and update localStorage
        if (usedBoost) {
            gameData.coinBoostUses = Math.max(0, gameData.coinBoostUses - 1);
            localStorage.setItem(`coinBoostUses_${currentUser.username}`, gameData.coinBoostUses);
        }

        const updateResult = await room.collection('users_v2_1').upsert(updatePayload);
        if (!updateResult) {
            throw new Error("Failed to update user record");
        }
        
        await createCoinTransaction(finalAmount, source, finalAmount >= 0 ? 'earned' : 'spent');
        
        // Update local state for immediate UI feedback
        gameData.coins = newCoins;
        updateCoinBalance();
        
        if (finalAmount > 0) {
            showCoinEarned(finalAmount, bonusDescription);
        }
        
        return true;
        
    } catch (error) {
        console.error('Failed to award coins:', error);
        return false;
    }
}

/**
 * Shows the animated coin earning notification.
 * @param {number} amount - The amount of coins earned.
 * @param {string} bonusText - Optional text to show for bonuses.
 */
function showCoinEarned(amount, bonusText = "") {
    const coinEarned = document.getElementById('coinEarned');
    const coinsEarnedText = document.getElementById('coinsEarnedText');
    if (!coinEarned || !coinsEarnedText) return;
    
    const displayAmount = amount % 1 === 0 ? amount : amount.toFixed(2);
    coinsEarnedText.innerHTML = `+${displayAmount} ${bonusText}`;
    
    // Reset animation
    coinEarned.style.display = 'flex';
    coinEarned.style.animation = 'none';
    
    // Trigger reflow to restart animation
    coinEarned.offsetHeight; 
    
    coinEarned.style.animation = 'coinEarned 2s ease-out forwards';

    setTimeout(() => {
        coinEarned.style.display = 'none';
    }, 2000);
}

/**
 * Loads the user's conversion history into the UI.
 */
async function loadConversionHistory() {
    const conversionHistory = document.getElementById('conversionHistory');
    if (!conversionHistory || !currentUser) return;
    
    try {
        const requests = await room.collection('credit_requests_v2_1')
            .filter({ username: currentUser.username })
            .getList();
        
        conversionHistory.innerHTML = '';
        
        if (requests.length === 0) {
            conversionHistory.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No conversion history</p>';
            return;
        }
        
        requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)).forEach(request => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div>
                    <div>${request.coinsAmount} coins → ${request.creditsAmount} credits</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">
                        ${new Date(request.requestedAt).toLocaleDateString()}
                    </div>
                </div>
                <div class="history-status ${request.status}">${request.status}</div>
            `;
            
            conversionHistory.appendChild(item);
        });
        
    } catch (error) {
        console.error('Failed to load conversion history:', error);
        conversionHistory.innerHTML = '<p style="text-align: center; color: var(--danger-color);">Failed to load history</p>';
    }
}

// Initialize event listeners
function initEventListeners() {
    // Tab navigation using event delegation
    const navTabsContainer = document.querySelector('.nav-tabs');
    if (navTabsContainer) {
        navTabsContainer.addEventListener('click', (e) => {
            if (e.target.matches('.nav-tab')) {
                const tabName = e.target.dataset.tab;
                switchTab(tabName);
            }
        });
    }

    // Game buttons
    document.getElementById('catchBtn')?.addEventListener('click', () => openGame('catch'));
    document.getElementById('snakeBtn')?.addEventListener('click', () => openGame('snake'));
    document.getElementById('targetBtn')?.addEventListener('click', () => openGame('target'));
    document.getElementById('balloonsBtn')?.addEventListener('click', () => openGame('balloons'));
    document.getElementById('squaresBtn')?.addEventListener('click', () => openGame('squares'));
    document.getElementById('clickerBtn')?.addEventListener('click', () => openGame('clicker'));
    document.getElementById('slotBtn')?.addEventListener('click', () => openGame('slot'));
    
    // Modal close buttons
    document.getElementById('closeModal')?.addEventListener('click', closeModal);
    document.getElementById('gameModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('gameModal')) {
            closeModal();
        }
    });

    // Store modal and buttons
    document.getElementById('closeCreditConversionModal')?.addEventListener('click', closeCreditConversionModal);
    document.getElementById('creditConversionModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'creditConversionModal') {
            closeCreditConversionModal();
        }
    });

    document.getElementById('purchaseCoinsBtn')?.addEventListener('click', () => {
        soundManager.play('uiClick');
        initiateCreditPurchase();
    });

    // New Store Purchase Buttons
    document.getElementById('purchaseVipBtn')?.addEventListener('click', () => {
        soundManager.play('uiClick');
        purchaseVip();
    });
    document.getElementById('purchaseBoostBtn')?.addEventListener('click', () => {
        soundManager.play('uiClick');
        purchaseBoost();
    });
    document.getElementById('resetMyBoostBtn')?.addEventListener('click', () => {
        soundManager.play('uiClick');
        resetMyBoostData();
    });

    const creditsToConvert = document.getElementById('creditsToConvert');
    const creditConversionPreview = document.getElementById('creditConversionPreview');

    if (creditsToConvert && creditConversionPreview) {
        creditsToConvert.addEventListener('input', () => {
            const credits = parseInt(creditsToConvert.value) || 0;
            const isVip = gameData.vipUntil && gameData.vipUntil > new Date();
            const rate = isVip ? 6 : 3;
            const coins = credits * rate;
            creditConversionPreview.textContent = `= ${coins} Coins`;
        });
    }
    
    // Credits conversion
    const coinsToConvert = document.getElementById('coinsToConvert');
    const conversionPreview = document.getElementById('conversionPreview');
    
    if (coinsToConvert && conversionPreview) {
        coinsToConvert.addEventListener('input', () => {
            const coins = parseInt(coinsToConvert.value) || 0;
            const credits = Math.floor(coins / 4);
            if (coins >= 100) {
                conversionPreview.textContent = `= ${credits} Credits`;
            } else {
                 conversionPreview.textContent = '= 0 Credits';
            }
        });
    }
    
    if (convertBtn) {
        convertBtn.addEventListener('click', (e) => {
            soundManager.play('uiClick');
            initiateCreditConversion(e);
        });
    }
}

// Function to dynamically create admin panel
function createAdminControls() {
    // 1. Create Admin Tab Button
    const navTabs = document.querySelector('.nav-tabs');
    if (navTabs) {
        const adminButtonHTML = `<button class="nav-tab admin-only" data-tab="admin" id="adminTabButton">⚙️ Admin</button>`;
        navTabs.insertAdjacentHTML('beforeend', adminButtonHTML);
    }

    // 2. Create Admin Tab Content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        const adminTabContentHTML = `
            <div id="adminTab" class="tab-content">
                <div class="admin-dashboard">
                    <nav class="admin-nav">
                        <button class="admin-nav-btn active" data-section="overview">📊 Overview</button>
                        <button class="admin-nav-btn" data-section="requests">💳 Credit Requests</button>
                        <button class="admin-nav-btn" data-section="users">👥 Users</button>
                        <button class="admin-nav-btn" data-section="transactions">📋 Transactions</button>
                    </nav>
                    <main class="admin-main">
                        <!-- Overview Section -->
                        <section id="overview-section" class="admin-section active">
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <div class="stat-icon">👥</div>
                                    <div class="stat-info">
                                        <h3>Total Users</h3>
                                        <div class="stat-value" id="adminTotalUsers">0</div>
                                    </div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-icon">⏳</div>
                                    <div class="stat-info">
                                        <h3>Pending Requests</h3>
                                        <div class="stat-value" id="adminPendingRequests">0</div>
                                    </div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-icon">🪙</div>
                                    <div class="stat-info">
                                        <h3>Total Coins Earned</h3>
                                        <div class="stat-value" id="adminTotalCoinsEarned">0</div>
                                    </div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-icon">💳</div>
                                    <div class="stat-info">
                                        <h3>Credits Converted</h3>
                                        <div class="stat-value" id="adminCreditsConverted">0</div>
                                    </div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-icon">🏦</div>
                                    <div class="stat-info">
                                        <h3>Admin Vault</h3>
                                        <div class="stat-value" id="adminVaultBalance">0</div>
                                    </div>
                                </div>
                            </div>

                            <div class="admin-cards">
                                <div class="card">
                                    <h3>⚙️ Quick Actions</h3>
                                    <div class="quick-actions">
                                        <button id="resetVipBtn" class="btn" style="background: var(--danger-color); color: white; width: 100%;">Reset All VIP Data</button>
                                    </div>
                                </div>
                                <div class="card">
                                    <h3>📈 Recent Activity</h3>
                                    <div id="adminRecentActivity" class="activity-list">
                                        <!-- Activity items will be populated here -->
                                    </div>
                                </div>
                            </div>
                        </section>

                        <!-- Credit Requests Section -->
                        <section id="requests-section" class="admin-section">
                            <div class="section-header">
                                <h2>💳 Credit Conversion Requests</h2>
                                <button class="refresh-btn" id="refreshRequests">🔄 Refresh</button>
                            </div>
                            <div class="card">
                                <div id="adminCreditRequestsList" class="requests-list">
                                    <!-- Requests will be populated here -->
                                </div>
                            </div>
                        </section>

                        <!-- Users Section -->
                        <section id="users-section" class="admin-section">
                            <div class="section-header">
                                <h2>👥 User Management</h2>
                                <button class="refresh-btn" id="refreshUsers">🔄 Refresh</button>
                            </div>
                            <div class="card">
                                <div id="adminUsersList" class="users-list">
                                    <!-- Users will be populated here -->
                                </div>
                            </div>
                        </section>

                        <!-- Transactions Section -->
                        <section id="transactions-section" class="admin-section">
                            <div class="section-header">
                                <h2>📋 Transaction History</h2>
                                <button class="refresh-btn" id="refreshTransactions">🔄 Refresh</button>
                            </div>
                            <div class="card">
                                <div id="adminTransactionsList" class="transactions-list">
                                    <!-- Transactions will be populated here -->
                                </div>
                            </div>
                        </section>
                    </main>
                </div>
            </div>`;
        mainContent.insertAdjacentHTML('beforeend', adminTabContentHTML);

        // Add event listeners for the new admin content
        const adminDashboard = document.querySelector('.admin-dashboard');
        if (adminDashboard) {
            adminDashboard.addEventListener('click', e => {
                if (e.target.matches('.admin-nav-btn')) {
                    const section = e.target.dataset.section;
                    switchAdminSection(section);
                }
                if (e.target.id === 'resetVipBtn') {
                    resetAllVipData();
                }
            });
        }
    }
}

// Function to set up admin-only UI elements
function setupAdminUI() {
    // Show admin section in the store
    const storeAdminActions = document.getElementById('storeAdminActions');
    if (storeAdminActions) {
        storeAdminActions.style.display = 'block';
    }

    // Add event listeners for store admin buttons
    document.getElementById('resetVipBtnStore')?.addEventListener('click', resetAllVipData);
}

// Switch tabs
function switchTab(tabName) {
    soundManager.play('uiClick');
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Load tab-specific data
    if (tabName === 'credits') {
        loadConversionHistory();
    } else if (tabName === 'admin' && currentUser && currentUser.username === 'ysr') {
        loadAllAdminData();
    } else if (tabName === 'leaderboard') {
        loadLeaderboard();
    } else if (tabName === 'support') {
        loadTippersLeaderboard();
    } else if (tabName === 'store') {
        updateStoreUI();
    }
}

async function setSupportLink() {
    try {
        const project = await window.websim.getCurrentProject();
        const link = document.getElementById('projectCommentsLinkSupport');
        
        if (link && project && project.id) {
            link.href = `https://websim.com/p/${project.id}?tab=comments`;
            link.style.display = 'inline-block';
            link.textContent = 'Go to Project Comments';
        } else {
            const link = document.getElementById('projectCommentsLinkSupport');
            if (link) {
                link.style.display = 'none';
            }
        }
    } catch (e) {
        console.error("Could not set support link:", e);
        const link = document.getElementById('projectCommentsLinkSupport');
        if (link) {
            link.style.display = 'none';
        }
    }
}

// Close modal
function closeModal() {
    const gameModal = document.getElementById('gameModal');
    if (!gameModal.classList.contains('active')) return;
    
    soundManager.play('uiClick', 0.8);
    
    // Stop any running games
    if (window.currentGame && typeof window.currentGame.destroy === 'function') {
        window.currentGame.destroy();
        window.currentGame = null;
    }

    gameModal.classList.remove('active');
}

// --- LEADERBOARD FUNCTIONS ---
async function loadLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;

    leaderboardList.innerHTML = '<div class="loading-state">Loading leaderboard...</div>';

    try {
        const users = await room.collection('users_v2_1').getList();
        
        const sortedUsers = users
            .filter(u => u.coins > 0)
            .sort((a, b) => (b.coins || 0) - (a.coins || 0))
            .slice(0, 100);

        leaderboardList.innerHTML = '';
        if (sortedUsers.length === 0) {
            leaderboardList.innerHTML = '<div class="empty-state">No players on the leaderboard yet.</div>';
            return;
        }

        sortedUsers.forEach((user, index) => {
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

// --- STORE & CREDIT CONVERSION FUNCTIONS ---

function closeCreditConversionModal() {
    soundManager.play('uiClick', 0.8);
    const modal = document.getElementById('creditConversionModal');
    modal.classList.remove('active');
}

async function initiateCreditPurchase() {
    const creditsInput = document.getElementById('creditsToConvert');
    const creditsToConvert = parseInt(creditsInput.value) || 0;

    if (creditsToConvert < 1) {
        alert("Please enter a valid amount of credits to convert.");
        return;
    }

    const isVip = gameData.vipUntil && gameData.vipUntil > new Date();
    const rate = isVip ? 6 : 3;
    const coinsToReceive = creditsToConvert * rate;
    const modal = document.getElementById('creditConversionModal');

    // Populate modal
    document.getElementById('creditsToSpend').textContent = creditsToConvert;
    document.getElementById('coinsToReceive').textContent = coinsToReceive;
    document.getElementById('tipRequiredAmountCredits').textContent = `${creditsToConvert} Websim Credits`;
    document.getElementById('tipRequiredAmountCredits2').textContent = creditsToConvert;
    document.getElementById('purchaseError').style.display = 'none';

    // Set project comments link
    try {
        const project = await window.websim.getCurrentProject();
        const commentsLink = document.getElementById('projectCommentsLinkStore');
        if (project && project.id) {
            commentsLink.href = `https://websim.com/p/${project.id}?tab=comments`;
        } else {
            commentsLink.href = '#';
        }
    } catch(e) {
        console.error("Could not get project link for store", e);
    }
    

    // Set up verify button
    const verifyBtn = document.getElementById('verifyAndPurchaseBtn');
    verifyBtn.onclick = () => verifyAndCompletePurchase(creditsToConvert, coinsToReceive);
    
    modal.classList.add('active');
}

async function verifyAndCompletePurchase(creditsToConvert, coinsToReceive) {
    const verifyBtn = document.getElementById('verifyAndPurchaseBtn');
    const errorEl = document.getElementById('purchaseError');

    // Enhanced input validation
    const credits = parseInt(creditsToConvert);
    const coins = parseInt(coinsToReceive);
    
    if (isNaN(credits) || isNaN(coins) || credits <= 0 || coins <= 0) {
        errorEl.textContent = "Invalid conversion amounts detected.";
        errorEl.style.display = 'block';
        return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    errorEl.style.display = 'none';
    soundManager.play('uiClick');

    try {
        const project = await window.websim.getCurrentProject();
        if (!project || !project.id) {
            throw new Error("Could not get project information.");
        }

        // Fetch recent tip comments
        const response = await fetch(`/api/v1/projects/${project.id}/comments?only_tips=true&first=25`);
        if (!response.ok) throw new Error("Could not fetch recent tips.");
        const data = await response.json();

        // Find a valid tip from the current user
        const recentUserTips = data.comments.data
            .map(item => item.comment)
            .filter(comment => 
                comment.author.id === currentUser.id &&
                comment.card_data &&
                comment.card_data.type === 'tip_comment' &&
                comment.card_data.credits_spent >= credits
            )
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (recentUserTips.length === 0) {
            throw new Error(`No recent tip of at least ${credits} credits found. Please make the tip first.`);
        }
        
        // Check if the newest valid tip has already been used
        const newestTip = recentUserTips[0];
        const usedTips = await room.collection('used_credit_tips_v2_1').filter({ id: newestTip.id }).getList();

        if (usedTips.length > 0) {
             throw new Error("This tip has already been used for a conversion. Please make a new tip.");
        }

        // --- Success ---
        // 1. Award coins with enhanced validation
        const awardSuccess = await awardCoins(coins, 'credit_conversion');
        if (!awardSuccess) {
            throw new Error("Failed to award coins to your account.");
        }

        // 2. Record the used tip to prevent reuse
        const recordSuccess = await recordUsedTip(newestTip.id, newestTip.card_data.credits_spent, coins);
        if (!recordSuccess) {
            console.warn("Failed to record used tip, but coins were awarded successfully");
        }
        
        alert(`Purchase successful! ${coins} coins have been added to your balance.`);
        
        closeCreditConversionModal();
        document.getElementById('creditsToConvert').value = '';

    } catch (error) {
        console.error('Credit purchase error:', error);
        errorEl.textContent = error.message;
        errorEl.style.display = 'block';
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Complete Purchase';
    }
}

/**
 * Initiates the credit conversion process with enhanced validation.
 */
async function initiateCreditConversion(e) {
    const coinsToConvertInput = document.getElementById('coinsToConvert');
    const coins = parseInt(coinsToConvertInput.value) || 0;
    const convertBtn = document.getElementById('convertBtn');

    if (coins < 100) {
        alert('Minimum conversion is 100 coins.');
        return;
    }

    // Enhanced validation: Check current balance from fresh database fetch
    const currentUserRecord = await getOrCreateUserRecord();
    if (!currentUserRecord) {
        alert("Could not verify your current balance. Please try again.");
        return;
    }

    const currentCoins = currentUserRecord.coins || 0;
    if (coins > currentCoins) {
        alert(`You don't have enough coins. Your current balance is ${Math.floor(currentCoins)} coins.`);
        return;
    }

    convertBtn.disabled = true;
    convertBtn.textContent = 'Processing...';

    try {
        // Rule: User must have at least one public project
        const hasProjects = await checkUserProjects();
        if (!hasProjects) {
            throw new Error('You must have at least 1 public project on your Websim profile to convert coins.');
        }

        // Conversion rule for Credits page: 100 coins → 25 credits → credits = floor(coins / 4)
        let credits = Math.floor(coins / 4);
        
        // Re-fetch user record to ensure we have the latest data
        const latestUserRecords = await room.collection('users_v2_1').filter({ username: currentUser.username }).getList();
        if (latestUserRecords.length === 0) {
            throw new Error("Could not find your user data to process the conversion.");
        }
        
        const latestUserRecord = latestUserRecords[0];
        const latestCoins = latestUserRecord.coins || 0;
        
        // Final validation before deduction
        if (coins > latestCoins) {
            throw new Error(`Insufficient balance. You have ${Math.floor(latestCoins)} coins, but tried to convert ${coins} coins.`);
        }

        // VIP Bonus for credit conversion
        const isVip = latestUserRecord.vip_until && new Date(latestUserRecord.vip_until) > new Date();
        if (isVip) {
            credits += 25;
        }

        // --- Perform Conversion Steps with Enhanced Safety ---
        // 1. Create the request for admin approval
        const requestSuccess = await createCreditRequest(coins, credits);
        if (!requestSuccess) throw new Error("Could not submit your conversion request. Please try again.");

        // 2. Deduct coins from the user's balance with safe calculation
        const newCoins = Math.max(0, latestCoins - coins); // Ensure never negative
        
        const updateResult = await room.collection('users_v2_1').upsert({
            id: latestUserRecord.id,
            coins: newCoins,
            lastActiveAt: new Date().toISOString()
        });

        if (!updateResult) {
            throw new Error("Failed to update your balance. Please try again.");
        }

        // 3. Log the "spent" transaction
        await createCoinTransaction(-coins, 'credit_conversion', 'spent');

        // 4. Update local state immediately for responsive UI
        gameData.coins = newCoins;
        updateCoinBalance();

        // 5. Update UI and notify user
        alert('Conversion request submitted successfully! An admin will review it shortly.');
        coinsToConvertInput.value = '';
        document.getElementById('conversionPreview').textContent = '= 0 Credits';
        loadConversionHistory(); // Refresh the history list

    } catch (error) {
        console.error('Credit conversion error:', error);
        alert(`Conversion failed: ${error.message}`);
    } finally {
        convertBtn.disabled = false;
        convertBtn.textContent = 'Convert Coins';
    }
}

/**
 * Checks if the current user has any public projects.
 * Caches the result in the user's DB record.
 * @returns {Promise<boolean>} True if user has at least one public project.
 */
async function checkUserProjects() {
    if (!currentUser) return false;
    try {
        // Fetch user's 20 most recent projects to check for any public ones.
        // This is more reliable than checking only the latest 'posted' project.
        const response = await fetch(`/api/v1/users/${currentUser.username}/projects?first=20`);
        if (!response.ok) {
            console.error(`Failed to fetch user projects with status: ${response.status}`);
            return false;
        }
        const data = await response.json();
        
        // Check if ANY project in the returned list is public.
        const hasPublicProject = data.projects?.data?.some(p => p.project && p.project.visibility === 'public');
        
        // Update user record with the latest check result
        const userRecord = await getOrCreateUserRecord();
        if (userRecord) {
            await room.collection('users_v2_1').update(userRecord.id, {
                hasProjects: !!hasPublicProject,
                projectsCheckedAt: new Date().toISOString()
            });
        }
        
        return !!hasPublicProject;
        
    } catch (error) {
        console.error('Failed to check user projects:', error);
        return false;
    }
}

// --- ADMIN PANEL FUNCTIONS ---

function switchAdminSection(sectionName) {
    // Update nav buttons
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionName);
    });

    // Update sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.toggle('active', section.id === `${sectionName}-section`);
    });

    // Load section data if needed
    switch (sectionName) {
        case 'requests': loadAdminCreditRequests(); break;
        case 'users': loadAdminUsers(); break;
        case 'transactions': loadAdminTransactions(); break;
        case 'overview': loadAdminOverview(); loadAdminRecentActivity(); break;
    }
}

async function loadAllAdminData() {
    if (!currentUser || currentUser.username !== 'ysr') return;
    // Load overview first
    await loadAdminOverview();
    await loadAdminRecentActivity();
     // Default to overview section
    switchAdminSection('overview');
}

async function loadAdminOverview() {
    try {
        const users = await room.collection('users_v2_1').getList();
        const requests = await room.collection('credit_requests_v2_1').getList();
        const transactions = await room.collection('coin_transactions_v2_1').getList();
        const vaultList = await room.collection('admin_vault_v2_1').getList();
        const vault = vaultList[0] || { coins: 0 };

        document.getElementById('adminTotalUsers').textContent = users.length;
        document.getElementById('adminPendingRequests').textContent = requests.filter(r => r.status === 'pending').length;
        document.getElementById('adminVaultBalance').textContent = Math.floor(vault.coins || 0).toLocaleString();
        
        // compute Total Coins Earned from user totals (not current coins or transactions)
        const totalEarned = users.reduce((sum, u) => sum + (parseFloat(u.totalCoinsEarned || 0) || 0), 0);
        document.getElementById('adminTotalCoinsEarned').textContent = Math.floor(totalEarned).toLocaleString();

        const creditsConverted = requests
            .filter(r => r.status === 'approved')
            .reduce((sum, r) => sum + r.creditsAmount, 0);
        document.getElementById('adminCreditsConverted').textContent = creditsConverted.toLocaleString();
    } catch (error) {
        console.error('Failed to load admin overview:', error);
    }
}

async function loadAdminRecentActivity() {
    try {
        const requests = await room.collection('credit_requests_v2_1').getList();
        const transactions = await room.collection('coin_transactions_v2_1').getList();

        const activities = [];
        requests.forEach(r => activities.push({ date: new Date(r.requestedAt), text: `@${r.username} requested ${r.creditsAmount} credits` }));
        transactions.forEach(t => activities.push({ date: new Date(t.timestamp), text: `@${t.username} ${t.type} ${Math.abs(t.amount)} coins from ${t.source}` }));
        
        activities.sort((a, b) => b.date - a.date);

        const activityList = document.getElementById('adminRecentActivity');
        activityList.innerHTML = '';

        if (activities.length === 0) {
            activityList.innerHTML = '<div class="empty-state">No recent activity</div>';
            return;
        }

        activities.slice(0, 20).forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                <div>${activity.text}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-left: auto; white-space: nowrap;">${formatTimeAgo(activity.date)}</div>
            `;
            activityList.appendChild(item);
        });

    } catch (error) {
        console.error('Failed to load admin recent activity:', error);
    }
}

async function loadAdminCreditRequests() {
    try {
        const requests = await room.collection('credit_requests_v2_1').getList();
        const requestsList = document.getElementById('adminCreditRequestsList');
        requestsList.innerHTML = '';

        if (requests.length === 0) {
            requestsList.innerHTML = '<div class="empty-state">No credit requests found</div>';
            return;
        }

        const sorted = requests.sort((a, b) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            return new Date(b.requestedAt) - new Date(a.requestedAt);
        });

        const projectPromises = sorted
            .filter(r => r.status === 'pending')
            .map(request => 
                fetch(`/api/v1/users/${request.username}/projects?posted=true&first=1`)
                    .then(res => res.json())
                    .then(data => ({ username: request.username, data }))
                    .catch(() => ({ username: request.username, data: null }))
            );

        const projectResults = await Promise.all(projectPromises);
        const projectsByUsername = projectResults.reduce((acc, result) => {
            acc[result.username] = result.data;
            return acc;
        }, {});

        sorted.forEach((request) => {
            const card = document.createElement('div');
            card.className = 'request-card';

            const projectInfo = projectsByUsername[request.username];
            const projectData = projectInfo?.projects?.data?.[0];
            let projectLinkHTML = '';
            if (request.status === 'pending') {
                 projectLinkHTML = '<p>Project: <span class="text-warning">Checking...</span></p>';
                if (projectData && projectData.project.visibility === 'public') {
                    const project = projectData.project;
                    projectLinkHTML = `<p>Project: <a href="https://websim.com/p/${project.id}" target="_blank" class="project-link">${project.title || 'Untitled Project'}</a></p>`;
                } else if (projectInfo !== undefined) {
                     projectLinkHTML = '<p>Project: <span class="text-danger">No public project found</span></p>';
                }
            }

            card.innerHTML = `
                <div class="card-info">
                    <h4>@${request.username}</h4>
                    <p><strong>${request.coinsAmount} coins → ${request.creditsAmount} credits</strong></p>
                    ${projectLinkHTML}
                    <p style="font-size: 0.8rem">Submitted: ${new Date(request.requestedAt).toLocaleString()}</p>
                </div>
                <div class="card-actions">
                    ${request.status === 'pending' ? `
                        <button class="btn btn-approve" onclick="approveRequest('${request.id}')">Approve</button>
                        <button class="btn btn-reject" onclick="rejectRequest('${request.id}')">Reject</button>
                    ` : `<span class="status-badge status-${request.status}">${request.status.toUpperCase()}</span>`}
                </div>
            `;
            requestsList.appendChild(card);
        });
    } catch (error) {
        console.error('Failed to load credit requests:', error);
    }
}

async function loadAdminUsers() {
    try {
        const users = await room.collection('users_v2_1').getList();
        const usersList = document.getElementById('adminUsersList');
        usersList.innerHTML = '';

        if (users.length === 0) {
            usersList.innerHTML = '<div class="empty-state">No users found</div>';
            return;
        }

        const sorted = users.sort((a, b) => (b.totalCoinsEarned || 0) - (a.totalCoinsEarned || 0));

        sorted.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                <div class="card-info">
                    <h4>@${user.username}</h4>
                    <p><strong>Current Coins:</strong> ${Math.floor(user.coins || 0).toLocaleString()}</p>
                    <p><strong>Total Earned:</strong> ${Math.floor(user.totalCoinsEarned || 0).toLocaleString()}</p>
                    <p><strong>Games Played:</strong> ${user.gamesPlayed || 0}</p>
                    <p><strong>VIP Active Until:</strong> ${user.vip_until ? new Date(user.vip_until).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Boost Uses (Local):</strong> ${localStorage.getItem(`coinBoostUses_${user.username}`) || '0'}</p>
                    <p><strong>Has Public Project:</strong> ${user.hasProjects ? '<span class="text-success">Yes</span>' : '<span class="text-danger">No</span>'}</p>
                    <p><strong>Last Active:</strong> ${user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}</p>
                    <p><strong>Joined:</strong> ${new Date(user.createdAt || user.created_at).toLocaleDateString()}</p>
                </div>
                <div class="admin-user-actions">
                    <input type="number" placeholder="Amount" class="admin-coin-input" id="coins-to-send-${user.id}">
                    <button class="btn btn-send" onclick="sendCoinsFromVault('${user.id}', '${user.username}')">Send Coins</button>
                </div>
            `;
            usersList.appendChild(card);
        });
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

async function loadAdminTransactions() {
    try {
        const transactions = await room.collection('coin_transactions_v2_1').getList();
        const listEl = document.getElementById('adminTransactionsList');
        listEl.innerHTML = '';

        if (transactions.length === 0) {
            listEl.innerHTML = '<div class="empty-state">No transactions found</div>';
            return;
        }
        
        const sorted = transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 100);

        sorted.forEach(t => {
            const card = document.createElement('div');
            card.className = 'transaction-card';
            const amountColor = t.type === 'earned' ? 'var(--success-color)' : t.type === 'spent' ? 'var(--danger-color)' : 'var(--warning-color)';
            const amountPrefix = t.type === 'earned' ? '+' : t.type === 'spent' ? '-' : '';

            card.innerHTML = `
                <div class="card-info">
                    <h4>@${t.username}</h4>
                    <p><strong style="color: ${amountColor};">${amountPrefix}${Math.abs(t.amount)} coins</strong></p>
                    <p><strong>Source:</strong> ${formatSource(t.source)}</p>
                    <p><strong>Time:</strong> ${new Date(t.timestamp).toLocaleString()}</p>
                    ${t.sessionId ? `<p style="font-size:0.8rem; color: var(--text-secondary);">Session: ${t.sessionId.slice(-8)}</p>` : ''}
                </div>
                <div class="card-actions">
                    <span class="status-badge status-${t.type === 'refund' ? 'approved' : t.type}">${t.type}</span>
                </div>
            `;
            listEl.appendChild(card);
        });
    } catch (error) {
        console.error('Failed to load transactions:', error);
    }
}

function formatSource(source) {
    const names = {
        'catch': 'Catch Coins', 'target': 'Hit Targets',
        'balloons': 'Pop Balloons', 'squares': 'Catch Squares',
        'snake': 'Coin Snake', 'clicker': 'Click & Win',
        'credit_conversion': 'Credit Conversion', 'admin_refund': 'Admin Refund',
        'request_rejection': 'Request Rejected', 'vip_subscription': 'VIP Subscription',
        'admin_grant': 'Admin Grant',
    };
    return names[source] || source;
}

function formatTimeAgo(date) {
    const diff = Date.now() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// Admin actions with complete database persistence
window.approveRequest = async function(requestId) {
    if (!currentUser || currentUser.username !== 'ysr') {
        alert("You are not authorized to perform this action.");
        return;
    }

    try {
        const requests = await room.collection('credit_requests_v2_1').getList();
        const requestData = requests.find(r => r.id === requestId);

        if (!requestData) {
            alert("Error: Request not found.");
            return;
        }

        if (requestData.status !== 'pending') {
            alert(`This request is already marked as '${requestData.status}'.`);
            return;
        }

        const approveBtn = document.querySelector(`.btn-approve[onclick="approveRequest('${requestId}')"]`);
        if(approveBtn) {
            approveBtn.disabled = true;
            approveBtn.textContent = 'Approving...';
        }

        // --- MANUAL APPROVAL PROCESS ---
        // There is no API to programmatically transfer credits to another user.
        // This action marks the request as 'approved' in the database.
        // The admin must manually send the credits to the user.

        await room.collection('credit_requests_v2_1').update(requestId, {
            status: 'approved',
            approvedAt: new Date().toISOString(),
            approvedBy: currentUser.username,
        });
        
        alert(`Request approved for @${requestData.username}. Please remember to manually send ${requestData.creditsAmount} credits to the user.`);
        
        // Refresh admin data to show the updated status
        loadAllAdminData();

    } catch (error) {
        console.error('Failed to approve request:', error);
        alert(`Failed to approve request: ${error.message}`);
        
        // Re-enable the button on failure
        const approveBtn = document.querySelector(`.btn-approve[onclick="approveRequest('${requestId}')"]`);
        if(approveBtn) {
            approveBtn.disabled = false;
            approveBtn.textContent = 'Approve';
        }
    }
};

window.rejectRequest = async function(requestId) {
    if (!currentUser || currentUser.username !== 'ysr') return;
    if (!confirm('Are you sure you want to reject this request? The user\'s coins will be refunded.')) return;
    
    try {
        const requests = await room.collection('credit_requests_v2_1').getList();
        const requestData = requests.find(r => r.id === requestId);
        
        if (requestData) {
            // Refund coins to user
            const userRecords = await room.collection('users_v2_1').filter({ username: requestData.username }).getList();
            if (userRecords.length > 0) {
                const userRecord = userRecords[0];
                const newCoins = (userRecord.coins || 0) + requestData.coinsAmount;
                
                await room.collection('users_v2_1').update(userRecord.id, {
                    coins: newCoins,
                    lastActiveAt: new Date().toISOString()
                });
                
                // Create refund transaction log
                await createCoinTransaction(
                    requestData.coinsAmount,
                    'request_rejection',
                    'refund'
                );
            }
        }
        
        // Update request status to 'rejected'
        await room.collection('credit_requests_v2_1').update(requestId, {
            status: 'rejected',
            rejectedAt: new Date().toISOString(),
            rejectedBy: currentUser.username
        });
        
        alert('Request rejected and coins have been refunded to the user.');
        loadAllAdminData();
        
    } catch (error) {
        console.error('Failed to reject request:', error);
        alert('Failed to reject request');
    }
};

window.sendCoinsFromVault = async function(userId, username) {
    if (!currentUser || currentUser.username !== 'ysr') {
        return alert("You are not authorized to perform this action.");
    }

    const inputEl = document.getElementById(`coins-to-send-${userId}`);
    const amount = parseInt(inputEl.value);

    if (isNaN(amount) || amount <= 0) {
        return alert("Please enter a valid, positive number of coins to send.");
    }

    if (!confirm(`Are you sure you want to send ${amount.toLocaleString()} coins from the vault to @${username}?`)) {
        return;
    }

    try {
        const [vaultList, userList] = await Promise.all([
            room.collection('admin_vault_v2_1').getList(),
            room.collection('users_v2_1').filter({ id: userId }).getList()
        ]);

        const vault = vaultList[0];
        const recipient = userList[0];

        if (!vault || (vault.coins || 0) < amount) {
            throw new Error("Insufficient funds in the admin vault.");
        }
        if (!recipient) {
            throw new Error(`Recipient user with ID ${userId} not found.`);
        }

        const newVaultCoins = vault.coins - amount;
        const newRecipientCoins = (recipient.coins || 0) + amount;
        
        const vaultUpdatePromise = room.collection('admin_vault_v2_1').upsert({ id: 'main', coins: newVaultCoins });
        const recipientUpdatePromise = room.collection('users_v2_1').update(userId, { coins: newRecipientCoins });
        
        // Log transactions for both sides
        const recipientTransactionPromise = createCoinTransaction(amount, 'admin_grant', 'earned');
        const adminTransactionPromise = room.collection('admin_vault_transactions_v2_1').create({
            admin_user_id: currentUser.id,
            recipient_user_id: recipient.userId, // use the websim user id
            amount: amount,
            reason: 'admin_grant',
            timestamp: new Date().toISOString()
        });
        
        await Promise.all([vaultUpdatePromise, recipientUpdatePromise, recipientTransactionPromise, adminTransactionPromise]);

        alert(`Successfully sent ${amount.toLocaleString()} coins to @${username}.`);
        inputEl.value = '';
        loadAllAdminData();
        loadAdminUsers();

    } catch (error) {
        console.error('Failed to send coins from vault:', error);
        alert(`Error: ${error.message}`);
    }
};

async function loadTippersLeaderboard() {
    const leaderboardList = document.getElementById('tippersLeaderboard');
    if (!leaderboardList) return;

    leaderboardList.innerHTML = '<div class="loading-state">Loading top supporters...</div>';

    try {
        const project = await window.websim.getCurrentProject();
        if (!project || !project.id) {
            throw new Error("Could not get project information.");
        }

        const response = await fetch(`/api/v1/projects/${project.id}/comments?only_tips=true&first=100`);
        if (!response.ok) {
            throw new Error(`Failed to fetch tip comments: ${response.statusText}`);
        }
        const data = await response.json();
        
        if (!data.comments || data.comments.data.length === 0) {
            leaderboardList.innerHTML = '<div class="empty-state">No supporters yet. Be the first!</div>';
            return;
        }

        const tippers = {};
        data.comments.data.forEach(item => {
            const comment = item.comment;
            if (comment.card_data && comment.card_data.type === 'tip_comment') {
                const authorId = comment.author.id;
                if (!tippers[authorId]) {
                    tippers[authorId] = {
                        user: comment.author,
                        totalTipped: 0,
                    };
                }
                tippers[authorId].totalTipped += comment.card_data.credits_spent;
            }
        });

        const sortedTippers = Object.values(tippers).sort((a, b) => b.totalTipped - a.totalTipped);

        leaderboardList.innerHTML = '';
        sortedTippers.forEach((tipper, index) => {
            const rank = index + 1;
            let rankClass = '';
            if (rank === 1) rankClass = 'gold';
            else if (rank === 2) rankClass = 'silver';
            else if (rank === 3) rankClass = 'bronze';

            const isVip = tipper.user.vip_until && new Date(tipper.user.vip_until) > new Date();

            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            item.innerHTML = `
                <div class="rank ${rankClass}">${rank}</div>
                <div class="player-info">
                    <img src="${tipper.user.avatar_url || `https://images.websim.com/avatar/${tipper.user.username}`}" alt="${tipper.user.username}" class="player-avatar">
                    <span class="player-name">${tipper.user.username} ${isVip ? '<span class="vip-badge">🏆</span>' : ''}</span>
                </div>
                <div class="player-coins" style="color: var(--primary-color)">
                    ${tipper.totalTipped.toLocaleString()} Credits
                </div>
            `;
            leaderboardList.appendChild(item);
        });

    } catch (error) {
        console.error("Failed to load tippers leaderboard:", error);
        leaderboardList.innerHTML = '<div class="empty-state" style="color: var(--danger-color);">Error loading supporters.</div>';
    }
}

// --- NEW STORE & VIP FUNCTIONS ---

function updateStoreUI() {
    const isVip = gameData.vipUntil && gameData.vipUntil > new Date();
    const hasBoost = gameData.coinBoostUses > 0;
    const vipBtn = document.getElementById('purchaseVipBtn');
    const boostBtn = document.getElementById('purchaseBoostBtn');
    const perkStatusEl = document.getElementById('perkStatus');
    const creditsToCoinsRateEl = document.getElementById('creditsToCoinsRate').querySelector('.rate');
    const resetMyBoostBtn = document.getElementById('resetMyBoostBtn');

    let statusHTML = '';

    // VIP Status
    if (isVip) {
        statusHTML += `<div class="status-active vip">🏆 VIP Active until ${gameData.vipUntil.toLocaleDateString()}</div>`;
        vipBtn.textContent = 'VIP Active';
        vipBtn.disabled = true;
        boostBtn.textContent = 'Unavailable with VIP';
        boostBtn.disabled = true;
        if (resetMyBoostBtn) resetMyBoostBtn.style.display = 'block';
        creditsToCoinsRateEl.textContent = '1 Credit = 6 Coins';
    } else {
        vipBtn.textContent = 'Purchase VIP';
        vipBtn.disabled = hasBoost; // Disable if boost is active
        if (hasBoost) {
            vipBtn.textContent = 'Unavailable with Boost';
        }
        boostBtn.textContent = 'Purchase Boost';
        boostBtn.disabled = isVip; // Disable if VIP is active
        if (resetMyBoostBtn) resetMyBoostBtn.style.display = 'none';
    }
    
    // Boost Status
    if (hasBoost) {
        statusHTML += `<div class="status-active boost">⚡ Coin Boost Active: ${gameData.coinBoostUses} uses left</div>`;
        boostBtn.textContent = 'Boost Active';
        boostBtn.disabled = true;
        if (resetMyBoostBtn) resetMyBoostBtn.style.display = 'block';
    } else {
         boostBtn.textContent = 'Purchase Boost';
         boostBtn.disabled = isVip; // Disable if VIP is active
         if (resetMyBoostBtn) resetMyBoostBtn.style.display = 'none';
    }
    
    if (statusHTML) {
        perkStatusEl.innerHTML = statusHTML;
        perkStatusEl.style.display = 'block';
    } else {
        perkStatusEl.style.display = 'none';
    }
    
    if (!isVip) {
         creditsToCoinsRateEl.textContent = '1 Credit = 3 Coins';
    }

    const creditsInput = document.getElementById('creditsToConvert');
    if (creditsInput) {
        creditsInput.dispatchEvent(new Event('input'));
    }
}

async function purchaseVip() {
    const userRecord = await getOrCreateUserRecord();
    if (!userRecord) return alert("Could not find your user data.");

    if (userRecord.coins < 2000) {
        return alert("You need 2000 coins to purchase VIP membership.");
    }
    if (gameData.coinBoostUses > 0) {
        return alert("You cannot purchase VIP while a Coin Boost is active.");
    }
    if (userRecord.vip_until && new Date(userRecord.vip_until) > new Date()) {
        return alert("You already have an active VIP membership.");
    }

    if (!confirm("Purchase VIP Membership for 2000 coins? It will be active for 3 days.")) return;

    try {
        const newCoins = userRecord.coins - 2000;
        const vipExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

        await room.collection('users_v2_1').update(userRecord.id, {
            coins: newCoins,
            vip_until: vipExpiry.toISOString()
        });
        await createCoinTransaction(-2000, 'purchase_vip', 'spent');

        alert("VIP Membership purchased successfully! It's active for 3 days.");
    } catch (error) {
        console.error("Failed to purchase VIP:", error);
        alert("An error occurred during your purchase. Please try again.");
    }
}

async function purchaseBoost() {
    const userRecord = await getOrCreateUserRecord();
    if (!userRecord) return alert("Could not find your user data.");

    if (userRecord.coins < 50) {
        return alert("You don't have enough coins to purchase the Coin Boost (50 required).");
    }
    if (gameData.coinBoostUses > 0) {
        return alert("You already have an active Coin Boost. Please use your remaining charges before purchasing another.");
    }
    if (userRecord.vip_until && new Date(userRecord.vip_until) > new Date()) {
        return alert("You cannot purchase a Coin Boost while VIP is active.");
    }

    if (!confirm("Are you sure you want to spend 50 coins to get a +5% Coin Boost for 10 games?")) return;

    try {
        const newCoins = userRecord.coins - 50;
        
        // Update DB for coins
        await room.collection('users_v2_1').update(userRecord.id, {
            coins: newCoins,
        });
        
        // Update localStorage for boost
        gameData.coinBoostUses += 10;
        localStorage.setItem(`coinBoostUses_${currentUser.username}`, gameData.coinBoostUses);

        await createCoinTransaction(-50, 'purchase_boost', 'spent');
        
        alert("Purchase successful! You now have a +5% Coin Boost.");
        updateStoreUI(); // Manually trigger UI update
    } catch (error) {
        console.error("Failed to purchase Coin Boost:", error);
        alert("An error occurred during your purchase. Please try again.");
    }
}

async function resetMyBoostData() {
    if (!currentUser) return;

    if (gameData.coinBoostUses <= 0) {
        alert("You don't have an active Coin Boost to reset.");
        return;
    }

    if (!confirm(`Are you sure you want to reset your remaining ${gameData.coinBoostUses} boost uses? This action cannot be undone and you will not be refunded.`)) {
        return;
    }

    try {
        gameData.coinBoostUses = 0;
        localStorage.removeItem(`coinBoostUses_${currentUser.username}`);
        alert("Your Coin Boost has been reset. You can now purchase a new one or buy VIP.");
        updateStoreUI();
    } catch (error) {
        console.error("Failed to reset user's boost data:", error);
        alert("An error occurred while resetting your boost. Please try again.");
    }
}

async function resetAllVipData() {
    if (!currentUser || currentUser.username !== 'ysr') return alert("Unauthorized.");
    if (!confirm("ARE YOU SURE?\nThis will reset ALL VIP data for EVERY user. This action cannot be undone.")) return;

    try {
        const users = await room.collection('users_v2_1').getList();
        const updates = [];
        for (const user of users) {
            if (user.vip_until) {
                updates.push(room.collection('users_v2_1').update(user.id, {
                    vip_until: null,
                }));
            }
        }
        await Promise.all(updates);
        alert(`Successfully reset VIP data for ${updates.length} users.`);
        loadAllAdminData();
    } catch (error) {
        console.error("Failed to reset VIP data:", error);
        alert("An error occurred during the reset process.");
    }
}

async function resetAllBoostData() {
    // This function is deprecated as boost data is now in localStorage.
    alert("Admin reset for boosts is no longer available as data is stored locally on user devices.");
}

// Enhanced coin spending function with better validation
async function spendCoinsToVault(amount, source) {
    if (!currentUser) return false;

    // Enhanced input validation
    const spendAmount = parseFloat(Number(amount).toFixed(2));
    if (isNaN(spendAmount) || !isFinite(spendAmount) || spendAmount <= 0) {
        console.error(`Invalid spend amount: ${amount}`);
        return false;
    }

    // Get fresh user record
    const userRecord = await getOrCreateUserRecord();
    if (!userRecord) {
        console.error('Could not get user record for spending');
        return false;
    }

    const currentCoins = userRecord.coins || 0;
    if (currentCoins < spendAmount) {
        console.error(`Insufficient funds for ${source}. User has ${currentCoins}, needs ${spendAmount}`);
        return false;
    }

    try {
        // Get/create admin vault
        let vaultList = await room.collection('admin_vault_v2_1').getList();
        let vault = vaultList[0];
        if (!vault) {
            vault = await room.collection('admin_vault_v2_1').create({ id: 'main', coins: 0 });
        }

        // Enhanced calculation with safety checks
        const newCoins = Math.max(0, currentCoins - spendAmount);
        const newVaultCoins = Math.max(0, (vault.coins || 0) + spendAmount);
        
        // Validate calculations
        if (!isFinite(newCoins) || !isFinite(newVaultCoins)) {
            throw new Error("Invalid calculation detected in spending operation");
        }
        
        // Perform DB updates and log transactions
        const userUpdatePromise = room.collection('users_v2_1').upsert({
            id: userRecord.id,
            coins: newCoins,
            lastActiveAt: new Date().toISOString()
        });
        const vaultUpdatePromise = room.collection('admin_vault_v2_1').upsert({ id: 'main', coins: newVaultCoins });
        const userTransactionPromise = createCoinTransaction(-spendAmount, source, 'spent');
        
        const results = await Promise.all([userUpdatePromise, vaultUpdatePromise, userTransactionPromise]);
        
        // Verify all operations succeeded
        if (!results[0] || !results[1] || !results[2]) {
            throw new Error("One or more database operations failed");
        }
        
        // Update local state for immediate UI feedback
        gameData.coins = newCoins;
        updateCoinBalance();
        
        return true;
    } catch (error) {
        console.error(`Error spending coins to vault for ${source}:`, error);
        return false;
    }
}
window.spendCoinsToVault = spendCoinsToVault;

// Open game modal
function openGame(gameName) {
    soundManager.play('uiClick');
    const gameModal = document.getElementById('gameModal');
    const gameTitle = document.getElementById('gameTitle');
    const gameContainer = document.getElementById('gameContainer');
    
    // Set game title
    const gameTitles = {
        catch: 'Catch the Falling Coins',
        snake: 'Coin Snake',
        target: 'Click the Target',
        balloons: 'Pop the Balloons',
        squares: 'Catch the Square',
        clicker: 'Click & Win',
        slot: 'Coin Slot Machine'
    };
    
    gameTitle.textContent = gameTitles[gameName] || 'Game';
    
    // Clear previous game content
    gameContainer.innerHTML = '';
    
    // Initialize game
    switch (gameName) {
        case 'catch':
            initCatchGame();
            break;
        case 'snake':
            initSnakeGame();
            break;
        case 'target':
            initTargetGame();
            break;
        case 'balloons':
            initBalloonsGame();
            break;
        case 'squares':
            initSquaresGame();
            break;
        case 'clicker':
            initClickerGame();
            break;
        case 'slot':
            initSlotGame();
            break;
    }
    
    // Show modal
    gameModal.classList.add('active');
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', initApp);
window.addEventListener('beforeunload', handlePageClose);

async function handlePageClose() {
    if (vipInterval) {
        clearInterval(vipInterval);
        vipInterval = null;
        console.log("Page closing, stopping VIP payment interval.");
    }
}

// Handles starting and stopping the VIP payment interval based on user status.
function handleVipStatus() {
    const isVip = gameData.vipUntil && gameData.vipUntil > new Date();

    if (isVip && !vipInterval) {
        console.log("VIP status active. Starting payment interval.");
        vipInterval = setInterval(processVipPayment, 1000); // 1 second = 0.10 coin fee
    } else if (!isVip && vipInterval) {
        console.log("VIP status expired or inactive. Stopping payment interval.");
        clearInterval(vipInterval);
        vipInterval = null;
    }
}

/**
 * Processes the per-second coin payment for VIP members.
 * Deducts coins from the user and adds them to the admin vault.
 */
async function processVipPayment() {
    const paymentAmount = 0.10;
    if (!currentUser) return; // Should not happen if interval is running

    const userRecord = await getOrCreateUserRecord();

    if (!userRecord || (userRecord.coins || 0) < paymentAmount) {
        if (vipInterval) {
            console.log(`Stopping VIP payment for @${currentUser.username} due to insufficient funds.`);
            clearInterval(vipInterval);
            vipInterval = null;
        }
        return;
    }

    try {
        // 1. Get/create admin vault
        let vaultList = await room.collection('admin_vault_v2_1').getList();
        let vault = vaultList[0];
        if (!vault) {
            vault = await room.collection('admin_vault_v2_1').create({ id: 'main', coins: 0 });
        }

        // 2. Prepare updates
        const newCoins = userRecord.coins - paymentAmount;
        const newVaultCoins = (vault.coins || 0) + paymentAmount;
        
        // 3. Perform DB updates and log transactions
        const userUpdatePromise = room.collection('users_v2_1').update(userRecord.id, { coins: newCoins });
        const vaultUpdatePromise = room.collection('admin_vault_v2_1').upsert({ id: 'main', coins: newVaultCoins });
        const userTransactionPromise = createCoinTransaction(-paymentAmount, 'vip_payment', 'spent');
        
        await Promise.all([userUpdatePromise, vaultUpdatePromise, userTransactionPromise]);

    } catch (error) {
        console.error("Error processing VIP payment:", error);
        if (vipInterval) {
            clearInterval(vipInterval);
            vipInterval = null;
        }
    }
}

window.awardCoins = awardCoins;