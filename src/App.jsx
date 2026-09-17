import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart2, Wallet, MessageCircle, Settings, Lock, UserCog, 
  Crown, Factory, Coins, Globe, Plus, Send, X, Check, 
  LineChart, Store, Clock, Users, Building, Percent, Search,
  LogOut, Image, Zap, Trash2, RefreshCw, Key, Download, Upload,
  Landmark, ArrowRightCircle, AlertTriangle, ScrollText, ChevronDown,
  TrendingUp, TrendingDown, Target, Maximize, Minimize, Newspaper, Gavel, FileCode2, Snowflake
} from 'lucide-react';
import { io } from 'socket.io-client';

const DISCORD_CLIENT_ID = "1544048974175019058";
// MODIFICA QUI IL LINK DEL TUO BACKEND QUANDO CAMBIA SU CLOUDFLARE
const BACKEND_URL = "https://asin-var-updated-activists.trycloudflare.com"; 

let socket;

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [user, setUser] = useState({ id: '', name: '', avatar: '', colorName: '#ffffff', colorText: '#cbd5e1', isPro: false, isProMax: false, bgImage: '', isAdmin: false, isFinanza: false, isFrozen: false, hasPaidAccess: false, withdrawalsToday: 0, limitOrders: [], loan: 0, proExpireDate: null });
  const [portfolio, setPortfolio] = useState({ cash: 100, holdings: {} }); 
  
  const [assets, setAssets] = useState({});
  const [gameTime, setGameTime] = useState({ day: 1, hours: 9, minutes: 0, isExtraordinary: false });
  const [marketNews, setMarketNews] = useState([]);
  const [globalConfig, setGlobalConfig] = useState({ dailyNews: "Mercati Aperti", globalVolMult: 1.0, globalDrift: 0.0 });
  const [chatHistory, setChatHistory] = useState({ global: [] });
  const [dmRooms, setDmRooms] = useState([]);
  
  const [ui, setUi] = useState({ activeTab: 'markets', activeMarketType: 'stocks', activeAsset: 'SNEB', chartType: 'candle', chartZoom: 60, activeChatRoom: 'global', orderType: 'live' });
  const [tradeQty, setTradeQty] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');

  const [chatInput, setChatInput] = useState('');
  const [toasts, setToasts] = useState([]);
  const [resizeTrigger, setResizeTrigger] = useState(0);
  const [mousePos, setMousePos] = useState(null); 
  const [isChartFS, setIsChartFS] = useState(false);
  const [fsTradeOpen, setFsTradeOpen] = useState(false); 
  
  const [discordModal, setDiscordModal] = useState({ open: false, type: '', code: '', netAmount: 0, taxAmount: 0, rate: 0 });
  const [depositModal, setDepositModal] = useState(false);
  
  // Admin & Finanza States
  const [adminValidator, setAdminValidator] = useState(null);
  const [dbBackupInfo, setDbBackupInfo] = useState(null);
  const [adminLogs, setAdminLogs] = useState([]);
  const [adminUsersList, setAdminUsersList] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [adminCash, setAdminCash] = useState({ uid: '', amount: 100, action: 'add' });
  const [adminPriceEdit, setAdminPriceEdit] = useState({ ticker: 'SNEB', newPrice: '', vol: '', maxShares: '', maxPrice: '', minPrice: '', holdingTax: '' });
  const [adminCodeInput, setAdminCodeInput] = useState("");
  const [adminUserQuery, setAdminUserQuery] = useState("");
  const [adminFetchedUser, setAdminFetchedUser] = useState(null);
  const [adminNews, setAdminNews] = useState({ title: '', msg: '', isBull: true });
  const [adminHoldingsEdit, setAdminHoldingsEdit] = useState({ ticker: 'SNEB', action: 'add', qty: 1 });
  const [adminPromo, setAdminPromo] = useState({ tier: 'PRO', duration: 30, unit: 'days', generatedCode: '', label: '' });
  const [newAsset, setNewAsset] = useState({ type: 'stocks', ticker: '', name: '', price: 10, vol: 0.02, sector: 'Tech', mcap: '€1M', desc: '', ceo: '', founded: '', employees: '', dividend: '0.00%', isPro: false, isProMax: false, maxShares: 1000, maxPrice: 600, minPrice: 0.5, holdingTax: 0 });
  const [riskAccounts, setRiskAccounts] = useState([]);
  const [adminTickRate, setAdminTickRate] = useState(2000);
  const [adminAlgoInput, setAdminAlgoInput] = useState({ volMult: 1.0, driftOffset: 0.0 });
  const [adminAccessKey, setAdminAccessKey] = useState('');
  const [paywallKeyInput, setPaywallKeyInput] = useState('');

  const [previewPts, setPreviewPts] = useState(Array(60).fill(100));
  const previewMomentum = useRef(0);

  const marketCanvasRef = useRef(null);
  const chatScrollRef = useRef(null);
  const downloadRequestedRef = useRef(false); 

  useEffect(() => {
      const savedAsset = localStorage.getItem('nebula_selected_asset');
      if (savedAsset) setUi(p => ({ ...p, activeAsset: savedAsset }));
  }, []);

  useEffect(() => {
    socket = io(BACKEND_URL, { 
      withCredentials: true, transports: ['websocket', 'polling'], upgrade: true, reconnectionAttempts: 5, timeout: 10000
    });

    socket.on('market_init', (data) => {
      setAssets(data.assets || {}); setGameTime(data.gameTime || { day: 1, hours: 9, minutes: 0, isExtraordinary: false }); setChatHistory(prev => ({ ...prev, global: data.chat?.global || [] }));
    });
    socket.on('market_update', (data) => { setAssets(data.assets || {}); setGameTime(data.gameTime || { day: 1, hours: 9, minutes: 0, isExtraordinary: false }); });
    socket.on('market_news', (newsArray) => setMarketNews(newsArray));
    socket.on('admin_config', (cfg) => { setGlobalConfig(cfg); setAdminAlgoInput({ volMult: cfg.globalVolMult, driftOffset: cfg.globalDrift }); });

    socket.on('account_update', (acc) => {
      if (acc) { setUser(prev => ({ ...prev, ...acc })); setPortfolio({ cash: acc.cash || 0, holdings: acc.holdings || {} }); setIsAuth(true); }
    });

    socket.on('force_wallet_update', ({ userId, acc }) => {
      setUser(current => {
        if(current.id === userId) { setPortfolio({ cash: acc.cash, holdings: acc.holdings }); return { ...current, ...acc }; } return current;
      });
      setAdminFetchedUser(prev => { if(prev && prev.id === userId) return { ...prev, ...acc }; return prev; });
    });

    socket.on('admin_user_data', (data) => { if(data) { setAdminFetchedUser(data); showToast("Dati utente recuperati", "success"); } else { setAdminFetchedUser(null); showToast("Utente non trovato", "error"); } });

    socket.on('admin_db_data', (data) => {
      setDbBackupInfo(data); 
      if (downloadRequestedRef.current) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
        a.download = `nebula_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click(); URL.revokeObjectURL(url); downloadRequestedRef.current = false; 
      }
    });
    
    socket.on('admin_logs_data', (logs) => { setAdminLogs(logs.reverse()); });
    socket.on('admin_risk_accounts_data', (data) => setRiskAccounts(data));
    socket.on('admin_users_list', (list) => setAdminUsersList(list));
    socket.on('chat_update', ({ room, chat }) => { setChatHistory(prev => ({ ...prev, [room]: chat })); });
    socket.on('toast', ({ msg, type }) => showToast(msg, type));
    
    socket.on('admin_promo_generated', ({ code, label }) => {
        setAdminPromo(p => ({ ...p, generatedCode: code, label }));
        showToast(`Codice Generato (${label})`, 'success');
    });
    
    socket.on('admin_access_key_generated', (key) => {
        setAdminAccessKey(key);
        showToast(`Chiave di Accesso Generata!`, 'success');
    });

    socket.on('withdrawal_success', ({ code, netAmount, taxAmount, rate }) => {
      setDiscordModal({ open: true, type: 'WITHDRAW_SUCCESS', code, netAmount, taxAmount, rate });
    });

    socket.on('admin_code_result', ({ valid, data, special, isRedeemed }) => {
      if(valid) {
        if (special) setDiscordModal({ open: true, type: 'FUND_WITHDRAWAL', code: special, netAmount: data.amount });
        else setAdminValidator({ ...data, isRedeemed });
      }
    });

    const hash = window.location.hash.substring(1); const hashParams = new URLSearchParams(hash); const accessToken = hashParams.get('access_token');
    if (accessToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
      fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(res => res.json()).then(u => { if (u.id) socket.emit('user_login', { id: u.id, name: u.username, avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : '' }); });
    }
    return () => socket.disconnect();
  }, []);

  useEffect(() => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }, [chatHistory, ui.activeChatRoom]);

  // Simulazione Live per Editor Algoritmo
  useEffect(() => {
      if (ui.activeTab !== 'admin' || !user.isAdmin) return;
      const interval = setInterval(() => {
          setPreviewPts(prev => {
              let last = prev[prev.length - 1];
              let drift = 0.0001 + adminAlgoInput.driftOffset;
              let realVol = 0.02 * adminAlgoInput.volMult;
              
              if (Math.random() < 0.15) previewMomentum.current += (Math.random() - 0.5) * realVol * 4.5;
              previewMomentum.current = (previewMomentum.current * 0.75) + ((Math.random() - 0.5) * realVol * 0.5);
              
              let next = last * (1 + drift + previewMomentum.current + (Math.random() - 0.5) * (realVol * 1.2));
              return [...prev.slice(1), Math.max(0.1, next)];
          });
      }, 300);
      return () => clearInterval(interval);
  }, [ui.activeTab, user.isAdmin, adminAlgoInput]);

  const changeTab = (tabId) => {
    setUi(p => ({...p, activeTab: tabId, activeMarketType: tabId==='markets' ? 'stocks' : p.activeMarketType}));
    if (tabId === 'admin') { 
        socket.emit('admin_fetch_db'); 
        socket.emit('admin_fetch_logs'); 
        socket.emit('admin_fetch_risk_accounts'); 
        socket.emit('admin_fetch_users_list');
    }
  };

  const selectAsset = (ticker) => {
      setUi(p => ({...p, activeAsset: ticker}));
      localStorage.setItem('nebula_selected_asset', ticker);
  };

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

  const executeOrder = (type) => { socket.emit('execute_trade', { userId: user.id, type, ticker: ui.activeAsset, qty: parseFloat(tradeQty) }); };
  
  const placeLimitOrder = (type, condition) => {
      if(!limitPrice || parseFloat(limitPrice) <= 0) return showToast("Inserisci un prezzo valido", "error");
      socket.emit('place_limit_order', { userId: user.id, type, condition, ticker: ui.activeAsset, qty: parseFloat(tradeQty), targetPrice: parseFloat(limitPrice) });
  };
  
  const cancelLimitOrder = (orderId) => { socket.emit('cancel_limit_order', { userId: user.id, orderId }); };

  const buyTier = (tier, price) => { socket.emit('buy_tier', { userId: user.id, tier, price }); };
  const sendMessage = (e) => {
    e.preventDefault(); if (!chatInput.trim()) return;
    socket.emit('send_message', { room: ui.activeChatRoom, msg: { sender: user.name, avatar: user.avatar, text: chatInput, color: user.colorName, textCol: user.colorText, time: new Date().toLocaleTimeString().slice(0,5) } });
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

  const handleDownloadLogs = () => {
    const text = adminLogs.join('\n'); const blob = new Blob([text], {type: 'text/plain'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
    a.download = `nebula_logs_${new Date().toISOString().split('T')[0]}.txt`; a.click(); URL.revokeObjectURL(url);
  };

  const handleRestoreDb = (e) => {
    const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
    reader.onload = (evt) => { try { socket.emit('admin_restore_db', JSON.parse(evt.target.result)); } catch(err) { showToast("File JSON non valido", "error"); } };
    reader.readAsText(file); e.target.value = ''; 
  };

  const showAlgoGuide = () => {
      alert("GUIDA EDITOR ALGORITMO\n\n1. Moltiplicatore Volatilità: Determina l'ampiezza degli sbalzi del mercato (es. 2.0 = sbalzi doppi, 0.5 = sbalzi dimezzati).\n\n2. Bias di Drift: Tendenza direzionale del mercato. Un valore positivo spinge il grafico sempre più in alto (Bull Market), uno negativo lo spinge gradualmente in basso (Bear Market).");
  };

  const renderAlgoPreview = () => {
      const maxVal = Math.max(...previewPts, 110); 
      const minVal = Math.min(...previewPts, 90); 
      const range = maxVal - minVal || 1;
      const svgPts = previewPts.map((d, i) => `${(i/59)*100},${100 - (((d-minVal)/range)*100)}`).join(' ');
      
      return (
          <svg className="w-full h-24 overflow-visible border border-nebula-border bg-black/50 rounded p-1" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points={svgPts} fill="none" stroke="#06b6d4" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
      );
  };

  const activeAssetObj = assets ? assets[ui.activeAsset] : null;
  const isMarketOpen = gameTime.isExtraordinary || (gameTime?.hours >= 8 && gameTime?.hours < 19) || (gameTime?.hours === 19 && gameTime?.minutes < 30);
  
  let dynamicFee = 0;
  if (activeAssetObj) {
    let tierLimit = user.isProMax ? 100000 : (user.isPro ? 50000 : 25000);
    let currentVal = (portfolio.holdings[activeAssetObj.ticker]?.shares || 0) * activeAssetObj.currentPrice;
    let newVal = currentVal + (parseFloat(tradeQty || 0) * activeAssetObj.currentPrice);
    if (newVal > tierLimit) {
      let overLimitVal = newVal - tierLimit;
      if (currentVal >= tierLimit) overLimitVal = parseFloat(tradeQty || 0) * activeAssetObj.currentPrice;
      dynamicFee = (overLimitVal / activeAssetObj.currentPrice) * 0.50;
    }
  }

  // GRAFICO RENDERER
  useEffect(() => {
    if (!activeAssetObj || ui.activeTab !== 'markets') return;
    const canvas = marketCanvasRef.current; if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect(); if(rect.width === 0 || rect.height === 0) return;

    const ctx = canvas.getContext('2d'); canvas.width = rect.width; canvas.height = rect.height; ctx.clearRect(0, 0, rect.width, rect.height);
    const data = activeAssetObj.history ? activeAssetObj.history.slice(-ui.chartZoom) : []; if(data.length === 0) return; 

    let minP = Math.min(...data.map(d => d.low)), maxP = Math.max(...data.map(d => d.high));
    const range = (maxP - minP) || 1; minP -= range * 0.1; maxP += range * 0.1; const finalRange = maxP - minP || 1;
    const plotW = rect.width - (isChartFS ? 100 : 70); const plotH = rect.height - (isChartFS ? 80 : 40); const stepX = plotW / Math.max(1, (data.length - 1));
    
    ctx.fillStyle = '#475569'; ctx.font = isChartFS ? '14px monospace' : '10px monospace';
    for(let i=0; i<=4; i++) ctx.fillText(formatCurrency(maxP - (finalRange/4)*i, true), rect.width - (isChartFS ? 90 : 65), (isChartFS ? 40 : 20) + (plotH/4)*i + 4);

    if (ui.chartType === 'candle') {
      const candleWidth = Math.max(2, (plotW / data.length) * 0.7);
      data.forEach((d, i) => {
        const x = (isChartFS ? 30 : 10) + (i * stepX);
        const yO = (isChartFS ? 40 : 20) + plotH - ((d.open - minP) / finalRange) * plotH, yC = (isChartFS ? 40 : 20) + plotH - ((d.close - minP) / finalRange) * plotH;
        const yH = (isChartFS ? 40 : 20) + plotH - ((d.high - minP) / finalRange) * plotH, yL = (isChartFS ? 40 : 20) + plotH - ((d.low - minP) / finalRange) * plotH;
        ctx.strokeStyle = ctx.fillStyle = d.close >= d.open ? '#10b981' : '#f43f5e';
        ctx.beginPath(); ctx.lineWidth = isChartFS ? 2 : 1; ctx.moveTo(x, yH); ctx.lineTo(x, yL); ctx.stroke();
        ctx.fillRect(x - candleWidth/2, Math.min(yO, yC), candleWidth, Math.max(1, Math.abs(yO - yC)));
      });
    } else {
      ctx.beginPath(); ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = isChartFS ? 3 : 2;
      data.forEach((d, i) => {
        const x = (isChartFS ? 30 : 10) + (i * stepX); const yC = (isChartFS ? 40 : 20) + plotH - ((d.close - minP) / finalRange) * plotH;
        if (i === 0) ctx.moveTo(x, yC); else ctx.lineTo(x, yC);
      });
      ctx.stroke();
    }

    if (mousePos && data.length > 0) {
      let index = Math.round((mousePos.x - (isChartFS ? 30 : 10)) / stepX);
      if (index >= 0 && index < data.length) {
        const d = data[index]; const cx = (isChartFS ? 30 : 10) + (index * stepX); const cy = (isChartFS ? 40 : 20) + plotH - ((d.close - minP) / finalRange) * plotH;
        ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, rect.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(rect.width, cy); ctx.stroke(); ctx.setLineDash([]);

        const priceStr = formatCurrency(d.close); ctx.font = 'bold 12px monospace'; const textWidth = ctx.measureText(priceStr).width;
        let ttX = cx + 15; if (ttX + textWidth + 20 > rect.width) ttX = cx - textWidth - 25; let ttY = cy - 30; if (ttY < 0) ttY = cy + 15;
        ctx.fillStyle = '#0f172a'; ctx.fillRect(ttX, ttY, textWidth + 20, 26);
        ctx.strokeStyle = '#38bdf8'; ctx.strokeRect(ttX, ttY, textWidth + 20, 26);
        ctx.fillStyle = '#ffffff'; ctx.fillText(priceStr, ttX + 10, ttY + 17);
      }
    }
  }, [assets, ui.activeTab, ui.activeAsset, ui.chartType, ui.chartZoom, resizeTrigger, activeAssetObj, mousePos, isChartFS]);

  // SCHERMATA LOGIN & HOMEPAGE PUBBLICA
  if (!isAuth) {
    return (
      <div className="min-h-screen w-screen bg-nebula-950 flex flex-col md:flex-row items-center justify-center relative overflow-hidden font-sans text-slate-300">
        
        {/* LATO SINISTRO: Notizie & Ads */}
        <div className="w-full md:w-1/2 h-full flex flex-col justify-center p-10 z-10">
            <h1 className="text-6xl font-black text-white mb-2 tracking-tight">NEBULA <span className="text-cyan-500">TERMINAL</span></h1>
            <p className="text-lg text-slate-400 mb-12">La piattaforma di simulazione finanziaria per professionisti del Roleplay.</p>
            
            <div className="bg-nebula-900/60 border-l-4 border-cyan-500 p-6 rounded-r-xl shadow-lg mb-8 backdrop-blur-sm">
                <h3 className="text-cyan-400 font-bold uppercase tracking-widest text-xs mb-2 flex items-center"><Newspaper className="w-4 h-4 mr-2"/> Notizia del Giorno</h3>
                <p className="text-white text-lg font-medium">"{globalConfig.dailyNews}"</p>
            </div>
            
            <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/30 p-6 rounded-xl shadow-lg backdrop-blur-sm">
                <h3 className="text-amber-500 font-black text-xl mb-2 flex items-center"><Crown className="w-6 h-6 mr-2"/> Diventa Membro VIP</h3>
                <p className="text-sm mb-4">Sblocca il livello <strong>PLUS</strong> o <strong>PRO</strong> per operare sui mercati esclusivi, prelevare senza limiti giornalieri e avere accesso al fido bancario avanzato.</p>
                <div className="flex space-x-4 text-xs font-bold uppercase">
                    <span className="bg-black/50 px-3 py-1 rounded border border-amber-500/50 text-amber-400">Azioni Esclusive</span>
                    <span className="bg-black/50 px-3 py-1 rounded border border-amber-500/50 text-amber-400">Tasse Ridotte</span>
                </div>
            </div>
        </div>

        {/* LATO DESTRO: Login Form */}
        <div className="w-full md:w-1/3 flex flex-col justify-center p-10 z-10">
            <div className="bg-nebula-900/80 border border-nebula-border backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full text-center">
              <Lock className="w-16 h-16 text-cyan-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-2">Accesso Autorizzato</h2>
              <p className="text-slate-400 text-sm mb-8">Connetti il tuo account Discord per entrare nel mercato globale.</p>
              
              <button onClick={() => window.location.href = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(window.location.origin)}&scope=identify`} className="w-full flex items-center justify-center space-x-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-4 px-4 rounded-xl transition-transform hover:scale-105 shadow-[0_0_20px_rgba(88,101,242,0.4)]">
                <MessageCircle className="w-5 h-5" /><span>Accedi con Discord</span>
              </button>
            </div>
        </div>
        
        {/* Decorazioni sfondo */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-900/10 blur-[120px] rounded-full pointer-events-none"></div>
      </div>
    );
  }

  // SCHERMATA CONGELATO
  if (isAuth && user.isFrozen) {
      return (
          <div className="h-screen w-screen bg-nebula-950 flex flex-col items-center justify-center text-center p-8">
              <Snowflake className="w-24 h-24 text-cyan-500 mb-6 animate-pulse" />
              <h1 className="text-4xl font-black text-white mb-4 tracking-widest">ACCOUNT CONGELATO</h1>
              <p className="text-slate-400 max-w-lg text-lg">Il tuo account è stato sospeso dalle autorità finanziarie di Nebula per accertamenti. Tutti i tuoi asset e fondi sono bloccati e le contrattazioni inibite.</p>
              <p className="text-rose-500 font-bold mt-8">Contatta l'amministrazione in RP per chiarire la tua posizione.</p>
          </div>
      );
  }

  // SCHERMATA PAYWALL (15k)
  if (isAuth && !user.hasPaidAccess) {
      return (
          <div className="min-h-screen w-screen bg-nebula-950 flex flex-col items-center justify-center p-4">
              <div className="bg-nebula-900/80 border border-nebula-border p-8 rounded-3xl max-w-md w-full shadow-2xl">
                  <div className="flex items-center space-x-4 mb-8 border-b border-nebula-border pb-6">
                      <img src={user.avatar} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-cyan-500" />
                      <div>
                          <div className="text-xl font-bold text-white">{user.name}</div>
                          <div className="text-xs text-slate-400 font-mono">ID: {user.id}</div>
                      </div>
                  </div>
                  
                  <h2 className="text-2xl font-black text-white mb-2">Licenza di Trading Richiesta</h2>
                  <p className="text-sm text-slate-400 mb-6">Nebula Terminal è una piattaforma esclusiva per membri attivi e investitori seri. L'accesso richiede il pagamento di una licenza singola del valore di <strong>15.000€</strong>.</p>
                  
                  <div className="bg-black/50 p-4 rounded-xl border border-cyan-900/50 mb-6">
                      <label className="text-xs text-cyan-400 uppercase font-bold block mb-2">Inserisci Chiave di Accesso</label>
                      <div className="flex space-x-2">
                          <input type="text" value={paywallKeyInput} onChange={e => setPaywallKeyInput(e.target.value)} placeholder="ACC-XXXXX" className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono uppercase outline-none focus:border-cyan-500" />
                          <button onClick={() => socket.emit('redeem_access_key', { userId: user.id, key: paywallKeyInput.trim().toUpperCase() })} className="bg-cyan-600 hover:bg-cyan-500 px-4 rounded text-white font-bold transition-colors">Verifica</button>
                      </div>
                  </div>

                  <div className="text-center border-t border-nebula-border pt-6">
                      <p className="text-xs text-slate-500 mb-3">Non hai ancora una chiave?</p>
                      <button onClick={() => alert("Per ottenere l'accesso, apri un ticket Discord e richiedi il bonifico di 15.000€ verso NebulaStock.")} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-600">Come ottenere la licenza</button>
                  </div>
              </div>
          </div>
      );
  }

  let totalStockVal = 0;
  if(portfolio.holdings && assets) { 
      Object.keys(portfolio.holdings).forEach(t => { 
          if(assets[t]) totalStockVal += portfolio.holdings[t].shares * assets[t].currentPrice; 
      }); 
  }
  const currentNetWorth = (portfolio.cash || 0) + totalStockVal - (user.loan || 0);

  let subExpireText = "Nessun abbonamento attivo.";
  if (user.isPro || user.isProMax) {
      if (!user.proExpireDate) subExpireText = "Abbonamento LIFETIME";
      else {
          const daysLeft = Math.ceil((user.proExpireDate - Date.now()) / (1000 * 60 * 60 * 24));
          subExpireText = daysLeft > 0 ? `Scadenza tra ${daysLeft} giorni` : "In scadenza oggi";
      }
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
            {gameTime.isExtraordinary && <span className="bg-rose-600/30 text-rose-400 px-2 py-0.5 rounded font-bold border border-rose-500/50">STRAORDINARIO</span>}
          </div>
          <div className="h-4 w-px bg-nebula-700 hidden sm:block"></div>
          <div className="hidden sm:flex items-center space-x-2 text-sm font-mono font-bold text-cyan-400">
            <Clock className="w-4 h-4" /><span>{String(gameTime?.hours || 9).padStart(2, '0')}:{String(gameTime?.minutes || 0).padStart(2, '0')}</span>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-right hidden md:block">
            <div className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Patrimonio Netto</div>
            <div className={`font-mono font-bold ${currentNetWorth < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>{formatCurrency(currentNetWorth)}</div>
          </div>
          <div className="flex items-center space-x-3 border-l border-nebula-border pl-6 cursor-pointer hover:opacity-80" onClick={() => changeTab('settings')}>
            <div className="text-right">
              <div className="text-sm font-semibold text-white" style={{color: user.colorName}}>{user.name}</div>
              <div className={`text-[10px] font-mono font-bold ${user.isProMax ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 animate-pulse text-transparent bg-clip-text' : user.isPro ? 'text-amber-500' : 'text-cyan-400'}`}>
                {user.isProMax ? 'PRO' : user.isPro ? 'PLUS' : 'STANDARD'}
              </div>
            </div>
            <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} className="w-8 h-8 rounded-full border border-nebula-border bg-nebula-800" alt="Avatar" />
          </div>
        </div>
      </header>

      {/* TICKER NEWS MINIMALISTA IN CIMA (SEMPRE VISIBILE) */}
      {marketNews.length > 0 && (
          <div className="h-8 bg-black/80 border-b border-nebula-border flex items-center overflow-hidden shrink-0 z-10 px-4">
              <div className="font-bold text-cyan-500 text-[10px] uppercase tracking-widest mr-4 shrink-0 flex items-center bg-black z-20 shadow-[10px_0_10px_black]"><Globe className="w-3 h-3 mr-1"/> Ultime Notizie</div>
              <div className="flex space-x-8 whitespace-nowrap animate-[marquee_30s_linear_infinite] opacity-80 text-xs">
                  {marketNews.slice(0,5).map((n) => (
                      <span key={n.id} className="flex items-center space-x-2">
                          {n.type === 'bull' ? <TrendingUp className="w-3 h-3 text-emerald-400"/> : <TrendingDown className="w-3 h-3 text-rose-400"/>}
                          <span className={n.type === 'bull' ? 'text-emerald-100' : 'text-rose-100'}>{n.title}</span>
                          <span className="text-nebula-700 mx-4">|</span>
                      </span>
                  ))}
              </div>
          </div>
      )}

      <div className="flex flex-1 overflow-hidden z-10">
        <nav className="w-16 md:w-64 bg-nebula-900/95 border-r border-nebula-border flex flex-col justify-between shrink-0 backdrop-blur-md">
          <div className="py-4 flex flex-col space-y-1">
            {[
              { id: 'markets', icon: LineChart, label: 'Trading Desk' }, 
              { id: 'portfolio', icon: Wallet, label: 'Portafoglio & Banca' }, 
              { id: 'news', icon: Newspaper, label: 'Notizie Finanziarie' },
              { id: 'chat', icon: MessageCircle, label: 'Comunicazioni' }, 
              { id: 'premium', icon: Crown, label: 'Abbonamenti' },
              { id: 'settings', icon: Settings, label: 'Impostazioni' }
            ].map(nav => (
              <button key={nav.id} onClick={() => changeTab(nav.id)} className={`w-full flex items-center space-x-3 px-4 md:px-6 py-3 border-r-2 transition-all duration-300 ease-in-out ${ui.activeTab === nav.id ? 'text-white bg-nebula-800/80 border-cyan-500' : 'text-slate-400 hover:text-white hover:bg-nebula-800/50 border-transparent'}`}>
                <nav.icon className={`w-5 h-5 text-center ${nav.id === 'premium' ? 'text-amber-500' : ''}`} /><span className="hidden md:block font-medium text-sm">{nav.label}</span>
              </button>
            ))}
          </div>
          <div className="p-4 flex flex-col space-y-4 justify-center md:justify-start items-center md:items-start">
            <button onClick={() => { localStorage.removeItem('nebulaState'); window.location.hash=''; window.location.reload(); }} className="text-slate-500 hover:text-rose-400 flex items-center space-x-2 transition-colors"><LogOut className="w-4 h-4"/><span className="hidden md:block text-xs">Disconnetti</span></button>
            
            {/* TASTO ADMIN / FINANZA */}
            {user.isAdmin ? (
              <button onClick={() => changeTab('admin')} className={`transition-all duration-300 flex items-center space-x-2 ${ui.activeTab === 'admin' ? 'text-rose-500' : 'text-nebula-700 hover:text-rose-400'}`} title="Admin Panel"><Lock className="w-4 h-4" /><span className="hidden md:block text-xs">Admin Panel</span></button>
            ) : user.isFinanza ? (
              <button onClick={() => changeTab('admin')} className={`transition-all duration-300 flex items-center space-x-2 ${ui.activeTab === 'admin' ? 'text-emerald-500' : 'text-nebula-700 hover:text-emerald-400'}`} title="Pannello Finanza"><FileCode2 className="w-4 h-4" /><span className="hidden md:block text-xs">Pannello Finanza</span></button>
            ) : null}
          </div>
        </nav>

        <main className="flex-1 bg-nebula-950/40 overflow-hidden relative backdrop-blur-md">
          
          {/* TAB MARKETS */}
          <div className={`h-full flex-col md:flex-row w-full ${ui.activeTab === 'markets' ? 'flex' : 'hidden'}`}>
            <div className="w-full md:w-80 border-r border-nebula-border bg-nebula-900/60 flex flex-col shrink-0">
              <div className="flex border-b border-nebula-border bg-nebula-900/80">
                <button onClick={() => setUi(p => ({...p, activeMarketType: 'stocks'}))} className={`transition-colors duration-300 flex-1 py-3 text-xs md:text-sm font-semibold border-b-2 ${ui.activeMarketType === 'stocks' ? 'text-white border-cyan-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>Azioni</button>
                <button onClick={() => setUi(p => ({...p, activeMarketType: 'crypto'}))} className={`transition-colors duration-300 flex-1 py-3 text-xs md:text-sm font-semibold border-b-2 ${ui.activeMarketType === 'crypto' ? 'text-white border-cyan-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>Crypto</button>
                {user.isProMax && (
                  <button onClick={() => setUi(p => ({...p, activeMarketType: 'promax_stocks'}))} className={`transition-colors duration-300 flex-1 py-3 text-[10px] md:text-xs font-black border-b-2 ${ui.activeMarketType.includes('promax') ? 'text-purple-400 border-purple-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>PRO</button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
                {Object.values(assets || {}).filter(a => ui.activeMarketType.includes('promax') ? a.type?.includes('promax') : a.type === ui.activeMarketType).map(asset => (
                  <div key={asset.ticker} onClick={() => selectAsset(asset.ticker)} className={`cursor-pointer p-3 rounded-lg border flex justify-between items-center transition-all duration-200 ${asset.ticker === ui.activeAsset ? 'bg-nebula-800/80 border-nebula-700 shadow-md' : 'border-transparent hover:bg-nebula-800/40'}`}>
                    <div>
                      <div className="font-bold text-white text-sm flex items-center space-x-2">
                        <span>{asset.ticker}</span>
                        {asset.isProMax && <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 animate-pulse text-white text-[8px] px-1 rounded font-black tracking-widest shadow-sm">PRO</span>}
                        {asset.isPro && !asset.isProMax && <span className="bg-amber-500 text-white text-[8px] px-1 rounded">PLUS</span>}
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
                        {activeAssetObj.maxShares && <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-700 ml-2" title="Limite Azioni Globali">Max Qty: {activeAssetObj.maxShares}</span>}
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
                        <div className="flex flex-col"><span className="text-slate-500 mb-1 flex items-center"><Percent className="w-3 h-3 mr-1"/> Tassa Proprietà</span><span className={`font-semibold ${activeAssetObj.holdingTax > 0 ? 'text-rose-400' : 'text-slate-200'}`}>{activeAssetObj.holdingTax > 0 ? `${activeAssetObj.holdingTax.toFixed(2)}€/pz` : 'Esente'}</span></div>
                      </div>
                    </div>
                    <div className="text-left md:text-right shrink-0"><div className={`text-3xl font-mono font-black ${activeAssetObj.isProMax ? 'bg-gradient-to-r from-purple-400 to-rose-400 animate-pulse text-transparent bg-clip-text drop-shadow-md' : 'text-white'}`}>{formatCurrency(activeAssetObj.currentPrice)}</div></div>
                  </div>
                  
                  {/* GRAFICO AZIONARIO (Supporta Fullscreen) */}
                  <div className={isChartFS ? "fixed inset-0 z-[100] bg-nebula-950 p-4 flex flex-col" : "p-4 md:p-6 border-b border-nebula-border bg-nebula-950/60 relative w-full h-[350px]"}>
                    <div className="absolute top-6 right-6 z-10 flex space-x-2 bg-nebula-900/80 p-1 rounded-lg border border-nebula-border items-center backdrop-blur-sm shadow-lg">
                      <span className="text-[10px] text-slate-500 self-center mx-2 hidden sm:flex"><Search className="w-3 h-3 mr-1"/> Zoom</span>
                      <button onClick={() => setUi(p => ({...p, chartZoom: Math.max(15, p.chartZoom - 10)}))} className="px-2 text-slate-400 hover:text-white font-bold text-lg leading-none transition-colors">+</button>
                      <button onClick={() => setUi(p => ({...p, chartZoom: Math.min(100, p.chartZoom + 10)}))} className="px-2 text-slate-400 hover:text-white font-bold text-lg leading-none transition-colors">-</button>
                      <div className="w-px h-4 bg-nebula-700 mx-1"></div>
                      <button onClick={() => setUi(p => ({...p, chartType: 'candle'}))} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${ui.chartType === 'candle' ? 'bg-nebula-700 text-white' : 'text-slate-400 hover:bg-nebula-800/50'}`}><BarChart2 className="w-4 h-4"/></button>
                      <button onClick={() => setUi(p => ({...p, chartType: 'line'}))} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${ui.chartType === 'line' ? 'bg-nebula-700 text-white' : 'text-slate-400 hover:bg-nebula-800/50'}`}><LineChart className="w-4 h-4"/></button>
                      <div className="w-px h-4 bg-nebula-700 mx-1"></div>
                      <button onClick={() => setIsChartFS(!isChartFS)} className="px-3 py-1 rounded text-xs font-bold text-slate-400 hover:text-cyan-400 hover:bg-nebula-800/50 transition-colors">
                          {isChartFS ? <Minimize className="w-4 h-4"/> : <Maximize className="w-4 h-4"/>}
                      </button>
                    </div>
                    
                    {isChartFS && (
                        <div className="flex justify-between items-center mb-4 px-2">
                            <h2 className="text-2xl font-bold text-white">{activeAssetObj.name} ({activeAssetObj.ticker})</h2>
                            <div className="text-2xl font-mono text-cyan-400">{formatCurrency(activeAssetObj.currentPrice)}</div>
                        </div>
                    )}
                    
                    {/* PANNELLO TRADE IN FULLSCREEN */}
                    {isChartFS && (
                      <div className="absolute bottom-8 left-8 z-[110]">
                          {fsTradeOpen && (
                              <div className="bg-nebula-950/95 backdrop-blur-md border border-cyan-500/50 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] mb-4 w-72 animate-fade-in origin-bottom-left">
                                  <div className="flex justify-between items-center mb-3">
                                      <h4 className="text-white font-bold flex items-center"><Wallet className="w-4 h-4 mr-2 text-cyan-400"/> Trade {activeAssetObj.ticker}</h4>
                                      <button onClick={() => setFsTradeOpen(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4"/></button>
                                  </div>
                                  <div className="text-xs text-slate-400 mb-2 flex justify-between">
                                      <span>Cassa:</span> <span className="text-white font-bold">{formatCurrency(portfolio.cash)}</span>
                                  </div>
                                  <input type="number" min="0.01" step="any" value={tradeQty} onChange={(e) => setTradeQty(e.target.value)} className="w-full bg-black/50 border border-nebula-border rounded-lg px-3 py-2 text-white font-mono mb-3 outline-none focus:border-cyan-500" />
                                  <div className="grid grid-cols-2 gap-2">
                                      <button onClick={() => executeOrder('BUY')} className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg uppercase text-xs">Compra</button>
                                      <button onClick={() => executeOrder('SELL')} className="py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg uppercase text-xs">Vendi</button>
                                  </div>
                              </div>
                          )}
                          <button onClick={() => setFsTradeOpen(!fsTradeOpen)} className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-full font-bold shadow-[0_0_15px_rgba(8,145,178,0.5)] transition-transform hover:scale-105">
                              <Coins className="w-5 h-5"/>
                              <span>Apri Terminale Ordini</span>
                          </button>
                      </div>
                    )}

                    <div 
                      className={`relative w-full border border-nebula-border rounded-xl bg-nebula-950/80 overflow-hidden ${isChartFS ? 'flex-1' : 'h-full'}`}
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
                    <div className="bg-nebula-900/60 p-5 rounded-xl border border-nebula-border relative overflow-hidden backdrop-blur-sm flex flex-col">
                      {(!activeAssetObj.type.includes('promax') && !isMarketOpen) && (
                        <div className="absolute inset-0 bg-nebula-950/90 z-10 flex flex-col items-center justify-center backdrop-blur-md"><Store className="w-10 h-10 text-rose-500 mb-2" /><span className="text-rose-400 font-bold">Mercato Chiuso</span><span className="text-xs text-slate-400 mt-1">Apertura: 08:00 - 19:30</span></div>
                      )}
                      {(activeAssetObj.type.includes('promax') && (!gameTime.isExtraordinary && (gameTime?.hours < 5 || gameTime?.hours >= 22))) && (
                        <div className="absolute inset-0 bg-nebula-950/90 z-10 flex flex-col items-center justify-center backdrop-blur-md"><Store className="w-10 h-10 text-purple-500 mb-2" /><span className="text-purple-400 font-bold">Mercato PRO Chiuso</span><span className="text-xs text-slate-400 mt-1">Apertura: 05:00 - 22:00</span></div>
                      )}
                      
                      <div className="flex border-b border-nebula-border mb-4">
                          <button onClick={()=>setUi(p=>({...p, orderType:'live'}))} className={`transition-all duration-300 pb-2 flex-1 text-center font-bold text-xs uppercase ${ui.orderType === 'live' ? 'border-b-2 border-cyan-500 text-white' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}>Mercato (Live)</button>
                          <button onClick={()=>setUi(p=>({...p, orderType:'limit'}))} className={`transition-all duration-300 pb-2 flex-1 text-center font-bold text-xs uppercase ${ui.orderType === 'limit' ? 'border-b-2 border-cyan-500 text-white' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}>Ordine (Auto)</button>
                      </div>

                      <div className="flex justify-between items-center mb-4 text-xs font-mono"><span className="text-slate-400 uppercase">Cassa Disponibile:</span><span className="text-white font-bold">{formatCurrency(portfolio.cash)}</span></div>
                      
                      <div className="mb-2 text-[10px] text-slate-400 flex justify-between">
                        <span>Cap Esentasse: <span className="font-bold text-slate-300">{formatCurrency(user.isProMax ? 100000 : (user.isPro ? 50000 : 25000))}</span></span>
                        {dynamicFee > 0 && ui.orderType === 'live' && <span className="text-rose-400 font-bold flex items-center animate-pulse"><AlertTriangle className="w-3 h-3 mr-1"/> Extra Fee applicata</span>}
                      </div>

                      <div className="mb-4 flex space-x-2">
                          <div className="flex-1">
                              <label className="text-[10px] text-slate-500 uppercase block mb-1">Quantità</label>
                              <input type="number" step="any" value={tradeQty} min="0.01" onChange={(e) => setTradeQty(e.target.value)} className={`transition-all duration-300 w-full bg-nebula-950/80 border ${dynamicFee > 0 && ui.orderType === 'live' ? 'border-rose-500' : 'border-nebula-border'} rounded-xl px-4 py-3 font-mono text-white text-lg font-bold outline-none focus:border-cyan-500`} />
                          </div>
                          {ui.orderType === 'limit' && (
                              <div className="flex-1">
                                  <label className="text-[10px] text-slate-500 uppercase block mb-1">Prezzo Target (€)</label>
                                  <input type="number" step="any" placeholder="Es. 150" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} className="w-full bg-nebula-950/80 border border-nebula-border rounded-xl px-4 py-3 font-mono text-cyan-400 text-lg font-bold outline-none focus:border-cyan-500" />
                              </div>
                          )}
                      </div>
                      
                      <div className="flex flex-col space-y-1 font-mono text-sm mb-6 pb-4 border-b border-nebula-border/50">
                        <div className="flex justify-between items-center"><span className="text-slate-400">Valore Stimato:</span><span className="font-bold text-white">{formatCurrency((parseFloat(tradeQty)||0) * (ui.orderType === 'live' ? activeAssetObj.currentPrice : (parseFloat(limitPrice)||0)))}</span></div>
                        {dynamicFee > 0 && ui.orderType === 'live' && <div className="flex justify-between items-center text-rose-400"><span className="text-xs">Commissione Extra:</span><span className="font-bold">+{formatCurrency(dynamicFee)}</span></div>}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-auto">
                        {ui.orderType === 'live' ? (
                            <>
                                <button onClick={() => executeOrder('BUY')} className="py-3 bg-emerald-600 hover:bg-emerald-500 transition-colors text-white rounded-xl font-bold uppercase tracking-wider">Compra</button>
                                <button onClick={() => executeOrder('SELL')} className="py-3 bg-rose-600 hover:bg-rose-500 transition-colors text-white rounded-xl font-bold uppercase tracking-wider">Vendi</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => placeLimitOrder('BUY', 'LESS')} className="py-3 border-2 border-emerald-600 text-emerald-400 hover:bg-emerald-600/20 transition-colors rounded-xl font-bold uppercase tracking-wider text-xs flex flex-col items-center justify-center gap-1">
                                    <span>Auto-Compra</span><span className="text-[9px] lowercase font-normal">(se scende &lt;= target)</span>
                                </button>
                                <button onClick={() => placeLimitOrder('SELL', 'GREATER')} disabled={!user.isPro} title={!user.isPro ? "Solo PLUS/PRO" : ""} className="py-3 border-2 border-rose-600 text-rose-400 hover:bg-rose-600/20 transition-colors disabled:opacity-30 disabled:hover:bg-transparent rounded-xl font-bold uppercase tracking-wider text-xs flex flex-col items-center justify-center gap-1">
                                    <span>Auto-Vendi</span><span className="text-[9px] lowercase font-normal">(se sale &gt;= target)</span>
                                </button>
                            </>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-nebula-900/60 p-5 rounded-xl border border-nebula-border backdrop-blur-sm flex flex-col">
                      <h3 className="text-sm font-semibold text-white mb-4">La tua Posizione</h3>
                      <div className="space-y-4 font-mono text-sm border-b border-nebula-border/50 pb-6 mb-4">
                        <div className="flex justify-between border-b border-nebula-border/50 pb-2"><span className="text-slate-400">Asset Posseduti</span><span className="text-white font-bold">{portfolio.holdings[activeAssetObj?.ticker]?.shares || 0}</span></div>
                        <div className="flex justify-between border-b border-nebula-border/50 pb-2"><span className="text-slate-400">Prezzo Medio</span><span className="text-white">{portfolio.holdings[activeAssetObj?.ticker] ? formatCurrency(portfolio.holdings[activeAssetObj.ticker].avgPrice) : '€0.00'}</span></div>
                        <div className="flex justify-between pt-2">
                            <span className="text-slate-400">P&L Corrente</span>
                            <span className={`font-bold ${portfolio.holdings[activeAssetObj?.ticker] && (activeAssetObj.currentPrice - portfolio.holdings[activeAssetObj.ticker].avgPrice) * portfolio.holdings[activeAssetObj.ticker].shares >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {portfolio.holdings[activeAssetObj?.ticker] ? formatCurrency((activeAssetObj.currentPrice - portfolio.holdings[activeAssetObj.ticker].avgPrice) * portfolio.holdings[activeAssetObj.ticker].shares) : '€0.00'}
                            </span>
                        </div>
                      </div>

                      {/* LISTA ORDINI PENDENTI (LIMIT) */}
                      <h3 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider flex items-center"><Target className="w-3 h-3 mr-1"/> Ordini Pendenti</h3>
                      <div className="flex-1 overflow-y-auto custom-scroll space-y-2">
                          {(user.limitOrders || []).filter(o => o.ticker === activeAssetObj.ticker).map(o => (
                              <div key={o.id} className="flex items-center justify-between bg-nebula-950 border border-nebula-border p-2 rounded text-xs font-mono transition-all">
                                  <div>
                                      <span className={`font-bold mr-2 ${o.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>AUTO-{o.type}</span>
                                      <span className="text-white">{o.qty} pz</span> se {o.condition === 'LESS' ? '<=' : '>='} <span className="text-cyan-400">{formatCurrency(o.targetPrice)}</span>
                                  </div>
                                  <button onClick={() => cancelLimitOrder(o.id)} className="text-slate-500 hover:text-rose-400 transition-colors"><X className="w-4 h-4"/></button>
                              </div>
                          ))}
                          {(user.limitOrders || []).filter(o => o.ticker === activeAssetObj.ticker).length === 0 && <div className="text-[10px] text-slate-500 italic">Nessun ordine automatico.</div>}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* TAB PORTFOLIO & BANCA */}
          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${ui.activeTab === 'portfolio' ? 'flex' : 'hidden'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Mio Portafoglio</h2>
              <div className="flex space-x-3">
                <button onClick={() => setDepositModal(true)} className="px-4 py-2 bg-emerald-600 border border-emerald-500/50 text-white rounded-lg text-sm font-bold hover:bg-emerald-500 flex items-center transition-colors"><ArrowRightCircle className="w-4 h-4 mr-2"/> Deposita</button>
                <button onClick={() => setDiscordModal({open: true, type: 'WITHDRAW'})} className="px-4 py-2 bg-nebula-800 border border-nebula-border text-white rounded-lg text-sm font-bold hover:bg-nebula-700 flex items-center transition-colors"><Landmark className="w-4 h-4 mr-2"/> Preleva Denaro</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 bg-nebula-900/60 rounded-xl overflow-hidden border border-nebula-border backdrop-blur-md">
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
                            }} className="text-xs bg-rose-600/20 text-rose-400 px-3 py-1 rounded hover:bg-rose-600/40 transition-colors">Vendi Tutto</button></td>
                          </tr>
                        );
                      })}
                      {Object.keys(portfolio.holdings || {}).length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-500 italic">Nessun asset in portafoglio.</td></tr>}
                    </tbody>
                  </table>
                </div>

                {/* BANCA / PRESTITI */}
                <div className="bg-nebula-900/60 rounded-xl border border-rose-900/50 p-6 flex flex-col backdrop-blur-md shadow-[0_0_15px_rgba(225,29,72,0.05)]">
                    <h3 className="text-lg font-bold text-white mb-2 flex items-center border-b border-rose-900/50 pb-2"><Landmark className="w-5 h-5 mr-2 text-rose-500"/> Banca Centrale</h3>
                    <p className="text-xs text-slate-400 mb-4">Usa il fido bancario per investire oltre le tue possibilità. <span className="text-rose-400 font-bold">Attenzione ai pignoramenti automatici.</span></p>
                    
                    <div className="bg-nebula-950 p-4 rounded-lg border border-nebula-border mb-4">
                        <div className="text-[10px] uppercase text-slate-500 font-bold mb-1 tracking-wider">Debito Attuale</div>
                        <div className="text-3xl font-mono font-black text-rose-500">{formatCurrency(user.loan || 0)}</div>
                        <div className="text-[10px] text-slate-500 mt-2 italic">Interesse applicato ogni fine giornata.</div>
                    </div>

                    <div className="flex flex-col space-y-2 mt-auto">
                        <button onClick={() => {
                            const amt = prompt("Importo da richiedere in prestito:");
                            if(amt && !isNaN(parseFloat(amt))) socket.emit('take_loan', { userId: user.id, amount: parseFloat(amt) });
                        }} className="py-3 border-2 border-rose-600/50 hover:bg-rose-600/20 text-rose-400 font-bold text-sm rounded-lg transition-colors">Richiedi Finanziamento</button>
                        <button onClick={() => {
                            const amt = prompt("Importo da ripagare (verrà scalato dal tuo saldo liquido):");
                            if(amt && !isNaN(parseFloat(amt))) socket.emit('repay_loan', { userId: user.id, amount: parseFloat(amt) });
                        }} disabled={(user.loan || 0) <= 0} className="py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors">Sana Debito</button>
                    </div>
                </div>
            </div>
          </div>

          {/* TAB NEWS (NUOVO) */}
          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${ui.activeTab === 'news' ? 'flex' : 'hidden'}`}>
             <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center"><Newspaper className="w-6 h-6 mr-3 text-cyan-500"/> Notizie Finanziarie</h2>
             </div>
             <div className="max-w-4xl mx-auto w-full space-y-4">
                 {marketNews.length === 0 ? (
                     <div className="text-center p-10 text-slate-500 italic bg-nebula-900/40 rounded-xl border border-nebula-border">Nessun evento recente. Rimanere sintonizzati.</div>
                 ) : (
                     marketNews.map(news => (
                         <div key={news.id} className={`flex flex-col p-5 rounded-xl border-l-4 transition-all duration-300 hover:translate-x-2 bg-nebula-900/60 backdrop-blur-sm ${news.type === 'bull' ? 'border-emerald-500 shadow-[0_4px_20px_rgba(16,185,129,0.1)]' : 'border-rose-500 shadow-[0_4px_20px_rgba(244,63,94,0.1)]'}`}>
                             <div className="flex justify-between items-center mb-2">
                                 <span className="text-xs font-mono text-slate-400">Giorno {news.day} - {news.time}</span>
                                 <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded bg-black/50 border ${news.type === 'bull' ? 'text-emerald-400 border-emerald-900' : 'text-rose-400 border-rose-900'}`}>
                                     Impatto Settore: {news.sector}
                                 </span>
                             </div>
                             <h3 className={`text-lg font-bold mb-1 ${news.type === 'bull' ? 'text-emerald-100' : 'text-rose-100'}`}>{news.title}</h3>
                             <p className="text-sm text-slate-300">{news.msg}</p>
                         </div>
                     ))
                 )}
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
                <button onClick={createPrivateChat} className="hover:text-cyan-400 bg-slate-800 rounded p-1 transition-colors"><Plus className="w-3 h-3" /></button>
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
                  <div key={idx} className="flex flex-col space-y-1 mb-2 animate-fade-in">
                    <div className="flex items-baseline space-x-2">
                      <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.sender}`} className="w-5 h-5 rounded-full" alt="PFP" />
                      <span className="text-xs font-bold" style={{color: m.color}}>{m.sender}</span>
                      <span className="text-[10px] text-slate-500">{m.time}</span>
                    </div>
                    <div className="text-sm p-3 rounded-lg bg-nebula-900/80 whitespace-pre-wrap border border-nebula-border/50 shadow-sm" style={{color: m.textCol}}>{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-nebula-900/80 border-t border-nebula-border">
                <form onSubmit={sendMessage} className="relative">
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Scrivi un messaggio..." className="w-full bg-nebula-950/80 border border-nebula-border rounded-xl pl-4 pr-12 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors" autoComplete="off" />
                  <button type="submit" className="absolute right-2 top-2 bottom-2 w-10 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center justify-center transition-colors"><Send className="w-4 h-4" /></button>
                </form>
              </div>
            </div>
          </div>

          {/* TAB PREMIUM */}
          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${ui.activeTab === 'premium' ? 'flex' : 'hidden'}`}>
            <div className="text-center max-w-2xl mx-auto mb-10 animate-fade-in">
              <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Sblocca il tuo potenziale</h2>
              <p className="text-slate-400">Accedi a strumenti istituzionali, algoritmi avanzati e mercati esclusivi per dominare il terminale.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="bg-nebula-900/60 backdrop-blur-md p-8 border border-amber-500/30 rounded-2xl relative flex flex-col shadow-[0_0_30px_rgba(245,158,11,0.1)] transition-transform hover:-translate-y-1 duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <h3 className="text-2xl font-black text-amber-500 mb-2 flex items-center"><Crown className="w-6 h-6 mr-2"/> PLUS</h3>
                <div className="text-4xl font-mono text-white mb-6 font-bold">€20.000<span className="text-sm text-slate-500 font-sans font-normal">/Lifetime</span></div>
                <ul className="space-y-4 mb-8 flex-1 text-slate-300">
                  <li className="flex items-center"><Check className="w-5 h-5 text-amber-500 mr-3"/> Tetto investimenti esentasse a 50.000€</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-amber-500 mr-3"/> Prelievi giornalieri ILLIMITATI</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-amber-500 mr-3"/> Fido Bancario fino a 50.000€</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-amber-500 mr-3"/> Accesso Crypto/Azioni PLUS e Ordini Avanzati</li>
                </ul>
                {!user.isPro ? (
                  <button onClick={() => buyTier('PRO', 20000)} className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity text-lg">Acquista Ora</button>
                ) : (
                  <button disabled className="w-full py-4 bg-amber-900/50 text-amber-500 font-bold rounded-xl cursor-not-allowed">Attivo ({subExpireText})</button>
                )}
                
                <div className="mt-6 pt-6 border-t border-nebula-border/50">
                  <p className="text-xs text-slate-500 mb-2">Oppure usa un codice licenza PLUS:</p>
                  <div className="flex space-x-2">
                    <input type="text" id="pro-key-input" placeholder="NBL-PRO-XXXX" className="flex-1 bg-nebula-950 border border-amber-500/50 rounded-lg px-4 py-2 text-white font-mono uppercase focus:outline-none focus:border-amber-400" />
                    <button onClick={() => socket.emit('redeem_promo', { userId: user.id, code: document.getElementById('pro-key-input').value.trim().toUpperCase() })} className="px-4 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-500 transition-colors">Riscatta</button>
                  </div>
                </div>
              </div>

              <div className="bg-nebula-900/60 backdrop-blur-md p-8 border border-purple-500/50 rounded-2xl relative flex flex-col shadow-[0_0_40px_rgba(168,85,247,0.15)] overflow-hidden transition-transform hover:-translate-y-1 duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-transparent pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
                <h3 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-rose-400 animate-pulse text-transparent bg-clip-text mb-2 flex items-center z-10"><Zap className="w-6 h-6 mr-2 text-purple-400"/> PRO</h3>
                <div className="text-4xl font-mono text-white mb-6 font-bold z-10">€35.000<span className="text-sm text-slate-500 font-sans font-normal">/Lifetime</span></div>
                <ul className="space-y-4 mb-8 flex-1 text-slate-300 z-10">
                  <li className="flex items-center"><Check className="w-5 h-5 text-purple-400 mr-3"/> Tetto investimenti esentasse a 100.000€</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-purple-400 mr-3"/> Prelievi giornalieri ILLIMITATI</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-purple-400 mr-3"/> Fido Bancario fino a 200.000€</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-purple-400 mr-3"/> Sblocco Mercato PRO Esclusivo (05:00 - 22:00)</li>
                </ul>
                {!user.isProMax ? (
                  <button onClick={() => buyTier('PROMAX', 35000)} className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.5)] hover:opacity-90 transition-opacity text-lg z-10">Ascendi a PRO</button>
                ) : (
                  <button disabled className="w-full py-4 bg-purple-900/50 text-purple-400 font-bold rounded-xl cursor-not-allowed z-10 border border-purple-500/30">Attivo ({subExpireText})</button>
                )}

                <div className="mt-6 pt-6 border-t border-purple-500/30 z-10">
                  <p className="text-xs text-slate-500 mb-2">Codice licenza PRO:</p>
                  <div className="flex space-x-2">
                    <input type="text" id="promax-key-input" placeholder="MAX-XXXX" className="flex-1 bg-nebula-950 border border-purple-500/50 rounded-lg px-4 py-2 text-white font-mono uppercase focus:outline-none focus:border-purple-400" />
                    <button onClick={() => socket.emit('redeem_promo', { userId: user.id, code: document.getElementById('promax-key-input').value.trim().toUpperCase() })} className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 transition-colors">Riscatta</button>
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
              <div className="bg-nebula-900/60 p-6 border border-nebula-border rounded-xl backdrop-blur-md transition-all">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-nebula-border/50 pb-2">Profilo e Personalizzazione</h3>
                <label className="block text-xs text-slate-400 mb-1">ID Discord</label>
                <input type="text" disabled value={user.id} className="w-full bg-nebula-950/50 border border-nebula-border rounded-lg px-3 py-2 text-slate-400 font-mono mb-4 cursor-not-allowed" />
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><label className="block text-xs text-slate-400 mb-1">Colore Nome</label><input type="color" value={user.colorName} onChange={e => { setUser(p => ({...p, colorName: e.target.value})); socket.emit('user_login', {...user, colorName: e.target.value}) }} className="h-8 w-full rounded bg-transparent border border-nebula-border cursor-pointer" /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Colore Testo</label><input type="color" value={user.colorText} onChange={e => { setUser(p => ({...p, colorText: e.target.value})); socket.emit('user_login', {...user, colorText: e.target.value}) }} className="h-8 w-full rounded bg-transparent border border-nebula-border cursor-pointer" /></div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 flex items-center"><Image className="w-3 h-3 mr-1"/> Sfondo Terminale (URL Immagine)</label>
                  <input type="url" value={user.bgImage} onChange={e => { setUser(p => ({...p, bgImage: e.target.value})); socket.emit('user_login', {...user, bgImage: e.target.value}) }} placeholder="https://..." className="w-full bg-nebula-950/80 border border-nebula-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors" />
                </div>
              </div>
            </div>
          </div>

          {/* TAB ADMIN */}
          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${ui.activeTab === 'admin' && (user.isAdmin || user.isFinanza) ? 'flex' : 'hidden'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black flex items-center gap-3">
                  {user.isAdmin ? <><UserCog className="w-6 h-6 text-rose-500" /> <span className="text-rose-500">Dev / Admin Panel</span></> : <><FileCode2 className="w-6 h-6 text-emerald-500" /> <span className="text-emerald-500">Finanza Control Panel</span></>}
              </h2>
              {user.isAdmin && (
                  <button onClick={() => socket.emit('admin_action', { type: 'toggle_extra_market' })} className={`px-4 py-2 font-bold rounded-lg border flex items-center shadow-lg transition-all duration-300 ${gameTime.isExtraordinary ? 'bg-rose-600 border-rose-500 text-white' : 'bg-nebula-800 border-nebula-border text-slate-400 hover:text-white'}`}>
                    <Store className="w-4 h-4 mr-2"/> {gameTime.isExtraordinary ? 'SPEGNI Mercato Straordinario' : 'ACCENDI Mercato Straordinario'}
                  </button>
              )}
            </div>

            {/* --- SEZIONI CONDIVISE (ADMIN & FINANZA) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-nebula-900/60 p-6 border border-rose-900/80 rounded-xl backdrop-blur-md shadow-[0_0_20px_rgba(225,29,72,0.1)] transition-all">
                    <h3 className="text-lg font-bold text-white mb-2 border-b border-rose-900/50 pb-2 flex items-center"><Gavel className="w-5 h-5 mr-2 text-rose-500"/> Gestione Rischio & Pignoramenti</h3>
                    <p className="text-[10px] text-slate-400 mb-4">Utenti il cui debito bancario ha superato l'85% del loro patrimonio complessivo.</p>
                    <div className="overflow-x-auto max-h-48 custom-scroll">
                        <table className="w-full text-left font-mono text-xs">
                            <thead>
                                <tr className="bg-nebula-950 text-slate-400 uppercase sticky top-0 z-10">
                                    <th className="p-3 rounded-tl-lg">Utente (ID)</th>
                                    <th className="p-3">Patrimonio Netto</th>
                                    <th className="p-3 text-rose-400">Debito Banca</th>
                                    <th className="p-3">Rischio (%)</th>
                                    <th className="p-3 rounded-tr-lg text-right">Azione</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-nebula-border/50 text-slate-200">
                                {riskAccounts.map(ra => (
                                    <tr key={ra.id} className="hover:bg-nebula-800/30 transition-colors">
                                        <td className="p-3 font-bold text-white">{ra.name} <span className="text-[10px] text-slate-500 block">{ra.id}</span></td>
                                        <td className="p-3">{formatCurrency(ra.netWorth)}</td>
                                        <td className="p-3 text-rose-400 font-bold">{formatCurrency(ra.loan)}</td>
                                        <td className="p-3">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-24 h-2 bg-nebula-950 rounded overflow-hidden"><div className="h-full bg-rose-500 transition-all duration-500" style={{width: `${Math.min(100, ra.ratio * 100)}%`}}></div></div>
                                                <span>{(ra.ratio * 100).toFixed(1)}%</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <button onClick={() => {
                                                if(window.confirm(`Pignorare e azzerare il debito e gli asset di ${ra.name}?`)) {
                                                    socket.emit('admin_action', { type: 'liquidate_user', userId: ra.id });
                                                    setTimeout(() => socket.emit('admin_fetch_risk_accounts'), 1000);
                                                }
                                            }} className="bg-rose-600 hover:bg-rose-500 px-3 py-1.5 rounded text-white font-bold text-[10px] uppercase tracking-wider flex items-center justify-end w-full transition-colors">
                                                <AlertTriangle className="w-3 h-3 mr-1"/> Liquida
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {riskAccounts.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-emerald-500 italic font-bold">Nessun account a rischio rilevato.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button onClick={() => socket.emit('admin_fetch_risk_accounts')} className="text-[10px] uppercase text-cyan-400 hover:text-cyan-300 font-bold flex items-center transition-colors"><RefreshCw className="w-3 h-3 mr-1"/> Aggiorna Lista</button>
                    </div>
                </div>

                <div className="bg-nebula-900/60 p-6 border border-slate-700 rounded-xl backdrop-blur-md flex flex-col transition-all">
                  <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-2 cursor-pointer group" onClick={() => setShowLogs(!showLogs)}>
                    <h3 className="text-lg font-bold text-white flex items-center group-hover:text-cyan-400 transition-colors">
                      <ScrollText className="w-5 h-5 mr-2 text-slate-400 group-hover:text-cyan-400 transition-colors"/> 
                      Registro Eventi / Log
                      <span className="ml-3 px-2 py-1 bg-slate-800 text-[10px] rounded text-slate-300">{showLogs ? 'Nascondi' : 'Mostra'} <ChevronDown className={`inline w-3 h-3 transition-transform duration-300 ${showLogs ? 'rotate-180' : ''}`} /></span>
                    </h3>
                    <button onClick={(e) => { e.stopPropagation(); handleDownloadLogs(); }} className="bg-slate-700 hover:bg-cyan-600 transition-colors text-xs px-3 py-2 rounded text-white flex items-center shadow"><Download className="w-3 h-3 mr-1"/> .txt</button>
                  </div>
                  {showLogs && (
                    <div className="flex-1 bg-black/60 border border-nebula-border rounded p-3 overflow-y-auto font-mono text-[11px] text-slate-300 h-64 max-h-64 custom-scroll mt-2 shadow-inner animate-fade-in">
                      {adminLogs.map((log, i) => {
                          let colorClass = "text-slate-300";
                          if (log.includes("[ACQUISTO")) colorClass = "text-amber-300";
                          if (log.includes("[VENDITA")) colorClass = "text-emerald-300";
                          if (log.includes("[PRELIEVO]")) colorClass = "text-cyan-300";
                          if (log.includes("[SISTEMA]") || log.includes("[MANIPOLAZIONE]") || log.includes("[IPO]")) colorClass = "text-purple-300";
                          if (log.includes("P&L: -") || log.includes("[PIGNORAMENTO]") || log.includes("[BANCA]") || log.includes("[TASSE]")) colorClass = "text-rose-400";
                          
                          return <div key={i} className={`mb-1.5 border-b border-slate-800/50 pb-1.5 ${colorClass}`}>{log}</div>;
                      })}
                      {adminLogs.length === 0 && <div className="text-slate-600 italic">Nessun log disponibile.</div>}
                    </div>
                  )}
                </div>
            </div>

            <div className="bg-nebula-900/60 p-6 border border-cyan-900/50 rounded-xl backdrop-blur-md transition-all mb-6">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-cyan-900/50 pb-2 flex items-center"><Search className="w-5 h-5 mr-2 text-cyan-500"/> Ispezione & Controllo Utente</h3>
                <div className="flex space-x-4 mb-4">
                  <select value={adminUserQuery} onChange={e => setAdminUserQuery(e.target.value)} className="flex-1 bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono outline-none focus:border-cyan-500 transition-colors">
                      <option value="">-- Seleziona un utente dalla lista --</option>
                      {adminUsersList.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
                      ))}
                  </select>
                  <button onClick={() => { if(adminUserQuery) socket.emit('admin_fetch_user', adminUserQuery); }} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded transition-colors">Ispeziona</button>
                </div>

                {adminFetchedUser && (
                  <div className="bg-nebula-950/80 p-5 rounded-xl border border-cyan-500/30 text-sm mt-4 relative overflow-hidden animate-fade-in">
                    
                    {adminFetchedUser.isFrozen && (
                        <div className="absolute inset-0 bg-cyan-900/20 backdrop-blur-sm z-0 pointer-events-none flex items-center justify-center">
                            <span className="text-cyan-500 font-black text-6xl opacity-20 -rotate-12 border-8 border-cyan-500 p-4">CONGELATO</span>
                        </div>
                    )}
                    
                    <div className="flex items-center space-x-4 mb-4 border-b border-nebula-border/50 pb-4 relative z-10">
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 relative z-10">
                      <div className={`p-2 rounded text-center text-xs font-bold border ${adminFetchedUser.isProMax ? 'bg-purple-900/20 border-purple-500/50 text-purple-400' : 'bg-nebula-900 border-nebula-border text-slate-500'}`}>PRO: {adminFetchedUser.isProMax ? 'ATTIVO' : 'NO'}</div>
                      <div className={`p-2 rounded text-center text-xs font-bold border ${adminFetchedUser.isPro ? 'bg-amber-900/20 border-amber-500/50 text-amber-500' : 'bg-nebula-900 border-nebula-border text-slate-500'}`}>PLUS: {adminFetchedUser.isPro ? 'ATTIVO' : 'NO'}</div>
                      <div className="p-2 rounded text-center text-xs font-bold border bg-nebula-900 border-nebula-border text-slate-400">
                          Scadenza VIP: {adminFetchedUser.proExpireDate ? new Date(adminFetchedUser.proExpireDate).toLocaleDateString() : (adminFetchedUser.isPro ? 'LIFETIME' : 'N/A')}
                      </div>
                      <div className="p-2 rounded text-center text-xs font-bold border bg-rose-900/20 border-rose-500/50 text-rose-400">DEBITO: {formatCurrency(adminFetchedUser.loan || 0)}</div>
                    </div>
                    
                    <div className="flex space-x-4 mb-6 border-b border-nebula-border/50 pb-6 relative z-10">
                        {user.isAdmin && (
                            <button onClick={() => socket.emit('admin_action', { type: 'toggle_finanza', userId: adminFetchedUser.id })} className={`flex-1 py-2 border rounded font-bold text-xs uppercase transition-colors ${adminFetchedUser.isFinanza ? 'border-emerald-500 text-emerald-400 hover:bg-emerald-900/30' : 'border-slate-600 text-slate-400 hover:bg-slate-800'}`}>
                                {adminFetchedUser.isFinanza ? 'Rimuovi Permessi Finanza' : 'Rendi Operatore Finanza'}
                            </button>
                        )}
                        <button onClick={() => socket.emit('admin_action', { type: 'toggle_freeze', userId: adminFetchedUser.id })} className={`flex-1 py-2 border rounded font-bold text-xs uppercase transition-colors ${adminFetchedUser.isFrozen ? 'bg-cyan-600 border-cyan-500 text-white hover:bg-cyan-500' : 'border-cyan-500 text-cyan-400 hover:bg-cyan-900/30'}`}>
                            {adminFetchedUser.isFrozen ? 'Scongela Account' : 'Congela Account (Blocca tutto)'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 relative z-10">
                        <div className="bg-black/40 p-4 rounded-lg border border-nebula-border">
                            <h4 className="text-xs uppercase font-bold text-slate-400 mb-3 flex items-center"><Wallet className="w-3 h-3 mr-2"/> Gestione Saldo</h4>
                            <div className="flex space-x-2">
                                <select value={adminCash.action} onChange={e => setAdminCash({...adminCash, action: e.target.value})} className="bg-nebula-900 border border-nebula-border rounded px-2 text-white text-xs outline-none">
                                    <option value="add">Aggiungi (+)</option>
                                    <option value="sub">Rimuovi (-)</option>
                                    <option value="set">Imposta a (=)</option>
                                </select>
                                <input type="number" step="any" value={adminCash.amount} onChange={e => setAdminCash({...adminCash, amount: e.target.value})} className="w-24 bg-nebula-900 border border-nebula-border rounded px-2 text-white font-mono outline-none text-xs" />
                                <button onClick={() => socket.emit('admin_action', { type: 'cash', userId: adminFetchedUser.id, action: adminCash.action, amount: parseFloat(adminCash.amount) })} className="px-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded text-xs transition-colors">Esegui</button>
                            </div>
                        </div>

                        <div className="bg-black/40 p-4 rounded-lg border border-nebula-border">
                            <h4 className="text-xs uppercase font-bold text-slate-400 mb-3 flex items-center"><LineChart className="w-3 h-3 mr-2"/> Gestione Azioni (Holdings)</h4>
                            <div className="flex space-x-2">
                                <select value={adminHoldingsEdit.ticker} onChange={e => setAdminHoldingsEdit({...adminHoldingsEdit, ticker: e.target.value})} className="flex-1 bg-nebula-900 border border-nebula-border rounded px-2 text-white text-xs outline-none">
                                    {Object.keys(assets || {}).map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                                <input type="number" min="1" step="any" value={adminHoldingsEdit.qty} onChange={e => setAdminHoldingsEdit({...adminHoldingsEdit, qty: parseFloat(e.target.value)})} className="w-16 bg-nebula-900 border border-nebula-border rounded px-2 text-white font-mono outline-none text-xs" />
                            </div>
                            <div className="flex space-x-2 mt-2">
                                <button onClick={() => socket.emit('admin_action', { type: 'edit_user_holdings', userId: adminFetchedUser.id, ticker: adminHoldingsEdit.ticker, qty: adminHoldingsEdit.qty, action: 'add' })} className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px] uppercase transition-colors">Aggiungi</button>
                                <button onClick={() => socket.emit('admin_action', { type: 'edit_user_holdings', userId: adminFetchedUser.id, ticker: adminHoldingsEdit.ticker, qty: adminHoldingsEdit.qty, action: 'remove' })} className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-[10px] uppercase transition-colors">Rimuovi</button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 relative z-10">
                      <div className="text-xs text-slate-400 mb-3 uppercase font-bold tracking-wider">Portafoglio Attuale ({Object.keys(adminFetchedUser.holdings || {}).length})</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(adminFetchedUser.holdings || {}).map(([t, h]) => (
                          <div key={t} className="bg-nebula-900 p-3 rounded-lg border border-nebula-border flex justify-between items-center">
                            <span className="font-bold text-white text-sm">{t}</span>
                            <span className="font-mono text-cyan-400">{h.shares} <span className="text-[10px] text-slate-500">pz</span></span>
                          </div>
                        ))}
                        {Object.keys(adminFetchedUser.holdings || {}).length === 0 && <div className="text-xs text-slate-500 col-span-4">Nessun asset in portafoglio.</div>}
                      </div>
                    </div>
                  </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-nebula-900/60 p-6 border border-rose-900/50 rounded-xl backdrop-blur-md transition-all">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-rose-900/50 pb-2">Modifica Parametri Asset (Live)</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="col-span-2"><label className="text-xs text-slate-400 block mb-1">Seleziona Asset</label><select value={adminPriceEdit.ticker} onChange={e => setAdminPriceEdit({ ...adminPriceEdit, ticker: e.target.value })} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none">{Object.keys(assets || {}).map(k => <option key={k} value={k}>{k}</option>)}</select></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Forza Prezzo (€)</label><input type="number" step="any" id="adm-prc" className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Volatilità Base</label><input type="number" step="any" value={adminPriceEdit.vol} onChange={e=>setAdminPriceEdit({...adminPriceEdit, vol: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono outline-none" placeholder="Es. 0.02" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Limite Max Azioni</label><input type="number" value={adminPriceEdit.maxShares} onChange={e=>setAdminPriceEdit({...adminPriceEdit, maxShares: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Tassa Hold (€/pz)</label><input type="number" step="any" value={adminPriceEdit.holdingTax} onChange={e=>setAdminPriceEdit({...adminPriceEdit, holdingTax: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Prezzo MAX (Tetto)</label><input type="number" value={adminPriceEdit.maxPrice} onChange={e=>setAdminPriceEdit({...adminPriceEdit, maxPrice: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Prezzo MIN (Pavimento)</label><input type="number" step="any" value={adminPriceEdit.minPrice} onChange={e=>setAdminPriceEdit({...adminPriceEdit, minPrice: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono outline-none" /></div>
                </div>
                <div className="grid grid-cols-4 gap-2 border-t border-rose-900/50 pt-4">
                  <button onClick={() => {
                    if(document.getElementById('adm-prc').value) socket.emit('admin_action', { type: 'price', ticker: adminPriceEdit.ticker, price: parseFloat(document.getElementById('adm-prc').value) });
                    socket.emit('admin_action', { type: 'edit_asset', ticker: adminPriceEdit.ticker, updates: { vol: adminPriceEdit.vol, maxShares: adminPriceEdit.maxShares, maxPrice: adminPriceEdit.maxPrice, minPrice: adminPriceEdit.minPrice, holdingTax: adminPriceEdit.holdingTax } });
                  }} className="col-span-2 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-xs transition-colors">Aggiorna Asset</button>
                  <button onClick={() => socket.emit('admin_action', { type: 'reset_chart', ticker: adminPriceEdit.ticker })} className="col-span-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded text-xs flex items-center justify-center transition-colors"><RefreshCw className="w-3 h-3 mr-1"/> Reset</button>
                  <button onClick={() => { if(window.confirm('Cancellare asset e rubare soldi agli utenti?')) socket.emit('admin_action', { type: 'delete_asset', ticker: adminPriceEdit.ticker })}} className="col-span-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-xs flex items-center justify-center transition-colors"><Trash2 className="w-3 h-3 mr-1"/> Elimina</button>
                </div>
              </div>

              <div className="bg-nebula-900/60 p-6 border border-emerald-900/50 rounded-xl backdrop-blur-md transition-all">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-emerald-900/50 pb-2">Convalida Prelievi</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Codice di Prelievo (Fornito dall'utente o generato dai fondi)</label>
                    <div className="flex space-x-2">
                      <input type="text" value={adminCodeInput} onChange={e => setAdminCodeInput(e.target.value)} placeholder="WTH-XXXXX / FND-XXXX" className="flex-1 bg-nebula-950 border border-emerald-900/50 rounded px-3 py-2 text-white font-mono uppercase outline-none focus:border-emerald-500 transition-colors" />
                      <button onClick={() => socket.emit('admin_verify_code', adminCodeInput.trim().toUpperCase())} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded transition-colors"><Key className="w-4 h-4"/></button>
                    </div>
                  </div>
                  
                  {adminValidator && (
                    <div className="mt-4 p-4 border border-emerald-500/30 bg-emerald-900/20 rounded-lg relative overflow-hidden animate-fade-in">
                      {adminValidator.isRedeemed && (
                          <div className="absolute -bottom-2 -right-4 text-rose-500 font-black text-4xl rotate-[-15deg] opacity-20 border-4 border-rose-500 p-2 z-0 pointer-events-none select-none">RISCATTATA</div>
                      )}
                      <h4 className="font-black text-emerald-400 mb-2 flex items-center z-10 relative"><Check className="w-4 h-4 mr-2"/> CHIAVE AUTENTICA</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono z-10 relative">
                        <span className="text-slate-400">Utente/Ente:</span><span className="text-white font-bold">{adminValidator.name}</span>
                        <span className="text-slate-400">Da erogare (Netto):</span><span className="text-white font-bold text-lg">{formatCurrency(adminValidator.amount)}</span>
                        <span className="text-slate-400">Data Emissione:</span><span className="text-white">{adminValidator.date}</span>
                      </div>
                      <p className={`mt-3 text-xs z-10 relative font-bold ${adminValidator.isRedeemed ? 'text-rose-400' : 'text-emerald-300'}`}>
                          {adminValidator.isRedeemed ? 'ATTENZIONE: Questa chiave è già stata validata e pagata in passato!' : 'I soldi sono stati scalati con successo. Eroga il pagamento in RP.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* --- SEZIONI ESCLUSIVE ADMIN (NON VISIBILI A FINANZA) --- */}
            {user.isAdmin && (
            <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              
              <div className="bg-nebula-900/60 p-6 border border-cyan-900/50 rounded-xl backdrop-blur-md flex flex-col transition-all">
                  <h3 className="text-lg font-bold text-white mb-2 border-b border-cyan-900/50 pb-2 flex items-center"><Newspaper className="w-5 h-5 mr-2 text-cyan-500"/> Notizie e Generatore</h3>
                  <div className="flex flex-col space-y-4 mt-2">
                      <div className="bg-black/40 p-3 rounded border border-cyan-900/50">
                          <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Notizia del giorno (Homepage)</label>
                          <div className="flex space-x-2">
                              <input type="text" value={globalConfig.dailyNews} onChange={e => setGlobalConfig({...globalConfig, dailyNews: e.target.value})} className="flex-1 bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-xs outline-none focus:border-cyan-500" />
                              <button onClick={() => socket.emit('admin_action', { type: 'set_daily_news', msg: globalConfig.dailyNews })} className="px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded transition-colors">Salva</button>
                          </div>
                      </div>
                      <div className="border-t border-cyan-900/50 pt-4">
                          <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Genera Evento Live (Market Mover)</label>
                          <input type="text" placeholder="Titolo Notizia..." value={adminNews.title} onChange={e => setAdminNews({...adminNews, title: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-xs outline-none focus:border-cyan-500 mb-2" />
                          <input type="text" placeholder="Messaggio per tutti gli utenti..." value={adminNews.msg} onChange={e => setAdminNews({...adminNews, msg: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-xs outline-none focus:border-cyan-500 mb-2" />
                          <div className="flex space-x-2">
                            <button onClick={() => setAdminNews({...adminNews, isBull: !adminNews.isBull})} className={`flex-1 py-2 rounded text-xs font-bold border transition-colors ${adminNews.isBull ? 'bg-emerald-900/50 text-emerald-400 border-emerald-500/50' : 'bg-rose-900/50 text-rose-400 border-rose-500/50'}`}>
                                {adminNews.isBull ? 'BULL (Positivo)' : 'BEAR (Negativo)'}
                            </button>
                            <button onClick={() => {
                                if(!adminNews.msg || !adminNews.title) return showToast("Compila Titolo e Messaggio.", "error");
                                socket.emit('admin_action', { type: 'broadcast_news', title: adminNews.title, msg: adminNews.msg, isBull: adminNews.isBull });
                                setAdminNews({title: '', msg: '', isBull: true});
                            }} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded transition-colors">Invia</button>
                          </div>
                      </div>
                  </div>
              </div>

              {/* GENERATORE CODICI SCONTO E PAYWALL */}
              <div className="bg-nebula-900/60 p-6 border border-amber-500/30 rounded-xl backdrop-blur-md flex flex-col transition-all">
                  <h3 className="text-lg font-bold text-amber-500 mb-2 border-b border-amber-500/30 pb-2 flex items-center"><Key className="w-5 h-5 mr-2"/> Generatori Codici (Paywall & Subs)</h3>
                  
                  {/* PAYWALL */}
                  <div className="mb-6 bg-black/40 p-4 rounded-lg border border-amber-500/20">
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Chiave Accesso Base (15.000€)</label>
                      <div className="flex space-x-2">
                          <button onClick={() => socket.emit('admin_action', { type: 'generate_access_key' })} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded transition-colors">Genera Chiave Paywall</button>
                          {adminAccessKey && <div className="flex-1 bg-black p-2 rounded text-center border border-amber-500/50 font-mono text-amber-400 text-sm select-all flex items-center justify-center">{adminAccessKey}</div>}
                      </div>
                  </div>

                  {/* ABBONAMENTI */}
                  <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Codici Promozionali Abbonamento (VIP)</label>
                      <div className="flex space-x-2 mb-4">
                          <select value={adminPromo.tier} onChange={e => setAdminPromo({...adminPromo, tier: e.target.value})} className="bg-nebula-950 border border-nebula-border rounded px-2 py-2 text-white text-xs outline-none">
                              <option value="PRO">PLUS</option>
                              <option value="PROMAX">PRO</option>
                          </select>
                          
                          <select value={adminPromo.unit} onChange={e => setAdminPromo({...adminPromo, unit: e.target.value})} className="bg-nebula-950 border border-nebula-border rounded px-2 py-2 text-white text-xs outline-none">
                              <option value="days">Giorni</option>
                              <option value="months">Mesi</option>
                              <option value="years">Anni</option>
                              <option value="lifetime">Lifetime</option>
                          </select>

                          {adminPromo.unit !== 'lifetime' && (
                              <input type="number" min="1" value={adminPromo.duration} onChange={e => setAdminPromo({...adminPromo, duration: parseInt(e.target.value) || 1})} className="w-16 bg-nebula-950 border border-nebula-border rounded px-2 py-2 text-white font-mono text-xs outline-none" placeholder="Durata" />
                          )}
                          
                          <button onClick={() => {
                              socket.emit('admin_action', { type: 'generate_promo', tier: adminPromo.tier, duration: adminPromo.duration, unit: adminPromo.unit });
                          }} className="flex-1 px-2 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded transition-colors">Genera VIP</button>
                      </div>
                      {adminPromo.generatedCode && (
                          <div className="bg-black/50 border border-amber-500/50 p-2 rounded text-center">
                              <span className="text-[10px] text-slate-400 block mb-1">Codice Generato ({adminPromo.label}):</span>
                              <span className="font-mono text-amber-400 font-bold select-all">{adminPromo.generatedCode}</span>
                          </div>
                      )}
                  </div>
              </div>
            </div>

            {/* EDITOR ALGORITMO (NUOVO) */}
            <div className="mb-6 bg-nebula-900/60 p-6 border border-indigo-500/30 rounded-xl backdrop-blur-md transition-all">
                <h3 className="text-lg font-bold text-indigo-400 mb-2 border-b border-indigo-500/30 pb-2 flex items-center justify-between">
                    <span className="flex items-center"><Settings className="w-5 h-5 mr-2"/> Editor Avanzato Algoritmo</span>
                    <button onClick={showAlgoGuide} className="text-[10px] bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded hover:bg-indigo-900 transition-colors">? Guida</button>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="mb-4">
                            <label className="text-xs text-slate-400 block mb-1">Moltiplicatore Globale Volatilità (Default: 1.0)</label>
                            <input type="number" step="0.1" value={adminAlgoInput.volMult} onChange={e => setAdminAlgoInput({...adminAlgoInput, volMult: parseFloat(e.target.value)})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono text-sm outline-none" />
                        </div>
                        <div className="mb-4">
                            <label className="text-xs text-slate-400 block mb-1">Bias di Drift Globale (+ per bull, - per bear. Default: 0.0)</label>
                            <input type="number" step="0.0001" value={adminAlgoInput.driftOffset} onChange={e => setAdminAlgoInput({...adminAlgoInput, driftOffset: parseFloat(e.target.value)})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono text-sm outline-none" />
                        </div>
                        <div className="flex space-x-2 mb-4">
                            <button onClick={() => setAdminAlgoInput({volMult: 1.0, driftOffset: 0.0})} className="flex-1 text-[10px] bg-slate-700 hover:bg-slate-600 text-white rounded py-1 transition-colors">Standard</button>
                            <button onClick={() => setAdminAlgoInput({volMult: 2.5, driftOffset: 0.0})} className="flex-1 text-[10px] bg-amber-700 hover:bg-amber-600 text-white rounded py-1 transition-colors">Alta Volatilità</button>
                            <button onClick={() => setAdminAlgoInput({volMult: 0.8, driftOffset: 0.005})} className="flex-1 text-[10px] bg-emerald-700 hover:bg-emerald-600 text-white rounded py-1 transition-colors">Bull Lento</button>
                            <button onClick={() => setAdminAlgoInput({volMult: 1.8, driftOffset: -0.008})} className="flex-1 text-[10px] bg-rose-700 hover:bg-rose-600 text-white rounded py-1 transition-colors">Crollo (Bear)</button>
                        </div>
                        <button onClick={() => socket.emit('admin_action', { type: 'update_algo', volMult: adminAlgoInput.volMult, driftOffset: adminAlgoInput.driftOffset })} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-xs transition-colors">Applica al Server</button>
                    </div>
                    
                    <div className="flex flex-col">
                        <label className="text-xs text-slate-400 block mb-2">Anteprima Mini-Simulazione (Base 100€, 60 Tick Live)</label>
                        <div className="flex-1">
                            {renderAlgoPreview()}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 italic text-center">L'anteprima si anima costantemente e reagisce ai parametri inseriti qui a sinistra.</p>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-nebula-900/60 p-6 border border-rose-900/50 rounded-xl backdrop-blur-md transition-all">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-rose-900/50 pb-2">Controllo Tempo Server & Velocità</h3>
                
                {/* ORA / MINUTI */}
                <div className="flex items-center space-x-4 mb-4">
                  <div><label className="text-xs text-slate-400 block mb-1">Ore (0-23)</label><input type="number" id="adm-hh" defaultValue={gameTime?.hours} className="bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono w-20 outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Minuti (0-59)</label><input type="number" id="adm-mm" defaultValue={gameTime?.minutes} className="bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono w-20 outline-none" /></div>
                  <div className="flex items-end h-full pt-5"><button onClick={() => socket.emit('admin_action', { type: 'time', hh: parseInt(document.getElementById('adm-hh').value), mm: parseInt(document.getElementById('adm-mm').value) })} className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded">Forza Orario</button></div>
                </div>

                {/* VELOCITÀ TICK */}
                <div className="flex items-center space-x-4 border-t border-rose-900/50 pt-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Velocità Tick (ms)</label>
                    <input type="number" value={adminTickRate} onChange={e => setAdminTickRate(e.target.value)} min="100" className="bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono w-24 outline-none" />
                  </div>
                  <div className="flex items-end h-full pt-5">
                    <button onClick={() => socket.emit('admin_action', { type: 'set_tick_rate', ms: adminTickRate })} className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded">Applica Velocità</button>
                  </div>
                </div>
              </div>

              {/* GESTIONE FONDI TASSE E DB */}
              {dbBackupInfo && dbBackupInfo.funds && (
                  <div className="bg-nebula-900/60 p-6 border border-emerald-900/50 rounded-xl backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all">
                      <h3 className="text-lg font-bold text-white mb-2 border-b border-emerald-900/50 pb-2 flex items-center"><Landmark className="w-5 h-5 mr-2 text-emerald-500"/> Gestione Fondi Tassazione (Escluse Crypto)</h3>
                      <p className="text-[10px] text-slate-400 mb-4">Lo Stato incassa il grosso, le aziende si dividono un 6% proporzionale.</p>
                      <div className="grid grid-cols-1 gap-4">
                          <div className="bg-nebula-950 p-4 rounded-lg border border-emerald-500/30 flex justify-between items-center">
                              <div>
                              <div className="text-[10px] text-emerald-500 uppercase font-bold tracking-wider mb-1">Fondo Statale (RP)</div>
                              <div className="text-2xl font-mono text-white">{formatCurrency(dbBackupInfo.funds.state)}</div>
                              </div>
                              <button onClick={() => socket.emit('admin_withdraw_fund', { target: 'state' })} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded transition-colors">Preleva</button>
                          </div>
                          <div className="bg-nebula-950 p-4 rounded-lg border border-cyan-500/30">
                              <div className="text-[10px] text-cyan-500 uppercase font-bold tracking-wider mb-3">Fondi Aziendali (Da erogare)</div>
                              <div className="space-y-2 max-h-24 overflow-y-auto custom-scroll pr-2">
                              {Object.entries(dbBackupInfo.funds.companies).map(([ticker, amount]) => amount > 0 && (
                                  <div key={ticker} className="flex justify-between items-center text-sm border-b border-nebula-border/50 pb-2">
                                  <span className="font-bold text-white">{ticker}</span>
                                  <div className="flex items-center space-x-3">
                                      <span className="font-mono text-slate-300">{formatCurrency(amount)}</span>
                                      <button onClick={() => socket.emit('admin_withdraw_fund', { target: ticker })} className="px-2 py-1 bg-cyan-600/30 text-cyan-400 hover:bg-cyan-600/50 text-[10px] rounded transition-colors">Preleva</button>
                                  </div>
                                  </div>
                              ))}
                              {Object.values(dbBackupInfo.funds.companies).every(v => v === 0) && <div className="text-xs text-slate-500">Nessun fondo aziendale accumulato.</div>}
                              </div>
                          </div>
                      </div>
                  </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-nebula-900/60 p-6 border border-rose-900/50 rounded-xl backdrop-blur-md transition-all">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-rose-900/50 pb-2">Aggiunta Nuove Compagnie / Crypto (IPO)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div><label className="text-xs text-slate-400 block mb-1">Mercato</label><select value={newAsset.type} onChange={e => setNewAsset({...newAsset, type: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none"><option value="stocks">Azioni Standard</option><option value="crypto">Crypto Standard</option><option value="promax_stocks">Azioni PLUS</option><option value="promax_crypto">Crypto PRO</option></select></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Ticker (Es. AAPL)</label><input type="text" maxLength="5" value={newAsset.ticker} onChange={e => setNewAsset({...newAsset, ticker: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm uppercase outline-none" /></div>
                  <div className="md:col-span-2"><label className="text-xs text-slate-400 block mb-1">Nome Completo</label><input type="text" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  
                  <div><label className="text-xs text-slate-400 block mb-1">Prezzo Iniziale (€)</label><input type="number" step="0.1" value={newAsset.price} onChange={e => setNewAsset({...newAsset, price: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Volatilità (Es. 0.02)</label><input type="number" step="0.01" value={newAsset.vol} onChange={e => setNewAsset({...newAsset, vol: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Limite Azioni Globale</label><input type="number" value={newAsset.maxShares} onChange={e => setNewAsset({...newAsset, maxShares: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Tassa Hold (€/pz)</label><input type="number" step="any" value={newAsset.holdingTax} onChange={e => setNewAsset({...newAsset, holdingTax: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  
                  <div><label className="text-xs text-slate-400 block mb-1">Settore</label><input type="text" value={newAsset.sector} onChange={e => setNewAsset({...newAsset, sector: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Market Cap</label><input type="text" value={newAsset.mcap} onChange={e => setNewAsset({...newAsset, mcap: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">CEO</label><input type="text" value={newAsset.ceo} onChange={e => setNewAsset({...newAsset, ceo: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Dipendenti</label><input type="text" value={newAsset.employees} onChange={e => setNewAsset({...newAsset, employees: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                  
                  <div className="md:col-span-4 flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                    <div className="flex-1"><label className="text-xs text-slate-400 block mb-1">Descrizione Lunga</label><input type="text" value={newAsset.desc} onChange={e => setNewAsset({...newAsset, desc: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none" /></div>
                    <div className="flex items-center space-x-2 md:pt-4">
                      <input type="checkbox" id="isProTick" checked={newAsset.isPro} onChange={e => setNewAsset({...newAsset, isPro: e.target.checked})} className="w-4 h-4 cursor-pointer" />
                      <label htmlFor="isProTick" className="text-sm font-bold text-amber-500 cursor-pointer">Segna come PLUS</label>
                    </div>
                    <div className="flex items-center space-x-2 md:pt-4">
                      <input type="checkbox" id="isProMaxTick" checked={newAsset.isProMax} onChange={e => setNewAsset({...newAsset, isProMax: e.target.checked, isPro: e.target.checked ? true : newAsset.isPro})} className="w-4 h-4 cursor-pointer" />
                      <label htmlFor="isProMaxTick" className="text-sm font-bold text-purple-400 cursor-pointer">Segna come PRO</label>
                    </div>
                  </div>
                </div>
                <button onClick={() => {
                  if (!newAsset.ticker || !newAsset.name) return showToast("Compila almeno Ticker e Nome.", "error");
                  socket.emit('admin_action', { type: 'ipo', asset: newAsset });
                  showToast("Lancio IPO effettuato sul server centrale.", "success");
                }} className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors">Aggiungi Definitivamente al Mercato (IPO)</button>
              </div>

              <div className="bg-nebula-900/60 p-6 border border-cyan-900/50 rounded-xl backdrop-blur-md transition-all">
                  <h3 className="text-lg font-bold text-white mb-2 border-b border-cyan-900/50 pb-2 flex items-center"><Globe className="w-5 h-5 mr-2 text-cyan-500"/> DB Backup</h3>
                  <p className="text-[10px] text-slate-400 mb-4">Salva prima di riavviare.</p>
                  <div className="flex flex-col space-y-2">
                      <button onClick={() => { downloadRequestedRef.current = true; socket.emit('admin_fetch_db'); }} className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded flex items-center justify-center text-xs transition-colors"><Download className="w-3 h-3 mr-2"/> Scarica JSON</button>
                      <label className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded flex items-center justify-center cursor-pointer text-xs transition-colors">
                      <Upload className="w-3 h-3 mr-2"/> Ripristina JSON
                      <input type="file" accept=".json" className="hidden" onChange={handleRestoreDb} />
                      </label>
                  </div>
              </div>
            </div>
            </>
            )}

          </div>

        </main>
      </div>

      {depositModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
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
                <li>Attendi che lo staff approvi e accrediti la somma sul tuo terminale.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {discordModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-nebula-900/90 border border-cyan-500/50 rounded-2xl max-w-sm w-full p-6 relative">
            <button onClick={() => setDiscordModal({open: false, type: '', code: ''})} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            <div className="text-center mb-6">
              <Wallet className="w-10 h-10 text-cyan-400 mx-auto mb-2" />
              <h3 className="text-xl font-bold text-white">Prelievo Denaro</h3>
            </div>
            {discordModal.type === 'WITHDRAW' ? (
              <>
                <div className="text-xs text-slate-400 mb-4 text-center">
                  <p className="mb-2">Prelievo Minimo: 100€</p>
                  {(user.isPro || user.isProMax) ? (
                      <p className="text-emerald-400 mb-2 font-bold">Vantaggio VIP: Prelievi Giornalieri Illimitati</p>
                  ) : (
                      <p className="text-emerald-400 mb-2">Prelievi oggi: {user.withdrawalsToday || 0} / 3</p>
                  )}
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-left border border-nebula-border p-2 rounded mb-3">
                    <span>100€ - 5.000€</span><span className="text-right text-rose-400">Tassa 26%</span>
                    <span>5.000€ - 25.000€</span><span className="text-right text-rose-400">Tassa 35%</span>
                    <span>25.000€ - 50.000€</span><span className="text-right text-rose-400">Tassa 40%</span>
                    <span>Oltre 50.000€</span><span className="text-right text-rose-400">Tassa 60%</span>
                  </div>
                </div>
                <input type="number" id="dm-amount" defaultValue="100" min="100" step="any" className="w-full bg-nebula-950 border border-nebula-border rounded-lg py-3 px-4 text-white font-mono font-bold text-lg mb-4 outline-none focus:border-cyan-500 transition-colors" />
                <button onClick={requestWithdrawal} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-colors">Genera Chiave di Prelievo</button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-sm text-emerald-400 mb-4 font-bold">Richiesta elaborata.</p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4 text-slate-300">
                  <span className="text-left">Prelievo Lordo:</span> <span className="text-right">{formatCurrency(discordModal.netAmount + discordModal.taxAmount)}</span>
                  <span className="text-left text-rose-400">Tasse (-{(discordModal.rate * 100).toFixed(0)}%):</span> <span className="text-right text-rose-400">-{formatCurrency(discordModal.taxAmount)}</span>
                  <span className="text-left font-bold text-white border-t border-nebula-border pt-1">Importo Netto:</span> <span className="text-right font-bold text-emerald-400 border-t border-nebula-border pt-1">{formatCurrency(discordModal.netAmount)}</span>
                </div>
                <div className="bg-black border border-nebula-border p-4 rounded-xl mb-4">
                  <p className="text-xs text-slate-500 mb-1">La tua Chiave di Prelievo:</p>
                  <p className="font-mono text-xl text-white tracking-widest select-all">{discordModal.code}</p>
                </div>
                <p className="text-xs text-slate-400">Invia questa chiave in assistenza su Discord per ricevere i fondi netti in RP.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STILI PER ANIMAZIONI GLOBALI E FULLSCREEN */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
      `}} />

      <div className="fixed bottom-5 right-5 z-[70] flex flex-col space-y-3 pointer-events-none w-80">
        {toasts.map(t => (
          <div key={t.id} className={`bg-nebula-900/80 p-3 rounded-xl flex items-center space-x-3 border-l-4 ${t.type === 'success' ? 'border-emerald-500' : t.type === 'error' ? 'border-rose-500' : 'border-cyan-500'} shadow-lg backdrop-blur-md animate-fade-in`}>
            {t.type === 'success' ? <Check className="w-4 h-4 text-emerald-400"/> : <X className="w-4 h-4 text-rose-400"/>}
            <span className="text-white text-xs font-bold leading-tight">{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
