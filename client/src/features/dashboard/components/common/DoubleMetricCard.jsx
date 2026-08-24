import React from 'react';

const DoubleMetricCard = ({ color, icon, label, val1Label, val1, val2Label, val2 }) => (
  <div className={`bg-linear-to-br ${color} rounded-2xl p-4 flex flex-col justify-between text-white shadow-xl shadow-black/20 hover:-translate-y-2 hover:scale-105 transition-all duration-300 cursor-default aspect-square lg:aspect-auto min-h-[100px]`}>
    <div className="flex items-center justify-between gap-2 w-full mb-1">
      <span className="text-[0.7rem] font-bold uppercase tracking-wide opacity-80 truncate" title={label}>{label}</span>
      {icon && React.cloneElement(icon, { size: 16, className: "opacity-90 shrink-0" })}
    </div>
    <div className="flex items-center justify-between gap-2 mt-auto w-full">
      <div className="flex flex-col items-center flex-1 min-w-0">
        <span className="text-[8px] font-semibold uppercase opacity-75 tracking-wider mb-0.5 truncate w-full text-center" title={val1Label}>{val1Label}</span>
        <span className="text-base font-black truncate">{val1}</span>
      </div>
      <div className="w-[1px] h-7 bg-white/20 shrink-0"></div>
      <div className="flex flex-col items-center flex-1 min-w-0">
        <span className="text-[8px] font-semibold uppercase opacity-75 tracking-wider mb-0.5 truncate w-full text-center" title={val2Label}>{val2Label}</span>
        <span className="text-base font-black truncate">{val2}</span>
      </div>
    </div>
  </div>
);

export default DoubleMetricCard;
