import {accountRequest} from './authApi.js';
export const TOURNAMENT_ID = (import.meta.env?.VITE_TOURNAMENT_ID || 'pro').trim();
const path = `/api/tournaments/${encodeURIComponent(TOURNAMENT_ID)}`;
const post = (route, body = {}) => accountRequest(route, {method:'POST', body:JSON.stringify(body)});
export const getTournament = signal => accountRequest(path, {signal});
export const joinTournament = () => post(`${path}/register`);
export const startRound = () => post(`${path}/next-round`);
export const uploadTournamentBot = (source, language) => post(`${path}/code`, {source, language});
export const createTournament = () => post('/api/tournaments', {id:TOURNAMENT_ID, name:'OTT Open', rounds:5, coefficient:'coefficient'});
