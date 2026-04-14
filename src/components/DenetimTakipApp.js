import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Plus, Trash2, Search, CheckCircle2, MapPin, 
  History, ArrowLeft, AlertCircle, List, Settings, Edit, 
  Zap, FileText, X, ChevronRight, Shuffle, Check
} from 'lucide-react';

import { db, auth } from '../firebase';
import { 
  collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, 
  query, where, getDoc, setDoc, serverTimestamp, orderBy 
} from 'firebase/firestore';

export default function DenetimTakipApp({ onBack }) {
  const [units, setUnits] = useState([]);
  const [audits, setAudits] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Planlama ve Not Durumları
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitNotes, setUnitNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [plannedVisits, setPlannedVisits] = useState([]);

  // Çark Durumları
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState(null);
  const [flashingName, setFlashingName] = useState('');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Birimler Aboneliği
    const unsubUnits = onSnapshot(query(collection(db, 'bireysel_birimler'), where("userId", "==", uid)), (snapshot) => {
      setUnits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Denetim Geçmişi Aboneliği
    const unsubAudits = onSnapshot(query(collection(db, 'bireysel_denetimler'), where("userId", "==", uid)), (snapshot) => {
      setAudits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Planlanan Denetimler Aboneliği
    const unsubPlans = onSnapshot(query(collection(db, 'denetim_planlari'), where("userId", "==", uid)), (snapshot) => {
      setPlannedVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubUnits(); unsubAudits(); unsubPlans(); };
  }, []);

  // Notları Dinle (Birim Seçilince)
  useEffect(() => {
    if (selectedUnit) {
      const q = query(collection(db, 'birim_notlari'), where("unitId", "==", selectedUnit.id), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot) => {
        setUnitNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }
  }, [selectedUnit]);

  // Ana Sayfa İstatistikleri (Senin orijinal mantığın)
  const unitStats = useMemo(() => {
    return units
      .map(unit => {
        const unitAudits = audits.filter(a => a.unitId === unit.id);
        const lastAudit = unitAudits.length > 0 
          ? unitAudits.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date 
          : null;
        const days = lastAudit ? Math.floor((new Date() - new Date(lastAudit)) / (1000 * 60 * 60 * 24)) : Infinity;
        return { ...unit, lastAudit, totalVisits: unitAudits.length, days };
      })
      .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [units, audits, searchTerm]);

  // --- FONKSİYONLAR ---

  const handleAddToPlan = async (unit) => {
    const uid = auth.currentUser?.uid;
    await addDoc(collection(db, 'denetim_planlari'), {
      unitId: unit.id,
      unitName: unit.name,
      date: planDate,
      userId: uid,
      completed: false
    });
  };

  const handleCompletePlan = async (plan) => {
    const uid = auth.currentUser?.uid;
    // Denetim kaydı oluştur
    await addDoc(collection(db, 'bireysel_denetimler'), {
      unitId: plan.unitId,
      date: plan.date || new Date().toISOString().split('T')[0],
      userId: uid
    });
    // Plandan kaldır
    if(plan.id) await deleteDoc(doc(db, 'denetim_planlari', plan.id));
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addDoc(collection(db, 'birim_notlari'), {
      unitId: selectedUnit.id,
      text: newNote,
      createdAt: serverTimestamp()
    });
    setNewNote('');
  };

  const handleSpinWheel = () => {
    if (units.length === 0) return;
    setIsSpinning(true);
    setWheelResult(null);
    let count = 0;
    const interval = setInterval(() => {
      setFlashingName(units[Math.floor(Math.random() * units.length)].name);
      count++;
      if (count > 20) {
        clearInterval(interval);
        const winner = units[Math.floor(Math.random() * units.length)];
        setWheelResult(winner);
        setIsSpinning(false);
      }
    }, 100);
  };

  const getStatusColor = (days) => {
    if (days === Infinity) return 'bg-gray-100 text-gray-500';
    if (days <= 15) return 'bg-green-100 text-green-700';
    if (days >= 45) return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* HEADER */}
      <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-40">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-gray-800 transition"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <CheckCircle2 className="text-blue-600" /> Denetim Takip
        </h1>
        <div className="w-8"></div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* ÜST PANEL: TARİH BAZLI PLANLAR */}
        {plannedVisits.length > 0 && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
            <h2 className="text-xs font-bold text-blue-600 mb-3 flex items-center gap-2 uppercase tracking-wider">
              <Calendar size={14}/> Planlanan Ziyaretler
            </h2>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {plannedVisits.sort((a,b) => new Date(a.date) - new Date(b.date)).map(plan => (
                <div key={plan.id} className="flex items-center justify-between bg-blue-50/50 p-3 rounded-lg border border-blue-50">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-800 leading-none">{plan.unitName}</p>
                    <p className="text-[10px] text-blue-600 font-bold mt-1">{plan.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleCompletePlan(plan)} className="p-2 bg-green-500 text-white rounded-lg shadow-sm"><Check size={14} strokeWidth={3}/></button>
                    <button onClick={() => deleteDoc(doc(db, 'denetim_planlari', plan.id))} className="p-2 bg-white text-red-500 rounded-lg border border-red-100"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ARAMA ÇUBUĞU */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" placeholder="Birim veya bölge ara..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* ANA LİSTE (Senin Orijinal Kart Tasarımın) */}
        <div className="grid gap-3">
          {unitStats.map(unit => (
            <div key={unit.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="flex justify-between items-start mb-3" onClick={() => { setSelectedUnit(unit); setActiveTab('detail'); }}>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{unit.city} / {unit.district}</p>
                  <h3 className="font-bold text-gray-800 text-base leading-tight mt-0.5">{unit.name}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <p className="text-[11px] text-gray-500 flex items-center gap-1 font-medium">
                      <History size={12} className="text-gray-400" /> Son: {unit.lastAudit || 'Hiç'}
                    </p>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1 font-medium">
                      <FileText size={12} className="text-gray-400" /> Toplam: {unit.totalVisits}
                    </p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getStatusColor(unit.days)}`}>
                  {unit.days === Infinity ? 'YENİ' : `${unit.days} GÜN`}
                </div>
              </div>

              {/* ALT AKSİYONLAR */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50">
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1">
                    <input 
                      type="date" 
                      className="text-[10px] p-1 border rounded bg-gray-50 flex-1 outline-none focus:ring-1 focus:ring-blue-500"
                      onChange={(e) => setPlanDate(e.target.value)}
                      value={planDate}
                    />
                    <button 
                      onClick={() => handleAddToPlan(unit)}
                      className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"
                      title="Plana Ekle"
                    >
                      <Plus size={14}/>
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold text-center uppercase">Planlama Tarihi</p>
                </div>
                <button 
                  onClick={() => handleCompletePlan({ unitId: unit.id, unitName: unit.name, date: new Date().toISOString().split('T')[0] })}
                  className="bg-blue-600 text-white font-bold text-[11px] rounded-lg flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                >
                  <Zap size={12} fill="white"/> Bugün Gidildi
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NOTLAR VE DETAY MODALI (Sınırsız Not Sistemi) */}
      {selectedUnit && activeTab === 'detail' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-[2rem] p-6 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-bold text-lg text-gray-800 leading-none">{selectedUnit.name}</h2>
                <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider">{selectedUnit.city} / {selectedUnit.district}</p>
              </div>
              <button onClick={() => { setSelectedUnit(null); setActiveTab('dashboard'); }} className="p-2 bg-gray-100 rounded-full text-gray-500"><X size={20}/></button>
            </div>
            
            {/* Not Ekleme Formu */}
            <div className="flex gap-2 mb-6">
              <input 
                className="flex-1 bg-gray-50 p-3.5 rounded-xl text-sm outline-none border border-gray-100 focus:ring-2 focus:ring-blue-500 focus:bg-white transition" 
                placeholder="Yeni not ekle..."
                value={newNote} onChange={(e) => setNewNote(e.target.value)}
              />
              <button onClick={handleAddNote} className="bg-blue-600 text-white p-3.5 rounded-xl shadow-lg shadow-blue-200 active:scale-90 transition"><Plus strokeWidth={3}/></button>
            </div>

            {/* Not Listesi */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-4">
              {unitNotes.map(note => (
                <div key={note.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-700 font-medium leading-relaxed">{note.text}</p>
                  <div className="flex items-center gap-1 mt-3 opacity-40">
                    <Calendar size={10}/>
                    <p className="text-[9px] font-black uppercase">
                      {note.createdAt?.toDate().toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
              ))}
              {unitNotes.length === 0 && (
                <div className="text-center py-10 opacity-30 italic text-sm">Bu şube için henüz bir not eklenmemiş.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ALT NAVİGASYON (Sadece Çark ve Geri Butonu) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex justify-around items-center h-18 z-40">
        <button 
          onClick={() => setActiveTab('wheel')} 
          className={`p-3 rounded-xl transition-all ${activeTab === 'wheel' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}
        >
          <Shuffle size={24}/>
        </button>
        <button onClick={onBack} className="p-3 text-gray-400"><ArrowLeft size={24}/></button>
      </div>

      {/* ÇARK EKRANI */}
      {activeTab === 'wheel' && (
        <div className="fixed inset-0 bg-white z-[60] p-6 flex flex-col items-center justify-center animate-in zoom-in duration-300">
          <button onClick={() => setActiveTab('dashboard')} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full"><X/></button>
          
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <Shuffle size={40} />
          </div>
          <h2 className="text-xl font-bold mb-8">Şube Çarkı</h2>
          
          <div className="w-full bg-gray-900 text-white p-10 rounded-3xl text-center font-bold text-2xl shadow-2xl mb-10 min-h-[140px] flex items-center justify-center border-4 border-gray-800">
            {isSpinning ? flashingName : (wheelResult?.name || "???")}
          </div>

          <button 
            onClick={handleSpinWheel}
            disabled={isSpinning}
            className="w-full max-w-xs bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition disabled:opacity-50"
          >
            {isSpinning ? 'Dönüyor...' : 'ÇEVİR'}
          </button>

          {wheelResult && !isSpinning && (
            <button 
              onClick={() => { handleAddToPlan(wheelResult); setActiveTab('dashboard'); }}
              className="mt-6 text-blue-600 font-bold underline"
            >
              Bu Şubeyi Plana Ekle
            </button>
          )}
        </div>
      )}

    </div>
  );
}
