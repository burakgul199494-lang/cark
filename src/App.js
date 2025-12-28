import React, { useState, useEffect } from 'react';
import { Gamepad2, RotateCw, Grid, Calculator, LogOut, AlertTriangle, X } from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

// Yeni oluşturduğumuz dosyaları import ediyoruz
import { auth, db } from './firebase';
import WheelGame from './components/WheelGame';
import ScrabbleGame from './components/ScrabbleGame';
import OkeyGame from './components/OkeyGame';

export default function GameCenterApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('menu'); 
  
  // Auth State
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Tüm Veriler
  const [userData, setUserData] = useState({
    wheelItems: [],
    wheelSettings: { autoRemove: false },
    scrabble: { active: false, players: [] },
    okey: { active: false, players: [] }
  });

  // --- AUTH & DATA LISTENER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData({ ...userData, ...docSnap.data() });
      } else {
        // Yeni kullanıcı için başlangıç verisi
        setDoc(docRef, { 
          wheelItems: ['Ahmet', 'Mehmet'], 
          email: user.email 
        }, { merge: true });
      }
    });
    return () => unsub();
  }, [user]);

  // --- GENEL GÜNCELLEME FONKSİYONU ---
  // Bu fonksiyonu çocuk bileşenlere prop olarak göndereceğiz
  const updateDb = async (field, data) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { [field]: data }, { merge: true });
    } catch (err) {
      setError("Kaydetme hatası: " + err.message);
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

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-indigo-600 rounded-full border-t-transparent"></div></div>;

  // --- GİRİŞ EKRANI ---
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
           <h1 className="text-2xl font-bold text-center mb-6 text-indigo-800">Oyun Merkezi</h1>
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

  // --- ANA EKRAN ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      {/* Navbar */}
      <div className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('menu')}>
          <Gamepad2 className="text-indigo-600" />
          <span className="font-bold text-lg hidden sm:block">Oyun Merkezi</span>
        </div>
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
        {/* MENÜ SAYFASI */}
        {activeTab === 'menu' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MenuCard 
               title="Şans Çarkı" 
               desc="İsim çekilişi yap." 
               icon={<RotateCw size={40} className="text-purple-600"/>} 
               color="border-purple-500" 
               bg="bg-purple-100"
               onClick={()=>setActiveTab('wheel')}
            />
            <MenuCard 
               title="Scrabble" 
               desc="Puan hesaplama." 
               icon={<Grid size={40} className="text-green-600"/>} 
               color="border-green-500" 
               bg="bg-green-100"
               onClick={()=>setActiveTab('scrabble')}
            />
            <MenuCard 
               title="101 Okey" 
               desc="Ceza takibi." 
               icon={<Calculator size={40} className="text-blue-600"/>} 
               color="border-blue-500" 
               bg="bg-blue-100"
               onClick={()=>setActiveTab('okey')}
            />
          </div>
        )}

        {/* MODÜLLER - Prop olarak veri ve güncelleme fonksiyonu gönderiyoruz */}
        {activeTab === 'wheel' && (
          <WheelGame 
            data={userData.wheelItems} 
            settings={userData.wheelSettings} 
            onUpdate={updateDb} 
            onBack={()=>setActiveTab('menu')}
          />
        )}

        {activeTab === 'scrabble' && (
          <ScrabbleGame 
            data={userData.scrabble} 
            onUpdate={updateDb} 
            onBack={()=>setActiveTab('menu')}
          />
        )}

        {activeTab === 'okey' && (
          <OkeyGame 
            data={userData.okey} 
            onUpdate={updateDb} 
            onBack={()=>setActiveTab('menu')}
          />
        )}
      </div>

      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-bounce-in { animation: bounceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

// Basit Kart Bileşeni
function MenuCard({ title, desc, icon, color, bg, onClick }) {
  return (
    <div onClick={onClick} className={`bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer border-t-4 ${color} flex flex-col items-center gap-4 group`}>
      <div className={`${bg} p-4 rounded-full group-hover:scale-110 transition-transform`}>{icon}</div>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-gray-500 text-center">{desc}</p>
    </div>
  );
}
