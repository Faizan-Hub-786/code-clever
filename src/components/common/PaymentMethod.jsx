import React from 'react';
import { CheckCircle } from 'lucide-react';

export default function PaymentMethod({ value, onChange }) {
  const methods = [
    ['jazzcash', 'JazzCash'],
    ['easypaisa', 'Easypaisa'],
    ['nayapay', 'NayaPay'],
    ['sadapay', 'SadaPay']
  ];

  return (
    <div className="method-grid">
      {methods.map(([id, label]) => (
        <button
          type="button"
          key={id}
          className={value === id ? 'selected' : ''}
          onClick={() => onChange(id)}
        >
          <div className={`method-logo ${id}`}>{label.slice(0, 2)}</div>
          <span>{label}</span>
          {value === id && <CheckCircle size={17} />}
        </button>
      ))}
    </div>
  );
}
