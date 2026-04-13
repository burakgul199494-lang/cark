import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Plus, Trash2, Search, CheckCircle2, MapPin, 
  History, ArrowLeft, AlertCircle 
} from 'lucide-react';

import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, getDoc, setDoc } from 'firebase/firestore';

export default function DenetimTakipApp({ onBack }) {
  const [units, setUnits] = useState([]);
  const [audits, setAudits] = useState([]);

  const [newUnit, setNewUnit] = useState({ city: '', district: '', name: '' });
  const [newAudit, setNewAudit] = useState({ unitId: '', date: new Date().toISOString().split('T')[0] });
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // SADECE GİRİŞ YAPAN KULLANICIYI DİNLE
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
            { city: 'Aydın', district: 'Didim', name: 'Didim' },
            { city: 'Aydın', district: 'Didim', name: 'Didim Akbük' },
            { city: 'Aydın', district: 'Didim', name: 'Didim Çarşı' },
            { city: 'Aydın', district: 'İncirliova', name: 'İncirliova' },
            { city: 'Aydın', district: 'Kuşadası', name: 'Kuşadası' },
            { city: 'Aydın', district: 'Kuşadası', name: 'Kuşadası Davutlar' },
            { city: 'Aydın', district: 'Kuşadası', name: 'Kuşadası Flora' },
            { city: 'Aydın', district: 'Efeler', name: 'Merkez' },
            { city: 'Aydın', district: 'Efeler', name: 'Mimar Sinan' },
            { city: 'Aydın', district: 'Nazilli', name: 'Nazilli' },
            { city: 'Aydın', district: 'Söke', name: 'Söke' },
            { city: 'Aydın', district: 'Söke', name: 'Söke Cumhuriyet' },
            { city: 'Aydın', district: 'Aydın Merkez', name: 'Zeybek' },
            { city: 'Denizli', district: 'Merkezefendi', name: 'Albayrak' },
            { city: 'Denizli', district: 'Pamukkale', name: 'Bağbaşı' },
            { city: 'Denizli', district: 'Denizli Merkez', name: 'Çamlık' },
            { city: 'Denizli', district: 'Merkezefendi', name: 'Çaybaşı' },
            { city: 'Denizli', district: 'Merkezefendi', name: 'Servergazi' },
            { city: 'Denizli', district: 'Merkezefendi', name: 'Yenişafak' },
            { city: 'İzmir', district: 'Çeşme', name: 'Alaçatı' },
            { city: 'İzmir', district: 'Torbalı', name: 'Ayrancılar' },
            { city: 'İzmir', district: 'Balçova', name: 'Balçova' },
            { city: 'İzmir', district: 'Çeşme', name: 'Çeşme' },
            { city: 'İzmir', district: 'Buca', name: 'Fırat Mahallesi' },
            { city: 'İzmir', district: 'Konak', name: 'Göztepe' },
            { city: 'İzmir', district: 'Güzelbahçe', name: 'Güzelbahçe' },
            { city: 'İzmir', district: 'Konak', name: 'Hatay' },
            { city: 'İzmir', district: 'Karabağlar', name: 'Karabağlar' },
            { city: 'İzmir', district: 'Kemalpaşa', name: 'Kemalpaşa' },
            { city: 'İzmir', district: 'Menderes', name: 'Menderes' },
            { city: 'İzmir', district: 'Narlıdere', name: 'Narlıdere' },
            { city: 'İzmir', district: 'Ödemiş', name: 'Ödemiş' },
            { city: 'İzmir', district: 'Menderes', name: 'Özdere' },
            { city: 'İzmir', district: 'Seferihisar', name: 'Seferihisar' },
            { city: 'İzmir', district: 'Selçuk', name: 'Selçuk' },
            { city: 'İzmir', district: 'Torbalı', name: 'Torbalı' },
            { city: 'İzmir', district: 'Torbalı', name: 'Torbalı Alpkent' },
            { city: 'İzmir', district: 'Konak', name: 'Üçyol' },
            { city: 'İzmir', district: 'Kemalpaşa', name: 'Ulucak' },
            { city: 'İzmir', district: 'Seferihisar', name: 'Ürkmez' },
            { city: 'İzmir', district: 'Urla', name: 'Urla' },
            { city: 'İzmir', district: 'Karabağlar', name: 'Yeşilyurt' },
            { city: 'Manisa', district: 'Saruhanlı', name: 'Saruhanlı' },
            { city: 'Muğla', district: 'Bodrum', name: 'Gümbet' },
            { city: 'Muğla', district: 'Bodrum', name: 'Ortakent' },
            { city: 'Muğla', district: 'Milas', name: 'Milas' },
            { city: 'Muğla', district: 'Menteşe', name: 'Mumcular' },
            { city: 'Muğla', district: 'Milas', name: 'Ören' },
            { city: 'Muğla', district: 'Bodrum', name: 'Turgutreis' },
            { city: 'Muğla', district: 'Bodrum', name: 'Yalıkavak' },
            { city: 'Muğla', district: 'Yatağan', name: 'Yatağan' }
          ];

          for (const u of defaultUnits) {
            await addDoc(collection(db, 'bireysel_birimler'), { ...u, userId: uid });
          }

          await setDoc(flagRef, { baslangicBirimleriEklendi: true }, { merge: true });
        }
      } catch (err) {
        console.error("Varsayılan birimler yüklenemedi:", err);
      }
    };

    initializeDefaultUnits();

    try {
      const qUnits = query(collection(db, 'bireysel_birimler'), where("userId", "==", uid));
      const unsubUnits = onSnapshot(qUnits, (snapshot) => {
        const unitsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUnits(unitsData);
      });

      const qAudits = query(collection(db, 'bireysel_denetimler'), where("userId", "==", uid));
      const unsubAudits = onSnapshot(qAudits, (snapshot) => {
        const auditsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAudits(auditsData);
      });

      return () => {
        unsubUnits();
        unsubAudits();
      };
    } catch (error) {
      setErrorMsg("Bağlantı hatası veya yetki reddedildi!");
    }
  }, []);

  // Tarihi YYYY-MM-DD'den DD-MM-YYYY formatına çeviren yardımcı fonksiyon
  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'Kayıt Yok';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
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
    if (days <= 15) return 'bg-green-100 text-green-700 border-green-200';
    if (days >= 16 && days <= 30) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (days >= 31 && days <= 44) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (days >= 45) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const getStatusLabel = (days) => {
    if (days === Infinity) return 'Hiç Gidilmedi';
    if (days === 0) return 'Bugün Gidildi';
    if (days <= 15) return `${days} Gün (Normal)`;
    if (days <= 30) return `${days} Gün (Dikkat)`;
    if (days <= 44) return `${days} Gün (Kritik)`;
    return `${days} Gün (Acil)`;
  };

  const handleAddUnit = async () => {
    const uid = auth.currentUser?.uid;
    if (newUnit.city && newUnit.name && newUnit.district && uid) {
      try {
        setErrorMsg('');
        await addDoc(collection(db, 'bireysel_birimler'), {
          city: newUnit.city.trim(),
          district: newUnit.district.trim(),
          name: newUnit.name.trim(),
          userId: uid
        });
        setNewUnit({ city: '', district: '', name: '' });
        setActiveTab('dashboard');
      } catch (error) {
        setErrorMsg(`Kaydedilemedi: ${error.message}`);
      }
    } else {
      setErrorMsg('Lütfen İl, İlçe ve Birim Adı alanlarını doldurun.');
    }
  };

  const handleDeleteUnit = async (id) => {
    if(window.confirm('Bu birimi silmek istediğinize emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'bireysel_birimler', id));
      } catch (error) { setErrorMsg(`Silinemedi: ${error.message}`); }
    }
  };

  const handleAddAudit = async () => {
    const uid = auth.currentUser?.uid;
    if (newAudit.unitId && newAudit.date && uid) {
      try {
        setErrorMsg('');
        await addDoc(collection(db, 'bireysel_denetimler'), { 
          unitId: newAudit.unitId, 
          date: newAudit.date,
          userId: uid
        });
        // Sadece Birim seçimini sıfırla, tarihi sabit bırak ki peş peşe giriş kolaylaşsın.
        setNewAudit({...newAudit, unitId: ''});
        // setActiveTab('dashboard'); // --> YÖNLENDİRME İPTAL EDİLDİ
      } catch (error) { setErrorMsg(`Kaydedilemedi: ${error.message}`); }
    }
  };

  const handleDeleteAudit = async (id) => {
    if(window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
      try { await deleteDoc(doc(db, 'bireysel_denetimler', id)); } 
      catch (error) { setErrorMsg(`Silinemedi: ${error.message}`); }
    }
  };

  const unitStats = useMemo(() => {
    return units
      .map(unit => {
        const unitAudits = audits.filter(a => a.unitId === unit.id);
        const lastAudit = unitAudits.length > 0 
          ? unitAudits.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date 
          : null;
        return { ...unit, lastAudit, days: getDaysPassed(lastAudit) };
      })
      .filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.district && u.district.toLowerCase().includes(searchTerm.toLowerCase()))
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

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-32 p-3 md:p-0">
      
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <button onClick={onBack} className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors py-2">
          <ArrowLeft size={20} className="mr-1" /> Menü
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg flex items-center gap-3">
          <AlertCircle className="text-red-500 shrink-0" size={24} />
          <p className="text-sm font-medium text-red-700">{errorMsg}</p>
        </div>
      )}

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

        {activeTab === 'dashboard' && (
          <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="İl, ilçe veya birim ara..." 
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
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{unit.city} {unit.district ? `/ ${unit.district}` : ''}</span>
                          <h3 className="font-bold text-gray-800 text-sm md:text-base truncate">{unit.name}</h3>
                        </div>
                        <p className="text-[11px] md:text-xs text-gray-500 mt-1 flex items-center gap-1 font-medium">
                          <Calendar size={12} className="shrink-0" /> Son: {formatDateDisplay(unit.lastAudit)}
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

        {/* Ana Geçmiş Görünümü */}
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
                        <p className="text-xs text-gray-500 font-medium mt-1">{formatDateDisplay(audit.date)}</p>
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
                  <div className="p-12 text-center text-gray-400 italic text-sm">Kayıtlı denetim bulunmuyor.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DENETİM EKLE VE GEÇMİŞİ (BİRLEŞTİRİLMİŞ) */}
        {activeTab === 'addAudit' && (
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
            {/* Form Kısmı */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 border-b pb-4">
                <Plus className="text-blue-600" /> Seri Denetim Ekle
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
                      <option key={u.id} value={u.id}>{u.city} {u.district ? `(${u.district})` : ''} - {u.name}</option>
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

            {/* Geçmiş Kısmı (Ekleme sayfasının altında) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex justify-between items-center font-bold text-gray-700 text-sm">
                <span className="flex items-center gap-2"><History size={18} className="text-gray-500" /> Son Girilen Denetimler</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
                {auditHistory.map(audit => (
                  <div key={audit.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                    <div>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{audit.unitCity}</p>
                      <p className="font-bold text-gray-800 text-sm">{audit.unitName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDateDisplay(audit.date)}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteAudit(audit.id)}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
                {audits.length === 0 && (
                  <div className="p-8 text-center text-gray-400 italic text-sm">Henüz kayıt yok.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'units' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <MapPin className="text-green-600" /> Yeni Birim Ekle
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input 
                  type="text" 
                  placeholder="İl (Örn: İzmir)" 
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                  value={newUnit.city}
                  onChange={(e) => setNewUnit({...newUnit, city: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="İlçe / Bölge (Örn: Buca)" 
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                  value={newUnit.district}
                  onChange={(e) => setNewUnit({...newUnit, district: e.target.value})}
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
                  if (c !== 0) return c;
                  const d = (a.district || '').localeCompare((b.district || ''), 'tr');
                  return d !== 0 ? d : a.name.localeCompare(b.name, 'tr');
                }).map(unit => (
                  <div key={unit.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                    <div>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        {unit.city} {unit.district ? `• ${unit.district}` : ''}
                      </p>
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
