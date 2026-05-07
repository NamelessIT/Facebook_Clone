import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ShieldOff, Shield, Trash2 } from 'lucide-react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

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
    } catch { toast.error('Không thể tải sự kiện bảo mật'); }
    finally { setLoading(false); }
  }, [eventFilter]);

  const loadBlockedIps = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminService.getBlockedIps();
      setBlockedIps(r.data.data);
    } catch { toast.error('Không thể tải IP bị chặn'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'events') loadEvents();
    else loadBlockedIps();
  }, [tab, loadEvents, loadBlockedIps]);

  const handleBlockIp = async () => {
    if (!blockIp.trim()) return;
    try {
      await adminService.blockIp(blockIp.trim(), blockReason || 'Chặn thủ công bởi admin', blockDuration ? Number(blockDuration) : null);
      toast.success(`Đã chặn IP ${blockIp}`);
      setBlockIp(''); setBlockReason(''); setBlockDuration('');
      loadBlockedIps();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Lỗi chặn IP');
    }
  };

  const handleUnblock = async (ip) => {
    try {
      await adminService.unblockIp(ip);
      toast.success(`Đã bỏ chặn ${ip}`);
      loadBlockedIps();
    } catch { toast.error('Lỗi bỏ chặn IP'); }
  };

  const handleResetRate = async (ip) => {
    try {
      await adminService.resetRateLimit(ip);
      toast.success(`Đã reset rate limit cho ${ip}`);
    } catch { toast.error('Lỗi reset rate limit'); }
  };

  return (
    <div>
      <h1 className="admin-page-title">Bảo mật & Chống Hack</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid #2a2d3a' }}>
        {[
          { key: 'events', label: 'Sự kiện bảo mật' },
          { key: 'blocked', label: 'IP bị chặn' },
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
      {tab === 'events' && (
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span className="admin-table-title">Nhật ký sự kiện bảo mật</span>
            <select className="admin-filter-select" value={eventFilter} onChange={e => setEventFilter(e.target.value)}>
              <option value="">Tất cả loại</option>
              {Object.keys(EVENT_TYPE_LABELS).map(k => (
                <option key={k} value={k}>{EVENT_TYPE_LABELS[k]}</option>
              ))}
            </select>
            <button className="admin-btn admin-btn--reset" onClick={loadEvents}>
              <RefreshCw size={12} /> Tải lại
            </button>
          </div>
          {loading ? (
            <div className="admin-loading">Đang tải...</div>
          ) : events.length === 0 ? (
            <div className="admin-empty">Không có sự kiện nào.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Loại</th>
                  <th>IP</th>
                  <th>Mô tả</th>
                  <th>Đường dẫn</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>
                      {new Date(e.timestamp).toLocaleString('vi-VN')}
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
      {tab === 'blocked' && (
        <div>
          <div className="admin-table-wrap admin-section">
            {/* Block form */}
            <div className="admin-table-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
              <span className="admin-table-title">Chặn IP thủ công</span>
              <div className="admin-block-form" style={{ width: '100%', padding: 0 }}>
                <input placeholder="IP Address (vd: 1.2.3.4)" value={blockIp} onChange={e => setBlockIp(e.target.value)} />
                <input placeholder="Lý do (tùy chọn)" value={blockReason} onChange={e => setBlockReason(e.target.value)} />
                <input placeholder="Thời gian (giờ, để trống = vĩnh viễn)" type="number" min="1" value={blockDuration} onChange={e => setBlockDuration(e.target.value)} style={{ width: 80 }} />
                <button className="admin-btn admin-btn--primary" onClick={handleBlockIp}>
                  <ShieldOff size={12} /> Chặn IP
                </button>
              </div>
            </div>

            {loading ? (
              <div className="admin-loading">Đang tải...</div>
            ) : blockedIps.length === 0 ? (
              <div className="admin-empty">Không có IP nào bị chặn.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>Nguồn gốc</th>
                    <th>Lý do</th>
                    <th>Chặn lúc</th>
                    <th>Hết hạn</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedIps.map((entry, i) => (
                    <tr key={i}>
                      <td><code style={{ color: '#e74c3c' }}>{entry.ip}</code></td>
                      <td>
                        <span className={`badge ${entry.isAutomatic ? 'badge--auto' : 'badge--manual'}`}>
                          {entry.isAutomatic ? 'Tự động' : 'Thủ công'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#aaa', maxWidth: 250 }}>{entry.reason}</td>
                      <td style={{ fontSize: 11, color: '#666' }}>
                        {new Date(entry.blockedAt).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ fontSize: 11, color: '#666' }}>
                        {entry.expiresAt
                          ? new Date(entry.expiresAt).toLocaleString('vi-VN')
                          : <span style={{ color: '#e74c3c' }}>Vĩnh viễn</span>
                        }
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button className="admin-btn admin-btn--unblock" onClick={() => handleUnblock(entry.ip)}>
                            <Shield size={12} /> Bỏ chặn
                          </button>
                          <button className="admin-btn admin-btn--reset" onClick={() => handleResetRate(entry.ip)}>
                            <Trash2 size={12} /> Reset Rate
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
            <h3 style={{ color: '#e74c3c', margin: '0 0 12px', fontSize: 15 }}>Lưu ý quan trọng</h3>
            <ul style={{ color: '#aaa', fontSize: 13, lineHeight: 1.7, paddingLeft: 20, margin: 0 }}>
              <li>Danh sách IP bị chặn được lưu <strong>in-memory</strong> — sẽ mất khi restart server. Để lưu vĩnh viễn, cần tích hợp database.</li>
              <li>Rate limit: tối đa <strong>200 request/phút</strong> mỗi IP. Các endpoint auth có ngưỡng thấp hơn (10 login/phút).</li>
              <li>Sau <strong>10 lần đăng nhập sai</strong> trong 15 phút, IP bị tự động chặn 2 giờ.</li>
              <li>IP gửi hơn 600 request/phút sẽ bị tự động chặn 1 giờ (DoS protection).</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSecurity;
