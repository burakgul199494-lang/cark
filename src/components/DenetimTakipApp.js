import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Plus, Trash2, Search, CheckCircle2, MapPin, 
  History, ArrowLeft, AlertCircle, List, Settings, Edit, 
  Zap, FileText, X, ChevronRight, Shuffle, Check, CalendarDays,
  Clock, Info
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
  
  // --- DURUMLAR (STATES) ---
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitNotes, setUnitNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [plannedVisits, setPlannedVisits] = useState([]);

  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState(null);
  const [flashingName, setFlashingName] = useState('');

  const [editingUnitId, setEditingUnitId] = useState(null);
  const [editUnitData, setEditUnitData] = useState({ city: '', district: '', name: '' });

  // --- VERİ TABANI BAĞLANTILARI ---
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setErrorMsg("Oturum bulunamadı.");
      return;
    }

    // Birimler (Şubeler)
    const unsubUnits = onSnapshot(query(collection(db, 'bireysel_birimler'), where("userId", "==", uid)), (snapshot) => {
      setUnits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Denetim Geçmişi
    const unsubAudits = onSnapshot(query(collection(db, 'bireysel_denetimler'), where("userId", "==", uid)), (snapshot) => {
      setAudits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Tarih Bazlı Planlar
    const unsubPlans = onSnapshot(query(collection(db, 'denetim_planlari'), where("userId", "==", uid)), (snapshot) => {
      setPlannedVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubUnits(); unsubAudits(); unsubPlans(); };
  }, []);

  // Seçili Birime Göre Not Arşivini Getir
  useEffect(() => {
    if (selectedUnit) {
      const q = query(
        collection(db, 'birim_notlari'), 
        where("unitId", "==", selectedUnit.id), 
        orderBy("createdAt", "desc")
      );
      return onSnapshot(q, (snapshot) => {
        setUnitNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }
  }, [selectedUnit]);

  // --- HESAPLAMALAR VE İSTATİSTİKLER ---
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
      .filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.district.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (a.days === Infinity) return -1;
        if (b.days === Infinity) return 1;
        return b.days - a.days; // En acil olanlar en üstte
      });
  }, [units, audits, searchTerm]);

  // --- FONKSİYONLAR ---

  const handleAddToPlan = async (unit) => {
    const uid = auth.currentUser?.uid;
    try {
      await addDoc(collection(db, 'denetim_planlari'), {
        unitId: unit.id,
        unitName: unit.name,
        city: unit.city,
        district: unit.district,
        date: planDate,
        userId: uid,
        createdAt: serverTimestamp()
      });
      alert(`Plan eklendi: ${unit.name} (${planDate})`);
    } catch (e) {
      setErrorMsg("Plan eklenirken hata oluştu.");
    }
  };

  const handleCompleteVisit = async (plan) => {
    const uid = auth.currentUser?.uid;
    try {
      // 1. Denetim kaydı olarak işle
      await addDoc(collection(db, 'bireysel_denetimler'), {
        unitId: plan.unitId,
        date: plan.date || new Date().toISOString().split('T')[0],
        userId: uid
      });
      // 2. Plandan kaldır
      if (plan.id) {
        await deleteDoc(doc(db, 'denetim_planlari', plan.id));
      }
    } catch (e) {
      setErrorMsg("Ziyaret işlenirken hata oluştu.");
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await addDoc(collection(db, 'birim_notlari'), {
        unitId: selectedUnit.id,
        text: newNote,
        createdAt: serverTimestamp(),
        userId: auth.currentUser?.uid
      });
      setNewNote('');
    } catch (e) {
      setErrorMsg("Not kaydedilemedi.");
    }
  };

  const handleSpinWheel = () => {
    if (units.length === 0) return;
    setIsSpinning(true);
    setWheelResult(null);
    let count = 0;
    const interval = setInterval(() => {
      setFlashingName(units[Math.floor(Math.random() * units.length)].name);
      count++;
      if (count > 25) {
        clearInterval(interval);
        const winner = units[Math.floor(Math.random() * units.length)];
        setWheelResult(winner);
        setIsSpinning(false);
      }
    }, 80);
  };

  const getStatusColor = (days) => {
    if (days === Infinity) return 'bg-gray-100 text-gray-500 border-gray-200';
    if (days <= 15) return 'bg-green-50 text-green-700 border-green-200';
    if (days >= 16 && days <= 44) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      
      {/* HEADER - Orijinal Tasarım */}
      <div className="bg-white px-4 pt-6 pb-4 shadow-sm flex items-center justify-between sticky top-0 z-40">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <CheckCircle2 className="text-blue-600" size={22} /> Denetim Takip
        </h1>
        <div className="w-8"></div>
      </div>

      <div className="p-4 space-y-5">

        {/* --- TARİH BAZLI PLAN GÖZLEMİ --- */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-blue-600 flex items-center gap-2 uppercase tracking-wider">
              <CalendarDays size={14}/> Denetim Planı
            </h2>
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
              {plannedVisits.length} Bekleyen
            </span>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {plannedVisits.sort((a,b) => new Date(a.date) - new Date(b.date)).map(plan => (
              <div key={plan.id} className="flex items-center justify-between bg-blue-50/30 p-3 rounded-xl border border-blue-50 transition-all active:scale-95">
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-800 leading-none">{plan.unitName}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Clock size={10} className="text-blue-400"/>
                    <p className="text-[10px] text-blue-600 font-bold">{plan.date}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleCompleteVisit(plan)} 
                    className="p-2 bg-green-500 text-white rounded-lg shadow-md"
                    title="Gidildi Olarak İşaretle"
                  >
                    <Check size={16} strokeWidth={3}/>
                  </button>
                  <button 
                    onClick={() => deleteDoc(doc(db, 'denetim_planlari', plan.id))} 
                    className="p-2 bg-white text-red-500 rounded-lg border border-red-100"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
            ))}
            {plannedVisits.length === 0 && (
              <p className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-xl">Henüz bir denetim planlanmadı.</p>
            )}
          </div>
        </div>

        {/* --- ARAMA ÇUBUĞU --- */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" placeholder="Birim adı veya ilçe ara..." 
            className="w-full pl-10 pr-4 py-3.5 rounded-2xl border-none bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* --- ANA LİSTE: BİRİM KARTLARI --- */}
        <div className="grid gap-4">
          {unitStats.map(unit => (
            <div key={unit.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4 animate-in fade-in duration-300">
              
              {/* Kart Üst Kısım */}
              <div 
                className="flex justify-between items-start cursor-pointer" 
                onClick={() => { setSelectedUnit(unit); setActiveTab('detail'); }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin size={12} className="text-gray-400"/>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{unit.city} / {unit.district}</p>
                  </div>
                  <h3 className="font-bold text-gray-800 text-base leading-tight">{unit.name}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-[11px] text-gray-500 flex items-center gap-1 font-semibold">
                      <History size={12} className="text-gray-400" /> Son: {unit.lastAudit || 'Kayıt Yok'}
                    </p>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1 font-semibold">
                      <Info size={12} className="text-gray-400" /> Toplam: {unit.totalVisits}
                    </p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${getStatusColor(unit.days)} shadow-sm shrink-0`}>
                  {unit.days === Infinity ? 'HİÇ' : `${unit.days} GÜN`}
                </div>
              </div>

              {/* Kart Alt Aksiyonlar */}
              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-50">
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-1">
                    <input 
                      type="date" 
                      className="text-[10px] p-2 border border-gray-200 rounded-lg bg-gray-50 flex-1 outline-none focus:ring-1 focus:ring-blue-500"
                      onChange={(e) => setPlanDate(e.target.value)}
                      value={planDate}
                    />
                    <button 
                      onClick={() => handleAddToPlan(unit)}
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition active:scale-90"
                    >
                      <Plus size={16} strokeWidth={3}/>
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => handleCompleteVisit({ unitId: unit.id, unitName: unit.name, date: new Date().toISOString().split('T')[0] })}
                  className="bg-blue-600 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition"
                >
                  <Zap size={14} fill="white" className="text-white"/> Bugün Gidildi
                </button>
              </div>
            </div>
          ))}
          {unitStats.length === 0 && (
            <div className="text-center py-10 text-gray-400 italic">Aranan kriterde birim bulunamadı.</div>
          )}
        </div>
      </div>

      {/* --- NOTLAR DETAY MODALI --- */}
      {selectedUnit && activeTab === 'detail' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-[2.5rem] p-6 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-20 duration-300">
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-bold text-xl text-gray-800">{selectedUnit.name}</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{selectedUnit.city} / {selectedUnit.district}</p>
              </div>
              <button 
                onClick={() => { setSelectedUnit(null); setActiveTab('dashboard'); }} 
                className="p-2 bg-gray-100 rounded-full text-gray-500"
              >
                <X size={24}/>
              </button>
            </div>
            
            <div className="flex gap-2 mb-6">
              <input 
                className="flex-1 bg-gray-50 p-4 rounded-2xl text-sm font-medium outline-none border border-gray-100 focus:ring-2 focus:ring-blue-500 focus:bg-white transition" 
                placeholder="Bu ziyaret için not bırakın..."
                value={newNote} onChange={(e) => setNewNote(e.target.value)}
              />
              <button 
                onClick={handleAddNote} 
                className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl shadow-blue-200 active:scale-90 transition"
              >
                <Plus size={24} strokeWidth={3}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pb-10 scrollbar-hide">
              {unitNotes.map(note => (
                <div key={note.id} className="bg-gray-50 p-4 rounded-[1.5rem] border border-gray-100 relative group">
                  <p className="text-sm text-gray-700 font-semibold leading-relaxed">{note.text}</p>
                  <div className="flex items-center gap-2 mt-3 opacity-40">
                    <Calendar size={10}/>
                    <p className="text-[9px] font-black uppercase tracking-widest">
                      {note.createdAt?.toDate().toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
              ))}
              {unitNotes.length === 0 && (
                <div className="text-center py-16 opacity-30 italic flex flex-col items-center gap-3">
                   <FileText size={40}/>
                   <p className="text-sm font-bold">HENÜZ NOT EKLENMEDİ</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ALT NAVİGASYON --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 p-3 flex justify-around items-center h-20 z-40">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`p-3.5 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-gray-400'}`}
        >
          <List size={26} strokeWidth={activeTab === 'dashboard' ? 3 : 2}/>
        </button>
        <button 
          onClick={() => setActiveTab('wheel')} 
          className={`p-3.5 rounded-2xl transition-all ${activeTab === 'wheel' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'text-gray-400'}`}
        >
          <Shuffle size={26} strokeWidth={activeTab === 'wheel' ? 3 : 2}/>
        </button>
        <button onClick={onBack} className="p-3.5 text-gray-400 hover:text-red-500 transition-colors">
          <ArrowLeft size={26}/>
        </button>
      </div>

      {/* --- ÇARK (HEDEF RADARI) EKRANI --- */}
      {activeTab === 'wheel' && (
        <div className="fixed inset-0 bg-white z-[60] p-6 flex flex-col items-center justify-center animate-in zoom-in duration-300">
          <button onClick={() => setActiveTab('dashboard')} className="absolute top-8 right-8 p-3 bg-gray-100 rounded-full text-gray-500"><X/></button>
          
          <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-indigo-100 rotate-12">
            <Shuffle size={48} />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Hedef Radarı</h2>
          <p className="text-sm text-gray-400 font-medium mb-10 text-center px-10">Bugün nereye gideceğinizi çark belirlesin!</p>
          
          <div className="w-full bg-gray-900 text-white p-12 rounded-[2.5rem] text-center font-black text-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] mb-12 min-h-[160px] flex items-center justify-center border-[8px] border-gray-800 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent pointer-events-none"></div>
            {isSpinning ? (
              <span className="animate-pulse text-indigo-400 text-sm uppercase tracking-[0.3em]">Birimler Taranıyor...</span>
            ) : (
              <span className="animate-in zoom-in">{wheelResult?.name || "???"}</span>
            )}
          </div>

          <button 
            onClick={handleSpinWheel}
            disabled={isSpinning}
            className="w-full max-w-xs bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-2xl shadow-indigo-200 active:scale-95 transition disabled:opacity-50"
          >
            {isSpinning ? 'RADAR DÖNÜYOR...' : 'ÇARKI ÇEVİR'}
          </button>

          {wheelResult && !isSpinning && (
            <button 
              onClick={() => { handleAddToPlan(wheelResult); setActiveTab('dashboard'); }}
              className="mt-8 text-indigo-600 font-black text-sm underline tracking-wide uppercase"
            >
              BU BİRİMİ PLANA EKLE
            </button>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
