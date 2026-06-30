function normalizeText(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function formatValidade(value) {
  if (!value) {
    return '';
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    return `${month}/${value.getFullYear()}`;
  }

  const text = normalizeText(value);

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[1]}`;
  }

  const brMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return `${brMatch[2]}/${brMatch[3]}`;
  }

  return text;
}

function formatProductReference(row) {
  return {
    op: normalizeText(row.OP),
    lote: normalizeText(row.LOTE),
    validade: formatValidade(row.VALIDADE),
    produto: normalizeText(row.PRODUTO),
    registroAnvisa: normalizeText(row.REGISTRO_ANVISA),
    gtin: normalizeText(row.GTIN),
    linhaProducaoId: row.LINHAPRODUCAO_ID ?? null,
  };
}

module.exports = {
  formatProductReference,
  formatValidade,
  normalizeText,
};
