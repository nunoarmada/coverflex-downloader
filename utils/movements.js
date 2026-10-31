// Fetch movements of a Coverflex pocket (e.g. meals, benefits)

const MOVEMENTS_URL = 'https://menhir-api.coverflex.com/api/employee/movements';

// Employer topups arrive as credit transfers described as "... COVERFLEX TOPUP ITEMID:..."
function isTopup(movement) {
  return movement.type === 'transfer' && !movement.is_debit && /COVERFLEX TOPUP/i.test(movement.description || '');
}

// Map a /movements entry to the field names used by /operations entries,
// so CSV export and filters treat both the same way.
function normalizeMovement(movement, pocketType) {
  return {
    ...movement,
    type: isTopup(movement) ? 'topup' : movement.type,
    category_slug: movement.category_slug ?? movement.category ?? '',
    pocket: { ...movement.pocket, type: pocketType }
  };
}

// Returns the movements of the pocket with the given type, normalized and tagged with pocket.type.
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
  return (data.movements?.list || []).map(m => normalizeMovement(m, pocketType));
}
