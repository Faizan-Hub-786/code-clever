import React from 'react';
import { motion } from 'framer-motion';

export default function Stat({ icon: I, label, value, sub, onClick }) {
  return (
    <motion.div
      whileHover={onClick ? { y: -4, borderColor: '#cb4eff', boxShadow: '0 8px 25px rgba(203,78,255,0.2)' } : { y: -2 }}
      whileTap={onClick ? { scale: 0.98 } : {}}
      className={`stat ${onClick ? 'stat-clickable' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="stat-icon">
        {I && (React.isValidElement(I) ? I : <I size={22} />)}
      </div>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {sub && <em>{sub}</em>}
      </div>
    </motion.div>
  );
}
