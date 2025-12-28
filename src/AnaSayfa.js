import React from 'react';
import { Link } from 'react-router-dom';
import { RotateCw, Grid, Truck, CalendarCheck } from 'lucide-react'; // CalendarCheck eklendi

export default function AnaSayfa() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
      
      {/* Sevkiyat Planla */}
      <Link to="/sevkiyat" className="no-underline">
        <MenuCard 
          title="Sevkiyat Planla" 
          desc="Stok ve ciro bazlı hesaplama." 
          icon={<Truck size={40} className="text-blue-600"/>} 
          color="border-blue-500" 
          bg="bg-blue-100" 
        />
      </Link>

      {/* SKT Kontrol - YENİ */}
      <Link to="/skt-kontrol" className="no-underline">
        <MenuCard 
          title="SKT Kontrol" 
          desc="İrsaliye ve tarih bazlı analiz." 
          icon={<CalendarCheck size={40} className="text-orange-600"/>} 
          color="border-orange-500" 
          bg="bg-orange-100" 
        />
      </Link>

      {/* Şans Çarkı */}
      <Link to="/wheel" className="no-underline">
        <MenuCard 
          title="Şans Çarkı" 
          desc="İsim çekilişi yap." 
          icon={<RotateCw size={40} className="text-purple-600"/>} 
          color="border-purple-500" 
          bg="bg-purple-100" 
        />
      </Link>

      {/* Scrabble */}
      <Link to="/scrabble" className="no-underline">
        <MenuCard 
          title="Scrabble" 
          desc="Puan hesaplama." 
          icon={<Grid size={40} className="text-green-600"/>} 
          color="border-green-500" 
          bg="bg-green-100" 
        />
      </Link>
    </div>
  );
}

function MenuCard({ title, desc, icon, color, bg }) {
  return (
    <div className={`bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer border-t-4 ${color} flex flex-col items-center gap-4 group h-full`}>
      <div className={`${bg} p-4 rounded-full group-hover:scale-110 transition-transform`}>{icon}</div>
      <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
      <p className="text-gray-500 text-center">{desc}</p>
    </div>
  );
}
