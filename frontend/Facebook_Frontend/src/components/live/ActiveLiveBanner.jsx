import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Radio, ShoppingBag } from 'lucide-react';
import liveService from '../../services/liveService';
import LiveRoom from './LiveRoom';
import Avatar from '../common/Avatar';
import { LIVE } from '../../shared/generated/constants';
import './ActiveLiveBanner.css';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const ActiveLiveBanner = ({ ownerId, limit = 3 }) => {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      const rows = (await liveService.list(false)).data.data || [];
      setSessions(rows.filter((item) => item.status === 1));
    } catch {
      // Discovery is supplemental; the dedicated live page reports load failures.
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(load, 0);
    const timer = window.setInterval(load, LIVE.discoveryPollIntervalMs);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [load]);

  const visible = useMemo(() => sessions
    .filter((item) => !ownerId || item.ownerId === ownerId)
    .slice(0, limit), [limit, ownerId, sessions]);

  if (!visible.length) return null;

  const updateSession = (updated) => {
    setSessions((current) => updated.status === 1
      ? current.map((item) => item.id === updated.id ? updated : item)
      : current.filter((item) => item.id !== updated.id));
    setSelected(updated);
  };

  return (
    <>
      <section className={`active-live-banner${ownerId ? ' active-live-banner--profile' : ''}`} aria-label={translateCatalogKey('ui.components.live.activelivebanner.ang-phat-truc-tiep.7a5192c6')}>
        <header><span><Radio /> {translateCatalogKey('ui.components.live.activelivebanner.ang-phat-truc-tiep.7a5192c6')}</span><small>{visible.length} {translateCatalogKey('ui.components.live.activelivebanner.phien.f11366de')}</small></header>
        <div className="active-live-list">
          {visible.map((session) => (
            <button type="button" className="active-live-item" key={session.id} onClick={() => setSelected(session)}>
              <div className="active-live-avatar"><Avatar src={session.avatarUrl} className="w-11 h-11" /><span /></div>
              <div className="active-live-copy"><strong>{session.title}</strong><span>{session.ownerName}</span></div>
              <div className="active-live-meta">{session.isShopping ? <ShoppingBag /> : <Eye />} {session.isShopping ? "Bán hàng" : session.viewerCount || 0}</div>
            </button>
          ))}
        </div>
      </section>
      {selected && <LiveRoom key={selected.id} initialSession={selected} open onOpenChange={(value) => !value && setSelected(null)} onUpdated={updateSession} onDeleted={() => { setSessions((current) => current.filter((item) => item.id !== selected.id)); setSelected(null); }} />}
    </>
  );
};

export default ActiveLiveBanner;
