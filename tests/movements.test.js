/**
 * Tests for pocket movements fetching
 */

import { jest } from '@jest/globals';
import { fetchPocketMovements } from '../utils/movements.js';

const pockets = [
  { id: 'p-main', type: 'main' },
  { id: 'p-meals', type: 'meals' },
  { id: 'p-benefits', type: 'benefits' },
  { id: 'p-budget', type: 'budget' }
];

function mockFetch(listByPocketId) {
  return jest.fn(async (url) => {
    const pocketId = new URL(url).searchParams.get('pocket_id');
    return {
      ok: true,
      status: 200,
      json: async () => ({ movements: { list: listByPocketId[pocketId] || [] } })
    };
  });
}

describe('fetchPocketMovements', () => {
  test('fetches movements of the benefits pocket and tags them as benefits', async () => {
    const fetchFn = mockFetch({
      'p-benefits': [{ id: 'b1', type: 'purchase', pocket: { id: 'p-benefits' } }]
    });

    const list = await fetchPocketMovements({
      pockets, pocketType: 'benefits', fromDate: '2026-01-01T00:00:00.000Z',
      toDate: '2026-12-31T23:59:59.999Z', headers: {}, fetchFn
    });

    expect(list).toEqual([{ id: 'b1', type: 'purchase', pocket: { id: 'p-benefits', type: 'benefits' } }]);
    const url = new URL(fetchFn.mock.calls[0][0]);
    expect(url.pathname).toBe('/api/employee/movements');
    expect(url.searchParams.get('pocket_id')).toBe('p-benefits');
    expect(url.searchParams.get('pagination')).toBe('no');
    expect(url.searchParams.get('filters[movement_from]')).toBe('2026-01-01');
    expect(url.searchParams.get('filters[movement_to]')).toBe('2026-12-31');
  });

  test('fetches meals pocket movements tagged as meals', async () => {
    const fetchFn = mockFetch({ 'p-meals': [{ id: 'm1' }] });

    const list = await fetchPocketMovements({
      pockets, pocketType: 'meals', fromDate: '2026-01-01T00:00:00.000Z',
      toDate: '2026-12-31T23:59:59.999Z', headers: {}, fetchFn
    });

    expect(list).toEqual([{ id: 'm1', pocket: { type: 'meals' } }]);
  });

  test('returns empty list without calling the API when the pocket does not exist', async () => {
    const fetchFn = mockFetch({});

    const list = await fetchPocketMovements({
      pockets: [{ id: 'p-main', type: 'main' }], pocketType: 'benefits',
      fromDate: '2026-01-01T00:00:00.000Z', toDate: '2026-12-31T23:59:59.999Z', headers: {}, fetchFn
    });

    expect(list).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  test('throws on authentication failure', async () => {
    const fetchFn = jest.fn(async () => ({ ok: false, status: 401 }));

    await expect(fetchPocketMovements({
      pockets, pocketType: 'benefits', fromDate: '2026-01-01T00:00:00.000Z',
      toDate: '2026-12-31T23:59:59.999Z', headers: {}, fetchFn
    })).rejects.toThrow('Authentication expired');
  });
});
