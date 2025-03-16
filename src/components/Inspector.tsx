import React, { HTMLProps } from 'react';
import { PARAM_HIDE } from '../constants.js';
import useGraphSelection from '../useGraphSelection.js';
import useHashParam from '../useHashParam.js';
import { usePane } from './App/App.js';
import InfoPane from './InfoPane/InfoPane.js';
import './Inspector.scss';
import { Splitter } from './Splitter.js';

export default function Inspector(props: HTMLProps<HTMLDivElement>) {
  const [pane, setPane] = usePane();
  const [queryType, queryValue] = useGraphSelection();
  const [hide, setHide] = useHashParam(PARAM_HIDE);

  let paneComponent;
  switch (pane) {
    case 'info':
      paneComponent = <InfoPane id="pane-info" />;
      break;
    default:
      paneComponent = <InfoPane id="pane-info" />;
      break;
  }

  return (
    <div id="inspector" className={hide !== null ? '' : 'open'} {...props}>
      <div id="tabs">
        <Splitter
          isOpen={hide === null}
          onClick={() => setHide(hide === null)}
        />
      </div>

      {paneComponent}
    </div>
  );
}
