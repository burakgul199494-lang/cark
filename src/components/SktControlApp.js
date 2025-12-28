import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, AlertTriangle, CheckCircle, Save, RotateCcw } from 'lucide-react';

// Ürün Tanımları
// shelfLife: Raf ömrü (gün)
// startDelay: Sevkiyattan kaç gün sonra kullanıma başlanıyor (0: Aynı gün, 1: Ertesi gün)
const PRODUCT_DEFINITIONS = [
  { id: 1, name: "Mozeralla Peyniri", shelfLife: 6, startDelay: 1 },
  { id: 2, name: "Hamburger Ekmeği", shelfLife: 14, startDelay: 0 },
  { id: 3, name: "Sandviç Ekmeği", shelfLife: 10, startDelay: 0 },
  { id: 4, name: "Taze Sos", shelfLife: 4, startDelay: 1 },
];

export default function SktControlApp({ onBack }) {
  const [shipmentDates, setShipmentDates] = useState([]);
  const [inputs, setInputs] = useState({}); // { urunId: { ship0: 30, ship1: 20, ship2: 40, current: 100 } }
  const [today, setToday] = useState(new Date());

  // --- 1. OTOMATİK TARİH HESAPLAMA ---
  useEffect(() => {
    const dates = [];
    const checkDate = new Date();
    // Saati sıfırla ki karşılaştırmalar düzgün olsun
    checkDate.setHours(0,0,0,0);
    setToday(checkDate);

    // Geriye doğru gün gün gidip Çarşamba(3) ve Cumartesi(6) arıyoruz
    // 3 tane bulana kadar döngü devam eder
    let found = 0;
    // Bugün dahil kontrol etmeye başla (i=0)
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayIndex = d.getDay();

      if (dayIndex === 3 || dayIndex === 6) { // 3: Çarşamba, 6: Cumartesi
        dates.push(d);
        found++;
        if (found === 3) break;
      }
    }
    setShipmentDates(dates);
  }, []);

  // --- YARDIMCI FONKSİYONLAR ---
  const formatDateTR = (date) => {
    return new Intl.DateTimeFormat('tr-TR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'long' 
    }).format(date);
  };

  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const handleInputChange = (productId, field, value) => {
    setInputs(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const resetData = () => {
    if(window.confirm("Tüm girişler temizlensin mi?")) {
      setInputs({});
    }
  };

  // --- HESAPLAMA MOTORU ---
  const calculateStatus = (product) => {
    const productData = inputs[product.id] || {};
    const currentStock = parseFloat(productData.current) || 0;
    
    let totalValidStockLimit = 0; // Tarihi geçmemiş olması gereken maksimum stok
    let expiredAmountReceived = 0; // Tarihi geçmiş sevkiyatların toplamı
    let details = [];

    shipmentDates.forEach((shipDate, index) => {
      // 1. Kullanım Başlangıç Tarihi
      const firstUseDate = addDays(shipDate, product.startDelay);
      // 2. SKT Tarihi
      const sktDate = addDays(firstUseDate, product.shelfLife);
      
      // Bugün bu SKT'yi geçti mi?
      // Not: sktDate < today ise tarih geçmiştir.
      // Eğer today == sktDate ise son kullanma tarihidir (hala kullanılabilir kabul ediyoruz akşamına kadar)
      const isExpired = sktDate < today; 
      
      const qty = parseFloat(productData[`ship${index}`]) || 0;

      if (!isExpired) {
        totalValidStockLimit += qty;
      } else {
        expiredAmountReceived += qty;
      }

      details.push({
        index,
        date: shipDate,
        skt: sktDate,
        isExpired,
        qty
      });
    });

    // SONUÇ ANALİZİ
    // Eğer elimizdeki stok (currentStock), geçerli olması gereken stoktan (totalValidStockLimit) fazlaysa
    // demek ki aradaki fark SKT'si geçmiş ürünlerden geliyor.
    
    let expiredStockOnHand = 0;
    if (currentStock > totalValidStockLimit) {
      expiredStockOnHand = currentStock - totalValidStockLimit;
    }

    return {
      totalValidStockLimit,
      expiredStockOnHand,
      details
    };
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-20 p-2 md:p-0">
      {/* ÜST BİLGİ ALANI */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-4 sticky top-0 z-20">
        <div className="flex justify-between items-center mb-2">
          <button onClick={onBack} className="flex items-center text-gray-500 hover:text-indigo-600 text-sm">
            <ArrowLeft size={18} className="mr-1" /> Menü
          </button>
          <button onClick={resetData} className="text-red-400 p-1 bg-red-50 rounded hover:bg-red-100">
            <RotateCcw size={18} />
          </button>
        </div>
        
        <h2 className="text-lg font-bold text-gray-800 text-center mb-1">SKT & İrsaliye Kontrol</h2>
        <p className="text-xs text-center text-gray-500 mb-3">Son 3 sevkiyat baz alınmıştır.</p>
        
        <div className="flex justify-between gap-1 text-[10px] md:text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
          {shipmentDates.map((d, i) => (
            <div key={i} className="text-center flex-1 border-r last:border-0 border-gray-300 px-1">
              <span className="block font-bold text-indigo-600">{i+1}. Sevkiyat</span>
              {d.toLocaleDateString('tr-TR', {day:'numeric', month:'numeric'})}
            </div>
          ))}
        </div>
      </div>

      {/* ÜRÜN KARTLARI */}
      <div className="space-y-6">
        {PRODUCT_DEFINITIONS.map(product => {
          const result = calculateStatus(product);
          const hasProblem = result.expiredStockOnHand > 0;

          return (
            <div key={product.id} className={`bg-white rounded-xl shadow-md overflow-hidden border-2 transition-all ${hasProblem ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-100'}`}>
              {/* Başlık */}
              <div className={`p-3 font-bold text-lg flex justify-between items-center ${hasProblem ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
                {product.name}
                {hasProblem && <span className="text-xs bg-red-600 text-white px-2 py-1 rounded flex items-center gap-1"><AlertTriangle size={12}/> SKT RİSKİ</span>}
              </div>

              <div className="p-4">
                {/* Giriş Alanları (3 Sevkiyat) */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {shipmentDates.map((d, i) => {
                    const detail = result.details[i];
                    return (
                      <div key={i} className="flex flex-col">
                        <label className={`text-[10px] font-bold mb-1 truncate ${detail.isExpired ? 'text-red-500' : 'text-green-600'}`}>
                          {d.toLocaleDateString('tr-TR', {day:'numeric', month:'numeric'})} ({detail.isExpired ? 'SKT!' : 'OK'})
                        </label>
                        <input 
                          type="number" 
                          inputMode="decimal"
                          pattern="[0-9]*"
                          placeholder="Gelen kg"
                          className={`w-full p-2 border rounded text-center text-sm font-mono focus:outline-none focus:ring-2 ${detail.isExpired ? 'bg-red-50 border-red-200 focus:ring-red-400' : 'bg-green-50 border-green-200 focus:ring-green-400'}`}
                          value={inputs[product.id]?.[`ship${i}`] || ''}
                          onChange={(e) => handleInputChange(product.id, `ship${i}`, e.target.value)}
                        />
                        <div className="text-[9px] text-gray-400 text-center mt-1">
                          SKT: {detail.skt.toLocaleDateString('tr-TR', {day:'numeric', month:'numeric'})}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Mevcut Sayım ve Sonuç */}
                <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-600 block mb-1 uppercase">Mevcut Sayım</label>
                    <input 
                      type="number" 
                      inputMode="decimal"
                      pattern="[0-9]*"
                      placeholder="Sayım"
                      className="w-full p-2 border border-gray-300 rounded font-bold text-gray-800 text-lg focus:border-indigo-500 outline-none"
                      value={inputs[product.id]?.current || ''}
                      onChange={(e) => handleInputChange(product.id, 'current', e.target.value)}
                    />
                  </div>

                  <div className="flex-1 text-right">
                    {hasProblem ? (
                      <div className="animate-pulse">
                        <span className="text-xs font-bold text-red-500 block">SKT'Lİ ÜRÜN</span>
                        <span className="text-2xl font-black text-red-600">{result.expiredStockOnHand} <span className="text-sm">kg</span></span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-bold text-green-600 block">DURUM</span>
                        <div className="text-green-600 flex items-center justify-end gap-1">
                          <CheckCircle size={20}/> <span className="font-bold">Temiz</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {hasProblem && (
                  <div className="mt-2 text-xs text-red-500 font-medium text-center bg-red-50 p-2 rounded">
                    Elinizdeki stok ({inputs[product.id]?.current} kg), geçerli olması gereken maksimum miktardan ({result.totalValidStockLimit} kg) fazla. 
                    <br/>Fark SKT'li üründür.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
