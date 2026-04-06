import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type DataTableColumn } from './DataTable';

interface Row {
  id: string;
  name: string;
  score: number;
}

const rows: Row[] = [
  { id: '1', name: 'Ayşe', score: 80 },
  { id: '2', name: 'Burak', score: 65 },
  { id: '3', name: 'Çağla', score: 95 },
];

const columns: DataTableColumn<Row>[] = [
  {
    id: 'name',
    header: 'İsim',
    cell: (r) => r.name,
    sortAccessor: (r) => r.name,
  },
  {
    id: 'score',
    header: 'Skor',
    cell: (r) => r.score,
    sortAccessor: (r) => r.score,
    align: 'right',
  },
];

describe('DataTable', () => {
  it('renders all rows', () => {
    render(<DataTable columns={columns} data={rows} getRowId={(r) => r.id} />);
    expect(screen.getByText('Ayşe')).toBeInTheDocument();
    expect(screen.getByText('Burak')).toBeInTheDocument();
    expect(screen.getByText('Çağla')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<DataTable columns={columns} data={[]} getRowId={(r) => r.id} />);
    expect(screen.getByText('Veri yok')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(<DataTable columns={columns} data={[]} getRowId={(r) => r.id} loading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('sorts rows ascending then descending on header click (uncontrolled)', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={rows} getRowId={(r) => r.id} />);

    // Initial: 80, 65, 95
    let tbody = screen.getAllByRole('row').slice(1);
    expect(within(tbody[0]!).getByText('80')).toBeInTheDocument();

    // Click Skor -> asc: 65, 80, 95
    await user.click(screen.getByRole('button', { name: /Skor/i }));
    tbody = screen.getAllByRole('row').slice(1);
    expect(within(tbody[0]!).getByText('65')).toBeInTheDocument();
    expect(within(tbody[2]!).getByText('95')).toBeInTheDocument();

    // Click again -> desc: 95, 80, 65
    await user.click(screen.getByRole('button', { name: /Skor/i }));
    tbody = screen.getAllByRole('row').slice(1);
    expect(within(tbody[0]!).getByText('95')).toBeInTheDocument();
    expect(within(tbody[2]!).getByText('65')).toBeInTheDocument();
  });

  it('calls onRowClick when row is clicked', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        onRowClick={onRowClick}
      />,
    );
    await user.click(screen.getByText('Ayşe'));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]!);
  });

  it('fires onSortChange in controlled mode', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        sort={null}
        onSortChange={onSortChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: /İsim/i }));
    expect(onSortChange).toHaveBeenCalledWith({ columnId: 'name', direction: 'asc' });
  });
});
