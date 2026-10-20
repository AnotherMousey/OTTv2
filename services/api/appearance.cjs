const {prisma}=require('../shared/db.cjs');
const {publicUser}=require('../shared/domain.cjs');
const {validateAppearance}=require('../shared/appearance.cjs');
async function save(req,res){
 const appearance=validateAppearance(req.body.appearance);
 // Only the authenticated account can be updated; client-supplied IDs are ignored.
 const user=await prisma.user.update({where:{id:req.user.id},data:{appearance}});
 res.json({account:publicUser(user)});
}
module.exports={save};
