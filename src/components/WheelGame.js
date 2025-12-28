import React, { useState, useRef } from 'react';
import { Trash2, Plus, RotateCw } from 'lucide-react';

const COLORS = ['#EF476F', '#FFD166', '#06D6A0', '#118AB2', '#073B4C', '#9D4EDD', '#FF9F1C', '#4CC9F0'];
const TR_ALPHABET = "A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z".split(' ');

export default function WheelGame({ data, settings, onUpdate, onBack }) {
  const [newItem, setNewItem] = useState('');
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const currentRotation = useRef(0);

  const items = data || [];
  const currentSettings = settings || { autoRemove: false };

  // --- Yardımcı Fonksiyonlar ---
  const handleUpdate = (newItems) => onUpdate('wheelItems', newItems);
  const handleSettings = (newSettings) => onUpdate('wheelSettings', newSettings);

  const addItem = () => {
    if (newItem.trim()) {
      handleUpdate([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const deleteItem = (idx) => {
    handleUpdate(items.filter((_, i) => i !== idx));
  };

  const spin = () => {
    if (spinning || items.length === 0) return;
    setSpinning(true);
    setWinner(null);
    const minSpins = 5;
    const randomSpins = Math.floor(Math.random() * 5) + minSpins;
    const randomDegree = Math.floor(Math.random() * 360);
    const newRotation = currentRotation.current + (randomSpins * 360) + randomDegree;
    setRotation(newRotation);
    currentRotation.current = newRotation;
    
    setTimeout(() => {
      const segmentAngle = 360 / items.length;
      const normalized = newRotation % 360;
      const effective = (360 - normalized) % 360;
      const idx = Math.floor(effective / segmentAngle);
      setWinner(items[idx]);
      setSpinning(false);
    }, 4000);
  };

  const confirmWinner = () => {
    if (currentSettings.autoRemove && winner) {
      const idx = items.indexOf(winner);
      if (idx !== -1) deleteItem(idx);
    }
    setWinner(null);
  };

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="mb-4 text-gray-500 hover:text-gray-800 flex items-center gap-1">← Menüye Dön</button>
      
      <div className="flex flex-col-reverse lg:flex-row gap-8 items-start justify-center">
        {/* Liste Paneli */}
        <div className="w-full lg:w-1/3 bg-white p-6 rounded-2xl shadow-lg">
          <div className="flex gap-2 mb-4">
             <button onClick={() => handleUpdate(TR_ALPHABET)} className="px-3 py-1 bg-gray-100 rounded text-xs">TR Alfabe</button>
             <button 
                onClick={() => handleSettings({ ...currentSettings, autoRemove: !currentSettings.autoRemove })}
                className={`px-3 py-1 rounded text-xs ${currentSettings.autoRemove ? 'bg-red-100 text-red-600' : 'bg-gray-100'}`}
             >
               {currentSettings.autoRemove ? 'Silme: AÇIK' : 'Silme: KAPALI'}
             </button>
          </div>
          <div className="flex gap-2 mb-4">
            <input value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==='Enter' && addItem()} className="flex-1 border p-2 rounded" placeholder="Ekle..." />
            <button onClick={addItem} className="bg-purple-600 text-white p-2 rounded"><Plus/></button>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.map((item, idx) => (
              <li key={idx} className="flex justify-between p-2 hover:bg-gray-50 border-b">
                <span>{item}</span>
                <Trash2 size={16} className="cursor-pointer text-gray-400 hover:text-red-500" onClick={()=>deleteItem(idx)}/>
              </li>
            ))}
          </ul>
        </div>

        {/* Çark Görseli */}
        <div className="w-full lg:w-2/3 flex flex-col items-center">
           <div className="relative w-[300px] h-[300px] sm:w-[400px] sm:h-[400px]">
             <div className="absolute top-1/2 -right-6 -mt-4 z-20 w-0 h-0 border-t-[16px] border-t-transparent border-b-[16px] border-b-transparent border-r-[30px] border-r-gray-800 drop-shadow-lg"></div>
             <div className="w-full h-full rounded-full shadow-2xl border-4 border-white overflow-hidden transition-transform ease-[cubic-bezier(0.2,0.8,0.2,1)]" 
                  style={{ transform: `rotate(${rotation}deg)`, transitionDuration: spinning ? '4s' : '0s' }}>
                {items.length > 0 && (
                  <svg viewBox="-1 -1 2 2" className="w-full h-full">
                    {items.map((item, idx) => {
                      const startAngle = idx * (1 / items.length);
                      const endAngle = (idx + 1) * (1 / items.length);
                      const x1 = Math.cos(2 * Math.PI * startAngle);
                      const y1 = Math.sin(2 * Math.PI * startAngle);
                      const x2 = Math.cos(2 * Math.PI * endAngle);
                      const y2 = Math.sin(2 * Math.PI * endAngle);
                      const largeArc = 1 / items.length > 0.5 ? 1 : 0;
                      const path = items.length === 1 ? "M 0 0 L 1 0 A 1 1 0 1 1 1 -0.001 Z" : `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} Z`;
                      return (
                        <g key={idx}>
                          <path d={path} fill={COLORS[idx % COLORS.length]} stroke="white" strokeWidth="0.01" />
                          <g transform={`rotate(${(startAngle + (1/items.length)/2) * 360})`}>
                             <text x="0.6" y="0.02" fill="white" fontSize="0.08" textAnchor="middle" alignmentBaseline="middle" fontWeight="bold">
                               {item.length > 10 ? item.substring(0,8)+'..' : item}
                             </text>
                          </g>
                        </g>
                      )
                    })}
                  </svg>
                )}
             </div>
           </div>
           <button onClick={spin} disabled={spinning || items.length < 1} className="mt-8 px-8 py-3 bg-purple-600 text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform disabled:opacity-50">
             {spinning ? 'Dönüyor...' : 'ÇEVİR'}
           </button>
        </div>
      </div>

      {/* Kazanan Modalı */}
      {winner && !spinning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl text-center max-w-sm w-full animate-bounce-in">
            <h2 className="text-2xl font-bold mb-4">Kazanan!</h2>
            <div className="text-3xl font-black text-purple-600 mb-2">{winner}</div>
            <button onClick={confirmWinner} className="w-full bg-gray-900 text-white py-3 rounded-lg">Tamam</button>
          </div>
        </div>
      )}
    </div>
  );
}
