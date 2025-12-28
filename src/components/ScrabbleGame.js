import React, { useState } from 'react';
import { Plus, Trash2, Crown, Eye, EyeOff, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react';

export default function ScrabbleGame({ data, onUpdate, onBack }) {
  const [newPlayer, setNewPlayer] = useState('');
  const [scoreInput, setScoreInput] = useState('');
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(null);
  const [showScores, setShowScores] = useState(false);

  // Veri güvenliği için default değerler
  const gameData = data || { active: false, finished: false, players: [] };

  const updateGame = (newData) => onUpdate('scrabble', newData);

  const addPlayer = () => {
    if (newPlayer.trim()) {
      const newP = { name: newPlayer.trim(), scores: [], finalAdjustment: 0 };
      updateGame({ ...gameData, players: [...gameData.players, newP] });
      setNewPlayer('');
    }
  };

  const startGame = () => {
    if (gameData.players.length < 2) return alert("En az 2 oyuncu ekleyin.");
    updateGame({ ...gameData, active: true, finished: false });
  };

  const addScore = () => {
    if (selectedPlayerIndex === null || !scoreInput) return;
    const val = parseInt(scoreInput);
    if (isNaN(val)) return;

    const updatedPlayers = [...gameData.players];
    updatedPlayers[selectedPlayerIndex].scores.push({ val, label: val.toString() });
    updateGame({ ...gameData, players: updatedPlayers });
    setScoreInput('');
    setSelectedPlayerIndex(null);
  };

  const resetGame = () => {
    if(window.confirm("Oyun sıfırlanacak?")) updateGame({ active: false, finished: false, players: [] });
  };

  // --- OYUN ÖNCESİ EKRANI ---
  if (!gameData.active && !gameData.finished) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg">
        <button onClick={onBack} className="mb-4 text-gray-500">← Geri</button>
        <h2 className="text-2xl font-bold mb-4 text-green-700 text-center">Scrabble Başlat</h2>
        <div className="flex gap-2 mb-4">
          <input value={newPlayer} onChange={e=>setNewPlayer(e.target.value)} className="flex-1 border p-3 rounded-lg" placeholder="Oyuncu adı..." />
          <button onClick={addPlayer} className="bg-green-600 text-white p-3 rounded-lg"><Plus/></button>
        </div>
        <div className="space-y-2 mb-6">
          {gameData.players.map((p, i) => (
             <div key={i} className="p-2 bg-gray-50 rounded border flex justify-between">{i+1}. {p.name}</div>
          ))}
        </div>
        <button onClick={startGame} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">Başlat</button>
      </div>
    );
  }

  // --- OYUN EKRANI ---
  return (
    <div className="animate-fade-in">
       <div className="flex justify-between items-center mb-6">
          <button onClick={onBack} className="text-gray-500">← Menü</button>
          <div className="flex gap-3">
             <button onClick={()=>setShowScores(!showScores)} className="text-indigo-600 flex gap-1 items-center">
                {showScores ? <EyeOff size={16}/> : <Eye size={16}/>} {showScores ? 'Gizle' : 'Göster'}
             </button>
             <button onClick={resetGame} className="text-red-500 flex gap-1 items-center"><RotateCcw size={16}/> Sıfırla</button>
          </div>
       </div>

       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {gameData.players.map((player, idx) => {
             const totalScore = player.scores.reduce((acc, curr) => acc + (typeof curr === 'object' ? curr.val : curr), 0);
             const displayScore = (gameData.finished || showScores) ? totalScore : '???';
             return (
               <div key={idx} className="bg-white rounded-xl shadow border overflow-hidden">
                 <div className="p-3 text-center border-b bg-gray-50">
                   <h3 className="font-bold">{player.name}</h3>
                   <div className="text-2xl font-black text-green-600">{displayScore}</div>
                 </div>
                 <div className="h-40 overflow-y-auto p-2 bg-gray-50 text-sm">
                    {player.scores.map((s, si) => (
                       <div key={si} className="flex justify-between border-b pb-1 mb-1">
                          <span className="text-gray-400">{si+1}.</span>
                          <span>{typeof s === 'object' ? s.label : s}</span>
                       </div>
                    ))}
                 </div>
                 <button 
                    onClick={() => setSelectedPlayerIndex(idx)}
                    className="w-full py-3 bg-green-600 text-white font-bold hover:bg-green-700"
                 >
                   + Puan Ekle
                 </button>
               </div>
             )
          })}
       </div>

       {/* Puan Ekleme Modalı */}
       {selectedPlayerIndex !== null && (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-64 animate-bounce-in">
               <h3 className="font-bold text-center mb-4">{gameData.players[selectedPlayerIndex].name}</h3>
               <input 
                 type="number" 
                 autoFocus 
                 value={scoreInput} 
                 onChange={e=>setScoreInput(e.target.value)} 
                 className="w-full border-2 border-green-500 p-3 rounded-lg text-2xl text-center mb-4" 
                 placeholder="0"
               />
               <div className="flex gap-2">
                 <button onClick={()=>setSelectedPlayerIndex(null)} className="flex-1 bg-gray-200 py-2 rounded">İptal</button>
                 <button onClick={addScore} className="flex-1 bg-green-600 text-white py-2 rounded">Ekle</button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
}
