import LoadActivity from '../../src/LoadActivity.js';
import './Loader.scss';

import React, { HTMLProps } from 'react';

export function Loader({
  activity,
}: { activity: LoadActivity } & HTMLProps<HTMLDivElement>) {
  return (
    <div className="loader">
      <div className="bg" />
      {activity.title} ...
    </div>
  );
}
