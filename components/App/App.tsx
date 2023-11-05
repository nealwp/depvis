import React from 'react';
import sharedStateHook from '../../src/sharedStateHook.js';
import GraphDiagram from '../GraphDiagram/GraphDiagram.js';
import { GraphState } from '../GraphDiagram/graph_util.js';
import Inspector from '../Inspector.js';
import './App.scss';

export const [usePane] = sharedStateHook('info', 'pane');
export const [useGraph] = sharedStateHook(null as GraphState | null, 'graph');

export default function App() {
  return (
    <>
      <GraphDiagram />
      <Inspector />
    </>
  );
}

