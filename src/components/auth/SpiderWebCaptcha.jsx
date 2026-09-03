import React, { useEffect, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export default function SpiderWebCaptcha({ onCaptchaChange }) {
  const canvasRef = useRef(null);
  const currentCodeRef = useRef('');

  const generateCode = useCallback(() => {
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)];
    }
    return result;
  }, []);

  const drawCaptcha = useCallback((code) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 146;
    const height = 50;

    // Retina support
    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(2, 2);

    // 1. Dark Black/Violet Textured Background
    ctx.fillStyle = '#06020e';
    ctx.fillRect(0, 0, width, height);

    // 2. Dense SpiderWeb & Crosshatch Noise Lines (just like SpiderWeb2 captcha image)
    // Draw concentric web rings
    const centerX = width / 2;
    const centerY = height / 2;
    ctx.lineWidth = 1;

    for (let r = 8; r < width; r += 10) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + (r % 2) * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(centerX + (Math.sin(r) * 10), centerY, r, r * 0.55, (r * 0.2), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw intricate crosshatching lines
    for (let i = 0; i < 35; i++) {
      ctx.strokeStyle = `rgba(${180 + Math.random() * 75}, ${180 + Math.random() * 75}, ${255}, ${0.25 + Math.random() * 0.35})`;
      ctx.lineWidth = 0.8 + Math.random() * 0.8;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    // Draw radiating spiderweb lines
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(a) * width, centerY + Math.sin(a) * height);
      ctx.stroke();
    }

    // 3. Draw Characters (Hollow Outlined & Distorted Security Glyphs)
    const charSpacing = (width - 24) / 5;
    const fonts = ['"Courier New", monospace', '"Impact", sans-serif', '"Arial Black", sans-serif', '"Trebuchet MS", sans-serif'];

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const x = 14 + i * charSpacing + (Math.random() * 4 - 2);
      const y = height / 2 + 8 + (Math.random() * 6 - 3);
      const rotation = (Math.random() * 0.45 - 0.225); // -13 to +13 deg

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      const fontName = fonts[i % fonts.length];
      const fontSize = 23 + Math.floor(Math.random() * 4);
      ctx.font = `900 ${fontSize}px ${fontName}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Outer Glow Shadow
      ctx.shadowColor = 'rgba(203, 78, 255, 0.9)';
      ctx.shadowBlur = 4;

      // Heavy White Outline
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(char, 0, 0);

      // Inner Dark Fill (creates the hollow/embossed look from SpiderWeb2)
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0d061c';
      ctx.fillText(char, 0, 0);

      // Fine inner contour
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#e9d5ff';
      ctx.strokeText(char, 0, 0);

      ctx.restore();
    }

    // 4. Scratch Security Lines Over Text
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(
        startX + Math.random() * 40 - 20,
        startY + Math.random() * 30 - 15,
        startX + Math.random() * 60 - 30,
        startY + Math.random() * 30 - 15,
        Math.random() * width,
        Math.random() * height
      );
      ctx.stroke();
    }

    // 5. Random security dots
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.5})`;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const refreshCaptcha = useCallback(() => {
    const newCode = generateCode();
    currentCodeRef.current = newCode;
    drawCaptcha(newCode);
    if (onCaptchaChange) {
      onCaptchaChange(newCode);
    }
  }, [generateCode, drawCaptcha, onCaptchaChange]);

  // Initial draw + 30-second Auto-refresh interval
  useEffect(() => {
    refreshCaptcha();

    const timer = setInterval(() => {
      refreshCaptcha();
    }, 30000); // Auto change every 30 seconds

    return () => clearInterval(timer);
  }, [refreshCaptcha]);

  return (
    <div
      onClick={refreshCaptcha}
      role="button"
      tabIndex={0}
      aria-label="Security Captcha - Click to refresh"
      title="Click to refresh CAPTCHA (Auto-refreshes every 30s)"
      style={{
        position: 'relative',
        width: '146px',
        height: '52px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1.5px solid #a83dff',
        boxShadow: '0 0 16px rgba(168, 61, 255, 0.4), inset 0 0 10px rgba(168, 61, 255, 0.2)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#06020e',
        flexShrink: 0,
        userSelect: 'none'
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      {/* Subtle refresh icon badge */}
      <div
        style={{
          position: 'absolute',
          top: 3,
          right: 3,
          background: 'rgba(0, 0, 0, 0.65)',
          borderRadius: '50%',
          width: '16px',
          height: '16px',
          display: 'grid',
          placeItems: 'center',
          color: '#cb4eff',
          border: '1px solid rgba(203, 78, 255, 0.4)'
        }}
      >
        <RefreshCw size={9} />
      </div>
    </div>
  );
}
