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

function formatDateTime(value) {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return normalizeText(value);
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
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
  formatDateTime,
  formatProductReference,
  formatValidade,
  normalizeText,
};
