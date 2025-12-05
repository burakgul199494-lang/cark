import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, Plus, RotateCw, Sparkles, X, LogOut, User, LogIn, AlertTriangle, 
  Settings, ClipboardPaste, Type, CheckSquare, Square,
  Gamepad2, Calculator, Grid, Trophy, Play, RotateCcw, Save, Crown, Eye, EyeOff,
  AlertCircle, Minus, PlusCircle, Edit2
} from 'lucide-react';

// --- FIREBASE IMPORTLARI ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot
} from "firebase/firestore";

// --- FIREBASE AYARLARI ---
const firebaseConfig = {
  apiKey: "AIzaSyBNJQlfGRCn8g5kFUJ8fILd56RZELf50kw",
  authDomain: "cark-52f88.firebaseapp.com",
  projectId: "cark-52f88",
  storageBucket: "cark-52f88.firebasestorage.app",
  messagingSenderId: "863597988390",
  appId: "1:863597988390:web:873afd41ada639a999b4e7",
  measurementId: "G-LRZ58XVYX3"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- RENKLER ---
const COLORS = ['#EF476F', '#FFD166', '#06D6A0', '#118AB2', '#073B4C', '#9D4EDD', '#FF9F1C', '#4CC9F0'];
const TR_ALPHABET = "A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z".split(' ');

export default function GameCenterApp() {
  // --- STATE YÖNETİMİ ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('menu'); // 'menu', 'wheel', 'scrabble', 'okey'
  
  // Auth State
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  const [dbError, setDbError] = useState('');

  // --- OYUN VERİLERİ (FIRESTORE'DAN GELEN) ---
  const [wheelData, setWheelData] = useState({ items: [], settings: { autoRemove: false } });
  
  const [scrabbleData, setScrabbleData] = useState({
    active: false,
    finished: false, 
    players: [], 
    history: []
  });

  const [okeyData, setOkeyData] = useState({
    active: false,
    mode: 'single', 
    players: [], // { name, scores: [], penalties: [] } 
    history: []
  });

  // --- ÇARK YEREL STATE ---
  const [wheelNewItem, setWheelNewItem] = useState('');
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelWinner, setWheelWinner] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const currentRotation = useRef(0);

  // --- SCRABBLE YEREL STATE ---
  const [scrabbleNewPlayer, setScrabbleNewPlayer] = useState('');
  const [scrabbleScoreInput, setScrabbleScoreInput] = useState('');
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(null);
  const [showScrabbleEndModal, setShowScrabbleEndModal] = useState(false);
  const [finisherIndex, setFinisherIndex] = useState(null);
  const [remainingScores, setRemainingScores] = useState({}); 
  const [showScrabbleScores, setShowScrabbleScores] = useState(false); 

  // --- 101 OKEY YEREL STATE ---
  const [okeyNewPlayer, setOkeyNewPlayer] = useState('');
  const [okeyScoreInput, setOkeyScoreInput] = useState(''); 
  const [okeyPenaltyInput, setOkeyPenaltyInput] = useState(''); 
  const [selectedOkeyPlayerIndex, setSelectedOkeyPlayerIndex] = useState(null);
  const [okeyModalTab, setOkeyModalTab] = useState('score'); 
  
  // Okey Düzenleme State'i
  const [editingOkeyItem, setEditingOkeyItem] = useState(null); // { playerIndex, type: 'score'|'penalty', index, value }


  // --- 1. INITIALIZATION & AUTH ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. DATA SYNC ---
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setWheelData({
          items: data.wheelItems || [],
          settings: data.wheelSettings || { autoRemove: false }
        });
        setScrabbleData(data.scrabble || { active: false, finished: false, players: [] });
        setOkeyData(data.okey || { active: false, mode: 'single', players: [] });
      } else {
        setDoc(docRef, { 
          wheelItems: ['Ahmet', 'Mehmet', 'Ayşe'],
          wheelSettings: { autoRemove: false },
          email: user.email 
        }, { merge: true });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // --- GENEL VERİTABANI GÜNCELLEME ---
  const updateDb = async (field, data) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { [field]: data }, { merge: true });
    } catch (err) {
      console.error("Save error:", err);
      setDbError("Kaydetme hatası!");
    }
  };

  // --- AUTH HANDLERS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'register') {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setAuthMode('login');
  };

  // ==========================================
  // MODÜL 1: ŞANS ÇARKI MANTIKLARI
  // ==========================================
  const wheelMethods = {
    addItem: () => {
      if (wheelNewItem.trim()) {
        updateDb('wheelItems', [...wheelData.items, wheelNewItem.trim()]);
        setWheelNewItem('');
      }
    },
    deleteItem: (idx) => {
      const newItems = wheelData.items.filter((_, i) => i !== idx);
      updateDb('wheelItems', newItems);
    },
    clearAll: () => {
      if (window.confirm("Tüm listeyi silmek istediğine emin misin?")) {
        updateDb('wheelItems', []);
        setWheelWinner(null);
      }
    },
    toggleAutoRemove: () => {
      updateDb('wheelSettings', { ...wheelData.settings, autoRemove: !wheelData.settings.autoRemove });
    },
    loadTr: () => {
      if(window.confirm("Liste silinip Alfabe yüklenecek?")) updateDb('wheelItems', TR_ALPHABET);
    },
    bulkImport: () => {
      const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l);
      if(lines.length) {
        updateDb('wheelItems', [...wheelData.items, ...lines]);
        setBulkText('');
        setShowBulkModal(false);
      }
    },
    spin: () => {
      if (wheelSpinning || wheelData.items.length === 0) return;
      setWheelSpinning(true);
      setWheelWinner(null);
      const minSpins = 5;
      const randomSpins = Math.floor(Math.random() * 5) + minSpins;
      const randomDegree = Math.floor(Math.random() * 360);
      const newRotation = currentRotation.current + (randomSpins * 360) + randomDegree;
      setWheelRotation(newRotation);
      currentRotation.current = newRotation;
      setTimeout(() => {
        const segmentAngle = 360 / wheelData.items.length;
        const normalized = newRotation % 360;
        const effective = (360 - normalized) % 360;
        const idx = Math.floor(effective / segmentAngle);
        setWheelWinner(wheelData.items[idx]);
        setWheelSpinning(false);
      }, 4000);
    },
    confirmWinner: () => {
      if (wheelData.settings.autoRemove && wheelWinner) {
        const idx = wheelData.items.indexOf(wheelWinner);
        if (idx !== -1) wheelMethods.deleteItem(idx);
      }
      setWheelWinner(null);
    }
  };

  // ==========================================
  // MODÜL 2: SCRABBLE MANTIKLARI
  // ==========================================
  const scrabbleMethods = {
    startGame: () => {
      if (scrabbleData.players.length < 2) return alert("En az 2 oyuncu ekleyin.");
      updateDb('scrabble', { ...scrabbleData, active: true, finished: false });
    },
    resetGame: () => {
      if(window.confirm("Oyun sıfırlanacak. Emin misin?")) {
        updateDb('scrabble', { active: false, finished: false, players: [] });
        setShowScrabbleScores(false); 
      }
    },
    addPlayer: () => {
      if(scrabbleNewPlayer.trim()) {
        const newP = { name: scrabbleNewPlayer.trim(), scores: [], finalAdjustment: 0 };
        updateDb('scrabble', { ...scrabbleData, players: [...scrabbleData.players, newP] });
        setScrabbleNewPlayer('');
      }
    },
    addScore: () => {
      if (selectedPlayerIndex === null || !scrabbleScoreInput) return;
      const score = parseInt(scrabbleScoreInput);
      if (isNaN(score)) return;

      const updatedPlayers = [...scrabbleData.players];
      const player = updatedPlayers[selectedPlayerIndex];
      const currentRoundOfPlayer = player.scores.length;
      const isSomeoneBehind = updatedPlayers.some((p, idx) => idx !== selectedPlayerIndex && p.scores.length < currentRoundOfPlayer);
      
      if (isSomeoneBehind) {
        const behindPlayer = updatedPlayers.find((p, idx) => idx !== selectedPlayerIndex && p.scores.length < currentRoundOfPlayer);
        alert(`Sıra bekleniyor! Önce ${behindPlayer.name} oyuncusunun ${currentRoundOfPlayer + 1}. el puanını girmelisiniz.`);
        return;
      }

      player.scores.push(score);
      updateDb('scrabble', { ...scrabbleData, players: updatedPlayers });
      setScrabbleScoreInput('');
      setSelectedPlayerIndex(null);
    },
    finishGame: () => {
      if (finisherIndex === null) return alert("Lütfen oyunu bitiren kişiyi seçin.");
      const updatedPlayers = [...scrabbleData.players];
      let sumOfOthers = 0;
      updatedPlayers.forEach((p, idx) => {
        if (idx !== finisherIndex) {
          const rem = parseInt(remainingScores[idx] || 0);
          p.finalAdjustment = -rem; 
          sumOfOthers += rem;
        }
      });
      updatedPlayers[finisherIndex].finalAdjustment = sumOfOthers; 
      updateDb('scrabble', { ...scrabbleData, players: updatedPlayers, active: true, finished: true });
      setShowScrabbleEndModal(false);
    }
  };

  // ==========================================
  // MODÜL 3: 101 OKEY MANTIKLARI
  // ==========================================
  const okeyMethods = {
    addPlayer: () => {
      if(okeyNewPlayer.trim()) {
        const newP = { name: okeyNewPlayer.trim(), scores: [], penalties: [] };
        updateDb('okey', { ...okeyData, players: [...okeyData.players, newP] });
        setOkeyNewPlayer('');
      }
    },
    startGame: () => {
       if (okeyData.players.length === 0) return alert("Oyuncu ekleyin.");
       updateDb('okey', { ...okeyData, active: true });
    },
    reset: () => {
       if(window.confirm("Oyun sıfırlanacak?")) updateDb('okey', { active: false, players: [], mode: 'single' });
    },
    addSingleScore: (type) => {
      if (selectedOkeyPlayerIndex === null) return;
      let val = 0;
      if (type === 'score') {
        val = parseInt(okeyScoreInput);
      } else {
        val = parseInt(okeyPenaltyInput);
      }

      if (isNaN(val)) return;
      if (val === 0 && !window.confirm("0 puan girmek istediğine emin misin?")) return;

      const updatedPlayers = [...okeyData.players];
      if (type === 'score') {
        updatedPlayers[selectedOkeyPlayerIndex].scores.push(val);
        setOkeyScoreInput('');
        setSelectedOkeyPlayerIndex(null); 
      } else {
        if (!updatedPlayers[selectedOkeyPlayerIndex].penalties) updatedPlayers[selectedOkeyPlayerIndex].penalties = [];
        updatedPlayers[selectedOkeyPlayerIndex].penalties.push(val);
        setOkeyPenaltyInput(''); 
        alert("Ceza eklendi!");
        setSelectedOkeyPlayerIndex(null);
      }
      updateDb('okey', { ...okeyData, players: updatedPlayers });
    },
    // EKLENEN: Puan/Ceza Düzenleme
    startEditing: (playerIdx, type, itemIdx, val) => {
      setEditingOkeyItem({
        playerIndex: playerIdx,
        type: type, // 'score' or 'penalty'
        index: itemIdx,
        value: val
      });
    },
    saveEdit: () => {
      if (!editingOkeyItem) return;
      const { playerIndex, type, index, value } = editingOkeyItem;
      const newVal = parseInt(value);
      if (isNaN(newVal)) return;

      const updatedPlayers = [...okeyData.players];
      if (type === 'score') {
        updatedPlayers[playerIndex].scores[index] = newVal;
      } else {
        updatedPlayers[playerIndex].penalties[index] = newVal;
      }
      updateDb('okey', { ...okeyData, players: updatedPlayers });
      setEditingOkeyItem(null);
    },
    deleteEdit: () => {
      if (!editingOkeyItem) return;
      if (!window.confirm("Bu girişi silmek istediğine emin misin?")) return;
      
      const { playerIndex, type, index } = editingOkeyItem;
      const updatedPlayers = [...okeyData.players];
      
      if (type === 'score') {
        updatedPlayers[playerIndex].scores.splice(index, 1);
      } else {
        updatedPlayers[playerIndex].penalties.splice(index, 1);
      }
      updateDb('okey', { ...okeyData, players: updatedPlayers });
      setEditingOkeyItem(null);
    }
  };


  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
           <div className="text-center mb-6">
             <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Gamepad2 className="w-8 h-8 text-indigo-600"/></div>
             <h1 className="text-2xl font-bold">Oyun Merkezi</h1>
             <p className="text-gray-500">Giriş yap ve oyunları yönet!</p>
           </div>
           {authError && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{authError}</div>}
           <form onSubmit={handleAuth} className="space-y-4">
             {authMode === 'register' && <input type="text" placeholder="Adınız" className="w-full p-3 border rounded-lg" onChange={e=>setName(e.target.value)} />}
             <input type="email" placeholder="Email" className="w-full p-3 border rounded-lg" onChange={e=>setEmail(e.target.value)} />
             <input type="password" placeholder="Şifre" className="w-full p-3 border rounded-lg" onChange={e=>setPassword(e.target.value)} />
             <button className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-700">{authMode === 'login' ? 'Giriş' : 'Kayıt'}</button>
           </form>
           <button onClick={() => setAuthMode(authMode==='login'?'register':'login')} className="w-full mt-4 text-indigo-600 text-sm font-semibold">
             {authMode === 'login' ? 'Hesap Oluştur' : 'Giriş Yap'}
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      
      <div className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2" onClick={() => setActiveTab('menu')}>
          <Gamepad2 className="text-indigo-600 cursor-pointer" />
          <span className="font-bold text-lg cursor-pointer hidden sm:block">Oyun Merkezi</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">{user.displayName}</span>
          <LogOut size={20} className="text-gray-400 cursor-pointer hover:text-red-500" onClick={handleLogout}/>
        </div>
      </div>

      {dbError && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded z-50 flex items-center gap-2">
          <AlertTriangle size={16}/> {dbError} <X size={16} className="cursor-pointer" onClick={()=>setDbError('')}/>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4">
        
        {activeTab === 'menu' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div onClick={() => setActiveTab('wheel')} className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer border-t-4 border-purple-500 flex flex-col items-center gap-4 group">
              <div className="bg-purple-100 p-4 rounded-full group-hover:scale-110 transition-transform"><RotateCw size={40} className="text-purple-600"/></div>
              <h2 className="text-2xl font-bold">Şans Çarkı</h2>
              <p className="text-gray-500 text-center">İsim, Şehir, Hayvan veya çekilişler için.</p>
            </div>
            
            <div onClick={() => setActiveTab('scrabble')} className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer border-t-4 border-green-500 flex flex-col items-center gap-4 group">
              <div className="bg-green-100 p-4 rounded-full group-hover:scale-110 transition-transform"><Grid size={40} className="text-green-600"/></div>
              <h2 className="text-2xl font-bold">Scrabble</h2>
              <p className="text-gray-500 text-center">Kelime oyunu puan takibi ve hesaplama.</p>
            </div>

            <div onClick={() => setActiveTab('okey')} className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer border-t-4 border-blue-500 flex flex-col items-center gap-4 group">
              <div className="bg-blue-100 p-4 rounded-full group-hover:scale-110 transition-transform"><Calculator size={40} className="text-blue-600"/></div>
              <h2 className="text-2xl font-bold">101 Okey</h2>
              <p className="text-gray-500 text-center">Ceza puanları ve eşli oyun hesaplaması.</p>
            </div>
          </div>
        )}

        {/* --- WHEEL VIEW --- */}
        {activeTab === 'wheel' && (
          <div className="animate-fade-in">
            <button onClick={()=>setActiveTab('menu')} className="mb-4 text-gray-500 hover:text-gray-800 flex items-center gap-1">← Menüye Dön</button>
            <div className="flex flex-col-reverse lg:flex-row gap-8 items-start justify-center">
              <div className="w-full lg:w-1/3 bg-white p-6 rounded-2xl shadow-lg">
                 <div className="flex gap-2 overflow-x-auto pb-2 mb-4 border-b">
                   <button onClick={wheelMethods.loadTr} className="px-3 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200 whitespace-nowrap">TR Alfabe</button>
                   <button onClick={()=>setShowBulkModal(true)} className="px-3 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200 whitespace-nowrap">Toplu Ekle</button>
                   <button onClick={wheelMethods.toggleAutoRemove} className={`px-3 py-1 rounded text-xs whitespace-nowrap ${wheelData.settings.autoRemove ? 'bg-red-100 text-red-600' : 'bg-gray-100'}`}>
                     {wheelData.settings.autoRemove ? 'Silme: AÇIK' : 'Silme: KAPALI'}
                   </button>
                 </div>
                 <div className="flex gap-2 mb-4">
                   <input value={wheelNewItem} onChange={e=>setWheelNewItem(e.target.value)} onKeyDown={e=>e.key==='Enter' && wheelMethods.addItem()} className="flex-1 border p-2 rounded" placeholder="Ekle..." />
                   <button onClick={wheelMethods.addItem} className="bg-purple-600 text-white p-2 rounded"><Plus/></button>
                 </div>
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-sm font-semibold text-gray-500">{wheelData.items.length} Öğe</span>
                   {wheelData.items.length > 0 && (
                     <button onClick={wheelMethods.clearAll} className="text-xs text-red-500 hover:text-red-700 hover:underline">
                       Tümünü Temizle
                     </button>
                   )}
                 </div>
                 <ul className="max-h-96 overflow-y-auto">
                   {wheelData.items.map((item, idx) => (
                     <li key={idx} className="flex justify-between p-2 hover:bg-gray-50 border-b">
                       <span>{item}</span>
                       <Trash2 size={16} className="text-gray-300 hover:text-red-500 cursor-pointer" onClick={()=>wheelMethods.deleteItem(idx)}/>
                     </li>
                   ))}
                 </ul>
              </div>
              <div className="w-full lg:w-2/3 flex flex-col items-center">
                 <div className="relative w-[300px] h-[300px] sm:w-[400px] sm:h-[400px]">
                    <div className="absolute top-1/2 -right-6 -mt-4 z-20 w-0 h-0 border-t-[16px] border-t-transparent border-b-[16px] border-b-transparent border-r-[30px] border-r-gray-800 drop-shadow-lg"></div>
                    <div className="w-full h-full rounded-full shadow-2xl border-4 border-white overflow-hidden transition-transform ease-[cubic-bezier(0.2,0.8,0.2,1)]" style={{ transform: `rotate(${wheelRotation}deg)`, transitionDuration: wheelSpinning ? '4s' : '0s' }}>
                      {wheelData.items.length > 0 && (
                        <svg viewBox="-1 -1 2 2" className="w-full h-full">
                          {wheelData.items.map((item, idx) => {
                            const startAngle = idx * (1 / wheelData.items.length);
                            const endAngle = (idx + 1) * (1 / wheelData.items.length);
                            const x1 = Math.cos(2 * Math.PI * startAngle);
                            const y1 = Math.sin(2 * Math.PI * startAngle);
                            const x2 = Math.cos(2 * Math.PI * endAngle);
                            const y2 = Math.sin(2 * Math.PI * endAngle);
                            const largeArc = 1 / wheelData.items.length > 0.5 ? 1 : 0;
                            const path = wheelData.items.length === 1 ? "M 0 0 L 1 0 A 1 1 0 1 1 1 -0.001 Z" : `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} Z`;
                            return (
                              <g key={idx}>
                                <path d={path} fill={COLORS[idx % COLORS.length]} stroke="white" strokeWidth="0.01" />
                                <g transform={`rotate(${(startAngle + (1/wheelData.items.length)/2) * 360})`}>
                                  <text x="0.6" y="0.02" fill="white" fontSize="0.08" textAnchor="middle" alignmentBaseline="middle" fontWeight="bold" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
                                    {item.length > 10 ? item.substring(0,8)+'..' : item}
                                  </text>
                                </g>
                              </g>
                            )
                          })}
                        </svg>
                      )}
                    </div>
                 </div>
                 <button onClick={wheelMethods.spin} disabled={wheelSpinning || wheelData.items.length < 1} className="mt-8 px-8 py-3 bg-purple-600 text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform disabled:opacity-50">
                   {wheelSpinning ? 'Dönüyor...' : 'ÇEVİR'}
                 </button>
              </div>
            </div>
            {wheelWinner && !wheelSpinning && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-xl text-center max-w-sm w-full animate-bounce-in">
                  <h2 className="text-2xl font-bold mb-4">Kazanan!</h2>
                  <div className="text-3xl font-black text-purple-600 mb-2">{wheelWinner}</div>
                  {wheelData.settings.autoRemove && <p className="text-red-500 text-xs mb-4">*Listeden silinecek</p>}
                  <button onClick={wheelMethods.confirmWinner} className="w-full bg-gray-900 text-white py-3 rounded-lg">Tamam</button>
                </div>
              </div>
            )}
            {showBulkModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-xl w-full max-w-md">
                   <h3 className="font-bold mb-2">Toplu Ekle</h3>
                   <textarea className="w-full border p-2 h-40" placeholder="Her satıra bir isim..." value={bulkText} onChange={e=>setBulkText(e.target.value)}></textarea>
                   <div className="flex gap-2 mt-4">
                     <button onClick={()=>setShowBulkModal(false)} className="flex-1 bg-gray-200 py-2 rounded">İptal</button>
                     <button onClick={wheelMethods.bulkImport} className="flex-1 bg-purple-600 text-white py-2 rounded">Ekle</button>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- SCRABBLE VIEW --- */}
        {activeTab === 'scrabble' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
               <button onClick={()=>setActiveTab('menu')} className="text-gray-500 hover:text-gray-800 flex items-center gap-1">← Menüye Dön</button>
               <div className="flex gap-3">
                   {(scrabbleData.active || scrabbleData.players.length > 0) && !scrabbleData.finished && (
                     <button onClick={() => setShowScrabbleScores(!showScrabbleScores)} className="text-indigo-600 text-sm hover:underline flex items-center gap-1">
                       {showScrabbleScores ? <EyeOff size={14}/> : <Eye size={14}/>}
                       {showScrabbleScores ? 'Gizle' : 'Puanları Göster'}
                     </button>
                   )}
                   {(scrabbleData.active || scrabbleData.players.length > 0) && (
                     <button onClick={scrabbleMethods.resetGame} className="text-red-500 text-sm hover:underline flex items-center gap-1">
                       <RotateCcw size={14}/> Oyunu Sıfırla
                     </button>
                   )}
               </div>
            </div>

            {!scrabbleData.active && !scrabbleData.finished ? (
              <div className="bg-white p-8 rounded-2xl shadow-lg max-w-lg mx-auto text-center">
                <h2 className="text-2xl font-bold mb-4 text-green-700">Yeni Scrabble Oyunu</h2>
                <div className="flex gap-2 mb-4">
                  <input value={scrabbleNewPlayer} onChange={e=>setScrabbleNewPlayer(e.target.value)} className="flex-1 border p-3 rounded-lg" placeholder="Oyuncu İsmi..." />
                  <button onClick={scrabbleMethods.addPlayer} className="bg-green-600 text-white p-3 rounded-lg"><Plus/></button>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  {scrabbleData.players.map((p,i) => <span key={i} className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">{p.name}</span>)}
                </div>
                <button onClick={scrabbleMethods.startGame} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-green-700">Oyunu Başlat</button>
              </div>
            ) : (
              <div className="space-y-6">
                {scrabbleData.finished && (
                  <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded relative mb-4 text-center">
                    <strong className="font-bold flex items-center justify-center gap-2 text-xl"><Trophy/> OYUN BİTTİ!</strong>
                    <span className="block sm:inline"> Sonuçlar aşağıdadır. Yeni oyun için "Oyunu Sıfırla" diyebilirsiniz.</span>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {scrabbleData.players.map((player, idx) => {
                    const totalScore = player.scores.reduce((a,b)=>a+b, 0) + (player.finalAdjustment || 0);
                    const maxScore = Math.max(...scrabbleData.players.map(p => p.scores.reduce((a,b)=>a+b, 0) + (p.finalAdjustment || 0)));
                    const isWinner = scrabbleData.finished && totalScore === maxScore;
                    const displayScore = (scrabbleData.finished || showScrabbleScores) ? totalScore : '???';

                    return (
                      <div key={idx} className={`bg-white rounded-xl shadow border overflow-hidden flex flex-col relative ${isWinner ? 'border-yellow-400 ring-4 ring-yellow-200' : 'border-gray-100'}`}>
                        {isWinner && <div className="absolute top-0 right-0 bg-yellow-400 text-white p-1 rounded-bl-xl"><Crown size={20}/></div>}
                        <div className="bg-green-50 p-3 text-center border-b border-green-100">
                          <h3 className="font-bold text-gray-800">{player.name}</h3>
                          <div className={`text-2xl font-black ${isWinner ? 'text-yellow-600' : 'text-green-600'}`}>{displayScore}</div>
                        </div>
                        <div className="flex-1 p-3 bg-gray-50 overflow-y-auto max-h-40 text-sm space-y-1">
                          {player.scores.map((s, si) => (
                             <div key={si} className="flex justify-between text-gray-500 border-b border-gray-200 pb-1">
                               <span>{si+1}. El</span> <span>{s}</span>
                             </div>
                          ))}
                          {player.finalAdjustment !== 0 && (
                            <div className="flex justify-between text-indigo-600 font-bold border-t border-gray-200 pt-1 mt-1">
                              <span>Sonuç</span> <span>{player.finalAdjustment > 0 ? `+${player.finalAdjustment}` : player.finalAdjustment}</span>
                            </div>
                          )}
                        </div>
                        {!scrabbleData.finished && (
                           <button onClick={() => { setSelectedPlayerIndex(idx); setScrabbleScoreInput(''); }} className="w-full py-3 bg-white hover:bg-green-50 text-green-600 font-bold text-sm border-t transition-colors">
                             + Puan Ekle
                           </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                {!scrabbleData.finished && (
                  <div className="flex justify-center mt-8">
                    <button onClick={() => setShowScrabbleEndModal(true)} className="bg-gray-800 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-black">
                      Oyunu Bitir & Hesapla
                    </button>
                  </div>
                )}
                
                {selectedPlayerIndex !== null && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-xs animate-bounce-in">
                       <h3 className="font-bold text-lg mb-2">{scrabbleData.players[selectedPlayerIndex].name} - Puan Gir</h3>
                       <input 
                         type="number" 
                         inputMode="numeric" 
                         pattern="[0-9]*" 
                         autoFocus
                         value={scrabbleScoreInput} 
                         onChange={e=>setScrabbleScoreInput(e.target.value)} 
                         className="w-full border p-3 rounded-lg text-lg mb-4" 
                         placeholder="0"
                       />
                       <div className="flex gap-2">
                         <button onClick={()=>setSelectedPlayerIndex(null)} className="flex-1 bg-gray-200 py-3 rounded-lg font-semibold">İptal</button>
                         <button onClick={scrabbleMethods.addScore} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold">Kaydet</button>
                       </div>
                    </div>
                  </div>
                )}

                {showScrabbleEndModal && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto py-10">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md relative">
                       <button onClick={()=>setShowScrabbleEndModal(false)} className="absolute top-4 right-4"><X/></button>
                       <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Trophy className="text-yellow-500"/> Oyun Sonu Hesaplama</h3>
                       <p className="text-sm text-gray-500 mb-4">1. Son taşı koyarak oyunu bitiren kişiyi seçin.</p>
                       <div className="grid grid-cols-2 gap-2 mb-6">
                         {scrabbleData.players.map((p, idx) => (
                           <button 
                             key={idx} 
                             onClick={()=>setFinisherIndex(idx)}
                             className={`p-2 rounded-lg border text-sm font-semibold transition-all ${finisherIndex === idx ? 'bg-green-100 border-green-500 text-green-700 ring-2 ring-green-500' : 'bg-gray-50 text-gray-600'}`}
                           >
                             {p.name}
                           </button>
                         ))}
                       </div>
                       {finisherIndex !== null && (
                         <>
                           <p className="text-sm text-gray-500 mb-2">2. Diğer oyuncuların elinde kalan taşların toplam puanını girin.</p>
                           <div className="space-y-3 mb-6">
                             {scrabbleData.players.map((p, idx) => {
                               if (idx === finisherIndex) return null;
                               return (
                                 <div key={idx} className="flex items-center justify-between">
                                   <span className="font-medium text-gray-700">{p.name}</span>
                                   <input 
                                     type="number" 
                                     inputMode="numeric" 
                                     pattern="[0-9]*" 
                                     className="border p-2 rounded w-24 text-center"
                                     placeholder="Kalan"
                                     onChange={(e) => setRemainingScores({...remainingScores, [idx]: e.target.value})}
                                   />
                                 </div>
                               )
                             })}
                           </div>
                           <button onClick={scrabbleMethods.finishGame} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">Hesapla ve Bitir</button>
                         </>
                       )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- 101 OKEY VIEW --- */}
        {activeTab === 'okey' && (
          <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-6">
               <button onClick={()=>setActiveTab('menu')} className="text-gray-500 hover:text-gray-800 flex items-center gap-1">← Menüye Dön</button>
               {okeyData.active && <button onClick={okeyMethods.reset} className="text-red-500 text-sm hover:underline">Oyunu Sıfırla</button>}
            </div>

            {!okeyData.active ? (
              <div className="bg-white p-8 rounded-2xl shadow-lg max-w-lg mx-auto text-center">
                <h2 className="text-2xl font-bold mb-4 text-blue-700">Yeni 101 Okey Oyunu</h2>
                
                <div className="flex justify-center gap-4 mb-6">
                  <button onClick={()=>setOkeyData({...okeyData, mode: 'single'})} className={`px-4 py-2 rounded-full font-semibold ${okeyData.mode==='single' ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500' : 'bg-gray-100 text-gray-500'}`}>Tekli</button>
                  <button onClick={()=>setOkeyData({...okeyData, mode: 'team'})} className={`px-4 py-2 rounded-full font-semibold ${okeyData.mode==='team' ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500' : 'bg-gray-100 text-gray-500'}`}>Eşli</button>
                </div>

                <div className="flex gap-2 mb-4">
                  <input value={okeyNewPlayer} onChange={e=>setOkeyNewPlayer(e.target.value)} className="flex-1 border p-3 rounded-lg" placeholder="Oyuncu/Takım İsmi..." />
                  <button onClick={okeyMethods.addPlayer} className="bg-blue-600 text-white p-3 rounded-lg"><Plus/></button>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  {okeyData.players.map((p,i) => <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">{p.name}</span>)}
                </div>
                <button onClick={okeyMethods.startGame} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-blue-700">Oyunu Başlat</button>
              </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 {okeyData.players.map((player, idx) => {
                   const sumScores = player.scores.reduce((a,b)=>a+b, 0);
                   const sumPenalties = (player.penalties || []).reduce((a,b)=>a+b, 0);
                   const totalAll = sumScores + sumPenalties;

                   return (
                     <div key={idx} className="bg-white rounded-xl shadow border border-gray-100 flex flex-col h-[400px]">
                        {/* Header */}
                        <div className="bg-blue-50 p-4 text-center border-b border-blue-100 flex-shrink-0">
                           <h3 className="font-bold text-gray-800 text-lg truncate">{player.name}</h3>
                           <div className="text-3xl font-black text-blue-600 mt-1">{totalAll}</div>
                           <div className="text-xs text-blue-400 font-medium uppercase tracking-wider">Genel Toplam</div>
                        </div>
                        
                        {/* List Area */}
                        <div className="flex-1 overflow-y-auto bg-gray-50 custom-scrollbar p-2">
                           {/* Scores Section */}
                           {player.scores.length > 0 && (
                             <div className="mb-2">
                               <div className="text-xs font-bold text-gray-400 uppercase mb-1 px-2">Eller</div>
                               {player.scores.map((s, si) => (
                                 <div 
                                   key={`score-${si}`} 
                                   onClick={() => okeyMethods.startEditing(idx, 'score', si, s)}
                                   className="flex justify-between px-2 py-1.5 bg-white border border-gray-100 rounded mb-1 cursor-pointer hover:border-blue-300 transition-colors"
                                 >
                                   <span className="text-xs font-mono text-gray-400">{si+1}.</span>
                                   <span className="font-semibold text-gray-700">{s > 0 ? `+${s}` : s}</span>
                                 </div>
                               ))}
                             </div>
                           )}

                           {/* Penalties Section */}
                           {(player.penalties && player.penalties.length > 0) && (
                             <div>
                               <div className="text-xs font-bold text-red-400 uppercase mb-1 px-2 mt-2">Cezalar</div>
                               {player.penalties.map((p, pi) => (
                                 <div 
                                   key={`penalty-${pi}`} 
                                   onClick={() => okeyMethods.startEditing(idx, 'penalty', pi, p)}
                                   className="flex justify-between px-2 py-1.5 bg-red-50 border border-red-100 rounded mb-1 cursor-pointer hover:border-red-300 transition-colors"
                                 >
                                   <span className="text-xs font-mono text-red-400">Ceza</span>
                                   <span className="font-semibold text-red-600">{p}</span>
                                 </div>
                               ))}
                             </div>
                           )}
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex flex-col border-t border-gray-100">
                            <button 
                              onClick={() => { 
                                setSelectedOkeyPlayerIndex(idx); 
                                setOkeyModalTab('score'); 
                                setOkeyScoreInput(''); 
                              }} 
                              className="w-full py-3 bg-white hover:bg-blue-50 text-blue-600 font-bold transition-colors flex items-center justify-center gap-2"
                            >
                              <PlusCircle size={16} /> Puan Ekle
                            </button>
                            <button 
                              onClick={() => { 
                                setSelectedOkeyPlayerIndex(idx); 
                                setOkeyModalTab('penalty'); 
                                setOkeyPenaltyInput(''); 
                              }} 
                              className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm transition-colors border-t border-red-100 flex items-center justify-center gap-2"
                            >
                              <AlertCircle size={16} /> Ceza Ekle
                            </button>
                        </div>
                     </div>
                   )
                 })}
               </div>
            )}

            {/* Okey Add Score/Penalty Modal */}
            {selectedOkeyPlayerIndex !== null && (
               <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                  <div className="bg-white p-6 rounded-xl w-full max-w-sm animate-bounce-in">
                     <div className="flex justify-between items-center mb-4">
                       <h3 className="font-bold text-lg text-gray-800 truncate pr-4">{okeyData.players[selectedOkeyPlayerIndex].name}</h3>
                       <button onClick={()=>setSelectedOkeyPlayerIndex(null)} className="text-gray-400 hover:text-gray-600"><X/></button>
                     </div>
                     
                     {/* İçerik */}
                     {okeyModalTab === 'score' ? (
                       <div className="space-y-4">
                         <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                           <label className="text-xs font-bold text-blue-600 uppercase mb-1 block">El Sonu Puanı</label>
                           <p className="text-xs text-blue-400 mb-2">Biten oyuncu için negatif, diğerleri için kalan taş puanını girin.</p>
                           <div className="flex items-center gap-2">
                             <input 
                               type="number" 
                               inputMode="numeric" 
                               pattern="[0-9]*" 
                               autoFocus
                               value={okeyScoreInput} 
                               onChange={e=>setOkeyScoreInput(e.target.value)} 
                               className="w-full border-2 border-blue-200 p-3 rounded-lg text-2xl font-mono text-center focus:border-blue-500 outline-none" 
                               placeholder="0"
                             />
                           </div>
                         </div>
                         <button onClick={() => okeyMethods.addSingleScore('score')} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transform active:scale-95 transition-all">
                           Puanı Kaydet
                         </button>
                       </div>
                     ) : (
                       <div className="space-y-4">
                         <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                           <label className="text-xs font-bold text-red-500 uppercase mb-1 block">Ceza Miktarı</label>
                           <p className="text-xs text-red-400 mb-2">Genelde 101 veya 202 eklenir.</p>
                           
                           <div className="flex gap-2 mb-3">
                             <button onClick={()=>setOkeyPenaltyInput('101')} className="flex-1 py-2 rounded border font-bold bg-white text-gray-600 border-gray-300 hover:bg-red-50 hover:text-red-500 hover:border-red-200">101</button>
                             <button onClick={()=>setOkeyPenaltyInput('202')} className="flex-1 py-2 rounded border font-bold bg-white text-gray-600 border-gray-300 hover:bg-red-50 hover:text-red-500 hover:border-red-200">202</button>
                           </div>

                           <input 
                             type="number" 
                             inputMode="numeric" 
                             pattern="[0-9]*" 
                             value={okeyPenaltyInput} 
                             onChange={e=>setOkeyPenaltyInput(e.target.value)} 
                             className="w-full border-2 border-red-200 p-3 rounded-lg text-2xl font-mono text-center focus:border-red-500 outline-none bg-white" 
                             placeholder="Özel Tutar"
                           />
                         </div>
                         <button onClick={() => okeyMethods.addSingleScore('penalty')} className="w-full bg-red-500 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-red-600 transform active:scale-95 transition-all">
                           Cezayı Ekle
                         </button>
                       </div>
                     )}
                  </div>
               </div>
            )}

            {/* Okey Edit Modal */}
            {editingOkeyItem && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-xl w-full max-w-xs animate-bounce-in">
                   <h3 className="font-bold text-lg mb-4 text-center">Düzenle</h3>
                   
                   <input 
                     type="number" 
                     inputMode="numeric"
                     pattern="[0-9]*"
                     className="w-full border-2 p-3 rounded-lg text-2xl font-mono text-center mb-4 focus:border-indigo-500 outline-none"
                     value={editingOkeyItem.value}
                     onChange={(e) => setEditingOkeyItem({...editingOkeyItem, value: e.target.value})}
                   />

                   <div className="flex gap-2">
                     <button onClick={okeyMethods.deleteEdit} className="flex-1 bg-red-100 text-red-600 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-red-200">
                       <Trash2 size={18}/> Sil
                     </button>
                     <button onClick={okeyMethods.saveEdit} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700">
                       Güncelle
                     </button>
                   </div>
                   <button onClick={() => setEditingOkeyItem(null)} className="w-full mt-3 text-gray-400 text-sm hover:text-gray-600">İptal</button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-bounce-in { animation: bounceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
    </div>
  );
}
