import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart2, Wallet, MessageCircle, Settings, Lock, UserCog, 
  Crown, Factory, Coins, Globe, Plus, Send, X, Check, 
  LineChart, Store, Clock, Users, Building, Percent, Search,
  LogOut, Image, Zap, Trash2, RefreshCw, Key, Download, Upload,
  Bell, Landmark, ArrowRightCircle
} from 'lucide-react';
import { io } from 'socket.io-client';

const DISCORD_CLIENT_ID = "1544048974175019058";
// METTI QUI IL LINK DEL TUO BACKEND SU RENDER / CLOUDFLARE:
const BACKEND_URL = "https://pledge-cited-blocks-url.trycloudflare.com"; 

let socket;

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [user, setUser] = useState({ id: '', name: '', avatar: '', colorName: '#ffffff', colorText: '#cbd5e1', isPro: false, isProMax: false, bgImage: '', isAdmin: false });
  const [portfolio, setPortfolio] = useState({ cash: 100, holdings: {} }); 
  
  const [assets, setAssets] = useState({});
  const [gameTime, setGameTime] = useState({ hours: 9, minutes: 0 });
  const [chatHistory, setChatHistory] = useState({ global: [] });
  const [dmRooms, setDmRooms] = useState([]);
  
  const [ui, setUi] = useState({ activeTab: 'markets', activeMarketType: 'stocks', activeAsset: 'SNEB', chartType: 'candle', chartZoom: 60, activeChatRoom: 'global' });
  const [tradeQty, setTradeQty] = useState(1);
  const [chatInput, setChatInput] = useState('');
  const [toasts, setToasts] = useState([]);
  const [resizeTrigger, setResizeTrigger] = useState(0);
  const [mousePos, setMousePos] = useState(null); 
  
  const [discordModal, setDiscordModal] = useState({ open: false, type: '', code: '', netAmount: 0, taxAmount: 0 });
  const [depositModal, setDepositModal] = useState(false);
  const [adminValidator, setAdminValidator] = useState(null);
  const [dbBackupInfo, setDbBackupInfo] = useState(null);

  const [newAsset, setNewAsset] = useState({ type: 'stocks', ticker: '', name: '', price: 10, vol: 0.02, sector: 'Tech', mcap: '€1M', desc: '', ceo: '', founded: '', employees: '', dividend: '0.00%', isPro: false, isProMax: false });
  const [adminCash, setAdminCash] = useState({ uid: '', amount: 100, action: 'add' });
  const [adminPriceEdit, setAdminPriceEdit] = useState({ ticker: 'SNEB', newPrice: '', vol: '', mcap: '', sector: '', dividend: '', employees: '' });
  const [adminCodeInput, setAdminCodeInput] = useState("");
  const [adminUserQuery, setAdminUserQuery] = useState("");
  const [adminFetchedUser, setAdminFetchedUser] = useState(null);
  
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [newAlert, setNewAlert] = useState({ ticker: '', target: '', mp3: '' });

  const marketCanvasRef = useRef(null);
  const chatScrollRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setResizeTrigger(r => r + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    socket = io(BACKEND_URL, {
      extraHeaders: { "ngrok-skip-browser-warning": "true" }
    });

    socket.on('market_init', (data) => {
      setAssets(data.assets || {});
      setGameTime(data.gameTime || { hours: 9, minutes: 0 });
      setChatHistory(prev => ({ ...prev, global: data.chat?.global || [] }));
    });

    socket.on('market_update', (data) => {
      setAssets(data.assets || {});
      setGameTime(data.gameTime || { hours: 9, minutes: 0 });
    });

    socket.on('account_update', (acc) => {
      if (acc) {
        setUser(prev => ({ ...prev, ...acc }));
        setPortfolio({ cash: acc.cash || 0, holdings: acc.holdings || {} });
        setIsAuth(true);
      }
    });

    socket.on('force_wallet_update', ({ userId, acc }) => {
      setUser(current => {
        if(current.id === userId) {
          setPortfolio({ cash: acc.cash, holdings: acc.holdings });
          return { ...current, ...acc };
        }
        return current;
      });
      setAdminFetchedUser(prev => {
        if(prev && prev.id === userId) return { ...prev, ...acc };
        return prev;
      });
    });

    socket.on('admin_user_data', (data) => {
      if(data) {
        setAdminFetchedUser(data);
        showToast("Dati utente recuperati con successo", "success");
      } else {
        setAdminFetchedUser(null);
        showToast("Nessun utente trovato con questo ID", "error");
      }
    });

    socket.on('admin_db_data', (data) => {
      setDbBackupInfo(data); // Salva i dati localmente per la UI fondi
      const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nebula_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    socket.on('chat_update', ({ room, chat }) => {
      setChatHistory(prev => ({ ...prev, [room]: chat }));
    });

    socket.on('toast', ({ msg, type }) => showToast(msg, type));

    socket.on('withdrawal_success', ({ code, netAmount, taxAmount }) => {
      setDiscordModal({ open: true, type: 'WITHDRAW_SUCCESS', code, netAmount, taxAmount });
    });

    socket.on('admin_code_result', ({ valid, data, special }) => {
      if(valid) {
          if (special) {
              setDiscordModal({ open: true, type: 'FUND_WITHDRAWAL', code: special, netAmount: data.amount });
          } else {
              setAdminValidator(data);
          }
      }
    });

    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get('access_token');

    if (accessToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
      fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(res => res.json()).then(u => {
        if (u.id) socket.emit('user_login', { id: u.id, name: u.username, avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : '' });
      });
    }

    return () => socket.disconnect();
  }, []);

  // Price Alerts Watcher
  useEffect(() => {
    if (Object.keys(assets).length === 0 || !user.isPro) return;
    priceAlerts.forEach(alert => {
        if (!alert.triggered && assets[alert.ticker] && assets[alert.ticker].currentPrice >= alert.target) {
            const audioUrl = alert.mp3 && alert.mp3.trim() !== '' ? alert.mp3 : "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";
            const audio = new Audio(audioUrl);
            audio.play().catch(e => console.log("Audio play blocked by browser interaction policies"));
            showToast(`🚨 ALERT: ${alert.ticker} ha raggiunto il target di ${formatCurrency(alert.target)}!`, "success");
            setPriceAlerts(prev => prev.map(a => a.id === alert.id ? {...a, triggered: true} : a));
        }
    });
  }, [assets, priceAlerts, user.isPro]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatHistory, ui.activeChatRoom]);

  const showToast = (msg, type = 'info') => {
    const id = Date.now(); setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const formatCurrency = (num, compact = false) => {
    if(compact && num >= 1e9) return '€' + (num/1e9).toFixed(1) + 'B';
    if(compact && num >= 1e6) return '€' + (num/1e6).toFixed(1) + 'M';
    if(compact && num <= -1e12) return '-€' + (Math.abs(num)/1e12).toFixed(1) + 'T';
    if(compact && num >= 1e3) return '€' + (num/1e3).toFixed(1) + 'K';
    return '€' + Number(num || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const executeOrder = (type) => {
    socket.emit('execute_trade', { userId: user.id, type, ticker: ui.activeAsset, qty: parseFloat(tradeQty) });
  };

  const buyTier = (tier, price) => {
    socket.emit('buy_tier', { userId: user.id, tier, price });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msgObj = { sender: user.name, avatar: user.avatar, text: chatInput, color: user.colorName, textCol: user.colorText, time: new Date().toLocaleTimeString().slice(0,5) };
    socket.emit('send_message', { room: ui.activeChatRoom, msg: msgObj });
    setChatInput('');
  };

  const createPrivateChat = () => {
    const uname = prompt("Inserisci nametag Discord (es. Nome#1234):");
    if(uname && uname.trim() !== '') {
      const roomKey = `dm-${uname.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      setDmRooms(p => p.find(r => r.id === roomKey) ? p : [...p, { id: roomKey, display: uname }]);
      setUi(p => ({ ...p, activeChatRoom: roomKey }));
    }
  };

  const requestWithdrawal = () => {
    const amount = parseFloat(document.getElementById('dm-amount').value);
    if(isNaN(amount) || amount <= 0) return showToast("Importo non valido.", "error");
    socket.emit('request_withdrawal', { userId: user.id, amount });
  };

  const handleRestoreDb = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        socket.emit('admin_restore_db', json);
      } catch(err) { showToast("File JSON non valido", "error"); }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const activeAssetObj = assets ? assets[ui.activeAsset] : null;
  const isMarketOpen = (gameTime?.hours >= 8 && gameTime?.hours < 19) || (gameTime?.hours === 19 && gameTime?.minutes < 30);
  
  useEffect(() => {
    if (!activeAssetObj || ui.activeTab !== 'markets') return;
    const canvas = marketCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.parentElement.getBoundingClientRect();
    if(rect.width === 0 || rect.height === 0) return;

    const ctx = canvas.getContext('2d');
    canvas.width = rect.width; 
    canvas.height = rect.height;
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    const data = activeAssetObj.history ? activeAssetObj.history.slice(-ui.chartZoom) : [];
    if(data.length === 0) return; 

    let minP = Math.min(...data.map(d => d.low)), maxP = Math.max(...data.map(d => d.high));
    const range = (maxP - minP) || 1; minP -= range * 0.1; maxP += range * 0.1;
    const finalRange = maxP - minP || 1;
    
    const plotW = rect.width - 70;
    const plotH = rect.height - 40; 
    const stepX = plotW / Math.max(1, (data.length - 1));
    
    ctx.fillStyle = '#475569'; 
    ctx.font = '10px monospace';
    for(let i=0; i<=4; i++) ctx.fillText(formatCurrency(maxP - (finalRange/4)*i, true), rect.width - 65, 20 + (plotH/4)*i + 4);

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
      ctx.beginPath(); ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 2;
      data.forEach((d, i) => {
        const x = 10 + (i * stepX);
        const yC = 20 + plotH - ((d.close - minP) / finalRange) * plotH;
        if (i === 0) ctx.moveTo(x, yC); else ctx.lineTo(x, yC);
      });
      ctx.stroke();
    }

    if (mousePos && data.length > 0) {
      let index = Math.round((mousePos.x - 10) / stepX);
      if (index >= 0 && index < data.length) {
        const d = data[index];
        const cx = 10 + (index * stepX);
        const cy = 20 + plotH - ((d.close - minP) / finalRange) * plotH;

        ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, rect.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(rect.width, cy); ctx.stroke(); ctx.setLineDash([]);

        const priceStr = formatCurrency(d.close);
        ctx.font = 'bold 11px monospace'; const textWidth = ctx.measureText(priceStr).width;
        let ttX = cx + 15; if (ttX + textWidth + 20 > rect.width) ttX = cx - textWidth - 25; 
        let ttY = cy - 30; if (ttY < 0) ttY = cy + 15;

        ctx.fillStyle = '#0f172a'; ctx.fillRect(ttX, ttY, textWidth + 20, 26);
        ctx.strokeStyle = '#38bdf8'; ctx.strokeRect(ttX, ttY, textWidth + 20, 26);
        ctx.fillStyle = '#ffffff'; ctx.fillText(priceStr, ttX + 10, ttY + 17);
      }
    }
  }, [assets, ui.activeTab, ui.activeAsset, ui.chartType, ui.chartZoom, resizeTrigger, activeAssetObj, mousePos]);

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
  if(portfolio.holdings && assets) {
    Object.keys(portfolio.holdings).forEach(t => { if(assets[t]) totalStockVal += portfolio.holdings[t].shares * assets[t].currentPrice; });
  }

  return (
    <div className="h-screen w-screen flex flex-col text-sm antialiased text-e2e8f0 font-sans" style={user.bgImage ? { backgroundImage: `url(${user.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: '#05070e' }}>
      <div className={`absolute inset-0 z-0 pointer-events-none ${user.bgImage ? 'bg-nebula-950/85 backdrop-blur-sm' : ''}`}></div>
      
      <header className="h-14 bg-nebula-900/95 border-b border-nebula-border flex items-center justify-between px-4 shrink-0 z-20 backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <div className="font-black text-white text-lg tracking-wider hidden sm:block">NEBULA</div>
          <div className="h-4 w-px bg-nebula-700 hidden sm:block"></div>
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span className={`w-2 h-2 rounded-full ${isMarketOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <span>{isMarketOpen ? 'MARKET OPEN' : 'CLOSED'}</span>
          </div>
          <div className="h-4 w-px bg-nebula-700 hidden sm:block"></div>
          <div className="hidden sm:flex items-center space-x-2 text-sm font-mono font-bold text-cyan-400">
            <Clock className="w-4 h-4" /><span>{String(gameTime?.hours || 9).padStart(2, '0')}:{String(gameTime?.minutes || 0).padStart(2, '0')}</span>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-right hidden md:block">
            <div className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Patrimonio</div>
            <div className="font-mono font-bold text-white">{formatCurrency((portfolio.cash || 0) + totalStockVal)}</div>
          </div>
          <div className="flex items-center space-x-3 border-l border-nebula-border pl-6 cursor-pointer hover:opacity-80" onClick={() => setUi(p => ({...p, activeTab: 'settings'}))}>
            <div className="text-right">
              <div className="text-sm font-semibold text-white" style={{color: user.colorName}}>{user.name}</div>
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
          </div>
          <div className="p-4 flex flex-col space-y-4 justify-center md:justify-start items-center md:items-start">
            <button onClick={() => { localStorage.removeItem('nebulaState'); window.location.hash=''; window.location.reload(); }} className="text-slate-500 hover:text-rose-400 flex items-center space-x-2"><LogOut className="w-4 h-4"/><span className="hidden md:block text-xs">Disconnetti</span></button>
            {user.isAdmin && (
              <button onClick={() => { setUi(p => ({...p, activeTab: 'admin'})); socket.emit('admin_fetch_db'); }} className={`transition-colors flex items-center space-x-2 ${ui.activeTab === 'admin' ? 'text-rose-500' : 'text-nebula-700 hover:text-rose-400'}`} title="Dev Mode"><Lock className="w-4 h-4" /><span className="hidden md:block text-xs">Admin Panel</span></button>
            )}
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
                {Object.values(assets || {}).filter(a => ui.activeMarketType.includes('promax') ? a.type?.includes('promax') : a.type === ui.activeMarketType).map(asset => (
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
                        <div className="flex flex-col"><span className="text-slate-500 mb-1 flex items-center"><UserCog className="w-3 h-3 mr-1"/> CEO</span><span className="font-semibold text-slate-200 truncate">{activeAssetObj.extra?.ceo}</span></div>
                        <div className="flex flex-col"><span className="text-slate-500 mb-1 flex items-center"><Building className="w-3 h-3 mr-1"/> Fondazione</span><span className="font-semibold text-slate-200">{activeAssetObj.extra?.founded}</span></div>
                        <div className="flex flex-col"><span className="text-slate-500 mb-1 flex items-center"><Users className="w-3 h-3 mr-1"/> Dipendenti</span><span className="font-semibold text-slate-200">{activeAssetObj.extra?.employees}</span></div>
                        <div className="flex flex-col"><span className="text-slate-500 mb-1 flex items-center"><Percent className="w-3 h-3 mr-1"/> Dividendo</span><span className="font-semibold text-slate-200">{activeAssetObj.extra?.dividend}</span></div>
                      </div>
                    </div>
                    <div className="text-left md:text-right shrink-0"><div className={`text-3xl font-mono font-black ${activeAssetObj.isProMax ? 'bg-gradient-to-r from-purple-400 to-rose-400 animate-pulse text-transparent bg-clip-text drop-shadow-md' : 'text-white'}`}>{formatCurrency(activeAssetObj.currentPrice)}</div></div>
                  </div>
                  
                  <div className="p-4 md:p-6 border-b border-nebula-border bg-nebula-950/60 relative w-full h-[350px]">
                    <div className="absolute top-6 right-6 z-10 flex space-x-2 bg-nebula-900/80 p-1 rounded-lg border border-nebula-border items-center backdrop-blur-sm">
                      <span className="text-[10px] text-slate-500 self-center mx-2 hidden sm:flex"><Search className="w-3 h-3 mr-1"/> Zoom</span>
                      <button onClick={() => setUi(p => ({...p, chartZoom: Math.max(15, p.chartZoom - 10)}))} className="px-2 text-slate-400 hover:text-white font-bold text-lg leading-none">+</button>
                      <button onClick={() => setUi(p => ({...p, chartZoom: Math.min(100, p.chartZoom + 10)}))} className="px-2 text-slate-400 hover:text-white font-bold text-lg leading-none">-</button>
                      <div className="w-px h-4 bg-nebula-700 mx-1"></div>
                      <button onClick={() => setUi(p => ({...p, chartType: 'candle'}))} className={`px-3 py-1 rounded text-xs font-bold ${ui.chartType === 'candle' ? 'bg-nebula-700 text-white' : 'text-slate-400'}`}><BarChart2 className="w-4 h-4"/></button>
                      <button onClick={() => setUi(p => ({...p, chartType: 'line'}))} className={`px-3 py-1 rounded text-xs font-bold ${ui.chartType === 'line' ? 'bg-nebula-700 text-white' : 'text-slate-400'}`}><LineChart className="w-4 h-4"/></button>
                    </div>
                    <div 
                      className="relative w-full h-full border border-nebula-border rounded-xl bg-nebula-950/80 overflow-hidden"
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                      }}
                      onMouseLeave={() => setMousePos(null)}
                    >
                      <canvas ref={marketCanvasRef} className="absolute inset-0 w-full h-full cursor-crosshair"></canvas>
                    </div>
                  </div>
                  
                  <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-nebula-950/40 flex-1">
                    <div className="bg-nebula-900/60 p-5 rounded-xl border border-nebula-border relative overflow-hidden backdrop-blur-sm">
                      {(!activeAssetObj.type.includes('promax') && !isMarketOpen) && (
                        <div className="absolute inset-0 bg-nebula-950/90 z-10 flex flex-col items-center justify-center backdrop-blur-md"><Store className="w-10 h-10 text-rose-500 mb-2" /><span className="text-rose-400 font-bold">Mercato Chiuso</span><span className="text-xs text-slate-400 mt-1">Apertura: 08:00 - 19:30</span></div>
                      )}
                      {(activeAssetObj.type.includes('promax') && (gameTime?.hours < 5 || gameTime?.hours >= 22)) && (
                        <div className="absolute inset-0 bg-nebula-950/90 z-10 flex flex-col items-center justify-center backdrop-blur-md"><Store className="w-10 h-10 text-purple-500 mb-2" /><span className="text-purple-400 font-bold">Mercato PRO MAX Chiuso</span><span className="text-xs text-slate-400 mt-1">Apertura: 05:00 - 22:00</span></div>
                      )}
                      <div className="flex justify-between items-center mb-4 text-xs font-mono"><span className="text-slate-400 uppercase">Cassa Disponibile:</span><span className="text-white font-bold">{formatCurrency(portfolio.cash)}</span></div>
                      <div className="mb-4"><input type="number" step="any" value={tradeQty} min="0.01" onChange={(e) => setTradeQty(e.target.value)} className="w-full bg-nebula-950/80 border border-nebula-border rounded-xl px-4 py-3 font-mono text-white text-lg font-bold outline-none focus:border-cyan-500" /></div>
                      <div className="flex justify-between items-center font-mono text-sm mb-6 pb-4 border-b border-nebula-border/50"><span className="text-slate-400">Controvalore:</span><span className="font-bold text-white">{formatCurrency((parseFloat(tradeQty)||0) * activeAssetObj.currentPrice)}</span></div>
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => executeOrder('BUY')} className="py-3 bg-emerald-600 hover:bg-emerald-500 transition-colors text-white rounded-xl font-bold uppercase tracking-wider">Compra</button>
                        <button onClick={() => executeOrder('SELL')} className="py-3 bg-rose-600 hover:bg-rose-500 transition-colors text-white rounded-xl font-bold uppercase tracking-wider">Vendi</button>
                      </div>
                    </div>
                    <div className="bg-nebula-900/60 p-5 rounded-xl border border-nebula-border backdrop-blur-sm">
                      <h3 className="text-sm font-semibold text-white mb-4">La tua Posizione</h3>
                      <div className="space-y-4 font-mono text-sm">
                        <div className="flex justify-between border-b border-nebula-border/50 pb-2"><span className="text-slate-400">Asset Posseduti</span><span className="text-white font-bold">{portfolio.holdings[activeAssetObj?.ticker]?.shares || 0}</span></div>
                        <div className="flex justify-between border-b border-nebula-border/50 pb-2"><span className="text-slate-400">Prezzo Medio</span><span className="text-white">{portfolio.holdings[activeAssetObj?.ticker] ? formatCurrency(portfolio.holdings[activeAssetObj.ticker].avgPrice) : '€0.00'}</span></div>
                        <div className="flex justify-between pt-2"><span className="text-slate-400">P&L</span><span className={`font-bold ${portfolio.holdings[activeAssetObj?.ticker] && (activeAssetObj.currentPrice - portfolio.holdings[activeAssetObj.ticker].avgPrice) * portfolio.holdings[activeAssetObj.ticker].shares >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{portfolio.holdings[activeAssetObj?.ticker] ? formatCurrency((activeAssetObj.currentPrice - portfolio.holdings[activeAssetObj.ticker].avgPrice) * portfolio.holdings[activeAssetObj.ticker].shares) : '€0.00'}</span></div>
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
              <div className="flex space-x-3">
                <button onClick={() => setDepositModal(true)} className="px-4 py-2 bg-emerald-600 border border-emerald-500/50 text-white rounded-lg text-sm font-bold hover:bg-emerald-500 flex items-center"><ArrowRightCircle className="w-4 h-4 mr-2"/> Deposita</button>
                <button onClick={() => setDiscordModal({open: true, type: 'WITHDRAW'})} className="px-4 py-2 bg-nebula-800 border border-nebula-border text-white rounded-lg text-sm font-bold hover:bg-nebula-700 flex items-center"><Landmark className="w-4 h-4 mr-2"/> Preleva Denaro</button>
              </div>
            </div>
            <div className="bg-nebula-900/60 rounded-xl overflow-hidden border border-nebula-border backdrop-blur-md">
              <table className="w-full text-left font-mono text-xs md:text-sm">
                <thead><tr className="bg-nebula-900 border-b border-nebula-border text-slate-400 uppercase"><th className="p-4">Asset</th><th className="p-4">Qty</th><th className="p-4">PMD</th><th className="p-4">Attuale</th><th className="p-4">P&L</th><th className="p-4 text-right">Azione</th></tr></thead>
                <tbody className="divide-y divide-nebula-border/50 text-slate-200">
                  {Object.keys(portfolio.holdings || {}).map(ticker => {
                    const h = portfolio.holdings[ticker], asset = assets[ticker]; if(!asset) return null;
                    const pnl = (h.shares * asset.currentPrice) - (h.shares * h.avgPrice);
                    return (
                      <tr key={ticker} className="hover:bg-nebula-800/50 transition-colors">
                        <td className="p-4 font-bold text-white flex items-center space-x-2"><span>{asset.ticker}</span></td><td className="p-4">{h.shares}</td><td className="p-4 text-slate-400">{formatCurrency(h.avgPrice)}</td><td className="p-4 text-white">{formatCurrency(asset.currentPrice)}</td>
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
                    <div className="flex items-baseline space-x-2">
                      <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.sender}`} className="w-5 h-5 rounded-full" alt="PFP" />
                      <span className="text-xs font-bold" style={{color: m.color}}>{m.sender}</span>
                      <span className="text-[10px] text-slate-500">{m.time}</span>
                    </div>
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
              <p className="text-slate-400">Accedi a strumenti istituzionali, algoritmi avanzati e mercati esclusivi per dominare il terminale.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="bg-nebula-900/60 backdrop-blur-md p-8 border border-amber-500/30 rounded-2xl relative flex flex-col shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <h3 className="text-2xl font-black text-amber-500 mb-2 flex items-center"><Crown className="w-6 h-6 mr-2"/> PRO</h3>
                <div className="text-4xl font-mono text-white mb-6 font-bold">€20.000<span className="text-sm text-slate-500 font-sans font-normal">/Lifetime</span></div>
                <ul className="space-y-4 mb-8 flex-1 text-slate-300">
                  <li className="flex items-center"><Check className="w-5 h-5 text-amber-500 mr-3"/> Algoritmo Drift Positivo sugli asset</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-amber-500 mr-3"/> Accesso alle Azioni e Crypto PRO</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-amber-500 mr-3"/> Alert Notifiche di Prezzo</li>
                </ul>
                {!user.isPro ? (
                  <button onClick={() => buyTier('PRO', 20000)} className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity text-lg">Acquista Ora</button>
                ) : (
                  <button disabled className="w-full py-4 bg-amber-900/50 text-amber-500 font-bold rounded-xl cursor-not-allowed">Attivo</button>
                )}
                
                <div className="mt-6 pt-6 border-t border-nebula-border/50">
                  <p className="text-xs text-slate-500 mb-2">Oppure usa un codice licenza PRO:</p>
                  <div className="flex space-x-2">
                    <input type="text" id="pro-key-input" placeholder="NBL-PRO-XXXX" className="flex-1 bg-nebula-950 border border-amber-500/50 rounded-lg px-4 py-2 text-white font-mono uppercase focus:outline-none focus:border-amber-400" />
                    <button onClick={() => socket.emit('redeem_key', { userId: user.id, key: document.getElementById('pro-key-input').value.trim().toUpperCase() })} className="px-4 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-500">Riscatta</button>
                  </div>
                </div>
              </div>

              <div className="bg-nebula-900/60 backdrop-blur-md p-8 border border-purple-500/50 rounded-2xl relative flex flex-col shadow-[0_0_40px_rgba(168,85,247,0.15)] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-transparent pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
                <h3 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-rose-400 animate-pulse text-transparent bg-clip-text mb-2 flex items-center z-10"><Zap className="w-6 h-6 mr-2 text-purple-400"/> PRO MAX</h3>
                <div className="text-4xl font-mono text-white mb-6 font-bold z-10">€35.000<span className="text-sm text-slate-500 font-sans font-normal">/Lifetime</span></div>
                <ul className="space-y-4 mb-8 flex-1 text-slate-300 z-10">
                  <li className="flex items-center"><Check className="w-5 h-5 text-purple-400 mr-3"/> Include tutti i vantaggi PRO</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-purple-400 mr-3"/> Sblocco Mercato PRO MAX (05:00 - 22:00)</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-purple-400 mr-3"/> Algoritmo di Crescita Estrema</li>
                </ul>
                {!user.isProMax ? (
                  <button onClick={() => buyTier('PROMAX', 35000)} className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.5)] hover:opacity-90 transition-opacity text-lg z-10">Ascendi a MAX</button>
                ) : (
                  <button disabled className="w-full py-4 bg-purple-900/50 text-purple-400 font-bold rounded-xl cursor-not-allowed z-10 border border-purple-500/30">Livello Massimo Raggiunto</button>
                )}

                <div className="mt-6 pt-6 border-t border-purple-500/30 z-10">
                  <p className="text-xs text-slate-500 mb-2">Codice licenza PRO MAX:</p>
                  <div className="flex space-x-2">
                    <input type="text" id="promax-key-input" placeholder="MAX-XXXX" className="flex-1 bg-nebula-950 border border-purple-500/50 rounded-lg px-4 py-2 text-white font-mono uppercase focus:outline-none focus:border-purple-400" />
                    <button onClick={() => socket.emit('redeem_key', { userId: user.id, key: document.getElementById('promax-key-input').value.trim().toUpperCase() })} className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500">Riscatta</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TAB SETTINGS */}
          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${ui.activeTab === 'settings' ? 'flex' : 'hidden'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Impostazioni</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
              <div className="bg-nebula-900/60 p-6 border border-nebula-border rounded-xl backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-nebula-border/50 pb-2">Profilo e Personalizzazione</h3>
                <label className="block text-xs text-slate-400 mb-1">ID Discord</label>
                <input type="text" disabled value={user.id} className="w-full bg-nebula-950/50 border border-nebula-border rounded-lg px-3 py-2 text-slate-400 font-mono mb-4 cursor-not-allowed" />
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><label className="block text-xs text-slate-400 mb-1">Colore Nome</label><input type="color" value={user.colorName} onChange={e => { setUser(p => ({...p, colorName: e.target.value})); socket.emit('user_login', {...user, colorName: e.target.value}) }} className="h-8 w-full rounded bg-transparent border border-nebula-border cursor-pointer" /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Colore Testo</label><input type="color" value={user.colorText} onChange={e => { setUser(p => ({...p, colorText: e.target.value})); socket.emit('user_login', {...user, colorText: e.target.value}) }} className="h-8 w-full rounded bg-transparent border border-nebula-border cursor-pointer" /></div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 flex items-center"><Image className="w-3 h-3 mr-1"/> Sfondo Terminale (URL Immagine)</label>
                  <input type="url" value={user.bgImage} onChange={e => { setUser(p => ({...p, bgImage: e.target.value})); socket.emit('user_login', {...user, bgImage: e.target.value}) }} placeholder="https://..." className="w-full bg-nebula-950/80 border border-nebula-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500" />
                </div>
              </div>

              {/* Price Alerts per utenti PRO/PROMAX */}
              {user.isPro && (
                  <div className="bg-nebula-900/60 p-6 border border-amber-500/30 rounded-xl backdrop-blur-md">
                      <h3 className="text-lg font-bold text-amber-500 mb-4 border-b border-amber-500/30 pb-2 flex items-center"><Bell className="w-5 h-5 mr-2"/> Notifiche di Prezzo (PRO)</h3>
                      <p className="text-xs text-slate-400 mb-4">Imposta un target e ricevi un avviso sonoro se il prezzo supera la soglia.</p>
                      
                      <div className="space-y-3 mb-6">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Asset Posseduto</label>
                            <select value={newAlert.ticker} onChange={e => setNewAlert({...newAlert, ticker: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none">
                                <option value="">Seleziona...</option>
                                {Object.keys(portfolio.holdings || {}).map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Target Price (€)</label>
                            <input type="number" step="any" value={newAlert.target} onChange={e => setNewAlert({...newAlert, target: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">URL Audio MP3 (Opzionale)</label>
                            <input type="text" placeholder="Lascia vuoto per standard" value={newAlert.mp3} onChange={e => setNewAlert({...newAlert, mp3: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono text-xs outline-none" />
                        </div>
                        <button onClick={() => {
                            if(!newAlert.ticker || !newAlert.target) return showToast("Compila Asset e Target", "error");
                            setPriceAlerts(p => [...p, { id: Date.now(), ticker: newAlert.ticker, target: parseFloat(newAlert.target), mp3: newAlert.mp3, triggered: false }]);
                            setNewAlert({ticker: '', target: '', mp3: ''});
                            showToast("Allarme impostato!", "success");
                        }} className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-sm transition-colors">Aggiungi Alert</button>
                      </div>

                      <div className="space-y-2">
                          {priceAlerts.map(alert => (
                              <div key={alert.id} className="flex justify-between items-center bg-nebula-950 p-2 rounded border border-nebula-border text-xs">
                                  <span className="font-bold text-white">{alert.ticker}</span>
                                  <span className="font-mono text-slate-300">&gt;= {formatCurrency(alert.target)}</span>
                                  {alert.triggered ? (
                                      <span className="text-emerald-500 font-bold">Raggiunto</span>
                                  ) : (
                                      <button onClick={() => setPriceAlerts(p => p.filter(a => a.id !== alert.id))} className="text-rose-500 hover:text-rose-400"><Trash2 className="w-4 h-4"/></button>
                                  )}
                              </div>
                          ))}
                          {priceAlerts.length === 0 && <div className="text-xs text-slate-500 text-center">Nessun alert attivo.</div>}
                      </div>
                  </div>
              )}
            </div>
          </div>

          {/* TAB ADMIN */}
          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${ui.activeTab === 'admin' && user.isAdmin ? 'flex' : 'hidden'}`}>
            <h2 className="text-2xl font-black text-rose-500 mb-6 flex items-center"><UserCog className="w-6 h-6 mr-3" /> Dev / Admin Panel</h2>
            
            <div className="bg-nebula-900/60 p-6 border border-cyan-900/50 rounded-xl backdrop-blur-md mb-6 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <h3 className="text-lg font-bold text-white mb-2 border-b border-cyan-900/50 pb-2 flex items-center"><Globe className="w-5 h-5 mr-2 text-cyan-500"/> Salvataggio e Ripristino Dati (Backup)</h3>
              <p className="text-xs text-slate-400 mb-4">Usa queste funzioni prima e dopo aver riavviato/aggiornato il backend su Render per non perdere i soldi degli utenti.</p>
              <div className="flex space-x-4">
                <button onClick={() => socket.emit('admin_fetch_db')} className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-sm flex items-center justify-center"><Download className="w-4 h-4 mr-2"/> 1. Scarica Dati</button>
                <label className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-sm flex items-center justify-center cursor-pointer">
                  <Upload className="w-4 h-4 mr-2"/> 2. Ripristina Dati
                  <input type="file" accept=".json" className="hidden" onChange={handleRestoreDb} />
                </label>
              </div>
            </div>

            {/* SEZIONE GESTIONE FONDI TASSE */}
            {dbBackupInfo && dbBackupInfo.funds && (
            <div className="bg-nebula-900/60 p-6 border border-emerald-900/50 rounded-xl backdrop-blur-md mb-6 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <h3 className="text-lg font-bold text-white mb-2 border-b border-emerald-900/50 pb-2 flex items-center"><Landmark className="w-5 h-5 mr-2 text-emerald-500"/> Gestione Fondi Tassazione (26%)</h3>
                <p className="text-xs text-slate-400 mb-6">Il 20% dei prelievi va allo Stato. Il 6% viene diviso tra le aziende da cui l'utente ha tratto profitto.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-nebula-950 p-4 rounded-lg border border-emerald-500/30 flex justify-between items-center">
                        <div>
                            <div className="text-[10px] text-emerald-500 uppercase font-bold tracking-wider mb-1">Fondo Statale</div>
                            <div className="text-2xl font-mono text-white">{formatCurrency(dbBackupInfo.funds.state)}</div>
                        </div>
                        <button onClick={() => socket.emit('admin_withdraw_fund', { target: 'state' })} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded">Preleva</button>
                    </div>
                    
                    <div className="bg-nebula-950 p-4 rounded-lg border border-cyan-500/30">
                        <div className="text-[10px] text-cyan-500 uppercase font-bold tracking-wider mb-3">Fondi Aziendali (Da erogare)</div>
                        <div className="space-y-2 max-h-32 overflow-y-auto custom-scroll pr-2">
                            {Object.entries(dbBackupInfo.funds.companies).map(([ticker, amount]) => amount > 0 && (
                                <div key={ticker} className="flex justify-between items-center text-sm border-b border-nebula-border/50 pb-2">
                                    <span className="font-bold text-white">{ticker}</span>
                                    <div className="flex items-center space-x-3">
                                        <span className="font-mono text-slate-300">{formatCurrency(amount)}</span>
                                        <button onClick={() => socket.emit('admin_withdraw_fund', { target: ticker })} className="px-2 py-1 bg-cyan-600/30 text-cyan-400 hover:bg-cyan-600/50 text-[10px] rounded">Preleva</button>
                                    </div>
                                </div>
                            ))}
                            {Object.values(dbBackupInfo.funds.companies).every(v => v === 0) && <div className="text-xs text-slate-500">Nessun fondo aziendale accumulato.</div>}
                        </div>
                    </div>
                </div>
            </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="bg-nebula-900/60 p-6 border border-rose-900/50 rounded-xl backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-rose-900/50 pb-2">Controllo Tempo Server</h3>
                <div className="flex items-center space-x-4">
                  <div><label className="text-xs text-slate-400 block mb-1">Ore (0-23)</label><input type="number" id="adm-hh" defaultValue={gameTime?.hours} className="bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono w-20 outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Minuti (0-59)</label><input type="number" id="adm-mm" defaultValue={gameTime?.minutes} className="bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono w-20 outline-none" /></div>
                  <div className="flex items-end h-full pt-5"><button onClick={() => socket.emit('admin_action', { type: 'time', hh: parseInt(document.getElementById('adm-hh').value), mm: parseInt(document.getElementById('adm-mm').value) })} className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded">Forza</button></div>
                </div>
              </div>

              <div className="bg-nebula-900/60 p-6 border border-rose-900/50 rounded-xl backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-rose-900/50 pb-2">Modifica Asset (Live)</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Seleziona Asset</label><select value={adminPriceEdit.ticker} onChange={e => setAdminPriceEdit({ ...adminPriceEdit, ticker: e.target.value })} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none">{Object.keys(assets || {}).map(k => <option key={k} value={k}>{k}</option>)}</select></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Nuovo Prezzo (€)</label><input type="number" step="any" id="adm-prc" className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Volatilità (Es. 0.02)</label><input type="number" step="any" value={adminPriceEdit.vol} onChange={e=>setAdminPriceEdit({...adminPriceEdit, vol: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono outline-none" placeholder="Lascia vuoto per non mod." /></div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => {
                      if(document.getElementById('adm-prc').value) socket.emit('admin_action', { type: 'price', ticker: adminPriceEdit.ticker, price: parseFloat(document.getElementById('adm-prc').value) });
                      if(adminPriceEdit.vol) socket.emit('admin_action', { type: 'edit_asset', ticker: adminPriceEdit.ticker, updates: { vol: adminPriceEdit.vol } });
                  }} className="col-span-2 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-xs">Aggiorna Asset</button>
                  <button onClick={() => socket.emit('admin_action', { type: 'reset_chart', ticker: adminPriceEdit.ticker })} className="col-span-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded text-xs flex items-center justify-center"><RefreshCw className="w-3 h-3 mr-1"/> Reset</button>
                  <button onClick={() => { if(window.confirm('Cancellare asset e rubare soldi agli utenti?')) socket.emit('admin_action', { type: 'delete_asset', ticker: adminPriceEdit.ticker })}} className="col-span-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-xs flex items-center justify-center"><Trash2 className="w-3 h-3 mr-1"/> Elimina</button>
                </div>
              </div>

              <div className="bg-nebula-900/60 p-6 border border-cyan-900/50 rounded-xl lg:col-span-2 backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-cyan-900/50 pb-2 flex items-center"><Search className="w-5 h-5 mr-2 text-cyan-500"/> Ispezione Account Utente</h3>
                <div className="flex space-x-4 mb-4">
                  <input type="text" value={adminUserQuery} onChange={e => setAdminUserQuery(e.target.value)} placeholder="ID Utente Discord (es. 123456789)" className="flex-1 bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono outline-none" />
                  <button onClick={() => socket.emit('admin_fetch_user', adminUserQuery.trim())} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded">Cerca Utente</button>
                </div>

                {adminFetchedUser && (
                  <div className="bg-nebula-950/80 p-5 rounded-xl border border-cyan-500/30 text-sm mt-4">
                    <div className="flex items-center space-x-4 mb-4 border-b border-nebula-border/50 pb-4">
                      <img src={adminFetchedUser.avatar || `https://ui-avatars.com/api/?name=${adminFetchedUser.name}`} className="w-12 h-12 rounded-full border border-nebula-border" alt="Avatar" />
                      <div>
                        <div className="font-bold text-xl" style={{color: adminFetchedUser.colorName || '#fff'}}>{adminFetchedUser.name}</div>
                        <div className="text-xs text-slate-500 font-mono">ID: {adminFetchedUser.id}</div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="text-2xl font-mono font-black text-emerald-400">{formatCurrency(adminFetchedUser.cash)}</div>
                        <div className="text-[10px] uppercase text-slate-500 font-bold">Saldo Liquido</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className={`p-2 rounded text-center text-xs font-bold border ${adminFetchedUser.isProMax ? 'bg-purple-900/20 border-purple-500/50 text-purple-400' : 'bg-nebula-900 border-nebula-border text-slate-500'}`}>PRO MAX: {adminFetchedUser.isProMax ? 'ATTIVO' : 'NO'}</div>
                      <div className={`p-2 rounded text-center text-xs font-bold border ${adminFetchedUser.isPro ? 'bg-amber-900/20 border-amber-500/50 text-amber-500' : 'bg-nebula-900 border-nebula-border text-slate-500'}`}>PRO: {adminFetchedUser.isPro ? 'ATTIVO' : 'NO'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-3 uppercase font-bold tracking-wider">Portafoglio Asset ({Object.keys(adminFetchedUser.holdings || {}).length})</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(adminFetchedUser.holdings || {}).map(([t, h]) => (
                          <div key={t} className="bg-nebula-900 p-3 rounded-lg border border-nebula-border flex justify-between items-center">
                            <span className="font-bold text-white text-sm">{t}</span>
                            <span className="font-mono text-cyan-400">{h.shares} <span className="text-[10px] text-slate-500">pz</span></span>
                          </div>
                        ))}
                        {Object.keys(adminFetchedUser.holdings || {}).length === 0 && <div className="text-xs text-slate-500 col-span-4">Nessun asset posseduto.</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-nebula-900/60 p-6 border border-amber-900/50 rounded-xl backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-amber-900/50 pb-2">Forza Abbonamento Utente</h3>
                <div className="space-y-4">
                  <div><label className="text-xs text-slate-400">ID Utente Discord</label><input type="text" id="adm-tier-uid" className="w-full bg-nebula-900 border border-nebula-border rounded px-3 py-2 text-white font-mono outline-none mt-1" /></div>
                  <div>
                    <label className="text-xs text-slate-400">Livello Abbonamento</label>
                    <select id="adm-tier-sel" className="w-full bg-nebula-900 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none mt-1">
                      <option value="STANDARD">Standard</option>
                      <option value="PRO">PRO</option>
                      <option value="PROMAX">PRO MAX</option>
                    </select>
                  </div>
                  <button onClick={() => socket.emit('admin_action', { type: 'set_tier', userId: document.getElementById('adm-tier-uid').value, tier: document.getElementById('adm-tier-sel').value })} className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded">Applica Abbonamento</button>
                </div>
              </div>

              <div className="bg-nebula-900/60 p-6 border border-rose-900/50 rounded-xl backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-rose-900/50 pb-2">Banca Centrale: Forza Saldo Utente</h3>
                <div className="space-y-4">
                  <div><label className="text-xs text-slate-400">ID Utente Discord</label><input type="text" value={adminCash.uid} onChange={e => setAdminCash({...adminCash, uid: e.target.value})} className="w-full bg-nebula-900 border border-nebula-border rounded px-3 py-2 text-white font-mono outline-none mt-1" /></div>
                  
                  <div className="flex space-x-2">
                    <div className="flex-1"><label className="text-xs text-slate-400">Azione</label><select value={adminCash.action} onChange={e => setAdminCash({...adminCash, action: e.target.value})} className="w-full bg-nebula-900 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none mt-1"><option value="add">Aggiungi (+)</option><option value="sub">Rimuovi (-)</option><option value="set">Imposta a (=)</option><option value="reset">Reset (100€)</option></select></div>
                    <div className="flex-1"><label className="text-xs text-slate-400">Importo (€)</label><input type="number" step="any" disabled={adminCash.action === 'reset'} value={adminCash.amount} onChange={e => setAdminCash({...adminCash, amount: e.target.value})} className="w-full bg-nebula-900 border border-nebula-border rounded px-3 py-2 text-white font-mono outline-none mt-1 disabled:opacity-50" /></div>
                  </div>
                  
                  <button onClick={() => socket.emit('admin_action', { type: 'cash', userId: adminCash.uid, action: adminCash.action, amount: parseFloat(adminCash.amount) })} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded">Applica Transazione</button>
                </div>
              </div>

              <div className="bg-nebula-900/60 p-6 border border-emerald-900/50 rounded-xl lg:col-span-2 backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-emerald-900/50 pb-2">Convalida Prelievi</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Codice di Prelievo (Fornito dall'utente o generato dai fondi)</label>
                    <div className="flex space-x-2">
                      <input type="text" value={adminCodeInput} onChange={e => setAdminCodeInput(e.target.value)} placeholder="WTH-XXXXX / FND-XXXX" className="flex-1 bg-nebula-950 border border-emerald-900/50 rounded px-3 py-2 text-white font-mono uppercase outline-none" />
                      <button onClick={() => socket.emit('admin_verify_code', adminCodeInput.trim().toUpperCase())} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded"><Key className="w-4 h-4"/></button>
                    </div>
                  </div>
                  
                  {adminValidator && (
                    <div className="mt-4 p-4 border border-emerald-500/30 bg-emerald-900/20 rounded-lg">
                      <h4 className="font-black text-emerald-400 mb-2 flex items-center"><Check className="w-4 h-4 mr-2"/> CHIAVE AUTENTICA</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <span className="text-slate-400">Utente/Ente:</span><span className="text-white font-bold">{adminValidator.name}</span>
                        <span className="text-slate-400">Da erogare (Netto):</span><span className="text-white font-bold text-lg">{formatCurrency(adminValidator.amount)}</span>
                        <span className="text-slate-400">Data:</span><span className="text-white">{adminValidator.date}</span>
                      </div>
                      <p className="mt-3 text-xs text-emerald-300">I soldi sono già stati scalati dal conto. Eroga il pagamento reale in RP.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-nebula-900/60 p-6 border border-rose-900/50 rounded-xl lg:col-span-2 backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-rose-900/50 pb-2">Aggiunta Nuove Compagnie / Crypto (IPO)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div><label className="text-xs text-slate-400 block mb-1">Mercato</label><select value={newAsset.type} onChange={e => setNewAsset({...newAsset, type: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none"><option value="stocks">Azioni Standard</option><option value="crypto">Crypto Standard</option><option value="promax_stocks">Azioni PRO MAX</option><option value="promax_crypto">Crypto PRO MAX</option></select></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Ticker (Es. AAPL)</label><input type="text" maxLength="5" value={newAsset.ticker} onChange={e => setNewAsset({...newAsset, ticker: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm uppercase outline-none" /></div>
                  <div className="md:col-span-2"><label className="text-xs text-slate-400 block mb-1">Nome Completo</label><input type="text" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  
                  <div><label className="text-xs text-slate-400 block mb-1">Prezzo Iniziale (€)</label><input type="number" step="0.1" value={newAsset.price} onChange={e => setNewAsset({...newAsset, price: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Volatilità (Es. 0.02)</label><input type="number" step="0.01" value={newAsset.vol} onChange={e => setNewAsset({...newAsset, vol: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Settore</label><input type="text" value={newAsset.sector} onChange={e => setNewAsset({...newAsset, sector: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Market Cap</label><input type="text" value={newAsset.mcap} onChange={e => setNewAsset({...newAsset, mcap: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  
                  <div><label className="text-xs text-slate-400 block mb-1">CEO</label><input type="text" value={newAsset.ceo} onChange={e => setNewAsset({...newAsset, ceo: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Fondazione</label><input type="text" value={newAsset.founded} onChange={e => setNewAsset({...newAsset, founded: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Dipendenti</label><input type="text" value={newAsset.employees} onChange={e => setNewAsset({...newAsset, employees: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Dividendo</label><input type="text" value={newAsset.dividend} onChange={e => setNewAsset({...newAsset, dividend: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  
                  <div className="md:col-span-4 flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                    <div className="flex-1"><label className="text-xs text-slate-400 block mb-1">Descrizione Lunga</label><input type="text" value={newAsset.desc} onChange={e => setNewAsset({...newAsset, desc: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                    <div className="flex items-center space-x-2 md:pt-4">
                      <input type="checkbox" id="isProTick" checked={newAsset.isPro} onChange={e => setNewAsset({...newAsset, isPro: e.target.checked})} className="w-4 h-4 cursor-pointer" />
                      <label htmlFor="isProTick" className="text-sm font-bold text-amber-500 cursor-pointer">Segna come PRO</label>
                    </div>
                    <div className="flex items-center space-x-2 md:pt-4">
                      <input type="checkbox" id="isProMaxTick" checked={newAsset.isProMax} onChange={e => setNewAsset({...newAsset, isProMax: e.target.checked, isPro: e.target.checked ? true : newAsset.isPro})} className="w-4 h-4 cursor-pointer" />
                      <label htmlFor="isProMaxTick" className="text-sm font-bold text-purple-400 cursor-pointer">Segna come PRO MAX</label>
                    </div>
                  </div>
                </div>
                <button onClick={() => {
                  if (!newAsset.ticker || !newAsset.name) return showToast("Compila almeno Ticker e Nome.", "error");
                  socket.emit('admin_action', { type: 'ipo', asset: newAsset });
                  showToast("Lancio IPO effettuato sul server centrale.", "success");
                }} className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors">Aggiungi Definitivamente al Mercato (IPO)</button>
              </div>

            </div>
          </div>

        </main>
      </div>

      {depositModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-nebula-900/90 border border-emerald-500/50 rounded-2xl max-w-sm w-full p-6 relative">
            <button onClick={() => setDepositModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            <div className="text-center mb-6">
              <ArrowRightCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-xl font-bold text-white">Deposita Fondi</h3>
            </div>
            <div className="space-y-4 text-sm text-slate-300">
                <p className="font-bold text-emerald-400">Segui questi step su Discord per aggiungere fondi:</p>
                <ol className="list-decimal list-inside space-y-2">
                    <li>Vai nel canale <span className="font-mono bg-nebula-950 px-1 rounded">#cmd</span> su Urban RP.</li>
                    <li>Invia il comando <span className="font-mono text-cyan-400 bg-nebula-950 px-1 rounded">/bonifico</span> inviando la somma che vuoi depositare a <strong>@NebulaStocks</strong>.</li>
                    <li>Attendi che lo staff approvi e accrediti la somma sul tuo terminale. (I tempi variano in base alla presenza in città).</li>
                </ol>
            </div>
          </div>
        </div>
      )}

      {discordModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-nebula-900/90 border border-cyan-500/50 rounded-2xl max-w-sm w-full p-6 relative">
            <button onClick={() => setDiscordModal({open: false, type: '', code: ''})} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            <div className="text-center mb-6">
              <Wallet className="w-10 h-10 text-cyan-400 mx-auto mb-2" />
              <h3 className="text-xl font-bold text-white">Prelievo Denaro</h3>
            </div>
            {discordModal.type === 'WITHDRAW' ? (
              <>
                <p className="text-xs text-slate-400 mb-4 text-center">Inserisci l'importo Lordo da prelevare. <br/><span className="text-rose-400 font-bold">Nota: Verrà applicata una tassazione del 26%.</span></p>
                <input type="number" id="dm-amount" defaultValue="100" min="1" step="any" className="w-full bg-nebula-950 border border-nebula-border rounded-lg py-3 px-4 text-white font-mono font-bold text-lg mb-4 outline-none focus:border-cyan-500" />
                <button onClick={requestWithdrawal} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-colors">Genera Chiave di Prelievo</button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-sm text-emerald-400 mb-4 font-bold">Richiesta elaborata.</p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4 text-slate-300">
                    <span className="text-left">Prelievo Lordo:</span> <span className="text-right">{formatCurrency(discordModal.netAmount + discordModal.taxAmount)}</span>
                    <span className="text-left text-rose-400">Tasse (-26%):</span> <span className="text-right text-rose-400">-{formatCurrency(discordModal.taxAmount)}</span>
                    <span className="text-left font-bold text-white border-t border-nebula-border pt-1">Importo Netto:</span> <span className="text-right font-bold text-emerald-400 border-t border-nebula-border pt-1">{formatCurrency(discordModal.netAmount)}</span>
                </div>
                <div className="bg-black border border-nebula-border p-4 rounded-xl mb-4">
                  <p className="text-xs text-slate-500 mb-1">La tua Chiave di Prelievo:</p>
                  <p className="font-mono text-xl text-white tracking-widest">{discordModal.code}</p>
                </div>
                <p className="text-xs text-slate-400">Invia questa chiave in assistenza su Discord per ricevere i fondi netti in RP.</p>
              </div>
            )}
          </div>
        </div>
      )}

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
