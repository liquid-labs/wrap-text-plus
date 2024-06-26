/* global describe expect test */
import { wrap } from '../wrap'

describe('wrap', () => {
  describe('options processing', () => {
    test.each([
      [true, true, false],
      [true, false, true],
      [false, true, true]
    ])('throws error if multiple indent modes active', (hangingIndent, indent, smartIndent) => {
      expect(() => wrap('hi', { hangingIndent, indent, smartIndent })).toThrow(/Multiple indent/)
    })
  })

  test('width=-1 -> no wrap', () => {
    const text = 'abcd1234'.repeat(20)
    expect(wrap(text, { width : -1 })).toBe(text)
  })

  describe('basic wrapping', () => {
    test.each([
      ['123 56 89', 5, '123\n56 89'],
      ['123 56 89', 6, '123 56\n89'],
      ['123 56 89', 7, '123 56\n89'],
      ['123 56 89', 9, '123 56 89'],
      ['123-56 89', 5, '123-\n56 89'],
      ['123-56 89', 6, '123-56\n89'],
      ['123-56 89', 7, '123-56\n89'],
      ['123-56 89', 9, '123-56 89'],
      ['\u001b[1mhi there my friend\u0000', 10, '\u001b[1mhi there\nmy friend\u0000']
    ])("Wrapping '%s' width: %i yields '%s'", (input, width, result) => {
      expect(wrap(input, { width })).toEqual(result)
    })

    test('respects console width', () => {
      try {
        const input = '123-56 89'
        const expectedOut = '123-\n56 89'
        process.stdout.columns = 5
        expect(wrap(input, { width : 20 })).toBe(expectedOut)
      }
      finally {
        process.stdout.columns = undefined
      }
    })

    test.each([
      [' 123 56 89', 5, ' 123\n56 89'],
      ['  123 56 89', 5, '  123\n56 89'],
      ['   123 56 89', 5, '   12\n3 56\n89']
    ])("Respect initial indent; '%s' width: %i yields '%s'", (input, width, result) => {
      expect(wrap(input, { width })).toEqual(result)
    })
  })

  describe('ignore tags wrap', () => {
    test.each([
      ['1<foo>23 56 89', 5, 0, '1<foo>23\n56 89'],
      ['123 <foo>56 89', 5, 0, '123\n<foo>56 89'],
      ['123 <foo>56 89', 4, 0, '123\n<foo>56\n89'],
      ['123 <foo>56 89', 4, 1, ' 123\n <foo>56\n 89']
    ])("Wrapping '%s' width: %i, ind: %i yields '%s'", (input, width, indent, result) => {
      expect(wrap(input, { indent, ignoreTags : true, width })).toEqual(result)
    })
  })

  describe('wraps tag chars correctly when no tag actually present', () => {
    test.each([
      ['1<foo23 56 89', 5, 0, '1<foo\n23 56\n89'],
      ['1 < foo23 56 > 89', 5, 0, '1 <\nfoo23\n56 >\n89']
    ])("Wrapping '%s' width: %i, ind: %i yields '%s'", (input, width, indent, result) => {
      expect(wrap(input, { indent, ignoreTags : true, width })).toEqual(result)
    })
  })

  describe('constant indents', () => {
    test.each([
      ['123 56 89', 5, 1, ' 123\n 56\n 89'],
      ['123-56 89', 5, 1, ' 123-\n 56\n 89'],
      ['123-56 89', 5, 2, '  123\n  -56\n  89']
      // ['123-56 89', 5, 2, '  123-\n  56\n  89']
    ])("Wrapping '%s' width: %i, ind: %i yields '%s'", (input, width, indent, result) => {
      expect(wrap(input, { indent, width })).toEqual(result)
    })
  })

  describe('hangin indents', () => {
    test.each([
      ['123 56 89', 6, 1, '123 56\n 89'],
      ['123-56 89', 5, 1, '123-\n 56\n 89'],
      ['123-56 89', 5, 2, '123-\n  56\n  89']
      // ['123-56 89', 5, 2, '  123-\n  56\n  89']
    ])("Wrapping '%s' width: %i, hanging ind: %i yields '%s'", (input, width, hangingIndent, result) => {
      expect(wrap(input, { hangingIndent, width })).toEqual(result)
    })
  })

  describe('smart indenting', () => {
    test.each([
      // smart indent active, but nothing to smart indent
      ['123 56 89', 5, '123\n56 89'],
      ['123 <foo>56 89', 5, '123\n<foo>56 89'],
      ['- 1\n- <foo>23 56 89', 5, '- 1\n- <foo>23\n  56\n  89'],
      ['* 1\n* <foo>23 56 89', 5, '* 1\n* <foo>23\n  56\n  89'],
      ['123\n- <foo>56 89', 4, '123\n- <foo>56\n  89'],
      ['123\n* <foo>56 89', 4, '123\n* <foo>56\n  89'],
      ['123\n- <foo>abcd efg\n  - a longer line', 8, '123\n- <foo>abcd\n  efg\n  - a\n    long\n    er\n    line']
    ])("Wrapping '%s' width: %i, ind: %i yields '%s'", (input, width, result) => {
      expect(wrap(input, { ignoreTags : true, smartIndent : true, width })).toEqual(result)
    })
  })

  describe('prefixing (with smart indenting)', () => {
    test.each([
      ['123 56 89', 5, '# ', '# 123\n# 56 89'],
      ['123 <foo>56 89', 5, '// ', '// 123\n// <foo>56 89'],
      ['- 1\n- <foo>23 56 89', 5, '# ', '# - 1\n# - <foo>23\n#   56\n#   89'],
      ['* 1\n* <foo>23 56 89', 5, '# ', '# * 1\n# * <foo>23\n#   56\n#   89']
    ])("Wrapping '%s' width: %i, ind: %i, prefix: %s yields: '%s'", (input, width, prefix, result) =>
      expect(wrap(input, { ignoreTags : true, prefix, smartIndent : true, width })).toEqual(result))
  })

  describe('allows long lines', () => {
    test.each([
      ['1234567890', 5, '1234567890'],
      ['123 56789012', 5, '123\n56789012'],
      ['123 56789012 456', 5, '123\n56789012\n456'],
      ['  345 78901234 678', 5, '  345\n78901234\n678'],
      ['  3456 89012345 678', 5, '  3456\n89012345\n678']
    ])("Wrapping %s width %i with 'allowOverflow' yields '%s'", (input, width, expected) => {
      expect(wrap(input, { allowOverflow : true, width })).toBe(expected)
    })
  })

  test('respects paragraph breaks', () => {
    expect(wrap('1234\n\n5678', { width : 5 })).toBe('1234\n\n5678')
  })

  test('break spaces only', () => {
    expect(wrap('123-567 90123', { breakSpacesOnly : true, width : 5 })).toBe('123-5\n67\n90123')
  })

  test("'breakCharactersOnly' can break on any character", () => {
    expect(wrap('1234a678', { breakCharacters : ['a'], width : 5 })).toBe('1234a\n678')
  })
})
