// Cosmetic values accepted by the pixel character editor. No SVG, CSS or URLs
// are accepted from clients. Keep these values aligned with frontend/src/Avatar.jsx.
const allowed={
 hatColor:['#F5A641','#458DE0','#AA83D4','#E481A9','#E97164','#63B8A4','#299AAB','#E8DDB9','#BF465C','#91C9ED','#B7754B','#45475B'],
 bodyColor:['#F5A641','#458DE0','#AA83D4','#E481A9','#E97164','#63B8A4','#299AAB','#E8DDB9','#BF465C','#91C9ED','#B7754B','#45475B'],
 hat:['antenna','fez','cap','crown','wizard','cat','headphones','none'],
 eyes:['bright','sparkle','happy','sleepy','wow','wink','angry','star'],
 mouth:['smile','grin','neutral','wow','tongue','smirk','teeth','sad'],
 cheeks:['none','blush','freckles'],
 accessory:['none','glasses','shades','mustache','bow','bandage','monocle','flower'],
};
function validateAppearance(value){
 const invalid=()=>Object.assign(Error('Choose a valid value for every character option.'),{status:400});
 if(!value||typeof value!=='object'||Array.isArray(value))throw invalid();
 if(Object.keys(value).some(key=>!Object.hasOwn(allowed,key)))throw invalid();
 return Object.fromEntries(Object.entries(allowed).map(([key,values])=>{
  if(!Object.hasOwn(value,key)||!values.includes(value[key]))throw invalid();
  return [key,value[key]];
 }));
}
module.exports={validateAppearance};
