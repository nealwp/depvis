import React, { HTMLProps } from 'react';
import { Pane } from '../Pane.js';
import Module from '../../Module.js';

export default function InfoPane(props: HTMLProps<HTMLDivElement>) {
  function loadData() {
    console.log('loading data');

    const exampleData = [
        { name: "service-a", label: "Service A", dependencies: ["service-b", "service-c", "service-d"] },
        { name: "service-b", label: "Service B", dependencies: ["service-c", "service-d", "service-e"] },
        { name: "service-c", label: "Service C", dependencies: ["service-d", "service-e", "service-f"] },
        { name: "service-d", label: "Service D", dependencies: ["service-e", "service-f", "service-g"] },
        { name: "service-e", label: "Service E", dependencies: ["service-f", "service-g", "service-h"] },
        { name: "service-f", label: "Service F", dependencies: ["service-g", "service-h", "service-i"] },
        { name: "service-g", label: "Service G", dependencies: ["service-h", "service-i", "service-j"] },
        { name: "service-h", label: "Service H", dependencies: ["service-i", "service-j", "service-k"] },
        { name: "service-i", label: "Service I", dependencies: ["service-j", "service-k", "database"] },
        { name: "service-j", label: "Service J", dependencies: ["service-k", "database"] },
        { name: "service-k", label: "Service K", dependencies: ["database"] },
        { name: "database", label: "Database", dependencies: [] },
    ]

    const pkg = JSON.parse(content);

    const module = new Module();
  }

  return (
    <Pane style={{ display: 'flex', flexDirection: 'column' }} {...props}>
      <button onClick={loadData}>Load Test Data</button>
    </Pane>
  );
}
