import { useEffect, useRef, useState } from "react";
import { loginWithRefresh } from "../loginFlow.js";
import {
  request,
  post,
  session,
  authenticate,
  signOut,
  storeSession,
} from "../api/platformApi.js";
import {
  emptyTournament as empty,
  mergeTournamentDirectory,
  tournamentWorkspace,
} from "../accountsModel.js";

export function useTournamentAccounts() {
  const [user, setUser] = useState(null),
    [authChecking, setAuthChecking] = useState(() => Boolean(session())),
    [events, setEvents] = useState([]),
    [tournament, setTournament] = useState(empty),
    [rankings, setRankings] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [eventTotal, setEventTotal] = useState(0),
    [rankPage, setRankPage] = useState({ offset: 0, total: 0 });
  const authVersion = useRef(0),
    authPending = useRef(false),
    profileVersion = useRef(0);
  const selected = useRef(""),
    generation = useRef(0),
    pages = useRef({ offset: 0, matchOffset: 0, rankOffset: 0 });
  async function loadDirectory(offset = 0) {
    const version = authVersion.current;
    const data = await request("/api/tournaments?limit=30&offset=" + offset);
    if (version !== authVersion.current) return data;
    setEvents((current) =>
      mergeTournamentDirectory(current, data.events, offset),
    );
    setEventTotal(data.total);
    if (!selected.current && data.events[0])
      selected.current = data.events[0].id;
    return data;
  }
  async function refresh({ includeRankings = true } = {}) {
    const id = selected.current;
    if (!id) {
      setError("");
      return;
    }
    const version = generation.current,
      identity = authVersion.current,
      profile = profileVersion.current;
    const p = pages.current;
    const [event, standings] = await Promise.all([
      request(
        `/api/tournaments/${id}?offset=${p.offset}&matchOffset=${p.matchOffset}`,
      ),
      includeRankings
        ? request(`/api/tournaments/${id}/rankings?offset=${p.rankOffset}`)
        : Promise.resolve(null),
    ]);
    if (
      version !== generation.current ||
      identity !== authVersion.current ||
      profile !== profileVersion.current
    )
      return;
    // Separate HTTP responses can straddle an atomic publication. Keep the
    // previous coherent view until the next poll rather than mixing versions.
    if (standings && event.format === 'daily-round-robin' &&
        (event.publishedBatchId || null) !== (standings.publishedBatchId || null)) return;
    const value = tournamentWorkspace(event);
    setTournament(value);
    if (standings) {
      setRankings(standings.rankings);
      setRankPage({ offset: standings.offset, total: standings.total });
    }
    setError("");
  }
  useEffect(() => {
    let active = true,
      polling = false;
    const expired = () => {
      authVersion.current++;
      setUser(null);
      setAuthChecking(false);
      setLoading(false);
      setTournament(empty);
      setRankings([]);
      setError("Session expired. Log in again.");
    };
    window.addEventListener("ott-session-expired", expired);
    const version = authVersion.current;
    (async () => {
      try {
        if (session()) {
          try {
            const data = await request("/api/auth/me");
            if (active && version === authVersion.current)
              setUser(data.account);
          } catch (e) {
            if (active && version === authVersion.current) setError(e.message);
          }
        }
        if (!active || version !== authVersion.current) return;
        setAuthChecking(false);
        await loadDirectory();
        if (active && version === authVersion.current) await refresh();
      } catch (e) {
        if (active && version === authVersion.current) setError(e.message);
      } finally {
        if (active && version === authVersion.current) {
          setAuthChecking(false);
          setLoading(false);
        }
      }
    })();
    const timer = setInterval(async () => {
      if (document.hidden || polling || authPending.current) return;
      const page = location.hash.slice(1);
      if (!["tournament", "mybot", "rankings"].includes(page)) return;
      polling = true;
      const identity = authVersion.current,
        profile = profileVersion.current;
      try {
        if (!selected.current) await loadDirectory();
        await refresh({ includeRankings: page !== "mybot" });
        if (session()) {
          const data = await request("/api/auth/me");
          if (
            active &&
            identity === authVersion.current &&
            profile === profileVersion.current
          )
            setUser(data.account);
        }
      } catch (e) {
        if (active && identity === authVersion.current) setError(e.message);
      } finally {
        polling = false;
      }
    }, 6000);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("ott-session-expired", expired);
    };
  }, []);
  async function login(username, password) {
    const version = ++authVersion.current;
    authPending.current = true;
    setError("");
    try {
      return await loginWithRefresh({
        authenticate,
        username,
        password,
        onAuthenticated: (account) => {
          setTournament(empty);
          setRankings([]);
          setUser(account);
          setAuthChecking(false);
          setLoading(true);
        },
        refresh: async () => {
          try {
            await loadDirectory();
            if (version === authVersion.current) await refresh();
          } finally {
            if (version === authVersion.current) setLoading(false);
          }
        },
        onRefreshError: (e) => {
          if (version === authVersion.current)
            setError("Logged in. Tournament data could not load: " + e.message);
        },
      });
    } catch (e) {
      if (version === authVersion.current) setLoading(false);
      throw e;
    } finally {
      authPending.current = false;
    }
  }
  async function logout() {
    authVersion.current++;
    selected.current = "";
    generation.current++;
    pages.current = { offset: 0, matchOffset: 0, rankOffset: 0 };
    setUser(null);
    setAuthChecking(false);
    setLoading(false);
    setTournament(empty);
    setRankings([]);
    try {
      await signOut();
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveProfile(name) {
    const identity = authVersion.current;
    const data = await post("/api/auth/profile", { name });
    if (identity !== authVersion.current) return data.account;
    profileVersion.current++;
    setUser((current) =>
      current ? { ...current, name: data.account.name } : current,
    );
    const saved = session();
    if (saved?.account?.id === data.account.id)
      storeSession({
        ...saved,
        account: { ...saved.account, name: data.account.name },
      });
    const rename = (row) =>
      row.id === data.account.id ? { ...row, name: data.account.name } : row;
    setRankings((current) => current.map(rename));
    setTournament((current) => ({
      ...current,
      players: current.players.map(rename),
    }));
    return data.account;
  }
  async function saveAppearance(appearance) {
    const data = await post("/api/auth/appearance", { appearance });
    setUser(data.account);
    setRankings((current) =>
      current.map((p) =>
        p.id === data.account.id
          ? { ...p, appearance: data.account.appearance }
          : p,
      ),
    );
    setTournament((current) => ({
      ...current,
      players: current.players.map((p) =>
        p.id === data.account.id
          ? { ...p, appearance: data.account.appearance }
          : p,
      ),
    }));
    return data.account;
  }
  async function selectEvent(id) {
    selected.current = id;
    generation.current++;
    pages.current = { offset: 0, matchOffset: 0, rankOffset: 0 };
    try {
      await refresh();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }
  async function mutate(path, body) {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      await post(`/api/tournaments/${selected.current}/${path}`, body);
      await Promise.all([refresh(), loadDirectory()]);
      return true;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  }
  async function manageTournament(id, action, body = {}) {
    if (busy) return false;
    setBusy(true);setError('');
    try {
      await post(`/api/tournaments/${encodeURIComponent(id)}/${action}`, body);
      if (action === 'delete' && selected.current === id) {
        selected.current='';generation.current++;pages.current={offset:0,matchOffset:0,rankOffset:0};
        setTournament(empty);setRankings([]);setRankPage({offset:0,total:0});
      }
      await loadDirectory();
      if (selected.current) await refresh();
      return true;
    } catch (e) {setError(e.message);throw e;} finally {setBusy(false);}
  }
  const action = (path, body) => () => mutate(path, body).catch(() => {});
  const review = (id, accept) =>
    mutate("review", { userId: id, accept }).catch(() => {});
  const create = async (values) => {
    setBusy(true);
    try {
      const data = await post("/api/tournaments", values);
      selected.current = data.id;
      generation.current++;
      pages.current = { offset: 0, matchOffset: 0, rankOffset: 0 };
      await loadDirectory();
      await refresh();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const saveBot = (bot) =>
    mutate("bot", {
      filename: bot.name,
      language:
        { Python: "python", Java: "java", "C++": "cpp" }[bot.language] ||
        bot.language,
      source: bot.source,
    });
  const paginate = async (type, offset) => {
    pages.current = { ...pages.current, [type]: offset };
    setBusy(true);
    try {
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return {
    user,
    authChecking,
    login,
    logout,
    saveAppearance,
    saveProfile,
    events,
    eventTotal,
    tournament,
    rankings,
    rankPage,
    error,
    busy,
    loading,
    selectEvent,
    changeVisibility: (id, hidden) => manageTournament(id, "visibility", {hidden}),
    changeRegistration: (id, open) => manageTournament(id, "registration", {open}),
    deleteTournament: id => manageTournament(id, "delete"),
    create,
    saveBot,
    join: action("join"),
    review,
    approveAll: action("review", { all: true, accept: true }),
    advance: action("advance"),
    configure: (values) => mutate("settings", values).catch(() => {}),
    paginate,
    loadMore: () =>
      loadDirectory(events.length).catch((e) => setError(e.message)),
    refresh,
  };
}
