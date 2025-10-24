import React from 'react';
import { DataViewerProps } from 'react-spreadsheet';
import { Info } from 'lucide-react';
// Asumimos que los estilos .formulaIcon y .tooltip están en un archivo global
// o en el SCSS del módulo padre que se esté usando.
// Por simplicidad, importaremos el de PertModule
import styles from '../PertModule.module.scss'; 

export interface FormulaCell {
  value: number | string;
  formula: string;
}

const fmt = (x: unknown, d = 2) => typeof x === 'number' && isFinite(x) ? x.toFixed(d) : '...';

// --- ¡CORRECCIÓN AQUÍ! ---
// Se eliminó la 'T' extra que estaba antes del '=>'
export const FormulaCellViewer = (props: DataViewerProps<FormulaCell | string | number | undefined>) => {
// --- FIN DE LA CORRECCIÓN ---
  const { cell } = props;
  if (cell && typeof cell.value === 'object' && cell.value !== null && 'formula' in cell.value) {
    const { value, formula } = cell.value;
    const displayValue = typeof value === 'number' ? (value === Infinity ? 'N/A' : fmt(value)) : value;
    return (
      <span
        className="flex items-center justify-between w-full h-full px-1"
        data-tooltip-id="pert-formula-tip"
        data-tooltip-content={formula}
      >
        <span>{displayValue}</span>
        <Info size={14} className={styles.formulaIcon} />
      </span>
    );
  }
  return <span className="flex items-center w-full h-full px-1">{fmt(cell?.value, 2)}</span>;
};