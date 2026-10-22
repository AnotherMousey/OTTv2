import {TournamentManagementActions} from './TournamentManagementActions.jsx';
import React, {useEffect, useState} from 'react';
import {useAccounts} from './PreviewAccounts.jsx';
import {request} from './api/platformApi.js';
import {Button} from './ui.jsx';
import {Pixel} from './Pixel.jsx';
import {phaseLabel} from './tournamentModel.js';
import {remaining, tournamentDeadline} from './tournamentSchedules.js';
import bundledMaps from './games/maps.json';

const deadlineLabels = {
  registration: 'REGISTRATION CLOSES', preparation: 'BOT SUBMISSIONS CLOSE',
  pairing: 'PAIRING REVIEW ENDS', live: 'CURRENT ROUND ENDS', finished: 'EVENT ENDED',
};

function Countdown({deadline, label, now, timezone}) {
  if (!deadline) return <div className="tournament-countdown"><span className="eyebrow">SCHEDULE</span><b>Not scheduled</b><small>Waiting for organizer schedule.</small></div>;
  const target = Date.parse(deadline);
  const parts = remaining(target, now), ended = now >= target;
  const formatted = new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short', ...(timezone?{timeZone:timezone}:{}),
  }).format(target);
  return <div className={`tournament-countdown ${ended ? 'ended' : ''}`}
    aria-label={`${ended ? 'Scheduled deadline reached' : label}: ${parts[0]} days ${parts[1]} hours ${parts[2]} minutes ${parts[3]} seconds`}>
    <div className="countdown-label"><span>{ended ? 'SCHEDULED DEADLINE REACHED' : label}</span></div>
    <div className="countdown-digits" aria-hidden="true">{parts.map((n, i) => <div key={i}><b>{String(n).padStart(2, '0')}</b><small>{['DAYS', 'HRS', 'MIN', 'SEC'][i]}</small></div>)}</div>
    <time dateTime={deadline}>{formatted}</time>
  </div>;
}

export function StudioTournaments({go}) {
  const {user, selectEvent, create, error, busy} = useAccounts();
  const [filter, setFilter] = useState('all'), [query, setQuery] = useState(''), [showHidden,setShowHidden]=useState(false);
  const [directory, setDirectory] = useState([]), [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0), [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true), [directoryError, setDirectoryError] = useState('');
  const [selecting, setSelecting] = useState(''), [actionError, setActionError] = useState('');
  const [adding, setAdding] = useState(false), [name, setName] = useState('');
  const [startDate,setStartDate]=useState(''),[startTime,setStartTime]=useState('00:00'),[endDate,setEndDate]=useState(''),[capacity,setCapacity]=useState(256);
  const [now, setNow] = useState(Date.now());
  const [maps, setMaps] = useState(bundledMaps);
  const judge = user?.role === 'judge';

  useEffect(() => {setOffset(0);setDirectory([]);setShowHidden(false);}, [user?.id]);

  useEffect(() => {
    const controller = new AbortController(); let active = true;
    setLoading(true);
    request(`/api/tournaments?limit=30&offset=${offset}&phase=${encodeURIComponent(filter)}`, {signal: controller.signal})
      .then(data => {
        if (!active) return;
        setDirectory(current => offset ? [...current, ...data.events].filter((event, i, list) => list.findIndex(e => e.id === event.id) === i) : data.events);
        setTotal(data.total); setDirectoryError('');
      })
      .catch(e => {if (active && e.name !== 'AbortError') setDirectoryError(e.message);})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false; controller.abort();};
  }, [filter, offset, revision, user?.id]);

  useEffect(() => {
    const controller = new AbortController(); let active = true;
    request('/api/games/current', {signal: controller.signal})
      .then(spec => {if (active && Array.isArray(spec.maps)) setMaps(spec.maps);})
      .catch(() => {/* Bundled configuration keeps existing maps readable offline. */});
    return () => {active = false; controller.abort();};
  }, []);

  useEffect(() => {
    let timer;
    const tick = () => setNow(Date.now());
    const visibility = () => {clearInterval(timer); if (!document.hidden) {tick(); timer = setInterval(tick, 1000);}};
    visibility(); document.addEventListener('visibilitychange', visibility);
    return () => {clearInterval(timer); document.removeEventListener('visibilitychange', visibility);};
  }, []);

  const visible = directory.filter(e => (showHidden || !e.hidden) && e.name.toLowerCase().includes(query.toLowerCase()));
  function changeFilter(id) {setFilter(id); setOffset(0); setDirectory([]); setDirectoryError(''); setRevision(v => v + 1);}
  async function add(e) {
    e.preventDefault();
    if (await create({name: name.trim(), startDate, startTime, endDate, capacity: Number(capacity)})) {
      setAdding(false); setName(''); go('tournament');
    }
  }
  async function open(t, target) {
    if (selecting) return;
    setSelecting(t.id); setActionError('');
    try {
      const selected = await selectEvent(t.id);
      if (selected === false) {setActionError('Could not load this tournament. Try again.'); return;}
      go(target);
    } finally {setSelecting('');}
  }
  function enter(t) {
    const target = judge ? 'tournament' : ['live', 'finished'].includes(t.phase)
      ? `watch?tournament=${encodeURIComponent(t.id)}` : !user ? 'login'
      : t.phase === 'preparation' ? 'mybot' : 'tournament';
    return open(t, target);
  }

  return <>
    <div className="page-heading tournament-heading"><div>
      <span className="eyebrow">{judge ? 'JUDGE / TOURNAMENT MANAGEMENT' : 'FIND YOUR NEXT CHALLENGE'}</span>
      <h1>THE TOURNAMENTS<span className="yellow-dot">.</span></h1>
    </div><div className="tournament-heading-actions"><span className="demo-tag">{total} EVENTS</span>
      {judge && <Button onClick={() => setAdding(!adding)}>{adding ? 'Close form' : 'Create tournament +'}</Button>}
    </div></div>
    {adding && judge && <form className="card judge-section" onSubmit={add}>
      <h2>NEW TOURNAMENT</h2><div className="event-create">
        <label>Tournament name<input value={name} onChange={e => setName(e.target.value)} required maxLength={80}/></label>
        <label>Start date (ICT)<input type="date" required value={startDate} onChange={e=>setStartDate(e.target.value)}/></label><label>Start time (ICT)<input type="time" required max="20:59" value={startTime} onChange={e=>setStartTime(e.target.value)}/></label><label>End date, inclusive (ICT)<input type="date" required min={startDate} value={endDate} onChange={e=>setEndDate(e.target.value)}/></label>
        <label>Player capacity<input type="number" min="2" max="4000" required value={capacity} onChange={e => setCapacity(e.target.value)}/></label>
      </div><Button type="submit" disabled={busy}>Create tournament</Button>
    </form>}
    <div className="tournament-toolbar"><div className="event-filters" aria-label="Tournament phases">
      {[['all', 'All events'], ['registration', 'Registration'], ['preparation', 'Preparation'], ['pairing', 'Pairing review'], ['live', 'Matches'], ['finished', 'Finished'], ['active', 'Ongoing']].map(([id, title]) =>
        <Button secondary className={`button secondary ${filter === id ? 'active' : ''}`} aria-pressed={filter === id} key={id} disabled={filter === id && loading} onClick={() => changeFilter(id)}>{title}</Button>)}
    </div><label className="tournament-search"><span className="sr-only">Find a tournament</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a tournament…"/></label></div>
    {judge&&<div className="phase-actions"><Button secondary aria-pressed={showHidden} onClick={()=>setShowHidden(v=>!v)}>{showHidden?'Hide hidden events':'Show hidden events'}</Button></div>}
    {query && directory.length < total && <p className="account-note">Search covers loaded tournaments. Load more to search additional events.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {actionError && <p className="error" role="alert">{actionError}</p>}
    {directoryError && <div className="error" role="alert"><p>{directoryError}</p><Button secondary disabled={loading} onClick={() => setRevision(v => v + 1)}>Retry loading tournaments</Button></div>}
    {loading && <p role="status">Loading tournaments…</p>}
    <div className="studio-event-grid">{visible.map((t, i) => {
      const count = t.counts?.accepted ?? 0, ready = t.counts?.botsReady ?? 0;
      const map = maps.find(m => m.id === t.mapId);
      const config = t.gameId && t.gameId !== 'ottv2' ? t.gameConfig : {...map?.config, ...t.gameConfig};
      const width = config?.length ?? config?.boardSize, height = config?.width ?? config?.boardSize;
      const label = judge ? 'Manage tournament' : t.phase === 'preparation' ? 'Prepare your bot'
        : t.phase === 'registration' ? 'Request entry' : ['live', 'finished'].includes(t.phase) ? 'Watch a match' : 'View tournament';
      return <article className="studio-event" key={t.id}>
        <div className="event-art"><Pixel kind={t.phase === 'registration' ? 'trophy' : t.phase === 'live' ? 'scissors' : 'bot'} side={t.phase === 'live' ? 'black' : 'white'}/><span>OTT / {String(i + 1).padStart(2, '0')}</span><div className="event-art-corner"/></div>
        <div className="event-body"><span className={`event-phase ${t.phase}`}>{t.hidden?'HIDDEN':phaseLabel(t.phase).toUpperCase()}</span>
          <h2>{t.name}</h2><p className="event-description">{t.description}</p>
          <div className="event-stats"><div><span>PLAYERS</span><b>{count} / {t.capacity}</b></div><div><span>ROUND</span><b>{String(t.round).padStart(2, '0')} / {String(t.totalRounds).padStart(2, '0')}</b></div><div><span>MAP</span><b>{width && height ? `${width} × ${height}` : 'Not set'}</b></div></div>
          {t.format==='daily-round-robin'&&<p className="account-note">{t.startDate} {t.startTime||'00:00'} — {t.endDate}</p>}
          <Countdown timezone={t.timezone} deadline={tournamentDeadline(t)} label={t.format==='daily-round-robin'?'NEXT BOT LOCK':deadlineLabels[t.phase] || 'NEXT PHASE'} now={now}/>
          <div className="event-readiness"><span>{t.phase === 'preparation' ? `${ready} / ${count} bots ready` : t.phase === 'registration' ? 'Registration open' : 'Tournament in progress'}</span>{judge && t.counts?.pending > 0 && <span>{t.counts.pending} pending</span>}</div>
          <Button secondary disabled={Boolean(selecting)} aria-busy={selecting === t.id} onClick={() => enter(t)}>{selecting === t.id ? 'Opening…' : label}<span className="pixel-arrow" aria-hidden="true"/></Button>
          <TournamentManagementActions compact event={t} onChanged={()=>{setOffset(0);setRevision(v=>v+1);}} onDeleted={()=>{setOffset(0);setRevision(v=>v+1);}}/>
          {!judge && <button className="text-link event-details-link" disabled={Boolean(selecting)} onClick={() => open(t, 'tournament')}>Tournament details</button>}
        </div>
      </article>;
    })}</div>
    {!loading && !directoryError && !visible.length && <section className="card empty"><h2>No tournaments found.</h2><p>Try another name or phase.</p><Button secondary onClick={() => {setQuery(''); changeFilter('all');}}>Clear filters</Button></section>}
    {directory.length < total && <div className="phase-actions"><span>{directory.length} loaded / {total} events</span><Button secondary disabled={loading} onClick={() => setOffset(directory.length)}>Load more tournaments</Button></div>}

  </>;
}
