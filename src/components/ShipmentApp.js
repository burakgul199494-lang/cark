import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calculator, Plus, Trash2, Save, ShoppingCart, Calendar } from 'lucide-react';

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

// Gün İsimleri ve İndeksleri (0: Pazartesi ... 6: Pazar)
const DAYS = [
  { id: 0, label: "Pazartesi" },
  { id: 1, label: "Salı" },
  { id: 2, label: "Çarşamba" },
  { id: 3, label: "Perşembe" },
  { id: 4, label: "Cuma" },
  { id: 5, label: "Cumartesi" },
  { id: 6, label: "Pazar" },
];

export default function ShipmentApp({ onBack }) {
  // --- STATE ---
  const [step, setStep] = useState(1); // 1: Gün Seçimi, 2: Ciro Girişi, 3: Hesaplama
  const [orderDay, setOrderDay] = useState(null); // 'monday' veya 'thursday'
  
  // Günlük Cirolar (index 0: Pazartesi ... 6: Pazar)
  const [salesData, setSalesData] = useState({
    0: "", 1: "", 2: "", 3: "", 4: "", 5: "", 6: ""
  });

  // Eklenen Ürünler
  const [products, setProducts] = useState([]);

  // --- HESAPLAMA FONKSİYONLARI ---

  // Toplam Haftalık Ciro
  const getTotalWeeklySales = () => {
    return Object.values(salesData).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  };

  // Hedef Günlerin Cirosunu Topla
  const getTargetSalesTotal = () => {
    let targetDays = [];
    
    if (orderDay === 'monday') {
      // Çarşamba Sevkiyatı (Pazartesi verilir)
      // Hedef: Pzt, Sal, Çar, Per, Cum (5 Gün)
      targetDays = [0, 1, 2, 3, 4];
    } else {
      // Cumartesi Sevkiyatı (Perşembe verilir)
      // Hedef: Per, Cum, Cmt, Paz, Pzt, Sal (6 Gün)
      targetDays = [3, 4, 5, 6, 0, 1];
    }

    return targetDays.reduce((acc, dayIdx) => acc + (parseFloat(salesData[dayIdx]) || 0), 0);
  };

  // --- HANDLERS ---

  const handleModeSelect = (mode) => {
    setOrderDay(mode);
    setStep(2);
  };

  const handleSaleChange = (dayIdx, val) => {
    setSalesData({ ...salesData, [dayIdx]: val });
  };

  const addProduct = () => {
    setProducts([...products, { 
      id: Date.now(), 
      type: PRODUCT_TYPES[0], 
      stock: '', 
      usage: '',
      result: 0 
    }]);
  };

  const updateProduct = (id, field, value) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeProduct = (id) => {
    setProducts(products.filter(p => p.id !== id));
  };

  // --- RENDER BÖLÜMLERİ ---

  // ADIM 1: GÜN SEÇİMİ
  if (step === 1) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <button onClick={onBack} className="flex items-center text-gray-500 mb-6 hover:text-indigo-600 transition-colors">
          <ArrowLeft size={20} className="mr-1" /> Menüye Dön
        </button>

        <div className="bg-white p-10 rounded-3xl shadow-xl text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Sevkiyat Planlayıcı</h1>
          <p className="text-gray-500 mb-10">Lütfen bugün hangi gün için sipariş verdiğinizi seçin.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <button 
              onClick={() => handleModeSelect('monday')}
              className="group relative p-8 border-2 border-indigo-100 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left"
            >
              <div className="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center mb-4 text-xl font-bold">Pt</div>
              <h3 className="text-2xl font-bold text-indigo-900 mb-2">Pazartesi Günü</h3>
              <p className="text-gray-600 text-sm">Çarşamba gelecek sevkiyat için sipariş veriyorsunuz.</p>
              <div className="mt-4 text-xs font-semibold text-indigo-600 bg-indigo-100 inline-block px-3 py-1 rounded-full">
                Kapsam: Pzt - Cum (5 Gün)
              </div>
            </button>

            <button 
              onClick={() => handleModeSelect('thursday')}
              className="group relative p-8 border-2 border-orange-100 rounded-2xl hover:border-orange-500 hover:bg-orange-50 transition-all text-left"
            >
              <div className="bg-orange-500 text-white w-12 h-12 rounded-full flex items-center justify-center mb-4 text-xl font-bold">Pr</div>
              <h3 className="text-2xl font-bold text-orange-900 mb-2">Perşembe Günü</h3>
              <p className="text-gray-600 text-sm">Cumartesi gelecek sevkiyat için sipariş veriyorsunuz.</p>
              <div className="mt-4 text-xs font-semibold text-orange-600 bg-orange-100 inline-block px-3 py-1 rounded-full">
                Kapsam: Per - Salı (6 Gün)
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ADIM 2: CİRO GİRİŞİ
  if (step === 2) {
    const totalSales = getTotalWeeklySales();
    const isReady = DAYS.every(d => salesData[d.id] !== "");

    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <button onClick={() => setStep(1)} className="flex items-center text-gray-500 mb-6 hover:text-gray-800">
          <ArrowLeft size={20} className="mr-1" /> Geri Dön
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gray-800 text-white p-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="text-yellow-400"/> Geçen Haftanın Satış Verileri
            </h2>
            <p className="text-gray-400 text-sm mt-1">Lütfen geçen haftaya ait gün gün ciro bilgilerini giriniz.</p>
          </div>

          <div className="p-6 grid gap-4">
            {DAYS.map((day) => (
              <div key={day.id} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0">
                <label className="font-semibold text-gray-700 w-1/3">{day.label}</label>
                <div className="relative w-2/3">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={salesData[day.id]}
                    onChange={(e) => handleSaleChange(day.id, e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-right text-lg"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₺</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 p-6 border-t flex justify-between items-center">
            <div>
              <div className="text-xs text-gray-500 uppercase font-bold">Toplam Ciro</div>
              <div className="text-2xl font-black text-indigo-600">
                {totalSales.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </div>
            </div>
            <button 
              onClick={() => isReady ? setStep(3) : alert("Lütfen tüm günlerin cirosunu giriniz.")}
              className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${isReady ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300 cursor-not-allowed'}`}
            >
              Devam Et
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ADIM 3: ÜRÜN PLANLAMA (EXCEL TARZI)
  if (step === 3) {
    const totalWeeklySales = getTotalWeeklySales();
    const targetSales = getTargetSalesTotal();

    return (
      <div className="max-w-6xl mx-auto animate-fade-in pb-20">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setStep(2)} className="flex items-center text-gray-500 hover:text-gray-800">
            <ArrowLeft size={20} className="mr-1" /> Ciro Düzenle
          </button>
          <div className="text-right">
             <span className="text-sm text-gray-500 block">Haftalık Toplam Ciro</span>
             <span className="font-bold text-gray-800">{totalWeeklySales.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</span>
          </div>
          <div className="text-right bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
             <span className="text-sm text-indigo-600 block font-bold">Hedeflenen Ciro ({orderDay === 'monday' ? '5 Gün' : '6 Gün'})</span>
             <span className="font-black text-indigo-700 text-xl">{targetSales.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* TABLO BAŞLIĞI */}
          <div className="grid grid-cols-12 bg-gray-100 p-4 font-bold text-gray-600 text-sm border-b uppercase tracking-wider items-center text-center">
            <div className="col-span-3 text-left pl-2">Ürün</div>
            <div className="col-span-2">Mevcut Stok (Kg)</div>
            <div className="col-span-2">Geçen Hafta (Kg)</div>
            <div className="col-span-1">Oran (%)</div>
            <div className="col-span-3 bg-indigo-100 text-indigo-800 py-1 rounded">Sipariş (Kg)</div>
            <div className="col-span-1"></div>
          </div>

          {/* ÜRÜN SATIRLARI */}
          <div className="divide-y divide-gray-100">
            {products.length === 0 && (
              <div className="p-10 text-center text-gray-400">
                Henüz ürün eklenmedi. Aşağıdaki butondan ekleyin.
              </div>
            )}

            {products.map((p) => {
              // HESAPLAMA MANTIĞI
              // Formül: ((((Hedef Ciro) * Sarfiyat) / Toplam Ciro) - Stok) * 1.1
              
              const usage = parseFloat(p.usage) || 0;
              const stock = parseFloat(p.stock) || 0;
              
              let calculatedOrder = 0;
              let usageRatio = 0;

              if (totalWeeklySales > 0 && usage > 0) {
                 usageRatio = (usage / totalWeeklySales) * 100; // Yüzdelik gösterim için
                 
                 const estimatedNeed = (targetSales * usage) / totalWeeklySales;
                 const rawOrder = estimatedNeed - stock;
                 
                 // Güvenlik Payı (1.1) ve Negatif kontrolü
                 calculatedOrder = rawOrder > 0 ? rawOrder * 1.1 : 0;
              }

              return (
                <div key={p.id} className="grid grid-cols-12 p-3 items-center gap-2 hover:bg-gray-50 transition-colors">
                  {/* Ürün Seçimi */}
                  <div className="col-span-3">
                    <select 
                      className="w-full p-2 border border-gray-300 rounded bg-white font-medium focus:border-indigo-500 outline-none"
                      value={p.type}
                      onChange={(e) => updateProduct(p.id, 'type', e.target.value)}
                    >
                      {PRODUCT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>

                  {/* Stok */}
                  <div className="col-span-2">
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-full p-2 border border-gray-300 rounded text-center focus:border-blue-500 outline-none font-mono"
                      value={p.stock}
                      onChange={(e) => updateProduct(p.id, 'stock', e.target.value)}
                    />
                  </div>

                  {/* Geçen Hafta Kullanım */}
                  <div className="col-span-2">
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-full p-2 border border-gray-300 rounded text-center focus:border-blue-500 outline-none font-mono bg-yellow-50"
                      value={p.usage}
                      onChange={(e) => updateProduct(p.id, 'usage', e.target.value)}
                    />
                  </div>

                  {/* Oran Göstergesi */}
                  <div className="col-span-1 text-center text-xs font-bold text-gray-400">
                    {usageRatio > 0 ? `%${usageRatio.toFixed(2)}` : '-'}
                  </div>

                  {/* SONUÇ */}
                  <div className="col-span-3 text-center">
                    <div className={`py-2 px-4 rounded-lg font-black text-xl shadow-inner ${calculatedOrder > 0 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {calculatedOrder > 0 ? calculatedOrder.toFixed(2) : '0.00'}
                    </div>
                  </div>

                  {/* Sil Butonu */}
                  <div className="col-span-1 text-center">
                    <button onClick={() => removeProduct(p.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* EKLEME BUTONU */}
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <button 
              onClick={addProduct} 
              className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-600 font-bold hover:bg-indigo-50 hover:border-indigo-500 transition-all"
            >
              <PlusCircle size={20} /> Yeni Ürün Ekle
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// İkonu buraya tanımlayalım (import hatası olmaması için)
function PlusCircle({size}) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
  );
}
