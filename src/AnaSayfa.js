import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, CalendarCheck } from 'lucide-react';

export default function AnaSayfa() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in max-w-4xl mx-auto">
      
      {/* Sevkiyat Planla */}
      <Link to="/sevkiyat" className="no-underline group">
        <MenuCard 
          title="Sevkiyat Planla" 
          desc="Stok ve ciro bazlı hesaplama." 
          icon={<Truck size={48} className="text-blue-600 group-hover:scale-110 transition-transform"/>} 
          color="border-blue-500" 
          bg="bg-blue-50" 
        />
      </Link>

      {/* SKT Kontrol */}
      <Link to="/skt-kontrol" className="no-underline group">
        <MenuCard 
          title="SKT Kontrol" 
          desc="İrsaliye ve tarih bazlı analiz." 
          icon={<CalendarCheck size={48} className="text-orange-600 group-hover:scale-110 transition-transform"/>} 
          color="border-orange-500" 
          bg="bg-orange-50" 
        />
      </Link>

    </div>
  );
}

function MenuCard({ title, desc, icon, color, bg }) {
  return (
    <div className={`bg-white p-10 rounded-3xl shadow-sm hover:shadow-xl transition-all cursor-pointer border-t-8 ${color} flex flex-col items-center gap-6 h-full text-center border-x border-b border-gray-100`}>
      <div className={`${bg} p-6 rounded-full`}>{icon}</div>
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-500">{desc}</p>
      </div>
    </div>
  );
}
