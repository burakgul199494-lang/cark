// src/components/DenetimSekmeleri.js

import React, { useState, useMemo } from 'react';
import { Calendar, Plus, Trash2, Search, CheckCircle2, MapPin, History, Dna, Zap, FileText, X, Shuffle, CalendarPlus, CalendarDays, Download, Ban, CheckCircle, AlertTriangle } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { TURKEY_DATA, getLocalYYYYMMDD, formatDateDisplay, getDaysPassed, getStatusColor, getStatusIndicatorColor, getStatusLabel, filterOptions } from '../utils/denetimVerileri';

export function DashboardView({ 
  units, 
  audits, 
  plans, 
  openUnitDetail, 
  setQuickPlanUnit, 
  setQuickPlanDate, 
  setQuickAuditUnit, 
  setQuickAuditDate, 
  handleQuickAddAudit, 
  handleDeletePlan, 
  handleCompletePlan 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all'); 
  const [selectedCityFilter, setSelectedCityFilter] = useState('all'); 

  const activeCities = useMemo(() => [...new Set(units.map(u => u.city))].sort((a,b) => a.localeCompare(b, 'tr')), [units]);

  const todaysPlans = useMemo(() => {
    const todayStr = getLocalYYYYMMDD();
    return plans.filter(p => p.date === todayStr).map(p => {
      const u = units.find(u => u.id === p.unitId);
      return { ...p, unitName: u ? u.name : 'Bilinmeyen Şube', district: u ? u.district : '' };
    });
  }, [plans, units]);

  const unitStats = useMemo(() => {
    const searchTR = searchTerm.toLocaleLowerCase('tr-TR');
    return units.map(unit => {
      const unitAudits = audits.filter(a => a.unitId === unit.id);
      const unitPlans = plans.filter(p => p.unitId === unit.id && p.date >= getLocalYYYYMMDD()).sort((a,b) => new Date(a.date) - new Date(b.date));
      const lastAuditObj = unitAudits.length > 0 ? unitAudits.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;
      return { 
        ...unit, 
        lastAudit: lastAuditObj ? lastAuditObj.date : null, 
        latestNote: lastAuditObj ? lastAuditObj.note : null, 
        totalVisits: unitAudits.length, 
        days: getDaysPassed(lastAuditObj ? lastAuditObj.date : null), 
        nextPlan: unitPlans.length > 0 ? unitPlans[0] : null
      };
    }).filter(u => {
      const uName = u.name.toLocaleLowerCase('tr-TR'); 
      const uDist = u.district.toLocaleLowerCase('tr-TR'); 
      const uCity = u.city.toLocaleLowerCase('tr-TR');
      return uName.includes(searchTR) || uDist.includes(searchTR) || uCity.includes(searchTR);
    }).filter(u => selectedCityFilter === 'all' || u.city === selectedCityFilter).filter(u => {
      if (urgencyFilter === 'all') return true;
      if (urgencyFilter === '0-15') return u.days <= 15;
      if (urgencyFilter === '16-30') return u.days >= 16 && u.days <= 30;
      if (urgencyFilter === '31-44') return u.days >= 31 && u.days <= 44;
      if (urgencyFilter === '45+') return u.days >= 45 && u.days !== Infinity;
      if (urgencyFilter === 'infinity') return u.days === Infinity;
      return true;
    }).sort((a, b) => {
      const cityCompare = a.city.localeCompare(b.city, 'tr');
      if (cityCompare !== 0) return cityCompare;
      return a.name.localeCompare(b.name, 'tr');
    });
  }, [units, audits, plans, searchTerm, urgencyFilter, selectedCityFilter]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Bugünün Planları */}
      {todaysPlans.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 shadow-lg text-white">
          <h3 className="font-bold text-sm flex items-center gap-2 mb-3 opacity-90"><Calendar size={16} /> Bugünün Planları</h3>
          <div className="space-y-2">
            {todaysPlans.map(plan => (
              <div key={plan.id} className="bg-white/10 p-3 rounded-xl flex items-center justify-between border border-white/20">
                <div>
                  <p className="font-bold text-sm leading-tight">{plan.unitName}</p>
                  <p className="text-[10px] opacity-75">{plan.district}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={(e) => handleDeletePlan(plan.id, e)} className="p-2 bg-red-500/20 text-red-100 rounded-lg"><X size={16} /></button>
                  <button onClick={(e) => handleCompletePlan(plan, e)} className="px-3 py-1.5 bg-white text-blue-600 text-xs font-bold rounded-lg flex items-center gap-1 active:scale-95 transition"><Check size={14} /> Gidildi</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Arama ve Filtreler */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Şube veya İlçe Ara..." className="w-full pl-10 pr-3 py-3.5 rounded-2xl border-none bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="w-1/3 px-2 py-3.5 rounded-2xl border-none bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-xs text-center truncate" value={selectedCityFilter} onChange={(e) => setSelectedCityFilter(e.target.value)}>
          <option value="all">İl</option>
          {activeCities.map(city => <option key={city} value={city}>{city}</option>)}
        </select>
      </div>

      {/* Aciliyet Filtreleri */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {filterOptions.map(f => (
          <button key={f.value} onClick={() => setUrgencyFilter(f.value)} className={`flex-none px-3 py-1.5 rounded-lg shadow-sm border flex items-center gap-1.5 text-xs font-bold transition-all ${urgencyFilter === f.value ? 'bg-blue-50 border-blue-200 text-blue-700 scale-[1.02]' : 'bg-white border-gray-100 text-gray-600'}`}>
            {f.value !== 'all' && f.value !== 'infinity' && <div className={`w-2.5 h-2.5 rounded-full ${f.color}`}></div>}
            {f.label}
          </button>
        ))}
      </div>

      {/* Birim Kartları */}
      <div className="grid gap-3">
        {unitStats.map(unit => {
          const isInactive = unit.isActive === false;
          return (
            <div key={unit.id} onClick={() => openUnitDetail(unit)} className={`bg-white p-4 rounded-2xl shadow-sm border flex flex-col gap-3 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden ${isInactive ? 'border-red-200 opacity-80' : 'border-gray-100'}`}>
              <div className={`absolute top-0 left-0 w-1.5 h-full ${getStatusIndicatorColor(unit.days, unit.isActive)}`}></div>
              
              {/* 1. Satır: İl - İlçe */}
              <p className={`text-[10px] font-bold uppercase tracking-wide truncate pl-1 ${isInactive ? 'text-red-400' : 'text-gray-400'}`}>
                {unit.city} {unit.district ? `• ${unit.district}` : ''} {isInactive && '• KAPALI'}
              </p>

              {/* 2. Satır: Birim Adı */}
              <h3 className={`font-black text-lg leading-tight truncate pl-1 ${isInactive ? 'text-gray-500 line-through decoration-red-300' : 'text-gray-800'}`}>
                {unit.name}
              </h3>

              {/* 3. Satır: İstatistikler */}
              <div className="flex items-center gap-2 pl-1">
                <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md shrink-0 border border-gray-100">
                   <Calendar size={12} className="text-gray-400" />
                   <span className="text-[11px] font-bold text-gray-600">{formatDateDisplay(unit.lastAudit)}</span>
                </div>
                
                <div className={`px-2 py-1 rounded-md text-[11px] font-extrabold border shrink-0 ${getStatusColor(unit.days, unit.isActive)}`}>
                  {getStatusLabel(unit.days, unit.isActive)}
                </div>

                <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md shrink-0 border border-gray-100">
                   <History size={12} className="text-gray-400" />
                   <span className="text-[11px] font-bold text-gray-600">{unit.totalVisits}</span>
                </div>
              </div>

              {/* Plan Bilgisi */}
              {unit.nextPlan && (
                <div className="flex items-center gap-1 text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100 w-fit ml-1">
                  <CalendarPlus size={12} /> Planlı: {formatDateDisplay(unit.nextPlan.date)}
                </div>
              )}

              {/* 4. Satır: Butonlar */}
              <div className="flex items-center gap-2 pt-1 pl-1">
                 <button disabled={isInactive} onClick={(e) => { e.stopPropagation(); setQuickPlanUnit(unit); setQuickPlanDate(getLocalYYYYMMDD()); }} 
                   className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold py-3 rounded-xl transition-colors ${isInactive ? 'bg-gray-50 text-gray-300' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}
                 >
                   <CalendarPlus size={14} /> Planla
                 </button>
                 <button disabled={isInactive} onClick={(e) => { e.stopPropagation(); setQuickAuditUnit(unit); setQuickAuditDate(getLocalYYYYMMDD()); }} 
                   className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold py-3 rounded-xl transition-colors ${isInactive ? 'bg-gray-50 text-gray-300' : 'bg-teal-50 text-teal-600 border border-teal-100'}`}
                 >
                   <Plus size={14} /> Ekle
                 </button>
                 <button disabled={isInactive} onClick={(e) => handleQuickAddAudit(unit.id, e)} 
                   className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold py-3 rounded-xl transition-colors ${isInactive ? 'bg-gray-50 text-gray-300' : 'bg-blue-600 text-white shadow-sm shadow-blue-200'}`}
                 >
                   <Zap size={14} fill="white" /> Bugün
                 </button>
              </div>

              {/* Not Önizleme */}
              {unit.latestNote && (
                <div className="flex items-start gap-1.5 text-[11px] text-gray-500 bg-gray-50/50 p-2 rounded-lg border border-dashed border-gray-200 ml-1">
                  <FileText size={12} className="mt-0.5 shrink-0 text-gray-400" />
                  <p className="line-clamp-1 italic">{unit.latestNote}</p>
                </div>
              )}
            </div>
          )
        })}
        {unitStats.length === 0 && <div className="p-8 text-center text-gray-400 italic text-sm bg-white rounded-2xl shadow-sm border border-gray-100">Uygun birim bulunamadı.</div>}
      </div>
    </div>
  );
}

// --- 2. WEEKLY PLANS VIEW ---
export function WeeklyPlansView({ plans, units, handleDeletePlan, setErrorMsg }) {
  const handleExportPlansExcel = () => {
    if (plans.length === 0) { setErrorMsg("Dışa aktarılacak plan bulunmuyor."); return; }
    const plansByDate = {};
    plans.forEach(plan => {
      const u = units.find(x => x.id === plan.unitId);
      if (!plansByDate[plan.date]) plansByDate[plan.date] = [];
      plansByDate[plan.date].push(u ? u.name : 'Bilinmeyen Şube');
    });
    const sortedDates = Object.keys(plansByDate).sort((a, b) => new Date(a) - new Date(b));
    let maxRows = 0;
    sortedDates.forEach(d => { if (plansByDate[d].length > maxRows) maxRows = plansByDate[d].length; });

    let csvContent = "\uFEFF"; 
    csvContent += sortedDates.map(d => `"${formatDateDisplay(d)}"`).join(',') + "\n";
    for (let i = 0; i < maxRows; i++) {
      csvContent += sortedDates.map(d => plansByDate[d][i] ? `"${plansByDate[d][i]}"` : '""').join(',') + "\n";
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.setAttribute("href", url);
    link.setAttribute("download", `Haftalik_Planlar_${getLocalYYYYMMDD()}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><CalendarDays size={18} className="text-purple-600" /><span className="font-bold text-gray-800 text-sm">Tüm Planlar</span></div>
        <button onClick={handleExportPlansExcel} className="flex items-center gap-1.5 text-xs font-bold bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200 hover:bg-green-100 transition active:scale-95"><Download size={14}/> Excel'e Aktar</button>
      </div>

      {plans.length === 0 ? (
        <div className="p-8 text-center text-gray-400 italic text-sm bg-white rounded-2xl shadow-sm border border-gray-100">Henüz yapılmış bir planınız bulunmuyor.</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(plans.reduce((acc, plan) => { (acc[plan.date] = acc[plan.date] || []).push(plan); return acc; }, {})).sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB)).map(([date, dayPlans]) => (
            <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 font-bold text-gray-700 flex items-center gap-2"><CalendarDays size={16} className="text-purple-600"/> {formatDateDisplay(date)}</div>
              <div className="divide-y divide-gray-50">
                {dayPlans.map(plan => {
                  const u = units.find(x => x.id === plan.unitId);
                  return (
                    <div key={plan.id} className="p-4 flex justify-between items-center">
                      <div><p className="font-bold text-sm text-gray-800">{u?.name || 'Bilinmeyen'}</p><p className="text-xs text-gray-500">{u?.district} / {u?.city}</p></div>
                      <button onClick={(e) => handleDeletePlan(plan.id, e)} className="text-red-400 p-2 bg-red-50 hover:bg-red-100 rounded-lg transition"><Trash2 size={16} /></button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- 3. UNIT DETAIL VIEW ---
export function UnitDetailView({ unit, units, audits, plans, handleAddPlan, setPendingAudit, setErrorMsg }) {
  const [planDate, setPlanDate] = useState(getLocalYYYYMMDD()); 
  const [detailAuditDate, setDetailAuditDate] = useState(getLocalYYYYMMDD());
  const uAudits = audits.filter(a => a.unitId === unit.id).sort((a,b) => new Date(b.date) - new Date(a.date));
  const isInactive = unit.isActive === false;
  const daysPassed = getDaysPassed(uAudits.length > 0 ? uAudits[0].date : null);

  const handleDeleteAudit = async (id) => {
    if(window.confirm('Kaydı silmek istediğinize emin misiniz?')) {
      try { await deleteDoc(doc(db, 'bireysel_denetimler', id)); } catch (error) {}
    }
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-1 ${getStatusIndicatorColor(daysPassed, unit.isActive)}`}></div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className={`text-xl font-bold ${isInactive ? 'text-gray-500 line-through decoration-red-300' : 'text-gray-800'}`}>{unit.name}</h2>
            <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-1"><MapPin size={14}/> {unit.city} / {unit.district}</p>
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border ${getStatusColor(daysPassed, unit.isActive)}`}>{getStatusLabel(daysPassed, unit.isActive)}</div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Toplam Ziyaret</p>
            <p className="text-xl font-black text-blue-600">{uAudits.length}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Son Ziyaret</p>
            <p className="text-sm font-bold text-gray-700 mt-1.5">{formatDateDisplay(uAudits.length > 0 ? uAudits[0].date : null)}</p>
          </div>
        </div>

        {isInactive ? (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 text-center font-bold text-sm flex items-center justify-center gap-2"><Ban size={18} /> Bu şube geçici olarak kapalıdır.</div>
        ) : (
          <>
            <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
              <label className="text-xs font-bold text-purple-800 flex items-center gap-1 mb-2"><CalendarPlus size={14}/> Bu Şubeye Plan Yap</label>
              <div className="flex gap-2">
                <input type="date" className="flex-1 p-2 rounded-lg border border-purple-200 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-400" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
                <button onClick={() => handleAddPlan(unit.id, planDate)} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm active:scale-95 transition">Planla</button>
              </div>
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <label className="text-xs font-bold text-blue-800 flex items-center gap-1 mb-2"><CheckCircle2 size={14}/> Ziyaret Kaydı Ekle</label>
              <div className="flex gap-2">
                <input type="date" className="flex-1 p-2 rounded-lg border border-blue-200 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-400" value={detailAuditDate} onChange={(e) => setDetailAuditDate(e.target.value)} />
                <button onClick={() => {
                    const existingAudit = audits.find(a => a.date === detailAuditDate && a.unitId === unit.id);
                    if (existingAudit) { setErrorMsg(`${formatDateDisplay(detailAuditDate)} tarihinde bu şubeye zaten gidilmiş!`); return; }
                    const existingPlan = plans.find(p => p.unitId === unit.id && p.date === detailAuditDate);
                    setPendingAudit({ unitId: unit.id, date: detailAuditDate, planId: existingPlan?.id, step: 'ask' });
                  }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm active:scale-95 transition">Ekle</button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><History size={16} className="text-blue-500" /> Ziyaret Geçmişi</h3>
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
          {uAudits.map((a, i) => (
            <div key={a.id} className="flex flex-col p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700">{formatDateDisplay(a.date)}</span>
                  {i === 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">SON ZİYARET</span>}
                </div>
                <button onClick={() => handleDeleteAudit(a.id)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition" title="Kaydı Sil"><Trash2 size={16} /></button>
              </div>
              {a.note && <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded-lg border border-gray-100 italic"><FileText size={12} className="inline mr-1 text-gray-400" />{a.note}</div>}
            </div>
          ))}
          {uAudits.length === 0 && <p className="text-sm text-gray-400 italic py-2 text-center">Henüz ziyaret kaydı yok.</p>}
        </div>
      </div>
    </div>
  );
}

// --- 4. WHEEL VIEW ---
export function WheelView({ units, audits, handleAddPlan }) {
  const [wheelCityFilter, setWheelCityFilter] = useState('all');
  const [wheelUrgencyFilter, setWheelUrgencyFilter] = useState('all');
  const [isSpinning, setIsSpinning] = useState(false);
  const [flashingUnitName, setFlashingUnitName] = useState('');
  const [wheelResult, setWheelResult] = useState(null);
  
  const activeCities = useMemo(() => [...new Set(units.map(u => u.city))].sort((a,b) => a.localeCompare(b, 'tr')), [units]);

  const handleSpinWheel = () => {
    const eligibleUnits = units.map(unit => {
      const unitAudits = audits.filter(a => a.unitId === unit.id);
      const lastAudit = unitAudits.length > 0 ? unitAudits.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date : null;
      return { ...unit, days: getDaysPassed(lastAudit) };
    }).filter(u => wheelCityFilter === 'all' || u.city === wheelCityFilter).filter(u => u.isActive !== false)
      .filter(u => {
        if (wheelUrgencyFilter === 'all') return true;
        if (wheelUrgencyFilter === '0-15') return u.days <= 15;
        if (wheelUrgencyFilter === '16-30') return u.days >= 16 && u.days <= 30;
        if (wheelUrgencyFilter === '31-44') return u.days >= 31 && u.days <= 44;
        if (wheelUrgencyFilter === '45+') return u.days >= 45 && u.days !== Infinity;
        if (wheelUrgencyFilter === 'infinity') return u.days === Infinity;
        return true;
      });

    if (eligibleUnits.length === 0) { alert("Bu filtrelere uygun aktif şube bulunamadı!"); return; }

    setIsSpinning(true); setWheelResult(null); let spins = 0;
    const interval = setInterval(() => {
      const randomInd = Math.floor(Math.random() * eligibleUnits.length);
      setFlashingUnitName(eligibleUnits[randomInd].name); spins++;
      if (spins > 25) { 
        clearInterval(interval);
        setWheelResult(eligibleUnits[Math.floor(Math.random() * eligibleUnits.length)]);
        setFlashingUnitName(''); setIsSpinning(false);
      }
    }, 100);
  };

  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-300">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
        <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-200 mb-4 rotate-3"><Shuffle size={32} className="text-white" /></div>
        <h2 className="text-xl font-black text-gray-800 mb-2">Şube Radarı</h2>
        <p className="text-sm text-gray-500 mb-6 px-4">Bugün nereye gideceğinize karar veremediyseniz, filtreleri seçin ve radarı çalıştırın!</p>
        
        <div className="grid grid-cols-2 gap-3 mb-6 text-left">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">İl Filtresi</label>
            <select className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-700 outline-none" value={wheelCityFilter} onChange={e => setWheelCityFilter(e.target.value)}>
              <option value="all">Tüm İller</option>
              {activeCities.map(city => <option key={city} value={city}>{city}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Aciliyet</label>
            <select className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-700 outline-none" value={wheelUrgencyFilter} onChange={e => setWheelUrgencyFilter(e.target.value)}>
              <option value="all">Farketmez</option>
              <option value="infinity">Hiç Gidilmedi</option>
              <option value="16-30">16-30 Gün (Sarı)</option>
              <option value="31-44">31-44 Gün (Turuncu)</option>
              <option value="45+">45+ Gün (Kırmızı)</option>
            </select>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 min-h-[140px] flex items-center justify-center relative overflow-hidden mb-6 shadow-inner border-[4px] border-gray-800">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-gray-900 to-gray-900 pointer-events-none"></div>
          {isSpinning ? (
            <div className="text-center z-10"><p className="text-blue-400 text-xs font-bold uppercase tracking-[0.2em] mb-2 animate-pulse">Aranıyor...</p><p className="text-2xl font-black text-white truncate px-4">{flashingUnitName}</p></div>
          ) : wheelResult ? (
            <div className="text-center z-10 animate-in zoom-in duration-300">
              <p className="text-green-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">Hedef Bulundu</p>
              <h3 className="text-3xl font-black text-white mb-1">{wheelResult.name}</h3>
              <p className="text-gray-400 text-sm">{wheelResult.city} / {wheelResult.district}</p>
              <div className="flex gap-2 justify-center mt-3">
                <button onClick={async () => { const success = await handleAddPlan(wheelResult.id, getLocalYYYYMMDD()); if (success) { setWheelResult(null); setFlashingUnitName(''); } }} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 transition shadow-lg shadow-purple-600/30"><CalendarPlus size={16}/> Bugüne Planla</button>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 font-medium z-10 text-sm">Başlamak için butona basın</div>
          )}
        </div>
        <button onClick={handleSpinWheel} disabled={isSpinning} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-black text-lg shadow-[0_10px_20px_rgba(79,70,229,0.3)] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {isSpinning ? 'Radarlanıyor...' : 'Radarı Çalıştır'} <Zap size={20} className={isSpinning ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  );
}

// --- 5. RECORDS VIEW ---
export function RecordsView({ units, audits, plans, setPendingAudit, setErrorMsg }) {
  const [newAudit, setNewAudit] = useState({ unitId: '', date: getLocalYYYYMMDD() });
  const [recordsDateFilter, setRecordsDateFilter] = useState(''); 

  const auditHistory = useMemo(() => {
    return audits.filter(a => !recordsDateFilter || a.date === recordsDateFilter).map(audit => {
      const unit = units.find(u => u.id === audit.unitId);
      return { ...audit, unitName: unit ? unit.name : 'Silinmiş Birim', unitCity: unit ? unit.city : 'Bilinmiyor' };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [audits, units, recordsDateFilter]);

  const handleAddAudit = () => {
    if (newAudit.unitId && newAudit.date) {
      const u = units.find(x => x.id === newAudit.unitId);
      if (u && u.isActive === false) { setErrorMsg('Bu şube kapalı! Ziyaret eklenemez.'); return; }
      const existingAudit = audits.find(a => a.date === newAudit.date && a.unitId === newAudit.unitId);
      if (existingAudit) { setErrorMsg(`${formatDateDisplay(newAudit.date)} tarihinde bu şubeye zaten gidilmiş!`); return; }
      const existingPlan = plans.find(p => p.unitId === newAudit.unitId && p.date === newAudit.date);
      setPendingAudit({ unitId: newAudit.unitId, date: newAudit.date, planId: existingPlan?.id, step: 'ask', resetNewAudit: () => setNewAudit({...newAudit, unitId: ''}) });
    }
  };

  const handleDeleteAudit = async (id) => {
    if(window.confirm('Kaydı silmek istediğinize emin misiniz?')) {
      try { await deleteDoc(doc(db, 'bireysel_denetimler', id)); } catch (error) {}
    }
  };

  const handleExportExcel = () => {
    if (audits.length === 0) { setErrorMsg("Kayıt bulunmuyor."); return; }
    let csvContent = "\uFEFF"; csvContent += "İl,İlçe,Birim Adı,Ziyaret Tarihi,Not\n";
    [...audits].sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(audit => {
      const unit = units.find(u => u.id === audit.unitId) || { city: 'Silinmiş', district: '-', name: 'Silinmiş Birim' };
      const safeNote = audit.note ? `"${audit.note.replace(/"/g, '""')}"` : "";
      csvContent += `"${unit.city}","${unit.district}","${unit.name}","${formatDateDisplay(audit.date)}",${safeNote}\n`;
    });
    const link = document.createElement("a"); link.setAttribute("href", URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })));
    link.setAttribute("download", `Ziyaret_Kayitlari_${getLocalYYYYMMDD()}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus className="text-blue-600" /> Seri Denetim Ekle</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Aktif Birim Seç</label>
            <select className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-sm transition" value={newAudit.unitId} onChange={(e) => setNewAudit({...newAudit, unitId: e.target.value})}>
              <option value="">Listedeki birimlerden seçin...</option>
              {[...units].filter(u => u.isActive !== false).sort((a,b) => a.city.localeCompare(b.city, 'tr') || a.name.localeCompare(b.name, 'tr')).map(u => <option key={u.id} value={u.id}>{u.city} ({u.district}) - {u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Tarih</label>
            <input type="date" className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-sm transition" value={newAudit.date} onChange={(e) => setNewAudit({...newAudit, date: e.target.value})} />
          </div>
          <button onClick={handleAddAudit} disabled={!newAudit.unitId} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-base hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition shadow-lg shadow-blue-200/50 mt-2">Kaydı Tamamla</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden pb-4">
        <div className="p-4 border-b border-gray-50 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><History size={18} className="text-blue-600" /><span className="font-bold text-gray-800 text-sm">Ziyaret Kayıtları</span></div>
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 text-xs font-bold bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200 hover:bg-green-100 transition active:scale-95"><Download size={14}/> Excel'e Aktar</button>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
             <Search size={16} className="text-gray-400 ml-1"/>
             <input type="date" className="bg-transparent text-sm font-medium text-gray-700 outline-none flex-1" value={recordsDateFilter} onChange={(e) => setRecordsDateFilter(e.target.value)} />
             {recordsDateFilter && <button onClick={() => setRecordsDateFilter('')} className="text-red-400 p-1"><X size={16}/></button>}
          </div>
        </div>
        <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
          {auditHistory.length === 0 && <p className="text-sm text-gray-400 italic p-6 text-center">Kayıt bulunamadı.</p>}
          {auditHistory.map(audit => (
            <div key={audit.id} className="p-4 flex justify-between items-start bg-white hover:bg-gray-50 transition">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{audit.unitCity}</p>
                <p className="font-bold text-gray-800 text-sm mt-0.5">{audit.unitName}</p>
                <p className="text-xs text-gray-400 font-medium mt-1">{formatDateDisplay(audit.date)}</p>
                {audit.note && <div className="mt-2 bg-yellow-50 p-2 rounded-lg border border-yellow-100 flex items-start gap-1.5"><FileText size={12} className="text-yellow-600 mt-0.5 shrink-0"/><p className="text-[11px] text-gray-700 italic">{audit.note}</p></div>}
              </div>
              <button onClick={() => handleDeleteAudit(audit.id)} className="p-3 text-gray-300 hover:text-red-500 active:bg-red-50 rounded-xl transition shrink-0"><Trash2 size={20} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- 6. UNITS MANAGER VIEW ---
export function UnitsView({ units, showSuccess, setErrorMsg }) {
  const [newUnit, setNewUnit] = useState({ city: '', district: '', name: '' });
  const uniqueCitiesList = useMemo(() => Object.keys(TURKEY_DATA).sort((a,b) => a.localeCompare(b, 'tr')), []);

  const handleAddUnit = async () => {
    const uid = auth.currentUser?.uid;
    if (newUnit.city && newUnit.name && newUnit.district && uid) {
      try {
        await addDoc(collection(db, 'bireysel_birimler'), {
          city: newUnit.city.trim(), district: newUnit.district.trim(), name: newUnit.name.trim(), userId: uid, isActive: true
        });
        setNewUnit({ city: '', district: '', name: '' }); showSuccess('Birim eklendi.');
      } catch (error) { setErrorMsg(`Kaydedilemedi: ${error.message}`); }
    }
  };

  const handleToggleUnitStatus = async (unitId, currentStatus) => {
    try { await updateDoc(doc(db, 'bireysel_birimler', unitId), { isActive: !currentStatus }); showSuccess(`Birim güncellendi.`); } catch (error) {}
  };

  const handleDeleteUnit = async (unitId) => {
    if(window.confirm('Bu şubeyi silmek istediğinize emin misiniz?')) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'bireysel_birimler', unitId));
        await batch.commit(); showSuccess('Şube silindi.');
      } catch (e) { setErrorMsg('Silinemedi: ' + e.message); }
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><MapPin className="text-green-600" /> Yeni Şube Ekle</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">İl Seçiniz</label>
            <select className="w-full p-3.5 rounded-xl border border-gray-200 bg-gray-50 outline-none font-bold text-gray-700 text-sm transition" value={newUnit.city} onChange={(e) => setNewUnit({...newUnit, city: e.target.value, district: ''})}>
              <option value="">İl Seçin...</option>{uniqueCitiesList.map(city => <option key={city} value={city}>{city}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">İlçe Seçiniz</label>
            <select disabled={!newUnit.city} className="w-full p-3.5 rounded-xl border border-gray-200 bg-gray-50 outline-none font-bold text-gray-700 text-sm transition disabled:opacity-50" value={newUnit.district} onChange={(e) => setNewUnit({...newUnit, district: e.target.value})}>
              <option value="">{newUnit.city ? 'İlçe Seçin...' : 'Önce İl Seçin'}</option>
              {newUnit.city && TURKEY_DATA[newUnit.city]?.map(dist => <option key={dist} value={dist}>{dist}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Şube/Birim Adı</label>
            <input type="text" placeholder="Örn: Fırat Mahallesi" className="w-full p-3.5 rounded-xl border border-gray-200 bg-gray-50 outline-none font-bold text-gray-700 text-sm transition" value={newUnit.name} onChange={(e) => setNewUnit({...newUnit, name: e.target.value})} />
          </div>
          <button onClick={handleAddUnit} disabled={!newUnit.city || !newUnit.district || !newUnit.name} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-base disabled:opacity-50 mt-2">Kaydet</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2"><List size={18} className="text-blue-500" /><span className="font-bold text-gray-800">Kayıtlı Şubeleriniz</span></div>
          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">{units.length} Adet</span>
        </div>
        <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
          {units.sort((a,b) => a.city.localeCompare(b.city,'tr')).map(unit => {
            const isInactive = unit.isActive === false;
            return (
              <div key={unit.id} className={`p-4 flex justify-between items-center transition ${isInactive ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                <div className="flex-1">
                  <p className={`font-bold text-sm ${isInactive ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{unit.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1"><MapPin size={10}/> {unit.district} / {unit.city} {isInactive && <span className="text-red-500 font-bold ml-1">(KAPALI)</span>}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggleUnitStatus(unit.id, unit.isActive)} className={`p-2 rounded-xl transition ${isInactive ? 'text-green-600 hover:bg-green-100' : 'text-orange-500 hover:bg-orange-100'}`}>{isInactive ? <CheckCircle size={18} /> : <Ban size={18} />}</button>
                  <button onClick={() => handleDeleteUnit(unit.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition"><Trash2 size={18} /></button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
