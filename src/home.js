import React from 'react';
import { Link } from 'react-router-dom';
import { RotateCw, Grid, Calculator } from 'lucide-react';

export default function Home() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
      {/* Şans Çarkı Kartı */}
      <Link to="/wheel" className="no-underline">
        <MenuCard 
          title="Şans Çarkı" 
          desc="İsim çekilişi yap." 
          icon={<RotateCw size={40} className="text-purple-600"/>} 
          color="border-purple-500" 
          bg="bg-purple-100" 
        />
      </Link>

      {/* Scrabble Kartı */}
      <Link to="/scrabble" className="no-underline">
        <MenuCard 
          title="Scrabble" 
          desc="Puan hesaplama." 
          icon={<Grid size={40} className="text-green-600"/>} 
          color="border-green-500" 
          bg="bg-green-100" 
        />
      </Link>

      {/* 101 Okey Kartı */}
      <Link to="/okey" className="no-underline">
        <MenuCard 
          title="101 Okey" 
          desc="Ceza takibi." 
          icon={<Calculator size={40} className="text-blue-600"/>} 
          color="border-blue-500" 
          bg="bg-blue-100" 
        />
      </Link>
    </div>
  );
}

// Kart Tasarımı (Sadece bu sayfada kullanıldığı için buraya aldık)
function MenuCard({ title, desc, icon, color, bg }) {
  return (
    <div className={`bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer border-t-4 ${color} flex flex-col items-center gap-4 group h-full`}>
      <div className={`${bg} p-4 rounded-full group-hover:scale-110 transition-transform`}>{icon}</div>
      <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
      <p className="text-gray-500 text-center">{desc}</p>
    </div>
  );
}
