const schemaError = error => ['P2021','P2022'].includes(error?.code);
const schemaMessage = 'Database schema is outdated. The organizer must apply the committed Prisma migrations.';
async function checkDatabaseSchema(db) {
  // Verify newly required fields/tables as well as basic connectivity.
  await db.user.findFirst({select:{id:true}});
  await db.tournament.findFirst({select:{id:true,gameId:true,gameConfig:true,moveTimeLimitMs:true}});
  await db.syncReceipt.findFirst({select:{tournamentId:true,digest:true}});
  await db.syncPart.findFirst({select:{tournamentId:true,matchId:true}});
}
module.exports={schemaError,schemaMessage,checkDatabaseSchema};
