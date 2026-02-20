export function createExportController({
  state,
  dom,
  sanitizeFileName,
  getImageBaseName,
  getExportEngineModule
}) {
  function getExportFormat() {
    return dom.formatInput.value;
  }

  function getQuality() {
    return Math.min(1, Math.max(0.4, (parseInt(dom.qualityInput.value, 10) || 90) / 100));
  }

  function extensionForType(type) {
    const exportEngineModule = getExportEngineModule();
    if (exportEngineModule && typeof exportEngineModule.extensionForType === 'function') {
      return exportEngineModule.extensionForType(type);
    }
    if (type === 'image/png') return 'png';
    if (type === 'image/webp') return 'webp';
    if (type === 'image/avif') return 'avif';
    if (type === 'application/pdf') return 'pdf';
    return 'jpg';
  }

  function buildFilename(name, type) {
    const exportEngineModule = getExportEngineModule();
    if (exportEngineModule && typeof exportEngineModule.buildFilename === 'function') {
      return exportEngineModule.buildFilename(name, type);
    }
    const ext = extensionForType(type);
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    return `${base}.${ext}`;
  }

  function getBulkSequentialBaseName() {
    const cleaned = sanitizeFileName(state.bulkSequentialBase || '').replace(/\.[^.]+$/, '').trim();
    return cleaned || 'Name';
  }

  function shouldUseSequentialZipNames() {
    return state.bulkExportMode === 'zip' && state.bulkAdvancedMode === 'sequential';
  }

  function formatDateToken(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  function formatTimeToken(date = new Date()) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}${mm}${ss}`;
  }

  function buildNameFromTemplate(template, values) {
    const rawTemplate = String(template || '{name}_{n}');
    let output = rawTemplate.replace(/\{(name|n|index|date|time|datetime|suffix)\}/gi, (match, token) => {
      const key = String(token || '').toLowerCase();
      const value = values[key];
      return value == null ? '' : String(value);
    });
    output = sanitizeFileName(output)
      .replace(/\s+/g, '_')
      .replace(/\.[a-z0-9]{2,5}$/i, '')
      .replace(/\.+$/, '')
      .trim();
    return output || `${values.name || 'image'}_${values.n || 1}`;
  }

  function makeUniqueFilename(rawName, usedNames) {
    if (!usedNames.has(rawName)) {
      usedNames.add(rawName);
      return rawName;
    }
    const dot = rawName.lastIndexOf('.');
    const base = dot > 0 ? rawName.slice(0, dot) : rawName;
    const ext = dot > 0 ? rawName.slice(dot) : '';
    let index = 2;
    let candidate = `${base}_${index}${ext}`;
    while (usedNames.has(candidate)) {
      index += 1;
      candidate = `${base}_${index}${ext}`;
    }
    usedNames.add(candidate);
    return candidate;
  }

  function buildBulkFilename(img, index, outputType, usedNames) {
    const ext = extensionForType(outputType);
    const baseName = sanitizeFileName(getImageBaseName(img && img.name ? img.name : `image-${index + 1}`)).replace(/\s+/g, '_') || `image_${index + 1}`;
    let finalBase = baseName;

    if (state.bulkUseNameTemplate) {
      const now = new Date();
      const suffix = sanitizeFileName(state.bulkNameSuffix || '').replace(/\s+/g, '_').replace(/\.[^.]+$/, '').trim();
      finalBase = buildNameFromTemplate(state.bulkNameTemplate, {
        name: baseName,
        n: index + 1,
        index: index + 1,
        date: formatDateToken(now),
        time: formatTimeToken(now),
        datetime: `${formatDateToken(now)}_${formatTimeToken(now)}`,
        suffix
      });
      if (suffix && !/\{suffix\}/i.test(state.bulkNameTemplate || '')) {
        finalBase = `${finalBase}_${suffix}`;
      }
    } else if (shouldUseSequentialZipNames()) {
      finalBase = `${getBulkSequentialBaseName()}${index + 1}`;
    }

    const raw = `${finalBase}.${ext}`;
    return makeUniqueFilename(raw, usedNames);
  }

  return {
    getExportFormat,
    getQuality,
    extensionForType,
    buildFilename,
    getBulkSequentialBaseName,
    shouldUseSequentialZipNames,
    formatDateToken,
    formatTimeToken,
    buildNameFromTemplate,
    makeUniqueFilename,
    buildBulkFilename
  };
}
