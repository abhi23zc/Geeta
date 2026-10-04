import type { Localized, QuizBank, QuizBankRepository, QuizQuestion, QuizTopic } from './types.ts';
import { hinglishRows, hinglishTemplates } from './hinglish.ts';

type Group = { en: string; hi: string; exEn: string; exHi: string; ref: string; rows: string[][] };
type TopicContent = { ids: string[]; reviewedIds: string[]; groups: Group[] };
export const TOPICS: QuizTopic[] = [
  { id: 'ramayana', title: { en: 'Ramayana', hi: 'रामायण', hinglish: 'Ramayana' }, count: 100 },
  { id: 'mahabharata', title: { en: 'Mahabharata', hi: 'महाभारत', hinglish: 'Mahabharata' }, count: 100 },
  { id: 'gita', title: { en: 'Gita & everyday wisdom', hi: 'गीता और जीवन ज्ञान', hinglish: 'Gita aur jeevan ka gyaan' }, count: 80 },
  { id: 'festivals', title: { en: 'Festivals & traditions', hi: 'उत्सव और परंपराएं', hinglish: 'Tyohar aur paramparayein' }, count: 100 },
  { id: 'deities', title: { en: 'Deities, stories & symbols', hi: 'देवता, कथाएं और प्रतीक', hinglish: 'Devta, kathayein aur prateek' }, count: 80 },
  { id: 'temples', title: { en: 'Temples & sacred places', hi: 'मंदिर और पवित्र स्थल', hinglish: 'Mandir aur pavitra sthal' }, count: 80 },
  { id: 'sanskrit', title: { en: 'Sanskrit & cultural words', hi: 'संस्कृत और संस्कृति के शब्द', hinglish: 'Sanskrit aur sanskriti ke shabd' }, count: 60 },
];
function fill(template: string, subject: string, answer: string) { return template.replaceAll('{s}', subject).replaceAll('{a}', answer); }
function hindiReference(reference: string) {
  const names: Record<string, string> = {
    'Bala Kanda': 'बालकांड', 'Ayodhya Kanda': 'अयोध्याकांड', 'Aranya Kanda': 'अरण्यकांड', 'Kishkindha Kanda': 'किष्किंधाकांड', 'Sundara Kanda': 'सुंदरकांड', 'Yuddha Kanda': 'युद्धकांड', 'Uttara Kanda': 'उत्तरकांड',
    'Sarga': 'सर्ग',
    'Adi Parva': 'आदिपर्व', 'Sabha Parva': 'सभापर्व', 'Vana Parva': 'वनपर्व', 'Virata Parva': 'विराटपर्व', 'Bhishma Parva': 'भीष्मपर्व', 'Udyoga Parva': 'उद्योगपर्व', 'Drona Parva': 'द्रोणपर्व', 'Karna Parva': 'कर्णपर्व', 'Shalya Parva': 'शल्यपर्व', 'Shanti Parva': 'शांतिपर्व',
    'Bhagavad Gita, verse': 'भगवद्गीता, श्लोक', 'IIT Kanpur Gita Supersite': 'आईआईटी कानपुर गीता सुपरसाइट',
    'Monier-Williams Sanskrit–English Dictionary, headword': 'मोनियर-विलियम्स संस्कृत-अंग्रेज़ी शब्दकोश, शब्द',
    'Incredible India, Ministry of Tourism — destination and temple profiles': 'अतुल्य भारत, पर्यटन मंत्रालय — पर्यटन स्थल और मंदिर परिचय',
    'Incredible India — city and pilgrimage destination profiles': 'अतुल्य भारत — नगर और तीर्थस्थल परिचय',
    'Official temple traditions; Incredible India temple profiles': 'आधिकारिक मंदिर परंपराएं; अतुल्य भारत मंदिर परिचय',
    'Incredible India — festival profiles; traditional Hindu festival observances': 'अतुल्य भारत — उत्सव परिचय; पारंपरिक हिंदू उत्सव विधियां',
    'Incredible India — regional festivals and events': 'अतुल्य भारत — क्षेत्रीय उत्सव और आयोजन',
    'Incredible India festival profiles; regional observances': 'अतुल्य भारत उत्सव परिचय; क्षेत्रीय प्रथाएं',
    'Traditional Hindu festival names; Sanskrit festival vocabulary': 'पारंपरिक हिंदू उत्सव नाम; संस्कृत उत्सव शब्दावली',
    'Incredible India — festivals; Bhagavata Purana; Ramayana traditions': 'अतुल्य भारत — उत्सव; भागवत पुराण; रामायण परंपराएं',
    'Hindu iconography; temple traditions; Bhagavata Purana; Shiva Purana': 'हिंदू मूर्ति-विज्ञान; मंदिर परंपराएं; भागवत पुराण; शिव पुराण',
    'Traditional Hindu temple iconography': 'पारंपरिक हिंदू मंदिर मूर्ति-विज्ञान',
    'Bhagavata Purana, Books 3, 5, 7, 8 and 9; Dashavatara tradition': 'भागवत पुराण, स्कंध 3, 5, 7, 8 और 9; दशावतार परंपरा',
    'Traditional Sanskrit divine epithets; devotional literature': 'पारंपरिक संस्कृत देव नाम; भक्ति साहित्य',
    'Bhagavata Purana; Shiva Purana; Devi Mahatmya': 'भागवत पुराण; शिव पुराण; देवी माहात्म्य',
    'Hindu worship and temple traditions; Sanskrit sacred vocabulary': 'हिंदू उपासना और मंदिर परंपराएं; संस्कृत की पवित्र शब्दावली',
  };
  let result = reference;
  for (const [en, hi] of Object.entries(names)) result = result.replaceAll(en, hi);
  return result;
}
function revision(value: string) {
  let hash = 2166136261;
  for (const c of value) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return `r1-${(hash >>> 0).toString(16)}`;
}
export function compileBank(content: Record<string, TopicContent>): QuizBank {
  const questions: QuizQuestion[] = [];
  for (const topic of TOPICS) {
    let index = 0;
    const groups = content[topic.id].groups;
    if (content[topic.id].ids.length !== topic.count || content[topic.id].reviewedIds.some(id => !content[topic.id].ids.includes(id))) throw new Error(`Invalid stable IDs: ${topic.id}`);
    const all = groups.flatMap(g => g.rows);
    const romanRows = new Map(groups.flatMap((g, i) => {
      const translated = hinglishRows(topic.id, i, g.rows);
      return g.rows.map((row, j) => [row, translated[j]] as const);
    }));
    if (hinglishTemplates[topic.id]?.length !== groups.length) throw new Error(`Missing Hinglish templates: ${topic.id}`);
    for (const group of groups) for (const row of group.rows) {
      const [en, hi, answerEn, answerHi] = row;
      const roman = romanRows.get(row)!;
      const [promptHinglish, explanationHinglish] = hinglishTemplates[topic.id][groups.indexOf(group)];
      if (row.length !== 4 || row.some(v => typeof v !== 'string' || !v.trim())) throw new Error(`Invalid content row: ${topic.id} ${index + 1}`);
      const options: { id: string; label: Localized }[] = [{ id: 'answer', label: { en: answerEn, hi: answerHi, hinglish: roman.answer } }];
      // Same relation first: father distractors are fathers, location distractors are locations.
      const candidates = [...group.rows.slice(index % group.rows.length), ...group.rows, ...all];
      for (const other of candidates) {
        if (options.some(o => o.label.en === other[2] || o.label.hi === other[3])) continue;
        if (options.some(o => o.label.hinglish === romanRows.get(other)!.answer)) continue;
        options.push({ id: `choice-${options.length}`, label: { en: other[2], hi: other[3], hinglish: romanRows.get(other)!.answer } });
        if (options.length === 4) break;
      }
      index++;
      const id = content[topic.id].ids[index - 1], reviewed = content[topic.id].reviewedIds.includes(id);
      questions.push({
        id,
        revision: revision(JSON.stringify([row, group.en, group.hi, group.exEn, group.exHi])), topic: topic.id, lesson: `${topic.id}-lesson-${Math.ceil(index / 5)}`,
        difficulty: index <= topic.count * 0.5 ? 'easy' : index <= topic.count * 0.85 ? 'medium' : 'advanced',
        prompt: { en: fill(group.en, en, answerEn), hi: fill(group.hi, hi, answerHi), hinglish: fill(promptHinglish, roman.subject, roman.answer) }, options, correct: 'answer',
        explanation: { en: fill(group.exEn, en, answerEn), hi: fill(group.exHi, hi, answerHi), hinglish: fill(explanationHinglish, roman.subject, roman.answer) },
        source: { en: fill(group.ref, en, answerEn), hi: `संदर्भ: ${fill(hindiReference(group.ref), hi, answerHi)}`, hinglish: `Source: ${fill(group.ref, roman.subject, roman.answer)}` },
        context: {
          en: `Traditional accounts and interpretations can vary. This question follows the named source or specified tradition.${reviewed ? '' : ' Editorial review is pending.'}`,
          hi: `परंपरागत कथाओं और व्याख्याओं में भिन्नता हो सकती है। यह प्रश्न दिए गए स्रोत या बताई गई परंपरा पर आधारित है।${reviewed ? '' : ' संपादकीय समीक्षा बाकी है।'}`,
          hinglish: `Paramparik kathayein aur interpretations alag ho sakte hain. Yeh question diye gaye source ya parampara par aadharit hai.${reviewed ? '' : ' Editorial review baaki hai.'}`,
        }, review: reviewed ? 'reviewed' : 'editorial-pending',
      });
    }
  }
  const lessons = TOPICS.flatMap(topic => Array.from({ length: topic.count / 5 }, (_, i) => ({ id: `${topic.id}-lesson-${i + 1}`, topic: topic.id, number: i + 1, questionIds: questions.filter(q => q.lesson === `${topic.id}-lesson-${i + 1}`).map(q => q.id) })));
  const cards = TOPICS.flatMap(topic => Array.from({ length: Math.floor(topic.count / 20) }, (_, i) => {
    const q = questions.filter(q => q.topic === topic.id)[i * 20];
    return { id: `${topic.id}-card-${i + 1}`, topic: topic.id, milestone: (i + 1) * 4, title: { en: `${topic.title.en} • ${i + 1}`, hi: `${topic.title.hi} • ${i + 1}`, hinglish: `${topic.title.hinglish} • ${i + 1}` }, body: q.explanation };
  }));
  return { version: 1, revision: 'culture-600-v1', topics: TOPICS, questions, lessons, cards };
}
export function validateBank(bank: QuizBank) {
  const errors: string[] = [], ids = new Set<string>(), prompts = new Set<string>();
  if (bank.questions.length !== 600 || bank.lessons.length !== 120 || bank.cards.length !== 30) errors.push('Expected 600 questions, 120 lessons and 30 cards.');
  for (const t of bank.topics) if (bank.questions.filter(q => q.topic === t.id).length !== t.count) errors.push(`Wrong topic count: ${t.id}`);
  for (const q of bank.questions) {
    if (ids.has(q.id)) errors.push(`Duplicate ID: ${q.id}`); ids.add(q.id);
    for (const lang of ['en', 'hi', 'hinglish'] as const) {
      const key = `${lang}:${q.prompt[lang].toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, '')}`;
      if (prompts.has(key)) errors.push(`Duplicate prompt: ${q.id}`); prompts.add(key);
      if (![q.prompt, q.explanation, q.source, q.context, ...q.options.map(o => o.label)].every(l => l[lang]?.trim())) errors.push(`Missing ${lang}: ${q.id}`);
      if (new Set(q.options.map(o => o.label[lang].trim())).size !== 4) errors.push(`Duplicate ${lang} choices: ${q.id}`);
    }
    if (q.options.length !== 4 || new Set(q.options.map(o => o.id)).size !== 4 || !q.options.some(o => o.id === q.correct)) errors.push(`Invalid options: ${q.id}`);
    if (!bank.lessons.some(l => l.id === q.lesson && l.topic === q.topic && l.questionIds.includes(q.id))) errors.push(`Orphan question: ${q.id}`);
  }
  const assigned = bank.lessons.flatMap(l => l.questionIds);
  if (assigned.length !== ids.size || new Set(assigned).size !== ids.size) errors.push('Questions must belong to exactly one lesson.');
  for (const l of bank.lessons) if (l.questionIds.length !== 5 || l.questionIds.some(id => !ids.has(id))) errors.push(`Invalid lesson: ${l.id}`);
  if (errors.length) throw new Error(errors.join('\n'));
  return { questions: bank.questions.length, lessons: bank.lessons.length, cards: bank.cards.length, editorialPending: bank.questions.filter(q => q.review !== 'reviewed').length };
}
let cached: QuizBank | null = null;
export const bundledRepository: QuizBankRepository = {
  async load() {
    if (!cached) {
      const bank = compileBank({
        ramayana: require('./content/ramayana.json'), mahabharata: require('./content/mahabharata.json'),
        gita: require('./content/gita.json'), festivals: require('./content/festivals.json'),
        deities: require('./content/deities.json'), temples: require('./content/temples.json'), sanskrit: require('./content/sanskrit.json'),
      });
      validateBank(bank); cached = bank;
    }
    return cached;
  },
};
