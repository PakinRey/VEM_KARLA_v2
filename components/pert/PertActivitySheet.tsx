import React from 'react';
import Spreadsheet, { Matrix, CellBase } from 'react-spreadsheet';
import styles from '../PertModule.module.scss';

type Props = {
  sheet: Matrix<CellBase>;
  setSheet: (s: Matrix<CellBase>) => void;
};

export default function PertActivitySheet({ sheet, setSheet }: Props) {
  return (
    <details className={styles.details}>
      <summary>Hoja de Actividades Principal (Editable)</summary>
      <div className={styles.content}>
        <Spreadsheet data={sheet} onChange={setSheet} />
      </div>
    </details>
  );
}