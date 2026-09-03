import React, { useState } from 'react';
import { Bell, Globe, CheckCircle2 } from 'lucide-react';
import Shell from '../components/layout/Shell';
import PageTitle from '../components/common/PageTitle';

export default function GenericSettingsPage({ title, desc, type = 'notifications' }) {
  const [prefs, setPrefs] = useState({
    emailAlerts: true,
    taskReminders: true,
    commissionAlerts: true,
    language: 'English (US)',
    currency: 'PKR (Pakistani Rupee)'
  });
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Shell>
      <div className="generic-settings-page">
        <PageTitle eyebrow="SETTINGS" title={title} text={desc} />

        <div className="form-card">
          {saved && (
            <div className="task-message">
              <CheckCircle2 size={18} /> Preferences saved successfully.
            </div>
          )}

          {type === 'notifications' ? (
            <div className="settings-toggle-list">
              <label className="setting-row">
                <Bell size={20} />
                <div>
                  <b>Task Reset Reminders</b>
                  <span>Get notified when new daily tasks become available.</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.taskReminders}
                  onChange={(e) => setPrefs({ ...prefs, taskReminders: e.target.checked })}
                />
              </label>

              <label className="setting-row">
                <Bell size={20} />
                <div>
                  <b>Commission & Referral Alerts</b>
                  <span>Receive alerts whenever direct or indirect members generate bonuses.</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.commissionAlerts}
                  onChange={(e) => setPrefs({ ...prefs, commissionAlerts: e.target.checked })}
                />
              </label>

              <label className="setting-row">
                <Bell size={20} />
                <div>
                  <b>Email Summaries</b>
                  <span>Weekly earnings and performance breakdown.</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.emailAlerts}
                  onChange={(e) => setPrefs({ ...prefs, emailAlerts: e.target.checked })}
                />
              </label>
            </div>
          ) : (
            <div className="settings-toggle-list">
              <div className="setting-row">
                <Globe size={20} />
                <div>
                  <b>Interface Language</b>
                  <span>Preferred display language.</span>
                </div>
                <select
                  value={prefs.language}
                  onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}
                  style={{ background: '#0a0717', color: '#fff', padding: '8px', borderRadius: '8px' }}
                >
                  <option>English (US)</option>
                  <option>Urdu (اردو)</option>
                </select>
              </div>

              <div className="setting-row">
                <Globe size={20} />
                <div>
                  <b>Display Currency</b>
                  <span>Settlement and ledger display unit.</span>
                </div>
                <select
                  value={prefs.currency}
                  onChange={(e) => setPrefs({ ...prefs, currency: e.target.value })}
                  style={{ background: '#0a0717', color: '#fff', padding: '8px', borderRadius: '8px' }}
                >
                  <option>PKR (Pakistani Rupee)</option>
                  <option>USD ($)</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="button"
            className="gradient-btn"
            onClick={save}
            style={{ marginTop: '20px', width: '100%' }}
          >
            Save Preferences
          </button>
        </div>
      </div>
    </Shell>
  );
}
