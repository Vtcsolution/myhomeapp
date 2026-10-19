/**
 * Integration tests: the real dashboard (routes, providers and the shared
 * simulated API) rendered in jsdom.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { DataTable } from './components/DataTable';
import { AppProviders } from './providers/AppProviders';

afterEach(cleanup);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <App />
      </AppProviders>
    </MemoryRouter>,
  );
}

describe('dashboard app', () => {
  it('signs in with the simulated demo credentials and reaches a protected page', async () => {
    renderAt('/coupons');
    // Protected route sends us to sign-in first; credentials are prefilled.
    expect(await screen.findByText(/Simulated sign-in/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Coupons' }, { timeout: 4000 }),
    ).toBeTruthy();
    // Rows come from the shared demo data.
    const table = await screen.findByRole('table', {}, { timeout: 4000 });
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(1);
  });

  it('blocks approving a professional whose documents are not all verified', async () => {
    // Reuses the admin session saved by the previous test (as a reload would).
    renderAt('/technicians?status=pending_approval');
    const table = await screen.findByRole('table', {}, { timeout: 4000 });
    const firstRow = within(table).getAllByRole('row')[1]!;
    fireEvent.click(firstRow);
    const approve = await screen.findByRole(
      'button',
      { name: 'Approve professional' },
      { timeout: 4000 },
    );
    expect((approve as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getByText('Verify every document before approving this professional.'),
    ).toBeTruthy();
  });
});

describe('confirmations and keyboard access', () => {
  it('asks before rejecting a document and changes nothing on cancel', async () => {
    renderAt('/technicians?status=pending_approval');
    const table = await screen.findByRole('table', {}, { timeout: 4000 });
    fireEvent.click(within(table).getAllByRole('row')[1]!);
    const rejects = await screen.findAllByRole('button', { name: 'Reject' }, { timeout: 4000 });
    fireEvent.click(rejects[0]!);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/is asked to submit it again/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Document rejected')).toBeNull();
  });

  it('offers a skip link to the page content', async () => {
    renderAt('/coupons');
    const skip = await screen.findByRole('link', { name: 'Skip to content' }, { timeout: 4000 });
    expect(skip.getAttribute('href')).toBe('#main');
    expect(document.getElementById('main')?.tagName).toBe('MAIN');
  });
});

describe('DataTable', () => {
  const rows = [
    { id: 'a', name: 'Alpha', value: 2 },
    { id: 'b', name: 'Beta', value: 1 },
  ];

  it('announces sort state and opens rows with the keyboard', () => {
    const onSort = vi.fn();
    const onRowClick = vi.fn();
    render(
      <AppProviders>
        <DataTable
          caption="Things"
          rows={rows}
          rowKey={(r) => r.id}
          rowLabel={(r) => r.name}
          onRowClick={onRowClick}
          sort={{ key: 'value', direction: 'asc' }}
          onSort={onSort}
          columns={[
            { id: 'name', header: 'Name', cell: (r) => r.name },
            { id: 'value', header: 'Value', sortKey: 'value', cell: (r) => r.value },
          ]}
        />
      </AppProviders>,
    );
    const header = screen.getByRole('columnheader', { name: /Value/ });
    expect(header.getAttribute('aria-sort')).toBe('ascending');
    fireEvent.click(within(header).getByRole('button'));
    expect(onSort).toHaveBeenCalledWith('value');

    const row = screen.getByRole('row', { name: /Beta/ });
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });
});
