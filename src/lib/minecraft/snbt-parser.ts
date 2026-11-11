import {
  NbtByte,
  NbtByteArray,
  NbtCompound,
  NbtDouble,
  NbtFloat,
  NbtInt,
  NbtIntArray,
  NbtList,
  NbtLong,
  NbtLongArray,
  NbtShort,
  NbtString,
  NbtTag,
  NbtType,
} from 'deepslate/nbt';
import { StringReader } from 'deepslate/util';

/**
 * SNBT parser adapted from deepslate's `NbtParser` (MIT License).
 * https://github.com/misode/deepslate
 *
 * The only behavioural change is that lists may contain values of different
 * tag types, which Minecraft 1.21.5+ allows. `NbtList` already stores mixed
 * items when constructed directly; only the parser used to reject them.
 *
 * Note that such a list cannot be written back to binary NBT, and `getType()`
 * reports the first element's type. We only use the AST for display, so that
 * is fine.
 */

const DOUBLE_PATTERN_NOSUFFIX = /^[-+]?(?:[0-9]+[.]|[0-9]*[.][0-9]+)(?:e[-+]?[0-9]+)?$/i;
const DOUBLE_PATTERN = /^[-+]?(?:[0-9]+[.]?|[0-9]*[.][0-9]+)(?:e[-+]?[0-9]+)?d$/i;
const FLOAT_PATTERN = /^[-+]?(?:[0-9]+[.]?|[0-9]*[.][0-9]+)(?:e[-+]?[0-9]+)?f$/i;
const BYTE_PATTERN = /^[-+]?(?:0|[1-9][0-9]*)b$/i;
const LONG_PATTERN = /^[-+]?(?:0|[1-9][0-9]*)l$/i;
const SHORT_PATTERN = /^[-+]?(?:0|[1-9][0-9]*)s$/i;
const INT_PATTERN = /^[-+]?(?:0|[1-9][0-9]*)$/i;

export function readTag(reader: StringReader): NbtTag {
  reader.skipWhitespace();
  if (!reader.canRead()) {
    throw reader.createError('Expected value');
  }

  const c = reader.peek();
  if (c === '{') {
    return readCompound(reader);
  }
  if (c === '[') {
    if (reader.canRead(3) && !StringReader.isQuotedStringStart(reader.peek(1)) && reader.peek(2) === ';') {
      reader.expect('[', true);
      const start = reader.cursor;
      const d = reader.read();
      reader.skip();
      reader.skipWhitespace();
      if (!reader.canRead()) {
        throw reader.createError('Expected value');
      }
      if (d === 'B') {
        return readArray(reader, NbtType.ByteArray, NbtType.Byte, (data) => new NbtByteArray(data as number[]));
      }
      if (d === 'L') {
        return readArray(
          reader,
          NbtType.LongArray,
          NbtType.Long,
          (data) => new NbtLongArray(data as Array<[number, number]>),
        );
      }
      if (d === 'I') {
        return readArray(reader, NbtType.IntArray, NbtType.Int, (data) => new NbtIntArray(data as number[]));
      }
      reader.cursor = start;
      throw reader.createError(`Invalid array type '${d}'`);
    }
    return readList(reader);
  }

  reader.skipWhitespace();
  const start = reader.cursor;
  if (StringReader.isQuotedStringStart(reader.peek())) {
    return new NbtString(reader.readQuotedString());
  }

  const value = reader.readUnquotedString();
  if (value.length === 0) {
    reader.cursor = start;
    throw reader.createError('Expected value');
  }

  try {
    if (FLOAT_PATTERN.test(value)) {
      return new NbtFloat(Number(value.substring(0, value.length - 1)));
    }
    if (BYTE_PATTERN.test(value)) {
      return new NbtByte(Math.floor(Number(value.substring(0, value.length - 1))));
    }
    if (LONG_PATTERN.test(value)) {
      return new NbtLong(BigInt(value.substring(0, value.length - 1)));
    }
    if (SHORT_PATTERN.test(value)) {
      return new NbtShort(Math.floor(Number(value.substring(0, value.length - 1))));
    }
    if (INT_PATTERN.test(value)) {
      return new NbtInt(Math.floor(Number(value)));
    }
    if (DOUBLE_PATTERN.test(value)) {
      return new NbtDouble(Number(value.substring(0, value.length - 1)));
    }
    if (DOUBLE_PATTERN_NOSUFFIX.test(value)) {
      return new NbtDouble(Number(value));
    }
    if (value.toLowerCase() === 'true') {
      return NbtByte.ONE;
    }
    if (value.toLowerCase() === 'false') {
      return NbtByte.ZERO;
    }
  } catch {
    // Fall through to a string tag, matching deepslate's behaviour.
  }

  return value.length === 0 ? NbtString.EMPTY : new NbtString(value);
}

function readCompound(reader: StringReader): NbtCompound {
  reader.expect('{', true);
  const properties = new Map<string, NbtTag>();

  reader.skipWhitespace();
  while (reader.canRead() && reader.peek() !== '}') {
    const start = reader.cursor;
    reader.skipWhitespace();
    if (!reader.canRead()) {
      throw reader.createError('Expected key');
    }

    const key = reader.readString();
    if (key.length === 0) {
      reader.cursor = start;
      throw reader.createError('Expected key');
    }

    reader.expect(':', true);
    properties.set(key, readTag(reader));

    if (!hasElementSeparator(reader)) {
      break;
    }
    if (!reader.canRead()) {
      throw reader.createError('Expected key');
    }
  }

  reader.expect('}', true);
  return new NbtCompound(properties);
}

function readList(reader: StringReader): NbtList {
  reader.expect('[', true);
  reader.skipWhitespace();
  if (!reader.canRead()) {
    throw reader.createError('Expected value');
  }

  const items: NbtTag[] = [];
  while (reader.peek() !== ']') {
    items.push(readTag(reader));
    if (!hasElementSeparator(reader)) {
      break;
    }
    if (!reader.canRead()) {
      throw reader.createError('Expected value');
    }
  }

  reader.expect(']', true);
  return new NbtList(items);
}

type ArrayEntry = number | [number, number];

function readArray(
  reader: StringReader,
  arrayId: NbtType,
  childId: NbtType,
  make: (data: ArrayEntry[]) => NbtTag,
): NbtTag {
  const data: ArrayEntry[] = [];
  while (reader.peek() !== ']') {
    const entry = readTag(reader);
    if (entry.getId() !== childId) {
      throw reader.createError(`Can't insert ${NbtType[entry.getId()]} into ${NbtType[arrayId]}`);
    }
    data.push(entry.isLong() ? entry.getAsPair() : entry.getAsNumber());

    if (!hasElementSeparator(reader)) {
      break;
    }
    if (!reader.canRead()) {
      throw reader.createError('Expected value');
    }
  }

  reader.expect(']');
  return make(data);
}

function hasElementSeparator(reader: StringReader): boolean {
  reader.skipWhitespace();
  if (reader.canRead() && reader.peek() === ',') {
    reader.skip();
    reader.skipWhitespace();
    return true;
  }
  return false;
}
