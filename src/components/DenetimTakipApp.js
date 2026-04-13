import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Plus, Trash2, Search, CheckCircle2, MapPin, 
  History, ArrowLeft, AlertCircle, List, Settings 
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
      } catch (err) {}
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
      setErrorMsg("Bağlantı hatası!");
    }
  }, []);

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
    if (days <= 15) return `${days} Gün`;
    if (days <= 30) return `${days} Gün`;
    if (days <= 44) return `${days} Gün`;
    return `${days} Gün`;
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
      } catch (error) { setErrorMsg(`Kaydedilemedi: ${error.message}`); }
    } else {
      setErrorMsg('Lütfen tüm alanları doldurun.');
    }
  };

  const handleDeleteUnit = async (id) => {
    if(window.confirm('Birimi silmek istediğinize emin misiniz?')) {
      try { await deleteDoc(doc(db, 'bireysel_birimler', id)); } 
      catch (error) {}
    }
  };

  const handleAddAudit = async () => {
    const uid = auth.currentUser?.uid;
    if (newAudit.unitId && newAudit.date && uid) {
      try {
        setErrorMsg('');
        await addDoc(collection(db, 'bireysel_denetimler'), { 
          unitId: newAudit.unitId, date: newAudit.date, userId: uid
        });
        setNewAudit({...newAudit, unitId: ''}); // Sadece birimi sıfırla
      } catch (error) { setErrorMsg(`Hata: ${error.message}`); }
    }
  };

  const handleDeleteAudit = async (id) => {
    if(window.confirm('Kaydı silmek istediğinize emin misiniz?')) {
      try { await deleteDoc(doc(db, 'bireysel_denetimler', id)); } 
      catch (error) {}
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
        if (a.days === Infinity) return -1;
        if (b.days === Infinity) return 1;
        return b.days - a.days; // En aciller en üstte
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
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      
      {/* ÜST BAŞLIK BARI */}
      <div className="bg-white px-4 pt-6 pb-4 shadow-sm flex items-center justify-between sticky top-0 z-40">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-gray-800 transition rounded-full active:bg-gray-100">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold flex items-center gap-2 text-gray-800">
          <CheckCircle2 className="text-blue-600" size={22} />
          Denetim Takip
        </h1>
        <div className="w-8"></div> {/* Hizalama için boş div */}
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
            
            {/* Arama Kutusu */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="İl, ilçe veya birim ara..." 
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-none bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Renk Skalası (Yatay Kaydırılabilir) */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <div className="flex-none bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 flex items-center gap-1.5 text-xs font-bold text-gray-600">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> 0-15 Gün
              </div>
              <div className="flex-none bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 flex items-center gap-1.5 text-xs font-bold text-gray-600">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div> 16-30 Gün
              </div>
              <div className="flex-none bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 flex items-center gap-1.5 text-xs font-bold text-gray-600">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div> 31-44 Gün
              </div>
              <div className="flex-none bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 flex items-center gap-1.5 text-xs font-bold text-gray-600">
                <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div> 45+ Gün
              </div>
            </div>

            {/* Birim Kartları */}
            <div className="grid gap-3">
              {unitStats.map(unit => (
                <div key={unit.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-3 active:scale-[0.98] transition-transform">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${getStatusIndicatorColor(unit.days)} shadow-sm`}></div>
                    <div className="truncate">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide truncate">
                        {unit.city} {unit.district ? `• ${unit.district}` : ''}
                      </p>
                      <h3 className="font-bold text-gray-800 text-base truncate leading-tight mt-0.5">{unit.name}</h3>
                      <p className="text-[12px] text-gray-500 mt-1 flex items-center gap-1 font-medium">
                        <Calendar size={12} className="shrink-0" /> {formatDateDisplay(unit.lastAudit)}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${getStatusColor(unit.days)} text-center shrink-0`}>
                    {getStatusLabel(unit.days)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DENETİM EKLE VE GEÇMİŞ EKRANI */}
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
                    {[...units].sort((a,b) => a.city.localeCompare(b.city, 'tr') || a.name.localeCompare(b.name, 'tr')).map(u => (
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
                {audits.length === 0 && <div className="p-8 text-center text-gray-400 italic text-sm">Kayıt yok.</div>}
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

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden pb-4">
              <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                <span className="font-bold text-gray-700 text-sm">Kayıtlı Birimler</span>
                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-md font-bold">{units.length}</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                {[...units].sort((a,b) => a.city.localeCompare(b.city, 'tr') || a.name.localeCompare(b.name, 'tr')).map(unit => (
                  <div key={unit.id} className="p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition">
                    <div>
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                        {unit.city} {unit.district ? `• ${unit.district}` : ''}
                      </p>
                      <p className="font-bold text-gray-800 text-sm mt-0.5">{unit.name}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteUnit(unit.id)}
                      className="p-3 text-red-400 hover:bg-red-50 active:bg-red-100 rounded-xl transition"
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

      {/* FLOATİNG ACTİON BUTTON (Sadece Listede Görünür) */}
      {activeTab === 'dashboard' && (
        <button 
          onClick={() => setActiveTab('addAudit')}
          className="fixed bottom-24 right-5 bg-blue-600 text-white p-4 rounded-full shadow-[0_8px_20px_rgba(37,99,235,0.4)] hover:bg-blue-700 active:scale-95 transition-all z-40 flex items-center justify-center"
        >
          <Plus size={28} />
        </button>
      )}

      {/* MOBİL ALT NAVİGASYON BARI (Bütün sekmeleri yönetir) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center pb-safe z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] h-16 px-2">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <List size={22} className={activeTab === 'dashboard' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[10px] font-bold">Liste</span>
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
