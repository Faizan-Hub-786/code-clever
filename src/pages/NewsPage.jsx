import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Megaphone,
  Video,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Radio,
  Copy,
  Users,
  Play
} from 'lucide-react';
import Shell from '../components/layout/Shell';
import { API_BASE_URL, getAuthHeaders } from '../api/config';
import { normalizeImageUrl } from '../utils/formatters';

// Official Social Network SVG Icons for high-fidelity branding
const YouTubeSvg = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M21.582 7.187a2.708 2.708 0 0 0-1.905-1.916C17.994 4.8 12 4.8 12 4.8s-5.994 0-7.677.471a2.708 2.708 0 0 0-1.905 1.916C2 8.877 2 12.399 2 12.399s0 3.523.418 5.212a2.708 2.708 0 0 0 1.905 1.916c1.683.473 7.677.473 7.677.473s5.994 0 7.677-.473a2.708 2.708 0 0 0 1.905-1.916c.418-1.689.418-5.212.418-5.212s0-3.522-.418-5.212z"
      fill="#FF0000"
    />
    <polygon points="10,15 15.5,12.4 10,9.8" fill="#FFFFFF" />
  </svg>
);

const InstagramSvg = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad)" />
    <circle cx="12" cy="12" r="4.5" stroke="#ffffff" strokeWidth="2" fill="none" />
    <circle cx="17.5" cy="6.5" r="1.2" fill="#ffffff" />
    <defs>
      <linearGradient id="ig-grad" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f58529" />
        <stop offset="0.5" stopColor="#dd2a7b" />
        <stop offset="1" stopColor="#8134af" />
      </linearGradient>
    </defs>
  </svg>
);

const TikTokSvg = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="2" width="20" height="20" rx="6" fill="#120c1f" stroke="rgba(255,255,255,0.15)" />
    <path
      d="M16.6 8.2c-.8-.5-1.3-1.4-1.4-2.4H13v10.5c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5 1.1-2.5 2.5-2.5c.3 0 .6.1.9.2V11c-.3 0-.6-.1-.9-.1-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5v-6c1.1.8 2.5 1.3 4 1.3V8.8c-.8 0-1.7-.2-2.4-.6z"
      fill="#25F4EE"
    />
    <path
      d="M17 8.2c-.8-.5-1.3-1.4-1.4-2.4h-1.8v10.5c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5 1.1-2.5 2.5-2.5c.3 0 .6.1.9.2V11.5c-.3 0-.6-.1-.9-.1-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5V9.5c1.1.8 2.5 1.3 4 1.3V8.8c-.5 0-1.1-.2-1.8-.6z"
      fill="#FE2C55"
      style={{ mixBlendMode: 'screen' }}
    />
  </svg>
);

const OFFICIAL_CHANNELS = [
  {
    id: 'announcement_channel',
    title: 'Code-Clever Official Updates',
    badge: 'OFFICIAL ANNOUNCEMENTS',
    badgeColor: '#a855f7',
    icon: Megaphone,
    image: '/assets/news/official_updates_channel.webp',
    channelUrl: 'https://whatsapp.com/channel/0029VbDvBwe1NCrU5GW09A0I',
    btnText: 'Join Official WhatsApp Channel',
    description:
      'Get real-time platform updates, major new feature releases, daily earning task alerts, and verified corporate news delivered straight to your WhatsApp.',
    features: [
      '100% Official & Verified Channel',
      'Important Announcements & Notices',
      'New Feature Releases & Updates',
      'Security & Maintenance Alerts'
    ]
  },
  {
    id: 'video_guides_channel',
    title: 'Code-Clever Guideline Videos',
    badge: 'OFFICIAL VIDEO TUTORIALS',
    badgeColor: '#ec4899',
    icon: Video,
    image: '/assets/news/guideline_videos_channel.webp',
    channelUrl: 'https://whatsapp.com/channel/0029VbDfDEI4IBhBAAWEJG2M',
    btnText: 'Watch Official Guideline Videos',
    description:
      'Master the platform with comprehensive HD video tutorials covering account creation, login, password recovery, live support, task submission, and fast withdrawals.',
    features: [
      'How to Register & Login Guide',
      'How to Reset Password Safely',
      'How to Complete App Evaluation Tasks',
      'Deposit & Instant Withdrawal Proofs'
    ]
  }
];

const SOCIAL_NETWORKS = [
  {
    id: 'youtube',
    name: 'YouTube Official Channel',
    handle: '@Code-Clever_Space',
    badge: 'HD VIDEO MASTERCLASSES',
    badgeColor: '#ef4444',
    iconComp: YouTubeSvg,
    url: 'https://www.youtube.com/@Code-Clever_Space',
    btnText: 'Subscribe on YouTube',
    btnGradient: 'linear-gradient(135deg, #ef4444, #b91c1c)',
    bannerImg: '/assets/news/youtube_channel.webp',
    description:
      'Watch certified full-length platform walkthroughs, app evaluation demonstrations, corporate launch keynotes, partner webinars, and executive roadmaps in HD.',
    highlights: [
      'Step-by-Step App Evaluation Walkthroughs',
      'Corporate Keynotes & Stage Conventions',
      'Team Building & Downline Masterclasses',
      'Verified Instant Withdrawal Proofs'
    ]
  },
  {
    id: 'instagram',
    name: 'Instagram Community',
    handle: '@code.clever.space',
    badge: 'DAILY STORIES & HIGHLIGHTS',
    badgeColor: '#ec4899',
    iconComp: InstagramSvg,
    url: 'https://www.instagram.com/code.clever.space/',
    btnText: 'Follow on Instagram',
    btnGradient: 'linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6)',
    bannerImg: '/assets/news/instagram_channel.webp',
    description:
      'Follow our official Instagram handle for daily earnings highlights, member withdrawal proof reels, behind-the-scenes engineering team photos, and community giveaway contests.',
    highlights: [
      'Daily Verified Withdrawal Receipts',
      'Behind-the-Scenes Engineering Stories',
      'Top Performer & Partner Awards',
      'Interactive Q&A and Giveaway Contests'
    ]
  },
  {
    id: 'tiktok',
    name: 'TikTok Official',
    handle: '@code.clever',
    badge: 'VIRAL EARNING HACKS',
    badgeColor: '#06b6d4',
    iconComp: TikTokSvg,
    url: 'https://www.tiktok.com/@code.clever',
    btnText: 'Follow on TikTok',
    btnGradient: 'linear-gradient(135deg, #06b6d4, #ec4899)',
    bannerImg: '/assets/news/tiktok_channel.webp',
    description:
      'Join our fast-growing TikTok community! Discover 60-second micro-earning hacks, registration shortcuts, task evaluation strategies, and celebration videos.',
    highlights: [
      '60-Second Task Evaluation Hacks',
      'Instant Registration & Login Tips',
      'Member Testimonials & Payout Celebrations',
      'Viral Challenges & Bonus Drops'
    ]
  }
];

export default function NewsPage() {
  const nav = useNavigate();
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState('');

  const loadNews = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/news`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNewsList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load news:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const handleCopy = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(''), 2500);
  };

  // Filter additional announcements that are not the standard 5 pinned channels
  const additionalNews = newsList.filter((item) => {
    const url = String(item.action_url || '');
    return (
      !url.includes('0029VbDvBwe1NCrU5GW09A0I') &&
      !url.includes('0029VbDfDEI4IBhBAAWEJG2M') &&
      !url.includes('Code-Clever_Space') &&
      !url.includes('code.clever.space') &&
      !url.includes('@code.clever')
    );
  });

  return (
    <Shell>
      <div className="news-page-container" style={{ maxWidth: '1080px', margin: '0 auto', padding: '16px 12px 60px' }}>
        
        {/* Top Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => nav('/home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: '#cbd5e1',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <ChevronLeft size={16} /> Back to Home
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                color: '#d8b4fe',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <Radio size={12} color="#c084fc" className="animate-pulse" /> Live Broadcasts
            </span>
          </div>
        </div>

        {/* Hero Title Section */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(30, 15, 55, 0.95), rgba(15, 7, 30, 0.95))',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: '24px',
            padding: '28px 24px',
            marginBottom: '28px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles size={18} color="#c084fc" />
              <span style={{ color: '#c084fc', fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Official Information Desk
              </span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              News Center & Verified Channels
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '640px', lineHeight: 1.6, margin: 0 }}>
              Connect directly with verified Code-Clever platforms. Follow our official broadcast channels for instant announcements, system alerts, and step-by-step video guides.
            </p>
          </div>
        </div>

        {/* 1. Official WhatsApp Channels Section */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Official WhatsApp Channels
            </h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Instant • Verified • Direct
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {OFFICIAL_CHANNELS.map((ch) => {
              const IconComp = ch.icon;
              return (
                <motion.div
                  key={ch.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: 'linear-gradient(145deg, rgba(24, 12, 42, 0.95), rgba(12, 6, 24, 0.95))',
                    border: `1px solid ${ch.badgeColor}40`,
                    borderRadius: '22px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  {/* Channel Graphic / Banner */}
                  <div style={{ position: 'relative', width: '100%', height: '210px', overflow: 'hidden', background: '#0a0416' }}>
                    <img
                      src={ch.image}
                      alt={ch.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: ch.id === 'announcement_channel' ? 'center 58%' : 'center 48%'
                      }}
                    />
                    {/* Top gradient shadow to keep the top edge clean */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '50px',
                        background: 'linear-gradient(to bottom, rgba(10, 4, 22, 0.9), transparent)',
                        pointerEvents: 'none'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: 'rgba(10, 5, 20, 0.85)',
                        backdropFilter: 'blur(8px)',
                        border: `1px solid ${ch.badgeColor}60`,
                        borderRadius: '20px',
                        padding: '4px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: ch.badgeColor,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        zIndex: 2
                      }}
                    >
                      <IconComp size={12} /> {ch.badge}
                    </div>

                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(10, 5, 20, 0.85)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '20px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#4ade80',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        zIndex: 2
                      }}
                    >
                      <ShieldCheck size={13} /> Verified
                    </div>
                  </div>

                  {/* Channel Body */}
                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '10px' }}>
                        {ch.title}
                      </h3>
                      <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5, marginBottom: '16px' }}>
                        {ch.description}
                      </p>

                      {/* Feature Checklist */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '20px' }}>
                        {ch.features.map((feat, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                            <CheckCircle2 size={14} color={ch.badgeColor} style={{ flexShrink: 0 }} />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <a
                        href={ch.channelUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          background: ch.id === 'announcement_channel'
                            ? 'linear-gradient(135deg, #25D366, #128C7E)'
                            : 'linear-gradient(135deg, #a855f7, #ec4899)',
                          color: '#ffffff',
                          textDecoration: 'none',
                          padding: '12px 18px',
                          borderRadius: '14px',
                          fontWeight: 700,
                          fontSize: '13px',
                          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
                          textAlign: 'center'
                        }}
                      >
                        {ch.btnText} <ExternalLink size={15} />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopy(ch.channelUrl, ch.id)}
                        title="Copy Channel Link"
                        style={{
                          background: 'rgba(255, 255, 255, 0.07)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: copiedLink === ch.id ? '#4ade80' : '#cbd5e1',
                          padding: '12px',
                          borderRadius: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {copiedLink === ch.id ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* 2. Official Social Media Communities (YouTube, Instagram, TikTok) */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Official Social Media Communities
              </h2>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Follow verified Code-Clever channels for video masterclasses, daily proofs, and reels
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '20px' }}>
            {SOCIAL_NETWORKS.map((sn) => {
              const SvgIcon = sn.iconComp;
              return (
                <motion.div
                  key={sn.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: 'linear-gradient(145deg, rgba(22, 10, 39, 0.95), rgba(12, 5, 24, 0.95))',
                    border: `1px solid ${sn.badgeColor}40`,
                    borderRadius: '22px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  {/* Banner Image */}
                  <div style={{ position: 'relative', width: '100%', height: '210px', overflow: 'hidden', background: '#0a0416' }}>
                    <img
                      src={sn.bannerImg}
                      alt={sn.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center 40%'
                      }}
                    />
                    {/* Top gradient shadow for clean badge visibility */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '55px',
                        background: 'linear-gradient(to bottom, rgba(10, 4, 22, 0.85), transparent)',
                        pointerEvents: 'none'
                      }}
                    />

                    {/* Platform Tag Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: 'rgba(10, 5, 20, 0.85)',
                        backdropFilter: 'blur(8px)',
                        border: `1px solid ${sn.badgeColor}60`,
                        borderRadius: '20px',
                        padding: '4px 10px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: sn.badgeColor,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <SvgIcon /> {sn.badge}
                    </div>

                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(10, 5, 20, 0.85)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '20px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#4ade80',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <ShieldCheck size={13} /> Official
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                          {sn.name}
                        </h3>
                        <span style={{ fontSize: '11.5px', color: '#c084fc', background: 'rgba(192, 132, 252, 0.12)', padding: '2px 8px', borderRadius: '8px', fontWeight: 600 }}>
                          {sn.handle}
                        </span>
                      </div>

                      <p style={{ color: '#94a3b8', fontSize: '12.5px', lineHeight: 1.5, marginBottom: '16px' }}>
                        {sn.description}
                      </p>

                      {/* Highlights */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '7px', marginBottom: '20px' }}>
                        {sn.highlights.map((hl, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#cbd5e1' }}>
                            <CheckCircle2 size={13} color={sn.badgeColor} style={{ flexShrink: 0 }} />
                            <span>{hl}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <a
                        href={sn.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          background: sn.btnGradient,
                          color: '#ffffff',
                          textDecoration: 'none',
                          padding: '11px 16px',
                          borderRadius: '14px',
                          fontWeight: 700,
                          fontSize: '12.5px',
                          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
                          textAlign: 'center'
                        }}
                      >
                        {sn.btnText} <ExternalLink size={14} />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopy(sn.url, sn.id)}
                        title="Copy Link"
                        style={{
                          background: 'rgba(255, 255, 255, 0.07)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: copiedLink === sn.id ? '#4ade80' : '#cbd5e1',
                          padding: '11px',
                          borderRadius: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {copiedLink === sn.id ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* 3. Additional Platform Announcements & News Stream */}
        {additionalNews.length > 0 && (
          <div style={{ marginTop: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Platform Announcements & Notices
              </h2>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Latest Platform Updates
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              {additionalNews.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'linear-gradient(145deg, rgba(22, 10, 39, 0.95), rgba(12, 5, 24, 0.95))',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '18px',
                    padding: '20px 22px',
                    boxShadow: '0 8px 20px -5px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span
                          style={{
                            background: 'rgba(168, 85, 247, 0.15)',
                            color: '#c084fc',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                          }}
                        >
                          {item.category || 'Announcement'}
                        </span>
                        {item.created_date && (
                          <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} /> {item.created_date}
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                        {item.title}
                      </h3>
                    </div>

                    {item.action_url && (
                      <a
                        href={item.action_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                          color: '#ffffff',
                          textDecoration: 'none',
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '8px 14px',
                          borderRadius: '10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          flexShrink: 0
                        }}
                      >
                        {item.action_text || 'Open'} <ExternalLink size={13} />
                      </a>
                    )}
                  </div>

                  <p style={{ color: '#cbd5e1', fontSize: '13.5px', lineHeight: 1.6, margin: 0 }}>
                    {item.message}
                  </p>

                  {item.image_url && (
                    <div style={{ marginTop: '14px', borderRadius: '12px', overflow: 'hidden', maxHeight: '240px' }}>
                      <img
                        src={normalizeImageUrl(item.image_url)}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Shell>
  );
}
