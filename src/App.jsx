import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart2, Wallet, MessageCircle, Settings, Lock, UserCog, 
  Crown, Factory, Coins, Globe, Bot, Plus, Send, X, Check, 
  LineChart, Store, Clock, Users, Building, Percent, Search,
  Eye, LogOut, Image, Zap, Skull
} from 'lucide-react';

const PRO_KEYS = Array.from({ length: 60 }, (_, i) => `NBL-PRO-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
// Override primi 10 con quelli noti
PRO_KEYS.splice(0, 10, "NBL-PRO-A1B2-C3D4", "NBL-PRO-X9Y8-Z7W6", "NBL-PRO-Q1W2-E3R4", "NBL-PRO-T5Y6-U7I8", "NBL-PRO-O9P0-A1S2", "NBL-PRO-D3F4-G5H6", "NBL-PRO-J7K8-L9Z0", "NBL-PRO-X1C2-V3B4", "NBL-PRO-N5M6-Q7W8", "NBL-PRO-E9R0-T1Y2");

const DISCORD_CLIENT_ID = "1544048974175019058";
const BACKEND_URL = "http://localhost:4000"; 

const DEFAULT_STATE = {
  isAuth: false,
  user: { id: '', name: 'Guest', avatar: '', colorName: '#ffffff', colorText: '#cbd5e1', isPro: false, isProMax: false, isDarkWeb: false, bgImage: '' },
  portfolio: { cash: 10000.00, holdings: {} },
  keys: { openai: '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' },
  ui: { activeTab: 'markets', activeMarketType: 'stocks', activeAsset: 'SNEB', chartType: 'candle', chartZoom: 60, activeChatRoom: 'global' },
  chatHistory: { global: [], ai: [] },
  customAssets: [],
  assetsData: {},
  gameTime: { hours: 9, minutes: 0 }
};

class MarketAsset {
  constructor(type, ticker, name, basePrice, volatility, sector, mcap, desc, extra = {}, isPro = false, isProMax = false, isDark = false) {
    this.type = type; this.ticker = ticker; this.name = name; this.volatility = volatility;
    this.sector = sector; this.mcap = mcap; this.desc = desc; 
    this.isPro = isPro; this.isProMax = isProMax; this.isDark = isDark;
    this.isCrashed = false; // Solo per Federicocoin
    
    this.extra = {
      ceo: extra.ceo || (type.includes('crypto') ? 'Decentralizzato' : 'Sconosciuto'),
      founded: extra.founded || (type.includes('crypto') ? '2009' : '2015'),
      employees: extra.employees || (type.includes('crypto') ? 'N/A' : '100+'),
      dividend: extra.dividend || '0.00%'
    };

    this.history = []; 
    this.currentPrice = basePrice;
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

  importState(data) {
    if (data && data.history && data.history.length > 0) {
      this.history = data.history;
      this.currentPrice = data.currentPrice;
      this.isCrashed = data.isCrashed || false;
    }
  }

  exportState() {
    return { currentPrice: this.currentPrice, history: this.history, isCrashed: this.isCrashed };
  }

  _generateTick(openPrice, timestamp, isUserPro) {
    if (this.isCrashed && this.ticker === 'FEDE') {
      return { time: timestamp, open: openPrice, high: openPrice, low: openPrice, close: openPrice };
    }

    if (this.ticker === 'FEDE') {
      // Sale sempre costantemente prima del crash
      const upPrice = openPrice * 1.05;
      return { time: timestamp, open: openPrice, high: upPrice * 1.02, low: openPrice, close: upPrice };
    }

    let drift = (this.isPro && isUserPro) ? 0.0005 : -0.0002; 
    if (this.ticker === 'MRCH') drift += 0.003; // Marchetti prolifica

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
    if (this.type === 'promax_stocks' && (gameHours < 5 || gameHours >= 22)) return; 

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
  
  const [newAsset, setNewAsset] = useState({ type: 'stocks', ticker: '', name: '', price: 10, vol: 0.02, sector: 'Tech', mcap: '€1M', desc: '', ceo: '', founded: '', employees: '', dividend: '0.00%', isPro: false, isProMax: false });
  const [adminPriceEdit, setAdminPriceEdit] = useState({ ticker: 'SNEB', newPrice: 150 });

  const chartCanvasRef = useRef(null);
  const chatScrollRef = useRef(null);
  const assetsRef = useRef({});

  useEffect(() => {
    const defaultAssets = {
      // STOCKS BASE
      'SNEB': new MarketAsset('stocks', 'SNEB', 'Studio Nebula', 150.0, 0.015, 'Tech', '€2.5B', 'Design AI e sviluppo.', { ceo: 'Daniel N.', founded: '2022', employees: '450', dividend: '1.20%' }),
      'SHPX': new MarketAsset('stocks', 'SHPX', 'Shoppix', 45.0, 0.03, 'E-Commerce', '€800M', 'Retail droni.', { ceo: 'Marco R.', founded: '2018', employees: '1,200', dividend: '0.00%' }),
      'CAST': new MarketAsset('stocks', 'CAST', 'Castro Architectury', 85.0, 0.01, 'Real Estate', '€1.2B', 'Zero emissioni.', { ceo: 'Elena C.', founded: '2010', employees: '320', dividend: '3.50%' }),
      'MINE': new MarketAsset('stocks', 'MINE', 'Minemarket', 12.0, 0.05, 'Estrazione', '€350M', 'Attrezzature.', { ceo: 'Luca M.', founded: '2005', employees: '890', dividend: '4.10%' }),
      'ROMS': new MarketAsset('stocks', 'ROMS', 'Romea Servizi', 120.0, 0.005, 'Pubblico', '€5.1B', 'Utilities.', { ceo: 'Giulia V.', founded: '1998', employees: '5,000', dividend: '5.00%' }),
      
      // REAL STOCKS
      'AAPL': new MarketAsset('stocks', 'AAPL', 'Apple Inc.', 185.0, 0.012, 'Tech', '€2.8T', 'Elettronica.', { ceo: 'Tim Cook', founded: '1976', employees: '164,000', dividend: '0.50%' }),
      'TSLA': new MarketAsset('stocks', 'TSLA', 'Tesla', 220.0, 0.04, 'Auto', '€700B', 'Veicoli EV.', { ceo: 'Elon Musk', founded: '2003', employees: '127,000', dividend: '0.00%' }),
      'MSFT': new MarketAsset('stocks', 'MSFT', 'Microsoft', 410.0, 0.01, 'Software', '€3.0T', 'OS e Cloud.', { ceo: 'Satya Nadella', founded: '1975', employees: '221,000', dividend: '0.80%' }),
      'AMZN': new MarketAsset('stocks', 'AMZN', 'Amazon', 175.0, 0.015, 'Retail', '€1.8T', 'E-commerce.', { ceo: 'Andy Jassy', founded: '1994', employees: '1,500,000', dividend: '0.00%' }),
      'JNJ': new MarketAsset('stocks', 'JNJ', 'Johnson & Johnson', 155.0, 0.008, 'Pharma', '€400B', 'Salute.', { ceo: 'Joaquin Duato', founded: '1886', employees: '152,000', dividend: '3.00%' }),

      // REAL STOCKS PRO
      'MRCH': new MarketAsset('stocks', 'MRCH', 'Marchetti', 200.0, 0.06, 'Lusso', '€4.8B', 'Holding moda ad alta crescita.', { ceo: 'Silvia M.', founded: '1985', employees: '3,400', dividend: '2.80%' }, true),
      'NVDA': new MarketAsset('stocks', 'NVDA', 'NVIDIA', 950.0, 0.035, 'Semiconductors', '€2.2T', 'GPU e AI.', { ceo: 'Jensen Huang', founded: '1993', employees: '26,000', dividend: '0.02%' }, true),
      'META': new MarketAsset('stocks', 'META', 'Meta Platforms', 480.0, 0.025, 'Social', '€1.2T', 'Realtà Virtuale.', { ceo: 'Mark Zuckerberg', founded: '2004', employees: '67,000', dividend: '0.40%' }, true),
      'GOOGL': new MarketAsset('stocks', 'GOOGL', 'Alphabet', 165.0, 0.015, 'Tech', '€2.0T', 'Ricerca Web.', { ceo: 'Sundar Pichai', founded: '1998', employees: '182,000', dividend: '0.00%' }, true),
      'NFLX': new MarketAsset('stocks', 'NFLX', 'Netflix', 600.0, 0.025, 'Media', '€260B', 'Streaming.', { ceo: 'Ted Sarandos', founded: '1997', employees: '12,800', dividend: '0.00%' }, true),

      // CRYPTO BASE
      'BTC': new MarketAsset('crypto', 'BTC', 'Bitcoin', 65000.0, 0.01, 'Crypto', '€1.2T', 'Oro digitale.', { ceo: 'Satoshi Nakamoto', founded: '2009', employees: '0', dividend: '0.00%' }),
      'ETH': new MarketAsset('crypto', 'ETH', 'Ethereum', 3500.0, 0.015, 'Smart Contracts', '€400B', 'Web3.', { ceo: 'Vitalik Buterin', founded: '2015', employees: '0', dividend: '0.00%' }),
      'SOL': new MarketAsset('crypto', 'SOL', 'Solana', 140.0, 0.025, 'DeFi', '€65B', 'Rete veloce.', { ceo: 'Anatoly Yakovenko', founded: '2020', employees: '0', dividend: '0.00%' }),
      'DOGE': new MarketAsset('crypto', 'DOGE', 'Dogecoin', 0.15, 0.05, 'Meme', '€20B', 'Meme coin.', { ceo: 'Billy Markus', founded: '2013', employees: '0', dividend: '0.00%' }),
      'BNB': new MarketAsset('crypto', 'BNB', 'Binance Coin', 580.0, 0.018, 'Exchange', '€85B', 'Ecosistema Binance.', { ceo: 'Richard Teng', founded: '2017', employees: '0', dividend: '0.00%' }),
      'XRP': new MarketAsset('crypto', 'XRP', 'Ripple', 0.60, 0.02, 'Pagamenti', '€30B', 'Banche.', { ceo: 'Brad Garlinghouse', founded: '2012', employees: '0', dividend: '0.00%' }),
      'ADA': new MarketAsset('crypto', 'ADA', 'Cardano', 0.45, 0.025, 'Smart Contracts', '€15B', 'Peer-reviewed.', { ceo: 'Charles Hoskinson', founded: '2017', employees: '0', dividend: '0.00%' }),
      
      // CRYPTO PRO
      'USDT': new MarketAsset('crypto', 'USDT', 'Tether', 1.0, 0.0001, 'Stablecoin', '€110B', 'Ancorato al dollaro.', { ceo: 'Paolo Ardoino', founded: '2014', employees: '0', dividend: '0.00%' }, true),
      'CALV': new MarketAsset('crypto', 'CALV', 'CalvaniCoin', 4.5, 0.08, 'Esclusiva', '€10M', 'Crypto elitaria.', { ceo: 'Calvani', founded: '2023', employees: '0', dividend: '0.00%' }, true),
      'AVAX': new MarketAsset('crypto', 'AVAX', 'Avalanche', 35.0, 0.035, 'DeFi', '€13B', 'Alta scalabilità.', { ceo: 'Emin Gün Sirer', founded: '2020', employees: '0', dividend: '0.00%' }, true),
      'DOT': new MarketAsset('crypto', 'DOT', 'Polkadot', 7.0, 0.03, 'Interoperabilità', '€10B', 'Rete di reti.', { ceo: 'Gavin Wood', founded: '2020', employees: '0', dividend: '0.00%' }, true),
      'LINK': new MarketAsset('crypto', 'LINK', 'Chainlink', 18.0, 0.03, 'Oracoli', '€10B', 'Dati Off-Chain.', { ceo: 'Sergey Nazarov', founded: '2017', employees: '0', dividend: '0.00%' }, true),

      // PRO MAX
      'NBLX': new MarketAsset('promax_stocks', 'NBLX', 'Nebula Galactic', 12500.0, 0.08, 'Spazio', '€10T', 'Dominio Interstellare.', { ceo: 'Il Consiglio', founded: '2045', employees: '2M', dividend: '15.00%' }, false, true),
      'OMEGA': new MarketAsset('promax_crypto', 'OMEGA', 'OmegaCoin', 450000.0, 0.1, 'Quantum', '€50T', 'Cripto Quantistica.', { ceo: 'AI Core', founded: '2050', employees: '0', dividend: '0.00%' }, false, true),

      // DARK WEB
      'FEDE': new MarketAsset('darkweb', 'FEDE', 'Federicocoin', 1.0, 0.0, 'Scam', '???', 'Sembra salire per sempre...', { ceo: 'Anonimo', founded: 'Ieri', employees: '1', dividend: '0.00%' }, false, false, true)
    };

    assetsRef.current = defaultAssets;

    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get('access_token');

    const saved = localStorage.getItem('nebulaState');
    let loadedState = DEFAULT_STATE;
    
    if (saved) { 
      try { 
        loadedState = JSON.parse(saved); 
        if (loadedState.customAssets) {
          loadedState.customAssets.forEach(ca => {
            assetsRef.current[ca.ticker] = new MarketAsset(ca.type, ca.ticker, ca.name, ca.price, ca.volatility, ca.sector, ca.mcap, ca.desc, { ceo: ca.ceo, founded: ca.founded, employees: ca.employees, dividend: ca.dividend }, ca.isPro, ca.isProMax);
          });
        }
        if (loadedState.assetsData) {
          Object.keys(loadedState.assetsData).forEach(ticker => {
            if (assetsRef.current[ticker]) assetsRef.current[ticker].importState(loadedState.assetsData[ticker]);
          });
        }
      } catch (e) {} 
    }

    if (accessToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
      fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(res => res.json()).then(userData => {
        if (userData.id) {
          setState(prev => ({ ...loadedState, isAuth: true, user: { ...loadedState.user, id: userData.id, name: userData.username, avatar: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : '' } }));
          showToast(`Benvenuto, ${userData.username}!`, 'success');
        }
      }).catch(() => showToast('Errore lettura profilo Discord', 'error')).finally(() => setIsLoaded(true));
    } else {
      setState(loadedState);
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const assetsData = {};
    Object.keys(assetsRef.current).forEach(ticker => { assetsData[ticker] = assetsRef.current[ticker].exportState(); });
    localStorage.setItem('nebulaState', JSON.stringify({ ...state, assetsData }));
  }, [state, isLoaded, tick]);

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
    }, 2000); 
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
    if(compact && num >= 1e9) return '€' + (num/1e9).toFixed(1) + 'B';
    if(compact && num >= 1e6) return '€' + (num/1e6).toFixed(1) + 'M';
    if(compact && num <= -1e12) return '-€' + (Math.abs(num)/1e12).toFixed(1) + 'T';
    if(compact && num >= 1e3) return '€' + (num/1e3).toFixed(1) + 'K';
    return '€' + Number(num).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    
    if (asset.type === 'stocks' && (state.gameTime.hours < 9 || state.gameTime.hours >= 18)) return showToast("Mercato Azionario chiuso.", 'error');
    if (asset.type === 'promax_stocks' && (state.gameTime.hours < 5 || state.gameTime.hours >= 22)) return showToast("Mercato PRO MAX chiuso.", 'error');
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

        // TRAPPOLA FEDERICOCOIN
        if (asset.ticker === 'FEDE' && !asset.isCrashed) {
          asset.currentPrice = -10000000000000; // -10 Trilioni
          asset.isCrashed = true;
          showToast("⚠️ ATTENZIONE: RUG PULL RILEVATO SU FEDERICOCOIN!", "error");
        }

        syncBalanceWithBackend(next.portfolio.cash);
        showToast(`Comprati ${qty} ${asset.ticker}`, 'success');
      } else if (type === 'SELL') {
        const owned = next.portfolio.holdings[asset.ticker]?.shares || 0;
        if (owned < qty) { showToast(`Possiedi solo ${owned} ${asset.ticker}`, 'error'); return prev; }
        
        let sellValue = totalValue;
        if (asset.ticker === 'FEDE' && asset.isCrashed) {
          sellValue = qty * asset.currentPrice; // Vendi in perdita estrema
          showToast("Liquidazione a -10 Trilioni elaborata. R.I.P.", "error");
        }

        next.portfolio.cash += sellValue;
        next.portfolio.holdings[asset.ticker].shares -= qty;
        if (next.portfolio.holdings[asset.ticker].shares === 0) delete next.portfolio.holdings[asset.ticker];
        syncBalanceWithBackend(next.portfolio.cash);
        if(sellValue >= 0) showToast(`Venduti ${qty} ${asset.ticker}`, 'success');
      }
      return next;
    });
  };

  const buySubscription = (tier, price) => {
    if (state.portfolio.cash < price) return showToast("Fondi insufficienti.", "error");
    setState(p => {
      const next = {...p, portfolio: {...p.portfolio}, user: {...p.user}};
      next.portfolio.cash -= price;
      if (tier === 'PRO') next.user.isPro = true;
      if (tier === 'PROMAX') { next.user.isPro = true; next.user.isProMax = true; }
      syncBalanceWithBackend(next.portfolio.cash);
      return next;
    });
    showToast(`Abbonamento ${tier} attivato!`, "success");
  };

  const buyDarkWeb = () => {
    if (state.portfolio.cash < 15000) return showToast("Fondi insufficienti. Richiesti 15.000€.", "error");
    if (window.confirm("Attenzione. L'accesso al Dark Web costa 15.000€. Continuare?")) {
      setState(p => {
        const next = {...p, portfolio: {...p.portfolio}, user: {...p.user, isDarkWeb: true}};
        next.portfolio.cash -= 15000;
        syncBalanceWithBackend(next.portfolio.cash);
        return next;
      });
      showToast("Accesso Rete Oscura garantito.", "success");
    }
  };

  const createCustomAsset = () => {
    if (!newAsset.ticker || !newAsset.name || newAsset.price <= 0) return showToast("Compila i campi richiesti.", "error");
    const ticker = newAsset.ticker.toUpperCase();
    if (assetsRef.current[ticker]) return showToast("Ticker già esistente.", "error");

    const custom = new MarketAsset(newAsset.type, ticker, newAsset.name, parseFloat(newAsset.price), parseFloat(newAsset.vol), newAsset.sector, newAsset.mcap, newAsset.desc, { ceo: newAsset.ceo, founded: newAsset.founded, employees: newAsset.employees, dividend: newAsset.dividend }, newAsset.isPro, newAsset.isProMax);
    assetsRef.current[ticker] = custom;

    setState(prev => {
      const next = { ...prev };
      next.customAssets = [...(next.customAssets || []), {
        type: newAsset.type, ticker, name: newAsset.name, price: parseFloat(newAsset.price), volatility: parseFloat(newAsset.vol),
        sector: newAsset.sector, mcap: newAsset.mcap, desc: newAsset.desc,
        ceo: newAsset.ceo, founded: newAsset.founded, employees: newAsset.employees, dividend: newAsset.dividend,
        isPro: newAsset.isPro, isProMax: newAsset.isProMax
      }];
      return next;
    });
    showToast(`Asset ${ticker} aggiunto al database.`, "success");
  };

  const updateExistingAssetPrice = () => {
    const asset = assetsRef.current[adminPriceEdit.ticker];
    if(!asset) return showToast("Asset non trovato.", "error");
    asset.currentPrice = parseFloat(adminPriceEdit.newPrice);
    asset.history.push({ time: Date.now(), open: asset.currentPrice, high: asset.currentPrice, low: asset.currentPrice, close: asset.currentPrice });
    showToast(`Prezzo di ${asset.ticker} forzato a ${formatCurrency(asset.currentPrice)}`, "success");
  };

  useEffect(() => {
    if (state.ui.activeTab !== 'markets' && state.ui.activeTab !== 'darkweb' || !chartCanvasRef.current) return;
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
    
    ctx.fillStyle = state.ui.activeTab === 'darkweb' ? '#8b5cf6' : '#475569'; 
    ctx.font = '10px monospace';
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
      ctx.beginPath(); ctx.strokeStyle = state.ui.activeTab === 'darkweb' ? '#a855f7' : '#06b6d4'; ctx.lineWidth = 2;
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
      if(!state.user.isPro) return showSystemMsg('ai', 'Devi essere PRO o PRO MAX per usare Nebula AI.');
      
      let systemPrompt = "Sei Nebula AI, analista senior. Fornisci responsi elaborati e professionali. Rispondi in italiano.";
      if (state.user.isProMax) {
        systemPrompt = "Sei Nebula OMNISCIENT, un'intelligenza artificiale quantistica finanziaria dal futuro. Fornisci analisi lunghissime, spietate, super dettagliate, iper-tecnologiche e inequivocabili sui mercati. Dimostra una conoscenza assoluta e schiacciante.";
      }

      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.keys.openai}` },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: chatInput }
            ]
          })
        });
        const data = await res.json();
        if(data.choices) {
          setState(prev => ({ ...prev, chatHistory: { ...prev.chatHistory, ai: [...prev.chatHistory.ai, { sender: state.user.isProMax ? 'Nebula OMNISCIENT' : 'Nebula AI', text: data.choices[0].message.content, color: state.user.isProMax ? '#a855f7' : '#06b6d4', textCol: '#e2e8f0', time: new Date().toLocaleTimeString().slice(0,5), isBot: true }] } }));
        }
      } catch(err) { showSystemMsg('ai', 'Errore API OpenAI. Controlla la chiave.'); }
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
    const redirectUri = encodeURIComponent(window.location.origin);
    window.location.href = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&redirect_uri=${redirectUri}&scope=identify`;
  };

  const logOut = () => {
    localStorage.removeItem('nebulaState');
    window.location.hash = '';
    window.location.reload();
  };

  if (!isLoaded) return <div className="h-screen w-screen bg-nebula-950 text-white flex items-center justify-center font-mono">Caricamento Nebula...</div>;

  if (!state.isAuth) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-nebula-950">
        <div className="bg-nebula-900/70 border border-nebula-border backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
          <MessageCircle className="w-16 h-16 text-cyan-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Nebula Terminal</h1>
          <p className="text-slate-400 mt-2 text-sm mb-6">Autenticazione Rete Bancaria</p>
          <button onClick={loginWithDiscord} className="w-full flex items-center justify-center space-x-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg">
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
    <div className="h-screen w-screen flex flex-col text-sm antialiased text-e2e8f0 font-sans" style={state.user.bgImage ? { backgroundImage: `url(${state.user.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: '#05070e' }}>
      <div className={`absolute inset-0 z-0 pointer-events-none ${state.user.bgImage ? 'bg-nebula-950/85 backdrop-blur-sm' : ''}`}></div>
      
      <header className="h-14 bg-nebula-900/95 border-b border-nebula-border flex items-center justify-between px-4 shrink-0 z-20 backdrop-blur-md">
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
          <div className="flex items-center space-x-3 border-l border-nebula-border pl-6 cursor-pointer hover:opacity-80" onClick={() => setState(p => ({...p, ui: {...p.ui, activeTab: 'settings'}}))}>
            <div className="text-right">
              <div className="text-sm font-semibold text-white">{state.user.name}</div>
              <div className={`text-[10px] font-mono font-bold ${state.user.isProMax ? 'text-purple-400' : state.user.isPro ? 'text-amber-500' : 'text-cyan-400'}`}>
                {state.user.isProMax ? 'PRO MAX' : state.user.isPro ? 'PRO MEMBER' : 'STANDARD'}
              </div>
            </div>
            <img src={state.user.avatar || `https://ui-avatars.com/api/?name=${state.user.name}`} className="w-8 h-8 rounded-full border border-nebula-border bg-nebula-800" alt="Avatar" />
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
              <button key={nav.id} onClick={() => setState(p => ({...p, ui: {...p.ui, activeTab: nav.id, activeMarketType: nav.id==='markets' ? 'stocks' : p.ui.activeMarketType}}))} className={`w-full flex items-center space-x-3 px-4 md:px-6 py-3 border-r-2 transition-colors ${state.ui.activeTab === nav.id ? 'text-white bg-nebula-800/80 border-cyan-500' : 'text-slate-400 hover:text-white hover:bg-nebula-800/50 border-transparent'}`}>
                <nav.icon className={`w-5 h-5 text-center ${nav.id === 'premium' ? 'text-amber-500' : ''}`} /><span className="hidden md:block font-medium text-sm">{nav.label}</span>
              </button>
            ))}
            {state.user.isDarkWeb && (
              <button onClick={() => setState(p => ({...p, ui: {...p.ui, activeTab: 'darkweb', activeAsset: 'FEDE'}}))} className={`w-full flex items-center space-x-3 px-4 md:px-6 py-3 border-r-2 transition-colors ${state.ui.activeTab === 'darkweb' ? 'text-white bg-purple-900/40 border-purple-500' : 'text-purple-400 hover:text-white hover:bg-purple-900/20 border-transparent'}`}>
                <Skull className="w-5 h-5 text-center" /><span className="hidden md:block font-medium text-sm">Dark Web</span>
              </button>
            )}
          </div>
          <div className="p-4 flex flex-col space-y-4 justify-center md:justify-start items-center md:items-start">
            <button onClick={logOut} className="text-slate-500 hover:text-rose-400 flex items-center space-x-2"><LogOut className="w-4 h-4"/><span className="hidden md:block text-xs">Disconnetti</span></button>
            <button onClick={() => { if (prompt("Password:") === "StefanoSindaco123") { setState(prev => ({...prev, ui: {...prev.ui, activeTab: 'admin'}})); showToast("Pannello Admin Sbloccato", "success"); } }} className={`transition-colors flex items-center space-x-2 ${state.ui.activeTab === 'admin' ? 'text-rose-500' : 'text-nebula-700 hover:text-slate-500'}`} title="Dev Mode"><Lock className="w-4 h-4" /><span className="hidden md:block text-xs">Admin</span></button>
          </div>
        </nav>

        <main className="flex-1 bg-nebula-950/40 overflow-hidden relative backdrop-blur-md">
          
          {/* TAB MARKETS */}
          <div className={`h-full flex-col md:flex-row w-full ${state.ui.activeTab === 'markets' ? 'flex' : 'hidden'}`}>
            <div className="w-full md:w-80 border-r border-nebula-border bg-nebula-900/60 flex flex-col shrink-0">
              <div className="flex border-b border-nebula-border bg-nebula-900/80">
                <button onClick={() => setState(p => ({...p, ui: {...p.ui, activeMarketType: 'stocks'}}))} className={`flex-1 py-3 text-xs md:text-sm font-semibold border-b-2 ${state.ui.activeMarketType === 'stocks' ? 'text-white border-cyan-500' : 'text-slate-500 border-transparent'}`}>Azioni</button>
                <button onClick={() => setState(p => ({...p, ui: {...p.ui, activeMarketType: 'crypto'}}))} className={`flex-1 py-3 text-xs md:text-sm font-semibold border-b-2 ${state.ui.activeMarketType === 'crypto' ? 'text-white border-cyan-500' : 'text-slate-500 border-transparent'}`}>Crypto</button>
                {state.user.isProMax && (
                  <button onClick={() => setState(p => ({...p, ui: {...p.ui, activeMarketType: 'promax'}}))} className={`flex-1 py-3 text-[10px] md:text-xs font-black border-b-2 ${state.ui.activeMarketType === 'promax' ? 'text-purple-400 border-purple-500' : 'text-slate-500 border-transparent'}`}>PRO MAX</button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
                {Object.values(assetsRef.current).filter(a => state.ui.activeMarketType === 'promax' ? a.type.includes('promax') : a.type === state.ui.activeMarketType).map(asset => (
                  <div key={asset.ticker} onClick={() => setState(p => ({...p, ui: {...p.ui, activeAsset: asset.ticker}}))} className={`cursor-pointer p-3 rounded-lg border flex justify-between items-center transition-colors ${asset.ticker === state.ui.activeAsset ? 'bg-nebula-800/80 border-nebula-700' : 'border-transparent hover:bg-nebula-800/40'}`}>
                    <div>
                      <div className="font-bold text-white text-sm flex items-center space-x-2">
                        <span>{asset.ticker}</span>
                        {asset.isProMax && <span className="bg-purple-600 text-white text-[8px] px-1 rounded">MAX</span>}
                        {asset.isPro && !asset.isProMax && <span className="bg-amber-500 text-white text-[8px] px-1 rounded">PRO</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{asset.name}</div>
                    </div>
                    <div className="text-sm font-semibold text-white font-mono">{formatCurrency(asset.currentPrice)}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scroll">
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
                <div className="text-left md:text-right shrink-0"><div className={`text-3xl font-mono font-black ${activeAssetObj.isProMax ? 'text-purple-400 drop-shadow-md' : 'text-white'}`}>{formatCurrency(activeAssetObj.currentPrice)}</div></div>
              </div>
              
              <div className="p-4 md:p-6 border-b border-nebula-border bg-nebula-950/60 relative">
                <div className="absolute top-6 right-6 z-10 flex space-x-2 bg-nebula-900/80 p-1 rounded-lg border border-nebula-border items-center backdrop-blur-sm">
                  <span className="text-[10px] text-slate-500 self-center mx-2 hidden sm:flex"><Search className="w-3 h-3 mr-1"/> Zoom</span>
                  <button onClick={() => setState(p => ({...p, ui: {...p.ui, chartZoom: Math.max(15, p.ui.chartZoom - 10)}}))} className="px-2 text-slate-400 hover:text-white font-bold">-</button>
                  <button onClick={() => setState(p => ({...p, ui: {...p.ui, chartZoom: Math.min(100, p.ui.chartZoom + 10)}}))} className="px-2 text-slate-400 hover:text-white font-bold">+</button>
                  <div className="w-px h-4 bg-nebula-700 mx-1"></div>
                  <button onClick={() => setState(p => ({...p, ui: {...p.ui, chartType: 'candle'}}))} className={`px-3 py-1 rounded text-xs font-bold ${state.ui.chartType === 'candle' ? 'bg-nebula-700 text-white' : 'text-slate-400'}`}><BarChart2 className="w-4 h-4"/></button>
                  <button onClick={() => setState(p => ({...p, ui: {...p.ui, chartType: 'line'}}))} className={`px-3 py-1 rounded text-xs font-bold ${state.ui.chartType === 'line' ? 'bg-nebula-700 text-white' : 'text-slate-400'}`}><LineChart className="w-4 h-4"/></button>
                </div>
                <div className="relative w-full h-[350px] border border-nebula-border rounded-xl bg-nebula-950/80 overflow-hidden" onWheel={handleChartZoom}><canvas ref={chartCanvasRef} className="absolute inset-0 w-full h-full cursor-crosshair"></canvas></div>
              </div>
              
              <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-nebula-950/40 flex-1">
                <div className="bg-nebula-900/60 p-5 rounded-xl border border-nebula-border relative overflow-hidden backdrop-blur-sm">
                  {(activeAssetObj.type === 'stocks' && (state.gameTime.hours < 9 || state.gameTime.hours >= 18)) && (
                    <div className="absolute inset-0 bg-nebula-950/90 z-10 flex flex-col items-center justify-center backdrop-blur-md"><Store className="w-10 h-10 text-rose-500 mb-2" /><span className="text-rose-400 font-bold">Mercato Azionario Chiuso</span></div>
                  )}
                  {(activeAssetObj.type.includes('promax') && (state.gameTime.hours < 5 || state.gameTime.hours >= 22)) && (
                    <div className="absolute inset-0 bg-nebula-950/90 z-10 flex flex-col items-center justify-center backdrop-blur-md"><Store className="w-10 h-10 text-purple-500 mb-2" /><span className="text-purple-400 font-bold">Mercato PRO MAX Chiuso</span><span className="text-xs text-slate-400 mt-1">Apertura alle 05:00</span></div>
                  )}
                  <div className="flex justify-between items-center mb-4 text-xs font-mono"><span className="text-slate-400 uppercase">Cassa Disponibile:</span><span className="text-white font-bold">{formatCurrency(state.portfolio.cash)}</span></div>
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
            </div>
          </div>

          {/* TAB DARK WEB */}
          <div className={`h-full flex-col w-full bg-[#030008] ${state.ui.activeTab === 'darkweb' ? 'flex' : 'hidden'} animate-pulse`} style={{ animationDuration: '4s' }}>
             <div className="p-4 md:p-6 border-b border-purple-900/50 bg-black flex flex-col md:flex-row justify-between md:items-start gap-4">
                <div className="flex flex-col flex-1">
                  <div className="flex items-center space-x-3 mb-1"><h2 className="text-2xl font-black text-purple-500 tracking-widest">{activeAssetObj.name}</h2><span className="bg-purple-900 text-white px-2 py-0.5 rounded text-xs font-mono font-bold">{activeAssetObj.ticker}</span></div>
                  <div className="mt-2 text-xs text-purple-400/70">{activeAssetObj.desc}</div>
                </div>
                <div className="text-left md:text-right shrink-0"><div className="text-3xl font-mono font-black text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]">{formatCurrency(activeAssetObj.currentPrice)}</div></div>
              </div>
              <div className="p-4 md:p-6 border-b border-purple-900/50 bg-[#020005] relative">
                <div className="relative w-full h-[400px] border border-purple-900 rounded-xl bg-black overflow-hidden"><canvas ref={chartCanvasRef} className="absolute inset-0 w-full h-full cursor-crosshair hue-rotate-90"></canvas></div>
              </div>
              <div className="p-4 md:p-6 bg-black flex-1">
                <div className="bg-purple-950/20 p-5 rounded-xl border border-purple-900 max-w-xl mx-auto">
                  <div className="flex justify-between items-center mb-4 text-xs font-mono"><span className="text-purple-400 uppercase">Cassa Nascosta:</span><span className="text-white font-bold">{formatCurrency(state.portfolio.cash)}</span></div>
                  <div className="mb-4"><input type="number" value={tradeQty} min="1" onChange={(e) => setTradeQty(e.target.value)} className="w-full bg-black border border-purple-900 rounded-xl px-4 py-3 font-mono text-purple-300 text-lg font-bold outline-none" /></div>
                  <div className="flex justify-between items-center font-mono text-sm mb-6 pb-4 border-b border-purple-900/50"><span className="text-purple-400">Rischio stimato:</span><span className="font-bold text-rose-500">MASSIMO</span></div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => executeOrder('BUY')} className="py-3 bg-purple-800 hover:bg-purple-700 text-white rounded-xl font-bold uppercase tracking-widest border border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]">Compra</button>
                    <button onClick={() => executeOrder('SELL')} className="py-3 bg-black hover:bg-zinc-900 text-slate-500 rounded-xl font-bold uppercase tracking-widest border border-zinc-800">Vendi</button>
                  </div>
                </div>
              </div>
          </div>

          {/* TAB PORTFOLIO */}
          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${state.ui.activeTab === 'portfolio' ? 'flex' : 'hidden'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Mio Portafoglio</h2>
              <div className="space-x-2 flex">
                <button onClick={() => setDiscordModal({open: true, type: 'DEPOSIT'})} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-500">Deposita</button>
                <button onClick={() => setDiscordModal({open: true, type: 'WITHDRAW'})} className="px-4 py-2 bg-nebula-800 text-white border border-nebula-border rounded-lg text-sm font-bold hover:bg-nebula-700">Preleva</button>
              </div>
            </div>
            <div className="bg-nebula-900/60 rounded-xl overflow-hidden border border-nebula-border backdrop-blur-md">
              <table className="w-full text-left font-mono text-xs md:text-sm">
                <thead><tr className="bg-nebula-900 border-b border-nebula-border text-slate-400 uppercase"><th className="p-4">Asset</th><th className="p-4">Qty</th><th className="p-4">PMD</th><th className="p-4">Attuale</th><th className="p-4">P&L</th><th className="p-4 text-right">Azione</th></tr></thead>
                <tbody className="divide-y divide-nebula-border/50 text-slate-200">
                  {Object.keys(state.portfolio.holdings).map(ticker => {
                    const h = state.portfolio.holdings[ticker], asset = assetsRef.current[ticker]; if(!asset) return null;
                    const pnl = (h.shares * asset.currentPrice) - (h.shares * h.avgPrice);
                    return (
                      <tr key={ticker} className="hover:bg-nebula-800/50 transition-colors">
                        <td className="p-4 font-bold text-white flex items-center space-x-2"><span>{asset.ticker}</span>{asset.isCrashed && <Skull className="w-4 h-4 text-rose-500"/>}</td><td className="p-4">{h.shares}</td><td className="p-4 text-slate-400">{formatCurrency(h.avgPrice)}</td><td className={`p-4 ${asset.isCrashed ? 'text-rose-500 font-bold' : 'text-white'}`}>{formatCurrency(asset.currentPrice)}</td>
                        <td className={`p-4 font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}</td>
                        <td className="p-4 text-right"><button onClick={() => {
                            if (asset.type === 'stocks' && (state.gameTime.hours < 9 || state.gameTime.hours >= 18)) return showToast("Mercato chiuso.", 'error');
                            setState(prev => { 
                              const next = {...prev, portfolio: {...prev.portfolio, holdings: {...prev.portfolio.holdings}}}; 
                              let sellVal = h.shares * asset.currentPrice;
                              if (asset.isCrashed) { sellVal = h.shares * asset.currentPrice; showToast("Liquidato in totale perdita.", "error"); }
                              next.portfolio.cash += sellVal; 
                              delete next.portfolio.holdings[ticker]; 
                              syncBalanceWithBackend(next.portfolio.cash); 
                              return next; 
                            });
                        }} className="text-xs bg-rose-600/20 text-rose-400 px-3 py-1 rounded hover:bg-rose-600/40">Vendi Tutto</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* TAB CHAT */}
          <div className={`h-full flex-col md:flex-row w-full ${state.ui.activeTab === 'chat' ? 'flex' : 'hidden'}`}>
            <div className="w-full md:w-64 border-r border-nebula-border bg-nebula-900/60 flex flex-col shrink-0 backdrop-blur-md">
              <div className="p-4 border-b border-nebula-border text-xs font-bold uppercase text-slate-500">Canali</div>
              <div className="p-2 space-y-1">
                <button onClick={() => setState(p => ({...p, ui: {...p.ui, activeChatRoom: 'global'}}))} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${state.ui.activeChatRoom === 'global' ? 'bg-nebula-800 text-white' : 'text-slate-400 hover:bg-nebula-800/50'}`}><Globe className="w-4 h-4" /><span>Global Room</span></button>
                <button onClick={() => setState(p => ({...p, ui: {...p.ui, activeChatRoom: 'ai'}}))} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${state.ui.activeChatRoom === 'ai' ? 'bg-nebula-800 text-white' : 'text-slate-400 hover:bg-nebula-800/50'}`}><Bot className={`w-4 h-4 ${state.user.isProMax ? 'text-purple-400' : 'text-cyan-400'}`} /><span>{state.user.isProMax ? 'Nebula OMNISCIENT' : 'Nebula AI'}</span>{(!state.user.isPro && !state.user.isProMax) && <Lock className="w-3 h-3 ml-1" />}</button>
              </div>
            </div>
            <div className="flex-1 flex flex-col bg-nebula-950/40 relative backdrop-blur-md">
              <div className="p-4 border-b border-nebula-border bg-nebula-900/60"><h3 className="font-bold text-white">#{state.ui.activeChatRoom}</h3></div>
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {(state.chatHistory[state.ui.activeChatRoom] || []).map((m, idx) => (
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
          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${state.ui.activeTab === 'premium' ? 'flex' : 'hidden'}`}>
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
                {!state.user.isPro ? (
                  <button onClick={() => buySubscription('PRO', 7500)} className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity text-lg">Acquista Ora</button>
                ) : (
                  <button disabled className="w-full py-4 bg-amber-900/50 text-amber-500 font-bold rounded-xl cursor-not-allowed">Attivo</button>
                )}
                
                <div className="mt-6 pt-6 border-t border-nebula-border/50">
                  <p className="text-xs text-slate-500 mb-2">Oppure usa un codice licenza:</p>
                  <div className="flex space-x-2">
                    <input type="text" id="pro-key-input" placeholder="NBL-PRO-XXXX" className="flex-1 bg-nebula-950 border border-amber-500/50 rounded-lg px-4 py-2 text-white font-mono uppercase focus:outline-none focus:border-amber-400" />
                    <button onClick={() => {
                      const val = document.getElementById('pro-key-input').value.trim().toUpperCase();
                      if(PRO_KEYS.includes(val)) { setState(p => ({...p, user: {...p.user, isPro: true}})); showToast("Licenza PRO attivata!", "success"); } else showToast("Codice errato o scaduto.", "error");
                    }} className="px-4 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-500">Riscatta</button>
                  </div>
                </div>
              </div>

              {/* PRO MAX CARD */}
              <div className="bg-nebula-900/60 backdrop-blur-md p-8 border border-purple-500/50 rounded-2xl relative flex flex-col shadow-[0_0_40px_rgba(168,85,247,0.15)] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-transparent pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
                <h3 className="text-2xl font-black text-purple-400 mb-2 flex items-center z-10"><Zap className="w-6 h-6 mr-2"/> PRO MAX</h3>
                <div className="text-4xl font-mono text-white mb-6 font-bold z-10">€15.000<span className="text-sm text-slate-500 font-sans font-normal">/mese</span></div>
                <ul className="space-y-4 mb-8 flex-1 text-slate-300 z-10">
                  <li className="flex items-center"><Check className="w-5 h-5 text-purple-400 mr-3"/> Include tutti i vantaggi PRO</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-purple-400 mr-3"/> Nebula OMNISCIENT (IA Quantistica Definitiva)</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-purple-400 mr-3"/> Sblocco Mercato PRO MAX (05:00 - 22:00)</li>
                  <li className="flex items-center"><Check className="w-5 h-5 text-purple-400 mr-3"/> Asset Esclusivi ad altissimo rendimento</li>
                </ul>
                {!state.user.isProMax ? (
                  <button onClick={() => buySubscription('PROMAX', 15000)} className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.5)] hover:opacity-90 transition-opacity text-lg z-10">Ascendi a MAX</button>
                ) : (
                  <button disabled className="w-full py-4 bg-purple-900/50 text-purple-400 font-bold rounded-xl cursor-not-allowed z-10 border border-purple-500/30">Livello Massimo Raggiunto</button>
                )}
              </div>
            </div>
          </div>

          {/* TAB SETTINGS */}
          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${state.ui.activeTab === 'settings' ? 'flex' : 'hidden'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Impostazioni</h2>
              {!state.user.isDarkWeb && (
                <button onClick={buyDarkWeb} className="text-slate-700 hover:text-purple-500 transition-colors" title="???"><Eye className="w-5 h-5"/></button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
              <div className="bg-nebula-900/60 p-6 border border-nebula-border rounded-xl backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-nebula-border/50 pb-2">Profilo e Personalizzazione</h3>
                <label className="block text-xs text-slate-400 mb-1">ID Discord</label>
                <input type="text" disabled value={state.user.id} className="w-full bg-nebula-950/50 border border-nebula-border rounded-lg px-3 py-2 text-slate-400 font-mono mb-4" />
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><label className="block text-xs text-slate-400 mb-1">Colore Nome</label><input type="color" value={state.user.colorName} onChange={e => setState(p => ({...p, user: {...p.user, colorName: e.target.value}}))} className="h-8 w-full rounded bg-transparent border border-nebula-border cursor-pointer" /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">Colore Testo</label><input type="color" value={state.user.colorText} onChange={e => setState(p => ({...p, user: {...p.user, colorText: e.target.value}}))} className="h-8 w-full rounded bg-transparent border border-nebula-border cursor-pointer" /></div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 flex items-center"><Image className="w-3 h-3 mr-1"/> Sfondo Terminale (URL Immagine)</label>
                  <input type="url" value={state.user.bgImage} onChange={e => setState(p => ({...p, user: {...p.user, bgImage: e.target.value}}))} placeholder="https://..." className="w-full bg-nebula-950/80 border border-nebula-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500" />
                </div>
              </div>

              <div className="bg-nebula-900/60 p-6 border border-nebula-border rounded-xl backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-nebula-border/50 pb-2">Integrazioni API</h3>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">OpenAI API Key</label>
                  <input type="password" value={state.keys.openai} onChange={e => setState(p => ({...p, keys: {...p.keys, openai: e.target.value}}))} placeholder="sk-..." className="w-full bg-nebula-950/80 border border-nebula-border rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-cyan-500" />
                  <p className="text-[10px] text-slate-500 mt-2">Richiesto livello PRO. Non condividere la tua chiave.</p>
                </div>
              </div>
            </div>
          </div>

          {/* TAB DEV / ADMIN */}
          <div className={`h-full flex-col p-6 overflow-y-auto custom-scroll w-full ${state.ui.activeTab === 'admin' ? 'flex' : 'hidden'}`}>
            <h2 className="text-2xl font-black text-rose-500 mb-6 flex items-center"><UserCog className="w-6 h-6 mr-3" /> Dev / Admin Panel</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="bg-nebula-900/60 p-6 border border-rose-900/50 rounded-xl backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-rose-900/50 pb-2">Controllo Tempo (Simulazione)</h3>
                <div className="flex items-center space-x-4">
                  <div><label className="text-xs text-slate-400 block mb-1">Ore (0-23)</label><input type="number" id="dev-time-hh" defaultValue={state.gameTime.hours} min="0" max="23" className="bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono w-20" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Minuti (0-59)</label><input type="number" id="dev-time-mm" defaultValue={state.gameTime.minutes} min="0" max="59" className="bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono w-20" /></div>
                  <div className="flex items-end h-full pt-5"><button onClick={() => { const h = parseInt(document.getElementById('dev-time-hh').value); const m = parseInt(document.getElementById('dev-time-mm').value); if(h>=0 && h<24 && m>=0 && m<60) { setState(p => ({...p, gameTime: {hours: h, minutes: m}})); showToast("Orario forzato.", "success"); } }} className="px-6 py-2 bg-rose-600 text-white font-bold rounded">Forza</button></div>
                </div>
              </div>

              <div className="bg-nebula-900/60 p-6 border border-rose-900/50 rounded-xl backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-rose-900/50 pb-2">Manipolazione Mercato (Live)</h3>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex-1"><label className="text-xs text-slate-400 block mb-1">Seleziona Asset</label><select value={adminPriceEdit.ticker} onChange={e => setAdminPriceEdit({...adminPriceEdit, ticker: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm">{Object.keys(assetsRef.current).map(k => <option key={k} value={k}>{k}</option>)}</select></div>
                  <div className="flex-1"><label className="text-xs text-slate-400 block mb-1">Nuovo Prezzo Base (€)</label><input type="number" step="any" value={adminPriceEdit.newPrice} onChange={e => setAdminPriceEdit({...adminPriceEdit, newPrice: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white font-mono" /></div>
                </div>
                <button onClick={updateExistingAssetPrice} className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-sm">Forza Prezzo Attuale</button>
              </div>

              <div className="bg-nebula-900/60 p-6 border border-rose-900/50 rounded-xl lg:col-span-2 backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-rose-900/50 pb-2">Aggiunta Nuove Compagnie / Crypto (IPO)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div><label className="text-xs text-slate-400 block mb-1">Mercato</label><select value={newAsset.type} onChange={e => setNewAsset({...newAsset, type: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm outline-none"><option value="stocks">Azioni Standard</option><option value="crypto">Crypto Standard</option><option value="promax_stocks">Azioni PRO MAX</option><option value="promax_crypto">Crypto PRO MAX</option></select></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Ticker (Es. AAPL)</label><input type="text" maxLength="5" value={newAsset.ticker} onChange={e => setNewAsset({...newAsset, ticker: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm uppercase" /></div>
                  <div className="md:col-span-2"><label className="text-xs text-slate-400 block mb-1">Nome Completo</label><input type="text" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm" /></div>
                  
                  <div><label className="text-xs text-slate-400 block mb-1">Prezzo (€)</label><input type="number" step="0.1" value={newAsset.price} onChange={e => setNewAsset({...newAsset, price: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Volatilità (Es. 0.02)</label><input type="number" step="0.01" value={newAsset.vol} onChange={e => setNewAsset({...newAsset, vol: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Settore</label><input type="text" value={newAsset.sector} onChange={e => setNewAsset({...newAsset, sector: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Market Cap</label><input type="text" value={newAsset.mcap} onChange={e => setNewAsset({...newAsset, mcap: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm" /></div>
                  
                  <div><label className="text-xs text-slate-400 block mb-1">CEO</label><input type="text" value={newAsset.ceo} onChange={e => setNewAsset({...newAsset, ceo: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Fondazione</label><input type="text" value={newAsset.founded} onChange={e => setNewAsset({...newAsset, founded: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Dipendenti</label><input type="text" value={newAsset.employees} onChange={e => setNewAsset({...newAsset, employees: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">Dividendo</label><input type="text" value={newAsset.dividend} onChange={e => setNewAsset({...newAsset, dividend: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm" /></div>
                  
                  <div className="md:col-span-4 flex items-center space-x-4">
                    <div className="flex-1"><label className="text-xs text-slate-400 block mb-1">Descrizione</label><input type="text" value={newAsset.desc} onChange={e => setNewAsset({...newAsset, desc: e.target.value})} className="w-full bg-nebula-950 border border-nebula-border rounded px-3 py-2 text-white text-sm" /></div>
                    <div className="flex items-center space-x-2 pt-4">
                      <input type="checkbox" id="isProTick" checked={newAsset.isPro} onChange={e => setNewAsset({...newAsset, isPro: e.target.checked})} className="w-4 h-4" />
                      <label htmlFor="isProTick" className="text-sm font-bold text-amber-500">PRO</label>
                    </div>
                    <div className="flex items-center space-x-2 pt-4">
                      <input type="checkbox" id="isProMaxTick" checked={newAsset.isProMax} onChange={e => setNewAsset({...newAsset, isProMax: e.target.checked, isPro: e.target.checked ? true : newAsset.isPro})} className="w-4 h-4" />
                      <label htmlFor="isProMaxTick" className="text-sm font-bold text-purple-400">PRO MAX</label>
                    </div>
                  </div>
                </div>
                <button onClick={createCustomAsset} className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors">Aggiungi al Mercato (IPO)</button>
              </div>

              <div className="bg-nebula-900/60 p-6 border border-rose-900/50 rounded-xl backdrop-blur-md lg:col-span-2">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-rose-900/50 pb-2">Gestione Utenti (Mock Local View)</h3>
                <div className="bg-nebula-950/80 p-4 rounded-lg border border-nebula-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-white flex items-center"><img src={state.user.avatar || `https://ui-avatars.com/api/?name=${state.user.name}`} className="w-6 h-6 rounded-full mr-2" alt="Avatar"/> {state.user.name}</span>
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">ID: {state.user.id}</span>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <label className="text-xs text-slate-400">Saldo Utente Corrente (€)</label>
                    <input type="number" id="dev-db-cash" defaultValue={state.portfolio.cash} className="bg-nebula-900 border border-nebula-border rounded px-2 py-1 text-white font-mono text-right w-40 outline-none" />
                  </div>
                  <button onClick={() => { const c = parseFloat(document.getElementById('dev-db-cash').value); if(!isNaN(c)) { setState(p => ({...p, portfolio: {...p.portfolio, cash: c}})); syncBalanceWithBackend(c); showToast("Saldo aggiornato", "success"); } }} className="w-full py-2 mt-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded text-xs">Forza Aggiornamento Denaro</button>
                </div>
              </div>

            </div>
          </div>

        </main>
      </div>

      {discordModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-nebula-900/90 border border-cyan-500/50 rounded-2xl max-w-sm w-full p-6 relative">
            <button onClick={() => setDiscordModal({open: false, type: ''})} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            <div className="text-center mb-6">
              <Wallet className="w-10 h-10 text-[#5865F2] mx-auto mb-2" />
              <h3 className="text-xl font-bold text-white">{discordModal.type === 'DEPOSIT' ? 'Deposito' : 'Prelievo'}</h3>
            </div>
            <input type="number" id="dm-amount" defaultValue="1000" min="1" className="w-full bg-nebula-950 border border-nebula-border rounded-lg py-3 px-4 text-white font-mono font-bold text-lg mb-4 outline-none focus:border-cyan-500" />
            <button onClick={executeDiscordTransaction} className="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg font-bold transition-colors">Conferma Operazione</button>
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
