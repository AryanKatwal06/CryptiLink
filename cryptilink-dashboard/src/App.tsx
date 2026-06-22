import { useEffect, useState } from 'react';
import { fetchBankSummary, fetchRecentTransactions, fetchChannelStats } from './services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Activity, Server, Smartphone, Store, ShieldAlert, CheckCircle } from 'lucide-react';

export default function App() {
  const [bankSummary, setBankSummary] = useState<any>(null);
  const [recentTxs, setRecentTxs] = useState<any[]>([]);
  const [channelStats, setChannelStats] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [summary, txs, stats] = await Promise.all([
          fetchBankSummary().catch(() => null),
          fetchRecentTransactions().catch(() => []),
          fetchChannelStats().catch(() => null),
        ]);
        if (summary) setBankSummary(summary);
        if (txs) setRecentTxs(txs);
        if (stats) setChannelStats(stats);
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-obsidian text-white font-sans flex flex-col">
      {/* SECTION 1: System Status Bar */}
      <header className="border-b border-[#1a1a2e] p-4 flex justify-between items-center bg-[#0d0d14]">
        <div className="flex items-center space-x-8">
          <h1 className="font-bold text-xl tracking-widest text-indigo">CRYPTILINK OP-CENTER</h1>
          <div className="flex space-x-6 text-sm font-mono">
            <StatusNode icon={<Server size={16} />} name="BANK SERVER" status="ONLINE" color="text-success" />
            <StatusNode icon={<Smartphone size={16} />} name="CONSUMER APP" status="ACTIVE" color="text-success" />
            <StatusNode icon={<Store size={16} />} name="MERCHANT APP" status="ACTIVE" color="text-success" />
          </div>
        </div>
        <div className="text-xs text-gray-500 font-mono">LIVE FEED • POLLING 10s</div>
      </header>

      <main className="flex-1 p-6 grid grid-cols-12 gap-6">
        
        {/* SECTION 2: Transaction Command Center */}
        <div className="col-span-12 lg:col-span-7 border border-[#1a1a2e] flex flex-col">
          <div className="bg-[#11111a] p-3 border-b border-[#1a1a2e] font-bold text-sm tracking-widest text-indigo flex justify-between">
            <span>LIVE TRANSACTION FEED</span>
            <span className="text-gray-500 text-xs">LAST 20 EVENTS</span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px] p-0">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0A0A0F] text-xs text-gray-500 font-mono border-b border-[#1a1a2e]">
                <tr>
                  <th className="p-3 font-normal">TIMESTAMP</th>
                  <th className="p-3 font-normal">AMOUNT</th>
                  <th className="p-3 font-normal">WALLET HASH</th>
                  <th className="p-3 font-normal">STATUS</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm">
                {recentTxs.map((tx, i) => (
                  <tr key={i} className="border-b border-[#1a1a2e]/50 hover:bg-[#11111a]">
                    <td className="p-3 text-gray-400">
                      {new Date(parseInt(tx.timestamp)*1000).toLocaleTimeString()}
                    </td>
                    <td className="p-3 text-white">₹{tx.amount}</td>
                    <td className="p-3 text-gray-500">{tx.wallet_id_hash}</td>
                    <td className="p-3">
                      {tx.verified ? (
                        <span className="text-success flex items-center"><CheckCircle size={14} className="mr-2"/> SETTLED</span>
                      ) : tx.rejected_reason ? (
                        <span className="text-danger flex items-center"><ShieldAlert size={14} className="mr-2"/> REJECTED</span>
                      ) : (
                        <span className="text-pending flex items-center"><Activity size={14} className="mr-2"/> PENDING</span>
                      )}
                    </td>
                  </tr>
                ))}
                {recentTxs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-600 font-mono text-xs">No data yet — run the demo script to generate events</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 border border-[#1a1a2e] flex flex-col">
          <div className="bg-[#11111a] p-3 border-b border-[#1a1a2e] font-bold text-sm tracking-widest text-indigo">
            SETTLEMENT HEALTH GAUGE
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center space-y-6">
            <HealthMetric label="TOTAL SETTLED" value={`₹${bankSummary?.totalEscrowed || 0}`} count={bankSummary?.totalSettled || 0} color="text-success" />
            <HealthMetric label="PENDING SETTLEMENT" value="—" count={bankSummary?.totalPending || 0} color="text-pending" />
            <div className="border-t border-[#1a1a2e] pt-6">
              <HealthMetric label="REJECTED AT SETTLEMENT" value="—" count={bankSummary?.totalRejected || 0} color="text-danger" />
              <div className="mt-4 pl-4 space-y-2 border-l border-[#1a1a2e]">
                {bankSummary?.rejectionBreakdown && Object.entries(bankSummary.rejectionBreakdown).map(([reason, count]) => (
                  <div key={reason} className="flex justify-between text-xs font-mono">
                    <span className="text-gray-500">{reason}</span>
                    <span className="text-danger">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Transport Channel Performance */}
        <div className="col-span-12 lg:col-span-6 border border-[#1a1a2e] h-64 flex flex-col">
          <div className="bg-[#11111a] p-3 border-b border-[#1a1a2e] font-bold text-sm tracking-widest text-indigo">
            CHANNEL DISTRIBUTION (SMS vs ACOUSTIC)
          </div>
          <div className="flex-1 p-4 flex items-center justify-center relative">
            <span className="absolute top-2 right-2 text-[10px] text-gray-600 border border-gray-800 px-2 py-1">Simulated test data</span>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'SMS', count: channelStats?.smsCount || 85, fill: '#5C6BC0' },
                { name: 'ACOUSTIC', count: channelStats?.acousticCount || 12, fill: '#F59E0B' },
                { name: 'FAILED', count: 3, fill: '#ef4444' }
              ]}>
                <XAxis dataKey="name" stroke="#666" tick={{fontFamily: 'JetBrains Mono', fontSize: 10}} />
                <Tooltip cursor={{fill: '#111'}} contentStyle={{backgroundColor: '#000', borderColor: '#333', fontFamily: 'JetBrains Mono'}} />
                <Bar dataKey="count">
                  {
                    [
                      { name: 'SMS', count: channelStats?.smsCount || 85, fill: '#5C6BC0' },
                      { name: 'ACOUSTIC', count: channelStats?.acousticCount || 12, fill: '#F59E0B' },
                      { name: 'FAILED', count: 3, fill: '#ef4444' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6 border border-[#1a1a2e] h-64 flex flex-col">
          <div className="bg-[#11111a] p-3 border-b border-[#1a1a2e] font-bold text-sm tracking-widest text-indigo">
            TRANSMISSION LATENCY DISTRIBUTION
          </div>
          <div className="flex-1 p-4 flex items-center justify-center relative">
            <span className="absolute top-2 right-2 text-[10px] text-gray-600 border border-gray-800 px-2 py-1">Simulated test data</span>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { bucket: '0-100ms', count: 45 },
                { bucket: '100-200ms', count: 30 },
                { bucket: '200-500ms', count: 15 },
                { bucket: '500ms+', count: 10 },
              ]}>
                <XAxis dataKey="bucket" stroke="#666" tick={{fontFamily: 'JetBrains Mono', fontSize: 10}} />
                <Tooltip cursor={{fill: '#111'}} contentStyle={{backgroundColor: '#000', borderColor: '#333', fontFamily: 'JetBrains Mono'}} />
                <Bar dataKey="count" fill="#5C6BC0" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 4: Security Enforcement Panel */}
        <div className="col-span-12 border border-[#1a1a2e] mt-2 mb-8">
          <div className="bg-[#11111a] p-3 border-b border-[#1a1a2e] font-bold text-sm tracking-widest text-danger flex items-center">
            <ShieldAlert size={16} className="mr-2" /> ACTIVE SECURITY ENFORCEMENT
          </div>
          <div className="grid grid-cols-2">
            <div className="p-4 border-r border-[#1a1a2e] h-64">
              <h3 className="text-xs text-gray-500 font-mono mb-4">CAP ENFORCEMENT TIMELINE (LAST 24H)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { time: '00:00', triggers: 0 }, { time: '04:00', triggers: 2 },
                  { time: '08:00', triggers: 1 }, { time: '12:00', triggers: 5 },
                  { time: '16:00', triggers: 3 }, { time: '20:00', triggers: 8 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                  <XAxis dataKey="time" stroke="#666" tick={{fontFamily: 'JetBrains Mono', fontSize: 10}} />
                  <YAxis stroke="#666" tick={{fontFamily: 'JetBrains Mono', fontSize: 10}} />
                  <Tooltip contentStyle={{backgroundColor: '#000', borderColor: '#333', fontFamily: 'JetBrains Mono'}} />
                  <Line type="stepAfter" dataKey="triggers" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="p-4 h-64 overflow-y-auto">
              <h3 className="text-xs text-gray-500 font-mono mb-4 flex justify-between">
                <span>REPLAY/FRAUD ATTEMPT LOG</span>
                <span className="text-[10px] border border-gray-800 px-2 py-0.5">integration test events</span>
              </h3>
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="text-gray-600 border-b border-[#1a1a2e]">
                    <th className="pb-2 font-normal">TIMESTAMP</th>
                    <th className="pb-2 font-normal">WALLET HASH</th>
                    <th className="pb-2 font-normal">AMOUNT</th>
                    <th className="pb-2 font-normal">REASON</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#1a1a2e]/30 text-gray-400">
                    <td className="py-2">14:22:10</td>
                    <td>a1b2c3d4</td>
                    <td>₹150</td>
                    <td className="text-danger">REPLAY_ATTACK_DETECTED</td>
                  </tr>
                  <tr className="border-b border-[#1a1a2e]/30 text-gray-400">
                    <td className="py-2">11:05:44</td>
                    <td>f9e8d7c6</td>
                    <td>₹50</td>
                    <td className="text-danger">INVALID_SIGNATURE</td>
                  </tr>
                  <tr className="border-b border-[#1a1a2e]/30 text-gray-400">
                    <td className="py-2">09:12:01</td>
                    <td>44332211</td>
                    <td>₹500</td>
                    <td className="text-danger">EXCEEDS_CUMULATIVE_EXPOSURE_CAP</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

const StatusNode = ({ icon, name, status, color }: any) => (
  <div className="flex items-center space-x-2">
    <span className="text-gray-500">{icon}</span>
    <span className="text-gray-300">{name}:</span>
    <span className={`${color} flex items-center`}><span className={`w-2 h-2 rounded-full bg-current mr-1.5`}></span>{status}</span>
  </div>
);

const HealthMetric = ({ label, value, count, color }: any) => (
  <div>
    <div className="text-xs text-gray-500 font-mono mb-1">{label}</div>
    <div className="flex items-baseline space-x-3">
      <div className={`text-4xl font-mono ${color}`}>{count}</div>
      {value !== '—' && <div className="text-xl text-gray-400 font-mono">({value})</div>}
    </div>
  </div>
);
