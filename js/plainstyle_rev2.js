//@ts-check

/*
MIT License

Copyright (c) 2026 Shapoco

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// todo: Unicode 12.0 の普及が進んだら対応する:
// - 小書きヰ https://ja.wikipedia.org/wiki/%E5%B0%8F%E6%9B%B8%E3%81%8D%E3%83%B0
// - 小書きヱ https://ja.wikipedia.org/wiki/%E5%B0%8F%E6%9B%B8%E3%81%8D%E3%83%B1
// - 小書きヲ https://ja.wikipedia.org/wiki/%E5%B0%8F%E6%9B%B8%E3%81%8D%E3%83%B2
// - 小書きン https://ja.wikipedia.org/wiki/%E5%B0%8F%E6%9B%B8%E3%81%8D%E3%83%B3

// APIバージョンを変えるときは:
// - 新しい方はファイル名のバージョンを上げる
//   (旧htmlをキャッシュしているブラウザと競合させないため)
// - 古い方は PLAINSTYLE_LEGACY_API = true にする
//   (リロードを促すため))
const PLAINSTYLE_LEGACY_API = false;

const UTF16_SURROGATE_PAIR_HIGH_BASE  = 0xD800;
const UTF16_SURROGATE_PAIR_HIGH_END   = 0xDBFF;
const UTF16_SURROGATE_PAIR_LOW_BASE   = 0xDC00;
const UTF16_SURROGATE_PAIR_LOW_END    = 0xDFFF;

const UTF32_SURROGATE_PAIR_BASE = UTF16_SURROGATE_PAIR_HIGH_BASE;
const UTF32_SURROGATE_PAIR_END  = UTF16_SURROGATE_PAIR_LOW_END;

const UTF16_ZERO_WIDTH_NON_JOINER = 0x200C;

/** @enum {Symbol} */
const KanaType = {
  KATA: Symbol(),
  HIRA: Symbol(),
  NARROW: Symbol(),
  CIRCLED: Symbol(),
  NOT_KANA: Symbol(),
  NA: Symbol(),
};

/** @enum {Symbol} */
const DakuType = {
  PLAIN: Symbol(),
  DAKU: Symbol(),
  HANDAKU: Symbol(),
  NA: Symbol(),
};

/** @enum {Symbol} */
const KanaSize = {
  LARGE: Symbol(),
  SMALL: Symbol(),
  NA: Symbol(),
};

class KanaSet {
  constructor(hiraPlain, hiraDaku, hiraHandaku, kataPlain, kataDaku, kataHandaku, narrow, circled, isSmallKana, sizePair, dakuable) {
    /** @type {string} */
    this.hiraPlain = hiraPlain;

    /** @type {string} */
    this.hiraDaku = hiraDaku;

    /** @type {string} */
    this.hiraHandaku = hiraHandaku;

    /** @type {string} */
    this.kataPlain = kataPlain;

    /** @type {string} */
    this.kataDaku = kataDaku;
    
    /** @type {string} */
    this.kataHandaku = kataHandaku;
    
    /** @type {string} */
    this.circled = circled;

    /** @type {string} */
    this.narrow = narrow;

    /** @type {boolean} */
    this.isSmallKana = isSmallKana;
    
    /** @type {string} */
    this.sizePair = sizePair;
        
    /** @type {boolean} */
    this.dakuable = dakuable;
  }
  
  /**
   * @param {KanaType} ktype 
   * @param {DakuType} dtype 
   * @returns {string}
   */
   tryGetNativeChar(ktype = KanaType.HIRA, dtype = DakuType.PLAIN) {
    // 濁音を付けられない文字は plain に強制
    if (!this.dakuable) dtype = DakuType.PLAIN;

    if      (ktype == KanaType.HIRA    && dtype == DakuType.PLAIN   ) return this.hiraPlain;
    else if (ktype == KanaType.HIRA    && dtype == DakuType.DAKU    ) return this.hiraDaku;
    else if (ktype == KanaType.HIRA    && dtype == DakuType.HANDAKU ) return this.hiraHandaku;
    else if (ktype == KanaType.KATA    && dtype == DakuType.PLAIN   ) return this.kataPlain;
    else if (ktype == KanaType.KATA    && dtype == DakuType.DAKU    ) return this.kataDaku;
    else if (ktype == KanaType.KATA    && dtype == DakuType.HANDAKU ) return this.kataHandaku;
    else if (ktype == KanaType.NARROW  && dtype == DakuType.PLAIN   ) return this.narrow;
    else if (ktype == KanaType.CIRCLED && dtype == DakuType.PLAIN   ) return this.circled;
    return null;
  }

  /**
   * @param {KanaType} ktype 
   * @param {DakuType} dtype 
   * @returns {string}
   */
  encode(ktype = KanaType.HIRA, dtype = DakuType.PLAIN) {
    // 濁点を付けられない文字は plain に強制
    if (!this.dakuable) dtype = DakuType.PLAIN;

    // 指定した仮名の文字の定義が無い場合は他の仮名で代用
    if (ktype == KanaType.HIRA && !this.hiraPlain) {
      if      (this.kataPlain ) ktype = KanaType.KATA;
      else if (this.narrow    ) ktype = KanaType.NARROW;
      else if (this.circled   ) ktype = KanaType.CIRCLED;
      else                      return '?';
    }
    else if (ktype == KanaType.KATA && !this.kataPlain) {
      if      (this.hiraPlain ) ktype = KanaType.HIRA;
      else if (this.narrow    ) ktype = KanaType.NARROW;
      else if (this.circled   ) ktype = KanaType.CIRCLED;
      else                      return '?';
    }
    else if (ktype == KanaType.NARROW && !this.narrow) {
      if      (this.kataPlain ) ktype = KanaType.KATA;
      else if (this.hiraPlain ) ktype = KanaType.HIRA;
      else if (this.circled   ) ktype = KanaType.CIRCLED;
      else                      return '?';
    }
    else if (ktype == KanaType.CIRCLED && !this.circled) {
      if      (this.kataPlain ) ktype = KanaType.KATA;
      else if (this.hiraPlain ) ktype = KanaType.HIRA;
      else if (this.narrow    ) ktype = KanaType.NARROW;
      else                      return '?';
    }

    // 定義済みの濁点付き文字が存在する場合はそれを返す
    var c = this.tryGetNativeChar(ktype, dtype);
    if (c) return c;

    // 濁点付き文字の定義が無い場合は濁点を付加して返す
    if (ktype == KanaType.HIRA || ktype == KanaType.KATA) {
      if (dtype == DakuType.DAKU   ) return this.tryGetNativeChar(ktype) + '\u3099';
      if (dtype == DakuType.HANDAKU) return this.tryGetNativeChar(ktype) + '\u309a';
    }
    else if (ktype == KanaType.NARROW) {
      if (dtype == DakuType.DAKU   ) return this.narrow + 'ﾞ';
      if (dtype == DakuType.HANDAKU) return this.narrow + 'ﾟ';
    }
    else if (ktype == KanaType.CIRCLED) {
      if (dtype == DakuType.DAKU   ) return this.circled + 'ﾞ';
      if (dtype == DakuType.HANDAKU) return this.circled + 'ﾟ';
    }

    return '?';
  }
}

/** @enum {KanaSet[]} */
const KANA_SET_LIST = [
  new KanaSet('あ', null, null, 'ア', null, null, 'ｱ' , '㋐', false, 'ァ', true ),
  new KanaSet('い', null, null, 'イ', null, null, 'ｲ' , '㋑', false, 'ィ', true ),
  new KanaSet('う', null, null, 'ウ', 'ヴ', null, 'ｳ' , '㋒', false, 'ゥ', true ),
  new KanaSet('え', null, null, 'エ', null, null, 'ｴ' , '㋓', false, 'ェ', true ),
  new KanaSet('お', null, null, 'オ', null, null, 'ｵ' , '㋔', false, 'ォ', true ),
  new KanaSet('か', 'が', null, 'カ', 'ガ', null, 'ｶ' , '㋕', false, 'ヵ', true ),
  new KanaSet('き', 'ぎ', null, 'キ', 'ギ', null, 'ｷ' , '㋖', false, null, true ),
  new KanaSet('く', 'ぐ', null, 'ク', 'グ', null, 'ｸ' , '㋗', false, 'ㇰ', true ),
  new KanaSet('け', 'げ', null, 'ケ', 'ゲ', null, 'ｹ' , '㋘', false, 'ヶ', true ),
  new KanaSet('こ', 'ご', null, 'コ', 'ゴ', null, 'ｺ' , '㋙', false, null, true ),
  new KanaSet('さ', 'ざ', null, 'サ', 'ザ', null, 'ｻ' , '㋚', false, null, true ),
  new KanaSet('し', 'じ', null, 'シ', 'ジ', null, 'ｼ' , '㋛', false, 'ㇱ', true ),
  new KanaSet('す', 'ず', null, 'ス', 'ズ', null, 'ｽ' , '㋜', false, 'ㇲ', true ),
  new KanaSet('せ', 'ぜ', null, 'セ', 'ゼ', null, 'ｾ' , '㋝', false, null, true ),
  new KanaSet('そ', 'ぞ', null, 'ソ', 'ゾ', null, 'ｿ' , '㋞', false, null, true ),
  new KanaSet('た', 'だ', null, 'タ', 'ダ', null, 'ﾀ' , '㋟', false, null, true ),
  new KanaSet('ち', 'ぢ', null, 'チ', 'ヂ', null, 'ﾁ' , '㋠', false, null, true ),
  new KanaSet('つ', 'づ', null, 'ツ', 'ヅ', null, 'ﾂ' , '㋡', false, 'ッ', true ),
  new KanaSet('て', 'で', null, 'テ', 'デ', null, 'ﾃ' , '㋢', false, null, true ),
  new KanaSet('と', 'ど', null, 'ト', 'ド', null, 'ﾄ' , '㋣', false, 'ㇳ', true ),
  new KanaSet('な', null, null, 'ナ', null, null, 'ﾅ' , '㋤', false, null, true ),
  new KanaSet('に', null, null, 'ニ', null, null, 'ﾆ' , '㋥', false, null, true ),
  new KanaSet('ぬ', null, null, 'ヌ', null, null, 'ﾇ' , '㋦', false, null, true ),
  new KanaSet('ね', null, null, 'ネ', null, null, 'ﾈ' , '㋧', false, 'ㇴ', true ),
  new KanaSet('の', null, null, 'ノ', null, null, 'ﾉ' , '㋨', false, null, true ),
  new KanaSet('は', 'ば', 'ぱ', 'ハ', 'バ', 'パ', 'ﾊ' , '㋩', false, 'ㇵ', true ),
  new KanaSet('ひ', 'び', 'ぴ', 'ヒ', 'ビ', 'ピ', 'ﾋ' , '㋪', false, 'ㇶ', true ),
  new KanaSet('ふ', 'ぶ', 'ぷ', 'フ', 'ブ', 'プ', 'ﾌ' , '㋫', false, 'ㇷ', true ),
  new KanaSet('へ', 'べ', 'ぺ', 'ヘ', 'ベ', 'ペ', 'ﾍ' , '㋬', false, 'ㇸ', true ),
  new KanaSet('ほ', 'ぼ', 'ぽ', 'ホ', 'ボ', 'ポ', 'ﾎ' , '㋭', false, 'ㇹ', true ),
  new KanaSet('ま', null, null, 'マ', null, null, 'ﾏ' , '㋮', false, null, true ),
  new KanaSet('み', null, null, 'ミ', null, null, 'ﾐ' , '㋯', false, null, true ),
  new KanaSet('む', null, null, 'ム', null, null, 'ﾑ' , '㋰', false, 'ㇺ', true ),
  new KanaSet('め', null, null, 'メ', null, null, 'ﾒ' , '㋱', false, null, true ),
  new KanaSet('も', null, null, 'モ', null, null, 'ﾓ' , '㋲', false, null, true ),
  new KanaSet('や', null, null, 'ヤ', null, null, 'ﾔ' , '㋳', false, 'ャ', true ),
  new KanaSet('ゆ', null, null, 'ユ', null, null, 'ﾕ' , '㋴', false, 'ュ', true ),
  new KanaSet('よ', null, null, 'ヨ', null, null, 'ﾖ' , '㋵', false, 'ョ', true ),
  new KanaSet('ら', null, null, 'ラ', null, null, 'ﾗ' , '㋶', false, 'ㇻ', true ),
  new KanaSet('り', null, null, 'リ', null, null, 'ﾘ' , '㋷', false, 'ㇼ', true ),
  new KanaSet('る', null, null, 'ル', null, null, 'ﾙ' , '㋸', false, 'ㇽ', true ),
  new KanaSet('れ', null, null, 'レ', null, null, 'ﾚ' , '㋹', false, 'ㇾ', true ),
  new KanaSet('ろ', null, null, 'ロ', null, null, 'ﾛ' , '㋺', false, 'ㇿ', true ),
  new KanaSet('わ', null, null, 'ワ', 'ヷ', null, 'ﾜ' , '㋻', false, 'ヮ', true ),
  new KanaSet('ゐ', null, null, 'ヰ', null, null, null, '㋼', false, null, true ),
  new KanaSet('を', null, null, 'ヲ', 'ヺ', null, 'ｦ' , '㋾', false, null, true ),
  new KanaSet('ゑ', null, null, 'ヱ', null, null, null, '㋽', false, null, true ),
  new KanaSet('ん', null, null, 'ン', null, null, 'ﾝ' , null, false, null, true ),
  new KanaSet('ぁ', null, null, 'ァ', null, null, 'ｧ' , null, true , 'あ', false),
  new KanaSet('ぃ', null, null, 'ィ', null, null, 'ｨ' , null, true , 'い', false),
  new KanaSet('ぅ', null, null, 'ゥ', null, null, 'ｩ' , null, true , 'う', false),
  new KanaSet('ぇ', null, null, 'ェ', null, null, 'ｪ' , null, true , 'え', false),
  new KanaSet('ぉ', null, null, 'ォ', null, null, 'ｫ' , null, true , 'お', false),
  new KanaSet(null, null, null, 'ヵ', null, null, null, null, true , 'か', true ),
  new KanaSet(null, null, null, 'ㇰ', null, null, null, null, true , 'く', true ),
  new KanaSet(null, null, null, 'ヶ', null, null, null, null, true , 'け', true ),
  new KanaSet(null, null, null, 'ㇱ', null, null, null, null, true , 'し', true ),
  new KanaSet(null, null, null, 'ㇲ', null, null, null, null, true , 'す', true ),
  new KanaSet('っ', null, null, 'ッ', null, null, 'ｯ' , null, true , 'つ', false),
  new KanaSet(null, null, null, 'ㇳ', null, null, null, null, true , 'と', true ),
  new KanaSet(null, null, null, 'ㇴ', null, null, null, null, true , 'ぬ', true ),
  new KanaSet(null, null, null, 'ㇵ', null, null, null, null, true , 'は', true ),
  new KanaSet(null, null, null, 'ㇶ', null, null, null, null, true , 'ひ', true ),
  new KanaSet(null, null, null, 'ㇷ', null, null, null, null, true , 'ふ', true ),
  new KanaSet(null, null, null, 'ㇸ', null, null, null, null, true , 'へ', true ),
  new KanaSet(null, null, null, 'ㇹ', null, null, null, null, true , 'ほ', true ),
  new KanaSet(null, null, null, 'ㇺ', null, null, null, null, true , 'む', true ),
  new KanaSet('ゃ', null, null, 'ャ', null, null, 'ｬ' , null, true , 'や', false),
  new KanaSet('ゅ', null, null, 'ュ', null, null, 'ｭ' , null, true , 'ゆ', false),
  new KanaSet('ょ', null, null, 'ョ', null, null, 'ｮ' , null, true , 'よ', false),
  new KanaSet(null, null, null, 'ㇻ', null, null, null, null, true , 'ら', true ),
  new KanaSet(null, null, null, 'ㇼ', null, null, null, null, true , 'り', true ),
  new KanaSet(null, null, null, 'ㇽ', null, null, null, null, true , 'る', true ),
  new KanaSet(null, null, null, 'ㇾ', null, null, null, null, true , 'れ', true ),
  new KanaSet(null, null, null, 'ㇿ', null, null, null, null, true , 'ろ', true ),
  new KanaSet(null, null, null, 'ヮ', null, null, null, null, true , 'わ', true ),
  new KanaSet('。', null, null, '。', null, null, '｡' , null, false, null, false),
  new KanaSet('、', null, null, '、', null, null, '､' , null, false, null, false),
  new KanaSet('ー', null, null, 'ー', null, null, 'ｰ' , null, false, null, false),
  new KanaSet('「', null, null, '「', null, null, '｢' , null, false, null, false),
  new KanaSet('」', null, null, '」', null, null, '｣' , null, false, null, false),
  new KanaSet('・', null, null, '・', null, null, '･' , null, false, null, false),
];

class KanaEntry {
  constructor(kset, ktype, dtype) {
    /** @type {KanaSet} */
    this.kanaSet = kset;

    /** @type {KanaType} */
    this.kanaType = ktype;

    /** @type {DakuType} */
    this.dakuType = dtype;
  }

  /**
   * @param {KanaType} ktype 
   * @param {DakuType} dtype 
   * @returns {string}
   */
  convert(ktype = KanaType.NA, dtype = DakuType.NA) {
    if (!ktype) ktype = this.kanaType;
    if (!dtype) dtype = this.dakuType;
    return this.kanaSet.encode(ktype, dtype);
  }
}

/** @type {Object<string, KanaEntry>} dict */
const KANA_TABLE = function() {
  /** @type {Object<string, KanaEntry>} dict */
  var dict = {};
  for (var i = 0; i < KANA_SET_LIST.length; i++) {
    var kset = KANA_SET_LIST[i];
    if (kset.hiraPlain  ) dict[kset.hiraPlain  ] = new KanaEntry(kset, KanaType.HIRA    , DakuType.PLAIN  );
    if (kset.hiraDaku   ) dict[kset.hiraDaku   ] = new KanaEntry(kset, KanaType.HIRA    , DakuType.DAKU   );
    if (kset.hiraHandaku) dict[kset.hiraHandaku] = new KanaEntry(kset, KanaType.HIRA    , DakuType.HANDAKU);
    if (kset.kataPlain  ) dict[kset.kataPlain  ] = new KanaEntry(kset, KanaType.KATA    , DakuType.PLAIN  );
    if (kset.kataDaku   ) dict[kset.kataDaku   ] = new KanaEntry(kset, KanaType.KATA    , DakuType.DAKU   );
    if (kset.kataHandaku) dict[kset.kataHandaku] = new KanaEntry(kset, KanaType.KATA    , DakuType.HANDAKU);
    if (kset.narrow     ) dict[kset.narrow     ] = new KanaEntry(kset, KanaType.NARROW  , DakuType.PLAIN  );
    if (kset.circled    ) dict[kset.circled    ] = new KanaEntry(kset, KanaType.CIRCLED , DakuType.PLAIN  );
  }
  return dict;
}();

/** @type {Style[]} */
var fontList = [];

class Style {
  /**
   * @param {string} name 
   * @param {boolean} zwnjRequired
   */
  constructor(name, zwnjRequired = false) {
    /** @type {string} */
    this.name = name;
    
    /** @type {string} */
    this.buttonLabel = '';

    /** @type {boolean} */
    this.zwnjRequired = zwnjRequired;

    /** @type {Object.<number, number>} */
    this.encodeTable = {};

    /** @type {Object.<number, number>} */
    this.decodeTable = {};
    
    /** @type {Object<string, number>} */
    this.combinations = {};
  }

  /**
   * @param {string} normalPattern
   * @param {number|string} styledChar
   * @return Style
   */
  map(normalPattern, styledChar) {
    var normalCodeBase = normalPattern.charCodeAt(0);
    var length = 1;
    if (normalPattern.length >= 2) {
      length = normalPattern.charCodeAt(1) + 1 - normalCodeBase;
    }

    /** @type {number} */
    var styledCodeBase;
    if (typeof(styledChar) == 'number') {
      styledCodeBase = styledChar;
    }
    else {
      styledCodeBase = Number.parseInt(styledChar);
    }

    for (var i = 0; i < length; i++) {
      this.encodeTable[normalCodeBase + i] = styledCodeBase + i;
      this.decodeTable[styledCodeBase + i] = normalCodeBase + i;
    }
    return this;
  }

  /**
   * @param {string} comb
   * @param {number|string} styledChar
   * @return Style
   */
  combination(comb, styledChar) {
    /** @type {number} */
    var styledCode;
    if (typeof(styledChar) == 'number') {
      styledCode = styledChar;
    }
    else {
      styledCode = Number.parseInt(styledChar);
    }

    this.combinations[comb] = styledCode;

    return this;
  }

  /**
   * @param {string} str 
   * @returns {Style}
   */
  setLabel(str = null) {
    if (!str) {
      str = '';
      if (this.encodeTable['A'.charCodeAt(0)]) str += 'AB';
      if (this.encodeTable['a'.charCodeAt(0)]) str += 'ab';
      if (this.encodeTable['αβ'.charCodeAt(0)]) str += 'αβ';
      if (this.encodeTable['1'.charCodeAt(0)]) str += '12';
      if (this.encodeTable['あ'.charCodeAt(0)]) str += 'あ';
      if (this.encodeTable['ア'.charCodeAt(0)]) str += 'ア';
      if (this.encodeTable['一'.charCodeAt(0)]) str += '一';
    }
    this.buttonLabel = new StyledString(str, this).toString();
    return this;
  }

  /**
   * @param {number} normalCode 
   * @returns {number}
   */
  encode(normalCode) {
    var styledCode = this.encodeTable[normalCode];
    if (styledCode) {
      return styledCode;
    }
    else {
      return normalCode;
    }
  }
}

class StyledChar {
  /**
   * @param {number} normalCode 
   * @param {Style} style 
   */
  constructor(normalCode, style = null) {
    /** @type {number} */
    this.normalCode = normalCode;

    /** @type {Style} */
    this.style = style;
  }

  /** @returns {StyledChar} */
  clone() { return new StyledChar(this.normalCode, this.style); }

  /** @returns {string} */
  normalChar() { return String.fromCharCode(this.normalCode); }

  isUpperCase() { return (0x41 <= this.normalCode && this.normalCode <= 0x5a); }
  isLowerCase() { return (0x61 <= this.normalCode && this.normalCode <= 0x7a); }
  isAlplabet() { return this.isUpperCase() || this.isLowerCase(); }

  toLowerCase() {
    if (this.isUpperCase()) this.normalCode += 0x20;
    return this;
  }
  
  toUpperCase() {
    if (this.isLowerCase()) this.normalCode -= 0x20;
    return this;
  }

  /**
   * @returns {number}
   */
  encode() {
    if (this.style) {
      return this.style.encode(this.normalCode);
    }
    else {
      return this.normalCode;
    }
  }

  /**
   * @returns {string}
   */
  toString() {
    var str = '{code:0x' + this.normalCode.toString(16);
    if (this.style == null) { str += ', ' + this.style; }
    str += '}';
    return str;
  }
  
}

// 書体付き文字列
class StyledString {
  /**
   * @param {string} styledStr
   * @param {Style}  style
   */
  constructor(styledStr, style = null) {
    var utf32Array = convertStringToUtf32CodeArray(styledStr);
    var buff = [];
    for (var i = 0; i < utf32Array.length; i++) {
      if (utf32Array[i] == UTF16_ZERO_WIDTH_NON_JOINER) continue;
      var styledChar = decodeStyledChar(utf32Array[i]);
      buff.push(styledChar);
    }

    /** @type {StyledChar[]} */
    this.chars = buff;

    if (style) this.setStyle(style);
  }

  /**
   * @returns {StyledString}
   */
  clone() { return new StyledString(this.toString()); }

  /**
   * @param {Style} style 
   * @param {boolean} ignore_case 
   */
  setStyle(style, ignore_case = false) {
    for (var i = 0; i < this.chars.length; i++) {
      var c = this.chars[i];
      if (style == null) {
        c.style = null;
      }
      else if (style.encodeTable[c.normalCode]) {
        c.style = style;
      }
      else if (ignore_case) {
        var toggledChar = toggleCase(c.normalCode);
        if (style.encodeTable[toggledChar]) {
          c.normalCode = toggledChar;
          c.style = style;
        }
      }
    }
  }

  toLowerCase() {
    for (var i = 0; i < this.chars.length; i++) {
      var c = this.chars[i];
      if (c.isAlplabet()) c.toLowerCase();
    }
  }

  toUpperCase() {
    for (var i = 0; i < this.chars.length; i++) {
      var c = this.chars[i];
      if (c.isAlplabet()) c.toUpperCase();
    }
  }

  toCamelCase() {
    var lastIsAlpha = false;
    for (var i = 0; i < this.chars.length; i++) {
      var c = this.chars[i];
      var cIsAlpha = c.isAlplabet();
      if (cIsAlpha) {
        if (lastIsAlpha) {
          c.toLowerCase();
        }
        else {
          c.toUpperCase();
        }
      }
      lastIsAlpha = cIsAlpha;
    }
  }

  /**
   * @param {string} key 
   * @param {number} start 
   * @returns {number}
   */
  indexOf(key, start = 0) {
    var rawStr = this.clone();
    rawStr.setStyle(null);
    return this.clone().toString().indexOf(key, start);
  }

  /**
   * @param {string} a 
   * @param {string} b 
   * @param {Style} newStyle
   */
  replace(a, b, newStyle = null) {
    var i = 0;
    var last_i = 0;
    while (i < this.chars.length) {
      var apos = this.indexOf(a, i);
      if (apos < i) return;
      if (!newStyle) newStyle = this.chars[apos].style;

      var before = this.chars.slice(0, apos);
      var after = this.chars.slice(apos + a.length);
      for (var j = 0; j < b.length; j++) {
        before.push(new StyledChar(b.charCodeAt(j), newStyle));
      }
      this.chars = before.concat(after);
      i = apos + b.length;
    }
  }

  toHiragana() { this.convertKana(KanaType.HIRA); }
  toKatakana() { this.convertKana(KanaType.KATA); }
  toNarrowKatakana() { this.convertKana(KanaType.NARROW); }
  toCircledKatakana() { this.convertKana(KanaType.CIRCLED); }
  toNoDakuon() { this.convertKana(KanaType.NA, DakuType.PLAIN); }
  toDakuon() { this.convertKana(KanaType.NA, DakuType.DAKU); }
  toHandakuon() { this.convertKana(KanaType.NA, DakuType.HANDAKU); }
  toLargeKana() { this.convertKana(KanaType.NA, DakuType.NA, KanaSize.LARGE); }
  toSmallKana() { this.convertKana(KanaType.NA, DakuType.NA, KanaSize.SMALL); }

  /**
   * @param {KanaType} newKanaType 
   * @param {DakuType} newDakuType 
   * @param {KanaSize} newKanaSize
   */
  convertKana(newKanaType = KanaType.NA, newDakuType = DakuType.NA, newKanaSize = KanaSize.NA) {
    /** @type {StyledChar[]} */
    var newChars = [];
    for (var i = 0; i < this.chars.length; i++) {
      var c = this.chars[i];

      if (!KANA_TABLE[c.normalChar()]) {
        // カナ文字以外はスルー
        newChars.push(c);
        continue;
      }

      // カナ文字の処理
      var kana = KANA_TABLE[c.normalChar()];
      var ktype = kana.kanaType;
      var dtype = kana.dakuType;
      
      // 後続の濁点の読み取り
      while (i + 1 < this.chars.length) {
        var cNext = this.chars[i+1].normalChar();
        if (cNext == '゛' || cNext == 'ﾞ' || cNext == '\u3099') {
          dtype = DakuType.DAKU;
        }
        else if (cNext == '゜' || cNext == 'ﾟ' || cNext == '\u309a') {
          dtype = DakuType.HANDAKU;
        }
        else {
          break;
        }
        i += 1;
      }

      // 文字種のオーバーライド
      if (newKanaType != KanaType.NA) ktype = newKanaType;
      if (newDakuType != DakuType.NA) dtype = newDakuType;

      // カナサイズ変換
      if (newKanaSize == KanaSize.LARGE) {
        // 小→大
        if (kana.kanaSet.isSmallKana && kana.kanaSet.sizePair) {
          kana = KANA_TABLE[kana.kanaSet.sizePair];
        }
      }
      else if (newKanaSize == KanaSize.SMALL) {
        // 大→小
        if (!kana.kanaSet.isSmallKana && kana.kanaSet.sizePair) {
          kana = KANA_TABLE[kana.kanaSet.sizePair];
        }
      }

      // 文字列に変換
      var newKanaStr = kana.convert(ktype, dtype);
      for (var j = 0; j < newKanaStr.length; j++) {
        // 囲み文字のフォントと干渉しないよう、元のスタイル(c.style)は無視して null にする
        newChars.push(new StyledChar(newKanaStr.charCodeAt(j), null));
      }
    }
    this.chars = newChars;
  }

  /**
   * @returns {string}
   */
  toString() {
    var buff = [];
    var lastZWNJRequired = false;
    for (var i = 0; i < this.chars.length; i++) {
      var c = this.chars[i];
      var zwnjRequired = c.style != null && c.style.zwnjRequired;

      // insert ZWNJ to avoid country flags are generated
      if (lastZWNJRequired && zwnjRequired) {
        buff.push(UTF16_ZERO_WIDTH_NON_JOINER); // ZWNJ (Zero Width Non-Joiner)
      }
      
      buff.push(c.encode());
  
      lastZWNJRequired = zwnjRequired;
    }
    return convertUtf32CodeArrayToString(buff);
  }
  
}

/**
 * @param {number} c 
 * @returns {number}
 */
function toggleCase(c) {
  if (0x41 <= c && c <= 0x5a) {
    return c + 0x20;
  }
  else if (0x61 <= c && c <= 0x7a) {
    return c - 0x20;
  }
  else {
    return c;
  }
}

/**
 * @param {number} styledCode 
 * @returns {StyledChar}
 */
function decodeStyledChar(styledCode) {
  for (var i = 0; i < fontList.length; i++) {
    var style = fontList[i];
    var normalCode = style.decodeTable[styledCode];
    if (normalCode) {
      return new StyledChar(normalCode, style);
    }
  }
  return new StyledChar(styledCode, null);
}

/**
 * String を UTF32文字コードの配列にする
 * @param {string} codeStr 
 * @returns {number[]}
 */
function convertStringToUtf32CodeArray(codeStr) {
  var srcLen = codeStr.length;
  var index = 0;
  var buff=[];
  while (index < srcLen) {
    var currCode = codeStr.charCodeAt(index);
    var nextCode = 0;
    if (index < codeStr.length-1) {
      nextCode = codeStr.charCodeAt(index+1);
    }
    
    if (UTF16_SURROGATE_PAIR_HIGH_BASE <= currCode
            && currCode <= UTF16_SURROGATE_PAIR_HIGH_END) {
      // Surrogate Pair
      var h = (currCode - UTF16_SURROGATE_PAIR_HIGH_BASE);
      var l = (nextCode - UTF16_SURROGATE_PAIR_LOW_BASE);
      buff.push(0x10000 | (h << 10) | l);
      index += 2;
    }
    else if ((currCode & 0xFC00) == 0xD800 && (nextCode & 0xFC00) == 0xDC00) {
      // Double Code
      var h = currCode & 0x3C0; // ------hh hh------ (4 bits)
      var m = currCode & 0x03F; // -------- --mmmmmm (6 bits)
      var l = nextCode & 0x03F; // ------ll llllllll (10 bits)
      
      // H = h + 1
      h = (h + 0x40) & 0x7C0;
      
      // 00000000 000HHHHH mmmmmmll llllllll
      buff.push((h << 10) | (m << 10) | l);
      index += 2;
    }
    else {
      // Single Code
      buff.push(currCode);
      index += 1;
    }
  }
  return buff;
}

/**
 * UTF32文字コードの配列を String にする
 * @param {number[]} utf32CodeArray 
 * @returns {string}
 */
function convertUtf32CodeArrayToString(utf32CodeArray) {
  var buff = '';

  for (var i = 0; i < utf32CodeArray.length; i++) {
    var utf32Code = utf32CodeArray[i];

    if (0x10000 <= utf32Code) {
      // Double Code
      var h = utf32Code & 0x1F0000; // ---HHHHH -------- -------- (5 bits)
      var m = utf32Code & 0x00FC00; // -------- mmmmmm-- -------- (6 bits)
      var l = utf32Code & 0x0003FF; // -------- ------ll llllllll (10 bits)

      // h = H - 1
      h = (h - 0x10000) & 0x0F0000;

      var c0 = 0xD800 | (h >> 10) | (m >> 10); // 110110hh hhmmmmmm
      var c1 = 0xDC00 | l;                     // 110111ll llllllll

      buff += String.fromCharCode(c0, c1);
    }
    else if (UTF32_SURROGATE_PAIR_BASE <= utf32Code
          && utf32Code <= UTF32_SURROGATE_PAIR_END) {
      // Surrogate Pair
      buff += '?';
    }
    else {
      // Single Code
      buff += String.fromCharCode(utf32Code);
    }
    
  }

  return buff;
}

fontList.push(new Style("Bold")
  .map('AZ', 0x1d400)
  .map('az', 0x1d400 + 26)
  .map('09', 0x1d7ce)
  .map('Α', 0x1D6A8)
  .map('Β', 0x1D6A9)
  .map('Γ', 0x1D6AA)
  .map('Δ', 0x1D6AB)
  .map('Ε', 0x1D6AC)
  .map('Ζ', 0x1D6AD)
  .map('Η', 0x1D6AE)
  .map('Θ', 0x1D6AF)
  .map('Ι', 0x1D6B0)
  .map('Κ', 0x1D6B1)
  .map('Λ', 0x1D6B2)
  .map('Μ', 0x1D6B3)
  .map('Ν', 0x1D6B4)
  .map('Ξ', 0x1D6B5)
  .map('Ο', 0x1D6B6)
  .map('Π', 0x1D6B7)
  .map('Ρ', 0x1D6B8)
  .map('Σ', 0x1D6BA)
  .map('Τ', 0x1D6BB)
  .map('Υ', 0x1D6BC)
  .map('Φ', 0x1D6BD)
  .map('Χ', 0x1D6BE)
  .map('Ψ', 0x1D6BF)
  .map('Ω', 0x1D6C0)
  .map('α', 0x1D6C2)
  .map('β', 0x1D6C3)
  .map('γ', 0x1D6C4)
  .map('δ', 0x1D6C5)
  .map('ε', 0x1D6C6)
  .map('ζ', 0x1D6C7)
  .map('η', 0x1D6C8)
  .map('θ', 0x1D6C9)
  .map('ι', 0x1D6CA)
  .map('κ', 0x1D6CB)
  .map('λ', 0x1D6CC)
  .map('μ', 0x1D6CD)
  .map('ν', 0x1D6CE)
  .map('ξ', 0x1D6CF)
  .map('ο', 0x1D6D0)
  .map('π', 0x1D6D1)
  .map('ρ', 0x1D6D2)
  .map('σ', 0x1D6D4)
  .map('ς', 0x1D6D3)
  .map('τ', 0x1D6D5)
  .map('υ', 0x1D6D6)
  .map('φ', 0x1D6D7)
  .map('χ', 0x1D6D8)
  .map('ψ', 0x1D6D9)
  .map('ω', 0x1D6DA)
  .map('∇', 0x1D6C1)
  .setLabel());

fontList.push(new Style("Italic")
  .map('AZ', 0x1D434)
  .map('az', 0x1D434 + 26)
  .map("h" , 0x210E)
  .map('Α', 0x1D6E2)
  .map('Β', 0x1D6E3)
  .map('Γ', 0x1D6E4)
  .map('Δ', 0x1D6E5)
  .map('Ε', 0x1D6E6)
  .map('Ζ', 0x1D6E7)
  .map('Η', 0x1D6E8)
  .map('Θ', 0x1D6E9)
  .map('Ι', 0x1D6EA)
  .map('Κ', 0x1D6EB)
  .map('Λ', 0x1D6EC)
  .map('Μ', 0x1D6ED)
  .map('Ν', 0x1D6EE)
  .map('Ξ', 0x1D6EF)
  .map('Ο', 0x1D6F0)
  .map('Π', 0x1D6F1)
  .map('Ρ', 0x1D6F2)
  .map('Σ', 0x1D6F4)
  .map('Τ', 0x1D6F5)
  .map('Υ', 0x1D6F6)
  .map('Φ', 0x1D6F7)
  .map('Χ', 0x1D6F8)
  .map('Ψ', 0x1D6F9)
  .map('Ω', 0x1D6FA)
  .map('α', 0x1D6FC)
  .map('β', 0x1D6FD)
  .map('γ', 0x1D6FE)
  .map('δ', 0x1D6FF)
  .map('ε', 0x1D700)
  .map('ζ', 0x1D701)
  .map('η', 0x1D702)
  .map('θ', 0x1D703)
  .map('ι', 0x1D704)
  .map('κ', 0x1D705)
  .map('λ', 0x1D706)
  .map('μ', 0x1D707)
  .map('ν', 0x1D708)
  .map('ξ', 0x1D709)
  .map('ο', 0x1D70A)
  .map('π', 0x1D70B)
  .map('ρ', 0x1D70C)
  .map('σ', 0x1D70E)
  .map('ς', 0x1D70D)
  .map('τ', 0x1D70F)
  .map('υ', 0x1D710)
  .map('φ', 0x1D711)
  .map('χ', 0x1D712)
  .map('ψ', 0x1D713)
  .map('ω', 0x1D714)
  .map('∇', 0x1D6FB)
  .setLabel());

fontList.push(new Style("BoldItalic")
  .map('AZ', 0x1D468)
  .map('az', 0x1D468 + 26)
  .map('Α', 0x1D71C)
  .map('Β', 0x1D71D)
  .map('Γ', 0x1D71E)
  .map('Δ', 0x1D71F)
  .map('Ε', 0x1D720)
  .map('Ζ', 0x1D721)
  .map('Η', 0x1D722)
  .map('Θ', 0x1D723)
  .map('Ι', 0x1D724)
  .map('Κ', 0x1D725)
  .map('Λ', 0x1D726)
  .map('Μ', 0x1D727)
  .map('Ν', 0x1D728)
  .map('Ξ', 0x1D729)
  .map('Ο', 0x1D72A)
  .map('Π', 0x1D72B)
  .map('Ρ', 0x1D72C)
  .map('Σ', 0x1D72E)
  .map('Τ', 0x1D72F)
  .map('Υ', 0x1D730)
  .map('Φ', 0x1D731)
  .map('Χ', 0x1D732)
  .map('Ψ', 0x1D733)
  .map('Ω', 0x1D734)
  .map('α', 0x1D736)
  .map('β', 0x1D737)
  .map('γ', 0x1D738)
  .map('δ', 0x1D739)
  .map('ε', 0x1D73A)
  .map('ζ', 0x1D73B)
  .map('η', 0x1D73C)
  .map('θ', 0x1D73D)
  .map('ι', 0x1D73E)
  .map('κ', 0x1D73F)
  .map('λ', 0x1D740)
  .map('μ', 0x1D741)
  .map('ν', 0x1D742)
  .map('ξ', 0x1D743)
  .map('ο', 0x1D744)
  .map('π', 0x1D745)
  .map('ρ', 0x1D746)
  .map('σ', 0x1D748)
  .map('ς', 0x1D747)
  .map('τ', 0x1D749)
  .map('υ', 0x1D74A)
  .map('φ', 0x1D74B)
  .map('χ', 0x1D74C)
  .map('ψ', 0x1D74D)
  .map('ω', 0x1D74E)
  .map('∇', 0x1D735)
  .setLabel());

fontList.push(new Style("SansSerif")
  .map('AZ', 0x1D5A0)
  .map('az', 0x1D5A0 + 26)
  .map('09', 0x1D7E2)
  .setLabel());

fontList.push(new Style("SansSerifBold")
  .map('AZ', 0x1D5D4)
  .map('az', 0x1D5D4 + 26)
  .map('09', 0x1D7EC)
  .map('Α', 0x1D756)
  .map('Β', 0x1D757)
  .map('Γ', 0x1D758)
  .map('Δ', 0x1D759)
  .map('Ε', 0x1D75A)
  .map('Ζ', 0x1D75B)
  .map('Η', 0x1D75C)
  .map('Θ', 0x1D75D)
  .map('Ι', 0x1D75E)
  .map('Κ', 0x1D75F)
  .map('Λ', 0x1D760)
  .map('Μ', 0x1D761)
  .map('Ν', 0x1D762)
  .map('Ξ', 0x1D763)
  .map('Ο', 0x1D764)
  .map('Π', 0x1D765)
  .map('Ρ', 0x1D766)
  .map('Σ', 0x1D768)
  .map('Τ', 0x1D769)
  .map('Υ', 0x1D76A)
  .map('Φ', 0x1D76B)
  .map('Χ', 0x1D76C)
  .map('Ψ', 0x1D76D)
  .map('Ω', 0x1D76E)
  .map('α', 0x1D770)
  .map('β', 0x1D771)
  .map('γ', 0x1D772)
  .map('δ', 0x1D773)
  .map('ε', 0x1D774)
  .map('ζ', 0x1D775)
  .map('η', 0x1D776)
  .map('θ', 0x1D777)
  .map('ι', 0x1D778)
  .map('κ', 0x1D779)
  .map('λ', 0x1D77A)
  .map('μ', 0x1D77B)
  .map('ν', 0x1D77C)
  .map('ξ', 0x1D77D)
  .map('ο', 0x1D77E)
  .map('π', 0x1D77F)
  .map('ρ', 0x1D780)
  .map('σ', 0x1D782)
  .map('ς', 0x1D781)
  .map('τ', 0x1D783)
  .map('υ', 0x1D784)
  .map('φ', 0x1D785)
  .map('χ', 0x1D786)
  .map('ψ', 0x1D787)
  .map('ω', 0x1D788)
  .map('∇', 0x1D76F)
  .setLabel());

fontList.push(new Style("SansSerifItalic")
  .map('AZ', 0x1D608)
  .map('az', 0x1D608 + 26)
  .setLabel());

fontList.push(new Style("SansSerifBoldItalic")
  .map('AZ', 0x1D63C)
  .map('az', 0x1D63C + 26)
  .map('Α', 0x1D790)
  .map('Β', 0x1D791)
  .map('Γ', 0x1D792)
  .map('Δ', 0x1D793)
  .map('Ε', 0x1D794)
  .map('Ζ', 0x1D795)
  .map('Η', 0x1D796)
  .map('Θ', 0x1D797)
  .map('Ι', 0x1D798)
  .map('Κ', 0x1D799)
  .map('Λ', 0x1D79A)
  .map('Μ', 0x1D79B)
  .map('Ν', 0x1D79C)
  .map('Ξ', 0x1D79D)
  .map('Ο', 0x1D79E)
  .map('Π', 0x1D79F)
  .map('Ρ', 0x1D7A0)
  .map('Σ', 0x1D7A2)
  .map('Τ', 0x1D7A3)
  .map('Υ', 0x1D7A4)
  .map('Φ', 0x1D7A5)
  .map('Χ', 0x1D7A6)
  .map('Ψ', 0x1D7A7)
  .map('Ω', 0x1D7A8)
  .map('α', 0x1D7AA)
  .map('β', 0x1D7AB)
  .map('γ', 0x1D7AC)
  .map('δ', 0x1D7AD)
  .map('ε', 0x1D7AE)
  .map('ζ', 0x1D7AF)
  .map('η', 0x1D7B0)
  .map('θ', 0x1D7B1)
  .map('ι', 0x1D7B2)
  .map('κ', 0x1D7B3)
  .map('λ', 0x1D7B4)
  .map('μ', 0x1D7B5)
  .map('ν', 0x1D7B6)
  .map('ξ', 0x1D7B7)
  .map('ο', 0x1D7B8)
  .map('π', 0x1D7B9)
  .map('ρ', 0x1D7BA)
  .map('σ', 0x1D7BC)
  .map('ς', 0x1D7BB)
  .map('τ', 0x1D7BD)
  .map('υ', 0x1D7BE)
  .map('φ', 0x1D7BF)
  .map('χ', 0x1D7C0)
  .map('ψ', 0x1D7C1)
  .map('ω', 0x1D7C2)
  .map('∇', 0x1D7A9)
  .setLabel());

fontList.push(new Style("Script")
  .map('AZ', 0x1D49C)
  .map('az', 0x1D49C + 26)
  .map('B', 0x212C)
  .map('E', 0x2130)
  .map('F', 0x2131)
  .map('H', 0x210B)
  .map('I', 0x2110)
  .map('L', 0x2112)
  .map('M', 0x2133)
  .map('R', 0x211B)
  .map('e', 0x212F)
  .map('g', 0x210A)
  .map('o', 0x2134)
  .setLabel());

fontList.push(new Style("BoldScript")
  .map('AZ', 0x1D4D0)
  .map('az', 0x1D4D0 + 26)
  .setLabel());

fontList.push(new Style("Monospace")
  .map('AZ', 0x1D670)
  .map('az', 0x1D670 + 26)
  .map('09', 0x1D7F6)
  .setLabel());

fontList.push(new Style("Fraktor")
  .map('AZ', 0x1D504)
  .map('az', 0x1D504 + 26)
  .map('C', 0x212D)
  .map('H', 0x210C)
  .map('I', 0x2111)
  .map('R', 0x211C)
  .map('Z', 0x2128)
  .setLabel());

fontList.push(new Style("DoubleStruck")
  .map('AZ', 0x1D538)
  .map('az', 0x1D538 + 26)
  .map('09', 0x1D7D8)
  .map('C', 0x2102)
  .map('H', 0x210D)
  .map('N', 0x2115)
  .map('P', 0x2119)
  .map('Q', 0x211A)
  .map('R', 0x211D)
  .map('Z', 0x2124)
  .map('Γ', 0x213e)
  .map('γ', 0x213d)
  .map('Π', 0x213f)
  .map('π', 0x213c)
  .map('Σ', 0x2140)
  .setLabel());

fontList.push(new Style("Wide")
  .map('!~', 0xFF01)
  .map('`' , 0x2018)
  .map('"' , 0x201D)
  .map(' ' , 0x3000)
  .setLabel());

fontList.push(new Style("Circled")
  .map('AZ', 0x24B6)
  .map('az', 0x24B6 + 26)
  .map('0' , 0x24EA)
  .map('19', 0x2460)
  .map('ア', 0x32D0)
  .map('イ', 0x32D1)
  .map('ウ', 0x32D2)
  .map('エ', 0x32D3)
  .map('オ', 0x32D4)
  .map('カ', 0x32D5)
  .map('キ', 0x32D6)
  .map('ク', 0x32D7)
  .map('ケ', 0x32D8)
  .map('コ', 0x32D9)
  .map('サ', 0x32DA)
  .map('シ', 0x32DB)
  .map('ス', 0x32DC)
  .map('セ', 0x32DD)
  .map('ソ', 0x32DE)
  .map('タ', 0x32DF)
  .map('チ', 0x32E0)
  .map('ツ', 0x32E1)
  .map('テ', 0x32E2)
  .map('ト', 0x32E3)
  .map('ナ', 0x32E4)
  .map('ニ', 0x32E5)
  .map('ヌ', 0x32E6)
  .map('ネ', 0x32E7)
  .map('ノ', 0x32E8)
  .map('ハ', 0x32E9)
  .map('ヒ', 0x32EA)
  .map('フ', 0x32EB)
  .map('ヘ', 0x32EC)
  .map('ホ', 0x32ED)
  .map('マ', 0x32EE)
  .map('ミ', 0x32EF)
  .map('ム', 0x32F0)
  .map('メ', 0x32F1)
  .map('モ', 0x32F2)
  .map('ヤ', 0x32F3)
  .map('ユ', 0x32F4)
  .map('ヨ', 0x32F5)
  .map('ラ', 0x32F6)
  .map('リ', 0x32F7)
  .map('ル', 0x32F8)
  .map('レ', 0x32F9)
  .map('ロ', 0x32FA)
  .map('ワ', 0x32FB)
  .map('ヰ', 0x32FC)
  .map('ヲ', 0x32FE)
  .map('ヱ', 0x32FD)
  .map('一', 0x3280)
  .map('二', 0x3281)
  .map('三', 0x3282)
  .map('四', 0x3283)
  .map('五', 0x3284)
  .map('六', 0x3285)
  .map('七', 0x3286)
  .map('八', 0x3287)
  .map('九', 0x3288)
  .map('十', 0x3289)
  .setLabel());

fontList.push(new Style("BlackCircled")
  .map('AZ', 0x1F150)
  .map('0' , 0x24FF)
  .map('19', 0x2776)
  .setLabel());

fontList.push(new Style("DoubleCircledDigit")
  .map('19', 0x24f5)
  .setLabel());

fontList.push(new Style("Parenthesized")
  .map('AZ', 0x1F110)
  .map('az', 0x249C)
  .map('19', 0x2474)
  .setLabel());

fontList.push(new Style("BlackSquared")
  .map('AZ', 0x1F170)
  .setLabel());

fontList.push(new Style("Squared")
  .map('AZ', 0x1F130)
  .setLabel());

fontList.push(new Style("RegionalIndicator", true)
  .map('AZ', 0x1F1E6)
  .setLabel());

fontList.push(new Style("SuperScript")
  .map('A' , 0x1D2C)
  .map('B' , 0x1D2E)
  .map('DE', 0x1D30)
  .map('GN', 0x1D33)
  .map('O' , 0x1D3C)
  .map('P' , 0x1D3E)
  .map('R' , 0x1D3F)
  .map('TU', 0x1D40)
  .map('V' , 0x2C7D)
  .map('W' , 0x1D42)
  .map('a' , 0x1D43)
  .map('b' , 0x1D47)
  .map('c' , 0x1D9C)
  .map('de', 0x1D48)
  .map('f' , 0x1DA0)
  .map('g' , 0x1D4D)
  .map('h' , 0x2B0 )
  .map('i' , 0x2071)
  .map('j' , 0x2B2 )
  .map('k' , 0x1D4F)
  .map('l' , 0x2E1 )
  .map('m' , 0x1D50)
  .map('n' , 0x207F)
  .map('o' , 0x1D52)
  .map('p' , 0x1D56)
  .map('r' , 0x2B3 )
  .map('s' , 0x2E2 )
  .map('tu', 0x1D57)
  .map('v' , 0x1D5B)
  .map('w' , 0x2B7 )
  .map('x' , 0x2E3 )
  .map('y' , 0x2B8 )
  .map('z' , 0x1DBB)
  .map('0' , 0x2070)
  .map('1' , 0xB9  )
  .map('23', 0xB2  )
  .map('49', 0x2074)
  .map('+' , 0x207A)
  .map('-' , 0x207B)
  .map('=' , 0x207C)
  .map('()', 0x207D)
  .map('α' , 0x1D45)
  .map('Æ' , 0x1D2D)
  .map('æ' , 0x1D46)
  .map('β' , 0x1D5D)
  .map('γδ', 0x1D5E)
  .map('ε' , 0x1D4B)
  .map('Φ' , 0x1DB2)
  .map('φ' , 0x1D60)
  .map('∫' , 0x1DB4)
  .map('θ' , 0x1DBF)
  .setLabel('\u2b1aabc'));

fontList.push(new Style("SubScript")
  .map('a' , 0x2090)
  .map('e' , 0x2091)
  .map('h' , 0x2095)
  .map('i' , 0x1D62)
  .map('j' , 0x2C7C)
  .map('kn', 0x2096)
  .map('o' , 0x2092)
  .map('p' , 0x209A)
  .map('r' , 0x1D63)
  .map('st', 0x209B)
  .map('uv', 0x1D64)
  .map('x' , 0x2093)
  .map('09', 0x2080)
  .map('+' , 0x208A)
  .map('-' , 0x208B)
  .map('=' , 0x208C)
  .map('()', 0x208D)
  .map('βγ', 0x1D66)
  .map('ρ' , 0x1D68)
  .map('φϖ', 0x1D69)
  .setLabel('\u2b1a123'));
