import React, { useState, useEffect } from 'react';
import { Gamepad2, LogOut, AlertTriangle, X } from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';

// --- DOSYA BAĞLANTILARI ---
import { auth, db } from './firebase';

import AnaSayfa from './AnaSayfa'; 
import WheelGame from './components/WheelGame';
import ScrabbleGame from './components/ScrabbleGame';
import ShipmentApp from './components/ShipmentApp';
import SktControlApp from './components/SktControlApp'; // <-- YENİ MODÜL

export default function App() {
  return (
    <Router>
      <GameContent />
    </Router>
  );
}

function GameContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Auth State
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Veriler (SKT kontrolü genelde anlık olduğu için veritabanına kaydetmedim, local çalışır)
  const [userData, setUserData] = useState({
    wheelItems: [],
    wheelSettings: { autoRemove: false },
    scrabble: { active: false, players: [] }
  });

  // --- AUTH DİNLEYİCİ ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- VERİ DİNLEYİCİ ---
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData({ ...userData, ...docSnap.data() });
      } else {
        setDoc(docRef, { wheelItems: [], email: user.email }, { merge: true });
      }
    });
    return () => unsub();
  }, [user]);

  const updateDb = async (field, data) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { [field]: data }, { merge: true });
    } catch (err) {
      setError("Hata: " + err.message);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'register') {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 rounded-full border-t-transparent"></div></div>;

  // --- GİRİŞ EKRANI ---
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
           <h1 className="text-2xl font-bold text-center mb-6 text-indigo-800">İş Yönetim Paneli</h1>
           {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
           <form onSubmit={handleAuth} className="space-y-4">
             {authMode === 'register' && <input type="text" placeholder="Adınız" className="w-full p-3 border rounded-lg" onChange={e=>setName(e.target.value)} />}
             <input type="email" placeholder="Email" className="w-full p-3 border rounded-lg" onChange={e=>setEmail(e.target.value)} />
             <input type="password" placeholder="Şifre" className="w-full p-3 border rounded-lg" onChange={e=>setPassword(e.target.value)} />
             <button className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold">{authMode === 'login' ? 'Giriş' : 'Kayıt'}</button>
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
        <Link to="/" className="flex items-center gap-2 cursor-pointer no-underline text-gray-800">
          <Gamepad2 className="text-indigo-600" />
          <span className="font-bold text-lg hidden sm:block">Yönetim Paneli</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">{user.displayName}</span>
          <LogOut size={20} className="text-gray-400 cursor-pointer hover:text-red-500" onClick={()=>signOut(auth)}/>
        </div>
      </div>

      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-100 text-red-700 px-4 py-2 rounded z-50 flex items-center gap-2">
          <AlertTriangle size={16}/> {error} <X size={16} className="cursor-pointer" onClick={()=>setError('')}/>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4 mt-6">
        <Routes>
          <Route path="/" element={<AnaSayfa />} />
          <Route path="/wheel" element={<WheelGame data={userData.wheelItems} settings={userData.wheelSettings} onUpdate={updateDb} onBack={() => navigate('/')} />} />
          <Route path="/scrabble" element={<ScrabbleGame data={userData.scrabble} onUpdate={updateDb} onBack={() => navigate('/')} />} />
          <Route path="/sevkiyat" element={<ShipmentApp onBack={() => navigate('/')} />} />
          {/* YENİ SKT ROTASI */}
          <Route path="/skt-kontrol" element={<SktControlApp onBack={() => navigate('/')} />} />
        </Routes>
      </div>
    </div>
  );
}
