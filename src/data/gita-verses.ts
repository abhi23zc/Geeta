export type GitaWord = {
  sanskrit: string;
  meaning: string;
};

export type GitaNarrationSegment = {
  /** The content area that should react while this phrase is spoken. */
  kind: "intro" | "sanskrit" | "meaning";
  text: string;
  startMs: number;
  endMs: number;
};

export type GitaNarration = {
  audioSource: number;
  /** The last reviewed spoken phrase. Playback stops here to avoid unreviewed file tails. */
  completionMs: number;
  segments: readonly GitaNarrationSegment[];
};

export type GitaVerse = {
  id: string;
  chapter: number;
  verse: string;
  theme: string;
  sanskrit: string;
  transliteration: string;
  meaning: string;
  takeaway: string;
  reflectionPrompt: string;
  context: string;
  words: GitaWord[];
  /** Add a reviewed, distributable local recording and matching timings here. */
  narration?: GitaNarration;
};

export const GITA_VERSES: readonly GitaVerse[] = [
  {
    id: "2-47",
    chapter: 2,
    verse: "47",
    theme: "Selfless, centered action",
    sanskrit: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
    transliteration: "karmaṇy-evādhikāras te mā phaleṣu kadācana |\nmā karma-phala-hetur bhūr mā te saṅgo ’stvakarmaṇi ||",
    meaning: "Your responsibility is to act well, not to control every result. Do not make reward your only motive, and do not let uncertainty become an excuse for inaction.",
    takeaway: "Give your full attention to the next right action.",
    reflectionPrompt: "Which action can you do wholeheartedly today without demanding a particular result?",
    context: "Krishna redirects Arjuna from anxiety about outcomes toward disciplined action. The teaching joins effort with inner steadiness; it does not ask us to become careless about the quality of our work.",
    words: [
      { sanskrit: "कर्मणि", meaning: "in action or duty" },
      { sanskrit: "अधिकारः", meaning: "responsibility or rightful sphere" },
      { sanskrit: "फलेषु", meaning: "in the results" },
      { sanskrit: "सङ्गः", meaning: "attachment" },
      { sanskrit: "अकर्मणि", meaning: "inaction" },
    ],
  },
  {
    id: "2-48",
    chapter: 2,
    verse: "48",
    theme: "Steadiness in success and difficulty",
    sanskrit: "योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय।\nसिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते॥",
    transliteration: "yoga-sthaḥ kuru karmāṇi saṅgaṁ tyaktvā dhanañjaya |\nsiddhy-asiddhyoḥ samo bhūtvā samatvaṁ yoga ucyate ||",
    meaning: "Established in inner balance, perform your work while releasing attachment. Meet success and failure with steadiness; this evenness of mind is called yoga.",
    takeaway: "Let steadiness guide you before circumstances do.",
    reflectionPrompt: "Where can you respond with balance instead of reacting to success or disappointment?",
    context: "This verse describes yoga as a quality carried into action. Equanimity does not erase preference or effort; it keeps changing results from controlling the mind.",
    words: [
      { sanskrit: "योगस्थः", meaning: "established in yoga" },
      { sanskrit: "सङ्गम्", meaning: "attachment" },
      { sanskrit: "सिद्धि", meaning: "success" },
      { sanskrit: "असिद्धि", meaning: "lack of success" },
      { sanskrit: "समत्वम्", meaning: "evenness or balance" },
    ],
  },
  {
    id: "2-50",
    chapter: 2,
    verse: "50",
    theme: "Skillful action with a clear mind",
    sanskrit: "बुद्धियुक्तो जहातीह उभे सुकृतदुष्कृते।\nतस्माद्योगाय युज्यस्व योगः कर्मसु कौशलम्॥",
    transliteration: "buddhi-yukto jahātīha ubhe sukṛta-duṣkṛte |\ntasmād yogāya yujyasva yogaḥ karmasu kauśalam ||",
    meaning: "A person joined with clear understanding moves beyond anxious accounting of good and bad results. Commit yourself to yoga: yoga is skillfulness in action.",
    takeaway: "Work carefully, calmly, and with full presence.",
    reflectionPrompt: "What would skillful, unhurried action look like in your most important task today?",
    context: "Krishna connects wisdom with practical excellence. Skill here includes the inner discipline that prevents fear, pride, or craving from distorting what we do.",
    words: [
      { sanskrit: "बुद्धियुक्तः", meaning: "joined with clear understanding" },
      { sanskrit: "योगाय", meaning: "toward yoga" },
      { sanskrit: "कर्मसु", meaning: "in actions" },
      { sanskrit: "कौशलम्", meaning: "skillfulness" },
    ],
  },
  {
    id: "2-14",
    chapter: 2,
    verse: "14",
    theme: "Patience with changing experience",
    sanskrit: "मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः।\nआगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत॥",
    transliteration: "mātrā-sparśās tu kaunteya śītoṣṇa-sukha-duḥkha-dāḥ |\nāgamāpāyino ’nityās tāṁs titikṣasva bhārata ||",
    meaning: "Contact with the changing world brings heat and cold, pleasure and pain. These experiences arrive and pass; meet them with patient endurance.",
    takeaway: "Pause before treating a temporary feeling as a permanent truth.",
    reflectionPrompt: "Which discomfort can you hold patiently today without letting it decide your behavior?",
    context: "The verse reminds Arjuna that sensations and emotional weather are impermanent. Patient endurance means staying wise and responsive while they pass.",
    words: [
      { sanskrit: "शीतोष्ण", meaning: "cold and heat" },
      { sanskrit: "सुखदुःख", meaning: "pleasure and pain" },
      { sanskrit: "आगमापायिनः", meaning: "coming and going" },
      { sanskrit: "अनित्याः", meaning: "impermanent" },
      { sanskrit: "तितिक्षस्व", meaning: "bear patiently" },
    ],
  },
  {
    id: "6-5",
    chapter: 6,
    verse: "5",
    theme: "Becoming your own ally",
    sanskrit: "उद्धरेदात्मनात्मानं नात्मानमवसादयेत्।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः॥",
    transliteration: "uddhared ātmanātmānaṁ nātmānam avasādayet |\nātmaiva hy ātmano bandhur ātmaiva ripur ātmanaḥ ||",
    meaning: "Lift yourself through your own disciplined mind; do not degrade yourself. The mind can become your friend, and the same mind can become your adversary.",
    takeaway: "Speak and act toward yourself as a trusted ally.",
    reflectionPrompt: "What one supportive choice would make your mind an ally today?",
    context: "In the teaching on meditation, self-mastery begins with personal responsibility. This is an invitation to train the mind with firmness and care, rather than condemnation.",
    words: [
      { sanskrit: "उद्धरेत्", meaning: "one should lift" },
      { sanskrit: "अवसादयेत्", meaning: "one should lower or degrade" },
      { sanskrit: "बन्धुः", meaning: "friend or ally" },
      { sanskrit: "रिपुः", meaning: "enemy or adversary" },
    ],
  },
  {
    id: "12-13-14",
    chapter: 12,
    verse: "13–14",
    theme: "Compassion, humility, and devotion",
    sanskrit: "अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च।\nनिर्ममो निरहङ्कारः समदुःखसुखः क्षमी॥\nसन्तुष्टः सततं योगी यतात्मा दृढनिश्चयः।\nमय्यर्पितमनोबुद्धिर्यो मद्भक्तः स मे प्रियः॥",
    transliteration: "adveṣṭā sarva-bhūtānāṁ maitraḥ karuṇa eva ca |\nnirmamo nirahaṅkāraḥ sama-duḥkha-sukhaḥ kṣamī ||\nsantuṣṭaḥ satataṁ yogī yatātmā dṛḍha-niścayaḥ |\nmayy arpita-mano-buddhir yo mad-bhaktaḥ sa me priyaḥ ||",
    meaning: "Dear to the Divine is one who hates no being, lives with friendship and compassion, releases possessiveness and ego, remains balanced, forgiving, content, self-controlled, and steady in resolve.",
    takeaway: "Let compassion shape one interaction today.",
    reflectionPrompt: "Who needs a little more patience or kindness from you today?",
    context: "Krishna describes devotion through qualities visible in daily relationships. Spiritual practice appears as compassion, steadiness, humility, and a mind offered toward what is sacred.",
    words: [
      { sanskrit: "अद्वेष्टा", meaning: "free from hatred" },
      { sanskrit: "मैत्रः", meaning: "friendly" },
      { sanskrit: "करुणः", meaning: "compassionate" },
      { sanskrit: "निरहङ्कारः", meaning: "free from egoism" },
      { sanskrit: "क्षमी", meaning: "forgiving and patient" },
    ],
  },
  {
    id: "18-66",
    chapter: 18,
    verse: "66",
    theme: "Trust and wholehearted surrender",
    sanskrit: "सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।\nअहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः॥",
    transliteration: "sarva-dharmān parityajya mām ekaṁ śaraṇaṁ vraja |\nahaṁ tvāṁ sarva-pāpebhyo mokṣayiṣyāmi mā śucaḥ ||",
    meaning: "Release every lesser refuge and take wholehearted shelter in the Divine. You will be freed from what binds you; do not grieve.",
    takeaway: "Release one burden you were never meant to control alone.",
    reflectionPrompt: "What fear can you place down today and meet with trust?",
    context: "Near the Gita’s conclusion, Krishna gathers the teaching into an intimate call to trust. Surrender here is an active reorientation of the heart and will toward the Divine.",
    words: [
      { sanskrit: "परित्यज्य", meaning: "having relinquished" },
      { sanskrit: "शरणम्", meaning: "refuge" },
      { sanskrit: "व्रज", meaning: "go or come" },
      { sanskrit: "मोक्षयिष्यामि", meaning: "I shall liberate" },
      { sanskrit: "मा शुचः", meaning: "do not grieve" },
    ],
  },
] as const;

/**
 * Temporary guided sample. Keep the regular collection above intact while
 * reviewed recordings are produced for the daily rotation.
 */
export const TEMPORARY_NARRATED_VERSE: GitaVerse = {
  id: "10-20",
  chapter: 10,
  verse: "20",
  theme: "The Divine presence within every being",
  sanskrit: "अहमात्मा गुडाकेश सर्वभूताशयस्थितः।\nअहमादिश्च मध्यं च भूतानामन्त एव च॥",
  transliteration: "Aham aatmaa gudaakesha sarva-bhootaashaya-sthitah |\nAham aadish cha madhyam cha bhootaanaam anta eva cha",
  meaning: "हे अर्जुन, मैं सभी प्राणियों के हृदय में स्थित आत्मा हूँ। मैं ही सभी प्राणियों का आदि, मध्य और अंत हूँ।",
  takeaway: "हर प्राणी में उसी दिव्य उपस्थिति को देखने का अभ्यास करें।",
  reflectionPrompt: "आज आप किस व्यक्ति में अधिक करुणा और सम्मान के साथ उस दिव्य उपस्थिति को देख सकते हैं?",
  context: "कृष्ण अर्जुन को याद दिलाते हैं कि दिव्यता किसी दूर की वस्तु नहीं है; वह हर जीव के भीतर उपस्थित है।",
  words: [
    { sanskrit: "अहमात्मा", meaning: "मैं आत्मा हूँ" },
    { sanskrit: "गुडाकेश", meaning: "हे अर्जुन" },
    { sanskrit: "सर्वभूत", meaning: "सभी प्राणी" },
    { sanskrit: "आदि", meaning: "आरंभ" },
    { sanskrit: "अन्त", meaning: "समापन" },
  ],
  narration: {
    audioSource: require("@/assets/audio/gita/geeta-10-20-hi.mp3"),
    completionMs: 52_000,
    segments: [
      { kind: "intro", text: "श्रीमद्भगवद्गीता · अध्याय दस · श्लोक बीस", startMs: 12_000, endMs: 20_000 },
      { kind: "sanskrit", text: "अहमात्मा", startMs: 21_000, endMs: 23_150 },
      { kind: "sanskrit", text: "गुडाकेश", startMs: 23_200, endMs: 24_900 },
      { kind: "sanskrit", text: "सर्वभूताशयस्थितः।", startMs: 25_000, endMs: 28_000 },
      { kind: "sanskrit", text: "अहमादिश्च", startMs: 29_000, endMs: 31_000 },
      { kind: "sanskrit", text: "मध्यं", startMs: 31_050, endMs: 32_100 },
      { kind: "sanskrit", text: "च", startMs: 32_150, endMs: 32_500 },
      { kind: "sanskrit", text: "भूतानामन्त", startMs: 32_550, endMs: 34_200 },
      { kind: "sanskrit", text: "एव", startMs: 34_250, endMs: 34_600 },
      { kind: "sanskrit", text: "च॥", startMs: 34_650, endMs: 35_000 },
      { kind: "intro", text: "इसका मतलब है।", startMs: 36_000, endMs: 38_000 },
      { kind: "meaning", text: "हे", startMs: 40_000, endMs: 40_350 },
      { kind: "meaning", text: "अर्जुन,", startMs: 40_380, endMs: 41_050 },
      { kind: "meaning", text: "मैं", startMs: 41_100, endMs: 41_450 },
      { kind: "meaning", text: "सभी", startMs: 41_500, endMs: 42_000 },
      { kind: "meaning", text: "प्राणियों", startMs: 42_050, endMs: 42_700 },
      { kind: "meaning", text: "के", startMs: 42_750, endMs: 43_000 },
      { kind: "meaning", text: "हृदय", startMs: 43_050, endMs: 43_600 },
      { kind: "meaning", text: "में", startMs: 43_650, endMs: 44_000 },
      { kind: "meaning", text: "स्थित", startMs: 44_050, endMs: 44_600 },
      { kind: "meaning", text: "आत्मा", startMs: 44_650, endMs: 45_200 },
      { kind: "meaning", text: "हूँ।", startMs: 45_250, endMs: 46_000 },
      { kind: "meaning", text: "मैं", startMs: 47_000, endMs: 47_350 },
      { kind: "meaning", text: "ही", startMs: 47_400, endMs: 47_600 },
      { kind: "meaning", text: "सभी", startMs: 47_650, endMs: 48_200 },
      { kind: "meaning", text: "प्राणियों", startMs: 48_250, endMs: 48_900 },
      { kind: "meaning", text: "का", startMs: 48_950, endMs: 49_200 },
      { kind: "meaning", text: "आदि,", startMs: 49_250, endMs: 49_650 },
      { kind: "meaning", text: "मध्य", startMs: 49_700, endMs: 50_150 },
      { kind: "meaning", text: "और", startMs: 50_200, endMs: 50_450 },
      { kind: "meaning", text: "अंत", startMs: 50_500, endMs: 50_850 },
      { kind: "meaning", text: "हूँ।", startMs: 50_900, endMs: 52_000 },
    ],
  },
};

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDailyGitaVerse(date = new Date()) {
  // This is intentionally temporary while only one reviewed narration exists.
  // Restore the rotation below after each daily verse has reviewed audio.
  if (TEMPORARY_NARRATED_VERSE.narration) return TEMPORARY_NARRATED_VERSE;

  const localDayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  return GITA_VERSES[localDayNumber % GITA_VERSES.length];
}

export function getGitaVerse(id: string | undefined) {
  if (id === TEMPORARY_NARRATED_VERSE.id) return TEMPORARY_NARRATED_VERSE;
  return GITA_VERSES.find((verse) => verse.id === id);
}
