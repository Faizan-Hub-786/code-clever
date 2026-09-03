import React from 'react';

export default function PageTitle({ eyebrow, title, text }) {
  return (
    <div className="page-title">
      {eyebrow && <span>{eyebrow}</span>}
      <h1>{title}</h1>
      {text && <p>{text}</p>}
    </div>
  );
}
