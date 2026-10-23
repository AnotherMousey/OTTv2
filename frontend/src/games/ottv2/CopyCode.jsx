import React, {useEffect, useRef, useState} from 'react';
import {Button} from '../../ui.jsx';

export function CopyCode({code, label}) {
  const [status, setStatus] = useState(''), [pending, setPending] = useState(false);
  const timer = useRef(null), version = useRef(0), inFlight = useRef(false);
  useEffect(() => () => {
    version.current++;
    clearTimeout(timer.current);
  }, []);

  async function copy() {
    if (inFlight.current) return;
    inFlight.current = true;
    const request = ++version.current;
    clearTimeout(timer.current);
    setStatus('');setPending(true);
    try {
      if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code);
      if (request === version.current) setStatus('copied');
    } catch {
      if (request === version.current) setStatus('error');
    } finally {
      if (request === version.current) {
        inFlight.current = false;
        setPending(false);
        timer.current = setTimeout(() => setStatus(''), 2500);
      }
    }
  }

  return <div className="api-code-example">
    <div className="api-code-toolbar">
      <span>{label}</span>
      <Button secondary type="button" onClick={copy} disabled={pending} aria-busy={pending}
        aria-label={`${status === 'copied' ? 'Copied' : 'Copy'} ${label}`}>
        {pending ? 'Copying…' : status === 'copied' ? 'Copied!' : 'Copy code'}
      </Button>
    </div>
    <pre tabIndex="0" aria-label={`${label} code`}><code>{code}</code></pre>
    <p className="api-copy-feedback" role="status" aria-live="polite" aria-atomic="true">
      {status === 'copied' ? 'Code copied to clipboard.' : status === 'error' ? 'Couldn’t copy. Select the code and copy it manually.' : ''}
    </p>
  </div>;
}
