import React,{useEffect,useState} from 'react';
import {Avatar} from './Avatar.jsx';
import {characterStorageKey,participantAppearance} from './characterAppearance.js';

export function ParticipantAvatar({participant,portrait=true}) {
  const [,refresh] = useState(0);
  useEffect(() => {
    const update = event => {
      if (event.type === 'storage' && event.key && event.key !== characterStorageKey(participant?.id)) return;
      refresh(version => version + 1);
    };
    window.addEventListener('ott-look',update);
    window.addEventListener('storage',update);
    return () => {window.removeEventListener('ott-look',update);window.removeEventListener('storage',update);};
  },[participant?.id]);
  return <span className={portrait?'participant-avatar':'account-avatar'} data-participant-id={participant?.id} aria-hidden="true">
    <Avatar look={participantAppearance(participant)} portrait={portrait}/>
  </span>;
}
