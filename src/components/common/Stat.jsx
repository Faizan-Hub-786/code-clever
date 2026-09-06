import React from 'react';

export default function Stat({ icon: I, label, value, sub, onClick }) {
  return (
    <div
      className={`stat ${onClick ? 'stat-clickable' : ''}`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease'
      }}
    >
      <div className="stat-icon">
        {I && (React.isValidElement(I) ? I : <I size={22} />)}
      </div>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {sub && <em>{sub}</em>}
      </div>
    </div>
  );
}
