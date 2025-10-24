import React, { useState, useCallback } from 'react';

export default function FileUploader({ onFileUpload }: { onFileUpload: (f: File) => void }) {
  const [drag, setDrag] = useState(false);

  const handleFile = (f: File | undefined) => f && onFileUpload(f);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setDrag(false);
    handleFile(e.dataTransfer.files?.[0]);
  }, []);

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
        ${drag ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'}`}
      onDrop={onDrop}
      onDragOver={(e)=>{e.preventDefault(); setDrag(true);}}
      onDragLeave={()=>setDrag(false)}
      onClick={()=>document.getElementById('uploader-input')?.click()}
    >
      <input id="uploader-input" type="file" className="hidden"
        accept="image/*,application/pdf" onChange={(e)=>handleFile(e.target.files?.[0])}/>
      <p className="text-slate-600">Arrastra y suelta tu archivo (PDF/JPG/PNG) o haz clic.</p>
    </div>
  );
}
