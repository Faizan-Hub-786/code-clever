import React from 'react';
import { Users, UserCheck, ArrowDownLeft, ArrowUpRight, ListTodo, Wallet, Calendar, Clock, Sparkles } from 'lucide-react';
import Stat from '../common/Stat';
import { fmt } from '../../utils/formatters';

export default function AdminOverview({ data, setSection }) {
  const today = data?.todayStats || {};

  return (
    <div className="admin-overview">
      {/* 1. TODAY'S SYSTEM OVERVIEW (TOP) */}
      <div className="admin-section-head" style={{ marginBottom: 14 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#38bdf8' }}>
            <Calendar size={22} color="#38bdf8" /> Today's Overview ({new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
          </h2>
          <p>Real-time platform activity, new registrations, and transactions processed today.</p>
        </div>
      </div>

      <div className="admin-stats-grid" style={{ marginBottom: 28 }}>
        <Stat
          icon={Users}
          label="New Users Today"
          value={today.newUsers || 0}
          sub="Registered today"
          onClick={() => setSection('users')}
        />
        <Stat
          icon={UserCheck}
          label="Active Users Today"
          value={today.activeUsers || 0}
          sub="Logged in or active"
          onClick={() => setSection('users')}
        />
        <Stat
          icon={ArrowDownLeft}
          label="Pending Deposits Today"
          value={today.pendingDeposits || 0}
          sub={today.pendingDepositsAmount ? `Rs. ${fmt(today.pendingDepositsAmount)}` : '0 pending'}
          onClick={() => setSection('deposits')}
        />
        <Stat
          icon={ArrowUpRight}
          label="Pending Withdrawals Today"
          value={today.pendingWithdrawals || 0}
          sub={today.pendingWithdrawalsAmount ? `Rs. ${fmt(today.pendingWithdrawalsAmount)}` : '0 pending'}
          onClick={() => setSection('withdrawals')}
        />
        <Stat
          icon={ListTodo}
          label="Tasks Assigned Today"
          value={today.tasksToday || data.tasksToday || 0}
          sub={`${today.tasksDoneToday || 0} completed`}
          onClick={() => setSection('tasks')}
        />
        <Stat
          icon={Wallet}
          label="Approved Revenue Today"
          value={`Rs. ${fmt(today.revenueToday || 0)}`}
          sub="Deposits approved today"
          onClick={() => setSection('deposits')}
        />
      </div>

      {/* 2. ALL-TIME SYSTEM OVERVIEW (ALL-OVER LIFETIME METRICS) */}
      <div className="admin-section-head" style={{ marginBottom: 14 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={22} color="#cb4eff" /> All-Time System Overview
          </h2>
          <p>Lifetime platform aggregates, total member counts, and cumulative approved revenue.</p>
        </div>
      </div>

      <div className="admin-stats-grid">
        <Stat
          icon={Users}
          label="Total Users (All-Time)"
          value={data.users || 0}
          onClick={() => setSection('users')}
        />
        <Stat
          icon={UserCheck}
          label="Total Active Users"
          value={data.activeUsers || 0}
          onClick={() => setSection('users')}
        />
        <Stat
          icon={ArrowDownLeft}
          label="Total Pending Deposits"
          value={data.pendingDeposits || 0}
          onClick={() => setSection('deposits')}
        />
        <Stat
          icon={ArrowUpRight}
          label="Total Pending Withdrawals"
          value={data.pendingWithdrawals || 0}
          onClick={() => setSection('withdrawals')}
        />
        <Stat
          icon={ListTodo}
          label="Total Tasks Assigned"
          value={data.tasksToday || 0}
          onClick={() => setSection('tasks')}
        />
        <Stat
          icon={Wallet}
          label="Total Approved Revenue"
          value={`Rs. ${fmt(data.revenue || 0)}`}
          onClick={() => setSection('deposits')}
        />
      </div>

      <div className="admin-shortcut-grid" style={{ marginTop: 24 }}>
        <div className="admin-shortcut" onClick={() => setSection('deposits')}>
          <div>
            <h3>Deposit Queue</h3>
            <p>{data.pendingDeposits || 0} pending review</p>
          </div>
          <b>Review Deposits →</b>
        </div>
        <div className="admin-shortcut" onClick={() => setSection('withdrawals')}>
          <div>
            <h3>Withdrawal Queue</h3>
            <p>{data.pendingWithdrawals || 0} pending review</p>
          </div>
          <b>Review Withdrawals →</b>
        </div>
      </div>
    </div>
  );
}
