'use strict';

(function () {
  var ALLOWED_YEARS = ['2025', '2026', '2027'];
  var MAX_ROWS = 10000;
  var ERROR_MESSAGE = 'Neplatná vstupní data pro CSV export přehledu.';
  var BOM = '﻿';
  var SEP = ';';
  var EOL = '\r\n';

  var FIXED_HEADERS = [
    'ID', 'Ročník', 'Kategorie', 'Jméno / skupina', 'Stav', 'Pozice',
    'Kdo řeší', 'E-mail', 'Telefon', 'Barter', 'Merch', 'Termín / účast',
    'Vyřazený', 'Verze', 'Zdrojový ročník', 'Zdrojový list', 'Zdrojový řádek',
    'Zdrojový záznam'
  ];

  function fail() {
    throw new TypeError(ERROR_MESSAGE);
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function isValidFieldValue(value) {
    return (
      value === null ||
      value === undefined ||
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value))
    );
  }

  // A sparse array (e.g. `new Array(n)` or `delete arr[i]`) makes forEach silently skip
  // missing indices; reject it instead of dropping those entries from the export.
  function hasNoHoles(list) {
    for (var i = 0; i < list.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(list, i)) return false;
    }
    return true;
  }

  function validateOptionalObject(value) {
    if (value === null || value === undefined) return undefined;
    if (!isPlainObject(value)) fail();
    return value;
  }

  function validateEntryList(list) {
    if (list === undefined) return;
    if (!Array.isArray(list) || !hasNoHoles(list)) fail();
    list.forEach(function (entry) {
      if (!isPlainObject(entry)) fail();
      if (typeof entry.label !== 'string' || entry.label.length === 0) fail();
      if (!isValidFieldValue(entry.value)) fail();
    });
  }

  function validateRow(row, year) {
    if (!isPlainObject(row)) fail();
    if (typeof row.id !== 'string' || row.id.length === 0) fail();
    if (typeof row.year !== 'string' || row.year !== year) fail();

    if (year === '2027') {
      if (!Number.isSafeInteger(row.version) || row.version <= 0) fail();
    } else if (!isValidFieldValue(row.version)) {
      fail();
    }

    if (!isValidFieldValue(row.category)) fail();
    if (!isValidFieldValue(row.name)) fail();
    if (!isValidFieldValue(row.statusLabel)) fail();
    if (!isValidFieldValue(row.status)) fail();
    if (!isValidFieldValue(row.position)) fail();
    if (!isValidFieldValue(row.owner)) fail();
    if (!isValidFieldValue(row.email)) fail();
    if (!isValidFieldValue(row.phone)) fail();
    if (!isValidFieldValue(row.barter)) fail();
    if (!isValidFieldValue(row.merch)) fail();
    if (!isValidFieldValue(row.archived)) fail();
    if (!isValidFieldValue(row.sourceYear)) fail();
    if (!isValidFieldValue(row.sourceId)) fail();

    var fields = validateOptionalObject(row.fields);
    if (fields !== undefined && !isValidFieldValue(fields.term)) fail();

    var source = validateOptionalObject(row.source);
    if (source !== undefined) {
      if (!isValidFieldValue(source.sheet)) fail();
      if (!isValidFieldValue(source.row)) fail();
    }

    validateEntryList(row.raw);
    validateEntryList(row.extra);
  }

  // Columns are keyed by (label, nth occurrence of that label within a row), not by
  // array position, so rows that list the same labels in a different order still align.
  function registerColumns(rows, fieldName) {
    var order = [];
    var registry = new Map();
    rows.forEach(function (row) {
      var list = row[fieldName];
      if (!Array.isArray(list)) return;
      var seen = new Map();
      list.forEach(function (entry) {
        var label = entry.label;
        var occurrence = (seen.get(label) || 0) + 1;
        seen.set(label, occurrence);
        var occurrences = registry.get(label);
        if (!occurrences) {
          occurrences = new Map();
          registry.set(label, occurrences);
        }
        if (!occurrences.has(occurrence)) {
          occurrences.set(occurrence, order.length);
          order.push({ label: label, occurrence: occurrence });
        }
      });
    });
    return order;
  }

  function rowColumnValues(row, fieldName, columns) {
    var list = row[fieldName];
    var values = new Array(columns.length);
    if (!Array.isArray(list)) return values;
    var seen = new Map();
    var byLabel = new Map();
    list.forEach(function (entry) {
      var label = entry.label;
      var occurrence = (seen.get(label) || 0) + 1;
      seen.set(label, occurrence);
      var occurrences = byLabel.get(label);
      if (!occurrences) {
        occurrences = new Map();
        byLabel.set(label, occurrences);
      }
      occurrences.set(occurrence, entry.value);
    });
    columns.forEach(function (column, index) {
      var occurrences = byLabel.get(column.label);
      if (occurrences && occurrences.has(column.occurrence)) {
        values[index] = occurrences.get(column.occurrence);
      }
    });
    return values;
  }

  function quote(text) {
    return '"' + text.replace(/"/g, '""') + '"';
  }

  // Every non-empty text value (incl. headers) gets a tab prefix inside the quotes.
  // This is a best-effort nudge against formula/CSV injection when the file is opened
  // in Excel and keeps leading zeros intact; it is not a guarantee for every spreadsheet
  // program, nor for files that get re-saved or re-exported afterwards.
  function textCell(text) {
    if (text === '') return quote('');
    return quote('\t' + text);
  }

  function formatCell(value, forceText) {
    if (value === null || value === undefined || value === '') return quote('');
    if (typeof value === 'boolean') return textCell(value ? 'true' : 'false');
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return quote('');
      if (forceText) return textCell(String(value));
      return quote(String(value).replace('.', ','));
    }
    if (typeof value === 'string') return textCell(value);
    return quote('');
  }

  function formatArchived(value) {
    if (typeof value === 'boolean') return textCell(value ? 'Ano' : 'Ne');
    return quote('');
  }

  function nested(value, key) {
    return isPlainObject(value) ? value[key] : undefined;
  }

  function buildCsv(rows, year) {
    if (typeof year !== 'string' || ALLOWED_YEARS.indexOf(year) === -1) fail();
    if (!Array.isArray(rows) || rows.length > MAX_ROWS || !hasNoHoles(rows)) fail();
    rows.forEach(function (row) {
      validateRow(row, year);
    });

    var rawColumns = registerColumns(rows, 'raw');
    var extraColumns = registerColumns(rows, 'extra');

    var headerCells = FIXED_HEADERS.map(function (label) {
      return textCell(label);
    });
    rawColumns.forEach(function (column, index) {
      headerCells.push(textCell('Tabulka ' + (index + 1) + ': ' + column.label));
    });
    extraColumns.forEach(function (column, index) {
      headerCells.push(textCell('Další ' + (index + 1) + ': ' + column.label));
    });

    var lines = [headerCells.join(SEP)];

    rows.forEach(function (row) {
      var status = row.statusLabel !== null && row.statusLabel !== undefined
        ? row.statusLabel
        : row.status;
      var rawValues = rowColumnValues(row, 'raw', rawColumns);
      var extraValues = rowColumnValues(row, 'extra', extraColumns);

      // ID, Ročník, Telefon and Zdrojový ročník are always rendered as plain text
      // (forceText) even if the stored value is numeric, to preserve exact digits.
      var cells = [
        formatCell(row.id, true),
        formatCell(row.year, true),
        formatCell(row.category, false),
        formatCell(row.name, false),
        formatCell(status, false),
        formatCell(row.position, false),
        formatCell(row.owner, false),
        formatCell(row.email, false),
        formatCell(row.phone, true),
        formatCell(row.barter, false),
        formatCell(row.merch, false),
        formatCell(nested(row.fields, 'term'), false),
        formatArchived(row.archived),
        formatCell(row.version, false),
        formatCell(row.sourceYear, true),
        formatCell(nested(row.source, 'sheet'), false),
        formatCell(nested(row.source, 'row'), false),
        formatCell(row.sourceId, false)
      ];
      rawValues.forEach(function (value) { cells.push(formatCell(value, false)); });
      extraValues.forEach(function (value) { cells.push(formatCell(value, false)); });

      lines.push(cells.join(SEP));
    });

    var csv = BOM + lines.join(EOL) + EOL;

    return {
      csv: csv,
      filename: 'SVDT-lide-' + year + '.csv',
      rowCount: rows.length
    };
  }

  // Exposed both as the callable export and as a `.buildCsv` property on itself,
  // so either calling convention works for integrators.
  buildCsv.buildCsv = buildCsv;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = buildCsv;
  }
  if (typeof window !== 'undefined') {
    window.SVDT_CREW_CSV = buildCsv;
  }
})();
