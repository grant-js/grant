import { detailTableColWidth } from '@/lib/detail-table-column-width';

interface DataTableColGroupColumn {
  key: string;
  width?: string;
}

interface DataTableColGroupProps {
  columns: DataTableColGroupColumn[];
  actionsColumn?: boolean;
}

export function DataTableColGroup({ columns, actionsColumn }: DataTableColGroupProps) {
  const hasColumnWidths = columns.some((column) => column.width) || actionsColumn;
  if (!hasColumnWidths) {
    return null;
  }

  return (
    <colgroup>
      {columns.map((column) => (
        <col key={column.key} style={detailTableColWidth(column.width)} />
      ))}
      {actionsColumn && <col style={detailTableColWidth('100px')} />}
    </colgroup>
  );
}
