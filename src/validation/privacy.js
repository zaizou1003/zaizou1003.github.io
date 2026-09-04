const PRIVATE_FIELD_NAMES = new Set([
  'addressline1',
  'addressline2',
  'apikey',
  'birthdate',
  'clientsecret',
  'credentialid',
  'dateofbirth',
  'gender',
  'mobile',
  'nationality',
  'password',
  'phone',
  'phonenumber',
  'privateidentifier',
  'refreshtoken',
  'secret',
  'serviceid',
  'serviceidentifier',
  'streetaddress',
  'telephone',
  'telephonenumber',
  'token',
]);

const SECRET_VALUE_PATTERNS = [
  /(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|client[_ -]?secret|password)\s*[:=]\s*(?:"[^"\s]{8,}"|'[^'\s]{8,}'|[A-Za-z0-9_./+=-]{8,})/i,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
];

const PRIVATE_FIELD_MARKER_PATTERN =
  /["']?(?:telephone|telephoneNumber|phone|phoneNumber|mobile|gender|nationality|birthDate|dateOfBirth|streetAddress|password|apiKey|accessToken|refreshToken|clientSecret|serviceId|privateIdentifier)["']?\s*[:=]\s*(?=["'A-Za-z0-9])/i;

const SERVICE_IDENTIFIER_PATTERN =
  /(?:firebase|emailjs|(?:service|client|tenant|account)[_-]?id\s*[:=])/i;

const RECOVERY_PATH_PATTERN =
  /(?:src[\\/]utils[\\/](?:data\.js|cv\.pdf)|website_original|source_recovery|(?:^|[\\/])\.env(?:\.|$)|(?:^|[\\/])(?:private|\.private)[\\/]|certificate[^\\/\s]*\.(?:png|jpe?g|webp|pdf))/i;

const SIGNED_PARAMETER_PATTERN =
  /^(?:x-amz-|x-goog-|access[_-]?token$|auth(?:orization)?$|credential$|expires?$|expiry$|key$|policy$|sig$|signature$|token$)/i;

function normalizeFieldName(name) {
  return name.replaceAll(/[^a-z0-9]/gi, '').toLowerCase();
}

export function isForbiddenPrivateField(name) {
  const normalized = normalizeFieldName(name);
  return (
    PRIVATE_FIELD_NAMES.has(normalized) ||
    /(?:service|client|tenant|account)id$/.test(normalized)
  );
}

function candidateHasPhoneShape(candidate) {
  const digits = candidate.replaceAll(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return false;
  if (/[%±]/.test(candidate)) return false;
  if (/^(?:\d{4}[-.\s]\d{1,2}[-.\s]\d{1,2}|\d{1,2}[-.\s]\d{1,2}[-.\s]\d{4})$/.test(candidate)) {
    return false;
  }
  return /[\s().-]/.test(candidate) || candidate.trimStart().startsWith('+');
}

export function containsPhoneLikeValue(value) {
  if (typeof value !== 'string') return false;
  const candidates = value.match(
    /(?:\+\d[\d\s().-]{6,}\d|\b\d{2,4}(?:[\s().-]+\d{2,4}){2,5}\b)/g,
  );
  return candidates?.some(candidateHasPhoneShape) ?? false;
}

function hasSignedOrExpiringUrl(value) {
  const candidates = value.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  return candidates.some((candidate) => {
    const cleaned = candidate.replace(/[),.;]+$/, '');
    let parsed;
    try {
      parsed = new URL(cleaned);
    } catch {
      return false;
    }

    for (const key of parsed.searchParams.keys()) {
      if (SIGNED_PARAMETER_PATTERN.test(key)) return true;
    }

    const fragment = parsed.hash.slice(1);
    if (!fragment) return false;
    for (const pair of fragment.split('&')) {
      let key;
      try {
        key = decodeURIComponent(pair.split('=', 1)[0] ?? '');
      } catch {
        return true;
      }
      if (SIGNED_PARAMETER_PATTERN.test(key)) return true;
    }
    return false;
  });
}

export function inspectPrivacyText(value) {
  if (typeof value !== 'string') return [];
  const rules = [];
  if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))) rules.push('credential-like-value');
  if (containsPhoneLikeValue(value)) rules.push('phone-like-value');
  if (hasSignedOrExpiringUrl(value)) rules.push('signed-or-expiring-url');
  return rules;
}

export function inspectStructuredPrivacy(value, path = 'content') {
  const violations = [];

  function visit(current, currentPath) {
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${currentPath}[${index}]`));
      return;
    }

    if (current && typeof current === 'object') {
      for (const [key, child] of Object.entries(current)) {
        const childPath = `${currentPath}.${key}`;
        if (isForbiddenPrivateField(key)) {
          violations.push({ rule: 'forbidden-private-field', path: childPath });
        }
        visit(child, childPath);
      }
      return;
    }

    if (typeof current === 'string') {
      for (const rule of inspectPrivacyText(current)) violations.push({ rule, path: currentPath });
    }
  }

  visit(value, path);
  return violations;
}

export function inspectArtifactText(value) {
  const rules = new Set(inspectPrivacyText(value));
  if (PRIVATE_FIELD_MARKER_PATTERN.test(value)) rules.add('private-field-marker');
  if (SERVICE_IDENTIFIER_PATTERN.test(value)) rules.add('service-identifier');
  if (/sourceMappingURL/i.test(value)) rules.add('source-map-reference');
  if (RECOVERY_PATH_PATTERN.test(value)) rules.add('recovery-private-path');
  return [...rules].sort();
}
