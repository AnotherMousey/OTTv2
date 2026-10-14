export const MAX_BOT_BYTES=256*1024;
export const LANGUAGE_EXTENSIONS={Python:'.py',Java:'.java','C++':'.cpp'};
export function checkBotFile({name,language,source,size}){
 const extension=LANGUAGE_EXTENSIONS[language];
 if(!extension)throw Error('Choose Python, Java or C++.');
 if(!name.toLowerCase().endsWith(extension))throw Error(`Choose a ${extension} file for ${language}.`);
 const bytes=size??new TextEncoder().encode(source).length;
 if(bytes>MAX_BOT_BYTES)throw Error('File is too large. Maximum size: 256 KB.');
 if(!source.trim())throw Error('Source file is empty. Choose a file or paste your code.');
 return {name,language,size:bytes,fileChecks:'passed'};
}
