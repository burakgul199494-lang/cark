import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Plus, Trash2, Search, CheckCircle2, MapPin, 
  History, ArrowLeft, AlertCircle, List, Settings, Edit, 
  Dna, Zap, FileText, X, ChevronRight, Shuffle, Check, Clock
} from 'lucide-react';

import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query, where, getDoc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';

export default function DenetimTakipApp({ onBack }) {
  const [units, setUnits] = useState([]);
  const [audits, setAudits] = useState([]);
  const [plannedVisits, setPlannedVisits] = useState([]); // Yeni: Planlama için
  const [unitNotes, setUnitNotes] = useState([]); // Yeni: Gelişmiş notlar için

  const [newUnit, setNewUnit] = useState({ city: '', district: '', name: '' });
  const [newAudit, setNewAudit] = useState({ unitId: '', date: new Date().toISOString().split('T')[0] });
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [urgencyFilter, setUrgencyFilter] = useState('all'); 
  const [selectedCityFilter, setSelectedCityFilter] = useState('all'); 
  const [editingUnitId, setEditingUnitId] = useState(null); 
  const [editUnitData, setEditUnitData] = useState({ city: '', district: '', name: '' });

  const [selectedUnitForDetail, setSelectedUnitForDetail] = useState(null);
  const [newNoteInput, setNewNoteInput] = useState(''); // Yeni: Çoklu not girişi
  const [isSavingNote, setIsSavingNote] = useState(false);

  const [wheelCityFilter, setWheelCityFilter] = useState('all');
  const [wheelUrgencyFilter, setWheelUrgencyFilter] = useState('all');
  const [isSpinning, setIsSpinning] = useState(false);
  const [flashingUnitName, setFlashingUnitName] = useState('');
  const [wheelResult, setWheelResult] = useState(null);

  // Veritabanı Abonelikleri
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setErrorMsg("Oturum hatası: Lütfen tekrar giriş yapın.");
      return;
    }

    const qUnits = query(collection(db, 'bireysel_birimler'), where("userId", "==", uid));
    const unsubUnits = onSnapshot(qUnits, (snapshot) => {
      setUnits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qAudits = query(collection(db, 'bireysel_denetimler'), where("userId", "==", uid));
    const unsubAudits = onSnapshot(qAudits, (snapshot) => {
      setAudits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Yeni: Planlanan denetimleri dinle
    const qPlans = query(collection(db, 'denetim_planlari'), where("userId", "==", uid));
    const unsubPlans = onSnapshot(qPlans, (snapshot) => {
      setPlannedVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubUnits(); unsubAudits(); unsubPlans(); };
  }, []);

  // Yeni: Seçili birim değiştikçe notları getir
  useEffect(() => {
    if (selectedUnitForDetail && activeTab === 'unitDetail') {
      const qNotes = query(
        collection(db, 'birim_notlari'), 
        where("unitId", "==", selectedUnitForDetail.id),
        orderBy("createdAt", "desc")
      );
      const unsubNotes = onSnapshot(qNotes, (snapshot) => {
        setUnitNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubNotes();
    }
  }, [selectedUnitForDetail, activeTab]);

  const availableCities = useMemo(() => {
    return [...new Set(units.map(u => u.city))].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [units]);

  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'Kayıt Yok';
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateString;
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

  // Yeni: Haftalık Planlama İşlemi
  const handleAddToPlan = async (unit, date) => {
    const uid = auth.currentUser?.uid;
    try {
      await addDoc(collection(db, 'denetim_planlari'), {
        unitId: unit.id,
        unitName: unit.name,
        city: unit.city,
        district: unit.district,
        date: date,
        userId: uid,
        completed: false
      });
    } catch (e) { setErrorMsg("Plana eklenemedi."); }
  };

  // Yeni: Plandan Gerçek Denetime Dönüştürme
  const handleCompletePlan = async (plan) => {
    const uid = auth.currentUser?.uid;
    try {
      await addDoc(collection(db, 'bireysel_denetimler'), {
        unitId: plan.unitId,
        date: plan.date,
        userId: uid
      });
      await deleteDoc(doc(db, 'denetim_planlari', plan.id));
    } catch (e) { setErrorMsg("Denetim işlenemedi."); }
  };

  const handleQuickAddAudit = async (unitId, e) => {
    e.stopPropagation();
    const uid = auth.currentUser?.uid;
    const today = new Date().toISOString().split('T')[0];
    if (unitId && uid) {
      try {
        await addDoc(collection(db, 'bireysel_denetimler'), { 
          unitId: unitId, date: today, userId: uid
        });
      } catch (error) { setErrorMsg(`Hızlı ekleme hatası: ${error.message}`); }
    }
  };

  // Yeni: Sınırsız Not Ekleme
  const handleSaveNote = async () => {
    if(!selectedUnitForDetail || !newNoteInput.trim()) return;
    setIsSavingNote(true);
    try {
      await addDoc(collection(db, 'birim_notlari'), {
        unitId: selectedUnitForDetail.id,
        text: newNoteInput,
        createdAt: serverTimestamp()
      });
      setNewNoteInput('');
    } catch(err) { setErrorMsg("Not kaydedilemedi."); }
    setIsSavingNote(false);
  };

  const unitStats = useMemo(() => {
    return units
      .map(unit => {
        const unitAudits = audits.filter(a => a.unitId === unit.id);
        const lastAudit = unitAudits.length > 0 
          ? unitAudits.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date 
          : null;
        return { ...unit, lastAudit, totalVisits: unitAudits.length, days: getDaysPassed(lastAudit) };
      })
      .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.district.toLowerCase().includes(searchTerm.toLowerCase()))
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
  }, [units, audits, searchTerm, urgencyFilter, selectedCityFilter]);

  const auditHistory = useMemo(() => {
    return audits
      .map(audit => {
        const unit = units.find(u => u.id === audit.unitId);
        return { ...audit, unitName: unit ? unit.name : 'Silinmiş Birim', unitCity: unit ? unit.city : 'Bilinmiyor' };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [audits, units]);

  const filterOptions = [
    { label: 'Tümü', value: 'all', color: 'bg-gray-400' },
    { label: '0-15 G', value: '0-15', color: 'bg-green-500' },
    { label: '16-30 G', value: '16-30', color: 'bg-yellow-400' },
    { label: '31-44 G', value: '31-44', color: 'bg-orange-500' },
    { label: '45+ G', value: '45+', color: 'bg-red-600' }
  ];

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
    setActiveTab('unitDetail');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      
      {/* ÜST BAŞLIK BARI */}
      <div className="bg-white px-4 pt-6 pb-4 shadow-sm flex items-center justify-between sticky top-0 z-40">
        <button 
          onClick={() => {
            if (activeTab === 'unitDetail' || activeTab === 'wheel' || activeTab === 'addAudit' || activeTab === 'units') setActiveTab('dashboard');
            else onBack();
          }} 
          className="p-2 -ml-2 text-gray-500 hover:text-gray-800 transition rounded-full active:bg-gray-100"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold flex items-center gap-2 text-gray-800">
          <CheckCircle2 className="text-blue-600" size={22} />
          {activeTab === 'unitDetail' ? 'Şube Notları' : 'Denetim Takip'}
        </h1>
        <div className="w-8"></div> 
      </div>

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded-r-xl flex items-center gap-3">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-sm font-medium text-red-700">{errorMsg}</p>
        </div>
      )}

      <div className="p-4 space-y-6">
        
        {/* ANA LİSTE EKRANI */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            
            {/* YENİ: Haftalık Plan Gözlemi */}
            {plannedVisits.length > 0 && (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
                <h2 className="text-xs font-bold text-blue-600 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Calendar size={14}/> Haftalık Planlananlar
                </h2>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {plannedVisits.sort((a,b) => new Date(a.date) - new Date(b.date)).map(plan => (
                    <div key={plan.id} className="flex items-center justify-between bg-blue-50/50 p-3 rounded-xl border border-blue-50">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-gray-800 leading-none">{plan.unitName}</p>
                        <p className="text-[10px] text-blue-600 font-bold mt-1">{formatDateDisplay(plan.date)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleCompletePlan(plan)} className="p-2 bg-green-500 text-white rounded-lg"><Check size={14} strokeWidth={3}/></button>
                        <button onClick={() => deleteDoc(doc(db, 'denetim_planlari', plan.id))} className="p-2 bg-white text-red-500 rounded-lg border border-red-100"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="İlçe veya birim ara..." 
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
                <option value="all">Tüm İller</option>
                {availableCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {filterOptions.map(f => (
                <button 
                  key={f.value}
                  onClick={() => setUrgencyFilter(f.value)}
                  className={`flex-none px-3 py-1.5 rounded-lg shadow-sm border flex items-center gap-1.5 text-xs font-bold transition-all ${urgencyFilter === f.value ? 'bg-blue-50 border-blue-200 text-blue-700 scale-[1.02]' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}
                >
                  {f.value !== 'all' && <div className={`w-2.5 h-2.5 rounded-full ${f.color}`}></div>}
                  {f.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3">
              {unitStats.map(unit => (
                <div 
                  key={unit.id} 
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4 relative overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 w-1 h-full ${getStatusIndicatorColor(unit.days)}`}></div>
                  
                  <div className="flex justify-between items-start pl-2" onClick={() => openUnitDetail(unit)}>
                    <div className="truncate pr-2">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide truncate">
                        {unit.city} {unit.district ? `• ${unit.district}` : ''}
                      </p>
                      <h3 className="font-bold text-gray-800 text-base truncate leading-tight mt-0.5">{unit.name}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-[12px] text-gray-500 flex items-center gap-1 font-medium">
                          <Calendar size={12} className="text-gray-400" /> {formatDateDisplay(unit.lastAudit)}
                        </p>
                        <p className="text-[12px] text-gray-500 flex items-center gap-1 font-medium bg-gray-50 px-1.5 py-0.5 rounded-md">
                          <History size={12} className="text-gray-400" /> Toplam: {unit.totalVisits}
                        </p>
                      </div>
                    </div>
                    
                    <div className={`px-2 py-1 rounded-md text-[11px] font-bold border ${getStatusColor(unit.days)} text-center shrink-0`}>
                        {getStatusLabel(unit.days)}
                    </div>
                  </div>

                  {/* ALT AKSİYONLAR (Bozulmayan senin buton stilin) */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50 pl-2">
                    <div className="flex gap-1">
                      <input 
                        type="date" 
                        className="text-[10px] p-1.5 border rounded-lg bg-gray-50 flex-1 outline-none focus:ring-1 focus:ring-blue-500"
                        onChange={(e) => handleAddToPlan(unit, e.target.value)}
                      />
                      <div className="p-1.5 bg-gray-100 rounded-lg text-gray-400"><Clock size={14}/></div>
                    </div>
                    <button 
                      onClick={(e) => handleQuickAddAudit(unit.id, e)}
                      className="bg-blue-600 text-white font-bold text-[11px] rounded-lg flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                    >
                      <Zap size={12} fill="white"/> Bugün Gidildi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ŞUBE DETAY EKRANI (Sınırsız Not Sistemi) */}
        {activeTab === 'unitDetail' && selectedUnitForDetail && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{selectedUnitForDetail.name}</h2>
              <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-1">
                <MapPin size={14}/> {selectedUnitForDetail.city} / {selectedUnitForDetail.district}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex gap-2">
                <input 
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  placeholder="Yeni not ekleyin..."
                  className="flex-1 p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                  className="p-3 bg-blue-600 text-white rounded-xl active:bg-blue-700"
                >
                  <Plus size={20}/>
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {unitNotes.map(note => (
                  <div key={note.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-700 font-medium">{note.text}</p>
                    <p className="text-[10px] text-gray-400 mt-2 font-bold">
                      {note.createdAt?.toDate().toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                ))}
                {unitNotes.length === 0 && <p className="text-center text-gray-400 text-xs py-10">Henüz not eklenmemiş.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ÇARK / KURA EKRANI (Bozulmadı, entegre edildi) */}
        {activeTab === 'wheel' && (
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
              <h2 className="text-xl font-black text-gray-800 mb-2">Şube Radarı</h2>
              <div className="bg-gray-900 rounded-2xl p-6 min-h-[140px] flex items-center justify-center relative overflow-hidden mb-6 border-[4px] border-gray-800">
                {isSpinning ? (
                  <div className="text-center z-10 text-white text-2xl font-black">{flashingUnitName}</div>
                ) : wheelResult ? (
                  <div className="text-center z-10 animate-in zoom-in">
                    <h3 className="text-3xl font-black text-white mb-1">{wheelResult.name}</h3>
                    <button 
                      onClick={() => { handleAddToPlan(wheelResult, new Date().toISOString().split('T')[0]); setActiveTab('dashboard'); }}
                      className="mt-3 text-xs font-bold bg-green-500 text-white px-4 py-2 rounded-full"
                    >
                      BUGÜNÜN PLANINA EKLE
                    </button>
                  </div>
                ) : <div className="text-gray-500">Hazır mısın?</div>}
              </div>
              <button onClick={handleSpinWheel} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black">RADARI ÇALIŞTIR</button>
            </div>
          </div>
        )}

        {/* DİĞER EKRANLAR (AddAudit ve Units kısmını senin kodundaki gibi korudum) */}
        {activeTab === 'addAudit' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Seri Denetim Ekle</h2>
              <div className="space-y-4">
                <select className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 font-bold" value={newAudit.unitId} onChange={(e) => setNewAudit({...newAudit, unitId: e.target.value})}>
                  <option value="">Seçin...</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <input type="date" className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 font-bold" value={newAudit.date} onChange={(e) => setNewAudit({...newAudit, date: e.target.value})}/>
                <button onClick={handleAddAudit} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">Kaydı Tamamla</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'units' && (
           <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Yeni Birim Ekle</h2>
              <div className="space-y-4">
                <input type="text" placeholder="İl" className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 font-bold" value={newUnit.city} onChange={(e) => setNewUnit({...newUnit, city: e.target.value})}/>
                <input type="text" placeholder="İlçe" className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 font-bold" value={newUnit.district} onChange={(e) => setNewUnit({...newUnit, district: e.target.value})}/>
                <input type="text" placeholder="Birim Adı" className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 font-bold" value={newUnit.name} onChange={(e) => setNewUnit({...newUnit, name: e.target.value})}/>
                <button onClick={handleAddUnit} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold">Sisteme Kaydet</button>
              </div>
            </div>
           </div>
        )}

      </div>

      {/* ALT NAVİGASYON (Senin orijinal 4 butonlu barın) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center h-16 px-1 z-50 shadow-sm">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}>
          <List size={22} /><span className="text-[10px] font-bold">Liste</span>
        </button>
        <button onClick={() => setActiveTab('wheel')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'wheel' ? 'text-purple-600' : 'text-gray-400'}`}>
          <Dna size={22} /><span className="text-[10px] font-bold">Kura</span>
        </button>
        <button onClick={() => setActiveTab('addAudit')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'addAudit' ? 'text-blue-600' : 'text-gray-400'}`}>
          <History size={22} /><span className="text-[10px] font-bold">Kayıtlar</span>
        </button>
        <button onClick={() => setActiveTab('units')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'units' ? 'text-blue-600' : 'text-gray-400'}`}>
          <Settings size={22} /><span className="text-[10px] font-bold">Yönetim</span>
        </button>
      </div>

    </div>
  );
}
