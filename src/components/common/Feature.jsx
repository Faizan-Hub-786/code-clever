import React from 'react';
import { motion } from 'framer-motion';

export default function Feature({ img, title, text }) {
  return (
    <motion.article whileHover={{ y: -6 }} className="feature">
      <img src={img} alt={title} />
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </motion.article>
  );
}
