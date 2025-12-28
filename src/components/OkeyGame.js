import React, { useState } from 'react';
import { Plus, AlertCircle, PlusCircle, X } from 'lucide-react';

export default function OkeyGame({ data, onUpdate, onBack }) {
  const [newPlayer, setNewPlayer] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [modalType, setModalType] = useState('score'); // 'score' or 'penalty'
  const [inputValue, setInputValue] = useState('');

  const gameData = data || { active: false, players: [], mode: 'single' };
  const updateGame = (newData) => onUpdate('okey', newData);

  const addPlayer = () => {
     if(newPlayer.trim()) {
        const newP = { name: newPlayer.trim(), scores: [], penalties: [] };
        updateGame({ ...gameData, players: [...gameData.players, newP] });
        setNewPlayer('');
     }
  };

  const addScoreOrPenalty = () => {
     if (selectedIdx === null) return;
     const val = parseInt(inputValue);
     if (isNaN(val)) return;

     const updatedPlayers = [...gameData.players];
     if (modalType === 'score') {
        updatedPlayers[selectedIdx].scores.push(val);
     } else {
        if (!updatedPlayers[selectedIdx].penalties) updatedPlayers[selectedIdx].penalties = [];
        updatedPlayers[selectedIdx].penalties.push(val);
     }
     
     updateGame({ ...gameData, players: updatedPlayers });
     setInputValue('');
     setSelectedIdx(null);
  };

  // --- GİRİŞ EKRANI ---
  if (!gameData.active) {
     return (
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg text-center">
           <button onClick={onBack} className="mb-4 text-gray-500 float-left">← Geri</button>
           <div className="clear-both"></div>
           <h2 className="text-2xl font-bold mb-4 text-blue-700">101 Okey Başlat</h2>
           <div className="flex gap-2 mb-4">
              <input value={newPlayer} onChange={e=>setNewPlayer(e.target.value)} className="flex-1 border p-3 rounded-lg" placeholder="İsim..." />
              <button onClick={addPlayer} className="bg-blue-600 text-white p-3 rounded-lg"><Plus/></button>
           </div>
           <div className="flex flex-wrap gap-2 justify-center mb-6">
              {gameData.players.map((p,i) => <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">{p.name}</span>)}
           </div>
           <button onClick={()=>updateGame({...gameData, active: true})} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">Başlat</button>
        </div>
     );
  }

  // --- SKOR TABLOSU ---
  return (
    <div className="animate-fade-in">
       <div className="flex justify-between items-center mb-6">
          <button onClick={onBack} className="text-gray-500">← Menü</button>
          <button onClick={()=>updateGame({active:false, players:[], mode:'single'})} className="text-red-500 text-sm">Sıfırla</button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {gameData.players.map((player, idx) => {
             const sumScores = player.scores.reduce((a,b)=>a+b, 0);
             const sumPenalties = (player.penalties || []).reduce((a,b)=>a+b, 0);
             const total = sumScores + sumPenalties;

             return (
                <div key={idx} className="bg-white rounded-xl shadow border flex flex-col h-[400px]">
                   <div className="bg-blue-50 p-4 text-center border-b">
                      <h3 className="font-bold">{player.name}</h3>
                      <div className="text-3xl font-black text-blue-600 mt-1">{total}</div>
                   </div>
                   <div className="flex-1 overflow-y-auto p-2 bg-gray-50 text-sm space-y-1">
                      {player.scores.map((s,i) => <div key={'s'+i} className="flex justify-between px-2 bg-white border rounded"><span>{i+1}.El</span><span className="font-bold">{s}</span></div>)}
                      {(player.penalties || []).map((p,i) => <div key={'p'+i} className="flex justify-between px-2 bg-red-50 border border-red-100 rounded text-red-600"><span>Ceza</span><span className="font-bold">{p}</span></div>)}
                   </div>
                   <div className="flex flex-col border-t">
                      <button onClick={()=>{setSelectedIdx(idx); setModalType('score');}} className="py-3 bg-white text-blue-600 font-bold hover:bg-blue-50 flex justify-center items-center gap-2"><PlusCircle size={16}/> Puan</button>
                      <button onClick={()=>{setSelectedIdx(idx); setModalType('penalty');}} className="py-2 bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 flex justify-center items-center gap-2 border-t"><AlertCircle size={16}/> Ceza</button>
                   </div>
                </div>
             )
          })}
       </div>

       {/* Modal */}
       {selectedIdx !== null && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
             <div className="bg-white p-6 rounded-xl w-72 animate-bounce-in">
                <div className="flex justify-between mb-4">
                   <h3 className="font-bold">{gameData.players[selectedIdx].name}</h3>
                   <button onClick={()=>setSelectedIdx(null)}><X/></button>
                </div>
                {modalType === 'penalty' && (
                   <div className="flex gap-2 mb-3">
                      <button onClick={()=>setInputValue('101')} className="flex-1 py-1 border rounded hover:bg-red-50">101</button>
                      <button onClick={()=>setInputValue('202')} className="flex-1 py-1 border rounded hover:bg-red-50">202</button>
                   </div>
                )}
                <input 
                   type="number" autoFocus 
                   value={inputValue} onChange={e=>setInputValue(e.target.value)}
                   className={`w-full border-2 p-3 rounded-lg text-2xl text-center mb-4 ${modalType==='penalty'?'border-red-300':'border-blue-300'}`}
                   placeholder={modalType==='score' ? 'Puan' : 'Ceza'}
                />
                <button onClick={addScoreOrPenalty} className={`w-full py-3 text-white font-bold rounded-lg ${modalType==='penalty'?'bg-red-500':'bg-blue-600'}`}>Kaydet</button>
             </div>
          </div>
       )}
    </div>
  );
}
