// Pre-deploy migrations with the DDL account. No shell is required by the host.
const {spawnSync}=require('node:child_process');
const url=process.env.MIGRATION_DATABASE_URL||process.env.DATABASE_URL;
if(!url){console.error('Set MIGRATION_DATABASE_URL or DATABASE_URL before migrating.');process.exit(1);}
const result=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy'],{env:{...process.env,DATABASE_URL:url},stdio:'inherit'});
process.exitCode=result.status??1;
