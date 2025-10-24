import React, { useEffect, useRef, useId } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid once at the module level.
// startOnLoad: false is crucial for programmatic use in React.
mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId();
  // Using a unique ID for each render is good practice with mermaid's async render
  const svgId = `mermaid-svg-${id}`;

  useEffect(() => {
    const renderMermaid = async () => {
      // Ensure the container ref is attached and we have a chart string to render
      if (containerRef.current && chart) {
        try {
          // Clear previous render to prevent artifacts
          containerRef.current.innerHTML = '';
          // Use the modern async mermaid.render which returns the SVG
          const { svg } = await mermaid.render(svgId, chart);
          // Check if the component is still mounted before updating the DOM
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        } catch (error) {
          console.error("Mermaid render error:", error);
          // Provide a fallback in case of an error
          if (containerRef.current) {
            containerRef.current.innerHTML = '<div class="text-red-500">Error rendering diagram.</div>';
          }
        }
      }
    };

    renderMermaid();
  }, [chart, svgId]); // Re-run the effect if the chart data or component ID changes

  return <div ref={containerRef} className="mermaid-container w-full flex justify-center" />;
};

export default MermaidDiagram;
