import React, { useState, useEffect } from 'react';
import { ArrowLeft, PlusCircle, Trash2, Calendar, Truck, Info, RotateCcw, Save } from 'lucide-react';

// Sabit Ürün Listesi
const PRODUCT_TYPES = [
  "Dana Sucuk",
  "Sosis",
  "Kaşar Peyniri",
  "Burger Köfte",
  "Patates",
  "Ayran",
  "Ketçap",
  "Mayonez"
];

export default function ShipmentApp({ onBack }) {
  // --- STATE ---
  const [step, setStep] = useState(1);
  const [orderMode, setOrderMode] = useState(null); 
  
  // Tarihler
  const [planningDate, setPlanningDate] = useState("");
  const [pastDateRange, setPastDateRange] = useState([]);
  
  // Veriler
  const [salesData, setSalesData] = useState({});
  const [products, setProducts] = useState([]);

  // --- OTOMATİK SIFIRLAMA ---
  useEffect(() => {
    const EXPIRY_TIME = 48 * 60 * 60 * 1000; 
    const now = Date.now();

    ['shipment_monday', 'shipment_thursday'].forEach(key => {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (now - parsed.timestamp > EXPIRY_TIME) {
          localStorage.removeItem(key);
        }
      }
    });
  }, []);

  // --- LOCALSTORAGE KAYIT ---
  useEffect(() => {
    if (orderMode && step > 1) {
      const key = `shipment_${orderMode}`;
      const dataToSave = {
        timestamp: Date.now(),
        salesData,
        products,
        orderMode,
        planningDate,
        pastDateRange
      };
      localStorage.setItem(key, JSON.stringify(dataToSave));
    }
  }, [salesData, products, step]);

  const loadDataForMode = (mode) => {
    const key = `shipment_${mode}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      setSalesData(parsed.salesData || {});
      setProducts(parsed.products || []);
      setPlanningDate(parsed.planningDate);
      setPastDateRange(parsed.pastDateRange);
      return true;
    }
    return false;
  };

  const resetAllData = () => {
    if (window.confirm("Tüm kayıtlı veriler silinecek. Emin misiniz?")) {
      localStorage.removeItem('shipment_monday');
      localStorage.removeItem('shipment_thursday');
      window.location.reload();
    }
  };

  // --- YARDIMCI FONKSİYONLAR ---
  const formatDateTR = (date) => {
    return new Intl.DateTimeFormat('tr-TR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'long' 
    }).format(date);
  };

  const getNextDayOfWeek = (dayIndex) => {
    const d = new Date();
    d.setHours(0,0,0,0);
    const today = d.getDay();
    let diff = dayIndex - today;
    if (diff < 0) diff += 7; 
    d.setDate(d.getDate() + diff);
    return d;
  };

  const calculatePastDates = (targetDate, mode) => {
    const dates = [];
    let startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 7); 

    for (let i = 0; i < 7; i++) {
      const tempDate = new Date(startDate);
      tempDate.setDate(startDate.getDate() + i);
      dates.push({
        id: i, 
        dateObj: tempDate,
        label: formatDateTR(tempDate),
      });
    }
    return dates;
  };

  // --- HANDLERS ---
  const handleModeSelect = (mode) => {
    setOrderMode(mode);
    const hasSavedData = loadDataForMode(mode);

    if (!hasSavedData) {
      let targetDate;
      if (mode === 'monday') targetDate = getNextDayOfWeek(1);
      else targetDate = getNextDayOfWeek(4);

      const calculatedDates = calculatePastDates(targetDate, mode);
      setPlanningDate(formatDateTR(targetDate));
      setPastDateRange(calculatedDates);
      
      const initialSales = {};
      calculatedDates.forEach(d => initialSales[d.id] = "");
      setSalesData(initialSales);
      setProducts([]); 
    }
    setStep(2);
  };

  const handleSaleChange = (id, val) => {
    setSalesData({ ...salesData, [id]: val });
  };

  // --- HESAPLAMA ---
  const getTotalWeeklySales = () => {
    return Object.values(salesData).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  };

  const getTargetSalesTotal = () => {
    let targetIndices = [];
    if (orderMode === 'monday') targetIndices = [0, 1, 2, 3, 4];
    else targetIndices = [0, 1, 2, 3, 4, 5];
    return targetIndices.reduce((acc, idx) => acc + (parseFloat(salesData[idx]) || 0), 0);
  };

  // --- ÜRÜN YÖNETİMİ ---
  const addProduct = () => {
    setProducts([...products, { id: Date.now(), type: PRODUCT_TYPES[0], stock: '', usage: '' }]);
  };

  const updateProduct = (id, field, value) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeProduct = (id) => {
    setProducts(products.filter(p => p.id !== id));
  };


  // --- ADIM 1: GÜN SEÇİMİ ---
  if (step === 1) {
    const nextMon = getNextDayOfWeek(1);
    const nextThu = getNextDayOfWeek(4);

    return (
      <div className="max-w-4xl mx-auto animate-fade-in p-2 md:p-0">
        <div className="flex justify-between items-center mb-6">
          <button onClick={onBack} className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors">
            <ArrowLeft size={20} className="mr-1" /> Menü
          </button>
          <button onClick={resetAllData} className="flex items-center text-red-500 bg-red-50 px-3 py-2 rounded-lg text-sm font-semibold">
            <RotateCcw size={16} className="mr-2" /> Sıfırla
          </button>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-3xl shadow-lg text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-full mb-4">
            <Truck size={32} className="text-indigo-600" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Sevkiyat Planlayıcı</h1>
          <p className="text-gray-500 mb-8">Sipariş vereceğiniz günü seçin.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <button onClick={() => handleModeSelect('monday')} className="text-left p-6 border-2 border-indigo-100 rounded-2xl hover:bg-indigo-50 active:scale-95 transition-all">
              <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded uppercase mb-2 inline-block">Çarşamba Sevkiyatı</span>
              <h3 className="text-xl font-bold text-indigo-900">Pazartesi Siparişi</h3>
              <p className="text-gray-500 text-sm mt-1">{formatDateTR(nextMon)}</p>
            </button>

            <button onClick={() => handleModeSelect('thursday')} className="text-left p-6 border-2 border-orange-100 rounded-2xl hover:bg-orange-50 active:scale-95 transition-all">
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded uppercase mb-2 inline-block">Cumartesi Sevkiyatı</span>
              <h3 className="text-xl font-bold text-orange-900">Perşembe Siparişi</h3>
              <p className="text-gray-500 text-sm mt-1">{formatDateTR(nextThu)}</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- ADIM 2: CİRO GİRİŞİ ---
  if (step === 2) {
    const totalSales = getTotalWeeklySales();
    const isReady = pastDateRange.every(d => salesData[d.id] !== "" && salesData[d.id] !== undefined);

    return (
      <div className="max-w-xl mx-auto animate-fade-in pb-20 p-2 md:p-0">
        <button onClick={() => setStep(1)} className="flex items-center text-gray-500 mb-4 hover:text-gray-800">
          <ArrowLeft size={20} className="mr-1" /> Geri Dön
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gray-800 text-white p-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="text-yellow-400" size={20}/> Satış Verileri
            </h2>
            <p className="text-gray-400 text-xs mt-1">Geçen haftanın ciro bilgilerini giriniz.</p>
          </div>

          <div className="p-4 space-y-3">
            {pastDateRange.map((item) => (
              <div key={item.id} className="flex flex-col border border-gray-100 rounded-lg p-3 hover:border-indigo-300 transition-colors bg-gray-50">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1">{item.label}</label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal" // Mobil klavye için
                    pattern="[0-9]*"   // iOS numerik klavye
                    placeholder="0"
                    value={salesData[item.id] || ""}
                    onChange={(e) => handleSaleChange(item.id, e.target.value)}
                    className="w-full pl-2 pr-8 py-2 bg-white border border-gray-300 rounded text-right font-mono text-xl font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₺</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-4 border-t sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-500 font-bold text-sm">Toplam Ciro</span>
              <span className="text-xl font-black text-indigo-600">{totalSales.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</span>
            </div>
            <button 
              onClick={() => isReady ? setStep(3) : alert("Lütfen tüm günlerin cirosunu giriniz.")}
              className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg active:scale-95 transition-transform ${isReady ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              Hesaplamaya Geç
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- ADIM 3: ÜRÜN PLANLAMA (MOBİL KART GÖRÜNÜMÜ) ---
  if (step === 3) {
    const totalWeeklySales = getTotalWeeklySales();
    const targetSales = getTargetSalesTotal();

    return (
      <div className="max-w-4xl mx-auto animate-fade-in pb-24 p-2 md:p-0">
        <div className="flex flex-col gap-4 mb-4">
          <button onClick={() => setStep(2)} className="flex items-center text-gray-500 hover:text-gray-800">
            <ArrowLeft size={20} className="mr-1" /> Ciro Düzenle
          </button>
          
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex justify-between items-center">
            <div>
               <span className="text-xs text-indigo-600 font-bold block">HEDEF CİRO</span>
               <span className="text-sm text-gray-500">({orderMode === 'monday' ? 'Pzt-Cum' : 'Per-Sal'})</span>
            </div>
            <span className="font-black text-indigo-700 text-2xl">{targetSales.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</span>
          </div>
        </div>

        {/* ÜRÜN LİSTESİ */}
        <div className="space-y-4">
          {products.length === 0 && (
            <div className="bg-white p-10 rounded-2xl text-center text-gray-400 border border-dashed border-gray-300">
              <Info size={40} className="mx-auto mb-2 opacity-50"/>
              <p>Listeniz boş. Aşağıdan ürün ekleyin.</p>
            </div>
          )}

          {products.map((p) => {
            const usage = parseFloat(p.usage) || 0;
            const stock = parseFloat(p.stock) || 0;
            let calculatedOrder = 0;
            
            if (totalWeeklySales > 0 && usage > 0) {
               const estimatedNeed = (targetSales * usage) / totalWeeklySales;
               const rawOrder = estimatedNeed - stock;
               calculatedOrder = rawOrder > 0 ? rawOrder * 1.1 : 0;
            }

            return (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative animate-fade-in">
                {/* Kart Başlığı */}
                <div className="bg-gray-50 p-3 flex justify-between items-center border-b border-gray-100">
                  <select 
                    className="bg-transparent font-bold text-gray-800 text-lg outline-none w-full mr-2"
                    value={p.type}
                    onChange={(e) => updateProduct(p.id, 'type', e.target.value)}
                  >
                    {PRODUCT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <button onClick={() => removeProduct(p.id)} className="text-red-400 p-1 hover:bg-red-50 rounded">
                    <Trash2 size={20} />
                  </button>
                </div>

                {/* Kart İçeriği (Grid) */}
                <div className="p-4 grid grid-cols-2 gap-4">
                  {/* Stok Girişi */}
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1 uppercase">Mevcut Stok</label>
                    <div className="relative">
                      <input 
                        type="number"
                        inputMode="decimal"
                        pattern="[0-9]*"
                        placeholder="0"
                        className="w-full p-3 bg-white border border-gray-200 rounded-lg text-center font-mono text-xl font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                        value={p.stock}
                        onChange={(e) => updateProduct(p.id, 'stock', e.target.value)}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 text-xs font-bold">kg</span>
                    </div>
                  </div>

                  {/* Kullanım Girişi */}
                  <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1 uppercase">Geçen H. Sarfiyat</label>
                    <div className="relative">
                      <input 
                        type="number"
                        inputMode="decimal"
                        pattern="[0-9]*"
                        placeholder="0"
                        className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center font-mono text-xl font-semibold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none"
                        value={p.usage}
                        onChange={(e) => updateProduct(p.id, 'usage', e.target.value)}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">kg</span>
                    </div>
                  </div>
                </div>

                {/* Sonuç Alanı */}
                <div className="bg-indigo-600 p-3 flex justify-between items-center text-white">
                  <span className="text-indigo-200 text-sm font-medium">Gereken Sipariş</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black">{calculatedOrder > 0 ? calculatedOrder.toFixed(1) : '0'}</span>
                    <span className="text-sm font-normal opacity-80">kg</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Ekle Butonu (Sticky) */}
        <div className="fixed bottom-4 left-0 right-0 px-4 max-w-4xl mx-auto z-20">
          <button 
            onClick={addProduct} 
            className="w-full bg-white border-2 border-indigo-600 text-indigo-600 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-indigo-50 active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <PlusCircle size={24} /> Yeni Ürün Ekle
          </button>
        </div>
      </div>
    );
  }

  return null;
}
