import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Plus, Trash2, Search, CheckCircle2, MapPin, 
  History, ArrowLeft, AlertCircle, List, Settings, 
  Zap, FileText, X, ChevronRight, Shuffle, ClipboardList, Check,
  CalendarDays, ChevronLeft, CalendarPlus
} from 'lucide-react';

import { db, auth } from '../firebase';
import { 
  collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, 
  query, where, getDoc, setDoc, serverTimestamp, orderBy 
} from 'firebase/firestore';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Pazartesi' },
  { id: 2, name: 'Salı' },
  { id: 3, name: 'Çarşamba' },
  { id: 4, name: 'Perşembe' },
  { id: 5, name: 'Cuma' },
  { id: 6, name: 'Cumartesi' },
  { id: 0, name: 'Pazar' }
];

export default function DenetimTakipApp({ onBack }) {
  const [units, setUnits] = useState([]);
  const [audits, setAudits] = useState([]);
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [unitNotes, setUnitNotes] = useState([]);

  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, planner, wheel, unitDetail, units
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Seçili Birim ve Gün İşlemleri
  const [selectedUnitForDetail, setSelectedUnitForDetail] = useState(null);
  const [selectedDayForPlan, setSelectedDayForPlan] = useState(new Date().getDay());
  const [newNoteText, setNewNoteText] = useState('');

  // Çark Durumları
  const [isSpinning, setIsSpinning] = useState(false);
  const [flashingUnitName, setFlashingUnitName] = useState('');
  const [wheelResult, setWheelResult] = useState(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Veri Abonelikleri
    const unsubUnits = onSnapshot(query(collection(db, 'bireysel_birimler'), where("userId", "==", uid)), (snapshot) => {
      setUnits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubAudits = onSnapshot(query(collection(db, 'bireysel_denetimler'), where("userId", "==", uid)), (snapshot) => {
      setAudits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubWeekly = onSnapshot(query(collection(db, 'haftalik_planlar'), where("userId", "==", uid)), (snapshot) => {
      setWeeklyPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubUnits(); unsubAudits(); unsubWeekly(); };
  }, []);

  // Notları Getir
  useEffect(() => {
    if (selectedUnitForDetail) {
      const q = query(collection(db, 'birim_notlari'), where("unitId", "==", selectedUnitForDetail.id), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot) => {
        setUnitNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }
  }, [selectedUnitForDetail]);

  // İstatistik Hesaplama
  const unitStats = useMemo(() => {
    return units
      .map(unit => {
        const unitAudits = audits.filter(a => a.unitId === unit.id);
        const lastAudit = unitAudits.length > 0 ? unitAudits.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date : null;
        const days = lastAudit ? Math.floor((new Date() - new Date(lastAudit)) / (1000 * 60 * 60 * 24)) : Infinity;
        return { ...unit, lastAudit, totalVisits: unitAudits.length, days };
      })
      .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.days === Infinity ? -1 : b.days - a.days); // En uzun süredir gidilmeyenler üstte
  }, [units, audits, searchTerm]);

  const todayPlan = useMemo(() => {
    const todayId = new Date().getDay();
    return weeklyPlans.filter(p => p.dayId === todayId);
  }, [weeklyPlans]);

  // --- FONKSİYONLAR ---

  const handleAddToWeeklyPlan = async (unit, dayId) => {
    const uid = auth.currentUser?.uid;
    const alreadyPlanned = weeklyPlans.find(p => p.unitId === unit.id && p.dayId === dayId);
    if (alreadyPlanned) return alert("Bu birim zaten o güne eklenmiş.");

    await addDoc(collection(db, 'haftalik_planlar'), {
      unitId: unit.id,
      unitName: unit.name,
      city: unit.city,
      district: unit.district,
      dayId: dayId,
      userId: uid,
      isCompleted: false
    });
  };

  const removeFromPlan = async (planId) => {
    await deleteDoc(doc(db, 'haftalik_planlar', planId));
  };

  const completeAudit = async (unitId, planId = null) => {
    const uid = auth.currentUser?.uid;
    const today = new Date().toISOString().split('T')[0];
    
    await addDoc(collection(db, 'bireysel_denetimler'), {
      unitId, date: today, userId: uid
    });

    if (planId) {
      await updateDoc(doc(db, 'haftalik_planlar', planId), { isCompleted: true });
      setTimeout(() => removeFromPlan(planId), 2000); // 2 sn sonra plandan temizle
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    await addDoc(collection(db, 'birim_notlari'), {
      unitId: selectedUnitForDetail.id,
      text: newNoteText,
      createdAt: serverTimestamp()
    });
    setNewNoteText('');
  };

  const getStatusColor = (days) => {
    if (days === Infinity) return 'bg-gray-100 text-gray-500';
    if (days >= 45) return 'bg-red-100 text-red-700';
    if (days >= 15) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
      
      {/* ÜST BAŞLIK */}
      <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-50">
        <h1 className="font-extrabold text-xl tracking-tight flex items-center gap-2">
          <CheckCircle2 className="text-blue-600" /> 
          {activeTab === 'planner' ? 'Haftalık Plan' : 'Denetim Takip'}
        </h1>
        {activeTab !== 'dashboard' && (
          <button onClick={() => setActiveTab('dashboard')} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
        )}
      </div>

      <div className="p-4 space-y-6">

        {/* --- ANA SAYFA (DASHBOARD) --- */}
        {activeTab === 'dashboard' && (
          <>
            {/* BUGÜNÜN ÖZET PLANI */}
            {todayPlan.length > 0 && (
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 rounded-[2rem] shadow-xl text-white">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold flex items-center gap-2 text-lg"><ClipboardList size={22}/> Bugünün Planı</h2>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                    {todayPlan.filter(p => p.isCompleted).length} / {todayPlan.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {todayPlan.map(item => (
                    <div key={item.id} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${item.isCompleted ? 'bg-green-500/40' : 'bg-white/10 shadow-inner'}`}>
                      <div className={item.isCompleted ? 'line-through opacity-60' : ''}>
                        <p className="font-bold text-sm leading-none">{item.unitName}</p>
                        <p className="text-[10px] opacity-70 mt-1 uppercase font-bold">{item.district}</p>
                      </div>
                      <div className="flex gap-2">
                        {!item.isCompleted && (
                          <button onClick={() => completeAudit(item.unitId, item.id)} className="bg-white text-blue-600 p-2 rounded-xl shadow-lg active:scale-90 transition">
                            <Check size={20} strokeWidth={3} />
                          </button>
                        )}
                        <button onClick={() => removeFromPlan(item.id)} className="bg-red-500/20 text-white p-2 rounded-xl">
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ARAMA */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input 
                type="text" placeholder="Birim veya ilçe ara..." 
                className="w-full pl-12 pr-4 py-4 rounded-3xl border-none shadow-sm text-sm font-medium focus:ring-2 focus:ring-blue-500"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* BİRİM LİSTESİ */}
            <div className="grid gap-4">
              {unitStats.map(unit => (
                <div key={unit.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-4">
                  <div className="flex justify-between items-start" onClick={() => { setSelectedUnitForDetail(unit); setActiveTab('unitDetail'); }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MapPin size={12} className="text-blue-500"/>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{unit.city} • {unit.district}</p>
                      </div>
                      <h3 className="font-bold text-lg text-gray-800 leading-tight">{unit.name}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-xs text-gray-500 font-bold flex items-center gap-1">
                           <History size={14}/> {unit.lastAudit || 'Kayıt Yok'}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-[11px] font-black shadow-sm ${getStatusColor(unit.days)}`}>
                      {unit.days === Infinity ? 'YENİ' : `${unit.days} GÜN`}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setSelectedUnitForDetail(unit); setActiveTab('planner'); }}
                      className="flex-1 bg-gray-50 text-gray-700 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition"
                    >
                      <CalendarDays size={16}/> Plana Ekle
                    </button>
                    <button 
                      onClick={() => completeAudit(unit.id)}
                      className="flex-1 bg-blue-50 text-blue-600 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition"
                    >
                      <Check size={16} strokeWidth={3}/> Gidildi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* --- HAFTALIK PLANLAMA EKRANI --- */}
        {activeTab === 'planner' && (
          <div className="space-y-6 animate-in slide-in-from-right-10 duration-300">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase mb-3 ml-1">Planlanacak Gün Seçin</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {DAYS_OF_WEEK.map(day => (
                  <button 
                    key={day.id}
                    onClick={() => setSelectedDayForPlan(day.id)}
                    className={`flex-none px-4 py-3 rounded-2xl text-sm font-bold transition-all ${selectedDayForPlan === day.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-50 text-gray-500'}`}
                  >
                    {day.name}
                  </button>
                ))}
              </div>
            </div>

            {selectedUnitForDetail ? (
              <div className="bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100 text-center animate-in zoom-in-95">
                <p className="text-xs font-bold text-blue-400 uppercase mb-1">Seçili Birim</p>
                <h3 className="text-xl font-black text-blue-900 mb-4">{selectedUnitForDetail.name}</h3>
                <button 
                  onClick={() => handleAddToWeeklyPlan(selectedUnitForDetail, selectedDayForPlan)}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                >
                  <CalendarPlus size={20}/> {DAYS_OF_WEEK.find(d => d.id === selectedDayForPlan).name} Gününe Ekle
                </button>
                <button onClick={() => setSelectedUnitForDetail(null)} className="mt-4 text-sm font-bold text-blue-400 underline">Başka Birim Seç</button>
              </div>
            ) : (
              <div className="text-center p-10 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm font-medium">Planlamak istediğiniz birimi ana sayfadan seçip "Plana Ekle"ye basın veya listeden arayın.</p>
              </div>
            )}

            {/* SEÇİLİ GÜNÜN MEVCUT PLANI */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-800 ml-1 flex items-center gap-2">
                <List size={18}/> {DAYS_OF_WEEK.find(d => d.id === selectedDayForPlan).name} Listesi
              </h3>
              {weeklyPlans.filter(p => p.dayId === selectedDayForPlan).map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border border-gray-50">
                  <div>
                    <p className="font-bold text-sm text-gray-800">{item.unitName}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{item.district}</p>
                  </div>
                  <button onClick={() => removeFromPlan(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition">
                    <Trash2 size={18}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- GELİŞMİŞ NOTLAR VE DETAY --- */}
        {activeTab === 'unitDetail' && selectedUnitForDetail && (
          <div className="space-y-4 animate-in slide-in-from-bottom-10">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
              <h2 className="text-2xl font-black text-gray-800">{selectedUnitForDetail.name}</h2>
              <div className="flex items-center gap-2 mt-2 text-gray-500 font-medium">
                <MapPin size={16}/> {selectedUnitForDetail.city} / {selectedUnitForDetail.district}
              </div>
            </div>

            <div className="bg-white p-5 rounded-[2.5rem] shadow-sm space-y-4">
              <div className="flex gap-2">
                <input 
                  className="flex-1 bg-gray-50 p-4 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Ziyaret notu ekleyin..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                />
                <button onClick={handleAddNote} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-90 transition">
                  <Plus strokeWidth={3}/>
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {unitNotes.map(note => (
                  <div key={note.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-sm text-gray-700 font-semibold leading-relaxed">{note.text}</p>
                    <div className="flex items-center gap-2 mt-3 opacity-40">
                      <Calendar size={10}/>
                      <p className="text-[9px] font-black uppercase">
                        {note.createdAt?.toDate().toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                ))}
                {unitNotes.length === 0 && (
                  <div className="text-center py-12 opacity-30">
                    <FileText size={48} className="mx-auto mb-2"/>
                    <p className="text-xs font-bold">HENÜZ NOT EKLENMEMİŞ</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- ÇARK (HEDEF RADARI) --- */}
        {activeTab === 'wheel' && (
          <div className="space-y-6 text-center animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
              <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-indigo-200 rotate-12">
                <Shuffle size={48} />
              </div>
              <h2 className="text-2xl font-black text-gray-800">Hedef Radarı</h2>
              <p className="text-sm text-gray-500 font-medium mt-2">Nereye gideceğinize karar veremedik mi?</p>
              
              <div className="h-32 flex items-center justify-center my-8 bg-gray-900 rounded-[2rem] text-white font-black text-2xl px-6 shadow-inner border-[6px] border-gray-800 overflow-hidden">
                {isSpinning ? (
                  <span className="animate-pulse text-indigo-400 uppercase tracking-widest text-sm">Tarama Yapılıyor...</span>
                ) : (
                  <span className="animate-in zoom-in">{wheelResult?.name || "???"}</span>
                )}
              </div>
              
              <button 
                onClick={() => {
                  if(isSpinning) return;
                  setIsSpinning(true);
                  setWheelResult(null);
                  const timer = setInterval(() => setFlashingUnitName(units[Math.floor(Math.random()*units.length)].name), 80);
                  setTimeout(() => {
                    clearInterval(timer);
                    setIsSpinning(false);
                    const winner = unitStats[Math.floor(Math.random() * Math.min(unitStats.length, 10))]; // En acil 10 birim arasından seç
                    setWheelResult(winner);
                  }, 2000);
                }}
                disabled={isSpinning}
                className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50"
              >
                RADARI ÇALIŞTIR
              </button>

              {wheelResult && !isSpinning && (
                <div className="mt-8 p-6 bg-green-50 border-2 border-green-100 rounded-[2rem] animate-in slide-in-from-top-4">
                  <p className="text-sm font-black text-green-700 mb-4 uppercase tracking-tighter">HEDEF BELİRLENDİ!</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { handleAddToWeeklyPlan(wheelResult, new Date().getDay()); setActiveTab('dashboard'); }}
                      className="flex-1 bg-green-600 text-white py-3 rounded-xl text-xs font-black shadow-md"
                    >
                      BUGÜNÜN PLANINA EKLE
                    </button>
                    <button onClick={() => setWheelResult(null)} className="px-4 bg-white text-gray-400 py-3 rounded-xl border border-gray-200"><X size={20}/></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- ALT NAVİGASYON --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 p-3 flex justify-around items-center h-22 z-50">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`p-4 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <List size={24} strokeWidth={activeTab === 'dashboard' ? 3 : 2}/>
        </button>
        <button 
          onClick={() => setActiveTab('planner')} 
          className={`p-4 rounded-2xl transition-all ${activeTab === 'planner' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <CalendarDays size={24} strokeWidth={activeTab === 'planner' ? 3 : 2}/>
        </button>
        <button 
          onClick={() => setActiveTab('wheel')} 
          className={`p-4 rounded-2xl transition-all ${activeTab === 'wheel' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <Shuffle size={24} strokeWidth={activeTab === 'wheel' ? 3 : 2}/>
        </button>
        <button 
          onClick={() => onBack()} 
          className="p-4 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      {/* Global CSS (Stil iyileştirmeleri için) */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}} />
    </div>
  );
}
