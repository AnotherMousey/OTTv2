const express=require('express');
const {checkDatabaseSchema,schemaError,schemaMessage,schemaDetails,deploymentIdentity}=require('../shared/readiness.cjs');
const {prisma}=require('../shared/db.cjs');
const {fail,username,text,passwordHash,publicUser}=require('../shared/domain.cjs');
const {auth,judge,login,logout}=require('./auth.cjs');
const tournaments=require('./tournaments.cjs'),bots=require('./bots.cjs'),matches=require('./matches.cjs');
const sync=require('../sync/service.cjs');
const practiceHistory=require('./practice-history.cjs');
const appearance=require('./appearance.cjs');
const tournamentRounds=require('./tournament-rounds.cjs');
const accountManagement=require('./account-management.cjs');
const {specification}=require('../../logic/games/registry');
function createApp(){const app=express();app.disable('x-powered-by');app.set('trust proxy',1);const origins=(process.env.ALLOWED_ORIGINS||'http://localhost:5173,http://127.0.0.1:5173').split(',').map(v=>v.trim());
app.use((req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});const origin=req.headers.origin;if(origin){if(!origins.includes(origin))return res.status(403).json({error:'Frontend origin is not allowed.'});res.set({'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'Content-Type, Authorization, If-None-Match','Access-Control-Expose-Headers':'ETag','Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS','Access-Control-Max-Age':'600'});}if(req.method==='OPTIONS')return res.status(204).end();next();});
// Large replay uploads are isolated from ordinary API request limits.
app.use('/api/sync',express.json({limit:'32mb'}));
app.use(express.json({limit:'2mb'}));
app.use((req,res,next)=>{if(['POST','PATCH'].includes(req.method)){req.body=req.body||{};if(typeof req.body!=='object'||Array.isArray(req.body))return res.status(400).json({error:'Request body must be a JSON object.'});}next();});
app.get('/health',(_,res)=>res.json({ok:true,service:'ottv2-api',apiVersion:'history-actions-v2',...deploymentIdentity()}));app.get('/ready',async(req,res)=>{try{await checkDatabaseSchema(prisma);res.json({ok:true,...deploymentIdentity()});}catch(error){console.error(JSON.stringify({event:'api.not_ready',...deploymentIdentity(),...schemaDetails(error)}));res.status(503).json({ok:false,...deploymentIdentity(),error:schemaError(error)?schemaMessage:'Database is not ready.'});}});
const path=require('node:path');const frontend=path.resolve(__dirname,'../../frontend/dist');
app.use('/app',express.static(frontend));
app.get('/app/{*path}',(req,res)=>res.sendFile(path.join(frontend,'index.html')));
app.get('/',(_,res)=>res.json({service:'ottv2-api',health:'/health'}));
app.post('/api/auth/login',login);app.post('/api/auth/logout',logout);app.get('/api/auth/me',auth,(req,res)=>res.json({account:publicUser(req.user)}));
app.post('/api/auth/appearance',auth,appearance.save);
app.post('/api/accounts',auth,judge,accountManagement.create);
app.post('/api/accounts/review',auth,judge,accountManagement.review);
app.post('/api/accounts/bulk',auth,judge,accountManagement.bulk);
app.get('/api/auth/registration',accountManagement.policy);
app.post('/api/auth/registration',auth,judge,accountManagement.setPolicy);
app.post('/api/auth/register',accountManagement.register);
app.post('/api/auth/profile',auth,accountManagement.profile);
app.post('/api/auth/password',auth,accountManagement.password);
app.get('/api/games/current',(_,res)=>res.json(specification()));
app.get('/api/tournaments/:id/export',auth,judge,sync.exportManifest);
app.get('/api/tournaments/:id/export/:matchId',auth,judge,sync.exportPart);
app.post('/api/sync/plan',auth,judge,sync.plan);
app.post('/api/sync/begin',auth,judge,sync.begin);
app.post('/api/sync/:id/part',auth,judge,sync.uploadPart);
app.post('/api/sync/:id/complete',auth,judge,sync.complete);
const optionalAuth=(req,res,next)=>req.headers.authorization?auth(req,res,next):next();
app.get('/api/tournaments',optionalAuth,tournaments.list);app.post('/api/tournaments',auth,judge,tournaments.create);
// A supplied session is checked even on an otherwise public tournament read.

app.get('/api/tournaments/:id',optionalAuth,tournaments.state);app.get('/api/tournaments/:id/rankings',optionalAuth,tournaments.rankings);
app.get('/api/tournaments/:id/rounds',optionalAuth,tournamentRounds.list);
const dailyTournaments=require('./daily-tournaments.cjs');
const tournamentVisibility=require('./tournament-visibility.cjs');
app.post('/api/tournaments/:id/visibility',auth,judge,tournamentVisibility.visibility);
app.post('/api/tournaments/:id/delete',auth,judge,tournamentVisibility.remove);
app.post('/api/tournaments/:id/schedule',auth,judge,dailyTournaments.changeSchedule);
app.get('/api/tournaments/:id/source',auth,judge,dailyTournaments.versions);
app.get('/api/tournaments/:id/source/:submissionId',auth,judge,dailyTournaments.code);
app.post('/api/tournaments/:id/join',auth,tournaments.join);app.post('/api/tournaments/:id/review',auth,judge,tournaments.review);app.post('/api/tournaments/:id/registration',auth,judge,tournaments.registration);app.post('/api/tournaments/:id/settings',auth,judge,tournaments.settings);app.post('/api/tournaments/:id/advance',auth,judge,tournaments.advance);app.post('/api/tournaments/:id/bot',auth,bots.submit);app.get('/api/tournaments/:id/bots',auth,bots.history);
// POST actions also work with previously cached CORS method allowlists.
app.post('/api/practice/history/delete',auth,practiceHistory.remove);app.post('/api/practice/history/:id/delete',auth,practiceHistory.remove);
app.delete('/api/practice/history',auth,practiceHistory.remove);app.delete('/api/practice/history/:id',auth,practiceHistory.remove);
app.get('/api/practice/history',auth,practiceHistory.list);app.get('/api/matches',optionalAuth,matches.list);app.post('/api/practice',auth,matches.practice);app.get('/api/matches/:id',optionalAuth,matches.get);app.get('/api/matches/:id/live',optionalAuth,matches.live);app.get('/api/matches/:id/replay',optionalAuth,matches.replay);app.post('/api/matches/:id/retry',auth,judge,matches.retry);
app.use((req,res)=>res.status(404).json({error:'API route not found.'}));app.use((error,req,res,next)=>{if(res.headersSent)return next(error);if(schemaError(error)){console.error(JSON.stringify({event:'api.schema_error',...deploymentIdentity(),...schemaDetails(error),path:req.path}));return res.status(503).json({error:schemaMessage,code:'DATABASE_SCHEMA_OUTDATED'});}const status=error.status||(error.type==='entity.too.large'?413:error.code==='P2002'?409:500);if(status===500)console.error(JSON.stringify({event:'api.error',code:error.code||'unknown',path:req.path}));res.status(status).json({error:status===500?'Request could not be completed. Try again.':error.code==='P2002'?'This record already exists.':error.message});});return app;}
if(require.main===module){const server=createApp().listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('OTTv2 API listening'));async function stop(){server.close();setTimeout(()=>process.exit(1),10000).unref();await prisma.$disconnect();}process.on('SIGTERM',stop);process.on('SIGINT',stop);}
module.exports={createApp};
