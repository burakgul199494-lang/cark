import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Plus, Trash2, Search, CheckCircle2, MapPin, 
  TrendingUp, History, Filter, RotateCw, ArrowLeft 
} from 'lucide-react';

// FİREBASE BAĞLANTISI EKLENDİ
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

export default function DenetimTakipApp({ onBack }) {
  // State yönetimi (Artık boş başlıyor, Firebase'den dolacak)
  const [units, setUnits] = useState([]);
  const [audits, setAudits] = useState([]);

  const [newUnit, setNewUnit] = useState({ city: '', name: '' });
  const [newAudit, setNewAudit] = useState({ unitId: '', date: new Date().toISOString().split('T')[0] });
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCityForRec, setSelectedCityForRec] = useState('');
  const [shuffleKey, setShuffleKey] = useState(0);

  // FİREBASE'DEN VERİLERİ ÇEKME (Canlı Dinleme)
  useEffect(() => {
    const unsubUnits = onSnapshot(collection(db, 'units'), (snapshot) => {
      const unitsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUnits(unitsData);
    });

    const unsubAudits = onSnapshot(collection(db, 'audits'), (snapshot) => {
      const auditsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAudits(auditsData);
    });

    return () => {
      unsubUnits();
      unsubAudits();
    };
  }, []);

  // Yardımcı: Geçen gün sayısını hesapla
  const getDaysPassed = (lastDate) => {
    if (!lastDate) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const auditDate = new Date(lastDate);
    auditDate.setHours(0, 0, 0, 0);
    
    const diffTime = today - auditDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Renk Skalası
  const getStatusColor = (days) => {
    if (days === Infinity) return 'bg-gray-100 text-gray-500 border-gray-200';
    if (days <= 15) return 'bg-green-100 text-green-700 border-green-200';
    if (days >= 16 && days <= 30) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (days >= 31 && days <= 44) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (days >= 45) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const getStatusLabel = (days) => {
    if (days === Infinity) return 'Hiç Denetlenmedi';
    if (days === 0) return 'Bugün Gidildi';
    if (days <= 15) return `${days} Gün (Normal)`;
    if (days <= 30) return `${days} Gün (Dikkat)`;
    if (days <= 44) return `${days} Gün (Kritik)`;
    return `${days} Gün (Acil)`;
  };

  // İŞLEMLER (Firebase'e yazma ve silme)
  const handleAddUnit = async () => {
    if (newUnit.city && newUnit.name) {
      await addDoc(collection(db, 'units'), {
        city: newUnit.city,
        name: newUnit.name
      });
      setNewUnit({ city: '', name: '' });
      setActiveTab('dashboard');
    }
  };

  const handleDeleteUnit = async (id) => {
    if(window.confirm('Bu birimi silmek istediğinize emin misiniz?')) {
      await deleteDoc(doc(db, 'units', id));
    }
  };

  const handleAddAudit = async () => {
    if (newAudit.unitId && newAudit.date) {
      await addDoc(collection(db, 'audits'), {
        unitId: newAudit.unitId,
        date: newAudit.date
      });
      setActiveTab('dashboard');
    }
  };

  const handleDeleteAudit = async (id) => {
    if(window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
      await deleteDoc(doc(db, 'audits', id));
    }
  };

  const refreshRecommendations = () => setShuffleKey(prev => prev + 1);

  // Veri İşleme
  const unitStats = useMemo(() => {
    return units
      .map(unit => {
        const unitAudits = audits.filter(a => a.unitId === unit.id);
        const lastAudit = unitAudits.length > 0 
          ? unitAudits.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date 
          : null;
        const days = getDaysPassed(lastAudit);
        return { ...unit, lastAudit, days };
      })
      .filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.city.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const cityCompare = a.city.localeCompare(b.city, 'tr');
        if (cityCompare !== 0) return cityCompare;
        return a.name.localeCompare(b.name, 'tr');
      });
  }, [units, audits, searchTerm]);

  const auditHistory = useMemo(() => {
    return audits
      .map(audit => {
        const unit = units.find(u => u.id === audit.unitId);
        return { ...audit, unitName: unit ? unit.name : 'Silinmiş Birim', unitCity: unit ? unit.city : 'Bilinmiyor' };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [audits, units]);

  const availableCities = useMemo(() => {
    const cities = units.map(u => u.city);
    return [...new Set(cities)].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [units]);

  const recommendations = useMemo(() => {
    if (units.length === 0) return [];
    let baseUnits = [...unitStats];

    if (selectedCityForRec) {
      const cityCandidates = baseUnits
        .filter(u => u.city === selectedCityForRec)
        .sort((a, b) => {
          if (a.days === Infinity) return -1;
          if (b.days === Infinity) return 1;
          return b.days - a.days;
        });
      if (cityCandidates.length === 0) return [];
      const poolSize = Math.min(cityCandidates.length, 3);
      const randomIndex = (shuffleKey) % poolSize;
      const primary = cityCandidates.splice(randomIndex, 1)[0];
      return [primary, ...cityCandidates].slice(0, 3);
    } else {
      const globalCandidates = baseUnits.sort((a, b) => {
        if (a.days === Infinity) return -1;
        if (b.days === Infinity) return 1;
        return b.days - a.days;
      });
      if (globalCandidates.length === 0) return [];
      const poolSize = Math.min(globalCandidates.length, 5);
      const randomIndex = (shuffleKey) % poolSize;
      const primaryTarget = globalCandidates[randomIndex];

      const sameCityUnits = baseUnits
        .filter(u => u.city === primaryTarget.city && u.id !== primaryTarget.id)
        .sort((a, b) => (shuffleKey % 2 === 0 ? b.days - a.days : a.days - b.days));
      return [primaryTarget, ...sameCityUnits].slice(0, 3);
    }
  }, [unitStats, selectedCityForRec, shuffleKey]);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-32 p-3 md:p-0">
      
      {/* Üst Kısım: Menüye Dön ve Başlık */}
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <button onClick={onBack} className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors py-2">
          <ArrowLeft size={20} className="mr-1" /> Menü
        </button>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-gray-800 w-full md:w-auto justify-center md:justify-start">
          <CheckCircle2 className="text-blue-600" />
          Denetim Takip
        </h1>
        <button 
          onClick={() => setActiveTab('addAudit')}
          className="bg-blue-600 text-white px-4 py-3 md:py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-sm w-full md:w-auto justify-center"
        >
          <Plus size={18} /> Denetim Ekle
        </button>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* MOBİL UYUMLU NAVİGASYON (Grid yapısına geçirildi) */}
        <div className="grid grid-cols-3 bg-white p-1.5 rounded-xl shadow-sm border gap-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`py-3 text-[11px] md:text-sm font-bold rounded-lg transition text-center ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Birim Listesi
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`py-3 text-[11px] md:text-sm font-bold rounded-lg transition text-center ${activeTab === 'history' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Geçmiş
          </button>
          <button 
            onClick={() => setActiveTab('units')}
            className={`py-3 text-[11px] md:text-sm font-bold rounded-lg transition text-center ${activeTab === 'units' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Birim Yönetimi
          </button>
        </div>

        {/* Dashboard Görünümü */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
            {/* Öneriler Kartı */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-5 md:p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <TrendingUp size={100} />
              </div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 relative z-10">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp size={20} /> Bugün Nereye Gitmeliyim?
                  </h2>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm p-2 rounded-xl border border-white/20 flex-1">
                    <Filter size={16} className="ml-1 text-blue-200" />
                    <select 
                      className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer pr-2 w-full"
                      value={selectedCityForRec}
                      onChange={(e) => {
                        setSelectedCityForRec(e.target.value);
                        setShuffleKey(0);
                      }}
                    >
                      <option value="" className="text-gray-900">Tüm İller</option>
                      {availableCities.map(city => (
                        <option key={city} value={city} className="text-gray-900">{city}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={refreshRecommendations}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition group"
                  >
                    <RotateCw size={18} className="text-white group-active:rotate-180 transition-transform duration-500" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
                {recommendations.length > 0 ? recommendations.map((rec, idx) => (
                  <div key={`${rec.id}-${shuffleKey}`} className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl hover:bg-white/20 transition cursor-default">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[11px] font-bold uppercase text-blue-200">{rec.city}</span>
                      {idx === 0 && <span className="bg-red-500 text-[10px] px-2 py-0.5 rounded-full shadow-sm font-bold">Öncelikli</span>}
                    </div>
                    <p className="font-bold text-base md:text-sm">{rec.name}</p>
                    <p className="text-xs text-blue-100 mt-1 font-medium">
                      {rec.days === Infinity ? 'Hiç gidilmedi' : (rec.days === 0 ? 'Bugün denetlendi' : `${rec.days} gündür gidilmedi`)}
                    </p>
                  </div>
                )) : <p className="text-sm opacity-75 italic py-4">Uygun birim bulunamadı.</p>}
              </div>
            </div>

            {/* Arama ve Liste */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="İl veya birim ara..." 
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm font-medium text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="grid gap-3">
                {unitStats.map(unit => (
                  <div key={unit.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                      <div className={`p-3 rounded-lg ${getStatusColor(unit.days).split(' ')[0]} bg-opacity-30 shrink-0`}>
                        <MapPin className={getStatusColor(unit.days).split(' ')[1]} size={20} />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden md:inline">{unit.city}</span>
                          <h3 className="font-bold text-gray-800 text-sm md:text-base truncate">{unit.name}</h3>
                        </div>
                        <p className="text-[11px] md:text-xs text-gray-500 mt-1 flex items-center gap-1 font-medium">
                          <Calendar size={12} className="shrink-0" /> Son: {unit.lastAudit || 'Kayıt Yok'}
                        </p>
                      </div>
                    </div>
                    <div className={`px-2 py-1.5 md:px-3 md:py-1.5 rounded-lg text-[10px] md:text-[10px] font-bold border ${getStatusColor(unit.days)} shadow-sm whitespace-nowrap text-center shrink-0`}>
                      {getStatusLabel(unit.days)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Denetim Geçmişi Görünümü */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <History className="text-blue-600" /> Kayıtlar
              </h2>
              <span className="text-xs text-gray-500 font-bold bg-white px-3 py-1.5 rounded-lg border shadow-sm">Toplam: {audits.length}</span>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {auditHistory.map(audit => (
                  <div key={audit.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition group">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="bg-gray-100 p-3 rounded-lg text-gray-500 shrink-0">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter hidden md:inline">{audit.unitCity}</span>
                          <span className="h-1 w-1 rounded-full bg-gray-300 hidden md:inline"></span>
                          <p className="font-bold text-gray-800 text-sm">{audit.unitName}</p>
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-1">{audit.date}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteAudit(audit.id)}
                      className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition shrink-0"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
                {audits.length === 0 && (
                  <div className="p-12 text-center text-gray-400 italic text-sm">
                    Kayıtlı denetim bulunmuyor.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Denetim Ekle Görünümü (Form alanları büyütüldü) */}
        {activeTab === 'addAudit' && (
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in zoom-in-95 duration-300">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 border-b pb-4">
              <Plus className="text-blue-600" /> Yeni Denetim
            </h2>
            <div className="space-y-5 pt-2">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Birim Listesi</label>
                <select 
                  className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                  value={newAudit.unitId}
                  onChange={(e) => setNewAudit({...newAudit, unitId: e.target.value})}
                >
                  <option value="">Birim Seçiniz...</option>
                  {[...units].sort((a,b) => {
                    const c = a.city.localeCompare(b.city, 'tr');
                    return c !== 0 ? c : a.name.localeCompare(b.name, 'tr');
                  }).map(u => (
                    <option key={u.id} value={u.id}>{u.city} - {u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tarih</label>
                <input 
                  type="date" 
                  className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                  value={newAudit.date}
                  onChange={(e) => setNewAudit({...newAudit, date: e.target.value})}
                />
              </div>
              <div className="flex flex-col md:flex-row gap-3 pt-4">
                <button 
                  onClick={handleAddAudit}
                  disabled={!newAudit.unitId}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-200 order-1 md:order-2"
                >
                  Kaydı Tamamla
                </button>
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="w-full md:w-1/3 py-4 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition order-2 md:order-1"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Birim Yönetimi Görünümü */}
        {activeTab === 'units' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <MapPin className="text-green-600" /> Yeni Birim Ekle
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="İl (Örn: İzmir)" 
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                  value={newUnit.city}
                  onChange={(e) => setNewUnit({...newUnit, city: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Birim Adı" 
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                  value={newUnit.name}
                  onChange={(e) => setNewUnit({...newUnit, name: e.target.value})}
                />
              </div>
              <button 
                onClick={handleAddUnit}
                className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition shadow-md"
              >
                Sisteme Kaydet
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex justify-between items-center font-bold text-gray-700 text-sm">
                Kayıtlı Birimler ({units.length})
              </div>
              <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                {[...units].sort((a,b) => {
                  const c = a.city.localeCompare(b.city, 'tr');
                  return c !== 0 ? c : a.name.localeCompare(b.name, 'tr');
                }).map(unit => (
                  <div key={unit.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                    <div>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{unit.city}</p>
                      <p className="font-bold text-gray-800 text-sm md:text-base">{unit.name}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteUnit(unit.id)}
                      className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Renk Skalası Alt Bilgi (Mobilde Scroll eklendi) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t p-3 px-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40 overflow-x-auto no-scrollbar">
        <div className="flex justify-start md:justify-center gap-4 min-w-max pb-1">
          <div className="flex items-center gap-1.5 text-[11px] md:text-xs font-bold text-gray-600">
            <div className="w-3 h-3 rounded-full bg-green-400"></div> 0-15 G
          </div>
          <div className="flex items-center gap-1.5 text-[11px] md:text-xs font-bold text-gray-600">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div> 16-30 G
          </div>
          <div className="flex items-center gap-1.5 text-[11px] md:text-xs font-bold text-gray-600">
            <div className="w-3 h-3 rounded-full bg-orange-400"></div> 31-44 G
          </div>
          <div className="flex items-center gap-1.5 text-[11px] md:text-xs font-bold text-gray-600">
            <div className="w-3 h-3 rounded-full bg-red-500"></div> 45+ G
          </div>
        </div>
      </div>
    </div>
  );
}
