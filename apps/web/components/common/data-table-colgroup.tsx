import {
  DATA_TABLE_ACTIONS_COLUMN_WIDTH,
  detailTableColWidth,
} from '@/lib/detail-table-column-width';

interface DataTableColGroupColumn {
  key: string;
  width?: string;
}

interface DataTableColGroupProps {
  columns: DataTableColGroupColumn[];
  actionsColumn?: boolean;
  /** Trailing empty column that takes the slack, so real columns keep their exact width. */
  filler?: boolean;
}

export function DataTableColGroup({ columns, actionsColumn, filler }: DataTableColGroupProps) {
  const hasColumnWidths = columns.some((column) => column.width) || actionsColumn || filler;
  if (!hasColumnWidths) {
    return null;
  }

  return (
    <colgroup>
      {columns.map((column) => (
        <col key={column.key} style={detailTableColWidth(column.width)} />
      ))}
      {actionsColumn && <col style={detailTableColWidth(DATA_TABLE_ACTIONS_COLUMN_WIDTH)} />}
      {filler && <col aria-hidden data-column-filler />}
    </colgroup>
  );
}
