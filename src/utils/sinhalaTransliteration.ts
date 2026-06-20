/**
 * Simple Phonetic Transliterator for Singlish to Sinhala script.
 * Standard mapping of phonetic characters to Sinhala Unicode.
 */

interface PhoneticRule {
  key: string;
  replacement: string;
}

// Order matters: long vowels & multi-char sequences must come first to avoid partial matches.
const vowelRules: PhoneticRule[] = [
  { key: 'aee', replacement: 'ඈ' },
  { key: 'ae', replacement: 'ඇ' },
  { key: 'aa', replacement: 'ආ' },
  { key: 'ii', replacement: 'ඊ' },
  { key: 'uu', replacement: 'ඌ' },
  { key: 'ee', replacement: 'ඒ' },
  { key: 'oo', replacement: 'ඕ' },
  { key: 'au', replacement: 'ඖ' },
  { key: 'ai', replacement: 'ඓ' },
  { key: 'a', replacement: 'අ' },
  { key: 'i', replacement: 'ඉ' },
  { key: 'u', replacement: 'උ' },
  { key: 'e', replacement: 'එ' },
  { key: 'o', replacement: 'ඔ' },
];

const consonantRules: { [key: string]: string } = {
  'ksh': 'ක්ෂ',
  'sh': 'ෂ',
  'ch': 'ච',
  'th': 'ථ',
  'dh': 'ධ',
  'kh': 'ඛ',
  'gh': 'ඝ',
  'ph': 'ඵ',
  'bh': 'භ',
  'thh': 'ත', // support varying phonetics
  'dhh': 'ද',
  'k': 'ක',
  'g': 'ග',
  'j': 'ජ',
  't': 'ට',
  'd': 'ඩ',
  'n': 'න',
  'p': 'ප',
  'b': 'බ',
  'm': 'ම',
  'y': 'ය',
  'r': 'ර',
  'l': 'ල',
  'v': 'ව',
  'w': 'ව',
  's': 'ස',
  'h': 'හ',
  'f': 'ෆ',
  'c': 'ක', // alternate
};

// Vowel modifiers triggered when a vowel follows a consonant
const vowelModifiers: { [key: string]: string } = {
  'aee': 'ෑ',
  'ae': 'ැ',
  'aa': 'ා',
  'ii': 'ී',
  'i': 'ි',
  'uu': 'ූ',
  'u': 'ු',
  'ee': 'ේ',
  'e': 'ෙ',
  'oo': 'ෝ',
  'o': 'ො',
};

/**
 * Transliterates English typed phonetic Singlish word/text into Sinhala Unicode.
 * Works syllable/word by word or for full sentences.
 */
export function transliterateSinglishToSinhala(text: string): string {
  if (!text) return '';

  const words = text.split(/\s+/);
  const resultWords = words.map(word => {
    if (!word) return '';
    
    // If word contains non-alphabetical characters or is already Sinhala, skip of parse
    if (!/^[a-zA-Z]+$/.test(word)) {
      return word;
    }

    let parsedWord = '';
    let i = 0;
    const len = word.length;

    while (i < len) {
      // Lookahead to match consonants or consonant clusters
      let matchedConsolant = '';
      let consolantLen = 0;

      // Check long combinations first
      const slice3 = word.toLowerCase().slice(i, i + 3);
      const slice2 = word.toLowerCase().slice(i, i + 2);
      const slice1 = word.toLowerCase().slice(i, i + 1);

      if (consonantRules[slice3]) {
        matchedConsolant = consonantRules[slice3];
        consolantLen = 3;
      } else if (consonantRules[slice2]) {
        matchedConsolant = consonantRules[slice2];
        consolantLen = 2;
      } else if (consonantRules[slice1]) {
        matchedConsolant = consonantRules[slice1];
        consolantLen = 1;
      }

      if (matchedConsolant) {
        i += consolantLen;
        
        // Now check if a vowel follows immediately
        let matchedVowelMod = '';
        let vowelLen = 0;

        const vSlice3 = word.toLowerCase().slice(i, i + 3);
        const vSlice2 = word.toLowerCase().slice(i, i + 2);
        const vSlice1 = word.toLowerCase().slice(i, i + 1);

        if (vSlice3 && vowelModifiers[vSlice3]) {
          matchedVowelMod = vowelModifiers[vSlice3];
          vowelLen = 3;
        } else if (vSlice2 && vowelModifiers[vSlice2]) {
          matchedVowelMod = vowelModifiers[vSlice2];
          vowelLen = 2;
        } else if (vSlice1 && vowelModifiers[vSlice1]) {
          matchedVowelMod = vowelModifiers[vSlice1];
          vowelLen = 1;
        }

        if (matchedVowelMod) {
          parsedWord += matchedConsolant + matchedVowelMod;
          i += vowelLen;
        } else {
          // If no vowel follow, add "hal" modifier (al-lakuna ්) unless it's followed by "y" or "r" (could be combis)
          // To keep it simple and accurate, we apply al-lakuna (්) at terminal or next consonant.
          parsedWord += matchedConsolant + '්';
        }
      } else {
        // If it starts with vowel
        let matchedVowel = '';
        let vowelLen = 0;

        const vSlice3 = word.toLowerCase().slice(i, i + 3);
        const vSlice2 = word.toLowerCase().slice(i, i + 2);
        const vSlice1 = word.toLowerCase().slice(i, i + 1);

        const foundv3 = vowelRules.find(r => r.key === vSlice3);
        const foundv2 = vowelRules.find(r => r.key === vSlice2);
        const foundv1 = vowelRules.find(r => r.key === vSlice1);

        if (foundv3) {
          matchedVowel = foundv3.replacement;
          vowelLen = 3;
        } else if (foundv2) {
          matchedVowel = foundv2.replacement;
          vowelLen = 2;
        } else if (foundv1) {
          matchedVowel = foundv1.replacement;
          vowelLen = 1;
        }

        if (matchedVowel) {
          parsedWord += matchedVowel;
          i += vowelLen;
        } else {
          // Fallback, just append original char
          parsedWord += word[i];
          i++;
        }
      }
    }

    // Post processing to clean double "hal" characters: eg 'ක්‍්' -> 'ක්'
    // Remove duplicate hal-kireema if any slippage occurred.
    parsedWord = parsedWord.replace(/්+/g, '්');
    // If vowel modifier follows '්', remove '්' (eg. 'ක්' + 'ා' -> 'කා')
    parsedWord = parsedWord.replace(/්([ාැෑිීුූෙේොෝ])/g, '$1');

    return parsedWord;
  });

  return resultWords.join(' ');
}

// Basic arrays to present on Sinhala manual keyboard layout
export const SINHALA_VOWELS = [
  { char: 'අ', sound: 'a' },
  { char: 'ආ', sound: 'aa' },
  { char: 'ඇ', sound: 'ae' },
  { char: 'ඈ', sound: 'aee' },
  { char: 'ඉ', sound: 'i' },
  { char: 'ඊ', sound: 'ii' },
  { char: 'උ', sound: 'u' },
  { char: 'ඌ', sound: 'uu' },
  { char: 'එ', sound: 'e' },
  { char: 'ඒ', sound: 'ee' },
  { char: 'ඔ', sound: 'o' },
  { char: 'ඕ', sound: 'oo' }
];

export const SINHALA_CONSONANTS = [
  { char: 'ක', sound: 'ka' },
  { char: 'ග', sound: 'ga' },
  { char: 'ච', sound: 'cha' },
  { char: 'ජ', sound: 'ja' },
  { char: 'ට', sound: 'ta' },
  { char: 'ඩ', sound: 'da' },
  { char: 'ත', sound: 'tha' },
  { char: 'ද', sound: 'dha' },
  { char: 'න', sound: 'na' },
  { char: 'ප', sound: 'pa' },
  { char: 'බ', sound: 'ba' },
  { char: 'ම', sound: 'ma' },
  { char: 'ය', sound: 'ya' },
  { char: 'ර', sound: 'ra' },
  { char: 'ල', sound: 'la' },
  { char: 'ව', sound: 'va' },
  { char: 'ස', sound: 'sa' },
  { char: 'හ', sound: 'ha' },
  { char: 'ෆ', sound: 'fa' }
];

export const SINHALA_MODIFIERS = [
  { char: '්', name: 'Hal-kirima (්)' },
  { char: 'ා', name: 'Aela-pilla (ා)' },
  { char: 'ැ', name: 'Gaeta-pilla (ැ)' },
  { char: 'ෑ', name: 'Diga gaeta-pilla (ෑ)' },
  { char: 'ි', name: 'Is-pilla (ි)' },
  { char: 'ී', name: 'Diga is-pilla (ී)' },
  { char: 'ු', name: 'Papi-pilla (ු)' },
  { char: 'ූ', name: 'Diga papi-pilla (ූ)' },
  { char: 'ෙ', name: 'Kombuva (ෙ)' },
  { char: 'ේ', name: 'Kombuva + aela-pilla (ේ)' },
  { char: 'ො', name: 'Kombuva + aela-pilla (ො)' },
  { char: 'ෝ', name: 'Kombuva + diga aela-pilla (ෝ)' },
];
