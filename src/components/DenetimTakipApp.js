import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Plus, Trash2, Search, CheckCircle2, MapPin, 
  History, ArrowLeft, AlertCircle, List, Settings, Edit, 
  Dna, Zap, FileText, X, ChevronRight, Shuffle, CalendarPlus, CalendarDays, Check
} from 'lucide-react';

import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query, where, getDoc, setDoc } from 'firebase/firestore';

// Yerel saat dilimine göre YYYY-MM-DD formatında tarihi almak için yardımcı fonksiyon
const getLocalYYYYMMDD = (dateObj = new Date()) => {
  const d = new Date(dateObj);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

export default function DenetimTakipApp({ onBack }) {
  const [units, setUnits] = useState([]);
  const [audits, setAudits] = useState([]);
  const [plans, setPlans] = useState([]); // YENİ: Planlar State'i

  const [newUnit, setNewUnit] = useState({ city: '', district: '', name: '' });
  const [newAudit, setNewAudit] = useState({ unitId: '', date: getLocalYYYYMMDD() });
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(''); // Başarı mesajları için
  
  // FİLTRELEME DURUMLARI
  const [urgencyFilter, setUrgencyFilter] = useState('all'); 
  const [selectedCityFilter, setSelectedCityFilter] = useState('all'); 

  // DETAY VE NOT DURUMLARI
  const [selectedUnitForDetail, setSelectedUnitForDetail] = useState(null);
  const [unitNote, setUnitNote] = useState('');
  const [planDate, setPlanDate] = useState(getLocalYYYYMMDD()); // YENİ: Plan tarihi
  const [isSavingNote, setIsSavingNote] = useState(false);

  // ÇARK / KURA DURUMLARI
  const [wheelCityFilter, setWheelCityFilter] = useState('all');
  const [wheelUrgencyFilter, setWheelUrgencyFilter] = useState('all');
  const [isSpinning, setIsSpinning] = useState(false);
  const [flashingUnitName, setFlashingUnitName] = useState('');
  const [wheelResult, setWheelResult] = useState(null);

  // VERİTABANI İŞLEMLERİ
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setErrorMsg("Oturum hatası: Lütfen tekrar giriş yapın.");
      return;
    }

    const initializeDefaultUnits = async () => {
      try {
        const flagRef = doc(db, 'kullanici_ayarlari', uid);
        const flagSnap = await getDoc(flagRef);

        if (!flagSnap.exists() || !flagSnap.data().baslangicBirimleriEklendi) {
          const defaultUnits = [
            { city: 'Aydın', district: 'Efeler', name: 'Merkez' },
            { city: 'İzmir', district: 'Buca', name: 'Fırat Mahallesi' }
          ];

          for (const u of defaultUnits) {
            await addDoc(collection(db, 'bireysel_birimler'), { ...u, userId: uid, notes: '', notesList: [] });
          }
          await setDoc(flagRef, { baslangicBirimleriEklendi: true }, { merge: true });
        }
      } catch (err) {}
    };

    initializeDefaultUnits();

    try {
      const qUnits = query(collection(db, 'bireysel_birimler'), where("userId", "==", uid));
      const unsubUnits = onSnapshot(qUnits, (snapshot) => {
        setUnits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const qAudits = query(collection(db, 'bireysel_denetimler'), where("userId", "==", uid));
      const unsubAudits = onSnapshot(qAudits, (snapshot) => {
        setAudits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      // YENİ: Planları Çekme
      const qPlans = query(collection(db, 'bireysel_planlar'), where("userId", "==", uid));
      const unsubPlans = onSnapshot(qPlans, (snapshot) => {
        setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => {
        unsubUnits();
        unsubAudits();
        unsubPlans();
      };
    } catch (error) {
      setErrorMsg("Bağlantı hatası!");
    }
  }, []);

  const availableCities = useMemo(() => {
    return [...new Set(units.map(u => u.city))].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [units]);

  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'Kayıt Yok';
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return dateString;
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const getDaysPassed = (lastDate) => {
    if (!lastDate) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const auditDate = new Date(lastDate);
    auditDate.setHours(0, 0, 0, 0);
    return Math.floor((today - auditDate) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (days) => {
    if (days === Infinity) return 'bg-gray-100 text-gray-500 border-gray-200';
    if (days <= 15) return 'bg-green-50 text-green-700 border-green-200';
    if (days >= 16 && days <= 30) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (days >= 31 && days <= 44) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (days >= 45) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getStatusIndicatorColor = (days) => {
    if (days === Infinity) return 'bg-gray-400';
    if (days <= 15) return 'bg-green-500';
    if (days >= 16 && days <= 30) return 'bg-yellow-400';
    if (days >= 31 && days <= 44) return 'bg-orange-500';
    if (days >= 45) return 'bg-red-600';
    return 'bg-blue-500';
  };

  const getStatusLabel = (days) => {
    if (days === Infinity) return 'Hiç Gidilmedi';
    if (days === 0) return 'Bugün Gidildi';
    return `${days} Gün`;
  };

  // --- TEMEL İŞLEMLER ---
  const handleAddUnit = async () => {
    const uid = auth.currentUser?.uid;
    if (newUnit.city && newUnit.name && newUnit.district && uid) {
      try {
        await addDoc(collection(db, 'bireysel_birimler'), {
          city: newUnit.city.trim(), district: newUnit.district.trim(), name: newUnit.name.trim(),
          notes: '', notesList: [], userId: uid
        });
        setNewUnit({ city: '', district: '', name: '' });
        showSuccess('Birim başarıyla eklendi.');
      } catch (error) { setErrorMsg(`Kaydedilemedi: ${error.message}`); }
    }
  };

  const handleAddAudit = async () => {
    const uid = auth.currentUser?.uid;
    if (newAudit.unitId && newAudit.date && uid) {
      try {
        await addDoc(collection(db, 'bireysel_denetimler'), { unitId: newAudit.unitId, date: newAudit.date, userId: uid });
        setNewAudit({...newAudit, unitId: ''}); 
        showSuccess('Denetim başarıyla eklendi.');
      } catch (error) { setErrorMsg(`Hata: ${error.message}`); }
    }
  };

  const handleQuickAddAudit = async (unitId, e) => {
    e.stopPropagation();
    const uid = auth.currentUser?.uid;
    const today = getLocalYYYYMMDD();
    if (unitId && uid) {
      try {
        await addDoc(collection(db, 'bireysel_denetimler'), { unitId: unitId, date: today, userId: uid });
        showSuccess('Bugün gidildi olarak işaretlendi.');
      } catch (error) { setErrorMsg(`Hata: ${error.message}`); }
    }
  };

  const handleDeleteAudit = async (id) => {
    if(window.confirm('Kaydı silmek istediğinize emin misiniz?')) {
      try { await deleteDoc(doc(db, 'bireysel_denetimler', id)); } catch (error) {}
    }
  };

  // --- PLANLAMA İŞLEMLERİ ---
  const handleAddPlan = async (unitId, date) => {
    const uid = auth.currentUser?.uid;
    if (!unitId || !date || !uid) return;
    try {
      await addDoc(collection(db, 'bireysel_planlar'), { unitId, date, userId: uid });
      showSuccess(`${formatDateDisplay(date)} tarihine plan eklendi.`);
    } catch (err) { setErrorMsg("Plan eklenirken hata oluştu."); }
  };

  const handleCompletePlan = async (plan, e) => {
    e?.stopPropagation();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await addDoc(collection(db, 'bireysel_denetimler'), { unitId: plan.unitId, date: plan.date, userId: uid });
      await deleteDoc(doc(db, 'bireysel_planlar', plan.id));
      showSuccess('Plan tamamlandı ve denetim eklendi.');
    } catch (err) { setErrorMsg("İşlem sırasında hata oluştu."); }
  };

  const handleDeletePlan = async (planId, e) => {
    e?.stopPropagation();
    try { await deleteDoc(doc(db, 'bireysel_planlar', planId)); } catch (err) {}
  };

  // --- NOT İŞLEMLERİ (GÜNCELLENDİ) ---
  const handleSaveNote = async () => {
    if(!selectedUnitForDetail || !unitNote.trim()) return;
    setIsSavingNote(true);
    try {
      const newNoteObj = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        text: unitNote.trim()
      };
      
      const currentNotes = selectedUnitForDetail.notesList || [];
      const updatedNotes = [newNoteObj, ...currentNotes];

      await updateDoc(doc(db, 'bireysel_birimler', selectedUnitForDetail.id), {
        notesList: updatedNotes
      });
      
      setSelectedUnitForDetail({...selectedUnitForDetail, notesList: updatedNotes});
      setUnitNote('');
      showSuccess('Not başarıyla eklendi.');
    } catch(err) {
      setErrorMsg("Not kaydedilemedi.");
    }
    setIsSavingNote(false);
  };

  // --- VERİ HAZIRLIĞI ---
  const unitStats = useMemo(() => {
    return units
      .map(unit => {
        const unitAudits = audits.filter(a => a.unitId === unit.id);
        const unitPlans = plans.filter(p => p.unitId === unit.id && p.date >= getLocalYYYYMMDD()).sort((a,b) => new Date(a.date) - new Date(b.date));
        const lastAudit = unitAudits.length > 0 ? unitAudits.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date : null;
        return { 
          ...unit, 
          lastAudit, 
          totalVisits: unitAudits.length, 
          days: getDaysPassed(lastAudit),
          nextPlan: unitPlans.length > 0 ? unitPlans[0] : null
        };
      })
      .filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.district.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(u => selectedCityFilter === 'all' || u.city === selectedCityFilter)
      .filter(u => {
        if (urgencyFilter === 'all') return true;
        if (urgencyFilter === '0-15') return u.days <= 15;
        if (urgencyFilter === '16-30') return u.days >= 16 && u.days <= 30;
        if (urgencyFilter === '31-44') return u.days >= 31 && u.days <= 44;
        if (urgencyFilter === '45+') return u.days >= 45 || u.days === Infinity;
        return true;
      })
      .sort((a, b) => {
        const cityCompare = a.city.localeCompare(b.city, 'tr');
        if (cityCompare !== 0) return cityCompare;
        return a.name.localeCompare(b.name, 'tr');
      });
  }, [units, audits, plans, searchTerm, urgencyFilter, selectedCityFilter]);

  const auditHistory = useMemo(() => {
    return audits
      .map(audit => {
        const unit = units.find(u => u.id === audit.unitId);
        return { ...audit, unitName: unit ? unit.name : 'Silinmiş Birim', unitCity: unit ? unit.city : 'Bilinmiyor' };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [audits, units]);

  const todaysPlans = useMemo(() => {
    const todayStr = getLocalYYYYMMDD();
    return plans.filter(p => p.date === todayStr).map(p => {
      const u = units.find(u => u.id === p.unitId);
      return { ...p, unitName: u ? u.name : 'Bilinmeyen Şube', district: u ? u.district : '' };
    });
  }, [plans, units]);

  const filterOptions = [
    { label: 'Tümü', value: 'all', color: 'bg-gray-400' },
    { label: '0-15 G', value: '0-15', color: 'bg-green-500' },
    { label: '16-30 G', value: '16-30', color: 'bg-yellow-400' },
    { label: '31-44 G', value: '31-44', color: 'bg-orange-500' },
    { label: '45+ G', value: '45+', color: 'bg-red-600' }
  ];

  // ÇARK SİSTEMİ MANTIĞI
  const handleSpinWheel = () => {
    const eligibleUnits = units.map(unit => {
      const unitAudits = audits.filter(a => a.unitId === unit.id);
      const lastAudit = unitAudits.length > 0 ? unitAudits.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date : null;
      return { ...unit, days: getDaysPassed(lastAudit) };
    }).filter(u => wheelCityFilter === 'all' || u.city === wheelCityFilter)
      .filter(u => {
        if (wheelUrgencyFilter === 'all') return true;
        if (wheelUrgencyFilter === '0-15') return u.days <= 15;
        if (wheelUrgencyFilter === '16-30') return u.days >= 16 && u.days <= 30;
        if (wheelUrgencyFilter === '31-44') return u.days >= 31 && u.days <= 44;
        if (wheelUrgencyFilter === '45+') return u.days >= 45 || u.days === Infinity;
        return true;
      });

    if (eligibleUnits.length === 0) {
      alert("Bu filtrelere uygun şube bulunamadı!");
      return;
    }

    setIsSpinning(true);
    setWheelResult(null);
    let spins = 0;
    
    const interval = setInterval(() => {
      const randomInd = Math.floor(Math.random() * eligibleUnits.length);
      setFlashingUnitName(eligibleUnits[randomInd].name);
      spins++;
      
      if (spins > 25) { 
        clearInterval(interval);
        const winner = eligibleUnits[Math.floor(Math.random() * eligibleUnits.length)];
        setWheelResult(winner);
        setFlashingUnitName('');
        setIsSpinning(false);
      }
    }, 100);
  };

  const openUnitDetail = (unit) => {
    setSelectedUnitForDetail(unit);
    setUnitNote('');
    setPlanDate(getLocalYYYYMMDD());
    setActiveTab('unitDetail');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      
      {/* ÜST BAŞLIK BARI */}
      <div className="bg-white px-4 pt-6 pb-4 shadow-sm flex items-center justify-between sticky top-0 z-40">
        <button 
          onClick={() => {
            if (activeTab === 'unitDetail') setActiveTab('dashboard');
            else if (activeTab === 'weeklyPlans') setActiveTab('dashboard');
            else onBack();
          }} 
          className="p-2 -ml-2 text-gray-500 hover:text-gray-800 transition rounded-full active:bg-gray-100"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold flex items-center gap-2 text-gray-800">
          {activeTab === 'unitDetail' ? <><MapPin className="text-blue-600" size={22} /> Şube Detayı</> : 
           activeTab === 'weeklyPlans' ? <><CalendarDays className="text-purple-600" size={22} /> Haftalık Shift</> : 
           <><CheckCircle2 className="text-blue-600" size={22} /> Denetim Takip</>}
        </h1>
        {activeTab === 'dashboard' ? (
          <button onClick={() => setActiveTab('weeklyPlans')} className="text-purple-600 p-2 -mr-2 bg-purple-50 rounded-full active:bg-purple-100">
            <CalendarDays size={20} />
          </button>
        ) : <div className="w-8"></div>}
      </div>

      {/* UYARI VE BAŞARI MESAJLARI */}
      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded-r-xl flex items-center gap-3">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-sm font-medium text-red-700">{errorMsg}</p>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 m-4 rounded-r-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="text-green-500 shrink-0" size={20} />
          <p className="text-sm font-medium text-green-700">{successMsg}</p>
        </div>
      )}

      <div className="p-4 space-y-6">
        
        {/* ANA LİSTE EKRANI (DASHBOARD) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            
            {/* BUGÜNÜN PLANLARI (YENİ) */}
            {todaysPlans.length > 0 && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 shadow-lg text-white">
                <h3 className="font-bold text-sm flex items-center gap-2 mb-3 opacity-90">
                  <Calendar size={16} /> Bugünün Planlanan Şubeleri
                </h3>
                <div className="space-y-2">
                  {todaysPlans.map(plan => (
                    <div key={plan.id} className="bg-white/10 p-3 rounded-xl flex items-center justify-between border border-white/20">
                      <div>
                        <p className="font-bold text-sm leading-tight">{plan.unitName}</p>
                        <p className="text-[10px] opacity-75">{plan.district}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={(e) => handleDeletePlan(plan.id, e)} className="p-2 bg-red-500/20 text-red-100 rounded-lg hover:bg-red-500/40">
                          <X size={16} />
                        </button>
                        <button onClick={(e) => handleCompletePlan(plan, e)} className="px-3 py-1.5 bg-white text-blue-600 text-xs font-bold rounded-lg flex items-center gap-1 active:scale-95">
                          <Check size={14} /> Gidildi
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ARAMA VE FİLTRE */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Ara..." 
                  className="w-full pl-10 pr-3 py-3.5 rounded-2xl border-none bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="w-1/3 px-2 py-3.5 rounded-2xl border-none bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-gray-700 text-xs sm:text-sm text-center truncate"
                value={selectedCityFilter}
                onChange={(e) => setSelectedCityFilter(e.target.value)}
              >
                <option value="all">İl</option>
                {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {filterOptions.map(f => (
                <button 
                  key={f.value}
                  onClick={() => setUrgencyFilter(f.value)}
                  className={`flex-none px-3 py-1.5 rounded-lg shadow-sm border flex items-center gap-1.5 text-xs font-bold transition-all ${urgencyFilter === f.value ? 'bg-blue-50 border-blue-200 text-blue-700 scale-[1.02]' : 'bg-white border-gray-100 text-gray-600'}`}
                >
                  {f.value !== 'all' && <div className={`w-2.5 h-2.5 rounded-full ${f.color}`}></div>}
                  {f.label}
                </button>
              ))}
            </div>

            {/* BİRİM KARTLARI (TAŞMA DÜZELTİLDİ) */}
            <div className="grid gap-3">
              {unitStats.map(unit => {
                const latestNote = unit.notesList && unit.notesList.length > 0 ? unit.notesList[0].text : unit.notes;
                
                return (
                <div 
                  key={unit.id} 
                  onClick={() => openUnitDetail(unit)}
                  className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 w-1 h-full ${getStatusIndicatorColor(unit.days)}`}></div>
                  
                  <div className="flex justify-between items-start pl-2 gap-2">
                    {/* SOL TARAF: Uzun metinler kesilecek (truncate) */}
                    <div className="min-w-0 flex-1"> 
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">
                        {unit.city} {unit.district ? `• ${unit.district}` : ''}
                      </p>
                      <h3 className="font-bold text-gray-800 text-[15px] leading-tight mt-0.5 truncate">{unit.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 font-medium whitespace-nowrap">
                          <Calendar size={12} className="text-gray-400" /> {formatDateDisplay(unit.lastAudit)}
                        </p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 font-medium bg-gray-50 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                          <History size={12} className="text-gray-400" /> Toplam: {unit.totalVisits}
                        </p>
                      </div>
                    </div>
                    
                    {/* SAĞ TARAF: Butonlar alanı (Sabit genişlikte ve alt alta) */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusColor(unit.days)} text-center`}>
                        {getStatusLabel(unit.days)}
                      </div>
                      <button 
                        onClick={(e) => handleQuickAddAudit(unit.id, e)}
                        className="flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                      >
                        <Zap size={12} className="fill-blue-600" /> Bugün Gidildi
                      </button>
                    </div>
                  </div>

                  {/* PLAN BİLGİSİ */}
                  {unit.nextPlan && (
                    <div className="pl-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100">
                        <CalendarPlus size={12} /> Planlı: {formatDateDisplay(unit.nextPlan.date)}
                      </span>
                    </div>
                  )}
                  
                  {/* NOT GÖSTERİMİ */}
                  {latestNote && (
                    <div className="pl-2 mt-1 flex items-start gap-1.5 text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <FileText size={12} className="mt-0.5 shrink-0 text-gray-400" />
                      <p className="line-clamp-2 italic">{latestNote}</p>
                    </div>
                  )}
                </div>
              )})}
              {unitStats.length === 0 && (
                <div className="p-8 text-center text-gray-400 italic text-sm bg-white rounded-2xl shadow-sm border border-gray-100">
                  Kritere uygun birim bulunamadı.
                </div>
              )}
            </div>
          </div>
        )}

        {/* HAFTALIK SHIFT / TÜM PLANLAR EKRANI */}
        {activeTab === 'weeklyPlans' && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Gelecek Planlar</h2>
            
            {plans.length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic text-sm bg-white rounded-2xl shadow-sm border border-gray-100">
                Henüz yapılmış bir planınız bulunmuyor.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Planları tarihe göre grupla */}
                {Object.entries(
                  plans.reduce((acc, plan) => {
                    (acc[plan.date] = acc[plan.date] || []).push(plan);
                    return acc;
                  }, {})
                ).sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
                 .map(([date, dayPlans]) => (
                  <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 font-bold text-gray-700 flex items-center gap-2">
                      <CalendarDays size={16} className="text-purple-600"/> {formatDateDisplay(date)}
                    </div>
                    <div className="divide-y divide-gray-50">
                      {dayPlans.map(plan => {
                        const u = units.find(x => x.id === plan.unitId);
                        return (
                          <div key={plan.id} className="p-4 flex justify-between items-center">
                            <div>
                              <p className="font-bold text-sm text-gray-800">{u?.name || 'Bilinmeyen'}</p>
                              <p className="text-xs text-gray-500">{u?.district} / {u?.city}</p>
                            </div>
                            <button onClick={() => handleDeletePlan(plan.id)} className="text-red-400 p-2 bg-red-50 rounded-lg">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ŞUBE DETAY EKRANI */}
        {activeTab === 'unitDetail' && selectedUnitForDetail && (() => {
          const uAudits = audits.filter(a => a.unitId === selectedUnitForDetail.id).sort((a,b) => new Date(b.date) - new Date(a.date));
          const unitNotes = selectedUnitForDetail.notesList || []; 
          
          return (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1 ${getStatusIndicatorColor(selectedUnitForDetail.days)}`}></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedUnitForDetail.name}</h2>
                    <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin size={14}/> {selectedUnitForDetail.city} / {selectedUnitForDetail.district}
                    </p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border ${getStatusColor(selectedUnitForDetail.days)}`}>
                    {getStatusLabel(selectedUnitForDetail.days)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Toplam Ziyaret</p>
                    <p className="text-xl font-black text-blue-600">{uAudits.length}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Son Ziyaret</p>
                    <p className="text-sm font-bold text-gray-700 mt-1.5">{formatDateDisplay(selectedUnitForDetail.lastAudit)}</p>
                  </div>
                </div>

                {/* PLANLAMA ALANI YENİ */}
                <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <label className="text-xs font-bold text-purple-800 flex items-center gap-1 mb-2">
                    <CalendarPlus size={14}/> Bu Şubeye Plan Yap
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="date" 
                      className="flex-1 p-2 rounded-lg border border-purple-200 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-400"
                      value={planDate}
                      onChange={(e) => setPlanDate(e.target.value)}
                    />
                    <button 
                      onClick={() => handleAddPlan(selectedUnitForDetail.id, planDate)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm active:scale-95 transition"
                    >
                      Planla
                    </button>
                  </div>
                </div>

                {/* NOT EKLEME ALANI */}
                <div className="space-y-2 mb-4 border-t border-gray-100 pt-4">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                    <Plus size={14}/> Yeni Not Ekle
                  </label>
                  <textarea 
                    value={unitNote}
                    onChange={(e) => setUnitNote(e.target.value)}
                    placeholder="Ziyaretinizle ilgili not yazın..."
                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                  />
                  <button 
                    onClick={handleSaveNote}
                    disabled={isSavingNote || !unitNote.trim()}
                    className="w-full py-2.5 bg-gray-800 text-white rounded-xl text-sm font-bold shadow-sm active:bg-gray-900 transition-colors disabled:opacity-50"
                  >
                    {isSavingNote ? 'Kaydediliyor...' : 'Notu Ekle'}
                  </button>
                </div>

                {/* GEÇMİŞ NOTLAR */}
                {unitNotes.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Geçmiş Notlar</label>
                    <div className="max-h-[200px] overflow-y-auto pr-1 space-y-2">
                      {unitNotes.map(n => (
                        <div key={n.id} className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                          <p className="text-[10px] font-bold text-yellow-600 mb-1">{new Date(n.date).toLocaleDateString('tr-TR', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                          <p className="text-sm text-gray-700 italic">{n.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* ESKİ TEK TİP NOT VARSA GÖSTER (Geriye dönük uyumluluk) */}
                {selectedUnitForDetail.notes && unitNotes.length === 0 && (
                  <div className="mt-2 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                    <p className="text-[10px] font-bold text-yellow-600 mb-1">Eski Not</p>
                    <p className="text-sm text-gray-700 italic">{selectedUnitForDetail.notes}</p>
                  </div>
                )}
              </div>

              {/* ZİYARET GEÇMİŞİ */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <History size={16} className="text-blue-500" /> Ziyaret Geçmişi
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {uAudits.map((a, i) => (
                    <div key={a.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-sm font-bold text-gray-700">{formatDateDisplay(a.date)}</span>
                      {i === 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">SON ZİYARET</span>}
                    </div>
                  ))}
                  {uAudits.length === 0 && <p className="text-sm text-gray-400 italic py-2 text-center">Henüz ziyaret kaydı yok.</p>}
                </div>
              </div>

            </div>
          );
        })()}

        {/* ÇARK / KURA EKRANI */}
        {activeTab === 'wheel' && (
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
              
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-200 mb-4 rotate-3">
                <Shuffle size={32} className="text-white" />
              </div>
              
              <h2 className="text-xl font-black text-gray-800 mb-2">Şube Radarı</h2>
              <p className="text-sm text-gray-500 mb-6 px-4">Bugün nereye gideceğinize karar veremediyseniz, filtreleri seçin ve radarı çalıştırın!</p>
              
              <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">İl Filtresi</label>
                  <select 
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-700 outline-none"
                    value={wheelCityFilter} onChange={e => setWheelCityFilter(e.target.value)}
                  >
                    <option value="all">Tüm İller</option>
                    {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Aciliyet</label>
                  <select 
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-700 outline-none"
                    value={wheelUrgencyFilter} onChange={e => setWheelUrgencyFilter(e.target.value)}
                  >
                    <option value="all">Farketmez</option>
                    <option value="16-30">16-30 Gün (Sarı)</option>
                    <option value="31-44">31-44 Gün (Turuncu)</option>
                    <option value="45+">45+ Gün (Kırmızı)</option>
                  </select>
                </div>
              </div>

              {/* Çark Çıktı Ekranı */}
              <div className="bg-gray-900 rounded-2xl p-6 min-h-[140px] flex flex-col items-center justify-center relative overflow-hidden mb-6 shadow-inner border-[4px] border-gray-800">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-gray-900 to-gray-900 pointer-events-none"></div>
                
                {isSpinning ? (
                  <div className="text-center z-10">
                    <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.2em] mb-2 animate-pulse">Aranıyor...</p>
                    <p className="text-2xl font-black text-white truncate px-4">{flashingUnitName}</p>
                  </div>
                ) : wheelResult ? (
                  <div className="text-center z-10 animate-in zoom-in duration-300 w-full">
                    <p className="text-green-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Hedef Bulundu</p>
                    <h3 className="text-2xl md:text-3xl font-black text-white mb-1 leading-tight">{wheelResult.name}</h3>
                    <p className="text-gray-400 text-xs mb-3">{wheelResult.city} / {wheelResult.district}</p>
                    
                    {/* YENİ: Çark üzerinden bugüne planlama */}
                    <div className="flex gap-2 justify-center mt-2">
                      <button 
                        onClick={() => handleAddPlan(wheelResult.id, getLocalYYYYMMDD())}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                      >
                        <CalendarPlus size={14}/> Bugüne Planla
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 font-medium z-10 text-sm">
                    Başlamak için butona basın
                  </div>
                )}
              </div>

              <button 
                onClick={handleSpinWheel}
                disabled={isSpinning}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-black text-lg shadow-[0_10px_20px_rgba(79,70,229,0.3)] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSpinning ? 'Radarlanıyor...' : 'Radarı Çalıştır'} <Zap size={20} className={isSpinning ? "animate-spin" : ""} />
              </button>

            </div>
          </div>
        )}

        {/* DENETİM EKLE EKRANI */}
        {activeTab === 'addAudit' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="text-blue-600" /> Seri Denetim Ekle
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Birim Seç</label>
                  <select 
                    className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-sm transition"
                    value={newAudit.unitId}
                    onChange={(e) => setNewAudit({...newAudit, unitId: e.target.value})}
                  >
                    <option value="">Listedeki birimlerden seçin...</option>
                    {[...units].sort((a,b) => {
                      const c = a.city.localeCompare(b.city, 'tr');
                      if (c !== 0) return c;
                      return a.name.localeCompare(b.name, 'tr');
                    }).map(u => (
                      <option key={u.id} value={u.id}>{u.city} ({u.district}) - {u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Tarih</label>
                  <input 
                    type="date" 
                    className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-sm transition"
                    value={newAudit.date}
                    onChange={(e) => setNewAudit({...newAudit, date: e.target.value})}
                  />
                </div>
                <button 
                  onClick={handleAddAudit}
                  disabled={!newAudit.unitId}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-base hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition shadow-lg shadow-blue-200/50 mt-2"
                >
                  Kaydı Tamamla
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden pb-4">
              <div className="p-4 border-b border-gray-50 flex items-center gap-2">
                <History size={18} className="text-gray-400" />
                <span className="font-bold text-gray-700 text-sm">Son Girilenler</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
                {auditHistory.map(audit => (
                  <div key={audit.id} className="p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition">
                    <div>
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{audit.unitCity}</p>
                      <p className="font-bold text-gray-800 text-sm mt-0.5">{audit.unitName}</p>
                      <p className="text-xs text-gray-400 font-medium mt-1">{formatDateDisplay(audit.date)}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteAudit(audit.id)}
                      className="p-3 text-gray-300 hover:text-red-500 active:bg-red-50 rounded-xl transition"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BİRİM YÖNETİMİ EKRANI */}
        {activeTab === 'units' && (
           <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="text-green-600" /> Yeni Birim Ekle
              </h2>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="İl (Örn: İzmir)" 
                  className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-sm transition"
                  value={newUnit.city}
                  onChange={(e) => setNewUnit({...newUnit, city: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="İlçe / Bölge (Örn: Buca)" 
                  className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-sm transition"
                  value={newUnit.district}
                  onChange={(e) => setNewUnit({...newUnit, district: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Birim Adı" 
                  className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-sm transition"
                  value={newUnit.name}
                  onChange={(e) => setNewUnit({...newUnit, name: e.target.value})}
                />
                <button 
                  onClick={handleAddUnit}
                  className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-base hover:bg-gray-800 active:bg-black transition shadow-lg shadow-gray-200/50 mt-2"
                >
                  Sisteme Kaydet
                </button>
              </div>
            </div>
           </div>
        )}

      </div>

      {/* MOBİL ALT NAVİGASYON BARI */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center pb-safe z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] h-16 px-1">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition ${activeTab === 'dashboard' || activeTab === 'unitDetail' || activeTab === 'weeklyPlans' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <List size={22} className={activeTab === 'dashboard' || activeTab === 'unitDetail' || activeTab === 'weeklyPlans' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[10px] font-bold">Liste</span>
        </button>
        <button 
          onClick={() => setActiveTab('wheel')} 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition ${activeTab === 'wheel' ? 'text-purple-600' : 'text-gray-400'}`}
        >
          <Dna size={22} className={activeTab === 'wheel' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[10px] font-bold">Kura</span>
        </button>
        <button 
          onClick={() => setActiveTab('addAudit')} 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition ${activeTab === 'addAudit' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <History size={22} className={activeTab === 'addAudit' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[10px] font-bold">Kayıtlar</span>
        </button>
        <button 
          onClick={() => setActiveTab('units')} 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition ${activeTab === 'units' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <Settings size={22} className={activeTab === 'units' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[10px] font-bold">Yönetim</span>
        </button>
      </div>

    </div>
  );
}
