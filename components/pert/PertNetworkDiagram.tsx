// components/pert/PertNetworkDiagram.tsx

import React, { useMemo, useEffect } from 'react'; // Añadir useEffect
import ReactFlow, { MiniMap, Controls, Background, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { ActivityNode, PertAnalysis } from '../../services/pertService'; 
import styles from '../PertModule.module.scss';
import clsx from 'clsx';

type Props = {
  pert: PertAnalysis | null; 
};

// Nodo personalizado (sin cambios)
const CustomNode = ({ data }: { data: { label: string; te: number; isCritical: boolean } }) => (
  <div className={clsx(styles.reactFlowNode, data.isCritical && styles.critical)}>
    <div className={styles.label}>{data.label}</div>
    <div className={styles.te}>Tₑ: {data.te.toFixed(2)}</div>
  </div>
);
const nodeTypes = { custom: CustomNode };

// Lógica de auto-layout con Dagre (sin cambios)
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
const nodeWidth = 120;
const nodeHeight = 60;
const getLayoutedElements = (nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } => {
  try { // --- Añadido try-catch por si Dagre falla ---
    dagreGraph.setGraph({ rankdir: 'LR' }); 
    nodes.forEach((node) => { dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight }); });
    edges.forEach((edge) => { dagreGraph.setEdge(edge.source, edge.target); });
    dagre.layout(dagreGraph);
    nodes.forEach((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      // --- Verificación extra por si nodeWithPosition es undefined ---
      if (nodeWithPosition) {
          node.position = { x: nodeWithPosition.x - nodeWidth / 2, y: nodeWithPosition.y - nodeHeight / 2 };
      } else {
          console.error(`Dagre: No position found for node ${node.id}`);
          node.position = { x: Math.random() * 100, y: Math.random() * 100 }; // Fallback position
      }
      return node;
    });
    return { nodes, edges };
  } catch (error) {
    console.error("Error during Dagre layout:", error);
    // Retorna nodos sin posición calculada si falla
    return { nodes, edges }; 
  }
};

export default function PertNetworkDiagram({ pert }: Props) {
  
  // --- Depuración: Loggear los datos recibidos ---
  useEffect(() => {
    console.log("PertNetworkDiagram received pert data:", pert);
  }, [pert]);
  // --- Fin Depuración ---

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    // --- Verificación Robusta: Asegurarse que pert y activities existen ---
    if (!pert || !pert.activities || pert.activities.length === 0) {
      console.log("PertNetworkDiagram: No valid 'pert' data or activities found, returning empty elements.");
      return { nodes: [], edges: [] };
    }
    
    console.log("PertNetworkDiagram: Generating nodes and edges..."); // Log para ver si entra aquí
    
    const criticalPathSet = new Set(pert.criticalPath || []);
    const activities = pert.activities;

    // Creación de Nodos (sin cambios)
    const reactFlowNodes: Node[] = activities.map(act => ({
      id: act.id,
      type: 'custom',
      data: { label: act.id, te: act.te, isCritical: criticalPathSet.has(act.id) },
      position: { x: 0, y: 0 }, 
    }));
    reactFlowNodes.push({ id: 'START', data: { label: 'START' }, position: { x: 0, y: 0 }, style: { padding: '10px 20px', background: '#dff0d8' } });
    reactFlowNodes.push({ id: 'END', data: { label: 'END' }, position: { x: 0, y: 0 }, style: { padding: '10px 20px', background: '#dff0d8' } });

    // Creación de Aristas (con estilos críticos)
    const reactFlowEdges: Edge[] = [];
     activities.forEach(act => {
      const isActCritical = criticalPathSet.has(act.id);
      
      // Conexiones desde START
      if (act.preds.length === 0 || act.preds.includes('START')) {
        const isEdgeCritical = isActCritical; 
        reactFlowEdges.push({ 
          id: `START-${act.id}`, source: 'START', target: act.id, animated: isEdgeCritical, 
          style: { stroke: isEdgeCritical ? '#EF4444' : '#6b7280', strokeWidth: isEdgeCritical ? 3 : 1.5 } 
        });
      }
      
      // Conexiones entre actividades
      act.preds.forEach(predId => {
        if (predId === 'START') return;
        const isPredCritical = criticalPathSet.has(predId);
        const isEdgeCritical = isActCritical && isPredCritical; 
        reactFlowEdges.push({ 
          id: `${predId}-${act.id}`, source: predId, target: act.id, animated: isEdgeCritical, 
          style: { stroke: isEdgeCritical ? '#EF4444' : '#6b7280', strokeWidth: isEdgeCritical ? 3 : 1.5 } 
        });
      });

      // Conexiones hacia END
      if (act.succs.length === 0) {
        const isEdgeCritical = isActCritical; 
        reactFlowEdges.push({ 
          id: `${act.id}-END`, source: act.id, target: 'END', animated: isEdgeCritical, 
          style: { stroke: isEdgeCritical ? '#EF4444' : '#6b7280', strokeWidth: isEdgeCritical ? 3 : 1.5 } 
        });
      }
    });
    
    // --- Depuración: Loggear nodos/aristas ANTES del layout ---
    // console.log("Nodes before layout:", JSON.stringify(reactFlowNodes));
    // console.log("Edges before layout:", JSON.stringify(reactFlowEdges));

    const layoutResult = getLayoutedElements(reactFlowNodes, reactFlowEdges);
    
    // --- Depuración: Loggear nodos/aristas DESPUÉS del layout ---
    // console.log("Nodes after layout:", JSON.stringify(layoutResult.nodes));
    
    return layoutResult;
  }, [pert]);

  // --- Renderizado Condicional Mejorado ---
  if (!pert) {
    return (
      <div className={styles.description}>
        Esperando datos del análisis PERT...
      </div>
    );
  }
  if (!pert.activities || pert.activities.length === 0) {
    return (
      <div className={styles.description}>
        No hay actividades definidas para mostrar el diagrama.
      </div>
    );
  }
   if (layoutedNodes.length === 0 && layoutedEdges.length === 0 && pert.activities.length > 0) {
     return (
       <div className={`${styles.description} text-red-600`}>
         Error al generar los elementos del diagrama. Revisa la consola para más detalles.
       </div>
     );
  }


  return (
    <>
      <h3 className={styles.subHeader}>Red del Proyecto (React Flow)</h3>
      <p className={styles.description}>
        Diagrama interactivo de la red. Los nodos y flechas en rojo indican la Ruta Crítica.
      </p>
      {/* --- Contenedor con altura mínima garantizada --- */}
      <div className={styles.reactFlowContainer} style={{ minHeight: '400px' }}> 
        <ReactFlow
          nodes={layoutedNodes}
          edges={layoutedEdges}
          nodeTypes={nodeTypes}
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