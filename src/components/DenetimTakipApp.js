// src/components/DenetimTakipApp.js

import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, List, Settings, Dna, History, FileText, CheckCircle2, MapPin, CalendarDays, Plus, CalendarPlus, X } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, getDoc, setDoc } from 'firebase/firestore';
import { getLocalYYYYMMDD, formatDateDisplay } from '../utils/denetimVerileri';
import { DashboardView, WeeklyPlansView, UnitDetailView, WheelView, RecordsView, UnitsView } from './DenetimSekmeleri';

export default function DenetimTakipApp({ onBack }) {
  const [units, setUnits] = useState([]);
  const [audits, setAudits] = useState([]);
  const [plans, setPlans] = useState([]); 
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(''); 
  const [selectedUnitForDetail, setSelectedUnitForDetail] = useState(null);

  // Modallar
  const [pendingAudit, setPendingAudit] = useState(null);
  const [pendingAuditNote, setPendingAuditNote] = useState('');
  const [quickPlanUnit, setQuickPlanUnit] = useState(null);
  const [quickPlanDate, setQuickPlanDate] = useState(getLocalYYYYMMDD());
  const [quickAuditUnit, setQuickAuditUnit] = useState(null);
  const [quickAuditDate, setQuickAuditDate] = useState(getLocalYYYYMMDD());

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setErrorMsg("Oturum hatası: Lütfen tekrar giriş yapın."); return; }

    const qUnits = query(collection(db, 'bireysel_birimler'), where("userId", "==", uid));
    const unsubUnits = onSnapshot(qUnits, (snapshot) => setUnits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const qAudits = query(collection(db, 'bireysel_denetimler'), where("userId", "==", uid));
    const unsubAudits = onSnapshot(qAudits, (snapshot) => setAudits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const qPlans = query(collection(db, 'bireysel_planlar'), where("userId", "==", uid));
    const unsubPlans = onSnapshot(qPlans, (snapshot) => setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

    return () => { unsubUnits(); unsubAudits(); unsubPlans(); };
  }, []);

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const executeAuditSave = async (withNote) => {
    if (!pendingAudit) return;
    const { unitId, date, planId, resetNewAudit } = pendingAudit;
    const noteText = (withNote && pendingAuditNote.trim()) ? pendingAuditNote.trim() : "";
    try {
        await addDoc(collection(db, 'bireysel_denetimler'), { unitId, date, userId: auth.currentUser?.uid, note: noteText });
        if (planId) await deleteDoc(doc(db, 'bireysel_planlar', planId));
        showSuccess('Ziyaret başarıyla eklendi.');
        if (resetNewAudit) resetNewAudit();
        setPendingAudit(null); setPendingAuditNote('');
    } catch (err) { setErrorMsg("Hata oluştu: " + err.message); }
  };

  const handleAddPlan = async (unitId, date) => {
    if (!unitId || !date) return false;
    const u = units.find(x => x.id === unitId);
    if (u && u.isActive === false) { setErrorMsg('Kapalı şubelere plan yapılamaz!'); return false; }
    if (audits.find(a => a.date === date && a.unitId === unitId)) { setErrorMsg(`Bu şubeye ${formatDateDisplay(date)} tarihinde zaten gidilmiş!`); return false; }
    if (plans.find(p => p.date === date && p.unitId === unitId)) { setErrorMsg(`Bu tarih için planınız zaten var!`); return false; }

    try {
      await addDoc(collection(db, 'bireysel_planlar'), { unitId, date, userId: auth.currentUser?.uid });
      showSuccess('Plan eklendi.'); return true;
    } catch (err) { setErrorMsg("Plan eklenemedi."); return false; }
  };

  const handleCompletePlan = (plan, e) => {
    e?.stopPropagation();
    if (audits.find(a => a.date === plan.date && a.unitId === plan.unitId)) {
      setErrorMsg(`Bu tarihte gidilmiş! Çakışan plan siliniyor...`);
      deleteDoc(doc(db, 'bireysel_planlar', plan.id)).catch(()=>{}); return;
    }
    setPendingAudit({ unitId: plan.unitId, date: plan.date, planId: plan.id, step: 'ask' });
  };

  const handleQuickAddAudit = (unitId, e) => {
    e?.stopPropagation();
    const today = getLocalYYYYMMDD();
    const u = units.find(x => x.id === unitId);
    if (u && u.isActive === false) { setErrorMsg('Bu şube kapalı!'); return; }
    if (audits.find(a => a.date === today && a.unitId === unitId)) { setErrorMsg(`Bugün bu şubeye zaten gidilmiş!`); return; }
    const existingPlan = plans.find(p => p.unitId === unitId && p.date === today);
    setPendingAudit({ unitId, date: today, planId: existingPlan?.id, step: 'ask' });
  };

  const handleDeletePlan = async (planId, e) => { e?.stopPropagation(); try { await deleteDoc(doc(db, 'bireysel_planlar', planId)); } catch (err) {} };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans relative">
      
      {/* ONAY / NOT MODALI */}
      {pendingAudit && (
         <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center">
               {pendingAudit.step === 'ask' ? (
                  <>
                     <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div>
                     <h3 className="font-bold text-lg text-gray-800 mb-2">Gidildi Olarak İşaretle</h3>
                     <p className="text-sm text-gray-500 mb-6">Bu ziyarete özel bir not eklemek ister misiniz?</p>
                     <div className="flex gap-3">
                        <button onClick={() => executeAuditSave(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">Direkt Kaydet</button>
                        <button onClick={() => setPendingAudit({...pendingAudit, step: 'note'})} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Not Ekle</button>
                     </div>
                     <button onClick={() => setPendingAudit(null)} className="w-full mt-4 py-2 text-gray-400 font-bold text-xs">İptal Et</button>
                  </>
               ) : (
                  <>
                     <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2"><FileText size={18} className="text-blue-500"/> Ziyaret Notunuz</h3>
                     <textarea autoFocus value={pendingAuditNote} onChange={e => setPendingAuditNote(e.target.value)} placeholder="Gözlemleriniz..." className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none min-h-[120px] mb-4" />
                     <div className="flex gap-3">
                        <button onClick={() => setPendingAudit(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">Vazgeç</button>
                        <button onClick={() => executeAuditSave(true)} disabled={!pendingAuditNote.trim()} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50">Kaydet</button>
                     </div>
                  </>
               )}
            </div>
         </div>
      )}

      {/* HIZLI PLAN MODALI */}
      {quickPlanUnit && (
         <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4"><CalendarPlus size={32} /></div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">Hızlı Planlama</h3>
              <p className="text-sm text-gray-500 mb-4"><strong>{quickPlanUnit.name}</strong> şubesi için plan tarihi:</p>
              <input type="date" className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 mb-6" value={quickPlanDate} onChange={(e) => setQuickPlanDate(e.target.value)} />
              <div className="flex gap-3">
                <button onClick={() => setQuickPlanUnit(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">İptal</button>
                <button onClick={async () => { if(await handleAddPlan(quickPlanUnit.id, quickPlanDate)) setQuickPlanUnit(null); }} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold">Planla</button>
              </div>
            </div>
         </div>
      )}

      {/* HIZLI TARİHLİ EKLEME MODALI */}
      {quickAuditUnit && (
         <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl">
              <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4"><Plus size={32} /></div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">Tarihli Ziyaret Ekle</h3>
              <p className="text-sm text-gray-500 mb-4"><strong>{quickAuditUnit.name}</strong> için ziyaret tarihi:</p>
              <input type="date" className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 mb-6" value={quickAuditDate} onChange={(e) => setQuickAuditDate(e.target.value)} />
              <div className="flex gap-3">
                <button onClick={() => setQuickAuditUnit(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">İptal</button>
                <button onClick={() => {
                    if (audits.find(a => a.date === quickAuditDate && a.unitId === quickAuditUnit.id)) { setErrorMsg("Zaten gidilmiş!"); return; }
                    const existingPlan = plans.find(p => p.unitId === quickAuditUnit.id && p.date === quickAuditDate);
                    setPendingAudit({ unitId: quickAuditUnit.id, date: quickAuditDate, planId: existingPlan?.id, step: 'ask' });
                    setQuickAuditUnit(null);
                  }} className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold">Devam</button>
              </div>
            </div>
         </div>
      )}

      {/* ÜST BAŞLIK */}
      <div className="bg-white px-4 pt-6 pb-4 shadow-sm flex items-center justify-between sticky top-0 z-40">
        <button onClick={() => { if (activeTab === 'unitDetail') setActiveTab('dashboard'); else onBack(); }} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold flex items-center gap-2 text-gray-800">
          {activeTab === 'unitDetail' ? <><MapPin className="text-blue-600" size={22} /> Şube Detayı</> : 
           activeTab === 'weeklyPlans' ? <><CalendarDays className="text-purple-600" size={22} /> Planlar</> : 
           activeTab === 'addAudit' ? <><History className="text-blue-600" size={22} /> Kayıtlar</> : 
           activeTab === 'wheel' ? <><Dna className="text-purple-600" size={22} /> Kura</> : 
           activeTab === 'units' ? <><Settings className="text-gray-600" size={22} /> Yönetim</> : 
           <><CheckCircle2 className="text-blue-600" size={22} /> Denetim Takip</>}
        </h1>
        <div className="w-10"></div>
      </div>

      {errorMsg && <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded-r-xl flex justify-between gap-3"><div className="flex gap-3"><AlertCircle className="text-red-500" size={20} /><p className="text-sm font-medium text-red-700">{errorMsg}</p></div><button onClick={() => setErrorMsg('')}><X size={16} className="text-red-400"/></button></div>}
      {successMsg && <div className="bg-green-50 border-l-4 border-green-500 p-4 m-4 rounded-r-xl flex gap-3"><CheckCircle2 className="text-green-500" size={20} /><p className="text-sm font-medium text-green-700">{successMsg}</p></div>}

      <div className="p-4 space-y-6">
        {activeTab === 'dashboard' && <DashboardView units={units} audits={audits} plans={plans} openUnitDetail={(u) => { setSelectedUnitForDetail(u); setActiveTab('unitDetail'); }} setQuickPlanUnit={setQuickPlanUnit} setQuickPlanDate={setQuickPlanDate} setQuickAuditUnit={setQuickAuditUnit} setQuickAuditDate={setQuickAuditDate} handleQuickAddAudit={handleQuickAddAudit} handleDeletePlan={handleDeletePlan} handleCompletePlan={handleCompletePlan} />}
        {activeTab === 'weeklyPlans' && <WeeklyPlansView plans={plans} units={units} handleDeletePlan={handleDeletePlan} setErrorMsg={setErrorMsg} />}
        {activeTab === 'unitDetail' && selectedUnitForDetail && <UnitDetailView unit={selectedUnitForDetail} units={units} audits={audits} plans={plans} handleAddPlan={handleAddPlan} setPendingAudit={setPendingAudit} setErrorMsg={setErrorMsg} />}
        {activeTab === 'wheel' && <WheelView units={units} audits={audits} handleAddPlan={handleAddPlan} />}
        {activeTab === 'addAudit' && <RecordsView units={units} audits={audits} plans={plans} setPendingAudit={setPendingAudit} setErrorMsg={setErrorMsg} />}
        {activeTab === 'units' && <UnitsView units={units} showSuccess={showSuccess} setErrorMsg={setErrorMsg} />}
      </div>

      {/* ALT MENÜ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-between items-center z-50 h-[70px] px-1 md:px-4">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${['dashboard', 'unitDetail'].includes(activeTab) ? 'text-blue-600' : 'text-gray-400'}`}><List size={20} /><span className="text-[9px] font-bold">Liste</span></button>
        <button onClick={() => setActiveTab('weeklyPlans')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'weeklyPlans' ? 'text-purple-600' : 'text-gray-400'}`}><CalendarDays size={20} /><span className="text-[9px] font-bold">Planlar</span></button>
        <button onClick={() => setActiveTab('wheel')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'wheel' ? 'text-indigo-600' : 'text-gray-400'}`}><Dna size={20} /><span className="text-[9px] font-bold">Kura</span></button>
        <button onClick={() => setActiveTab('addAudit')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'addAudit' ? 'text-blue-600' : 'text-gray-400'}`}><History size={20} /><span className="text-[9px] font-bold">Kayıtlar</span></button>
        <button onClick={() => setActiveTab('units')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'units' ? 'text-gray-800' : 'text-gray-400'}`}><Settings size={20} /><span className="text-[9px] font-bold">Yönetim</span></button>
      </div>

    </div>
  );
}
