import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  X,
  Send,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Zap,
  CheckCircle,
  Pin,
  Clock,
  MessageSquareText,
  AlertCircle,
  HelpCircle,
  KeyRound,
  FileText,
  Trash2,
  Video,
  ExternalLink,
  Play
} from 'lucide-react';
import { API_BASE_URL } from '../../api/config';

// Helper to automatically turn URLs into clickable anchor links
function renderTextWithClickableLinks(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      const cleanUrl = part.replace(/[.,;:)\]]+$/, '');
      const trailing = part.slice(cleanUrl.length);
      return (
        <React.Fragment key={i}>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#38bdf8',
              textDecoration: 'underline',
              fontWeight: 700,
              wordBreak: 'break-all'
            }}
          >
            {cleanUrl}
          </a>
          {trailing}
        </React.Fragment>
      );
    }
    return part;
  });
}

const KNOWLEDGE_BASE = [
  {
    id: 'greetings',
    keywords: ['hi', 'hello', 'hey', 'salam', 'assalam', 'aoa', 'hy', 'hii', 'morning', 'afternoon', 'evening', 'how are you', 'help me', 'start', 'test'],
    response: `👋 **Hello! Welcome to Code Clever.**\n\nI am your 24/7 AI Assistant. How can I help you today?\n\n📌 **Support & Message Policy (24-Hour Limits):**\n• 💬 **1 General Query / Message to Admin** per 24 hours\n• 🔑 **1 Password Reset request** per 24 hours\n• 📌 Official Admin replies are **automatically pinned at the top** of this chat within 24 hours.\n\nFeel free to ask me anything about:\n• 🌟 Official Social Media & Community Channels\n• 📺 Official WhatsApp Video Guides Channel\n• 🔑 Getting an Invitation Code\n• 📝 Registration & Account Rules\n• 💼 Earning Plans (C1 to C9)\n• 💳 Deposits & Payouts (JazzCash / Easypaisa)\n• 🔒 Password & Security Recovery`,
    suggestions: [
      '🌟 Official Social Media Channels',
      '📺 YouTube Channel',
      '📸 Instagram Handle',
      '🎵 TikTok Channel',
      '🎬 WhatsApp Video Guides',
      '🔑 Where do I get an Invite Code?',
      '📝 How do I register an account?',
      '💼 Plans & Daily Earnings',
      '🔒 Forgot Password Help'
    ]
  },
  {
    id: 'social_media_all',
    keywords: [
      'social', 'social media', 'channels', 'socials', 'links', 'official accounts', 'follow', 'handles', 'pages',
      'where to follow', 'youtube and instagram', 'tiktok and youtube', 'official links', 'community', 'facebook', 'email', 'gmail'
    ],
    response: `🌟 **Official Verified Code Clever Social & Support Channels:**\n\nConnect with our verified accounts across all networks for video guides, payment proofs, support inquiries, and official announcements:\n\n• 📧 **Email Support (Gmail):**\n  24/7 dedicated member support desk.\n  👉 mailto:code.clever.space@gmail.com\n  Email: **code.clever.space@gmail.com**\n\n• 📘 **Facebook Community:**\n  Official news, discussions & message queries.\n  👉 https://www.facebook.com/code.clever.space\n\n• 📸 **Instagram Community:**\n  Daily payout receipts, stories & team photos.\n  👉 https://www.instagram.com/code.clever.space/\n\n• 🎵 **TikTok Channel:**\n  60-second task hacks, tips & viral challenges.\n  👉 https://www.tiktok.com/@code.clever\n\n• 📺 **YouTube Channel:**\n  Full tutorial videos, conventions & walkthroughs.\n  👉 https://www.youtube.com/@Code-Clever_Space\n\n• 📢 **WhatsApp Updates Group:**\n  Important platform notices & alerts.\n  👉 https://whatsapp.com/channel/0029VbDvBwe1NCrU5GW09A0I\n\n• 🎬 **WhatsApp Video Guides:**\n  Visual step-by-step app guides.\n  👉 https://whatsapp.com/channel/0029VbDfDEI4IBhBAAWEJG2M`,
    suggestions: [
      '📧 Gmail Support',
      '📘 Facebook Page',
      '📸 Instagram Handle',
      '🎵 TikTok Channel',
      '📺 YouTube Channel'
    ]
  },
  {
    id: 'gmail_support',
    keywords: ['email', 'gmail', 'mail', 'support email', 'contact email', 'code clever email', 'write email', 'email address', 'official email'],
    response: `📧 **Official Code Clever Email Support:**\n\nFor 24/7 official member assistance, payout inquiries, and account security verification, you can email our support team directly:\n\n👉 **Official Email Address:**\n**code.clever.space@gmail.com**\n\n👉 **Click to Send Email Query:**\nmailto:code.clever.space@gmail.com?subject=Code%20Clever%20Support%20Query`,
    suggestions: [
      '📘 Facebook Page',
      '📸 Instagram Handle',
      '🎵 TikTok Channel',
      '📞 Leave Message for Admin'
    ]
  },
  {
    id: 'facebook_channel',
    keywords: ['facebook', 'fb', 'facebook page', 'facebook link', 'follow facebook', 'facebook account', 'fb page'],
    response: `📘 **Official Code Clever Facebook Page:**\n\nConnect with our official Facebook page for platform news, community discussions, member earning stories, and messenger queries:\n\n👉 **Follow & Message on Facebook:**\nhttps://www.facebook.com/code.clever.space\n\nPage: **Code Clever Official**`,
    suggestions: [
      '📧 Gmail Support',
      '📸 Instagram Handle',
      '🎵 TikTok Channel',
      '📺 YouTube Channel'
    ]
  },
  {
    id: 'youtube_channel',
    keywords: ['youtube', 'yt', 'youtube link', 'youtube channel', 'watch youtube', 'youtube videos', 'video channel'],
    response: `📺 **Official Code Clever YouTube Channel:**\n\nSubscribe to our certified YouTube channel for in-depth platform walkthroughs, full app evaluation tutorials, corporate launch speeches, and member earning strategies:\n\n👉 **Subscribe & Watch on YouTube:**\nhttps://www.youtube.com/@Code-Clever_Space\n\nChannel Handle: **@Code-Clever_Space**`,
    suggestions: [
      '📸 Instagram Handle',
      '🎵 TikTok Channel',
      '🎬 WhatsApp Video Guides',
      '💼 Plans & Daily Earnings'
    ]
  },
  {
    id: 'instagram_channel',
    keywords: ['instagram', 'insta', 'ig', 'follow instagram', 'instagram link', 'instagram handle', 'instagram page'],
    response: `📸 **Official Code Clever Instagram Handle:**\n\nFollow our verified Instagram page for daily withdrawal receipts, behind-the-scenes office stories, top performer spotlights, and community announcements:\n\n👉 **Follow on Instagram:**\nhttps://www.instagram.com/code.clever.space/\n\nHandle: **@code.clever.space**`,
    suggestions: [
      '📧 Gmail Support',
      '📘 Facebook Page',
      '🎵 TikTok Channel',
      '📢 WhatsApp Updates Group'
    ]
  },
  {
    id: 'tiktok_channel',
    keywords: ['tiktok', 'tik tok', 'tok', 'tiktok link', 'follow tiktok', 'tiktok account', 'tiktok channel'],
    response: `🎵 **Official Code Clever TikTok Channel:**\n\nJoin our fast-growing TikTok community! Discover 60-second earning shortcuts, daily task hacks, registration tips, and member payout celebrations:\n\n👉 **Follow on TikTok:**\nhttps://www.tiktok.com/@code.clever\n\nHandle: **@code.clever**`,
    suggestions: [
      '📧 Gmail Support',
      '📸 Instagram Handle',
      '📘 Facebook Page',
      '📺 YouTube Channel'
    ]
  },
  {
    id: 'whatsapp_updates_channel',
    keywords: ['announcement channel', 'whatsapp channel', 'whatsapp updates', 'announcement group', 'whatsapp group', 'code clever announcement'],
    response: `📢 **Official Code Clever Announcement & Updates Channel:**\n\nStay ahead with 100% verified alerts on daily task resets, new features, system maintenance, and official platform news:\n\n👉 **Join on WhatsApp:**\nhttps://whatsapp.com/channel/0029VbDvBwe1NCrU5GW09A0I`,
    suggestions: [
      '🎬 WhatsApp Video Guides',
      '📺 YouTube Channel',
      '💼 Plans & Daily Earnings'
    ]
  },
  {
    id: 'video_guides_channel',
    keywords: [
      'video', 'channel', 'guide', 'tutorial', 'tutorials', 'whatsapp', 'how to video', 'watch', 'learn', 'demo',
      'training', 'instructions', 'how to register', 'how to login', 'how to reset password',
      'how to chat in bot', 'how to use help', 'support guide'
    ],
    response: `🎬 **Official Code Clever Video Guides Channel:**\n\nThis channel is specifically designed to guide every member through visual video demonstrations:\n\n• 🎬 **How to Register Account** (Invitation & account creation)\n• 🔑 **How to Login Securely** (Account authentication)\n• 🔄 **How to Reset Password** (Security question & temporary PIN)\n• 🤖 **How to Chat in Bot** (24/7 AI & admin tickets)\n• 🎧 **How to Use Help & Support** (Submitting inquiries & screenshots)\n\n👉 **Join & Watch on WhatsApp Channel:**\nhttps://whatsapp.com/channel/0029VbDfDEI4IBhBAAWEJG2M`,
    suggestions: [
      '📺 YouTube Channel',
      '📢 WhatsApp Updates Group',
      '📝 How do I register an account?',
      '🔒 Forgot Password Help'
    ]
  },
  {
    id: 'invitation',
    keywords: ['invite', 'invitation', 'referral', 'sponsor', 'code', 'ref', 'link', 'where code', 'give code', 'sponsor code', 'need code'],
    response: `🔐 **Invitation / Sponsor Code Guidelines:**\n\nCode Clever operates on an exclusive, invite-only structure. To create an account, you must have an authentic referral code from an existing sponsor.\n\n• **Received a Link?** If you clicked a link with \`?ref=...\`, your sponsor's code will automatically fill in.\n• **Want Your Own Code?** Once you activate any earning package (Plan C1–C9), your personal referral link and code will be generated instantly in your dashboard to invite your team!`,
    suggestions: [
      '📝 How do I register an account?',
      '💼 Plans & Daily Earnings',
      '👥 Team Referral Commissions',
      '📞 Leave Message for Admin'
    ]
  },
  {
    id: 'registration',
    keywords: ['register', 'signup', 'sign up', 'create account', 'join', 'new account', 'how to register', 'registration', 'rules', 'process'],
    response: `📝 **Registration Guidelines & Requirements:**\n\nTo register on Code Clever:\n1. **Unique Full Name:** No two members can have the identical name. If your name is in use, our system will offer available variations.\n2. **Unique Mobile Phone:** Each phone number can only be registered once.\n3. **Valid Email Address:** Used for account verification and communications.\n4. **Secure Password:** Minimum 8 characters.\n5. **Secret Security Question:** Set a secret answer during signup to easily recover your password if forgotten.\n6. **Sponsor Invitation Code & CAPTCHA**`,
    suggestions: [
      '🔑 Where do I get an Invite Code?',
      '💼 Plans & Daily Earnings',
      '🔒 Forgot Password Help',
      'Switch to Signup'
    ]
  },
  {
    id: 'name_phone_rules',
    keywords: ['same name', 'name error', 'different name', 'unique name', 'phone number', 'already registered', 'number already', 'duplicate'],
    response: `👤 **Account Identity Security:**\n\n• **Unique Name Rule:** Every Code Clever user must have a distinctive name. If you encounter a duplicate name message, choose one of the suggested alternative names.\n• **Unique Mobile Number:** Each phone number is bound to exactly one account to maintain database integrity.\n• **Security Question:** Protects your account from unauthorized password resets.`,
    suggestions: [
      '📝 How do I register an account?',
      '🔒 Forgot Password Help',
      'Switch to Signup'
    ]
  },
  {
    id: 'password_reset',
    keywords: ['password', 'forgot', 'reset', 'login', 'cant login', 'cannot login', 'recover', 'pin', 'fund password', 'locked'],
    response: `🔑 **Password Recovery Protocol:**\n\n• **2-Step Verification:** Click "Forgot Password?" on the login page, enter your registered email/phone, and answer your secret security question.\n• **Daily Quota:** For platform security, members can submit 1 password recovery request per day.\n• **Admin Pinned Dispatch:** Once verified, your recovery ticket is sent to Administration, and the resolution or temporary password will be **pinned directly in this chat**!`,
    suggestions: [
      '🔒 Forgot Password Help',
      '📝 How do I register an account?',
      '📞 Leave Message for Admin'
    ]
  },
  {
    id: 'plan_c1',
    keywords: ['c1', 'plan c1', 'c1 plan', 'starter plan', 'starter package', 'c 1', 'c-1', 'about c1', 'c1 detail', 'c1 details', 'c1 income', 'c1 earning'],
    response: `💼 **Plan C1 (Starter Tier) Official Details:**\n\n• 🏷️ **Tier Name:** Starter (C1)\n• 💰 **Job Bond (Activation):** Rs. 3,500\n• 📱 **Daily Tasks:** 2 Tasks\n• 💵 **Reward per Task:** Rs. 59\n• 📈 **Daily Income:** Rs. 118\n• 📅 **Monthly Income (30 Days):** Rs. 3,540\n• 🗓️ **Annual Income:** Rs. 42,480\n• ⚡ **Withdrawals:** Fast daily settlements to JazzCash, Easypaisa, SadaPay & Bank accounts.\n\n*Deposit Rs. 3,500 in your dashboard and activate Plan C1 to start evaluating tasks daily!*`,
    suggestions: [
      '💼 View All Plans',
      'Plan C2 Details',
      'Plan C3 Details',
      '👥 Team Referral Commissions',
      '💳 Deposit & Withdrawal Info'
    ]
  },
  {
    id: 'plan_c2',
    keywords: ['c2', 'plan c2', 'c2 plan', 'growth plan', 'growth package', 'c 2', 'c-2', 'about c2', 'c2 detail', 'c2 details', 'c2 income', 'c2 earning'],
    response: `💼 **Plan C2 (Growth Tier) Official Details:**\n\n• 🏷️ **Tier Name:** Growth (C2)\n• 💰 **Job Bond (Activation):** Rs. 15,500\n• 📱 **Daily Tasks:** 4 Tasks\n• 💵 **Reward per Task:** Rs. 129\n• 📈 **Daily Income:** Rs. 516\n• 📅 **Monthly Income (30 Days):** Rs. 15,480\n• 🗓️ **Annual Income:** Rs. 185,760\n• ⚡ **Withdrawals:** Fast daily settlements to JazzCash, Easypaisa, SadaPay & Bank accounts.`,
    suggestions: [
      '💼 View All Plans',
      'Plan C1 Details',
      'Plan C3 Details',
      '👥 Team Referral Commissions'
    ]
  },
  {
    id: 'plan_c3',
    keywords: ['c3', 'plan c3', 'c3 plan', 'pro plan', 'pro package', 'c 3', 'c-3', 'about c3', 'c3 detail', 'c3 details', 'c3 income', 'c3 earning'],
    response: `💼 **Plan C3 (Pro Tier) Official Details:**\n\n• 🏷️ **Tier Name:** Pro (C3)\n• 💰 **Job Bond (Activation):** Rs. 59,000\n• 📱 **Daily Tasks:** 8 Tasks\n• 💵 **Reward per Task:** Rs. 246\n• 📈 **Daily Income:** Rs. 1,968\n• 📅 **Monthly Income (30 Days):** Rs. 59,040\n• 🗓️ **Annual Income:** Rs. 708,480\n• ⚡ **Withdrawals:** Fast daily settlements to JazzCash, Easypaisa, SadaPay & Bank accounts.`,
    suggestions: [
      '💼 View All Plans',
      'Plan C2 Details',
      'Plan C4 Details',
      '👥 Team Referral Commissions'
    ]
  },
  {
    id: 'plan_c4',
    keywords: ['c4', 'plan c4', 'c4 plan', 'advanced plan', 'advanced package', 'c 4', 'c-4', 'about c4', 'c4 detail', 'c4 details', 'c4 income', 'c4 earning'],
    response: `💼 **Plan C4 (Advanced Tier) Official Details:**\n\n• 🏷️ **Tier Name:** Advanced (C4)\n• 💰 **Job Bond (Activation):** Rs. 215,000\n• 📱 **Daily Tasks:** 12 Tasks\n• 💵 **Reward per Task:** Rs. 597\n• 📈 **Daily Income:** Rs. 7,164\n• 📅 **Monthly Income (30 Days):** Rs. 214,920\n• 🗓️ **Annual Income:** Rs. 2,579,040\n• ⚡ **Withdrawals:** Fast daily settlements to JazzCash, Easypaisa, SadaPay & Bank accounts.`,
    suggestions: [
      '💼 View All Plans',
      'Plan C3 Details',
      'Plan C5 Details',
      '👥 Team Referral Commissions'
    ]
  },
  {
    id: 'plan_c5',
    keywords: ['c5', 'plan c5', 'c5 plan', 'elite plan', 'elite package', 'c 5', 'c-5', 'about c5', 'c5 detail', 'c5 details', 'c5 income', 'c5 earning'],
    response: `💼 **Plan C5 (Elite Tier) Official Details:**\n\n• 🏷️ **Tier Name:** Elite (C5)\n• 💰 **Job Bond (Activation):** Rs. 479,000\n• 📱 **Daily Tasks:** 16 Tasks\n• 💵 **Reward per Task:** Rs. 998\n• 📈 **Daily Income:** Rs. 15,968\n• 📅 **Monthly Income (30 Days):** Rs. 479,040\n• 🗓️ **Annual Income:** Rs. 5,748,480\n• ⚡ **Withdrawals:** Fast daily settlements to JazzCash, Easypaisa, SadaPay & Bank accounts.`,
    suggestions: [
      '💼 View All Plans',
      'Plan C4 Details',
      'Plan C6 Details',
      '👥 Team Referral Commissions'
    ]
  },
  {
    id: 'plan_c6',
    keywords: ['c6', 'plan c6', 'c6 plan', 'premium plan', 'premium package', 'c 6', 'c-6', 'about c6', 'c6 detail', 'c6 details'],
    response: `💼 **Plan C6 (Premium Tier) Official Details:**\n\n• 🏷️ **Tier Name:** Premium (C6)\n• 💰 **Job Bond (Activation):** Rs. 1,454,000\n• 📱 **Daily Tasks:** 18 Tasks\n• 💵 **Reward per Task:** Rs. 2,693\n• 📈 **Daily Income:** Rs. 48,474\n• 📅 **Monthly Income (30 Days):** Rs. 1,454,220\n• 🗓️ **Annual Income:** Rs. 17,450,640\n• ⚡ **Withdrawals:** Fast daily settlements to JazzCash, Easypaisa, SadaPay & Bank accounts.`,
    suggestions: [
      '💼 View All Plans',
      'Plan C5 Details',
      'Plan C7 Details',
      '👥 Team Referral Commissions'
    ]
  },
  {
    id: 'plan_c7',
    keywords: ['c7', 'plan c7', 'c7 plan', 'business plan', 'business package', 'c 7', 'c-7', 'about c7', 'c7 detail', 'c7 details'],
    response: `💼 **Plan C7 (Business Tier) Official Details:**\n\n• 🏷️ **Tier Name:** Business (C7)\n• 💰 **Job Bond (Activation):** Rs. 3,869,000\n• 📱 **Daily Tasks:** 22 Tasks\n• 💵 **Reward per Task:** Rs. 5,862\n• 📈 **Daily Income:** Rs. 128,964\n• 📅 **Monthly Income (30 Days):** Rs. 3,868,920\n• 🗓️ **Annual Income:** Rs. 46,427,040\n• ⚡ **Withdrawals:** Fast daily settlements to JazzCash, Easypaisa, SadaPay & Bank accounts.`,
    suggestions: [
      '💼 View All Plans',
      'Plan C6 Details',
      'Plan C8 Details',
      '👥 Team Referral Commissions'
    ]
  },
  {
    id: 'plan_c8',
    keywords: ['c8', 'plan c8', 'c8 plan', 'executive plan', 'executive package', 'c 8', 'c-8', 'about c8', 'c8 detail', 'c8 details'],
    response: `💼 **Plan C8 (Executive Tier) Official Details:**\n\n• 🏷️ **Tier Name:** Executive (C8)\n• 💰 **Job Bond (Activation):** Rs. 7,349,000\n• 📱 **Daily Tasks:** 24 Tasks\n• 💵 **Reward per Task:** Rs. 10,207\n• 📈 **Daily Income:** Rs. 244,968\n• 📅 **Monthly Income (30 Days):** Rs. 7,349,040\n• 🗓️ **Annual Income:** Rs. 88,188,480\n• ⚡ **Withdrawals:** Fast daily settlements to JazzCash, Easypaisa, SadaPay & Bank accounts.`,
    suggestions: [
      '💼 View All Plans',
      'Plan C7 Details',
      'Plan C9 Details',
      '👥 Team Referral Commissions'
    ]
  },
  {
    id: 'plan_c9',
    keywords: ['c9', 'plan c9', 'c9 plan', 'enterprise plan', 'enterprise package', 'c 9', 'c-9', 'about c9', 'c9 detail', 'c9 details'],
    response: `💼 **Plan C9 (Enterprise Tier) Official Details:**\n\n• 🏷️ **Tier Name:** Enterprise (C9)\n• 💰 **Job Bond (Activation):** Rs. 15,149,000\n• 📱 **Daily Tasks:** 28 Tasks\n• 💵 **Reward per Task:** Rs. 18,035\n• 📈 **Daily Income:** Rs. 504,980\n• 📅 **Monthly Income (30 Days):** Rs. 15,149,400\n• 🗓️ **Annual Income:** Rs. 181,792,800\n• ⚡ **Withdrawals:** Fast daily settlements to JazzCash, Easypaisa, SadaPay & Bank accounts.`,
    suggestions: [
      '💼 View All Plans',
      'Plan C8 Details',
      '👥 Team Referral Commissions',
      '💳 Deposit & Withdrawal Info'
    ]
  },
  {
    id: 'plan_intern',
    keywords: ['intern', 'free trial', 'intern trial', 'intern package', '3 day trial', 'trial plan', 'trial earning'],
    response: `💼 **Intern Trial (3-Day Free Package) Official Details:**\n\n• 🏷️ **Tier Name:** Intern (Introductory Trial)\n• 💰 **Job Bond:** Free (Rs. 0)\n• ⏳ **Validity:** 3 Days from Registration\n• 📱 **Daily Tasks:** 2 Tasks\n• 💵 **Reward per Task:** Rs. 59\n• 📈 **Daily Income:** Rs. 118\n• 🎁 **Total Trial Earning:** Rs. 354 (credited directly to Personal Wallet)\n• 💡 **Note:** Daily check-in & referral links unlock upon activating your first paid plan (C1–C9).`,
    suggestions: [
      '💼 View All Plans',
      'Plan C1 Details',
      'Plan C2 Details',
      '📝 How do I register an account?'
    ]
  },
  {
    id: 'plans',
    keywords: ['plan', 'plans', 'all plans', 'packages', 'earning tiers', 'packages list', 'plans list', 'daily earning', 'earning rates', 'package details', 'bond', 'profit', 'daily income'],
    response: `💼 **Code Clever Verified Earning Plans (Official Database Rates):**\n\n• **Plan C1 (Starter):** Bond Rs. 3,500 | 2 Tasks/day | Daily: Rs. 118 | Monthly: Rs. 3,540\n• **Plan C2 (Growth):** Bond Rs. 15,500 | 4 Tasks/day | Daily: Rs. 516 | Monthly: Rs. 15,480\n• **Plan C3 (Pro):** Bond Rs. 59,000 | 8 Tasks/day | Daily: Rs. 1,968 | Monthly: Rs. 59,040\n• **Plan C4 (Advanced):** Bond Rs. 215,000 | 12 Tasks/day | Daily: Rs. 7,164 | Monthly: Rs. 214,920\n• **Plan C5 (Elite):** Bond Rs. 479,000 | 16 Tasks/day | Daily: Rs. 15,968 | Monthly: Rs. 479,040\n• **Plan C6 (Premium):** Bond Rs. 1,454,000 | 18 Tasks/day | Daily: Rs. 48,474 | Monthly: Rs. 1,454,220\n• **Plan C7 (Business):** Bond Rs. 3,869,000 | 22 Tasks/day | Daily: Rs. 128,964 | Monthly: Rs. 3,868,920\n• **Plan C8 (Executive):** Bond Rs. 7,349,000 | 24 Tasks/day | Daily: Rs. 244,968 | Monthly: Rs. 7,349,040\n• **Plan C9 (Enterprise):** Bond Rs. 15,149,000 | 28 Tasks/day | Daily: Rs. 504,980 | Monthly: Rs. 15,149,400\n• **Intern Trial:** Free 3-Day Trial | 2 Tasks/day | Total: Rs. 354\n\n💡 *Type any specific plan code (e.g. "C1", "C2", "C3") to get its dedicated breakdown!*`,
    suggestions: [
      'Plan C1 Details',
      'Plan C2 Details',
      'Plan C3 Details',
      '👥 Team Referral Commissions',
      '💳 Deposit & Withdrawal Info'
    ]
  },
  {
    id: 'commissions',
    keywords: ['commission', 'team', 'referral reward', 'downline', 'level a', 'level b', 'level c', 'leader', 'hierarchy', 'invite reward'],
    response: `👥 **3-Level Team Referral System:**\n\nEarn passive daily commissions from your downline network:\n• **Level A (Direct Referrals):** 10% Package Commission\n• **Level B (2nd Generation):** 5% Package Commission\n• **Level C (3rd Generation):** 2% Package Commission\n\n*Plus First Deposit Management Bonuses and Lucky Wheel Bonus spin grants!*`,
    suggestions: [
      '💼 Plans & Daily Earnings',
      'Plan C1 Details',
      '🔑 Where do I get an Invite Code?',
      '💳 Deposit & Withdrawal Info'
    ]
  },
  {
    id: 'financials',
    keywords: ['deposit', 'recharge', 'withdraw', 'withdrawal', 'easypaisa', 'jazzcash', 'bank', 'payout', 'money', 'payment', 'jazz cash', 'easy paisa', 'timing'],
    response: `💳 **Deposits & Fast Withdrawals:**\n\n• **Supported Methods:** Easypaisa, JazzCash, SadaPay, NayaPay, and all Pakistani commercial banks (IBAN/Account).\n• **Processing Hours:** Monday to Saturday, 10:00 AM – 06:00 PM PKT.\n• **Settlement Speed:** Typically 10 to 15 minutes (max 2 hours during peak volume).\n• **Security:** Zero hidden transaction fees and automated transaction ID (TID) verification.`,
    suggestions: [
      '💼 Plans & Daily Earnings',
      'Plan C1 Details',
      '📝 How do I register an account?',
      '📞 Leave Message for Admin'
    ]
  },
  {
    id: 'support_admin',
    keywords: ['support', 'admin', 'help', 'contact', 'customer service', 'agent', 'leave message', 'msg', 'human', 'owner', 'manager'],
    response: `📞 **Official Platform Administration Support:**\n\nNeed direct assistance from platform administrators?\n\n• Type your message, question, or issue directly in this chat.\n• Your inquiry is tracked under 24-Hour Ticket \`{SESSION_TOKEN}\`.\n• Once reviewed by Administration, their reply will be **automatically pinned at the top of this chat** so you see it immediately upon visiting!\n• You can also reach our official email directly at **code.clever.space@gmail.com**.`,
    suggestions: [
      '📧 Gmail Support',
      '🔑 Where do I get an Invite Code?',
      '🔒 Forgot Password Help',
      '📝 How do I register an account?'
    ]
  }
];

export default function AuthChatBot({ onSwitchMode, externalTrigger }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState(() => {
    const saved = localStorage.getItem('cc_guest_chat_token');
    if (saved) return saved;
    const generated = 'CC-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    localStorage.setItem('cc_guest_chat_token', generated);
    return generated;
  });

  const [messages, setMessages] = useState([]);
  const [pinnedAdminReply, setPinnedAdminReply] = useState(null);
  const [showPinnedBanner, setShowPinnedBanner] = useState(true);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasNewAdminReply, setHasNewAdminReply] = useState(false);
  const [canSendAdminTicket, setCanSendAdminTicket] = useState(true);
  const [adminTicketCount, setAdminTicketCount] = useState(0);
  const [isLeavingAdminMsg, setIsLeavingAdminMsg] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getSuggestionsForMessage = (messageText) => {
    const t = String(messageText || '').toLowerCase();
    for (const item of KNOWLEDGE_BASE) {
      if (item.keywords.some((kw) => t.includes(kw)) || item.response.toLowerCase().includes(t.slice(0, 25))) {
        return item.suggestions || [];
      }
    }
    return [
      '🔑 Where do I get an Invite Code?',
      '📝 How do I register an account?',
      '💼 Plans & Daily Earnings',
      '💳 Deposit & Withdrawal Info',
      '🔒 Forgot Password Help',
      '📞 Leave Message for Admin'
    ];
  };

  // Sync with Backend (Loads 24-hour history & auto-pinned admin replies)
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/guest-chat/${sessionToken}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data) {
        setCanSendAdminTicket(data.canSendAdminTicket !== false);
        setAdminTicketCount(Number(data.adminTicketCount || 0));

        if (Array.isArray(data.messages)) {
          const history = data.messages.map((m) => {
            let suggestions = [];
            if (m.sender === 'bot') {
              suggestions = getSuggestionsForMessage(m.message);
            }
            return {
              id: m.id,
              sender: m.sender,
              text: m.message,
              timestamp: m.time || new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isPinned: m.is_pinned === 1,
              suggestions
            };
          });

          // Find latest pinned admin reply
          const pinned = history.filter((m) => m.sender === 'admin' || m.isPinned).pop();
          if (pinned) {
            setPinnedAdminReply(pinned);
            if (!isOpen) setHasNewAdminReply(true);
          }

          if (history.length > 0) {
            setMessages(history);
          } else {
            // Initialize with default greeting if database is empty
            setMessages([
              {
                id: 'init-greeting',
                sender: 'bot',
                text: `👋 **Hello! Welcome to Code Clever.**\n\nI am your 24/7 AI Assistant. How can I help you today?\n\n📌 **Support & Message Policy (24-Hour Limits):**\n• 💬 **1 Direct Message to Admin** per 24 hours\n• 🔑 **1 Password Reset request** per 24 hours\n• 🤖 **Unlimited 24/7 AI Chat** for instant guidance & plan details\n• 📌 Official Admin replies are **automatically pinned at the top** of this chat within 24 hours.\n\n🎫 Support Ticket: \`${sessionToken}\``,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                suggestions: [
                  '🔑 Where do I get an Invitation Code?',
                  '📝 How do I register an account?',
                  '💼 Plans & Daily Earnings',
                  '💳 Deposit & Withdrawal Info',
                  '🔒 Forgot Password Help',
                  '📞 Leave Message for Admin'
                ]
              }
            ]);
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 6000); // Check every 6s for admin replies without losing state
    return () => clearInterval(interval);
  }, [sessionToken]);

  // Handle external trigger (e.g. from Forgot Password modal)
  useEffect(() => {
    if (externalTrigger && externalTrigger.text) {
      setIsOpen(true);
      handleSend(externalTrigger.text, externalTrigger.email, true);
    }
  }, [externalTrigger]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasNewAdminReply(false);
    }
  }, [messages, isOpen]);

  const findBestAnswer = (query) => {
    const q = query.toLowerCase().trim();

    // Check if user specifically requested to leave a message for admin
    if (q.includes('leave message') || q.includes('contact admin') || q.includes('message for admin') || q === '📞 leave message for admin') {
      if (!canSendAdminTicket) {
        return {
          response: `📞 **Official Platform Administration Desk:**\n\n⚠️ **Daily Admin Message Limit Reached (1/1):**\nYou have already submitted 1 inquiry to Administration for this 24-hour window under Ticket \`${sessionToken}\`.\n\nPlatform Administration will review and post a pinned reply at the top of this chat.\n\n💡 *You can continue chatting with me (AI Assistant) for any other questions about plans, registration, or features!*`,
          suggestions: [
            '🌟 Official Social Media Channels',
            '💼 Plans & Daily Earnings',
            '🔑 Where do I get an Invite Code?',
            '💳 Deposit & Withdrawal Info'
          ]
        };
      } else {
        return {
          response: `📞 **Leave a Direct Message for Administration:**\n\nPlease type your specific question or account issue below and press send. Your inquiry will be logged directly to the admin desk under Ticket \`${sessionToken}\`.\n\n*(Note: 1 direct query to Administration per 24 hours. Pinned reply will appear at the top of this chat)*`,
          suggestions: [
            '📧 Gmail Support',
            '🔒 Forgot Password Help',
            '💼 Plans & Daily Earnings',
            '📝 How do I register an account?'
          ]
        };
      }
    }

    // 1. Direct priority check for specific plan inquiries (e.g. "c1", "plan c1", "tell me about c1", "what is c3")
    const planMatch = q.match(/(?:^|\s|\b)(c[1-9]|intern)(?:$|\s|\b|[?.!])/i);
    if (planMatch) {
      const code = planMatch[1].toLowerCase();
      const planItem = KNOWLEDGE_BASE.find((item) => item.id === `plan_${code}`);
      if (planItem) {
        return {
          response: planItem.response.replace('{SESSION_TOKEN}', sessionToken),
          suggestions: planItem.suggestions
        };
      }
    }

    // 2. Standard Knowledge Base Keyword Match
    for (const item of KNOWLEDGE_BASE) {
      if (item.keywords.some((kw) => q.includes(kw))) {
        return {
          response: item.response.replace('{SESSION_TOKEN}', sessionToken),
          suggestions: item.suggestions
        };
      }
    }

    // Dynamic fallback when no keyword matches:
    if (pinnedAdminReply) {
      return {
        response: `Thank you for your message! 😊\n\nAdministration has posted an official response above regarding your account. If you have additional questions or want to inquire further, our team will review and reply here.\n\nFeel free to explore our guides below:`,
        suggestions: [
          '🔑 Where do I get an Invite Code?',
          '📝 How do I register an account?',
          '💼 Plans & Daily Earnings',
          '💳 Deposit & Withdrawal Info',
          '🔒 Forgot Password Help'
        ]
      };
    }

    return {
      response: `Thank you for your message! 😊\n\nI am here to assist with any questions about Code Clever earning plans, registration, daily tasks, or deposits.\n\nIf you would like to reach Platform Administration directly, tap **"📞 Leave Message for Admin"** below.`,
      suggestions: [
        '📞 Leave Message for Admin',
        '🔑 Where do I get an Invite Code?',
        '📝 How do I register an account?',
        '💼 Plans & Daily Earnings',
        '💳 Deposit & Withdrawal Info',
        '🔒 Forgot Password Help'
      ]
    };
  };

  const handleSend = async (textToSend, emailContact, forceSendToAdmin = false) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    // If user clicked the "Leave Message for Admin" suggestion button
    if (text === '📞 Leave Message for Admin' || text === '💬 Send Direct Message to Admin') {
      const userActionMsg = {
        id: Date.now(),
        sender: 'user',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, userActionMsg]);
      setInput('');

      if (!canSendAdminTicket) {
        setTimeout(() => {
          const limitMsg = {
            id: Date.now() + 1,
            sender: 'bot',
            text: `📞 **Official Platform Administration Desk:**\n\n⚠️ **Daily Admin Message Limit Reached (1/1):**\nYou have already submitted 1 inquiry to Administration for this 24-hour window under Ticket \`${sessionToken}\`.\n\nPlatform Administration will review and post a pinned reply at the top of this chat.\n\n💡 *You can continue chatting freely with me (AI Assistant) for any other questions!*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestions: [
              '🌟 Official Social Media Channels',
              '💼 Plans & Daily Earnings',
              '🔑 Where do I get an Invite Code?',
              '💳 Deposit & Withdrawal Info'
            ]
          };
          setMessages((prev) => [...prev, limitMsg]);
        }, 300);
        return;
      }

      setIsLeavingAdminMsg(true);
      setTimeout(() => {
        const promptMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: `📞 **Leave a Direct Message for Administration:**\n\nPlease type your specific question or issue below and press Send. It will be sent directly to the Admin Support Desk under Ticket \`${sessionToken}\`.\n\n*(Limit: 1 direct query to Administration per 24 hours)*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: ['📧 Gmail Support', '💼 Plans & Daily Earnings', '🔒 Forgot Password Help']
        };
        setMessages((prev) => [...prev, promptMsg]);
      }, 300);
      return;
    }

    // Determine if this specific message is an explicit message for admin
    const shouldSendToAdmin = forceSendToAdmin || isLeavingAdminMsg || text.startsWith('[ADMIN QUERY]');

    if (shouldSendToAdmin && !canSendAdminTicket) {
      const limitNotice = {
        id: Date.now() + 1,
        sender: 'bot',
        text: `⚠️ **Daily Admin Message Limit Reached (1/1):**\n\nYou have already submitted 1 inquiry to Administration for this 24-hour window under Ticket \`${sessionToken}\`.\n\nPlatform Administration will review and pin their reply directly at the top of this chat. You can continue chatting freely with me (AI Assistant) for all other guides!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          '🌟 Official Social Media Channels',
          '💼 Plans & Daily Earnings',
          '🔑 Where do I get an Invite Code?',
          '💳 Deposit & Withdrawal Info'
        ]
      };
      setMessages((prev) => [...prev, limitNotice]);
      setInput('');
      setIsLeavingAdminMsg(false);
      return;
    }

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Save message to Backend Database
    try {
      const res = await fetch(`${API_BASE_URL}/guest-chat/${sessionToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sender: 'user',
          sendToAdmin: shouldSendToAdmin,
          email: emailContact || null
        })
      });

      if (res.status === 429) {
        setCanSendAdminTicket(false);
        setIsTyping(false);
        const limitMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: `⚠️ **Daily Limit Reached (1/1):**\n\nYou have already submitted 1 inquiry to Administration for this 24-hour window under Ticket \`${sessionToken}\`. Administration's reply will be pinned at the top of this chat.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: ['💼 Plans & Daily Earnings', '🔑 Where do I get an Invite Code?', '💳 Deposit & Withdrawal Info']
        };
        setMessages((prev) => [...prev, limitMsg]);
        setIsLeavingAdminMsg(false);
        return;
      } else if (res.ok && shouldSendToAdmin) {
        setCanSendAdminTicket(false);
        setAdminTicketCount(1);
        setIsLeavingAdminMsg(false);
      }
    } catch {}

    // Handle navigation triggers
    if (text.toLowerCase().includes('switch to signup') || text.toLowerCase().includes('go to signup')) {
      if (onSwitchMode) onSwitchMode('signup');
    } else if (text.toLowerCase().includes('switch to login') || text.toLowerCase().includes('go to login')) {
      if (onSwitchMode) onSwitchMode('login');
    }

    // Generate AI smart response and persist it to database so it never disappears on poll
    setTimeout(async () => {
      let botResponseText = '';
      let botSuggestions = [];

      if (shouldSendToAdmin) {
        botResponseText = `✅ **Your inquiry has been submitted to Administration!**\n\n🎫 Logged under Ticket: \`${sessionToken}\`\n\nPlatform Administration will review and post an official reply **pinned at the top of this chat** within 24 hours.\n\nYou can continue chatting with me (AI Assistant) for any other questions!`;
        botSuggestions = [
          '🌟 Official Social Media Channels',
          '💼 Plans & Daily Earnings',
          '🔑 Where do I get an Invite Code?',
          '💳 Deposit & Withdrawal Info'
        ];
      } else {
        const match = findBestAnswer(text);
        botResponseText = match.response;
        botSuggestions = match.suggestions;
      }

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: botResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: botSuggestions
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);

      // Persist bot response to backend
      try {
        await fetch(`${API_BASE_URL}/guest-chat/${sessionToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: botResponseText,
            sender: 'bot'
          })
        });
      } catch {}
    }, 450);
  };

  const handleDeleteChat = async () => {
    try {
      await fetch(`${API_BASE_URL}/guest-chat/${sessionToken}`, { method: 'DELETE' });
    } catch {}

    const newToken = 'CC-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    localStorage.setItem('cc_guest_chat_token', newToken);
    setSessionToken(newToken);
    setPinnedAdminReply(null);
    setShowPinnedBanner(true);
    setMessages([
      {
        id: 'init-greeting',
        sender: 'bot',
        text: `👋 Chat history permanently deleted.\n\n🎫 New Support Ticket: \`${newToken}\` *(24h auto-retention)*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          '🔑 Where do I get an Invitation Code?',
          '📝 How do I register an account?',
          '💼 Plans & Daily Earnings',
          '💳 Deposit & Withdrawal Info',
          '🔒 Forgot Password Help',
          '📞 Leave Message for Admin'
        ]
      }
    ]);
    setInput('');
  };

  return (
    <div className="auth-chatbot-container" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      {/* ----------------- EXPANDED CHAT WINDOW ----------------- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{
              width: '370px',
              maxWidth: 'calc(100vw - 32px)',
              height: '540px',
              maxHeight: 'calc(100vh - 100px)',
              background: 'linear-gradient(180deg, #130926 0%, #0c051a 100%)',
              border: '1px solid rgba(203, 78, 255, 0.4)',
              borderRadius: '22px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(203, 78, 255, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              backdropFilter: 'blur(18px)',
              marginBottom: 14
            }}
          >
            {/* Header */}
            <div
              style={{
                background: 'linear-gradient(90deg, #200d3d 0%, #35105e 100%)',
                borderBottom: '1px solid rgba(203, 78, 255, 0.25)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #7c18eb, #ce2bff)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    boxShadow: '0 0 14px rgba(206, 43, 255, 0.55)',
                    position: 'relative'
                  }}
                >
                  <Bot size={22} />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#22c55e',
                      border: '2px solid #130926'
                    }}
                  />
                </div>
                <div>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '13.5px', fontWeight: 800, letterSpacing: 0.3 }}>
                    Code Clever AI Support
                  </h4>
                  <span style={{ fontSize: '10.5px', color: '#cb4eff', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={10} />
                    Ticket: <b>{sessionToken}</b> • 24h Auto-Save
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  title="Delete & Clear Chat Permanently"
                  aria-label="Delete & Clear Chat Permanently"
                  onClick={handleDeleteChat}
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 8,
                    color: '#f87171',
                    width: 28,
                    height: 28,
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                    e.currentTarget.style.borderColor = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  }}
                >
                  <Trash2 size={13} />
                </button>
                <button
                  type="button"
                  title="Close Chatbot"
                  aria-label="Close Chatbot"
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#cbd5e1',
                    width: 28,
                    height: 28,
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Pinned Admin Reply Banner */}
            {pinnedAdminReply && showPinnedBanner && (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.18), rgba(16, 185, 129, 0.1))',
                  borderBottom: '1px solid rgba(34, 197, 94, 0.4)',
                  padding: '10px 14px',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start'
                }}
              >
                <Pin size={16} color="#4ade80" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Official Administration Reply (Pinned)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '10px', color: '#86efac' }}>{pinnedAdminReply.timestamp}</span>
                      <button
                        type="button"
                        title="Dismiss pinned banner"
                        onClick={() => setShowPinnedBanner(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#86efac',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'grid',
                          placeItems: 'center'
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                  <div style={{ color: '#ffffff', fontSize: '12px', lineHeight: 1.45, fontWeight: 500 }}>
                    {pinnedAdminReply.text}
                  </div>
                </div>
              </div>
            )}

            {/* Message Stream */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}
            >
              {messages.map((msg, index) => (
                <div
                  key={msg.id || index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '100%'
                  }}
                >
                  {/* Sender Tag */}
                  {msg.sender === 'admin' && (
                    <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: 800, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <ShieldCheck size={11} /> Administration Response
                    </span>
                  )}

                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '10px 14px',
                      borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background:
                        msg.sender === 'user'
                          ? 'linear-gradient(135deg, #7c18eb, #ce2bff)'
                          : msg.sender === 'admin'
                          ? 'linear-gradient(135deg, #065f46, #047857)'
                          : 'rgba(32, 13, 61, 0.85)',
                      border:
                        msg.sender === 'user'
                          ? 'none'
                          : msg.sender === 'admin'
                          ? '1px solid #10b981'
                          : '1px solid rgba(203, 78, 255, 0.25)',
                      color: '#ffffff',
                      fontSize: '12.5px',
                      lineHeight: 1.5,
                      boxShadow:
                        msg.sender === 'user'
                          ? '0 4px 14px rgba(206, 43, 255, 0.3)'
                          : '0 4px 14px rgba(0, 0, 0, 0.35)',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {renderTextWithClickableLinks(msg.text)}

                    {/* Interactive Clickable Channel Action Buttons */}
                    {msg.text && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* YouTube */}
                        {msg.text.includes('youtube.com') && (
                          <a
                            href="https://www.youtube.com/@Code-Clever_Space"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                              color: '#ffffff',
                              padding: '8px 14px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)'
                            }}
                          >
                            <Play size={14} fill="#ffffff" /> Open YouTube Channel (@Code-Clever_Space) <ExternalLink size={12} />
                          </a>
                        )}

                        {/* Instagram */}
                        {msg.text.includes('instagram.com') && (
                          <a
                            href="https://www.instagram.com/code.clever.space/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: 'linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6)',
                              color: '#ffffff',
                              padding: '8px 14px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              boxShadow: '0 4px 12px rgba(236, 72, 153, 0.35)'
                            }}
                          >
                            <Sparkles size={14} /> Open Instagram Profile (@code.clever.space) <ExternalLink size={12} />
                          </a>
                        )}

                        {/* TikTok */}
                        {msg.text.includes('tiktok.com') && (
                          <a
                            href="https://www.tiktok.com/@code.clever"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: 'linear-gradient(135deg, #06b6d4, #ec4899)',
                              color: '#ffffff',
                              padding: '8px 14px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.35)'
                            }}
                          >
                            <Zap size={14} /> Open TikTok Official (@code.clever) <ExternalLink size={12} />
                          </a>
                        )}

                        {/* WhatsApp Updates */}
                        {msg.text.includes('0029VbDvBwe1NCrU5GW09A0I') && (
                          <a
                            href="https://whatsapp.com/channel/0029VbDvBwe1NCrU5GW09A0I"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: 'linear-gradient(135deg, #25D366, #128C7E)',
                              color: '#ffffff',
                              padding: '8px 14px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)'
                            }}
                          >
                            <MessageSquareText size={14} /> Join WhatsApp Updates Channel <ExternalLink size={12} />
                          </a>
                        )}

                        {/* WhatsApp Video Guides */}
                        {msg.text.includes('0029VbDfDEI4IBhBAAWEJG2M') && (
                          <a
                            href="https://whatsapp.com/channel/0029VbDfDEI4IBhBAAWEJG2M"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                              color: '#ffffff',
                              padding: '8px 14px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)'
                            }}
                          >
                            <Video size={14} /> Open Video Guides Channel <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '9.5px',
                      color: '#716982',
                      marginTop: 3,
                      padding: '0 4px'
                    }}
                  >
                    {msg.timestamp}
                  </span>

                  {/* Suggestion Chips */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 6,
                        marginTop: 8,
                        maxWidth: '92%'
                      }}
                    >
                      {msg.suggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSend(sug)}
                          style={{
                            background: 'rgba(203, 78, 255, 0.12)',
                            border: '1px solid rgba(203, 78, 255, 0.35)',
                            color: '#e9d5ff',
                            borderRadius: '99px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(203, 78, 255, 0.25)';
                            e.currentTarget.style.borderColor = '#ce2bff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(203, 78, 255, 0.12)';
                            e.currentTarget.style.borderColor = 'rgba(203, 78, 255, 0.35)';
                          }}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(32, 13, 61, 0.85)', borderRadius: '16px 16px 16px 4px', border: '1px solid rgba(203, 78, 255, 0.25)', width: 'fit-content' }}>
                  <Sparkles size={13} color="#ce2bff" className="spin" />
                  <span style={{ fontSize: '11px', color: '#cb4eff', fontWeight: 600 }}>AI Assistant is typing…</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              style={{
                padding: '10px 14px',
                borderTop: '1px solid rgba(203, 78, 255, 0.2)',
                background: '#0e061c',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              {!canSendAdminTicket && (
                <div style={{ fontSize: '10.5px', color: '#facc15', display: 'flex', alignItems: 'center', gap: 5, padding: '2px 4px', fontWeight: 600 }}>
                  <AlertCircle size={12} color="#facc15" /> 1/1 Admin Ticket Sent (Reply will appear pinned above) • AI Chat Active
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
                <input
                  type="text"
                  placeholder={
                    isLeavingAdminMsg
                      ? "Type direct message for Admin..."
                      : "Ask AI Assistant anything or select a topic..."
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: isLeavingAdminMsg ? '#240b3b' : '#180a33',
                    border: isLeavingAdminMsg ? '1px solid #ce2bff' : '1px solid rgba(203, 78, 255, 0.3)',
                    borderRadius: 12,
                    padding: '9px 12px',
                    color: '#fff',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send Message"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: input.trim()
                      ? 'linear-gradient(135deg, #7c18eb, #ce2bff)'
                      : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: input.trim() ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    opacity: input.trim() ? 1 : 0.5
                  }}
                >
                  <Send size={15} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------- FLOATING BOT LAUNCHER BUTTON ----------------- */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Open Code Clever AI Support"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 58,
          height: 58,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #7c18eb 0%, #ce2bff 100%)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: hasNewAdminReply
            ? '0 0 25px #22c55e, 0 8px 30px rgba(34, 197, 94, 0.6)'
            : '0 8px 30px rgba(206, 43, 255, 0.5), 0 0 20px rgba(124, 24, 235, 0.6)',
          display: 'grid',
          placeItems: 'center',
          color: '#ffffff',
          cursor: 'pointer',
          position: 'relative'
        }}
      >
        <Bot size={28} />

        {/* Pulsing indicator if unread admin reply */}
        {hasNewAdminReply && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#22c55e',
              border: '2px solid #fff',
              boxShadow: '0 0 10px #22c55e'
            }}
          />
        )}
      </motion.button>
    </div>
  );
}
