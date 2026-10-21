import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useAccounts } from "./PreviewAccounts.jsx";
import { post } from "./api/platformApi.js";
import { useRoundMapData } from "./hooks/useRoundMapData.js";
import { useRoundMapPaths } from "./hooks/useRoundMapPaths.js";
import { ParticipantAvatar } from "./ParticipantAvatar.jsx";
import {
  outcome,
  statusLabel,
  columnState,
  visibleMatches,
} from "./roundMapModel.js";
import "./tournamentRoundMap.css";
export function TournamentRoundMap({
  go,
  defaultStatus = "all",
  defaultView = "map",
}) {
  const { tournament, user } = useAccounts();
  return (
    <RoundMap
      key={tournament.id + defaultStatus}
      tournament={tournament}
      user={user}
      go={go}
      defaultStatus={defaultStatus}
      defaultView={defaultView}
    />
  );
}
function RoundMap({ tournament, user, go, defaultStatus, defaultView }) {
  const id = useId(),
    [round, setRound] = useState(tournament.round || 1),
    [offsets, setOffsets] = useState({}),
    [status, setStatus] = useState(defaultStatus),
    [view, setView] = useState(defaultView),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState(
      user?.role === "player" ? user.id : null,
    ),
    [selectedPerson, setSelectedPerson] = useState(
      user?.role === "player" ? user : null,
    ),
    [revision, setRevision] = useState(0),
    [detail, setDetail] = useState(null),
    [retrying, setRetrying] = useState(false);
  const map = useRef(null),
    scroll = useRef(null),
    dialog = useRef(null),
    trigger = useRef(null),
    alive = useRef(true);
  const owner = user?.role === "judge" && user.id === tournament.ownerId;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setOffsets({});
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const { data, loading, error, setError } = useRoundMapData({
    tournament,
    round,
    offsets,
    status,
    query,
    selected,
    revision,
  });
  const paths = useRoundMapPaths(map, data, selected, view);
  useLayoutEffect(() => {
    if (view !== "map") return;
    const column = map.current?.querySelector(`[data-column="${round}"]`);
    if (column && scroll.current)
      scroll.current.scrollTo({ left: column.offsetLeft, behavior: "instant" });
  }, [round, view, data?.columns.map((c) => c.round).join(",")]);
  useEffect(() => {
    if (detail) dialog.current?.showModal();
  }, [detail]);
  function close() {
    dialog.current?.close();
    setDetail(null);
    trigger.current?.focus();
  }
  function follow(person) {
    setSelected(person.id);
    setSelectedPerson(person);
  }
  function chooseRound(n) {
    setRound(n);
    if (scroll.current) {
      const column = map.current?.querySelector(`[data-column="${n}"]`);
      if (column)
        scroll.current.scrollTo({
          left: column.offsetLeft,
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
    }
  }
  function reset() {
    setSearch("");
    setQuery("");
    setStatus("all");
    setOffsets({});
  }
  async function retry() {
    if (retrying) return;
    setRetrying(true);
    try {
      await post(`/api/matches/${encodeURIComponent(detail.id)}/retry`);
      if (alive.current) {
        close();
        setRevision((v) => v + 1);
      }
    } catch (e) {
      if (alive.current) {
        close();
        setError(e.message);
      }
    } finally {
      if (alive.current) setRetrying(false);
    }
  }
  function participant(m,person,before,interactive=true){if(!person)return <div className="participant bye-row"><span className="bye-icon" aria-hidden="true">—</span><span className="name">No opponent<small>Automatic bye · no Elo change</small></span></div>;const Tag=interactive?'button':'div',result=outcome(m,person.id);return <Tag type={interactive?'button':undefined} className={`participant ${result==='WIN'?'winner':''}`} data-path-player={person.id} data-path-round={m.round} {...(interactive?{'aria-label':`Follow ${person.name}`,'aria-pressed':selected===person.id,onClick:()=>follow(person)}:{})}><ParticipantAvatar participant={person}/><span className="name">{person.name}{person.id===user?.id&&<small className="you-indicator">YOU</small>}<small>{before??person.rating??'—'} Elo · {person.id===m.whiteId?'White':'Black'}</small></span><span className="result">{result||'—'}</span></Tag>;}
  function card(m){return <article key={m.id} className={`match ${[m.whiteId,m.blackId].includes(selected)?'traced':''}`}><header className="match-top"><b title={m.id}>MATCH {m.id.slice(-8).toUpperCase()}</b><span className={`match-status ${m.status==='running'?'live':''}`}>{statusLabel(m.status)}</span></header>{m.pinned&&<p className="pinned-note">Selected player · outside this page</p>}{participant(m,m.whitePlayer,m.whiteBefore)}{participant(m,m.blackPlayer,m.blackBefore)}<div className="match-footer"><span>{m.status==='finished'?(m.score===.5?'Draw · result confirmed':'Result confirmed'):m.status==='bye'?'No Elo change':m.status==='failed'?'Execution needs attention':m.status==='running'?'Match in progress':'Pairing published'}</span><button onClick={e=>{trigger.current=e.currentTarget;setDetail(m);}}>{m.status==='finished'?'Match summary':m.status==='running'?'Live match details':'Pairing details'} <span className="out-arrow" aria-hidden="true"/></button></div></article>;}
  function waiting(c){return <div className="upcoming"><div className="upcoming-icon" aria-hidden="true"><span/><span/></div><h3>{c.round>(data?.tournament.round||tournament.round)?'Pairings not published':'No pairings yet'}</h3><p>The organizing judge publishes pairings for this round.</p><p className="small">Losing does not eliminate a player. Future opponents remain unassigned.</p></div>;}
  function columnContent(c){const list=visibleMatches(c);return <>{!c.total?waiting(c):list.length?list.map(card):<div className="empty"><h3>No matches fit these filters.</h3><p>Try another player or status.</p><button onClick={reset}>Clear filters</button></div>}{c.filteredTotal>0&&<div className="round-pagination"><span>{Math.min(c.offset+1,c.filteredTotal)}–{Math.min(c.offset+c.matches.length,c.filteredTotal)} of {c.filteredTotal} matches</span><div><button aria-label={`Previous page, round ${c.round}`} disabled={loading||c.offset===0} onClick={()=>setOffsets(o=>({...o,[c.round]:Math.max(0,c.offset-c.limit)}))}>Previous</button><button aria-label={`Next page, round ${c.round}`} disabled={loading||c.offset+c.limit>=c.filteredTotal} onClick={()=>setOffsets(o=>({...o,[c.round]:c.offset+c.limit}))}>Next</button></div></div>}</>;}
  const summary = data?.summary || [],
    columns = data?.columns || [],
    active = columns.find((c) => c.round === round),
    confirmed = summary.reduce((n, c) => n + c.completed, 0),
    published = summary.reduce((n, c) => n + c.total, 0);
  return <section className="trm" aria-labelledby={`${id}-title`}><header className="heading"><div><span className="eyebrow">FOLLOW THE PLAYERS. READ THE ROUND.</span><h2 id={`${id}-title`} className="map-title">TOURNAMENT ROUND MAP<span className="accent">.</span></h2><p>Published pairings and each player's confirmed journey.</p></div></header><div className="overview"><div><div className="overview-title"><h3>{tournament.name}</h3><span className="badge">ROUND {tournament.round}</span></div><p>Elo-based pairings · accepted players remain eligible after a loss.</p></div><div className="numbers"><div><b>{data?.accepted??'—'}</b><span>PLAYERS</span></div><div><b>{tournament.totalRounds}</b><span>ROUNDS</span></div><div><b>{confirmed} / {published}</b><span>RESULTS CONFIRMED</span></div></div></div>
 <div className="toolbar"><label className="search" htmlFor={`${id}-search`}>Find a player<input id={`${id}-search`} type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search all tournament players…"/></label><label>Match status<select aria-label="Round map match status" value={status} onChange={e=>{setStatus(e.target.value);setOffsets({});}}><option value="all">All matches</option><option value="live">Live</option><option value="queued">Assigned / queued</option><option value="completed">Completed / byes</option><option value="failed">Failed</option></select></label><div className="view-switch" aria-label="Pairings view"><button aria-pressed={view==='map'} onClick={()=>setView('map')}>Round map</button><button aria-pressed={view==='cards'} onClick={()=>setView('cards')}>Match cards</button></div></div>
 <nav className="round-tabs" aria-label="Published and upcoming rounds">{summary.map(c=><button key={c.round} aria-pressed={round===c.round} onClick={()=>chooseRound(c.round)}>Round {String(c.round).padStart(2,'0')}<small>{columnState(c,tournament.round)}</small></button>)}</nav>
 <div className="selection"><div>{selected&&selectedPerson?<div className="selected-person"><span className="path-mark" aria-hidden="true"/><ParticipantAvatar participant={selectedPerson}/><div><strong>Following {selectedPerson.name}</strong><small>Confirmed appearances in the visible rounds</small></div></div>:<p className="small muted">Select a player to trace their published matches.</p>}</div><div className="map-actions"><button disabled={!selected} onClick={()=>{setSelected(null);setSelectedPerson(null);}}>Clear player path</button>{view==='map'&&<><button aria-label="Scroll round map left" onClick={()=>scroll.current?.scrollBy({left:-344,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}>←</button><button aria-label="Scroll round map right" onClick={()=>scroll.current?.scrollBy({left:344,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}>→</button></>}</div></div>
 {error&&<div className="round-error"><p role="alert">{error} Previously loaded pairings remain visible.</p><button onClick={()=>setRevision(v=>v+1)}>Retry loading rounds</button></div>}{loading&&!data&&<div className="empty" role="status">Loading tournament rounds…</div>}
 {data&&(view==='map'?<div ref={scroll} className="map-scroll" tabIndex={0} role="region" aria-label="Tournament round map. Scroll horizontally for more rounds." aria-busy={loading}><div ref={map} className="map" style={{gridTemplateColumns:`repeat(${columns.length},minmax(280px,1fr))`,minWidth:columns.length*280+Math.max(0,columns.length-1)*64}}><svg className="connectors" aria-hidden="true">{paths.map((p,i)=><g key={i}><path d={p.d}/><rect x={p.x-3} y={p.y-3} width="6" height="6"/><rect x={p.u-3} y={p.v-3} width="6" height="6"/></g>)}</svg>{columns.map(c=><section key={c.round} className={`column ${c.round===round?'active':''}`} data-column={c.round} aria-label={`Round ${c.round}`}><header className="column-head"><div><h3>Round {String(c.round).padStart(2,'0')}</h3><p>{c.completed} completed · {c.total} published</p></div><span className={`badge ${c.live?'live':''}`}>{columnState(c,tournament.round)}</span></header><div className="column-stack">{columnContent(c)}</div></section>)}</div></div>:<div aria-busy={loading}><h3 className="list-heading">Round {String(round).padStart(2,'0')} / {active?columnState(active,tournament.round):''}</h3>{!active&&loading&&<p role="status">Loading the selected round…</p>}{active&&<div className={`cards ${!active.total?'unpublished-cards':''}`}>{columnContent(active)}</div>}</div>)}
 <div className="map-foot"><span>Lines trace a player across consecutive published rounds. They do not indicate elimination.</span><span>Round pages load 12 matches at a time.</span></div><div className="format-note"><b>ELO-BASED ROUNDS</b><p>The judge creates new pairings each round. Winners are not automatically advanced into a knockout branch.</p></div>
 <dialog ref={dialog} className="round-dialog" aria-labelledby={`${id}-detail`} onCancel={e=>{if(retrying)e.preventDefault();else{setDetail(null);trigger.current?.focus();}}}>{detail&&<><span className="eyebrow">{tournament.name} / ROUND {detail.round}</span><h2 id={`${id}-detail`}>MATCH DETAILS</h2><span className="badge">{statusLabel(detail.status)}</span><div className="dialog-players">{participant(detail,detail.whitePlayer,detail.whiteBefore,false)}{participant(detail,detail.blackPlayer,detail.blackBefore,false)}</div><p className="dialog-note">{detail.status==='bye'?'Automatic bye. No Elo change.':detail.status==='finished'?detail.score===.5?'The match ended in a draw.':'The server finalized this result.':'No final result has been recorded.'} Players remain eligible for later rounds.</p><div className="dialog-actions"><button onClick={close}>Close</button>{owner&&detail.status==='failed'&&<button disabled={retrying} onClick={retry}>{retrying?'Retrying…':'Retry failed match'}</button>}{['queued','running','finished','failed'].includes(detail.status)&&<button className="primary" onClick={()=>{const matchId=detail.id;close();go(`watch/${encodeURIComponent(tournament.id)}/${encodeURIComponent(matchId)}`);}}>{detail.status==='finished'?'Watch recording':'Open match'}</button>}</div></>}</dialog>
 </section>;
}
