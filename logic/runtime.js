const {spawnSync} = require('child_process');
let cached;
function probe(command, args=['--version']) {
  const p=spawnSync(command,args,{timeout:3000,encoding:'utf8',windowsHide:true});
  return !p.error && p.status===0;
}
function runtimes() {
  if(cached && Date.now()-cached.at<60000)return cached.value;
  const pythonCandidates=process.env.OTTV2_PYTHON?[process.env.OTTV2_PYTHON]:['python3','python'];
  const python=pythonCandidates.find(c=>probe(c,['-c','import sys;sys.exit(0 if sys.version_info.major >= 3 else 1)']));
  const java=process.env.OTTV2_JAVA||'java', javac=process.env.OTTV2_JAVAC||'javac', cpp=process.env.OTTV2_CXX||'g++';
  const value={python:{available:!!python,command:python,message:python?'':'Install Python 3 or set OTTV2_PYTHON to its executable.'},
    java:{available:probe(java,['-version'])&&probe(javac,['-version']),command:java,compiler:javac,message:'Java requires both java and javac (JDK 17+).'},
    cpp:{available:probe(cpp),command:cpp,message:'C++ requires g++ with C++20 support.'}};
  cached={at:Date.now(),value};return value;
}
function requireRuntime(language) {
  const runtime=runtimes()[language];
  if(!runtime?.available){const e=new Error(`${language} runtime unavailable. ${runtime?.message||'Unsupported language.'}`);e.statusCode=503;e.code='RUNTIME_UNAVAILABLE';throw e;}
  return runtime;
}
module.exports={runtimes,requireRuntime};
