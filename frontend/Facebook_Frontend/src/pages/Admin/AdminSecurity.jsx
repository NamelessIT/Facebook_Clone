import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ShieldOff, Shield, Trash2 } from 'lucide-react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const EVENT_TYPE_LABELS = {
  RateLimitExceeded: 'Rate Limit',
  IpBlocked: 'IP Blocked',
  BruteForceDetected: 'Brute Force',
  SuspiciousPayload: 'Suspicious Payload',
  AutoBanned: 'Auto Banned',
  ManualBanned: 'Manual Ban',
  ManualUnbanned: 'Unban',
  IpManualBlocked: 'IP Manual Block',
  IpManualUnblocked: 'IP Unblocked',
};

const AdminSecurity = () => {
  const [tab, setTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [blockedIps, setBlockedIps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState('');

  // Block form state
  const [blockIp, setBlockIp] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockDuration, setBlockDuration] = useState('');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminService.getSecurityEvents(200, eventFilter || undefined);
      setEvents(r.data.data);
    } catch { toast.error(translateCatalogKey('ui.pages.admin.adminsecurity.khong-the-tai-su-kien-bao-mat.8f795165')); }
    finally { setLoading(false); }
  }, [eventFilter]);

  const loadBlockedIps = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminService.getBlockedIps();
      setBlockedIps(r.data.data);
    } catch { toast.error(translateCatalogKey('ui.pages.admin.adminsecurity.khong-the-tai-ip-bi-chan.8d06aaeb')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'events') loadEvents();
    else loadBlockedIps();
  }, [tab, loadEvents, loadBlockedIps]);

  const handleBlockIp = async () => {
    if (!blockIp.trim()) return;
    try {
      await adminService.blockIp(blockIp.trim(), blockReason || translateCatalogKey('admin.security.manualBlockReason'), blockDuration ? Number(blockDuration) : null);
      toast.success(translateCatalogKey('ui.pages.admin.adminsecurity.a-chan-ip-value0.07939635', { value0: blockIp }));
      setBlockIp(''); setBlockReason(''); setBlockDuration('');
      loadBlockedIps();
    } catch (e) {
      toast.error(e.response?.data?.message || translateCatalogKey('ui.pages.admin.adminsecurity.loi-chan-ip.1f6514a7'));
    }
  };

  const handleUnblock = async (ip) => {
    try {
      await adminService.unblockIp(ip);
      toast.success(translateCatalogKey('ui.pages.admin.adminsecurity.a-bo-chan-value0.56b83219', { value0: ip }));
      loadBlockedIps();
    } catch { toast.error(translateCatalogKey('ui.pages.admin.adminsecurity.loi-bo-chan-ip.a94bc0b4')); }
  };

  const handleResetRate = async (ip) => {
    try {
      await adminService.resetRateLimit(ip);
      toast.success(translateCatalogKey('ui.pages.admin.adminsecurity.a-reset-rate-limit-cho-value0.4aca7efa', { value0: ip }));
    } catch { toast.error(translateCatalogKey('ui.pages.admin.adminsecurity.loi-reset-rate-limit.42cd1027')); }
  };

  return (
    <div>
      <h1 className="admin-page-title">{translateCatalogKey('ui.pages.admin.adminsecurity.bao-mat-chong-hack.2d02f6ee')}</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid #2a2d3a' }}>
        {[
          { key: "events", label: translateCatalogKey('ui.pages.admin.adminsecurity.su-kien-bao-mat.1149f461') },
          { key: "blocked", label: translateCatalogKey('ui.pages.admin.admindashboard.ip-bi-chan.75eaaed0') },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 20px', fontSize: 14, fontWeight: 600,
              color: tab === t.key ? '#e74c3c' : '#888',
              borderBottom: tab === t.key ? '2px solid #e74c3c' : '2px solid transparent',
              marginBottom: -1
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Events Tab */}
      {tab === "events" && (
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span className="admin-table-title">{translateCatalogKey('ui.pages.admin.adminsecurity.nhat-ky-su-kien-bao-mat.a5516ec7')}</span>
            <select className="admin-filter-select" value={eventFilter} onChange={e => setEventFilter(e.target.value)}>
              <option value="">{translateCatalogKey('ui.pages.admin.adminsecurity.tat-ca-loai.2cb0f635')}</option>
              {Object.keys(EVENT_TYPE_LABELS).map(k => (
                <option key={k} value={k}>{EVENT_TYPE_LABELS[k]}</option>
              ))}
            </select>
            <button className="admin-btn admin-btn--reset" onClick={loadEvents}>
              <RefreshCw size={12} /> {translateCatalogKey('ui.pages.admin.adminsecurity.tai-lai.d3f6642a')}
            </button>
          </div>
          {loading ? (
            <div className="admin-loading">{translateCatalogKey('common.loading')}</div>
          ) : events.length === 0 ? (
            <div className="admin-empty">{translateCatalogKey('ui.pages.admin.adminsecurity.khong-co-su-kien-nao.38822bbd')}</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{translateCatalogKey('ui.pages.admin.adminsecurity.thoi-gian.a042613f')}</th>
                  <th>{translateCatalogKey('ui.pages.admin.adminsecurity.loai.98211c8c')}</th>
                  <th>{translateCatalogKey('ui.pages.admin.adminsecurity.ip.771f0858')}</th>
                  <th>{translateCatalogKey('common.description')}</th>
                  <th>{translateCatalogKey('ui.pages.admin.adminsecurity.uong-dan.559a6d9a')}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>
                      {new Date(e.timestamp).toLocaleString("vi-VN")}
                    </td>
                    <td>
                      <span className={`event-type event-type--${e.type}`}>
                        {EVENT_TYPE_LABELS[e.type] ?? e.type}
                      </span>
                    </td>
                    <td><code style={{ color: '#e74c3c', fontSize: 12 }}>{e.ipAddress}</code></td>
                    <td style={{ fontSize: 12, color: '#aaa', maxWidth: 300 }}>{e.detail}</td>
                    <td style={{ fontSize: 11, color: '#666' }}>{e.path ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Blocked IPs Tab */}
      {tab === "blocked" && (
        <div>
          <div className="admin-table-wrap admin-section">
            {/* Block form */}
            <div className="admin-table-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
              <span className="admin-table-title">{translateCatalogKey('ui.pages.admin.adminsecurity.chan-ip-thu-cong.fca4daea')}</span>
              <div className="admin-block-form" style={{ width: '100%', padding: 0 }}>
                <input placeholder={translateCatalogKey('ui.pages.admin.adminsecurity.ip-address-vd-1-2-3-4.b1f4a619')} value={blockIp} onChange={e => setBlockIp(e.target.value)} />
                <input placeholder={translateCatalogKey('ui.pages.admin.adminsecurity.ly-do-tuy-chon.2e9d4792')} value={blockReason} onChange={e => setBlockReason(e.target.value)} />
                <input placeholder={translateCatalogKey('ui.pages.admin.adminsecurity.thoi-gian-gio-e-trong-vinh-vien.8f422505')} type="number" min="1" value={blockDuration} onChange={e => setBlockDuration(e.target.value)} style={{ width: 80 }} />
                <button className="admin-btn admin-btn--primary" onClick={handleBlockIp}>
                  <ShieldOff size={12} /> {translateCatalogKey('ui.pages.admin.adminsecurity.chan-ip.1ce2e5ee')}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="admin-loading">{translateCatalogKey('common.loading')}</div>
            ) : blockedIps.length === 0 ? (
              <div className="admin-empty">{translateCatalogKey('ui.pages.admin.adminsecurity.khong-co-ip-nao-bi-chan.213c715b')}</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{translateCatalogKey('ui.pages.admin.admindashboard.ip-address.33dedda4')}</th>
                    <th>{translateCatalogKey('ui.pages.admin.adminsecurity.nguon-goc.18b17f44')}</th>
                    <th>{translateCatalogKey('ui.pages.admin.adminsecurity.ly-do.7d0e0279')}</th>
                    <th>{translateCatalogKey('ui.pages.admin.adminsecurity.chan-luc.dc1b5852')}</th>
                    <th>{translateCatalogKey('ui.pages.admin.adminsecurity.het-han.fd2e2515')}</th>
                    <th>{translateCatalogKey('ui.pages.admin.adminsecurity.hanh-ong.075838aa')}</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedIps.map((entry, i) => (
                    <tr key={i}>
                      <td><code style={{ color: '#e74c3c' }}>{entry.ip}</code></td>
                      <td>
                        <span className={`badge ${entry.isAutomatic ? 'badge--auto' : 'badge--manual'}`}>
                          {entry.isAutomatic ? translateCatalogKey('settings.themeAuto') : translateCatalogKey('ui.pages.admin.adminsecurity.thu-cong.7abbb978')}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#aaa', maxWidth: 250 }}>{entry.reason}</td>
                      <td style={{ fontSize: 11, color: '#666' }}>
                        {new Date(entry.blockedAt).toLocaleString("vi-VN")}
                      </td>
                      <td style={{ fontSize: 11, color: '#666' }}>
                        {entry.expiresAt
                          ? new Date(entry.expiresAt).toLocaleString("vi-VN")
                          : <span style={{ color: '#e74c3c' }}>{translateCatalogKey('ui.pages.admin.adminsecurity.vinh-vien.aa37b328')}</span>
                        }
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button className="admin-btn admin-btn--unblock" onClick={() => handleUnblock(entry.ip)}>
                            <Shield size={12} /> {translateCatalogKey('ui.pages.admin.adminsecurity.bo-chan.7e593eef')}
                          </button>
                          <button className="admin-btn admin-btn--reset" onClick={() => handleResetRate(entry.ip)}>
                            <Trash2 size={12} /> {translateCatalogKey('ui.pages.admin.adminsecurity.reset-rate.1e2e5e90')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: 20 }}>
            <h3 style={{ color: '#e74c3c', margin: '0 0 12px', fontSize: 15 }}>{translateCatalogKey('ui.pages.admin.adminsecurity.luu-y-quan-trong.8d5e47e8')}</h3>
            <ul style={{ color: '#aaa', fontSize: 13, lineHeight: 1.7, paddingLeft: 20, margin: 0 }}>
              <li>{translateCatalogKey('ui.pages.admin.adminsecurity.danh-sach-ip-bi-chan-uoc-luu.d5565492')} <strong>{translateCatalogKey('ui.pages.admin.adminsecurity.in-memory.956d7893')}</strong> {translateCatalogKey('ui.pages.admin.adminsecurity.se-mat-khi-restart-server-e-luu-vinh.7364cf12')}</li>
              <li>{translateCatalogKey('ui.pages.admin.adminsecurity.rate-limit-toi-a.687fdb94')} <strong>{translateCatalogKey('ui.pages.admin.adminsecurity.200-request-phut.95531957')}</strong> {translateCatalogKey('ui.pages.admin.adminsecurity.moi-ip-cac-endpoint-auth-co-nguong-t.1780d065')}</li>
              <li>{translateCatalogKey('ui.pages.admin.admincontent.sau.40f64e76')} <strong>{translateCatalogKey('ui.pages.admin.adminsecurity.10-lan-ang-nhap-sai.45309118')}</strong> {translateCatalogKey('ui.pages.admin.adminsecurity.trong-15-phut-ip-bi-tu-ong-chan-2-gi.73b45e91')}</li>
              <li>{translateCatalogKey('ui.pages.admin.adminsecurity.ip-gui-hon-600-request-phut-se-bi-tu.f766dd30')}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSecurity;
