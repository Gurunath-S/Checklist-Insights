export function getPaginationRange(currentPage, totalPages) {
  const delta = 1; // Number of pages to show on each side of currentPage
  const range = [];

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 || // Always show first page
      i === totalPages || // Always show last page
      (i >= currentPage - delta && i <= currentPage + delta) // Show current page and neighbors
    ) {
      range.push(i);
    }
  }

  const result = [];
  let prev = null;

  for (const i of range) {
    if (prev !== null) {
      if (i - prev === 2) {
        result.push(prev + 1);
      } else if (i - prev > 2) {
        result.push('...');
      }
    }
    result.push(i);
    prev = i;
  }

  return result;
}
