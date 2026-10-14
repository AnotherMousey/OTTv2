import React,{useId,useRef} from 'react';
import {Button} from './ui.jsx';
export function FileUpload({onFile,filename='',disabled=false,busy=false,accept='.py,.java,.cpp',label='Choose bot file',hint='Python .py / Java .java / C++ .cpp · maximum 256 KB'}){
 const input=useRef(null),id=useId();
 return <div className="pixel-upload"><span className="field-label" id={`${id}-label`}>Source file</span><input ref={input} className="upload-native" type="file" accept={accept} tabIndex={-1} disabled={disabled||busy} aria-labelledby={`${id}-label`} onChange={e=>{const file=e.target.files?.[0];if(file)onFile(file);e.target.value='';}}/><div className="upload-control"><Button type="button" secondary disabled={disabled||busy} onClick={()=>input.current?.click()} aria-describedby={`${id}-hint ${id}-filename`}>{busy?'Reading file…':filename?'Replace file':label}</Button><span className="upload-filename" id={`${id}-filename`} role="status">{filename||'No file selected'}</span></div><small id={`${id}-hint`}>{hint}</small></div>;
}
