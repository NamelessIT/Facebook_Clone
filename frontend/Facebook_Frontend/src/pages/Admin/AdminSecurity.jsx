import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, ShieldAlert, ShieldOff, Shield, Trash2 } from 'lucide-react';
import adminService from '../../services/adminService';
import toast from '../../shared/appToast';
import { translateCatalogKey } from '../../shared/localizationRuntime';
import { SECURITY } from '../../shared/generated/constants';

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

const SIGNAL_LABEL_KEYS = {
  suspicious_payload: 'admin.security.signal.suspiciousPayload',
  brute_force: 'admin.security.signal.bruteForce',
  rate_limit: 'admin.security.signal.rateLimit',
  failed_login: 'admin.security.signal.failedLogin',
  high_request_rate: 'admin.security.signal.highRequestRate',
  elevated_request_rate: 'admin.security.signal.elevatedRequestRate',
  high_error_rate: 'admin.security.signal.highErrorRate',
  endpoint_scanning: 'admin.security.signal.endpointScanning',
  scanner_user_agent: 'admin.security.signal.scannerUserAgent',
};

const AdminSecurity = () => {
  const [tab, setTab] = useState('suspicious');
  const [events, setEvents] = useState([]);
  const [blockedIps, setBlockedIps] = useState([]);
  const [suspiciousIps, setSuspiciousIps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState('');
  const [suspiciousSearch, setSuspiciousSearch] = useState('');
  const [suspiciousQuery, setSuspiciousQuery] = useState('');
  const [minRiskScore, setMinRiskScore] = useState(0);

  // Block form state
  const [blockIp, setBlockIp] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockDuration, setBlockDuration] = useState('');
  const [pendingAction, setPendingAction] = useState('');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminService.getSecurityEvents(200, eventFilter || undefined);
      setEvents(r.data.data);
    } catch (error) { toast.apiError(error, translateCatalogKey('ui.pages.admin.adminsecurity.khong-the-tai-su-kien-bao-mat.8f795165'), { context: "admin.security.events.load" }); }
    finally { setLoading(false); }
  }, [eventFilter]);

  const loadBlockedIps = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminService.getBlockedIps();
      setBlockedIps(r.data.data);
    } catch (error) { toast.apiError(error, translateCatalogKey('ui.pages.admin.adminsecurity.khong-the-tai-ip-bi-chan.8d06aaeb'), { context: "admin.security.blockedIps.load" }); }
    finally { setLoading(false); }
  }, []);

  const loadSuspiciousIps = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.getSuspiciousIps({
        search: suspiciousQuery || undefined,
        minRiskScore,
        limit: 200,
      });
      setSuspiciousIps(response.data.data ?? []);
    } catch (error) {
      toast.apiError(error, translateCatalogKey('admin.security.suspiciousLoadError'), { context: "admin.security.suspiciousIps.load" });
    } finally {
      setLoading(false);
    }
  }, [minRiskScore, suspiciousQuery]);

  useEffect(() => {
    if (tab === 'events') loadEvents();
    else if (tab === 'suspicious') loadSuspiciousIps();
    else loadBlockedIps();
  }, [tab, loadEvents, loadBlockedIps, loadSuspiciousIps]);

  const handleSuspiciousSearch = () => setSuspiciousQuery(suspiciousSearch.trim());

  const handlePrepareBlock = (candidate) => {
    setBlockIp(candidate.ipAddress);
    setBlockReason(translateCatalogKey('admin.security.investigationBlockReason', { value0: candidate.riskScore }));
    setBlockDuration(String(SECURITY.defaultInvestigationBlockHours));
    setTab('blocked');
  };

  const handleBlockIp = async () => {
    if (!blockIp.trim()) return;
    setPendingAction('block');
    try {
      const response = await adminService.blockIp(blockIp.trim(), blockReason || translateCatalogKey('admin.security.manualBlockReason'), blockDuration ? Number(blockDuration) : null);
      toast.success(response.data?.message || translateCatalogKey('ui.pages.admin.adminsecurity.a-chan-ip-value0.07939635', { value0: blockIp }));
      setBlockIp(''); setBlockReason(''); setBlockDuration('');
      await loadBlockedIps();
    } catch (e) {
      toast.apiError(e, translateCatalogKey('ui.pages.admin.adminsecurity.loi-chan-ip.1f6514a7'), { context: "admin.security.ip.block" });
    } finally {
      setPendingAction('');
    }
  };

  const handleUnblock = async (ip) => {
    setPendingAction(`unblock:${ip}`);
    try {
      const response = await adminService.unblockIp(ip);
      setBlockedIps(current => current.filter(entry => entry.ip !== ip));
      toast.success(response.data?.message || translateCatalogKey('ui.pages.admin.adminsecurity.a-bo-chan-value0.56b83219', { value0: ip }));
      await loadBlockedIps();
    } catch (error) { toast.apiError(error, translateCatalogKey('ui.pages.admin.adminsecurity.loi-bo-chan-ip.a94bc0b4'), { context: "admin.security.ip.unblock" }); }
    finally { setPendingAction(''); }
  };

  const handleResetRate = async (ip) => {
    setPendingAction(`rate:${ip}`);
    try {
      const response = await adminService.resetRateLimit(ip);
      toast.success(response.data?.message || translateCatalogKey('ui.pages.admin.adminsecurity.a-reset-rate-limit-cho-value0.4aca7efa', { value0: ip }));
    } catch (error) { toast.apiError(error, translateCatalogKey('ui.pages.admin.adminsecurity.loi-reset-rate-limit.42cd1027'), { context: "admin.security.rateLimit.reset" }); }
    finally { setPendingAction(''); }
  };

  return (
    <div>
      <h1 className="admin-page-title">{translateCatalogKey('ui.pages.admin.adminsecurity.bao-mat-chong-hack.2d02f6ee')}</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid #2a2d3a' }}>
        {[
          { key: "suspicious", label: translateCatalogKey('admin.security.suspiciousIps') },
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

      {tab === "suspicious" && (
        <div className="admin-table-wrap">
          <div className="admin-table-header admin-security-investigation-header">
            <div>
              <span className="admin-table-title">{translateCatalogKey('admin.security.investigationTitle')}</span>
              <div className="admin-security-subtitle">{translateCatalogKey('admin.security.investigationSubtitle')}</div>
            </div>
            <div className="admin-security-filters">
              <div className="admin-security-search">
                <Search size={14} />
                <input
                  value={suspiciousSearch}
                  onChange={event => setSuspiciousSearch(event.target.value)}
                  onKeyDown={event => event.key === 'Enter' && handleSuspiciousSearch()}
                  placeholder={translateCatalogKey('admin.security.searchIpIdentity')}
                />
              </div>
              <select value={minRiskScore} onChange={event => setMinRiskScore(Number(event.target.value))} className="admin-filter-select">
                <option value={0}>{translateCatalogKey('admin.security.allRiskLevels')}</option>
                <option value={SECURITY.mediumRiskScore}>{translateCatalogKey('admin.security.mediumAndAbove')}</option>
                <option value={SECURITY.highRiskScore}>{translateCatalogKey('admin.security.highAndAbove')}</option>
                <option value={SECURITY.criticalRiskScore}>{translateCatalogKey('admin.security.criticalOnly')}</option>
              </select>
              <button className="admin-btn admin-btn--reset" onClick={handleSuspiciousSearch} title={translateCatalogKey('common.search')}>
                <Search size={13} /> {translateCatalogKey('common.search')}
              </button>
              <button className="admin-btn admin-btn--reset" onClick={loadSuspiciousIps} title={translateCatalogKey('common.refresh')}>
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="admin-loading">{translateCatalogKey('common.loading')}</div>
          ) : suspiciousIps.length === 0 ? (
            <div className="admin-empty">{translateCatalogKey('admin.security.noSuspiciousIps')}</div>
          ) : (
            <table className="admin-table admin-security-investigation-table">
              <thead>
                <tr>
                  <th>{translateCatalogKey('admin.security.risk')}</th>
                  <th>{translateCatalogKey('ui.pages.admin.adminsecurity.ip.771f0858')}</th>
                  <th>{translateCatalogKey('admin.security.activity')}</th>
                  <th>{translateCatalogKey('admin.security.identity')}</th>
                  <th>{translateCatalogKey('admin.security.signals')}</th>
                  <th>{translateCatalogKey('admin.security.topEndpoints')}</th>
                  <th>{translateCatalogKey('ui.pages.admin.adminsecurity.hanh-ong.075838aa')}</th>
                </tr>
              </thead>
              <tbody>
                {suspiciousIps.map(candidate => (
                  <tr key={candidate.ipAddress}>
                    <td>
                      <span className={`admin-risk admin-risk--${candidate.riskLevel}`}>
                        {candidate.riskScore} · {translateCatalogKey(`admin.security.risk.${candidate.riskLevel}`)}
                      </span>
                    </td>
                    <td>
                      <code className="admin-security-ip">{candidate.ipAddress}</code>
                      <div className="admin-security-last-seen">
                        {translateCatalogKey('admin.security.lastSeen')}: {new Date(candidate.lastSeen).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <div>{candidate.requestsLastMinute} {translateCatalogKey('admin.security.requestsPerMinute')}</div>
                      <div>{candidate.requestsLastHour} {translateCatalogKey('admin.security.requestsPerHour')}</div>
                      <div className={candidate.errorRatePercent >= 70 ? 'admin-security-danger' : ''}>
                        {candidate.errorRatePercent}% {translateCatalogKey('admin.security.errors')}
                      </div>
                    </td>
                    <td>
                      {candidate.associatedEmails?.length > 0
                        ? candidate.associatedEmails.map(email => <div key={email}>{email}</div>)
                        : <span className="admin-security-muted">{translateCatalogKey('admin.security.anonymous')}</span>}
                    </td>
                    <td>
                      <div className="admin-security-signals">
                        {candidate.signals?.length > 0
                          ? candidate.signals.map(signal => (
                            <span key={signal}>{translateCatalogKey(SIGNAL_LABEL_KEYS[signal] ?? signal)}</span>
                          ))
                          : <span className="admin-security-signal-low">{translateCatalogKey('admin.security.noStrongSignals')}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="admin-security-paths">
                        {candidate.topPaths?.map(item => (
                          <div key={item.path}><code>{item.path}</code><span>{item.requests}</span></div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button
                        className="admin-btn admin-btn--primary"
                        onClick={() => handlePrepareBlock(candidate)}
                        disabled={candidate.isBlocked}
                      >
                        {candidate.isBlocked ? <Shield size={13} /> : <ShieldAlert size={13} />}
                        {candidate.isBlocked
                          ? translateCatalogKey('admin.security.alreadyBlocked')
                          : translateCatalogKey('admin.security.reviewAndBlock')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

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
                    <td className="admin-user-meta admin-nowrap">
                      {new Date(e.timestamp).toLocaleString("vi-VN")}
                    </td>
                    <td>
                      <span className={`event-type event-type--${e.type}`}>
                        {EVENT_TYPE_LABELS[e.type] ?? e.type}
                      </span>
                    </td>
                    <td><code className="admin-security-ip">{e.ipAddress}</code></td>
                    <td className="admin-security-detail">{e.detail}</td>
                    <td className="admin-user-meta">{e.path ?? '—'}</td>
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
                <button className="admin-btn admin-btn--primary" onClick={handleBlockIp} disabled={pendingAction === 'block'}>
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
                      <td><code className="admin-security-ip">{entry.ip}</code></td>
                      <td>
                        <span className={`badge ${entry.isAutomatic ? 'badge--auto' : 'badge--manual'}`}>
                          {entry.isAutomatic ? translateCatalogKey('settings.themeAuto') : translateCatalogKey('ui.pages.admin.adminsecurity.thu-cong.7abbb978')}
                        </span>
                      </td>
                      <td className="admin-security-detail">{entry.reason}</td>
                      <td className="admin-user-meta">
                        {new Date(entry.blockedAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="admin-user-meta">
                        {entry.expiresAt
                          ? new Date(entry.expiresAt).toLocaleString("vi-VN")
                          : <span className="admin-security-danger">{translateCatalogKey('ui.pages.admin.adminsecurity.vinh-vien.aa37b328')}</span>
                        }
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button className="admin-btn admin-btn--unblock" onClick={() => handleUnblock(entry.ip)} disabled={Boolean(pendingAction)}>
                            <Shield size={12} /> {translateCatalogKey('ui.pages.admin.adminsecurity.bo-chan.7e593eef')}
                          </button>
                          <button className="admin-btn admin-btn--reset" onClick={() => handleResetRate(entry.ip)} disabled={Boolean(pendingAction)}>
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

          <div className="admin-security-note">
            <h3>{translateCatalogKey('ui.pages.admin.adminsecurity.luu-y-quan-trong.8d5e47e8')}</h3>
            <ul>
              <li>{translateCatalogKey('admin.security.persistenceNote')}</li>
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
