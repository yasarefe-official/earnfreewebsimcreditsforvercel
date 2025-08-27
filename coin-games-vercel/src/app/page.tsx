'use client';

import Script from 'next/script';
import Head from 'next/head';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';

// Define a type for the global window object
declare global {
  interface Window {
    initApp: (user: any) => void;
    initCatchGame: () => void;
    initSnakeGame: () => void;
    initTargetGame: () => void;
    initBalloonsGame: () => void;
    initSquaresGame: () => void;
    initClickerGame: () => void;
    initSlotGame: () => void;
    currentGame: { destroy: () => void };
  }
}


function LoginPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username) {
      setError('Please enter your username.');
      return;
    }
    const result = await signIn('credentials', {
      redirect: false,
      username: username,
    });

    if (result?.error) {
      setError('Login failed. Please check your username or register if you are a new user.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
      <h1>Welcome to Coin Games</h1>
      <p style={{ marginBottom: '2rem' }}>Please sign in to continue</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '300px' }}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your WebSim username"
          style={{ padding: '0.5rem', color: '#333' }}
        />
        <button type="submit" style={{ padding: '0.5rem', cursor: 'pointer' }}>
          Sign In
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
      <p style={{marginTop: '1rem', color: '#aaa', fontSize: '0.8rem'}}>New user? Registration will be available soon.</p>
    </div>
  );
}


export default function Home() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && typeof window.initApp === 'function') {
      // Pass the user object from the session to our vanilla JS app
      window.initApp(session.user);
    }
  }, [status, session]);


  if (status === 'loading') {
    return (
      <div id="loadingScreen" className="loading-screen">
        <div className="loader">
          <div className="coin-spinner"></div>
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <LoginPage />;
  }

  return (
    <>
      <Head>
        <title>Coin Games - Earn Websim Credits</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="background-shapes"></div>
      <div id="loadingScreen" className="loading-screen">
        <div className="loader">
          <div className="coin-spinner"></div>
          <p>Loading your coin games...</p>
        </div>
      </div>

      <div id="app" className="app-container" style={{ display: 'none' }}>
        <header className="header">
          <div className="header-content">
            <div className="logo">
              <span className="coin-icon">🪙</span>
              <h1>Coin Games</h1>
            </div>
            <div className="user-info" id="userInfo">
               <button onClick={() => signOut()} style={{ padding: '0.5rem', cursor: 'pointer', background: 'var(--danger-color)', border: 'none', color: 'white', borderRadius: '8px' }}>
                Sign Out
              </button>
              <div className="coin-balance">
                <span className="coin-icon">🪙</span>
                <span id="coinBalance">0</span>
              </div>
              <div className="user-profile" id="userProfile">
                <img id="userAvatar" src={`https://images.websim.com/avatar/${session?.user?.name}`} alt="User Avatar" className="user-avatar" />
                <span id="username">{session?.user?.name}</span>
              </div>
            </div>
          </div>
        </header>

        <nav className="nav-tabs">
          <button className="nav-tab active" data-tab="games">🎮 Games</button>
          <button className="nav-tab" data-tab="leaderboard">🏆 Leaderboard</button>
          <button className="nav-tab" data-tab="credits">💳 Credits</button>
          <button className="nav-tab" data-tab="store">🛍️ Store</button>
          <button className="nav-tab" data-tab="support">❤️ Support</button>
          <button className="nav-tab" data-tab="admin" style={{display: 'none'}}>⚙️ Admin</button>
        </nav>

        <main className="main-content">
          <div id="gamesTab" className="tab-content active">
            <div className="games-grid">
              <div className="game-card" data-game="catch"><div className="game-icon">💰</div><h3>Catch Coins</h3><p>Catch falling coins. This game is endless!</p><div className="game-stats">+0.05 coins per catch</div><button className="play-btn" id="catchBtn">Play Now</button></div>
              <div className="game-card" data-game="snake"><div className="game-icon">🐍💰</div><h3>Coin Snake</h3><p>Collect coins, grow your snake, and don&apos;t hit the walls!</p><div className="game-stats">+1 coin per coin collected</div><button className="play-btn" id="snakeBtn">Play Now</button></div>
              <div className="game-card" data-game="target"><div className="game-icon">🎯</div><h3>Hit Targets</h3><p>Click targets that appear randomly!</p><div className="game-stats">+1 coin per target</div><button className="play-btn" id="targetBtn">Play Now</button></div>
              <div className="game-card" data-game="balloons"><div className="game-icon">🎈</div><h3>Pop Balloons</h3><p>Pop balloons to collect coins inside!</p><div className="game-stats">1-3 coins per balloon</div><button className="play-btn" id="balloonsBtn">Play Now</button></div>
              <div className="game-card" data-game="squares"><div className="game-icon">⬜</div><h3>Catch Squares</h3><p>Click on fast-moving squares!</p><div className="game-stats">1-3 coins per square</div><button className="play-btn" id="squaresBtn">Play Now</button></div>
              <div className="game-card" data-game="clicker"><div className="game-icon">🖱️</div><h3>Click & Win</h3><p>Click to earn coins! Our AI monitors for auto-clickers, so play fair. No cooldown!</p><div className="game-stats">+0.05 coins per click</div><button className="play-btn" id="clickerBtn">Play Now</button></div>
              <div className="game-card" data-game="slot"><div className="game-icon">🎰</div><h3>Coin Slot</h3><p>Bet your coins and spin the reels for a chance to win big! Prizes up to 250x your bet.</p><div className="game-stats">Bet 1-15 coins</div><button className="play-btn" id="slotBtn">Play Now</button></div>
            </div>
          </div>
          <div id="leaderboardTab" className="tab-content"><div className="leaderboard-container"><h2>🏆 Top Players</h2><div className="leaderboard-list" id="leaderboardList"></div></div></div>
          <div id="creditsTab" className="tab-content"><div className="credits-container"><div className="credits-info"><h2>💳 Convert Coins to Credits</h2><div className="conversion-rate"><div className="rate-card"><span className="coin-icon">🪙</span><span className="rate">100 Coins = 25 Websim Credits</span></div></div><div className="tip-info" style={{ background: 'var(--surface-color)', border: '2px solid var(--primary-color)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}><h4 style={{ color: 'var(--primary-color)' }}>Conversion Rules</h4><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Minimum conversion is 100 coins.<br /><strong>🏆 VIP members get an extra 25 credits per conversion!</strong></p></div><div className="conversion-form"><div className="input-group"><label>Coins to Convert:</label><input type="number" id="coinsToConvert" min="100" step="100" placeholder="100" /><span className="conversion-preview" id="conversionPreview">= 0 Credits</span></div><button className="convert-btn" id="convertBtn">Convert Coins</button></div></div><div className="conversion-history"><h3>Conversion History</h3><div className="history-list" id="conversionHistory"></div></div></div></div>
          <div id="storeTab" className="tab-content"></div>
          <div id="supportTab" className="tab-content"></div>
          <div id="adminTab" className="tab-content"></div>
        </main>
      </div>

      <div id="gameModal" className="modal"><div className="modal-content"><div className="modal-header"><h2 id="gameTitle">Game</h2><button className="close-btn" id="closeModal">×</button></div><div className="modal-body" id="gameContainer"></div></div></div>
      <div id="coinEarned" className="coin-earned" style={{ display: 'none' }}><span className="coin-icon">🪙</span><span id="coinsEarnedText">+0</span></div>

      <Script src="/app.js" strategy="lazyOnload" />
      <Script src="/games/catch.js" strategy="lazyOnload" />
      <Script src="/games/snake.js" strategy="lazyOnload" />
      <Script src="/games/target.js" strategy="lazyOnload" />
      <Script src="/games/balloons.js" strategy="lazyOnload" />
      <Script src="/games/squares.js" strategy="lazyOnload" />
      <Script src="/games/clicker.js" strategy="lazyOnload" />
      <Script src="/games/slot.js" strategy="lazyOnload" />
    </>
  );
}
