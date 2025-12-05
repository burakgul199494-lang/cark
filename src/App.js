import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, RotateCw, Sparkles, X, LogOut, User, LogIn, AlertTriangle } from 'lucide-react';

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

export default function LuckyWheelApp() {
  // Kullanıcı ve Uygulama Durumları
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' veya 'register'
  
  // Auth Form Durumları
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  
  // Veritabanı Hata Durumu
  const [dbError, setDbError] = useState('');

  // Çark Durumları
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const currentRotation = useRef(0);

  // --- 1. HOOK: SADECE KULLANICI DURUMUNU TAKİP ET ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Emniyet Sübabı: 5 saniye zaman aşımı
    const safetyTimer = setTimeout(() => {
      setLoading((currentLoading) => {
        if (currentLoading) {
          console.warn("Firebase bağlantısı zaman aşımına uğradı, yükleme manuel durduruldu.");
          return false;
        }
        return currentLoading;
      });
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  // --- 2. HOOK: KULLANICI VARSA VERİYİ TAKİP ET ---
  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    const docRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      setDbError(''); // Başarılı okumada hatayı temizle
      if (docSnap.exists()) {
        const data = docSnap.data();
        setItems(data.items || []);
      } else {
        // Yeni kullanıcı için varsayılan veri oluştur
        const defaultItems = ['Ahmet', 'Mehmet', 'Ayşe'];
        setDoc(docRef, { 
          items: defaultItems,
          email: user.email,
          name: user.displayName || 'İsimsiz'
        }, { merge: true }).catch(err => {
          console.error("Varsayılan veri oluşturulamadı:", err);
          if (err.code === 'permission-denied') {
            setDbError("Veritabanı yazma izni reddedildi. Lütfen Firestore kurallarını kontrol edin.");
          }
        });
        setItems(defaultItems);
      }
    }, (error) => {
      console.error("Veri çekme hatası:", error);
      if (error.code === 'permission-denied') {
        setDbError("Verilerinize erişim izniniz yok. Firestore Kuralları (Rules) ayarlarını kontrol edin.");
      } else {
        setDbError("Veri bağlantısı hatası: " + error.message);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // --- VERİTABANI GÜNCELLEME ---
  const updateDb = async (newItems) => {
    // Önce yerel görünümü güncelle
    setItems(newItems);
    setDbError('');
    
    // Sonra veritabanına yaz
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), { items: newItems }, { merge: true });
      } catch (error) {
        console.error("Veri kaydedilemedi:", error);
        if (error.code === 'permission-denied') {
          setDbError("Kayıt başarısız! Veritabanı izni yok. Lütfen Firestore Kurallarını güncelleyin.");
        } else {
          setDbError("Kayıt hatası: " + error.message);
        }
      }
    }
  };

  // --- AUTH İŞLEMLERİ ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'register') {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: name });
        // İlk kayıt verisini oluşturmayı dene
        await setDoc(doc(db, "users", res.user.uid), { 
          items: ['Örnek 1', 'Örnek 2', 'Örnek 3'],
          email: email,
          name: name
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error("Auth Hatası:", err);
      let message = "Bir hata oluştu: " + (err.message || err.code);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') message = "E-posta veya şifre hatalı.";
      else if (err.code === 'auth/email-already-in-use') message = "Bu e-posta zaten kullanımda.";
      else if (err.code === 'auth/weak-password') message = "Şifre en az 6 karakter olmalı.";
      else if (err.code === 'permission-denied') message = "Kayıt oldunuz ancak veritabanı izni yok.";
      setAuthError(message);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setAuthMode('login');
    setEmail('');
    setPassword('');
    setName('');
    setItems([]);
    setDbError('');
  };

  // --- ÇARK FONKSİYONLARI ---
  const handleAddItem = () => {
    if (newItem.trim()) {
      const updated = [...items, newItem.trim()];
      updateDb(updated);
      setNewItem('');
    }
  };

  const handleDeleteItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    updateDb(updated);
  };

  const handleClearList = () => {
    updateDb([]);
    setWinner(null);
  };

  const spinWheel = () => {
    if (isSpinning || items.length === 0) return;
    setIsSpinning(true);
    setWinner(null);

    const minSpins = 5;
    const maxSpins = 10;
    const randomSpins = Math.floor(Math.random() * (maxSpins - minSpins + 1)) + minSpins;
    const randomDegree = Math.floor(Math.random() * 360);
    const newRotation = currentRotation.current + (randomSpins * 360) + randomDegree;
    
    setRotation(newRotation);
    currentRotation.current = newRotation;

    setTimeout(() => {
      calculateWinner(newRotation);
      setIsSpinning(false);
    }, 4000);
  };

  const calculateWinner = (finalRotation) => {
    const segmentAngle = 360 / items.length;
    const normalizedRotation = finalRotation % 360;
    const effectiveAngle = (360 - normalizedRotation) % 360;
    const winningIndex = Math.floor(effectiveAngle / segmentAngle);
    if (winningIndex >= 0 && winningIndex < items.length) {
      setWinner(items[winningIndex]);
    }
  };

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
          <div className="text-center mb-6">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <RotateCw className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Şans Çarkı'na Hoşgeldin</h1>
            <p className="text-gray-500 text-sm mt-2">Devam etmek için giriş yap veya kayıt ol.</p>
          </div>

          {authError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center border border-red-100 flex items-center gap-2">
              <AlertTriangle size={16} /> {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İsim Soyisim</label>
                <input 
                  type="text" required 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Adınız"
                  value={name} onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
              <input 
                type="email" required 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="ornek@mail.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
              <input 
                type="password" required minLength={6}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="******"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors flex justify-center items-center gap-2">
              {authMode === 'login' ? <LogIn size={20}/> : <User size={20}/>}
              {authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            {authMode === 'login' ? "Hesabın yok mu? " : "Zaten hesabın var mı? "}
            <button 
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
              }}
              className="text-purple-600 font-bold hover:underline"
            >
              {authMode === 'login' ? 'Hemen Kayıt Ol' : 'Giriş Yap'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans flex flex-col items-center py-8 px-4 overflow-hidden">
      
      {/* Hata Bildirimi */}
      {dbError && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg flex items-center gap-2">
          <AlertTriangle size={20} />
          <span>{dbError}</span>
          <button onClick={() => setDbError('')}><X size={16}/></button>
        </div>
      )}

      {/* Üst Bar */}
      <div className="absolute top-4 right-4 flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
            {user.displayName ? user.displayName[0].toUpperCase() : (user.email ? user.email[0].toUpperCase() : 'U')}
          </div>
          <span className="text-sm font-medium hidden sm:block">{user.displayName || user.email}</span>
        </div>
        <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors" title="Çıkış Yap">
          <LogOut size={20} />
        </button>
      </div>

      <header className="mb-8 text-center mt-8">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center gap-3">
          <RotateCw className="w-8 h-8 text-purple-600" />
          Şans Çarkı
        </h1>
        <p className="text-gray-500 mt-2">Listenizi oluşturun ve şansınızı deneyin!</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl items-start justify-center">
        
        {/* Sol Panel: Liste */}
        <div className="w-full lg:w-1/3 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col h-[600px]">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder="Birim ismi ekle..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
            <button onClick={handleAddItem} className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg transition-colors">
              <Plus size={24} />
            </button>
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-500">{items.length} Öğe</span>
            {items.length > 0 && (
              <button onClick={handleClearList} className="text-xs text-red-500 hover:text-red-700 hover:underline">
                Tümünü Temizle
              </button>
            )}
          </div>

          <ul className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {items.length === 0 && (
              <li className="text-center py-8 text-gray-400 text-sm">
                Listeniz boş.<br/>Yukarıdan eklemeye başlayın.
              </li>
            )}
            {items.map((item, idx) => (
              <li key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 group hover:border-purple-200 transition-all">
                <span className="truncate w-10/12 font-medium text-gray-700">
                  <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  {item}
                </span>
                <button onClick={() => handleDeleteItem(idx)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Sağ Panel: Çark */}
        <div className="w-full lg:w-2/3 flex flex-col items-center justify-center relative">
          <div className="relative w-[320px] h-[320px] sm:w-[450px] sm:h-[450px]">
            <div className="absolute top-1/2 -right-6 -mt-4 z-20 w-0 h-0 border-t-[16px] border-t-transparent border-b-[16px] border-b-transparent border-r-[30px] border-r-gray-800 transform rotate-180 drop-shadow-lg"></div>
            <div 
              className="w-full h-full rounded-full shadow-2xl border-4 border-white relative overflow-hidden transition-transform ease-[cubic-bezier(0.2,0.8,0.2,1)]"
              style={{ transform: `rotate(${rotation}deg)`, transitionDuration: isSpinning ? '4s' : '0s' }}
            >
              {items.length === 0 ? (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-lg text-center p-8">
                  Çarkı çevirmek için<br/>en az 2 isim ekle
                </div>
              ) : (
                <svg viewBox="-1 -1 2 2" className="w-full h-full transform rotate-0">
                  {items.map((item, idx) => {
                    const startAngle = idx * (1 / items.length);
                    const endAngle = (idx + 1) * (1 / items.length);
                    const [startX, startY] = getCoordinatesForPercent(startAngle);
                    const [endX, endY] = getCoordinatesForPercent(endAngle);
                    const largeArcFlag = 1 / items.length > 0.5 ? 1 : 0;
                    const pathData = items.length === 1 
                      ? `M 0 0 L 1 0 A 1 1 0 1 1 1 -0.0001 Z`
                      : `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
                    const midAngle = startAngle + (1 / items.length) / 2;
                    const rotateAngle = midAngle * 360;
                    return (
                      <g key={idx}>
                        <path d={pathData} fill={COLORS[idx % COLORS.length]} stroke="white" strokeWidth="0.01" />
                        <g transform={`rotate(${rotateAngle})`}>
                          <text x="0.6" y="0.02" fill="white" textAnchor="middle" alignmentBaseline="middle" fontSize="0.08" fontWeight="bold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                            {item.length > 12 ? item.substring(0, 10) + '..' : item}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full shadow-lg z-10 flex items-center justify-center border-4 border-gray-100">
               <Sparkles className="text-yellow-500 w-8 h-8" />
            </div>
          </div>
          <div className="mt-10">
            <button
              onClick={spinWheel}
              disabled={isSpinning || items.length < 1}
              className={`px-10 py-4 rounded-full text-xl font-bold shadow-lg transform transition-all flex items-center gap-2 ${isSpinning || items.length < 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 hover:shadow-purple-500/50 active:scale-95'}`}
            >
               {isSpinning ? 'Dönüyor...' : 'ÇARKI ÇEVİR'}
            </button>
          </div>
        </div>
      </div>

      {winner && !isSpinning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center relative animate-bounce-in">
             <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-yellow-400 p-4 rounded-full shadow-lg border-4 border-white">
                <span className="text-4xl">👑</span>
             </div>
             <button onClick={() => setWinner(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
             <h2 className="mt-8 text-2xl font-bold text-gray-800">Kazanan!</h2>
             <div className="my-6 py-4 px-6 bg-purple-50 rounded-xl border border-purple-100">
                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 break-words">{winner}</p>
             </div>
             <button onClick={() => setWinner(null)} className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors">Tamam</button>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bounceIn { 0% { transform: scale(0.8); opacity: 0; } 60% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-bounce-in { animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
    </div>
  );
}
