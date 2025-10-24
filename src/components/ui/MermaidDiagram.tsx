import React, { useEffect, useRef, useId } from 'react';
import mermaid from 'mermaid';
mermaid.initialize({ startOnLoad:false, theme:'neutral', securityLevel:'loose' });

export default function MermaidDiagram({ chart }: {chart:string}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(()=>{
    const run = async ()=>{
      if (!ref.current || !chart) return;
      try {
        ref.current.innerHTML = '';
        const { svg } = await mermaid.render(`m-${id}`, chart);
        ref.current.innerHTML = svg;
      } catch(e) {
        ref.current.innerHTML = '<div class="text-red-600">Error mermaid</div>';
      }
    };
    run();
  }, [chart, id]);
  return <div ref={ref} className="w-full overflow-x-auto" />;
}
