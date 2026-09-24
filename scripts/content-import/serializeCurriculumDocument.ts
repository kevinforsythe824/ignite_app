/**
 * Pure curriculum document shape for a later Firestore writer.
 * No Firebase imports. Undefined is omitted. Unexpected null is rejected.
 */

export class CurriculumSerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurriculumSerializationError';
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function rejectNonPlain(value: object): void {
  if (value instanceof Date) {
    throw new CurriculumSerializationError(
      'Date values are not persisted. Authored dates must already be strings.',
    );
  }
  if (typeof (value as { toDate?: unknown }).toDate === 'function' || '_seconds' in value) {
    throw new CurriculumSerializationError('Timestamp-like values are not persisted.');
  }
  const methodName = (value as { _methodName?: unknown })._methodName;
  if (typeof methodName === 'string' || value.constructor?.name === 'FieldValue') {
    throw new CurriculumSerializationError('Field sentinel values are not persisted.');
  }
}

function serializeValue(value: unknown, path: string): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    throw new CurriculumSerializationError(`Unexpected null at ${path}.`);
  }

  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'boolean') {
    return value;
  }
  if (valueType === 'number') {
    if (!Number.isFinite(value)) {
      throw new CurriculumSerializationError(`Non-finite number at ${path}.`);
    }
    return value;
  }
  if (valueType === 'bigint' || valueType === 'symbol' || valueType === 'function') {
    throw new CurriculumSerializationError(`Unsupported ${valueType} at ${path}.`);
  }
  if (valueType !== 'object') {
    throw new CurriculumSerializationError(`Unsupported value at ${path}.`);
  }

  const objectValue = value as object;
  rejectNonPlain(objectValue);

  if (Array.isArray(objectValue)) {
    return objectValue.map((item, index) => {
      if (item === undefined) {
        throw new CurriculumSerializationError(`Unexpected empty array element at ${path}[${index}].`);
      }
      const serialized = serializeValue(item, `${path}[${index}]`);
      if (serialized === undefined) {
        throw new CurriculumSerializationError(`Unexpected empty array element at ${path}[${index}].`);
      }
      return serialized;
    });
  }

  if (!isPlainRecord(objectValue)) {
    throw new CurriculumSerializationError(`Non-plain object at ${path}.`);
  }

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(objectValue)) {
    if (entry === undefined) {
      continue;
    }
    output[key] = serializeValue(entry, `${path}.${key}`);
  }
  return output;
}

/** Returns a plain JSON-compatible document. Absent optional fields stay absent. */
export function serializeCurriculumDocument(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const serialized = serializeValue(data, 'document');
  if (!isPlainRecord(serialized)) {
    throw new CurriculumSerializationError('Curriculum document must be a plain object.');
  }
  return serialized;
}
