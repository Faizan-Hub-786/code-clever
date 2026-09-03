import React from 'react';

export default function Logo({ small = false }) {
  return (
    <div className={`logo ${small ? 'small' : ''}`}>
      <img src="/assets/logo.jpeg" alt="Code Clever Logo" />
      <span>CODE CLEVER</span>
    </div>
  );
}
