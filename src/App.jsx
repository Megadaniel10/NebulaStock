import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart2, Wallet, MessageCircle, Settings, Lock, UserCog, 
  Crown, Factory, Coins, Globe, Bot, Plus, Send, X, Check, 
  LineChart, Store, Clock, Users, Building, Percent, Search,
  Eye, LogOut, Image, Zap, Skull
} from 'lucide-react';
import { io } from 'socket.io-client';

const DISCORD_CLIENT_ID = "1544048974175019058";
// METTI QUI IL LINK DEL TUO BACKEND SU RENDER:
const BACKEND_URL = "https://nebulastock-backend.onrender.com"; 

const OPENAI_KEY = "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";

let socket;

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [user, setUser] = useState({ id: '', name: '', avatar: '', colorName: '#ffffff', colorText: '#cbd5e1', isPro: false, isProMax: false, isDarkWeb: false, bgImage: '' });
  const [portfolio, setPortfolio] = useState({ cash: 0, holdings: {} });
  
  const [assets, setAssets] = useState({});
  const [gameTime, setGameTime] = useState({ hours: 9, minutes: 0 });
  const [chatHistory, setChatHistory] = useState({ global: [], ai: [] });
  const [dmRooms, setDmRooms] = useState([]);
  
  const [ui, setUi] = useState({ activeTab: 'markets', activeMarketType: 'stocks', activeAsset: 'SNEB', chartType: 'candle', chartZoom: 60, activeChatRoom: 'global' });
  const [tradeQty, setTradeQty] = useState(1);
  const [chatInput, setChatInput] = useState('');
  const [toasts, setToasts] = useState([]);
  const [resizeTrigger, setResizeTrigger] = useState(0); // Serve per ridisegnare il grafico al resize
  
  // FIX: Due riferimenti separati per i due grafici
  const marketCanvasRef = useRef(null);
  const darkCanvasRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Resize Listener per grafici responsivi
  useEffect(() => {
    const handleResize = () => setResizeTrigger(r => r + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Init Socket e Login Discord
  useEffect(() => {
    socket = io(BACKEND_URL);

    socket.on('market_init', (data) => {
      setAssets(data.assets);
      setGameTime(data.gameTime);
      setChatHistory(prev => ({ ...prev, global: data.chat.global || [] }));
    });

    socket.on('market_update', (data) => {
      setAssets(data.assets);
      setGameTime(data.gameTime);
    });

    socket.on('account_update', (acc) => {
      setUser(prev => ({ ...prev, ...acc }));
      setPortfolio({ cash: acc.cash, holdings: acc.holdings });
      setIsAuth(true);
    });

    socket.on('chat_update', ({ room, chat }) => {
      setChatHistory(prev => ({ ...prev, [room]: chat }));
    });

    socket.on('toast', ({ msg, type }) => showToast(msg, type));

    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get('access_token');

    if (accessToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
      fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(res => res.json()).then(u => {
        if (u.id) {
          socket.emit('user_login', { id: u.id, name: u.username, avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : '' });
        }
      });
    }

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatHistory, ui.activeChatRoom]);

  const showToast = (msg, type = 'info') => {
    const id = Date.now(); setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const formatCurrency = (num, compact = false) => {
    if(compact && num >= 1e9) return '€' + (num/1e9).toFixed(1) + 'B';
    if(compact && num >= 1e6) return '€' + (num/1e6).toFixed(1) + 'M';
    if(compact && num <= -1e12) return '-€' + (Math.abs(num)/1e12).toFixed(1) + 'T';
    if(compact && num >= 1e3) return '€' + (num/1e3).toFixed(1) + 'K';
    return '€' + Number(num).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const executeOrder = (type) => {
    socket.emit('execute_trade', { userId: user.id, type, ticker: ui.activeAsset, qty: parseInt(tradeQty) });
  };

  const buyTier = (tier, price) => {
    socket.emit('buy_tier', { userId: user.id, tier, price });
  };

  // ChatBot (OpenAI) e Chat Globale
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const room = ui.activeChatRoom;
    const msgObj = { sender: user.name, text: chatInput, color: user.colorName, textCol: user.colorText, time: new Date().toLocaleTimeString().slice(0,5) };
    
    if (room === 'ai') {
      if(!user.isPro && !user.isProMax) return showToast('Devi essere PRO o PRO MAX per Nebula AI.', 'error');
      
      setChatHistory(p => ({ ...p, ai: [...(p.ai || []), msgObj] }));
      setChatInput('');

      let systemPrompt = "Sei Nebula AI, analista senior. Fornisci responsi professionali in italiano.";
      if (user.isProMax) systemPrompt = "Sei Nebula OMNISCIENT, intelligenza quantistica dal futuro. Fornisci analisi lunghe, super dettagliate e iper-tecnologiche.";

      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
          body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: msgObj.text }] })
        });
        const data = await res.json();
        if(data.choices) {
          const aiMsg = { sender: user.isProMax ? 'Nebula OMNISCIENT' : 'Nebula AI', text: data.choices[0].message.content, color: user.isProMax ? '#a855f7' : '#06b6d4', textCol: '#e2e8f0', time: new Date().toLocaleTimeString().slice(0,5), isBot: true };
          setChatHistory(p => ({ ...p, ai: [...p.ai, aiMsg] }));
        } else if (data.error) {
          showToast(`Errore OpenAI: ${data.error.message}`, 'error');
        }
      } catch(err) { showToast('Errore di rete OpenAI.', 'error'); }
    } else {
      socket.emit('send_message', { room, msg: msgObj });
      setChatInput('');
    }
  };

  const createPrivateChat = () => {
    const uname = prompt("Inserisci nametag Discord (es. Nome#1234):");
    if(uname && uname.trim() !== '') {
      const roomKey = `dm-${uname.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      setDmRooms(p => p.find(r => r.id === roomKey) ? p : [...p, { id: roomKey, display: uname }]);
      setUi(p => ({ ...p, activeChatRoom: roomKey }));
    }
  };

  // Rendering Grafici (Fix: Selezione del Canvas corretto per evitare larghezza a 0)
  const activeAssetObj = assets[ui.activeAsset];
  
  useEffect(() => {
    const isDark = ui.activeTab === 'darkweb';
    if (!activeAssetObj || (ui.activeTab !== 'markets' && !isDark)) return;
    
    // Seleziona il canvas in base alla scheda attiva
    const canvas = isDark ? darkCanvasRef.current : marketCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.parentElement.getBoundingClientRect();
    if(rect.width === 0 || rect.height === 0) return; // Evita crash se il tab è ancora nascosto

    const ctx = canvas.getContext('2d');
    canvas.width = rect.width; 
    canvas.height = rect.height;
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    const data = activeAssetObj.history.slice(-ui.chartZoom);
    if(data.length === 0) return; 

    let minP = Math.min(...data.map(d => d.low)), maxP = Math.max(...data.map(d => d.high));
    const range = (maxP - minP) || 1; 
    minP -= range * 0.1; 
    maxP += range * 0.1;
    const finalRange = maxP - minP || 1;
    
    const plotW = rect.width - 70;
    const plotH = rect.height - 40; 
    const stepX = plotW / Math.max(1, (data.length - 1));
    
    ctx.fillStyle = isDark ? '#8b5cf6' : '#475569'; 
    ctx.font = '10px monospace';
    for(let i=0; i<=4; i++) {
      ctx.fillText(formatCurrency(maxP - (finalRange/4)*i, true), rect.width - 65, 20 + (plotH/4)*i + 4);
    }

    if (ui.chartType === 'candle') {
      const candleWidth = Math.max(2, (plotW / data.length) * 0.7);
      data.forEach((d, i) => {
        const x = 10 + (i * stepX);
        const yO = 20 + plotH - ((d.open - minP) / finalRange) * plotH;
        const yC = 20 + plotH - ((d.close - minP) / finalRange) * plotH;
        const yH = 20 + plotH - ((d.high - minP) / finalRange) * plotH;
        const yL = 20 + plotH - ((d.low - minP) / finalRange) * plotH;
        
        ctx.strokeStyle = ctx.fillStyle = d.close >= d.open ? '#10b981' : '#f43f5e';
        ctx.beginPath(); ctx.lineWidth = 1; ctx.moveTo(x, yH); ctx.lineTo(x, yL); ctx.stroke();
        ctx.fillRect(x - candleWidth/2, Math.min(yO, yC), candleWidth, Math.max(1, Math.abs(yO - yC)));
      });
    } else {
      ctx.beginPath(); 
      ctx.strokeStyle = isDark ? '#a855f7' : '#06b6d4'; 
      ctx.lineWidth = 2;
      data.forEach((d, i) => {
        const x = 10 + (i * stepX);
        const yC = 20 + plotH - ((d.close - minP) / finalRange) * plotH;
        if (i === 0) ctx.moveTo(x, yC); else ctx.lineTo(x, yC);
      });
      ctx.stroke();
    }
  }, [assets, ui.activeTab, ui.activeAsset, ui.chartType, ui.chartZoom, resizeTrigger, activeAssetObj]);

  if (!isAuth) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-nebula-950">
        <div className="bg-nebula-900/70 border border-nebula-border backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
          <MessageCircle className="w-16 h-16 text-cyan-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Nebula Terminal</h1>
          <p className="text-slate-400 mt-2 text-sm mb-6">Autenticazione Server (Multiplayer)</p>
          <button onClick={() => window.location.href = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(window.location.origin)}&scope=identify`} className="w-full flex items-center justify-center space-x-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg">
            <MessageCircle className="w-5 h-5" /><span>Accedi con Discord</span>
          </button>
        </div>
      </div>
    );
  }

  let totalStockVal = 0;
  Object.keys(portfolio.holdings).forEach(t => { if(assets[t]) totalStockVal += portfolio.holdings[t].shares * assets[t].currentPrice; });

  return (
    <div className="h-screen w-screen flex flex-col text-sm antialiased text-e2e8f0 font-sans" style={user.bgImage ? { backgroundImage: `url(${user.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: '#05070e' }}>
      <div className={`absolute inset-0 z-0 pointer-events-none ${user.bgImage ? 'bg-nebula-950/85 backdrop-blur-sm' : ''}`}></div>
      
      <header className="h-14 bg-nebula-900/95 border-b border-nebula-border flex items-center justify-between px-4 shrink-0 z-20 backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <div className="font-black text-white text-lg tracking-wider hidden sm:block">NEBULA</div>
          <div className="h-4 w-px bg-nebula-700 hidden sm:block"></div>
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span className={`w-2 h-2 rounded-full ${(gameTime.hours >= 9 && gameTime.hours < 18) ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <span>{(gameTime.hours >= 9 && gameTime.hours < 18) ? 'MARKET OPEN' : 'CLOSED'}</span>
          </div>
          <div className="h-4 w-px bg-nebula-700 hidden sm:block"></div>
          <div className="hidden sm:flex items-center space-x-2 text-sm font-mono font-bold text-cyan-400">
            <Clock className="w-4 h-4" /><span>{String(gameTime.hours).padStart(2, '0')}:{String(gameTime.minutes).padStart(2, '0')}</span>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-right hidden md:block">
            <div className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Patrimonio</div>
            <div className="font-mono font-bold text-white">{formatCurrency(portfolio.cash + totalStockVal)}</div>
          </div>
          <div className="flex items-center space-x-3 border-l border-nebula-border pl-6 cursor-pointer hover:opacity-80" onClick={() => setUi(p => ({...p, activeTab: 'settings'}))}>
            <div className="text-right">
              <div className="text-sm font-semibold text-white">{user.name}</div>
              <div className={`text-[10px] font-mono font-bold ${user.isProMax ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 animate-pulse text-transparent bg-clip-text' : user.isPro ? 'text-amber-500' : 'text-cyan-400'}`}>
                {user.isProMax ? 'PRO MAX' : user.isPro ? 'PRO MEMBER' : 'STANDARD'}
              </div>
            </div>
            <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} className="w-8 h-8 rounded-full border border-nebula-border bg-nebula-800" alt="Avatar" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden z-10">
        <nav className="w-16 md:w-64 bg-nebula-900/95 border-r border-nebula-border flex flex-col justify-between shrink-0 backdrop-blur-md">
          <div className="py-4 flex flex-col space-y-1">
            {[
              { id: 'markets', icon: LineChart, label: 'Trading Desk' }, 
              { id: 'portfolio', icon: Wallet, label: 'Portafoglio' }, 
              { id: 'chat', icon: MessageCircle, label: 'Comunicazioni' }, 
              { id: 'premium', icon: Crown, label: 'Abbonamenti' },
              { id: 'settings', icon: Settings, label: 'Impostazioni' }
            ].map(nav => (
              <button key={nav.id} onClick={() => setUi(p => ({...p, activeTab: nav.id, activeMarketType: nav.id==='markets' ? 'stocks' : p.activeMarketType}))} className={`w-full flex items-center space-x-3 px-4 md:px-6 py-3 border-r-2 transition-colors ${ui.activeTab === nav.id ? 'text-white bg-nebula-800/80 border-cyan-500' : 'text-slate-400 hover:text-white hover:bg-nebula-800/50 border-transparent'}`}>
                <nav.icon className={`w-5 h-5 text-center ${nav.id === 'premium' ? 'text-amber-500' : ''}`} /><span className="hidden md:block font-medium text-sm">{nav.label}</span>
              </button>
            ))}
            {user.isDarkWeb && (
              <button onClick={() => setUi(p => ({...p, activeTab: 'darkweb', activeAsset: 'FEDE'}))} className={`w-full flex items-center space-x-3 px-4 md:px-6 py-3 border-r-2 transition-colors ${ui.activeTab === 'darkweb' ? 'text-white bg-purple-900/40 border-purple-500' : 'text-purple-400 hover:text-white hover:bg-purple-900/20 border-transparent'}`}>
                <Skull className="w-5 h-5 text-center" /><span className="hidden md:block font-medium text-sm">Dark Web</span>
              </button>
            )}
          </div>
          <div className="p-4 flex flex-col space-y-4 justify-center md:justify-start items-center md:items-start">
            <button onClick={() => { localStorage.removeItem('nebulaState'); window.location.hash=''; window.location.reload(); }} className="text-slate-500 hover:text-rose-400 flex items-center space-x-2"><LogOut className="w-4 h-4"/><span className="hidden md:block text-xs">Disconnetti</span></button>
            <button onClick={() => { if (prompt("Password Dev Mode:") === "StefanoSindaco123") { setUi(p => ({...p, activeTab: 'admin'})); showToast("Pannello Admin Sbloccato", "success"); } else { showToast("Password Errata", "error"); } }} className={`transition-colors flex items-center space-x-2 ${ui.activeTab === 'admin' ? 'text-rose-500' : 'text-nebula-700 hover:text-slate-500'}`} title="Dev Mode"><Lock className="w-4 h-4" /><span className="hidden md:block text-xs">Admin Panel</span></button>
          </div>
        </nav>

        <main className="flex-1 bg-nebula-950/40 overflow-hidden relative backdrop-blur-md">
          
          {/* TAB MARKETS */}
          <div className={`h-full flex-col md:flex-row w-full ${ui.activeTab === 'markets' ? 'flex' : 'hidden'}`}>
            <div className="w-full md:w-80 border-r border-nebula-border bg-nebula-900/60 flex flex-col shrink-0">
              <div className="flex border-b border-nebula-border bg-nebula-900/80">
                <button onClick={() => setUi(p => ({...p, activeMarketType: 'stocks'}))} className={`flex-1 py-3 text-xs md:text-sm font-semibold border-b-2 ${ui.activeMarketType === 'stocks' ? 'text-white border-cyan-500' : 'text-slate-500 border-transparent'}`}>Azioni</button>
                <button onClick={() => setUi(p => ({...p, activeMarketType: 'crypto'}))} className={`flex-1 py-3 text-xs md:text-sm font-semibold border-b-2 ${ui.activeMarketType === 'crypto' ? 'text-white border-cyan-500' : 'text-slate-500 border-transparent'}`}>Crypto</button>
                {user.isProMax && (
                  <button onClick={() => setUi(p => ({...p, activeMarketType: 'promax_stocks'}))} className={`flex-1 py-3 text-[10px] md:text-xs font-black border-b-2 ${ui.activeMarketType.includes('promax') ? 'text-purple-400 border-purple-500' : 'text-slate-500 border-transparent'}`}>PRO MAX</button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
                {Object.values(assets).filter(a => ui.activeMarketType.includes('promax') ? a.type.includes('promax') : a.type === ui.activeMarketType).map(asset => (
                  <div key={asset.ticker} onClick={() => setUi(p => ({...p, activeAsset: asset.ticker}))} className={`cursor-pointer p-3 rounded-lg border flex justify-between items-center transition-colors ${asset.ticker === ui.activeAsset ? 'bg-nebula-800/80 border-nebula-700' : 'border-transparent hover:bg-nebula-800/40'}`}>
                    <div>
                      <div className="font-bold text-white text-sm flex items-center space-x-2">
                        <span>{asset.ticker}</span>
                        {asset.isProMax && <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 animate-pulse text-white text-[8px] px-1 rounded font-black tracking-widest shadow-sm">MAX</span>}
                        {asset.isPro && !asset.isProMax && <span className="bg-amber-500 text-white text-[8px] px-1 rounded">PRO</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{asset.name}</div>
                    </div>
                    <div className="text-sm font-semibold text-white font-mono">{formatCurrency(asset.currentPrice)}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scroll w-full">
              {activeAssetObj && (
                <>
                  <div className="p-4 md:p-6 border-b border-nebula-border bg-nebula-900/40 flex flex-col md:flex-row justify-between md:items-start gap-4">
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h2 className="text-2xl font-bold text-white">{activeAssetObj.name}</h2>
                        <span className="bg-nebula-800 text-cyan-400 px-2 py-0.5 rounded text-xs font-mono font-bold">{activeAssetObj.ticker}</span>
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-xs">
                        <span className="text-slate-400 flex items-center"><Factory className="w-3 h-3 mr-1 text-slate-500"/>{activeAssetObj.sector}</span>
                        <span className="text-slate-400 flex items-center"><Coins className="w-3 h-3 mr-1 text-slate-500"/>Cap: <span className="font-mono ml-1 text-slate-300">{activeAssetObj.mcap}</span></span>
                      </div>
                      <div className="mt-2 text-xs text-slate-400 max-w-xl">{activeAssetObj.desc}</div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs border-t border-nebula-border/50 pt-4">
                        <div className="flex flex-col"><span className="text-slate-500 mb-1 flex items-center"><UserCog className="w-3 h-3 mr-1"/> CEO</span><span className="font-semibold text-slate-200 truncate">{activeAssetObj.extra.ceo}</span></div>
                        <div className="flex flex-col"><span className="text-slate-500 mb-1 flex items-center"><Building className="w-3 h-3 mr-1"/> Fondazione</span><span className="font-semibold text-slate-200">{activeAssetObj.extra.founded}</span></div>
                        <div className="flex flex-col"><span className="text-slate-500 mb-1 flex items-center"><Users className="w-3 h-3 mr-1"/> Dipendenti</span><span className="font-semibold text-slate-200">{activeAssetObj.extra.employees}</span></div>
                        <div className="flex flex-col"><span className="text-slate-500 mb-1 flex items-center"><Percent className="w-3 h-3 mr-1"/> Dividendo</span><span className="font-semibold text-slate-200">{activeAssetObj.extra.dividend}</span></div>
                      </div>
                    </div>
                    <div className="text-left md:text-right shrink-0"><div className={`text-3xl font-mono font-black ${activeAssetObj.isProMax ? 'bg-gradient-to-r from-purple-400 to-rose-400 animate-pulse text-transparent bg-clip-text drop-shadow-md' : 'text-white'}`}>{formatCurrency(activeAssetObj.currentPrice)}</div></div>
                  </div>
                  
                  <div className="p-4 md:p-6 border-b border-nebula-border bg-nebula-950/60 relative w-full h-[350px]">
                    <div className="absolute top-6 right-6 z-10 flex space-x-2 bg-nebula-900/80 p-1 rounded-lg border border-nebula-border items-center backdrop-blur-sm">
                      <span className="text-[10px] text-slate-500 self-center mx-2 hidden sm:flex"><Search className="w-3 h-3 mr-1"/> Zoom</span>
                      <button onClick={() => setUi(p => ({...p, chartZoom: Math.max(15, p.chartZoom - 10)}))} className="px-2 text-slate-400 hover:text-white font-bold">-</button>
                      <button onClick={() => setUi(p => ({...p, chartZoom: Math.min(100, p.chartZoom + 10)}))} className="px-2 text-slate-400 hover:text-white font-bold">+</button>
                      <div className="w-px h-4 bg-nebula-700 mx-1"></div>
                      <button onClick={() => setUi(p => ({...p, chartType: 'candle'}))} className={`px-3 py-1 rounded text-xs font-bold ${ui.chartType === 'candle' ? 'bg-nebula-700 text-white' : 'text-slate-400'}`}><BarChart2 className="w-4 h-4"/></button>
                      <button onClick={() => setUi(p => ({...p, chartType: 'line'}))} className={`px-3 py-1 rounded text-xs font-bold ${ui.chartType === 'line' ? 'bg-nebula-700 text-white' : 'text-slate-400'}`}><LineChart className="w-4 h-4"/></button>
                    </div>
                    {/* CANVAS MARKET */}
                    <div className="relative w-full h-full border border-nebula-border rounded-xl bg-nebula-950/80 overflow-hidden"><canvas ref={marketCanvasRef} className="absolute inset-0 w-full h-full cursor-crosshair"></canvas></div>
                  </div>
                  
                  <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-nebula-950/40 flex-1">
                    <div className="bg-nebula-900/60 p-5 rounded-xl border border-nebula-border relative overflow-hidden backdrop-blur-sm">
                      {(activeAssetObj.type === 'stocks' && (gameTime.hours < 9 || gameTime.hours >= 18)) && (
                        <div className="absolute inset-0 bg-nebula-950/90 z-10 flex flex-col items-center justify-center backdrop-blur-md"><Store className="w-10 h-10 text-rose-500 mb-2" /><span className="text-rose-400 font-bold">Mercato Azionario Chiuso</span></div>
                      )}
                      {(activeAssetObj.type.includes('promax') && (gameTime.hours < 5 || gameTime.hours >= 22)) && (
                        <div className="absolute inset-0 bg-nebula-950/90 z-10 flex flex-col items-center justify-center backdrop-blur-md"><Store className="w-10 h-10 text-purple-500 mb-2" /><span className="text-purple-400 font-bold">Mercato PRO MAX Chiuso</span><span className="text-xs text-slate-400 mt-1">Apertura alle 05:00</span></div>
                      )}
                      <div className="flex justify-between items-center mb-4 text-xs font-mono"><span className="text-slate-400 uppercase">Cassa Disponibile:</span><span className="text-white font-bold">{formatCurrency(portfolio.cash)}</span></div>
                      <div className="mb-4"><input type="number" value={tradeQty} min="1" onChange={(e) => setTradeQty(e.target.value)} className="w-full bg-nebula-950/80 border border-nebula-border rounded-xl px-4 py-3 font-mono text-white text-lg font-bold outline-none focus:border-cyan-500" /></div>
                      <div className="flex justify-between items-center font-mono text-sm mb-6 pb-4 border-b border-nebula-border/50"><span className="text-slate-400">Controvalore:</span><span className="font-bold text-white">{formatCurrency((parseInt(tradeQty)||0) * activeAssetObj.currentPrice)}</span></div>
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => executeOrder('BUY')} className="py-3 bg-emerald-600 hover:bg-emerald-500 transition-colors text-white rounded-xl font-bold uppercase tracking-wider">Compra</button>
                        <button onClick={() => executeOrder('SELL')} className="py-3 bg-rose-600 hover:bg-rose-500 transition-colors text-white rounded-xl font-bold uppercase tracking-wider">Vendi</button>
                      </div>
                    </div>
                    <div className="bg-nebula-900/60 p-5 rounded-xl border border-nebula-border backdrop-blur-sm">
                      <h3 className="text-sm font-semibold text-white mb-4">La tua Posizione</h3>
                      <div className="space-y-4 font-mono text-sm">
                        <div className="flex justify-between border-b border-nebula-border/50 pb-2"><span className="text-slate-400">Asset Posseduti</span><span className="text-white font-bold">{actShares}</span></div>
                        <div className="flex justify-between border-b border-nebula-border/50 pb-2"><span className="text-slate-400">Prezzo Medio</span><span className="text-white">{actShares > 0 ? formatCurrency(actHoldings.avgPrice) : '€0.00'}</span></div>
                        <div className="flex justify-between pt-2"><span className="text-slate-400">P&L</span><span className={`font-bold ${actShares > 0 && (activeAssetObj.currentPrice - actHoldings.avgPrice) * actShares >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{actShares > 0 ? formatCurrency((activeAssetObj.currentPrice - actHoldings.avgPrice) * actShares) : '€0.00'}</span></div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* TAB PORTFOLIO */}
          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${ui.activeTab === 'portfolio' ? 'flex' : 'hidden'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Mio Portafoglio</h2>
            </div>
            <div className="bg-nebula-900/60 rounded-xl overflow-hidden border border-nebula-border backdrop-blur-md">
              <table className="w-full text-left font-mono text-xs md:text-sm">
                <thead><tr className="bg-nebula-900 border-b border-nebula-border text-slate-400 uppercase"><th className="p-4">Asset</th><th className="p-4">Qty</th><th className="p-4">PMD</th><th className="p-4">Attuale</th><th className="p-4">P&L</th><th className="p-4 text-right">Azione</th></tr></thead>
                <tbody className="divide-y divide-nebula-border/50 text-slate-200">
                  {Object.keys(portfolio.holdings).map(ticker => {
                    const h = portfolio.holdings[ticker], asset = assets[ticker]; if(!asset) return null;
                    const pnl = (h.shares * asset.currentPrice) - (h.shares * h.avgPrice);
                    return (
                      <tr key={ticker} className="hover:bg-nebula-800/50 transition-colors">
                        <td className="p-4 font-bold text-white flex items-center space-x-2"><span>{asset.ticker}</span>{asset.isCrashed && <Skull className="w-4 h-4 text-rose-500"/>}</td><td className="p-4">{h.shares}</td><td className="p-4 text-slate-400">{formatCurrency(h.avgPrice)}</td><td className={`p-4 ${asset.isCrashed ? 'text-rose-500 font-bold' : 'text-white'}`}>{formatCurrency(asset.currentPrice)}</td>
                        <td className={`p-4 font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}</td>
                        <td className="p-4 text-right"><button onClick={() => {
                             socket.emit('execute_trade', { userId: user.id, type: 'SELL', ticker, qty: h.shares });
                        }} className="text-xs bg-rose-600/20 text-rose-400 px-3 py-1 rounded hover:bg-rose-600/40">Vendi Tutto</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* TAB CHAT */}
          <div className={`h-full flex-col md:flex-row w-full ${ui.activeTab === 'chat' ? 'flex' : 'hidden'}`}>
            <div className="w-full md:w-64 border-r border-nebula-border bg-nebula-900/60 flex flex-col shrink-0 backdrop-blur-md">
              <div className="p-4 border-b border-nebula-border text-xs font-bold uppercase text-slate-500">Canali</div>
              <div className="p-2 space-y-1">
                <button onClick={() => setUi(p => ({...p, activeChatRoom: 'global'}))} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${ui.activeChatRoom === 'global' ? 'bg-nebula-800 text-white' : 'text-slate-400 hover:bg-nebula-800/50'}`}><Globe className="w-4 h-4" /><span>Global Room</span></button>
                <button onClick={() => setUi(p => ({...p, activeChatRoom: 'ai'}))} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${ui.activeChatRoom === 'ai' ? 'bg-nebula-800 text-white' : 'text-slate-400 hover:bg-nebula-800/50'}`}><Bot className={`w-4 h-4 ${user.isProMax ? 'text-purple-400' : 'text-cyan-400'}`} /><span>{user.isProMax ? 'Nebula OMNISCIENT' : 'Nebula AI'}</span>{(!user.isPro && !user.isProMax) && <Lock className="w-3 h-3 ml-1" />}</button>
              </div>
              <div className="pt-4 pb-1 px-4 flex justify-between items-center text-[10px] font-bold uppercase text-slate-600 border-t border-nebula-border mt-2">
                <span>Messaggi Privati</span>
                <button onClick={createPrivateChat} className="hover:text-cyan-400 bg-slate-800 rounded p-1"><Plus className="w-3 h-3" /></button>
              </div>
              <div className="flex-1 p-2 space-y-1 overflow-y-auto custom-scroll">
                {dmRooms.map(room => (
                  <button key={room.id} onClick={() => setUi(p => ({...p, activeChatRoom: room.id}))} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${ui.activeChatRoom === room.id ? 'bg-nebula-800 text-white' : 'text-slate-400 hover:bg-nebula-800/50'}`}>
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white">{room.display.charAt(0).toUpperCase()}</div>
                    <span className="truncate">{room.display}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 flex flex-col bg-nebula-950/40 relative backdrop-blur-md">
              <div className="p-4 border-b border-nebula-border bg-nebula-900/60"><h3 className="font-bold text-white">#{ui.activeChatRoom}</h3></div>
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {(chatHistory[ui.activeChatRoom] || []).map((m, idx) => (
                  <div key={idx} className="flex flex-col space-y-1 mb-2">
                    <div className="flex items-baseline space-x-2">{m.isBot && <Bot className={`w-3 h-3 ${m.sender==='Nebula OMNISCIENT'?'text-purple-400':'text-cyan-400'}`} />}<span className="text-xs font-bold" style={{color: m.color}}>{m.sender}</span><span className="text-[10px] text-slate-500">{m.time}</span></div>
                    <div className="text-sm p-3 rounded-lg bg-nebula-900/80 whitespace-pre-wrap border border-nebula-border/50" style={{color: m.textCol}}>{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-nebula-900/80 border-t border-nebula-border">
                <form onSubmit={sendMessage} className="relative">
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Scrivi un messaggio..." className="w-full bg-nebula-950/80 border border-nebula-border rounded-xl pl-4 pr-12 py-3 text-white focus:outline-none focus:border-cyan-500" autoComplete="off" />
                  <button type="submit" className="absolute right-2 top-2 bottom-2 w-10 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center justify-center"><Send className="w-4 h-4" /></button>
                </form>
              </div>
            </div>
          </div>

          {/* TAB PREMIUM */}
          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${ui.activeTab === 'premium' ? 'flex' : 'hidden'}`}>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Sblocca il tuo potenziale</h2>
              <p className="text-slate-400">Accedi a strumenti istituzionali, algoritmi di IA avanzati e mercati esclusivi per dominare il terminale.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* PRO CARD */}
              <div className="bg-nebula-900/60 backdrop-blur-md p-8 border border-amber-500/30 rounded-2xl relative flex flex-col shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <h3 className="text-2xl font-black text-amber-500 mb-2 flex items-center"><Crown className="w-6 h-6 mr-2"/> PRO</h3>
                <div className="text-4xl font-mono text-white mb-6 font-bold">€7.500<span className="text-sm text-slate-500 font-sans font-normal">/mese</span></div>
                <ul className="space-y-4 mb-8 flex-1 text-slate-300">
                  <li className="flex items-center"><Check className="w-5 h-5 text-amber-500 mr-3"/> Algoritmo Drift Positivo sugli asset</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-amber-500 mr-3"/> Accesso Chatbot Nebula AI (Analista)</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-amber-500 mr-3"/> Accesso alle Azioni e Crypto PRO</li>
                </ul>
                {!user.isPro ? (
                  <button onClick={() => buyTier('PRO', 7500)} className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity text-lg">Acquista Ora</button>
                ) : (
                  <button disabled className="w-full py-4 bg-amber-900/50 text-amber-500 font-bold rounded-xl cursor-not-allowed">Attivo</button>
                )}
                
                <div className="mt-6 pt-6 border-t border-nebula-border/50">
                  <p className="text-xs text-slate-500 mb-2">Oppure usa un codice licenza:</p>
                  <div className="flex space-x-2">
                    <input type="text" id="pro-key-input" placeholder="NBL-PRO-XXXX" className="flex-1 bg-nebula-950 border border-amber-500/50 rounded-lg px-4 py-2 text-white font-mono uppercase focus:outline-none focus:border-amber-400" />
                    <button onClick={() => {
                      const val = document.getElementById('pro-key-input').value.trim().toUpperCase();
                      if(PRO_KEYS.includes(val)) { buyTier('PRO', 0); showToast("Codice Accettato", "success"); } else showToast("Codice errato o scaduto.", "error");
                    }} className="px-4 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-500">Riscatta</button>
                  </div>
                </div>
              </div>

              {/* PRO MAX CARD */}
              <div className="bg-nebula-900/60 backdrop-blur-md p-8 border border-purple-500/50 rounded-2xl relative flex flex-col shadow-[0_0_40px_rgba(168,85,247,0.15)] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-transparent pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
                <h3 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-rose-400 animate-pulse text-transparent bg-clip-text mb-2 flex items-center z-10"><Zap className="w-6 h-6 mr-2 text-purple-400"/> PRO MAX</h3>
                <div className="text-4xl font-mono text-white mb-6 font-bold z-10">€15.000<span className="text-sm text-slate-500 font-sans font-normal">/mese</span></div>
                <ul className="space-y-4 mb-8 flex-1 text-slate-300 z-10">
                  <li className="flex items-center"><Check className="w-5 h-5 text-purple-400 mr-3"/> Include tutti i vantaggi PRO</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-purple-400 mr-3"/> Nebula OMNISCIENT (IA Quantistica Definitiva)</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-purple-400 mr-3"/> Sblocco Mercato PRO MAX (05:00 - 22:00)</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-purple-400 mr-3"/> Asset Esclusivi ad altissimo rendimento</li>
                </ul>
                {!user.isProMax ? (
                  <button onClick={() => buyTier('PROMAX', 15000)} className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.5)] hover:opacity-90 transition-opacity text-lg z-10">Ascendi a MAX</button>
                ) : (
                  <button disabled className="w-full py-4 bg-purple-900/50 text-purple-400 font-bold rounded-xl cursor-not-allowed z-10 border border-purple-500/30">Livello Massimo Raggiunto</button>
                )}
              </div>
            </div>
          </div>

          {/* TAB DARK WEB */}
          <div className={`h-full flex-col w-full bg-[#030008] ${ui.activeTab === 'darkweb' ? 'flex' : 'hidden'} animate-pulse`} style={{ animationDuration: '4s' }}>
            {activeAssetObj && (
              <>
               <div className="p-4 md:p-6 border-b border-purple-900/50 bg-black flex flex-col md:flex-row justify-between md:items-start gap-4">
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center space-x-3 mb-1"><h2 className="text-2xl font-black text-purple-500 tracking-widest">{activeAssetObj.name}</h2><span className="bg-purple-900 text-white px-2 py-0.5 rounded text-xs font-mono font-bold">{activeAssetObj.ticker}</span></div>
                    <div className="mt-2 text-xs text-purple-400/70">{activeAssetObj.desc}</div>
                  </div>
                  <div className="text-left md:text-right shrink-0"><div className="text-3xl font-mono font-black text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]">{formatCurrency(activeAssetObj.currentPrice)}</div></div>
                </div>
                <div className="p-4 md:p-6 border-b border-purple-900/50 bg-[#020005] relative h-[400px]">
                  {/* CANVAS DARK WEB */}
                  <div className="relative w-full h-full border border-purple-900 rounded-xl bg-black overflow-hidden"><canvas ref={darkCanvasRef} className="absolute inset-0 w-full h-full cursor-crosshair hue-rotate-90"></canvas></div>
                </div>
                <div className="p-4 md:p-6 bg-black flex-1">
                  <div className="bg-purple-950/20 p-5 rounded-xl border border-purple-900 max-w-xl mx-auto">
                    <div className="flex justify-between items-center mb-4 text-xs font-mono"><span className="text-purple-400 uppercase">Cassa Nascosta:</span><span className="text-white font-bold">{formatCurrency(portfolio.cash)}</span></div>
                    <div className="mb-4"><input type="number" value={tradeQty} min="1" onChange={(e) => setTradeQty(e.target.value)} className="w-full bg-black border border-purple-900 rounded-xl px-4 py-3 font-mono text-purple-300 text-lg font-bold outline-none" /></div>
                    <div className="flex justify-between items-center font-mono text-sm mb-6 pb-4 border-b border-purple-900/50"><span className="text-purple-400">Rischio stimato:</span><span className="font-bold text-rose-500">MASSIMO</span></div>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => executeOrder('BUY')} className="py-3 bg-purple-800 hover:bg-purple-700 text-white rounded-xl font-bold uppercase tracking-widest border border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]">Compra</button>
                      <button onClick={() => executeOrder('SELL')} className="py-3 bg-black hover:bg-zinc-900 text-slate-500 rounded-xl font-bold uppercase tracking-widest border border-zinc-800">Vendi</button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* TAB ADMIN */}
          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${ui.activeTab === 'admin' ? 'flex' : 'hidden'}`}>
            <h2 className="text-2xl font-black text-rose-500 mb-6 flex items-center"><UserCog className="w-6 h-6 mr-3" /> Dev / Admin Panel</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="bg-nebula-900/60 p-6 border border-rose-900/50 rounded-xl backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-rose-900/50 pb-2">Controllo Tempo Server</h3>
                <div className="flex items-center space-x-4">
                  <div><label className="text-xs text-slate-400 block mb-1">Ore (0-23)</label><input type="number" id="adm-hh" defaultValue={gameTime.hours} className="bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono w-20 outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Minuti (0-59)</label><input type="number" id="adm-mm" defaultValue={gameTime.minutes} className="bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono w-20 outline-none" /></div>
                  <div className="flex items-end h-full pt-5"><button onClick={() => socket.emit('admin_action', { type: 'time', hh: document.getElementById('adm-hh').value, mm: document.getElementById('adm-mm').value })} className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded">Forza</button></div>
                </div>
              </div>

              <div className="bg-nebula-900/60 p-6 border border-rose-900/50 rounded-xl backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-rose-900/50 pb-2">Manipolazione Mercato (Live)</h3>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex-1"><label className="text-xs text-slate-400 block mb-1">Seleziona Asset</label><select id="adm-tkr" className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none">{Object.keys(assets).map(k => <option key={k} value={k}>{k}</option>)}</select></div>
                  <div className="flex-1"><label className="text-xs text-slate-400 block mb-1">Nuovo Prezzo Base (€)</label><input type="number" id="adm-prc" className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono outline-none" /></div>
                </div>
                <button onClick={() => socket.emit('admin_action', { type: 'price', ticker: document.getElementById('adm-tkr').value, price: parseFloat(document.getElementById('adm-prc').value) })} className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-sm">Forza Prezzo Attuale Globale</button>
              </div>

              <div className="bg-nebula-900/60 p-6 border border-rose-900/50 rounded-xl backdrop-blur-md lg:col-span-2">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-rose-900/50 pb-2">Forza Saldo Utente in Diretta</h3>
                <div className="bg-nebula-950/80 p-4 rounded-lg border border-nebula-border flex items-center space-x-4">
                  <div className="flex-1"><label className="text-xs text-slate-400">ID Utente Discord</label><input type="text" id="adm-uid" defaultValue={user.id} className="w-full bg-nebula-900 border border-nebula-border rounded px-2 py-2 text-white font-mono outline-none" /></div>
                  <div className="flex-1"><label className="text-xs text-slate-400">Nuovo Saldo (€)</label><input type="number" id="adm-cash" defaultValue={portfolio.cash} className="w-full bg-nebula-900 border border-nebula-border rounded px-2 py-2 text-white font-mono outline-none" /></div>
                  <div className="flex items-end pt-5"><button onClick={() => socket.emit('admin_action', { type: 'cash', userId: document.getElementById('adm-uid').value, cash: parseFloat(document.getElementById('adm-cash').value) })} className="py-2 px-6 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded">Applica Saldo</button></div>
                </div>
              </div>

            </div>
          </div>

        </main>
      </div>

      <div className="fixed bottom-5 right-5 z-[70] flex flex-col space-y-3 pointer-events-none w-80">
        {toasts.map(t => (
          <div key={t.id} className={`bg-nebula-900/80 p-3 rounded-xl flex items-center space-x-3 border-l-4 ${t.type === 'success' ? 'border-emerald-500' : t.type === 'error' ? 'border-rose-500' : 'border-cyan-500'} shadow-lg backdrop-blur-md`}>
            {t.type === 'success' ? <Check className="w-4 h-4 text-emerald-400"/> : <X className="w-4 h-4 text-rose-400"/>}
            <span className="text-white text-xs font-bold leading-tight">{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
