import { Graphviz } from '@hpcc-js/wasm/graphviz';
import { select } from 'd3-selection';
import React, { useEffect, useState } from 'react';
import { queryModules } from '../../ModuleCache.js';
import { getModule } from '../../ModuleCache.js';
import {
  PARAM_COLORIZE,
  PARAM_DEPENDENCIES,
  PARAM_HIDE,
  PARAM_ZOOM,
  ZOOM_FIT_HEIGHT,
  ZOOM_FIT_WIDTH,
  ZOOM_NONE,
} from '../../constants.js';
import { createAbortable } from '../../createAbortable.js';
import $ from '../../dom.js';
import { flash } from '../../flash.js';
import useCollapse from '../../useCollapse.js';
import useGraphSelection from '../../useGraphSelection.js';
import useHashParam from '../../useHashParam.js';
import { useQuery } from '../../useQuery.js';
import { useGraph, usePane } from '../App/App.js';
import './GraphDiagram.scss';
import GraphDiagramDownloadButton from './GraphDiagramDownloadButton.js';
import { GraphDiagramZoomButtons } from './GraphDiagramZoomButtons.js';
import {
  DependencyKey,
  GraphState,
  composeDOT,
  gatherSelectionInfo,
  getGraphForQuery,
} from './graph_util.js';
import useLocation from '../../useLocation.js';

export type ZoomOption =
  | typeof ZOOM_NONE
  | typeof ZOOM_FIT_WIDTH
  | typeof ZOOM_FIT_HEIGHT;

function useGraphviz() {
  const [graphviz, setGraphviz] = useState<Graphviz | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Graphviz.load()
      .catch(err => {
        console.error('Graphviz failed to load', err);
        return undefined;
      })
      .then(setGraphviz)
      .finally(() => setLoading(false));
  }, []);

  return [graphviz, loading] as const;
}

export default function GraphDiagram() {
  const [query] = useQuery();
  const [depTypes] = useHashParam(PARAM_DEPENDENCIES);
  const [, setPane] = usePane();
  const [, setZenMode] = useHashParam(PARAM_HIDE);
  const [queryType, queryValue, setGraphSelection] = useGraphSelection();
  const [graph, setGraph] = useGraph();
  const [collapse, setCollapse] = useCollapse();
  const [colorize] = useHashParam(PARAM_COLORIZE);
  const [zoom] = useHashParam(PARAM_ZOOM);
  const [graphviz, graphvizLoading] = useGraphviz();
  const [href] = useLocation();


  // Dependencies to include for top-level modules
  const dependencyTypes = new Set<DependencyKey>(['dependencies']);

  (depTypes ?? '')
    .split(/\s*,\s*/)
    .sort()
    .forEach(dtype => dependencyTypes.add(dtype as DependencyKey));

  // Signal for when Graph DOM changes
  const [domSignal, setDomSignal] = useState(0);

  async function handleGraphClick(event: React.MouseEvent) {
    const target = event.target as HTMLDivElement;

    if ($('#graph-controls').contains(target)) return;

    const el = $.up<SVGElement>(target, '.node');

    const moduleKey = el ? $(el, 'title')?.textContent?.trim() : '';
    const module = moduleKey ? getModule(moduleKey) : undefined;

    // Toggle exclude filter?
    if (el && event.shiftKey) {
      if (module) {
        const isIncluded = collapse.includes(module.name);
        if (isIncluded) {
          setCollapse(collapse.filter(n => n !== module.name));
        } else {
          setCollapse([...collapse, module.name]);
        }
      }

      return;
    }

    if (el) setZenMode('');

    setGraphSelection('exact', moduleKey);
    setPane(moduleKey ? 'module' : 'graph');
  }

  function applyZoom() {
    const graphEl = $<HTMLDivElement>('#graph')[0];
    const svg = getDiagramElement();
    if (!svg) return;

    // Note: Not using svg.getBBox() here because (for some reason???) it's
    // smaller than the actual bounding box
    const vb = svg.getAttribute('viewBox')?.split(' ').map(Number);
    if (!vb) return;

    const [, , w, h] = vb;
    graphEl.classList.toggle(
      'centered',
      zoom === ZOOM_NONE && w < graphEl.clientWidth && h < graphEl.clientHeight,
    );

    switch (zoom) {
      case ZOOM_NONE:
        svg.setAttribute('width', String(w));
        svg.setAttribute('height', String(h));
        break;

      case ZOOM_FIT_WIDTH:
        svg.setAttribute('width', '100%');
        svg.removeAttribute('height');
        break;

      case ZOOM_FIT_HEIGHT:
        svg.removeAttribute('width');
        svg.setAttribute('height', '100%');
        break;
    }

    (select('#graph svg .node').node() as HTMLElement)?.scrollIntoView();
  }

  // Filter for which modules should be shown / collapsed in the graph
  function moduleFilter({ name }: { name: string }) {
    return !collapse?.includes(name);
  }

  // NOTE: Graph rendering can take a significant amount of time.  It is also dependent on UI settings.
  // Thus, it's broken up into different useEffect() actions, below.

  // Effect: Fetch modules
  useEffect(() => {
    const { signal, abort } = createAbortable();

    getGraphForQuery(query, dependencyTypes, moduleFilter).then(newGraph => {
      if (signal.aborted) return; // Check after async

      setGraph(newGraph);
    });

    return abort;
  }, [[...query].sort().join(), [...dependencyTypes].join(), collapse]);

  // Effect: Insert SVG markup into DOM
  useEffect(() => {
    const { signal, abort } = createAbortable();

    (async function () {
      if (!graphviz) return;

      if (signal.aborted) return; // Check after all async stuff

      // Compose SVG markup
      let svgMarkup = '<svg />';
      if (graph?.modules?.size) {
        const dotDoc = composeDOT(graph.modules);
        try {
          svgMarkup = graph?.modules.size
            ? graphviz.dot(dotDoc, 'svg')
            : '<svg />';
        } catch (err) {
          console.error(err);
          flash('Error while rendering graph');
        }
      }
      if (signal.aborted) return; // Check after all async stuff

      // Parse markup
      const svgDom = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml').children[0] as SVGSVGElement;
      svgDom.remove();

      // Remove background element so page background shows thru
      $(svgDom, '.graph > polygon').remove();
      svgDom.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svgDom.id = 'graph-diagram';

      // Inject into DOM
      const el = $('#graph');
      getDiagramElement()?.remove();
      el.appendChild(svgDom);

      // Inject bg pattern for deprecated modules
      const PATTERN = `<pattern id="warning"
        width="12" height="12"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45 50 50)">
        <line class="line0" stroke-width="6px" x1="3" x2="3" y2="12"/>
        <line class="line1" stroke-width="6px" x1="9" x2="9" y2="12"/>
        </pattern>`;

      select('#graph svg').insert('defs', ':first-child').html(PATTERN);

      // Decorate DOM nodes with appropriate classname
      for (const el of $<SVGPathElement>('#graph g.node')) {
        // Find module this node represents
        const key = $(el, 'text')[0].textContent;
        if (!key) continue;

        const m = getModule(key);

        if (!m) continue;

        if (m.name) {
          el.dataset.module = m.name;
        } else {
          console.warn(Error(`Bad replace: ${key}`));
        }

        if (!moduleFilter(m)) {
          el.classList.add('collapsed');
        }

      }

      // Signal other hooks that graph DOM has changed
      setDomSignal(domSignal + 1);

    })();

    return () => {
      abort();
    };
  }, [graphviz, graph]);

  // Effect: render graph selection
  useEffect(
    () => updateSelection(graph, queryValue),
    [href, queryType, queryValue, domSignal],
  );

  // Effect: Colorize nodes
  useEffect(() => {
    const svg = getDiagramElement();
    if (!svg) return;
  }, [colorize, domSignal]);

  // (Re)apply zoom if/when it changes
  useEffect(applyZoom, [zoom, domSignal]);

  if (!graphviz) {
    if (graphvizLoading) {
      return (
        <div id="graph" className="graphviz-loading">
          {graphvizLoading
            ? 'Loading layout package...'
            : 'Layout package failed to load.'}
        </div>
      );
    }
  }

  return (
    <div id="graph" onClick={handleGraphClick}>
      <div id="graph-controls">
        <GraphDiagramZoomButtons />
        <GraphDiagramDownloadButton />
      </div>
    </div>
  );
}

export function updateSelection(
  graph: GraphState | null,
  queryValue: string,
) {
  if (!graph) return;

  const modules = queryModules(queryValue);

  // Get selection info
  const si = gatherSelectionInfo(graph, modules.values());
  const isSelection = modules.size > 0;

  // Set selection classes for node elements
  const graphEl = document.querySelector('#graph');
  for (const el of [...$<SVGElement>('svg .node[data-module]')]) {
    const moduleKey = el.dataset.module ?? '';
    const isSelected = si.selectedKeys.has(moduleKey);
    const isUpstream = si.upstreamModuleKeys.has(moduleKey);
    const isDownstream = si.downstreamModuleKeys.has(moduleKey);
    el.classList.toggle('selected', isSelection && isSelected);
    el.classList.toggle('upstream', isSelection && isUpstream);
    el.classList.toggle('downstream', isSelection && isDownstream);
    el.classList.toggle(
      'unselected',
      isSelection && !isSelected && !isUpstream && !isDownstream,
    );

    if (isSelection && isSelected) {
      // el.scrollIntoView({ behavior: 'smooth' });
      if (graphEl) {
        // Bug: graphEl.scrollIntoView() doesn't work for SVG elements in
        // Firefox.  And even in Chrome it just scrolls the element to *barely*
        // be in view, which isn't really what we want.  (We'd like element to
        // be centered in the view.)  So, instead, we manually compute the
        // scroll coordinates.
        const { top, left } = el.getBoundingClientRect();
        graphEl.scrollTo({
          left: graphEl.scrollLeft + left - graphEl.clientWidth / 2,
          top: graphEl.scrollTop + top - graphEl.clientHeight / 2,
          behavior: 'smooth',
        });
      }
    }
  }

  // Set selection classes for edge elements
  for (const titleEl of [...$<SVGElement>('svg .edge')]) {
    const edgeTitle = $(titleEl, '.edge title')?.textContent ?? '';
    const edge = $.up<SVGPathElement>(titleEl, '.edge');
    if (!edge) continue;

    const isUpstream = si.upstreamEdgeKeys.has(edgeTitle);
    const isDownstream = si.downstreamEdgeKeys.has(edgeTitle);
    edge.classList.toggle('upstream', isSelection && isUpstream);
    edge.classList.toggle('downstream', isSelection && isDownstream);
    edge.classList.toggle(
      'unselected',
      isSelection && !isUpstream && !isDownstream,
    );

    // Move edge to end of child list so it's painted last
    if (isUpstream || isDownstream) {
      edge.parentElement?.appendChild(edge);
    }
  }
}

export function getDiagramElement() {
  return document.querySelector<SVGSVGElement>('#graph svg#graph-diagram');
}
