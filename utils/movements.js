// Fetch movements of a Coverflex pocket (e.g. meals, benefits)

const MOVEMENTS_URL = 'https://menhir-api.coverflex.com/api/employee/movements';

// Returns the movements of the pocket with the given type, tagged with pocket.type.
// Returns [] when the user has no pocket of that type.
export async function fetchPocketMovements({ pockets, pocketType, fromDate, toDate, headers, fetchFn = fetch }) {
  const pocket = pockets?.find(p => p.type === pocketType);
  if (!pocket) return [];

  const params = new URLSearchParams({
    'pocket_id': pocket.id,
    'pagination': 'no',
    'filters[movement_from]': fromDate.split('T')[0], // API expects YYYY-MM-DD
    'filters[movement_to]': toDate.split('T')[0]
  });

  const response = await fetchFn(`${MOVEMENTS_URL}?${params}`, { method: 'GET', headers });

  if (response.status === 401) {
    throw new Error('Authentication expired');
  }
  if (!response.ok) {
    throw new Error(`API error fetching ${pocketType} movements: ${response.status}`);
  }

  const data = await response.json();
  return (data.movements?.list || []).map(m => ({
    ...m,
    pocket: { ...m.pocket, type: pocketType }
  }));
}
