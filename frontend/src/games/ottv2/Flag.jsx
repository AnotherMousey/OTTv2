import React from 'react';
// Original rectangular pixel flag silhouette; theme changes only its outline/pole.
export function Flag({className=''}) {
 return <svg className={`pixel ${className}`} viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
  <path d="M4 0h1v11H4zM3 11h3v1H3z" fill="var(--flag-stroke,#18221d)"/>
  <rect x="4" y="1" width="9" height="5" fill="var(--flag-stroke,#18221d)"/>
  <rect x="5" y="2" width="7" height="3" fill="#ffd33d"/>
 </svg>;
}
