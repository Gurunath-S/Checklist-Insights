import React from 'react';

const ColorfulCard = ({ color, icon, label, value, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-linear-to-br ${color} rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-white shadow-xl shadow-black/20 hover:-translate-y-2 hover:scale-105 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-primary/20' : 'cursor-default'} aspect-square lg:aspect-auto min-h-[100px]`}
  >
    {icon && React.cloneElement(icon, { size: 24, className: "opacity-90" })}
    <span className="text-[0.7rem] font-bold uppercase tracking-wide opacity-80 text-center truncate w-full" title={label}>{label}</span>
    <span className="text-xl font-extrabold">{value}</span>
  </div>
);

export default ColorfulCard;
