const {Prisma}=require('@prisma/client');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');

const schemaError=error=>['P2021','P2022','DATABASE_SCHEMA_OUTDATED'].includes(error?.code)||
 (error?.code==='P2010'&&['1054','1146'].includes(String(error.meta?.code)));
// Migration history can be current while a column is missing or a query is wrong.
const schemaMessage='Database schema/query mismatch. Run deployment:check on the deployed API and inspect api.schema_error logs.';
const expectedSchema=Prisma.dmmf.datamodel.models.map(model=>({
 table:model.dbName||model.name,
 columns:model.fields.filter(field=>field.kind!=='object').map(field=>field.dbName||field.name),
}));

async function checkDatabaseSchema(db){
 // Inspect every scalar column, even in empty tables, without reading records.
 const rows=await db.$queryRaw`SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()`;
 const actual=new Map();
 for(const row of rows){if(!actual.has(row.tableName))actual.set(row.tableName,new Set());actual.get(row.tableName).add(row.columnName);}
 const missing=[];
 for(const {table,columns} of expectedSchema){
  if(!actual.has(table)){missing.push({table,kind:'table'});continue;}
  for(const column of columns)if(!actual.get(table).has(column))missing.push({table,column,kind:'column'});
 }
 if(missing.length)throw Object.assign(Error(schemaMessage),{code:'DATABASE_SCHEMA_OUTDATED',missing});
 return {tables:expectedSchema.length,columns:expectedSchema.reduce((sum,model)=>sum+model.columns.length,0)};
}

// Compare targets without exposing URLs, usernames or credentials.
function databaseFingerprint(value=process.env.DATABASE_URL){
 try{const url=new URL(value);return crypto.createHash('sha256').update(JSON.stringify([
  url.protocol,url.hostname.toLowerCase(),url.port||'3306',decodeURIComponent(url.pathname),
 ])).digest('hex').slice(0,16);}catch{return 'unconfigured';}
}
const buildFiles=['prisma/schema.prisma','services/api/index.cjs','services/api/tournaments.cjs',
 'services/shared/readiness.cjs','services/shared/db.cjs','services/platform/game-integration.cjs'];
const buildId=crypto.createHash('sha256').update(buildFiles.map(file=>file+'\n'+fs.readFileSync(path.resolve(__dirname,'../..',file),'utf8').replace(/\r\n/g,'\n')).join('\n')).digest('hex').slice(0,16);
function deploymentIdentity(){return {buildId,databaseFingerprint:databaseFingerprint()};}
function schemaDetails(error){
 const meta=error?.meta||{};
 return {code:error?.code||error?.errorCode||'unknown',
  ...(error?.missing?{missing:error.missing}:{}),
  ...(meta.modelName?{model:meta.modelName}:{}),
  ...(meta.table?{table:meta.table}:{}),...(meta.column?{column:meta.column}:{}),
  ...(meta.code?{databaseCode:String(meta.code)}:{}),
 };
}
module.exports={schemaError,schemaMessage,checkDatabaseSchema,expectedSchema,schemaDetails,deploymentIdentity,databaseFingerprint};
