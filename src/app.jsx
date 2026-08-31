import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BarChart2, Wallet, MessageCircle, Settings, Lock, UserCog, 
  Crown, Factory, Coins, Globe, Bot, Plus, Send, X, Check, 
  Search, LineChart, Store, Clock
} from 'lucide-react';

const PRO_KEYS = [
  "NBL-PRO-A1B2-C3D4", "NBL-PRO-X9Y8-Z7W6", "NBL-PRO-Q1W2-E3R4", "NBL-PRO-T5Y6-U7I8", "NBL-PRO-O9P0-A1S2",
  "NBL-PRO-D3F4-G5H6", "NBL-PRO-J7K8-L9Z0", "NBL-PRO-X1C2-V3B4", "NBL-PRO-N5M6-Q7W8", "NBL-PRO-E9R0-T1Y2"
];

const DISCORD_CLIENT_ID = "1544048974175019058";
// Sostituisci questo con l'indirizzo del tuo bot su Wispbyte (es. http://123.45.67.89:4000)
const BACKEND_URL = "http://localhost:4000"; 

const DEFAULT_STATE = {
  isAuth: false,
  user: { id: '', name: 'Guest', avatar: '', colorName: '#ffffff', colorText: '#cbd5e1', isPro: false },
  portfolio: { cash: 10000.00, holdings: {} },
  keys: { gemini: 'AQ.Ab8RN6KnJrrR0zVGMN5p98cVSuIGocOydqPioO_lSbJK4up1zw' },
  ui: { activeTab: 'markets', activeMarketType: 'stocks', activeAsset: 'SNEB', chartType: 'candle', chartZoom: 60, activeChatRoom: 'global' },
  chatHistory: { global: [], ai: [] },
  customAssets: [],
  gameTime: { hours: 7, minutes: 0 }
};

class MarketAsset {
  constructor(type, ticker, name, basePrice, volatility, sector, mcap, desc, isPro = false) {
    this.type = type; this.ticker = ticker; this.name = name; this.volatility = volatility;
    this.sector = sector; this.mcap = mcap; this.desc = desc; this.isPro = isPro;
    this.history = []; this.currentPrice = basePrice;
    this.initHistory(basePrice);
  }

  initHistory(basePrice) {
    let current = basePrice;
    const now = Date.now();
    for (let i = 80; i >= 0; i--) {
      const ohlc = this._generateTick(current, now - (i * 2000), false);
      this.history.push(ohlc);
      current = ohlc.close;
    }
    this.currentPrice = current;
  }

  _generateTick(openPrice, timestamp, isUserPro) {
    let drift = (this.isPro && isUserPro) ? 0.0005 : -0.0002; 
    let closePrice = openPrice * (1 + drift + (Math.random() - 0.5) * this.volatility);
    if (Math.random() < 0.05) closePrice *= (1 + (Math.random() * this.volatility * 5) * (Math.random() > 0.6 ? 1 : -1)); 
    closePrice = Math.max(0.01, closePrice);
    
    const maxBody = Math.max(openPrice, closePrice); const minBody = Math.min(openPrice, closePrice);
    const high = maxBody * (1 + Math.random() * (this.volatility * 0.5));
    const low = Math.min(minBody, minBody * (1 - Math.random() * (this.volatility * 0.5)));
    return { time: timestamp, open: openPrice, high: high, low: low, close: closePrice };
  }

  tick(gameHours, isUserPro) {
    if (this.type === 'stocks' && (gameHours < 9 || gameHours >= 18)) return; 
    const lastCandle = this.history[this.history.length - 1];
    const newCandle = this._generateTick(lastCandle.close, Date.now(), isUserPro);
    this.history.push(newCandle);
    if (this.history.length > 100) this.history.shift(); 
    this.currentPrice = newCandle.close;
  }
}

export default function App() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tick, setTick] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [discordModal, setDiscordModal] = useState({ open: false, type: '' });
  const [tradeQty, setTradeQty] = useState(1);
  const [chatInput, setChatInput] = useState('');
  
  const chartCanvasRef = useRef(null);
  const chatScrollRef = useRef(null);
  const assetsRef = useRef({});

  useEffect(() => {
    assetsRef.current = {
      'SNEB': new MarketAsset('stocks', 'SNEB', 'Studio Nebula', 150.0, 0.015, 'Tech', '$2.5B', 'Design AI e sviluppo.'),
      'SHPX': new MarketAsset('stocks', 'SHPX', 'Shoppix', 45.0, 0.03, 'E-Commerce', '$800M', 'Retail droni.'),
      'CAST': new MarketAsset('stocks', 'CAST', 'Castro architectury', 85.0, 0.01, 'Real Estate', '$1.2B', 'Zero emissioni.'),
      'MINE': new MarketAsset('stocks', 'MINE', 'Minemarket', 12.0, 0.05, 'Estrazione', '$350M', 'Attrezzature da miniera.'),
      'ROMS': new MarketAsset('stocks', 'ROMS', 'Romea Servizi', 120.0, 0.005, 'Pubblico', '$5.1B', 'Utilities.'),
      'GCRD': new MarketAsset('stocks', 'GCRD', 'Garda credits', 30.0, 0.02, 'Finanza', '$600M', 'Recupero crediti.'),
      'MRCH': new MarketAsset('stocks', 'MRCH', 'Marchetti', 200.0, 0.01, 'Lusso', '$4.8B', 'Holding moda.'),
      'CGOV': new MarketAsset('stocks', 'CGOV', 'Corruzione governo', 5.0, 0.08, 'Rischi', '$?B', 'Asset volatile politico.'),
      'ESTI': new MarketAsset('crypto', 'ESTI', 'EsticazziCoin', 0.05, 0.1, 'Meme', '$40M', 'Disinteresse globale.'),
      'BTC': new MarketAsset('crypto', 'BTC', 'Bitcoin', 65000.0, 0.005, 'Crypto', '$1.2T', 'Oro digitale.'),
      'ETH': new MarketAsset('crypto', 'ETH', 'Ethereum', 3500.0, 0.008, 'Crypto', '$400B', 'Infrastruttura Web3.', true)
    };

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const saved = localStorage.getItem('nebulaState');
    let loadedState = DEFAULT_STATE;
    if (saved) { try { loadedState = JSON.parse(saved); } catch (e) {} }

    if (code) {
      const redirectUri = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, window.location.pathname);
      fetch(`${BACKEND_URL}/api/auth/discord`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri })
      }).then(res => res.json()).then(data => {
        if (data.user) {
          setState(prev => ({ ...prev, isAuth: true, user: { ...prev.user, ...data.user }, portfolio: { ...prev.portfolio, cash: data.cash } }));
          showToast(`Accesso effettuato: ${data.user.name}`, 'success');
        }
      }).catch(() => showToast('Errore server', 'error')).finally(() => setIsLoaded(true));
    } else {
      setState(loadedState);
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('nebulaState', JSON.stringify(state));
  }, [state, isLoaded]);

  useEffect(() => {
    if (!isLoaded || !state.isAuth) return;
    const intervalId = setInterval(() => {
      setState(prev => {
        const next = { ...prev };
        next.gameTime = { ...next.gameTime }; next.gameTime.minutes++;
        if (next.gameTime.minutes >= 60) { next.gameTime.minutes = 0; next.gameTime.hours++; if (next.gameTime.hours >= 24) next.gameTime.hours = 0; }
        return next;
      });
      Object.values(assetsRef.current).forEach(asset => asset.tick(state.gameTime.hours, state.user.isPro));
      setTick(t => t + 1);
    }, 1750);
    return () => clearInterval(intervalId);
  }, [isLoaded, state.isAuth, state.gameTime.hours, state.user.isPro]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [state.chatHistory, state.ui.activeChatRoom, state.ui.activeTab]);

  const showToast = (msg, type = 'info') => {
    const id = Date.now(); setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const formatCurrency = (num, compact = false) => {
    if(compact && num > 1e6) return '$' + (num/1e6).toFixed(1) + 'M';
    return '$' + Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const activeAssetObj = assetsRef.current[state.ui.activeAsset] || assetsRef.current['SNEB'];

  const syncBalanceWithBackend = (newCash) => {
    if (!state.user.id) return;
    fetch(`${BACKEND_URL}/api/account/sync-balance`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId: state.user.id, cash: newCash })
    }).catch(() => {});
  };

  const executeOrder = (type) => {
    const qty = parseInt(tradeQty);
    const asset = activeAssetObj;
    if (asset.type === 'stocks' && (state.gameTime.hours < 9 || state.gameTime.hours >= 18)) return showToast("Mercato chiuso.", 'error');
    if (isNaN(qty) || qty <= 0) return showToast("Quantità non valida.", 'error');
    const totalValue = qty * asset.currentPrice;

    setState(prev => {
      const next = { ...prev };
      next.portfolio = { ...next.portfolio, holdings: { ...next.portfolio.holdings } };
      if (type === 'BUY') {
        if (next.portfolio.cash < totalValue) { showToast("Fondi insufficienti.", 'error'); return prev; }
        next.portfolio.cash -= totalValue;
        if (!next.portfolio.holdings[asset.ticker]) next.portfolio.holdings[asset.ticker] = { shares: 0, avgPrice: 0 };
        const h = next.portfolio.holdings[asset.ticker];
        h.avgPrice = ((h.shares * h.avgPrice) + totalValue) / (h.shares + qty);
        h.shares += qty;
        syncBalanceWithBackend(next.portfolio.cash);
        showToast(`Comprati ${qty} ${asset.ticker}`, 'success');
      } else if (type === 'SELL') {
        const owned = next.portfolio.holdings[asset.ticker]?.shares || 0;
        if (owned < qty) { showToast(`Possiedi solo ${owned} ${asset.ticker}`, 'error'); return prev; }
        next.portfolio.cash += totalValue;
        next.portfolio.holdings[asset.ticker].shares -= qty;
        if (next.portfolio.holdings[asset.ticker].shares === 0) delete next.portfolio.holdings[asset.ticker];
        syncBalanceWithBackend(next.portfolio.cash);
        showToast(`Venduti ${qty} ${asset.ticker}`, 'success');
      }
      return next;
    });
  };

  useEffect(() => {
    if (state.ui.activeTab !== 'markets' || !chartCanvasRef.current) return;
    const ctx = chartCanvasRef.current.getContext('2d');
    const rect = chartCanvasRef.current.parentElement.getBoundingClientRect();
    chartCanvasRef.current.width = rect.width; chartCanvasRef.current.height = rect.height;
    ctx.clearRect(0, 0, rect.width, rect.height);
    const data = activeAssetObj.history.slice(-state.ui.chartZoom);
    if(data.length === 0) return; 

    let minP = Math.min(...data.map(d => d.low)), maxP = Math.max(...data.map(d => d.high));
    const range = (maxP - minP) || 1; minP -= range * 0.1; maxP += range * 0.1;
    const finalRange = maxP - minP || 1;
    const plotW = rect.width - 70, plotH = rect.height - 40, stepX = plotW / Math.max(1, (data.length - 1));
    
    ctx.fillStyle = '#475569'; ctx.font = '10px monospace';
    for(let i=0; i<=4; i++) ctx.fillText(formatCurrency(maxP - (finalRange/4)*i, true), rect.width - 55, 20 + (plotH/4)*i + 4);

    if (state.ui.chartType === 'candle') {
      const candleWidth = Math.max(2, (plotW / data.length) * 0.7);
      data.forEach((d, i) => {
        const x = 10 + (i * stepX), yO = 20 + plotH - ((d.open - minP) / finalRange) * plotH, yC = 20 + plotH - ((d.close - minP) / finalRange) * plotH;
        const yH = 20 + plotH - ((d.high - minP) / finalRange) * plotH, yL = 20 + plotH - ((d.low - minP) / finalRange) * plotH;
        ctx.strokeStyle = ctx.fillStyle = d.close >= d.open ? '#10b981' : '#f43f5e';
        ctx.beginPath(); ctx.lineWidth = 1; ctx.moveTo(x, yH); ctx.lineTo(x, yL); ctx.stroke();
        ctx.fillRect(x - candleWidth/2, Math.min(yO, yC), candleWidth, Math.max(1, Math.abs(yO - yC)));
      });
    } else {
      ctx.beginPath(); ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 2;
      data.forEach((d, i) => {
        const x = 10 + (i * stepX), yC = 20 + plotH - ((d.close - minP) / finalRange) * plotH;
        if (i === 0) ctx.moveTo(x, yC); else ctx.lineTo(x, yC);
      });
      ctx.stroke();
    }
  }, [tick, state.ui.activeTab, state.ui.activeAsset, state.ui.chartType, state.ui.chartZoom]);

  const handleChartZoom = (e) => {
    e.preventDefault();
    setState(p => ({ ...p, ui: { ...p.ui, chartZoom: Math.max(15, Math.min(100, p.ui.chartZoom + (e.deltaY < 0 ? -5 : 5))) } }));
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const room = state.ui.activeChatRoom;
    const msg = { sender: state.user.name, text: chatInput, color: state.user.colorName, textCol: state.user.colorText, time: new Date().toLocaleTimeString().slice(0,5) };
    setChatInput('');
    setState(prev => ({ ...prev, chatHistory: { ...prev.chatHistory, [room]: [...(prev.chatHistory[room]||[]), msg] } }));

    if (room === 'ai') {
      if(!state.user.isPro) return showSystemMsg('ai', 'Devi essere PRO per usare Nebula Gemini.');
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.keys.gemini}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: `Sei Nebula AI. Rispondi in italiano al messaggio in modo breve e tecnico.\nUtente: ${chatInput}` }] }] })
        });
        const data = await res.json();
        if(data.candidates) {
          setState(prev => ({ ...prev, chatHistory: { ...prev.chatHistory, ai: [...prev.chatHistory.ai, { sender: 'Nebula Gemini', text: data.candidates[0].content.parts[0].text, color: '#06b6d4', textCol: '#e2e8f0', time: new Date().toLocaleTimeString().slice(0,5), isBot: true }] } }));
        }
      } catch(err) { showSystemMsg('ai', 'Errore connessione Gemini.'); }
    }
  };

  const showSystemMsg = (room, text) => {
    setState(prev => ({ ...prev, chatHistory: { ...prev.chatHistory, [room]: [...(prev.chatHistory[room]||[]), { sender: 'System', text, color: '#ef4444', textCol: '#ef4444', time: new Date().toLocaleTimeString().slice(0,5), isBot: true }] } }));
  };

  const executeDiscordTransaction = async () => {
    const amount = parseFloat(document.getElementById('dm-amount').value);
    if(isNaN(amount) || amount <= 0) return showToast("Importo non valido.", "error");
    try {
      const res = await fetch(`${BACKEND_URL}/api/transactions/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId: state.user.id, type: discordModal.type, amount: amount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      showToast(`Richiesta inviata. Attendi l'approvazione dello staff.`, "success");
      setDiscordModal({ open: false, type: '' });
    } catch (err) { showToast(err.message, "error"); }
  };

  const loginWithDiscord = () => {
    const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
    window.location.href = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&scope=identify%20guilds`;
  };

  if (!isLoaded) return <div className="h-screen w-screen bg-nebula-950 text-white flex items-center justify-center">Loading Data...</div>;

  if (!state.isAuth) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-nebula-950">
        <div className="bg-nebula-900/70 border border-nebula-border backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
          <MessageCircle className="w-16 h-16 text-cyan-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Nebula Terminal</h1>
          <p className="text-slate-400 mt-2 text-sm mb-6">Autenticazione Rete Bancaria</p>
          <button onClick={loginWithDiscord} className="w-full flex items-center justify-center space-x-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3 px-4 rounded-xl transition-all">
            <MessageCircle className="w-5 h-5" /><span>Accedi con Discord</span>
          </button>
        </div>
      </div>
    );
  }

  const actHoldings = state.portfolio.holdings[activeAssetObj.ticker];
  const actShares = actHoldings ? actHoldings.shares : 0;
  let totalStockVal = 0; Object.keys(state.portfolio.holdings).forEach(t => { if(assetsRef.current[t]) totalStockVal += state.portfolio.holdings[t].shares * assetsRef.current[t].currentPrice; });

  return (
    <div className="h-screen w-screen flex flex-col text-sm antialiased bg-nebula-950 text-e2e8f0 font-sans">
      <header className="h-14 bg-nebula-900 border-b border-nebula-border flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center space-x-4">
          <div className="font-black text-white text-lg tracking-wider hidden sm:block">NEBULA</div>
          <div className="h-4 w-px bg-nebula-700 hidden sm:block"></div>
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span className={`w-2 h-2 rounded-full ${(state.gameTime.hours >= 9 && state.gameTime.hours < 18) ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <span>{(state.gameTime.hours >= 9 && state.gameTime.hours < 18) ? 'MARKET OPEN' : 'CLOSED'}</span>
          </div>
          <div className="h-4 w-px bg-nebula-700 hidden sm:block"></div>
          <div className="hidden sm:flex items-center space-x-2 text-sm font-mono font-bold text-cyan-400">
            <Clock className="w-4 h-4" /><span>{String(state.gameTime.hours).padStart(2, '0')}:{String(state.gameTime.minutes).padStart(2, '0')}</span>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-right hidden md:block">
            <div className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Patrimonio</div>
            <div className="font-mono font-bold text-white">{formatCurrency(state.portfolio.cash + totalStockVal)}</div>
          </div>
          <div className="flex items-center space-x-3 border-l border-nebula-border pl-6 cursor-pointer" onClick={() => setState(p => ({...p, ui: {...p.ui, activeTab: 'settings'}}))}>
            <div className="text-right"><div className="text-sm font-semibold text-white">{state.user.name}</div><div className={`text-[10px] font-mono font-bold ${state.user.isPro ? 'text-amber-500' : 'text-cyan-400'}`}>{state.user.isPro ? 'PRO MEMBER' : 'STANDARD'}</div></div>
            <img src={state.user.avatar || `https://ui-avatars.com/api/?name=${state.user.name}`} className="w-8 h-8 rounded-full border border-nebula-border bg-nebula-800" alt="Avatar" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-16 md:w-64 bg-nebula-900 border-r border-nebula-border flex flex-col justify-between shrink-0 z-10">
          <div className="py-4 flex flex-col space-y-1">
            {[{ id: 'markets', icon: LineChart, label: 'Trading Desk' }, { id: 'portfolio', icon: Wallet, label: 'Portafoglio' }, { id: 'chat', icon: MessageCircle, label: 'Comunicazioni' }, { id: 'settings', icon: Settings, label: 'Impostazioni' }].map(nav => (
              <button key={nav.id} onClick={() => setState(p => ({...p, ui: {...p.ui, activeTab: nav.id}}))} className={`w-full flex items-center space-x-3 px-4 md:px-6 py-3 border-r-2 transition-colors ${state.ui.activeTab === nav.id ? 'text-white bg-nebula-800 border-cyan-500' : 'text-slate-400 hover:text-white hover:bg-nebula-800 border-transparent'}`}>
                <nav.icon className="w-5 h-5 text-center" /><span className="hidden md:block font-medium text-sm">{nav.label}</span>
              </button>
            ))}
          </div>
          <div className="p-4 flex justify-center md:justify-start">
            <button onClick={() => { if (prompt("Password:") === "Diegoègay") { setState(prev => ({...prev, ui: {...prev.ui, activeTab: 'admin'}})); showToast("Dev Mode", "success"); } }} className="text-nebula-700 hover:text-slate-500"><Lock className="w-4 h-4" /></button>
          </div>
        </nav>

        <main className="flex-1 bg-nebula-950 overflow-hidden relative">
          
          <div className={`h-full flex-col md:flex-row w-full ${state.ui.activeTab === 'markets' ? 'flex' : 'hidden'}`}>
            <div className="w-full md:w-80 border-r border-nebula-border bg-nebula-900 flex flex-col shrink-0">
              <div className="flex border-b border-nebula-border">
                <button onClick={() => setState(p => ({...p, ui: {...p.ui, activeMarketType: 'stocks'}}))} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${state.ui.activeMarketType === 'stocks' ? 'text-white border-cyan-500' : 'text-slate-500 border-transparent'}`}>Azioni</button>
                <button onClick={() => setState(p => ({...p, ui: {...p.ui, activeMarketType: 'crypto'}}))} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${state.ui.activeMarketType === 'crypto' ? 'text-white border-cyan-500' : 'text-slate-500 border-transparent'}`}>Crypto</button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
                {Object.values(assetsRef.current).filter(a => a.type === state.ui.activeMarketType).map(asset => (
                  <div key={asset.ticker} onClick={() => setState(p => ({...p, ui: {...p.ui, activeAsset: asset.ticker}}))} className={`cursor-pointer p-3 rounded-lg border flex justify-between items-center ${asset.ticker === state.ui.activeAsset ? 'bg-nebula-800 border-nebula-700' : 'border-transparent hover:bg-nebula-800/50'}`}>
                    <div>
                      <div className="font-bold text-white text-sm flex items-center space-x-2"><span>{asset.ticker}</span>{asset.isPro && <span className="bg-amber-500 text-white text-[8px] px-1 rounded">PRO</span>}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{asset.name}</div>
                    </div>
                    <div className="text-sm font-semibold text-white font-mono">{formatCurrency(asset.currentPrice)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scroll">
              <div className="p-4 md:p-6 border-b border-nebula-border flex justify-between items-start bg-nebula-900/50">
                <div className="flex flex-col">
                  <div className="flex items-center space-x-3 mb-1"><h2 className="text-2xl font-bold text-white">{activeAssetObj.name}</h2><span className="bg-nebula-800 text-cyan-400 px-2 py-0.5 rounded text-xs font-mono font-bold">{activeAssetObj.ticker}</span></div>
                  <div className="mt-2 text-xs text-slate-500 max-w-xl">{activeAssetObj.desc}</div>
                </div>
                <div className="text-right shrink-0"><div className="text-3xl font-mono font-black text-white">{formatCurrency(activeAssetObj.currentPrice)}</div></div>
              </div>
              <div className="p-4 md:p-6 border-b border-nebula-border bg-[#05070f] relative">
                <div className="absolute top-6 right-6 z-10 flex space-x-2 bg-nebula-900 p-1 rounded-lg border border-nebula-border">
                  <button onClick={() => setState(p => ({...p, ui: {...p.ui, chartType: 'candle'}}))} className={`px-3 py-1 rounded text-xs font-bold ${state.ui.chartType === 'candle' ? 'bg-nebula-700 text-white' : 'text-slate-400'}`}><BarChart2 className="w-4 h-4"/></button>
                  <button onClick={() => setState(p => ({...p, ui: {...p.ui, chartType: 'line'}}))} className={`px-3 py-1 rounded text-xs font-bold ${state.ui.chartType === 'line' ? 'bg-nebula-700 text-white' : 'text-slate-400'}`}><LineChart className="w-4 h-4"/></button>
                </div>
                <div className="relative w-full h-[350px] border border-nebula-border rounded-xl bg-nebula-950 overflow-hidden" onWheel={handleChartZoom}><canvas ref={chartCanvasRef} className="absolute inset-0 w-full h-full"></canvas></div>
              </div>
              <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-nebula-950 flex-1">
                <div className="bg-nebula-900/40 p-5 rounded-xl border border-nebula-border relative overflow-hidden">
                  {(activeAssetObj.type === 'stocks' && (state.gameTime.hours < 9 || state.gameTime.hours >= 18)) && (
                    <div className="absolute inset-0 bg-nebula-950/80 z-10 flex flex-col items-center justify-center"><Store className="w-10 h-10 text-rose-500 mb-2" /><span className="text-rose-400 font-bold">Chiuso</span></div>
                  )}
                  <div className="flex justify-between items-center mb-4 text-xs font-mono"><span className="text-slate-400 uppercase">Cassa:</span><span className="text-white font-bold">{formatCurrency(state.portfolio.cash)}</span></div>
                  <div className="mb-4"><input type="number" value={tradeQty} min="1" onChange={(e) => setTradeQty(e.target.value)} className="w-full bg-nebula-900 border border-nebula-border rounded-xl px-4 py-3 font-mono text-white text-lg font-bold" /></div>
                  <div className="flex justify-between items-center font-mono text-sm mb-6 pb-4 border-b border-nebula-border"><span className="text-slate-400">Controvalore:</span><span className="font-bold text-white">{formatCurrency((parseInt(tradeQty)||0) * activeAssetObj.currentPrice)}</span></div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => executeOrder('BUY')} className="py-3 bg-emerald-600 text-white rounded-xl font-bold uppercase">Compra</button>
                    <button onClick={() => executeOrder('SELL')} className="py-3 bg-rose-600 text-white rounded-xl font-bold uppercase">Vendi</button>
                  </div>
                </div>
                <div className="bg-nebula-900/40 p-5 rounded-xl border border-nebula-border">
                  <h3 className="text-sm font-semibold text-white mb-4">Posizione</h3>
                  <div className="space-y-4 font-mono text-sm">
                    <div className="flex justify-between border-b border-nebula-border pb-2"><span className="text-slate-400">Posseduti</span><span className="text-white font-bold">{actShares}</span></div>
                    <div className="flex justify-between border-b border-nebula-border pb-2"><span className="text-slate-400">Prezzo Medio</span><span className="text-white">{actShares > 0 ? formatCurrency(actHoldings.avgPrice) : '$0.00'}</span></div>
                    <div className="flex justify-between pt-2"><span className="text-slate-400">P&L</span><span className={`font-bold ${actShares > 0 && (activeAssetObj.currentPrice - actHoldings.avgPrice) * actShares >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{actShares > 0 ? formatCurrency((activeAssetObj.currentPrice - actHoldings.avgPrice) * actShares) : '$0.00'}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${state.ui.activeTab === 'portfolio' ? 'flex' : 'hidden'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Mio Portafoglio</h2>
              <div className="space-x-2 flex">
                <button onClick={() => setDiscordModal({open: true, type: 'DEPOSIT'})} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">Deposita</button>
                <button onClick={() => setDiscordModal({open: true, type: 'WITHDRAW'})} className="px-4 py-2 bg-nebula-800 text-white border border-nebula-border rounded-lg text-sm font-bold">Preleva</button>
              </div>
            </div>
            <div className="bg-nebula-900/40 rounded-xl overflow-hidden border border-nebula-border">
              <table className="w-full text-left font-mono text-xs md:text-sm">
                <thead><tr className="bg-nebula-900 border-b border-nebula-border text-slate-400 uppercase"><th className="p-4">Asset</th><th className="p-4">Qty</th><th className="p-4">PMD</th><th className="p-4">Attuale</th><th className="p-4">P&L</th><th className="p-4 text-right">Azione</th></tr></thead>
                <tbody className="divide-y divide-nebula-border text-slate-200">
                  {Object.keys(state.portfolio.holdings).map(ticker => {
                    const h = state.portfolio.holdings[ticker], asset = assetsRef.current[ticker]; if(!asset) return null;
                    const pnl = (h.shares * asset.currentPrice) - (h.shares * h.avgPrice);
                    return (
                      <tr key={ticker} className="hover:bg-nebula-900/50">
                        <td className="p-4 font-bold text-white">{asset.ticker}</td><td className="p-4">{h.shares}</td><td className="p-4 text-slate-400">{formatCurrency(h.avgPrice)}</td><td className="p-4 text-white">{formatCurrency(asset.currentPrice)}</td>
                        <td className={`p-4 font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}</td>
                        <td className="p-4 text-right"><button onClick={() => {
                            if (asset.type === 'stocks' && (state.gameTime.hours < 9 || state.gameTime.hours >= 18)) return showToast("Chiuso.", 'error');
                            setState(prev => { const next = {...prev, portfolio: {...prev.portfolio, holdings: {...prev.portfolio.holdings}}}; next.portfolio.cash += h.shares * asset.currentPrice; delete next.portfolio.holdings[ticker]; syncBalanceWithBackend(next.portfolio.cash); return next; });
                        }} className="text-xs bg-rose-600/20 text-rose-400 px-3 py-1 rounded">Vendi Tutto</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`h-full flex-col md:flex-row w-full ${state.ui.activeTab === 'chat' ? 'flex' : 'hidden'}`}>
            <div className="w-full md:w-64 border-r border-nebula-border bg-nebula-900 flex flex-col shrink-0">
              <div className="p-4 border-b border-nebula-border text-xs font-bold uppercase text-slate-500">Canali</div>
              <div className="p-2 space-y-1">
                <button onClick={() => setState(p => ({...p, ui: {...p.ui, activeChatRoom: 'global'}}))} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${state.ui.activeChatRoom === 'global' ? 'bg-nebula-800 text-white' : 'text-slate-400 hover:bg-nebula-800'}`}><Globe className="w-4 h-4" /><span>Global Room</span></button>
                <button onClick={() => setState(p => ({...p, ui: {...p.ui, activeChatRoom: 'ai'}}))} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${state.ui.activeChatRoom === 'ai' ? 'bg-nebula-800 text-white' : 'text-slate-400 hover:bg-nebula-800'}`}><Bot className="w-4 h-4 text-cyan-400" /><span>Nebula Gemini</span>{!state.user.isPro && <Lock className="w-3 h-3 ml-1" />}</button>
              </div>
            </div>
            <div className="flex-1 flex flex-col bg-nebula-950 relative">
              <div className="p-4 border-b border-nebula-border bg-nebula-900"><h3 className="font-bold text-white">#{state.ui.activeChatRoom}</h3></div>
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {(state.chatHistory[state.ui.activeChatRoom] || []).map((m, idx) => (
                  <div key={idx} className="flex flex-col space-y-1 mb-2">
                    <div className="flex items-baseline space-x-2">{m.isBot && <Bot className="w-3 h-3 text-cyan-400" />}<span className="text-xs font-bold" style={{color: m.color}}>{m.sender}</span><span className="text-[10px] text-slate-500">{m.time}</span></div>
                    <div className="text-sm p-2 rounded-lg bg-nebula-800/50" style={{color: m.textCol}}>{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-nebula-900 border-t border-nebula-border">
                <form onSubmit={sendMessage} className="relative">
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Scrivi..." className="w-full bg-nebula-950 border border-nebula-border rounded-xl pl-4 pr-12 py-3 text-white focus:outline-none" />
                  <button type="submit" className="absolute right-2 top-2 bottom-2 w-10 bg-cyan-600 text-white rounded-lg flex items-center justify-center"><Send className="w-4 h-4" /></button>
                </form>
              </div>
            </div>
          </div>

          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${state.ui.activeTab === 'settings' ? 'flex' : 'hidden'}`}>
            <h2 className="text-2xl font-bold text-white mb-6">Impostazioni</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
              <div className="bg-nebula-900/40 p-6 border border-nebula-border rounded-xl">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-nebula-border pb-2">Profilo Discord</h3>
                <label className="block text-xs text-slate-400 mb-1">ID</label><input type="text" disabled value={state.user.id} className="w-full bg-nebula-950/50 border border-nebula-border rounded-lg px-3 py-2 text-slate-400 font-mono mb-4" />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-slate-400 mb-1">Colore Nome</label><input type="color" value={state.user.colorName} onChange={e => setState(p => ({...p, user: {...p.user, colorName: e.target.value}}))} className="h-8 w-full rounded bg-transparent border border-nebula-border" /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Colore Testo</label><input type="color" value={state.user.colorText} onChange={e => setState(p => ({...p, user: {...p.user, colorText: e.target.value}}))} className="h-8 w-full rounded bg-transparent border border-nebula-border" /></div>
                </div>
              </div>
              <div className="bg-nebula-900/40 p-6 border border-amber-500/30 md:col-span-2 relative rounded-xl">
                <h3 className="text-lg font-bold text-amber-500 mb-2 flex items-center"><Crown className="w-5 h-5 mr-2"/> Attivazione PRO</h3>
                <p className="text-xs text-slate-400 mb-4">Sblocca IA e vantaggi algoritmici. (Es. NBL-PRO-A1B2-C3D4)</p>
                <div className="flex space-x-2">
                  <input type="text" id="pro-key-input" placeholder="XXXX-XXXX" className="flex-1 bg-nebula-950 border border-amber-500/50 rounded-lg px-4 py-2 text-white font-mono uppercase" />
                  <button onClick={() => {
                    const val = document.getElementById('pro-key-input').value.trim().toUpperCase();
                    if(PRO_KEYS.includes(val)) {
                      setState(p => ({...p, user: {...p.user, isPro: true}}));
                      fetch(`${BACKEND_URL}/api/account/activate-pro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discordId: state.user.id }) }).catch(()=>{});
                      showToast("Licenza PRO attivata!", "success");
                    } else showToast("Chiave errata.", "error");
                  }} className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-500 text-white font-bold rounded-lg">Riscatta</button>
                </div>
              </div>
            </div>
          </div>

          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${state.ui.activeTab === 'admin' ? 'flex' : 'hidden'}`}>
            <h2 className="text-2xl font-black text-rose-500 mb-6 flex items-center"><UserCog className="w-6 h-6 mr-3" /> Dev / Admin</h2>
            <div className="bg-nebula-900/40 p-6 border border-rose-900/50 rounded-xl">
              <h3 className="text-lg font-bold text-white mb-4">Forza Saldo DB</h3>
              <input type="number" id="dev-db-cash" defaultValue={state.portfolio.cash} className="bg-nebula-900 border border-nebula-border rounded px-2 py-1 text-white font-mono w-32" />
              <button onClick={() => { const c = parseFloat(document.getElementById('dev-db-cash').value); if(!isNaN(c)) { setState(p => ({...p, portfolio: {...p.portfolio, cash: c}})); syncBalanceWithBackend(c); showToast("Aggiornato", "success"); } }} className="ml-4 py-1 px-4 bg-slate-700 text-white font-bold rounded">Aggiorna</button>
            </div>
          </div>

        </main>
      </div>

      {discordModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-nebula-900/90 border border-cyan-500/50 rounded-2xl max-w-sm w-full p-6 relative">
            <button onClick={() => setDiscordModal({open: false, type: ''})} className="absolute top-4 right-4 text-slate-400"><X className="w-5 h-5"/></button>
            <div className="text-center mb-6"><MessageCircle className="w-10 h-10 text-[#5865F2] mx-auto mb-2" /><h3 className="text-xl font-bold text-white">{discordModal.type === 'DEPOSIT' ? 'Deposito' : 'Prelievo'}</h3></div>
            <input type="number" id="dm-amount" defaultValue="1000" min="1" className="w-full bg-nebula-950 border border-nebula-border rounded-lg py-3 px-4 text-white font-mono font-bold text-lg mb-4" />
            <button onClick={executeDiscordTransaction} className="w-full py-3 bg-[#5865F2] text-white rounded-lg font-bold">Conferma su Discord</button>
          </div>
        </div>
      )}

      <div className="fixed bottom-5 right-5 z-[70] flex flex-col space-y-3 pointer-events-none w-80">
        {toasts.map(t => (
          <div key={t.id} className={`bg-nebula-900/80 p-3 rounded-xl flex items-center space-x-3 border-l-4 ${t.type === 'success' ? 'border-emerald-500' : t.type === 'error' ? 'border-rose-500' : 'border-cyan-500'}`}>
            {t.type === 'success' ? <Check className="w-4 h-4 text-emerald-400"/> : <X className="w-4 h-4 text-rose-400"/>}
            <span className="text-white text-xs font-bold">{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}