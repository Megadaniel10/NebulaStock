import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart2, Wallet, MessageCircle, Settings, Lock, UserCog, 
  Factory, Coins, Globe, Plus, Send, X, Check, 
  LineChart, Store, Clock, Users, Building, Percent, Search,
  LogOut, Image, Zap, Trash2, RefreshCw, Key, Download, Upload,
  Landmark, ArrowRightCircle, AlertTriangle, ScrollText, ChevronDown,
  TrendingUp, TrendingDown, Target, Maximize, Minimize, Newspaper, FileCode2, Snowflake, Ticket, Activity
} from 'lucide-react';
import { io } from 'socket.io-client';

import tottiImg from './totti.png';

const DISCORD_CLIENT_ID = "1544048974175019058";
// MODIFICA QUI IL LINK DEL TUO BACKEND QUANDO CAMBIA SU CLOUDFLARE
const BACKEND_URL = "https://constraint-employee-university-des.trycloudflare.com"; 

let socket;

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const [user, setUser] = useState({ id: '', name: '', avatar: '', colorName: '#ffffff', colorText: '#cbd5e1', bgImage: '', isAdmin: false, isFinanza: false, isFrozen: false, withdrawalsToday: 0, limitOrders: [], hasSeenResetPopup: true });
  const [portfolio, setPortfolio] = useState({ cash: 3000, holdings: {} }); 
  
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
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  
  const [discordModal, setDiscordModal] = useState({ open: false, type: '', code: '', netAmount: 0, taxAmount: 0, rate: 0 });
  const [depositModal, setDepositModal] = useState(false);
  const [bets, setBets] = useState({});
  const [betAmounts, setBetAmounts] = useState({});
  const [offlineSummary, setOfflineSummary] = useState(null); 
  
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
  const [newAsset, setNewAsset] = useState({ type: 'stocks', ticker: '', name: '', price: 10, vol: 0.02, sector: 'Tech', mcap: '€1M', desc: '', ceo: '', founded: '', employees: '', dividend: '0.00%', maxShares: 10000, maxPrice: 600, minPrice: 5.0, holdingTax: 0 });
  const [adminTickRate, setAdminTickRate] = useState(2000);
  const [adminAlgoInput, setAdminAlgoInput] = useState({ volMult: 1.0, driftOffset: 0.0 });
  const [newBet, setNewBet] = useState({ name: '' });
  const [betOptions, setBetOptions] = useState([{ name: '', quote: 2.0 }, { name: '', quote: 2.0 }]);
  const [adminPromo, setAdminPromo] = useState({ tier: 'PRO', duration: 30, unit: 'days', generatedCode: '', label: '' });
  const [riskAccounts, setRiskAccounts] = useState([]);

  const [previewPts, setPreviewPts] = useState(Array(60).fill(100));
  const previewMomentum = useRef(0);

  const marketCanvasRef = useRef(null);
  const chatScrollRef = useRef(null);
  const downloadRequestedRef = useRef(false); 

  // SUONI DI SISTEMA
  useEffect(() => {
      const savedSound = localStorage.getItem('nebula_sound_enabled');
      if (savedSound !== null) setSoundEnabled(savedSound === 'true');
  }, []);

  useEffect(() => {
      const handleGlobalClick = (e) => {
          if (soundEnabled && (e.target.tagName === 'BUTTON' || e.target.closest('button'))) {
              try {
                  const AudioContext = window.AudioContext || window.webkitAudioContext;
                  if (!AudioContext) return;
                  const ctx = new AudioContext();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.type = 'sine';
                  osc.frequency.setValueAtTime(600, ctx.currentTime);
                  gain.gain.setValueAtTime(0.05, ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                  osc.start(ctx.currentTime);
                  osc.stop(ctx.currentTime + 0.1);
              } catch(err) {}
          }
      };
      document.addEventListener('click', handleGlobalClick);
      return () => document.removeEventListener('click', handleGlobalClick);
  }, [soundEnabled]);

  useEffect(() => {
      const savedAsset = localStorage.getItem('nebula_selected_asset');
      if (savedAsset) setUi(p => ({ ...p, activeAsset: savedAsset }));
  }, []);

  useEffect(() => {
    socket = io(BACKEND_URL, { 
      withCredentials: true, transports: ['websocket', 'polling'], upgrade: true, reconnectionAttempts: 5, timeout: 10000
    });

    socket.on('connect', () => setIsBackendOnline(true));
    socket.on('disconnect', () => setIsBackendOnline(false));
    socket.on('connect_error', () => setIsBackendOnline(false));

    socket.on('market_init', (data) => {
      setAssets(data.assets || {}); setGameTime(data.gameTime || { day: 1, hours: 9, minutes: 0, isExtraordinary: false }); setChatHistory(prev => ({ ...prev, global: data.chat?.global || [] }));
    });
    socket.on('market_update', (data) => { setAssets(data.assets || {}); setGameTime(data.gameTime || { day: 1, hours: 9, minutes: 0, isExtraordinary: false }); });
    socket.on('market_news', (newsArray) => setMarketNews(newsArray));
    socket.on('admin_config', (cfg) => { setGlobalConfig(cfg); setAdminAlgoInput({ volMult: cfg.globalVolMult, driftOffset: cfg.globalDrift }); });
    socket.on('bets_update', (data) => setBets(data));

    socket.on('offline_summary', (data) => {
        setOfflineSummary(data);
    });

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
    socket.on('admin_users_list', (list) => setAdminUsersList(list));
    socket.on('admin_risk_accounts_data', (data) => setRiskAccounts(data));
    socket.on('chat_update', ({ room, chat }) => { setChatHistory(prev => ({ ...prev, [room]: chat })); });
    socket.on('toast', ({ msg, type }) => showToast(msg, type));
    
    socket.on('admin_promo_generated', ({ code, label }) => {
        setAdminPromo(p => ({ ...p, generatedCode: code, label }));
        showToast(`Codice Generato (${label})`, 'success');
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
              let drift = adminAlgoInput.driftOffset + 0.00015; 
              let realVol = 0.02 * adminAlgoInput.volMult;
              
              if (Math.random() < 0.15) { previewMomentum.current += (Math.random() - 0.5) * realVol * 4.0; }
              previewMomentum.current = (previewMomentum.current * 0.85) + ((Math.random() - 0.5) * realVol * 0.7);
              
              let next = last * (1 + drift + previewMomentum.current + (Math.random() - 0.5) * realVol);
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

  const sendMessage = (e) => {
    e.preventDefault(); if (!chatInput.trim()) return;
    if (chatInput.trim().toLowerCase() === "daje roma") {
        setShowEasterEgg(true);
        setTimeout(() => setShowEasterEgg(false), 5000);
    }
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
    a.download = `nebula_logs_${new Date().toISOString().split('T')[0]}.txt`;
    a.click(); URL.revokeObjectURL(url);
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

  // Calcolo Execution Fee (3%)
  let executionFee = 0;
  let baseValue = 0;

  if (activeAssetObj) {
    baseValue = (parseFloat(tradeQty || 0) * (ui.orderType === 'live' ? activeAssetObj.currentPrice : (parseFloat(limitPrice)||0)));
    if (baseValue > 0) {
        executionFee = baseValue * 0.03;
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
      <div className="min-h-screen w-screen bg-nebula-950 flex flex-col items-center justify-center relative overflow-hidden font-sans text-slate-300">
        <div className="w-full max-w-md flex flex-col justify-center p-10 z-10 relative">
            <div className="bg-nebula-900/80 border border-nebula-border backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full text-center">
              <Lock className="w-16 h-16 text-cyan-500 mx-auto mb-6" />
              
              {/* INDICATORE STATO SERVER */}
              <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold mb-4 border ${isBackendOnline ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' : 'bg-rose-900/30 border-rose-500/50 text-rose-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${isBackendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                  <span>{isBackendOnline ? 'Sistema Online' : 'Server Offline'}</span>
              </div>

              <h1 className="text-3xl font-black text-white mb-2 tracking-tight">NEBULA <span className="text-cyan-500">TERMINAL</span></h1>
              <p className="text-slate-400 text-sm mb-8">Piattaforma di simulazione finanziaria ufficiale.</p>
              
              <button onClick={() => window.location.href = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(window.location.origin)}&scope=identify`} className="w-full flex items-center justify-center space-x-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-4 px-4 rounded-xl transition-transform hover:scale-105 shadow-[0_0_20px_rgba(88,101,242,0.4)] mb-4 disabled:opacity-50 disabled:hover:scale-100" disabled={!isBackendOnline}>
                <MessageCircle className="w-5 h-5" /><span>Accedi con Discord</span>
              </button>

              <div className="flex space-x-2">
                  <button onClick={() => window.open('https://discord.gg/3g3bRnYXz7', '_blank')} className="flex-1 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-2 rounded-xl transition-colors border border-nebula-border text-xs">
                      <span>Server Discord</span>
                  </button>
                  <button onClick={() => window.open('https://urbanrp.it', '_blank')} className="flex-1 flex items-center justify-center bg-indigo-900/50 hover:bg-indigo-800/80 text-indigo-300 font-bold py-3 px-2 rounded-xl transition-colors border border-indigo-500/30 text-xs">
                      <Globe className="w-4 h-4 mr-2" /><span>Sito Urban RP</span>
                  </button>
              </div>
            </div>
        </div>
        
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

  let totalStockVal = 0;
  if(portfolio.holdings && assets) { 
      Object.keys(portfolio.holdings).forEach(t => { 
          if(assets[t]) totalStockVal += portfolio.holdings[t].shares * assets[t].currentPrice; 
      }); 
  }
  const currentNetWorth = (portfolio.cash || 0) + totalStockVal;

  return (
    <div className="h-screen w-screen flex flex-col text-sm antialiased text-e2e8f0 font-sans" style={user.bgImage ? { backgroundImage: `url(${user.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: '#05070e' }}>
      
      {/* POPUP RESOCONTO OFFLINE */}
      {offlineSummary && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-nebula-900 border border-cyan-500 p-8 rounded-2xl max-w-md text-center shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                  <Activity className={`w-12 h-12 mx-auto mb-4 ${offlineSummary.diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                  <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-widest">Resoconto Offline</h2>
                  <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                      Bentornato, {user.name}! Mentre eri offline, i movimenti del mercato e le tasse sulle proprietà hanno modificato il tuo portafoglio.
                  </p>
                  <div className="bg-black/50 rounded-xl p-4 mb-6 border border-nebula-border/50">
                      <div className="text-xs text-slate-500 uppercase mb-1 font-bold">Variazione Netta</div>
                      <div className={`text-4xl font-mono font-black ${offlineSummary.diff >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {offlineSummary.diff >= 0 ? '+' : ''}{formatCurrency(offlineSummary.diff)}
                      </div>
                  </div>
                  <button onClick={() => setOfflineSummary(null)} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl uppercase tracking-widest transition-transform hover:scale-105">Chiudi e Inizia Trading</button>
              </div>
          </div>
      )}

      {/* POPUP RESET */}
      {user.id && !user.hasSeenResetPopup && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-nebula-900 border border-cyan-500 p-8 rounded-2xl max-w-lg text-center shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                  <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-widest">Aggiornamento di Sistema</h2>
                  <p className="text-sm text-slate-300 mb-8 leading-relaxed">Gentili Utenti, a seguito dell'eliminazione dei piani in abbonamento, l'intera piattaforma è stata sottoposta a un ribilanciamento globale dei mercati. Per garantire equità con il nuovo sistema, è stato necessario effettuare un reset totale dei portafogli.<br/><br/>Il conto di ogni utente è stato ripristinato a un saldo di base di <strong className="text-emerald-400">3.000 €</strong>.<br/><br/>Vi auguriamo buon trading.<br/>– <em>Il Team di Nebula Stocks</em></p>
                  <button onClick={() => socket.emit('ack_reset_popup', { userId: user.id })} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl uppercase tracking-widest transition-transform hover:scale-105">Ho capito</button>
              </div>
          </div>
      )}

      {/* EASTER EGG DAJE ROMA */}
      {showEasterEgg && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none bg-black/80">
              <img src={tottiImg} alt="Daje Roma" className="w-auto h-1/2 max-w-lg object-contain animate-bounce shadow-[0_0_100px_rgba(255,255,255,0.5)] rounded-lg" />
          </div>
      )}

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
            <div className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Patrimonio Netto</div>
            <div className={`font-mono font-bold ${currentNetWorth < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>{formatCurrency(currentNetWorth)}</div>
          </div>
          <div className="flex items-center space-x-3 border-l border-nebula-border pl-6 cursor-pointer hover:opacity-80" onClick={() => changeTab('settings')}>
            <div className="text-right">
              <div className="text-sm font-semibold text-white" style={{color: user.colorName}}>{user.name}</div>
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
              { id: 'portfolio', icon: Wallet, label: 'Portafoglio' }, 
              { id: 'chance', icon: Ticket, label: 'NebulaChance' },
              { id: 'news', icon: Newspaper, label: 'Notizie Finanziarie' },
              { id: 'chat', icon: MessageCircle, label: 'Comunicazioni' }, 
              { id: 'settings', icon: Settings, label: 'Impostazioni' }
            ].map(nav => (
              <button key={nav.id} onClick={() => changeTab(nav.id)} className={`w-full flex items-center space-x-3 px-4 md:px-6 py-3 border-r-2 transition-all duration-300 ease-in-out ${ui.activeTab === nav.id ? 'text-white bg-nebula-800/80 border-cyan-500' : 'text-slate-400 hover:text-white hover:bg-nebula-800/50 border-transparent'}`}>
                <nav.icon className={`w-5 h-5 text-center ${nav.id === 'chance' ? 'text-purple-500' : ''}`} /><span className="hidden md:block font-medium text-sm">{nav.label}</span>
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
              </div>
              <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
                {Object.values(assets || {}).filter(a => a.type === ui.activeMarketType).map(asset => (
                  <div key={asset.ticker} onClick={() => selectAsset(asset.ticker)} className={`cursor-pointer p-3 rounded-lg border flex justify-between items-center transition-all duration-200 ${asset.ticker === ui.activeAsset ? 'bg-nebula-800/80 border-nebula-700 shadow-md' : 'border-transparent hover:bg-nebula-800/40'}`}>
                    <div>
                      <div className="font-bold text-white text-sm flex items-center space-x-2">
                        <span>{asset.ticker}</span>
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
                    <div className="text-left md:text-right shrink-0"><div className="text-3xl font-mono font-black text-white">{formatCurrency(activeAssetObj.currentPrice)}</div></div>
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
                    
                    {/* PANNELLO TRADE IN FULLSCREEN E FEE DI TRANSAZIONE */}
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
                                  
                                  {/* INFO FEE FULLSCREEN */}
                                  <div className="flex flex-col space-y-1 font-mono text-xs mb-3 pb-3 border-b border-nebula-border/50">
                                    <div className="flex justify-between items-center"><span className="text-slate-400">Valore Asset:</span><span className="font-bold text-white">{formatCurrency(baseValue)}</span></div>
                                    <div className="flex justify-between items-center text-rose-400"><span className="text-[10px]">Commissione Rete (3%):</span><span className="font-bold">+{formatCurrency(executionFee)}</span></div>
                                  </div>

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
                      {!isMarketOpen && (
                        <div className="absolute inset-0 bg-nebula-950/90 z-10 flex flex-col items-center justify-center backdrop-blur-md"><Store className="w-10 h-10 text-rose-500 mb-2" /><span className="text-rose-400 font-bold">Mercato Chiuso</span><span className="text-xs text-slate-400 mt-1">Apertura: 08:00 - 19:30</span></div>
                      )}
                      
                      <div className="flex border-b border-nebula-border mb-4">
                          <button onClick={()=>setUi(p=>({...p, orderType:'live'}))} className={`transition-all duration-300 pb-2 flex-1 text-center font-bold text-xs uppercase ${ui.orderType === 'live' ? 'border-b-2 border-cyan-500 text-white' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}>Mercato (Live)</button>
                          <button onClick={()=>setUi(p=>({...p, orderType:'limit'}))} className={`transition-all duration-300 pb-2 flex-1 text-center font-bold text-xs uppercase ${ui.orderType === 'limit' ? 'border-b-2 border-cyan-500 text-white' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}>Ordine (Auto)</button>
                      </div>

                      <div className="flex justify-between items-center mb-4 text-xs font-mono"><span className="text-slate-400 uppercase">Cassa Disponibile:</span><span className="text-white font-bold">{formatCurrency(portfolio.cash)}</span></div>
                      
                      <div className="mb-4 flex space-x-2">
                          <div className="flex-1">
                              <label className="text-[10px] text-slate-500 uppercase block mb-1">Quantità</label>
                              <input type="number" step="any" value={tradeQty} min="0.01" onChange={(e) => setTradeQty(e.target.value)} className={`transition-all duration-300 w-full bg-nebula-950/80 border border-nebula-border rounded-xl px-4 py-3 font-mono text-white text-lg font-bold outline-none focus:border-cyan-500`} />
                          </div>
                          {ui.orderType === 'limit' && (
                              <div className="flex-1">
                                  <label className="text-[10px] text-slate-500 uppercase block mb-1">Prezzo Target (€)</label>
                                  <input type="number" step="any" placeholder="Es. 150" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} className="w-full bg-nebula-950/80 border border-nebula-border rounded-xl px-4 py-3 font-mono text-cyan-400 text-lg font-bold outline-none focus:border-cyan-500" />
                              </div>
                          )}
                      </div>
                      
                      {/* FEE VISUALIZATION UPDATE */}
                      <div className="flex flex-col space-y-1 font-mono text-sm mb-6 pb-4 border-b border-nebula-border/50">
                        <div className="flex justify-between items-center"><span className="text-slate-400">Valore Asset:</span><span className="font-bold text-white">{formatCurrency(baseValue)}</span></div>
                        {ui.orderType === 'live' && <div className="flex justify-between items-center text-rose-400"><span className="text-xs">Commissione Rete (3%):</span><span className="font-bold">+{formatCurrency(executionFee)}</span></div>}
                        {ui.orderType === 'live' && <div className="flex justify-between items-center text-emerald-400 mt-2 border-t border-nebula-border/50 pt-2"><span className="text-xs uppercase font-bold">Totale Ordine:</span><span className="font-bold">{formatCurrency(baseValue + executionFee)}</span></div>}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-auto">
                        {ui.orderType === 'live' ? (
                            <>
                                <button onClick={() => executeOrder('BUY')} className="py-3 bg-emerald-600 hover:bg-emerald-500 transition-colors text-white rounded-xl font-bold uppercase tracking-wider">Compra</button>
                                <button onClick={() => executeOrder('SELL')} className="py-3 bg-rose-600 hover:bg-rose-500 transition-colors text-white rounded-xl font-bold uppercase tracking-wider">Vendi</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => placeLimitOrder('BUY', 'LESS')} className="py-3 border-2 border-emerald-600 text-emerald-400 hover:bg-emerald-600/20 transition-colors rounded-xl font-bold uppercase tracking-wider text-xs flex flex-col items-center justify-center leading-none gap-1">
                                    <span>Auto-Compra</span><span className="text-[9px] lowercase font-normal">(se scende &lt;= target)</span>
                                </button>
                                <button onClick={() => placeLimitOrder('SELL', 'GREATER')} className="py-3 border-2 border-rose-600 text-rose-400 hover:bg-rose-600/20 transition-colors rounded-xl font-bold uppercase tracking-wider text-xs flex flex-col items-center justify-center leading-none gap-1">
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

          {/* TAB PORTFOLIO */}
          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${ui.activeTab === 'portfolio' ? 'flex' : 'hidden'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Mio Portafoglio</h2>
              <div className="flex space-x-3">
                <button onClick={() => setDepositModal(true)} className="px-4 py-2 bg-emerald-600 border border-emerald-500/50 text-white rounded-lg text-sm font-bold hover:bg-emerald-500 flex items-center transition-colors"><ArrowRightCircle className="w-4 h-4 mr-2"/> Deposita</button>
                <button onClick={() => setDiscordModal({open: true, type: 'WITHDRAW'})} className="px-4 py-2 bg-nebula-800 border border-nebula-border text-white rounded-lg text-sm font-bold hover:bg-nebula-700 flex items-center transition-colors"><Landmark className="w-4 h-4 mr-2"/> Preleva Denaro</button>
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
                        }} className="text-xs bg-rose-600/20 text-rose-400 px-3 py-1 rounded hover:bg-rose-600/40 transition-colors">Vendi Tutto</button></td>
                        </tr>
                    );
                    })}
                    {Object.keys(portfolio.holdings || {}).length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-500 italic">Nessun asset in portafoglio.</td></tr>}
                </tbody>
                </table>
            </div>
          </div>

          {/* TAB NEBULACHANCE (SCOMMESSE) */}
          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${ui.activeTab === 'chance' ? 'flex' : 'hidden'}`}>
             <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 flex items-center"><Ticket className="w-6 h-6 mr-3 text-purple-500"/> NebulaChance</h2>
             </div>
             
             <div className="max-w-4xl mx-auto w-full space-y-6">
                 {Object.keys(bets).length === 0 || !Object.values(bets).some(b => b.active) ? (
                     <div className="text-center p-12 text-slate-500 italic bg-nebula-900/40 rounded-xl border border-nebula-border">NebulaChance non ha al momento scommesse in corso.</div>
                 ) : (
                     Object.values(bets).filter(b => b.active).map(bet => {
                         const totalMoneyBet = bet.options.reduce((acc, opt) => acc + opt.bets.reduce((s, b) => s + b.amount, 0), 0);
                         return (
                         <div key={bet.id} className="bg-nebula-900/80 border border-purple-500/30 rounded-xl p-6 shadow-[0_10px_30px_rgba(168,85,247,0.15)] relative overflow-hidden animate-fade-in">
                             <div className="flex justify-between items-start md:items-center flex-col md:flex-row mb-6 gap-4">
                                 <h3 className="text-xl font-bold text-white">{bet.name}</h3>
                                 <div className="flex items-center space-x-2 bg-black/50 p-2 rounded-lg border border-purple-500/30">
                                     <span className="text-xs text-slate-400 uppercase font-bold">La tua puntata:</span>
                                     <input type="number" min="1" step="any" value={betAmounts[bet.id] || ''} onChange={e => setBetAmounts({...betAmounts, [bet.id]: parseFloat(e.target.value)})} placeholder="0 €" className="w-24 bg-nebula-950 border border-purple-500/50 rounded px-2 py-1.5 text-white font-mono outline-none text-right focus:border-purple-400" />
                                 </div>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
                                 {bet.options.map((opt, i) => {
                                     const optMoney = opt.bets.reduce((s, b) => s + b.amount, 0);
                                     const pct = totalMoneyBet === 0 ? 0 : ((optMoney / totalMoneyBet) * 100).toFixed(1);
                                     const hasVotedThis = opt.bets.some(b => b.userId === user.id);
                                     return (
                                     <div key={i} className="flex flex-col">
                                         <button onClick={() => {
                                             const amt = betAmounts[bet.id] || 0;
                                             if(amt <= 0) return showToast("Inserisci un importo da scommettere in alto a destra.", "error");
                                             socket.emit('place_bet', { userId: user.id, betId: bet.id, optionIndex: i, amount: amt });
                                         }} className={`py-3 rounded-lg font-bold border transition-colors mb-2 flex flex-col items-center justify-center gap-1 ${hasVotedThis ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-nebula-950 border-nebula-border text-slate-300 hover:border-purple-500'}`}>
                                             <span>{opt.name} {hasVotedThis && <Check className="w-4 h-4 inline ml-1"/>}</span>
                                             <span className={`text-[10px] font-mono font-normal ${hasVotedThis ? 'text-purple-200' : 'text-slate-500'}`}>Quota: {opt.quote.toFixed(2)}x</span>
                                         </button>
                                         <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                             <span>{formatCurrency(optMoney)} puntati</span>
                                             <span>{pct}%</span>
                                         </div>
                                         <div className="w-full h-1.5 bg-nebula-950 rounded-full overflow-hidden">
                                             <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${pct}%` }}></div>
                                         </div>
                                     </div>
                                 )})}
                             </div>
                         </div>
                     )})
                 )}
             </div>
          </div>

          {/* TAB NEWS */}
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

              {/* OPZIONI DI SISTEMA (SUONI) */}
              <div className="bg-nebula-900/60 p-6 border border-nebula-border rounded-xl backdrop-blur-md transition-all">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-nebula-border/50 pb-2">Sistema</h3>
                <div className="flex items-center space-x-3 bg-black/40 p-4 rounded-lg border border-nebula-border/50">
                    <input type="checkbox" id="soundToggle" checked={soundEnabled} onChange={(e) => {
                        setSoundEnabled(e.target.checked);
                        localStorage.setItem('nebula_sound_enabled', e.target.checked);
                    }} className="w-5 h-5 cursor-pointer accent-cyan-500" />
                    <label htmlFor="soundToggle" className="text-sm font-bold text-slate-300 cursor-pointer select-none">Abilita Effetti Sonori Interfaccia (Click)</label>
                </div>
              </div>
            </div>
          </div>

          {/* TAB ADMIN E FINANZA */}
          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${ui.activeTab === 'admin' && (user.isAdmin || user.isFinanza) ? 'flex' : 'hidden'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black flex items-center gap-3">
                  {user.isAdmin ? <><UserCog className="w-6 h-6 text-rose-500" /> <span className="text-rose-500">Dev / Admin Panel</span></> : <><FileCode2 className="w-6 h-6 text-emerald-500" /> <span className="text-emerald-500">Finanza Control Panel</span></>}
              </h2>
            </div>

            {/* SEZIONI CONDIVISE (FINANZA & ADMIN) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                
                {/* ISPEZIONE UTENTE */}
                <div className="bg-nebula-900/60 p-6 border border-cyan-900/50 rounded-xl backdrop-blur-md transition-all">
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-cyan-900/50 pb-2 flex items-center"><Search className="w-5 h-5 mr-2 text-cyan-500"/> Ispezione & Controllo Utente</h3>
                    <div className="flex space-x-4 mb-4">
                      <select value={adminUserQuery} onChange={e => setAdminUserQuery(e.target.value)} className="flex-1 bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono outline-none focus:border-cyan-500 transition-colors">
                          <option value="">-- Seleziona un utente --</option>
                          {adminUsersList.map(u => ( <option key={u.id} value={u.id}>{u.name} ({u.id})</option> ))}
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
                        
                        <div className="flex space-x-4 mb-6 border-b border-nebula-border/50 pb-6 relative z-10">
                            {user.isAdmin && (
                                <button onClick={() => socket.emit('admin_action', { type: 'toggle_finanza', userId: adminFetchedUser.id })} className={`flex-1 py-2 border rounded font-bold text-xs uppercase transition-colors ${adminFetchedUser.isFinanza ? 'border-emerald-500 text-emerald-400 hover:bg-emerald-900/30' : 'border-slate-600 text-slate-400 hover:bg-slate-800'}`}>
                                    {adminFetchedUser.isFinanza ? 'Rimuovi Permessi Finanza' : 'Rendi Operatore Finanza'}
                                </button>
                            )}
                            <button onClick={() => socket.emit('admin_action', { type: 'toggle_freeze', userId: adminFetchedUser.id })} className={`flex-1 py-2 border rounded font-bold text-xs uppercase transition-colors ${adminFetchedUser.isFrozen ? 'bg-cyan-600 border-cyan-500 text-white hover:bg-cyan-500' : 'border-cyan-500 text-cyan-400 hover:bg-cyan-900/30'}`}>
                                {adminFetchedUser.isFrozen ? 'Scongela Account' : 'Congela Account (Blocca)'}
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
                                        <option value="reset">Reset</option>
                                    </select>
                                    <input type="number" step="any" disabled={adminCash.action === 'reset'} value={adminCash.amount} onChange={e => setAdminCash({...adminCash, amount: e.target.value})} className="w-24 bg-nebula-900 border border-nebula-border rounded px-2 text-white font-mono outline-none text-xs disabled:opacity-50" />
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

                {/* LOGS E CHIAVI E RIMOZIONE ASSET */}
                <div className="flex flex-col space-y-6">
                    <div className="bg-nebula-900/60 p-6 border border-emerald-900/50 rounded-xl backdrop-blur-md transition-all">
                        <h3 className="text-lg font-bold text-white mb-4 border-b border-emerald-900/50 pb-2">Convalida Prelievi</h3>
                        <div className="flex space-x-2">
                          <input type="text" value={adminCodeInput} onChange={e => setAdminCodeInput(e.target.value)} placeholder="WTH-XXXXX" className="flex-1 bg-nebula-950 border border-emerald-900/50 rounded px-3 py-2 text-white font-mono uppercase outline-none focus:border-emerald-500 transition-colors" />
                          <button onClick={() => socket.emit('admin_verify_code', adminCodeInput.trim().toUpperCase())} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded transition-colors"><Key className="w-4 h-4"/></button>
                        </div>
                        {adminValidator && (
                          <div className="mt-4 p-4 border border-emerald-500/30 bg-emerald-900/20 rounded-lg relative overflow-hidden animate-fade-in">
                            {adminValidator.isRedeemed && ( <div className="absolute -bottom-2 -right-4 text-rose-500 font-black text-4xl rotate-[-15deg] opacity-20 border-4 border-rose-500 p-2 z-0 pointer-events-none select-none">RISCATTATA</div> )}
                            <h4 className="font-black text-emerald-400 mb-2 flex items-center z-10 relative"><Check className="w-4 h-4 mr-2"/> CHIAVE AUTENTICA</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono z-10 relative">
                              <span className="text-slate-400">Utente/Ente:</span><span className="text-white font-bold">{adminValidator.name}</span>
                              <span className="text-slate-400">Da erogare:</span><span className="text-white font-bold text-lg">{formatCurrency(adminValidator.amount)}</span>
                            </div>
                            <p className={`mt-3 text-xs z-10 relative font-bold ${adminValidator.isRedeemed ? 'text-rose-400' : 'text-emerald-300'}`}>
                                {adminValidator.isRedeemed ? 'ATTENZIONE: Già pagata in passato!' : 'Eroga il pagamento in RP.'}
                            </p>
                          </div>
                        )}
                    </div>
                    
                    <div className="bg-nebula-900/60 p-6 border border-rose-900/50 rounded-xl backdrop-blur-md transition-all">
                        <h3 className="text-lg font-bold text-white mb-2 border-b border-rose-900/50 pb-2">Rimuovi Asset (Dal Mercato)</h3>
                        <div className="flex space-x-2 mt-4">
                            <select value={adminPriceEdit.ticker} onChange={e => setAdminPriceEdit({ ...adminPriceEdit, ticker: e.target.value })} className="flex-1 bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none">{Object.keys(assets || {}).map(k => <option key={k} value={k}>{k}</option>)}</select>
                            <button onClick={() => { if(window.confirm('Cancellare asset e rimborsare soldi agli utenti?')) socket.emit('admin_action', { type: 'delete_asset', ticker: adminPriceEdit.ticker })}} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-xs flex items-center justify-center transition-colors"><Trash2 className="w-4 h-4 mr-1"/> Elimina</button>
                        </div>
                    </div>
                    
                    <div className="bg-nebula-900/60 p-6 border border-slate-700 rounded-xl backdrop-blur-md flex flex-col flex-1 transition-all">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-2 cursor-pointer group" onClick={() => setShowLogs(!showLogs)}>
                          <h3 className="text-lg font-bold text-white flex items-center group-hover:text-cyan-400 transition-colors"><ScrollText className="w-5 h-5 mr-2 text-slate-400 group-hover:text-cyan-400 transition-colors"/> Registro Eventi <span className="ml-3 px-2 py-1 bg-slate-800 text-[10px] rounded text-slate-300">{showLogs ? 'Nascondi' : 'Mostra'} <ChevronDown className={`inline w-3 h-3 transition-transform duration-300 ${showLogs ? 'rotate-180' : ''}`} /></span></h3>
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
                          </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SEZIONI ESCLUSIVE ADMIN (Non finanza) */}
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

              {/* NEBULACHANCE ADMIN (AGGIORNATO CON OPZIONI E QUOTE) */}
              <div className="bg-nebula-900/60 p-6 border border-purple-500/30 rounded-xl backdrop-blur-md flex flex-col transition-all">
                  <h3 className="text-lg font-bold text-purple-400 mb-2 border-b border-purple-500/30 pb-2 flex items-center"><Ticket className="w-5 h-5 mr-2"/> Generatore Scommesse (Chance)</h3>
                  <div className="flex flex-col space-y-3 mt-2">
                      <input type="text" placeholder="Domanda/Evento (Es. Chi vincerà lo scudetto?)" value={newBet.name} onChange={e => setNewBet({...newBet, name: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-xs outline-none" />
                      
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Opzioni e Quote (Es: 1.50 = +50% profitto)</label>
                      {betOptions.map((opt, i) => (
                          <div key={i} className="flex space-x-2">
                              <input type="text" placeholder={`Opzione ${i+1}`} value={opt.name} onChange={e => { const newOpts = [...betOptions]; newOpts[i].name = e.target.value; setBetOptions(newOpts); }} className="flex-1 bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-xs outline-none" />
                              <div className="relative">
                                  <span className="absolute left-2 top-2 text-slate-500 text-xs font-mono">x</span>
                                  <input type="number" step="0.01" min="1.01" value={opt.quote} onChange={e => { const newOpts = [...betOptions]; newOpts[i].quote = parseFloat(e.target.value); setBetOptions(newOpts); }} className="w-20 bg-nebula-950 border border-nebula-border rounded pl-5 pr-2 py-2 text-white text-xs outline-none font-mono" />
                              </div>
                              {betOptions.length > 2 && (
                                  <button onClick={() => setBetOptions(betOptions.filter((_, idx) => idx !== i))} className="px-2 bg-rose-900/50 text-rose-400 rounded hover:bg-rose-600 hover:text-white"><X className="w-4 h-4"/></button>
                              )}
                          </div>
                      ))}
                      <button onClick={() => setBetOptions([...betOptions, {name:'', quote: 2.0}])} className="text-xs text-purple-400 border border-purple-500/30 border-dashed py-2 rounded hover:bg-purple-900/30 transition-colors">+ Aggiungi Opzione</button>

                      <button onClick={() => {
                          const validOptions = betOptions.filter(o => o.name.trim() !== '' && !isNaN(o.quote) && o.quote > 0);
                          if(!newBet.name || validOptions.length < 2) return showToast("Inserisci un nome e almeno 2 opzioni valide.", "error");
                          socket.emit('admin_action', { type: 'create_bet', name: newBet.name, options: validOptions });
                          setNewBet({ name: '' });
                          setBetOptions([{ name: '', quote: 2.0 }, { name: '', quote: 2.0 }]);
                      }} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded transition-colors mt-2">Avvia Scommessa sul Sito</button>
                  </div>
                  
                  {/* Risoluzione Scommesse Attive */}
                  {Object.values(bets).some(b => b.active) && (
                      <div className="mt-6 border-t border-purple-500/30 pt-4">
                          <h4 className="text-xs font-bold text-purple-300 uppercase mb-2">Risolvi Scommesse Attive</h4>
                          {Object.values(bets).filter(b => b.active).map(bet => (
                              <div key={bet.id} className="bg-black/40 p-3 rounded mb-2 border border-purple-500/30">
                                  <div className="font-bold text-white text-xs mb-3">{bet.name}</div>
                                  
                                  {/* Modifica quote live */}
                                  <div className="flex flex-col space-y-2 mb-4 bg-nebula-950 p-2 rounded">
                                      <span className="text-[10px] text-purple-400 uppercase font-bold mb-1">Modifica Quote in Corsa</span>
                                      {bet.options.map((opt, i) => (
                                          <div key={i} className="flex items-center space-x-2">
                                              <span className="text-xs text-slate-300 flex-1 truncate">{opt.name}</span>
                                              <input type="number" step="0.01" defaultValue={opt.quote} id={`edit-quote-${bet.id}-${i}`} className="w-20 bg-black/50 border border-nebula-border rounded px-2 py-1 text-white text-xs outline-none focus:border-purple-500" />
                                          </div>
                                      ))}
                                      <button onClick={() => {
                                          const newQuotes = bet.options.map((_, i) => parseFloat(document.getElementById(`edit-quote-${bet.id}-${i}`).value));
                                          socket.emit('admin_action', { type: 'update_bet_quotes', betId: bet.id, quotes: newQuotes });
                                      }} className="mt-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] uppercase font-bold transition-colors">Applica Nuove Quote</button>
                                  </div>

                                  <div className="flex flex-wrap gap-2 pt-2 border-t border-purple-500/30">
                                      {bet.options.map((opt, i) => (
                                          <button key={i} onClick={() => {
                                              if(window.confirm(`Selezionare "${opt.name}" come vincente e pagare i vincitori?`)) socket.emit('admin_action', { type: 'resolve_bet', betId: bet.id, winningIndex: i });
                                          }} className="flex-1 min-w-[80px] bg-purple-900/50 hover:bg-purple-600 text-[10px] text-white py-2 rounded border border-purple-500/50 transition-colors">Vince: {opt.name}</button>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
            </div>

            {/* EDITOR ALGORITMO E CONTROLLO TEMPO */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-nebula-900/60 p-6 border border-indigo-500/30 rounded-xl backdrop-blur-md transition-all">
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
                            <button onClick={() => socket.emit('admin_action', { type: 'update_algo', volMult: adminAlgoInput.volMult, driftOffset: adminAlgoInput.driftOffset })} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors">Applica al Server</button>
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
                
                <div className="bg-nebula-900/60 p-6 border border-rose-900/50 rounded-xl backdrop-blur-md transition-all">
                  <h3 className="text-lg font-bold text-white mb-4 border-b border-rose-900/50 pb-2">Controllo Tempo Server & Velocità</h3>
                  
                  <div className="flex items-center space-x-4 mb-4">
                    <div><label className="text-xs text-slate-400 block mb-1">Ore (0-23)</label><input type="number" id="adm-hh" defaultValue={gameTime?.hours} className="bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono w-20 outline-none" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">Minuti (0-59)</label><input type="number" id="adm-mm" defaultValue={gameTime?.minutes} className="bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono w-20 outline-none" /></div>
                    <div className="flex items-end h-full pt-5"><button onClick={() => socket.emit('admin_action', { type: 'time', hh: parseInt(document.getElementById('adm-hh').value), mm: parseInt(document.getElementById('adm-mm').value) })} className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded">Forza Orario</button></div>
                  </div>

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
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-left border border-nebula-border p-2 rounded mb-3 text-rose-400 font-bold justify-center items-center">
                      <span className="col-span-2 text-center text-sm py-2">Tassa Fissa: 70%</span>
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
