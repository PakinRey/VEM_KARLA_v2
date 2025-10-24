// components/pert/PertNetworkDiagram.tsx

import React, { useMemo, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  Node,
  Edge,
  Position,
  Handle // --- ¡IMPORTANTE! Importar Handle ---
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { ActivityNode, PertAnalysis } from '../../services/pertService';

// --- ¡CORRECCIÓN DE IMPORTACIÓN! ---
// Asegúrate de que importe su PROPIO archivo de estilos
import styles from './PertNetworkDiagram.module.scss';
import clsx from 'clsx';

type Props = {
  pert: PertAnalysis | null; 
};

// --- NODO PERSONALIZADO PARA ACTIVIDADES (CORREGIDO) ---
const CustomNode = ({ data }: { data: { label: string; te: number; isCritical: boolean } }) => (
  <div className={clsx(styles.reactFlowNode, data.isCritical && styles.critical)}>
    
    {/* --- ¡ARREGLO #008! --- */}
    {/* "Enchufes" (Handles) para que las flechas se conecten */}
    <Handle 
      type="target" 
      position={Position.Left} 
      className={styles.handle}
      id="left"
    />
    
    {/* Contenido del nodo */}
    <div className={styles.label}>{data.label}</div>
    <div className={styles.te}>Tₑ: {data.te.toFixed(2)}</div>

    {/* --- ¡ARREGLO #008! --- */}
    <Handle 
      type="source" 
      position={Position.Right}
      className={styles.handle}
      id="right"
    />
  </div>
);

// --- NODO DE LEYENDA (Sin cambios) ---
const CriticalPathLegendNode = ({ data }: { data: { text: string } }) => (
  <div className={styles.criticalPathText}>
    <div>Ruta Crítica (PERT):</div>
    <span>{data.text}</span>
  </div>
);

// --- ¡CORRECCIÓN #002! ---
// Movemos nodeTypes FUERA del componente para arreglar el warning.
const nodeTypes = {
  custom: CustomNode,
  legend: CriticalPathLegendNode,
};

// --- Lógica de auto-layout con Dagre (sin cambios) ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
const nodeWidth = 120;
const nodeHeight = 60;
const getLayoutedElements = (nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } => {
  try {
    dagreGraph.setGraph({ rankdir: 'LR' }); 
    nodes.forEach((node) => { dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight }); });
    edges.forEach((edge) => { dagreGraph.setEdge(edge.source, edge.target); });
    dagre.layout(dagreGraph);
    nodes.forEach((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      if (nodeWithPosition) {
          node.position = { x: nodeWithPosition.x - nodeWidth / 2, y: nodeWithPosition.y - nodeHeight / 2 };
      } else {
          console.error(`Dagre: No position found for node ${node.id}`);
          node.position = { x: Math.random() * 100, y: Math.random() * 100 };
      }
      return node;
    });
    return { nodes, edges };
  } catch (error) {
    console.error("Error during Dagre layout:", error);
    return { nodes, edges }; 
  }
};


export default function PertNetworkDiagram({ pert }: Props) {
  
  useEffect(() => {
    // Este log es útil, lo dejamos
    console.log("PertNetworkDiagram received pert data:", pert);
  }, [pert]);

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (!pert || !pert.activities || pert.activities.length === 0) {
      return { nodes: [], edges: [] };
    }
    
    const criticalPathSet = new Set(pert.criticalPath || []);
    const activities = pert.activities;

    const reactFlowNodes: Node[] = activities.map(act => ({
      id: act.id,
      type: 'custom',
      data: { label: act.id, te: act.te, isCritical: criticalPathSet.has(act.id) },
      position: { x: 0, y: 0 }, 
      // Ya no necesitamos source/target Position aquí, el CustomNode los define
    }));
    
    reactFlowNodes.push({ id: 'START', data: { label: 'START' }, position: { x: 0, y: 0 }, sourcePosition: Position.Right, targetPosition: Position.Left, style: { padding: '10px 20px', background: '#dff0d8' } });
    reactFlowNodes.push({ id: 'END', data: { label: 'END' }, position: { x: 0, y: 0 }, sourcePosition: Position.Right, targetPosition: Position.Left, style: { padding: '10px 20px', background: '#dff0d8' } });

    const reactFlowEdges: Edge[] = [];
     activities.forEach(act => {
      const isActCritical = criticalPathSet.has(act.id);
      
      if (act.preds.length === 0 || act.preds.includes('START')) {
        reactFlowEdges.push({ 
          id: `START-${act.id}`, source: 'START', target: act.id, animated: isActCritical, 
          style: { stroke: isActCritical ? '#EF4444' : '#6b7280', strokeWidth: isActCritical ? 3 : 1.5 } 
        });
      }
      
      act.preds.forEach(predId => {
        if (predId === 'START') return;
        const isPredCritical = criticalPathSet.has(predId);
        const isEdgeCritical = isActCritical && isPredCritical; 
        reactFlowEdges.push({ 
          id: `${predId}-${act.id}`, source: predId, target: act.id, animated: isEdgeCritical, 
          style: { stroke: isEdgeCritical ? '#EF4444' : '#6b7280', strokeWidth: isEdgeCritical ? 3 : 1.5 } 
        });
      });

      if (act.succs.length === 0) {
        reactFlowEdges.push({ 
          id: `${act.id}-END`, source: act.id, target: 'END', animated: isActCritical, 
          style: { stroke: isActCritical ? '#EF4444' : '#6b7280', strokeWidth: isActCritical ? 3 : 1.5 } 
        });
      }
    });
    
    const { nodes: layoutedActivityNodes, edges } = getLayoutedElements(reactFlowNodes, reactFlowEdges);
    
    const criticalPathString = pert.criticalPath.join(' → ');
    const legendNode: Node = {
      id: 'CRITICAL_PATH_LEGEND',
      type: 'legend',
      data: { text: criticalPathString },
      position: { x: 15, y: 15 }, 
      draggable: true,
      selectable: false,
      connectable: false,
    };

    return { nodes: [...layoutedActivityNodes, legendNode], edges };
  }, [pert]);

  if (!pert) {
    return <div className={styles.description}>Esperando datos...</div>;
  }
  if (!pert.activities || pert.activities.length === 0) {
    return <div className={styles.description}>No hay actividades.</div>;
  }

  return (
    <>
      <h3 className={styles.subHeader}>Red del Proyecto (React Flow)</h3>
      <p className={styles.description}>
        Diagrama interactivo de la red. Los nodos y flechas en rojo indican la Ruta Crítica.
      </p>
      {/* El <div> padre AHORA SÍ usará la clase de su propio SCSS */}
      <div className={styles.reactFlowContainer}> 
        <ReactFlow
          nodes={layoutedNodes}
          edges={layoutedEdges}
          nodeTypes={nodeTypes} // Pasa la constante
          fitView
          proOptions={{ hideAttribution: true }} 
        >
          <Controls />
          <MiniMap />
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </>
  );
}