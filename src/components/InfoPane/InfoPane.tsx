import React, { HTMLProps } from 'react';
import { Pane } from '../Pane.js';
import DropdownSelection from '../DropdownSelection.js';

export default function InfoPane(props: HTMLProps<HTMLDivElement>) {
  return (
    <Pane style={{ display: 'flex', flexDirection: 'column' }} {...props}>
        <DropdownSelection />
    </Pane>
  );
}
