/**
 * Geführter Microsite-Chat – einfache Sprache, klare Schritte („Uwe-tauglich“).
 */
import type { ActionIcon, FontStyle, MagicButtonType, ModelConfig, NFCBlock } from '../types';
import { generateSecureKey } from './utils';
import { paletteForIndustry, paletteForVibe } from './brandPalette';

export type ChatRole = 'assistant' | 'user';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export type ChatStep =
  | 'welcome'
  | 'industry'
  | 'slogan'
  | 'logo'
  | 'features'
  | 'vibe'
  | 'done';

export interface ChatAnswers {
  company?: string;
  industry?: string;
  slogan?: string;
  logoUrl?: string;
  features?: string[];
  vibe?: string;
}

export interface ChatSession {
  step: ChatStep;
  answers: ChatAnswers;
  messages: ChatMessage[];
}

export interface StepMeta {
  step: ChatStep;
  index: number;
  total: number;
  title: string;
  hint: string;
  placeholder: string;
  chips: string[];
}

const FEATURE_OPTIONS: { id: string; label: string; buttonType: MagicButtonType }[] = [
  { id: 'whatsapp', label: 'WhatsApp', buttonType: 'whatsapp' },
  { id: 'instagram', label: 'Instagram', buttonType: 'instagram' },
  { id: 'booking', label: 'Terminbuchung', buttonType: 'booking' },
  { id: 'review', label: 'Bewertungen', buttonType: 'review' },
  { id: 'wifi', label: 'WLAN', buttonType: 'wifi' },
  { id: 'stamp', label: 'Stempelkarte', buttonType: 'stamp_card' },
  { id: 'map', label: 'Standort / Karte', buttonType: 'custom_link' },
  { id: 'web', label: 'Website-Link', buttonType: 'custom_link' },
  { id: 'email', label: 'E-Mail', buttonType: 'email' },
  { id: 'phone', label: 'Anrufen', buttonType: 'phone' },
];

const STEP_ORDER: ChatStep[] = ['welcome', 'industry', 'slogan', 'logo', 'features', 'vibe', 'done'];

function msg(role: ChatRole, content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content };
}

export function getStepMeta(step: ChatStep): StepMeta {
  const index = Math.max(0, STEP_ORDER.indexOf(step));
  const total = 6; // sichtbare Frage-Schritte ohne "done"
  switch (step) {
    case 'welcome':
      return {
        step,
        index: 1,
        total,
        title: 'Firmenname',
        hint: 'Tipp: Einfach den Namen tippen, den Kunden auf dem Schild lesen sollen.',
        placeholder: 'z. B. Bäckerei Müller',
        chips: [],
      };
    case 'industry':
      return {
        step,
        index: 2,
        total,
        title: 'Branche',
        hint: 'Tipp: Auf einen Vorschlag tippen – oder kurz selbst schreiben.',
        placeholder: 'z. B. Restaurant',
        chips: ['Restaurant / Café', 'Bäckerei', 'Fitness', 'Immobilien', 'Wellness / Beauty', 'Handwerk', 'Sonstiges'],
      };
    case 'slogan':
      return {
        step,
        index: 3,
        total,
        title: 'Slogan',
        hint: 'Ein kurzer Satz unter dem Namen. Keine Sorge – kannst du später ändern.',
        placeholder: 'z. B. Frisch jeden Tag',
        chips: ['Willkommen bei uns', 'Überspringen'],
      };
    case 'logo':
      return {
        step,
        index: 4,
        total,
        title: 'Logo',
        hint: 'Am einfachsten: Logo-Datei hochladen (Button unten). Oder „Später“ tippen.',
        placeholder: 'Optional: Link (https://…) einfügen',
        chips: ['Später / kein Logo'],
      };
    case 'features':
      return {
        step,
        index: 5,
        total,
        title: 'Funktionen',
        hint: 'Was sollen Kunden auf dem Handy zuerst sehen? Mehrere sind ok.',
        placeholder: 'z. B. WhatsApp und Instagram',
        chips: ['WhatsApp', 'Instagram', 'Terminbuchung', 'Bewertungen', 'Website', 'Alles Wichtige'],
      };
    case 'vibe':
      return {
        step,
        index: 6,
        total,
        title: 'Farben & Stil',
        hint: 'Wie soll es wirken? Einfach antippen.',
        placeholder: 'z. B. modern und blau',
        chips: ['Warm & gemütlich (Bäckerei)', 'Modern & blau', 'Frisch & grün', 'Dunkel & edel', 'Sportlich', 'Minimal & clean'],
      };
    default:
      return {
        step: 'done',
        index: 6,
        total,
        title: 'Fertig',
        hint: 'Rechts siehst du, was deine Kunden sehen. Links kannst du noch nachbessern.',
        placeholder: 'nochmal – für einen neuen Durchlauf',
        chips: ['Nochmal von vorne', 'Passt so'],
      };
  }
}

export function createChatSession(): ChatSession {
  return {
    step: 'welcome',
    answers: {},
    messages: [
      msg(
        'assistant',
        'Hallo! Ich helfe dir, die Seite zu bauen, die deine Kunden sehen, wenn sie den Anhänger ans Handy halten.\n\nKein Technik-Wissen nötig – antworte einfach, oder tippe auf die Vorschläge.\n\nSchritt 1 von 6: Wie heißt dein Geschäft?'
      ),
    ],
  };
}

function detectIndustry(text: string): string {
  const t = text.toLowerCase();
  if (/bäck|baeck|brot|backstube|konditor/.test(t)) return 'bakery';
  if (/gastro|restaurant|café|cafe|bar|hotel|essen/.test(t)) return 'gastro';
  if (/fitness|gym|sport|yoga|trainer/.test(t)) return 'fitness';
  if (/immobil|makler|haus|wohnung/.test(t)) return 'realestate';
  if (/wellness|spa|massage|beauty|friseur|salon/.test(t)) return 'wellness';
  if (/kreativ|design|foto|kunst|agentur|studio/.test(t)) return 'creative';
  if (/handwerk|bau|elektro|sanitär|sonstig/.test(t)) return 'craft';
  return 'general';
}

function parseFeatures(text: string): string[] {
  const t = text.toLowerCase();
  const found: string[] = [];
  for (const f of FEATURE_OPTIONS) {
    if (t.includes(f.id) || t.includes(f.label.toLowerCase())) found.push(f.id);
  }
  if (/social|netzwerk/.test(t)) {
    if (!found.includes('instagram')) found.push('instagram');
    if (!found.includes('whatsapp')) found.push('whatsapp');
  }
  if (/kontakt|erreichen/.test(t)) {
    if (!found.includes('whatsapp')) found.push('whatsapp');
    if (!found.includes('phone')) found.push('phone');
  }
  if (/alle|alles|voll|komplet|wichtige/.test(t)) {
    return ['whatsapp', 'instagram', 'web', 'booking', 'review'];
  }
  if (found.length === 0) return ['whatsapp', 'instagram', 'web'];
  return found.slice(0, 6);
}

export function buildConfigFromAnswers(base: ModelConfig, answers: ChatAnswers): ModelConfig {
  const industry = answers.industry || 'general';
  // Firmenname kann Branche überschreiben (z. B. „Bäckerei Müller“)
  const fromName = answers.company ? detectIndustry(answers.company) : 'general';
  const effectiveIndustry = fromName !== 'general' ? fromName : industry;

  const ind = paletteForIndustry(effectiveIndustry);
  const vibePal = answers.vibe ? paletteForVibe(answers.vibe) : null;
  const pal = vibePal ?? ind;

  const title = (answers.company || base.profileTitle || 'Meine Marke').trim().slice(0, 80);
  const slogan = (answers.slogan || 'Willkommen').trim().slice(0, 120);
  const features = answers.features?.length ? answers.features : ['whatsapp', 'web'];

  const blocks: NFCBlock[] = [
    {
      id: crypto.randomUUID(),
      type: 'headline',
      title: slogan,
      content: '', // kein doppelter Firmenname – Titel steht schon im Header
    },
    {
      id: crypto.randomUUID(),
      type: 'text',
      title: 'Über uns',
      content: `${title} – ${slogan}. Hier findest du alles Wichtige auf einen Blick.`,
    },
  ];

  for (const fid of features) {
    const opt = FEATURE_OPTIONS.find((f) => f.id === fid);
    if (!opt) continue;
    if (fid === 'map') {
      blocks.push({
        id: crypto.randomUUID(),
        type: 'map',
        title: 'Standort',
        content: '',
        settings: { address: 'Adresse ergänzen' },
      });
      continue;
    }
    if (fid === 'stamp') {
      blocks.push({
        id: crypto.randomUUID(),
        type: 'magic_button',
        buttonType: 'stamp_card',
        title: 'Stempelkarte',
        content: '',
        settings: { slots: 10, secretKey: generateSecureKey() },
      });
      continue;
    }
    if (fid === 'web') {
      blocks.push({
        id: crypto.randomUUID(),
        type: 'magic_button',
        buttonType: 'custom_link',
        title: 'Website',
        content: 'https://',
        settings: { icon: 'globe' },
      });
      continue;
    }
    if (fid === 'wifi') {
      blocks.push({
        id: crypto.randomUUID(),
        type: 'magic_button',
        buttonType: 'wifi',
        title: 'WLAN',
        content: '',
        settings: { ssid: 'Gäste-WLAN' },
      });
      continue;
    }
    blocks.push({
      id: crypto.randomUUID(),
      type: 'magic_button',
      buttonType: opt.buttonType,
      title: opt.label,
      content: '',
    });
  }

  blocks.push({
    id: crypto.randomUUID(),
    type: 'magic_button',
    buttonType: 'action_card',
    title: 'Kontakt',
    content: '',
    settings: {
      name: title,
      description: slogan,
      icon: 'user',
    },
  });

  return {
    ...base,
    profileTitle: title,
    accentColor: pal.accent,
    surfaceColor: pal.surface,
    textColor: pal.theme === 'dark' ? '#F5F5F4' : '#1C1917',
    layoutMode: 'landing',
    theme: pal.theme,
    fontStyle: pal.font,
    profileIcon: pal.icon,
    profileLogoUrl: answers.logoUrl || base.profileLogoUrl,
    nfcTemplate: pal.theme === 'dark' ? 'minimal' : 'modern',
    nfcBlocks: blocks.slice(0, 40),
  };
}

function extractHttpsUrl(text: string): string | undefined {
  const m = text.match(/https:\/\/[^\s<>"']+/i);
  return m?.[0]?.replace(/[.,;)]+$/, '');
}

export interface StepResult {
  session: ChatSession;
  config?: ModelConfig;
  applied?: boolean;
}

export function advanceChat(
  session: ChatSession,
  userText: string,
  baseConfig: ModelConfig
): StepResult {
  const text = userText.trim();
  if (!text) return { session };

  const messages = [...session.messages, msg('user', text)];
  const answers = { ...session.answers };
  let step = session.step;
  let reply = '';
  let config: ModelConfig | undefined;
  let applied = false;

  if (step === 'welcome') {
    answers.company = text.slice(0, 80);
    step = 'industry';
    reply = `Prima – „${answers.company}“ ist notiert.\n\nSchritt 2 von 6: In welcher Branche bist du?\n\nTipp auf einen blauen Knopf unten oder schreib es in eigenen Worten.`;
  } else if (step === 'industry') {
    answers.industry = detectIndustry(text);
    step = 'slogan';
    reply =
      'Alles klar.\n\nSchritt 3 von 6: Hast du einen kurzen Slogan oder Willkommenstext?\n\nBeispiel: „Frisch jeden Tag“ – oder tippe „Überspringen“.';
  } else if (step === 'slogan') {
    if (!/^überspring|^skip|^nein|^kein|^passt/i.test(text)) {
      answers.slogan = text.slice(0, 120);
    } else {
      answers.slogan = `Willkommen bei ${answers.company || 'uns'}`;
    }
    step = 'logo';
    reply =
      'Schritt 4 von 6: Hast du ein Logo?\n\nAm einfachsten: den Button „Logo hochladen“ antippen und eine Bilddatei wählen.\nOder tippe „Später“ – dann kannst du es danach nachholen.';
  } else if (step === 'logo') {
    const url = extractHttpsUrl(text);
    if (url) answers.logoUrl = url;
    step = 'features';
    reply =
      'Schritt 5 von 6: Was sollen deine Kunden auf dem Handy besonders gut nutzen können?\n\nTipp ein paar Vorschläge an (z. B. WhatsApp, Instagram) oder schreib „Alles Wichtige“.';
  } else if (step === 'features') {
    answers.features = parseFeatures(text);
    step = 'vibe';
    reply =
      'Fast geschafft.\n\nSchritt 6 von 6: Welche Stimmung soll die Seite haben?\n\nTipp z. B. „Modern & blau“ oder „Warm & gemütlich“.';
  } else if (step === 'vibe') {
    answers.vibe = text.slice(0, 120);
    config = buildConfigFromAnswers(baseConfig, answers);
    step = 'done';
    applied = true;
    reply =
      `Fertig! Die erste Version für „${answers.company}“ steht.\n\n` +
      `Rechts siehst du, was deine Kunden sehen.\n` +
      `Unter „Selbst anpassen“ kannst du Texte, Links und Farben ändern.\n\n` +
      `${answers.logoUrl ? 'Logo ist schon gesetzt.' : 'Logo fehlt noch? Unter „Selbst anpassen“ einfach hochladen.'}\n\n` +
      `Wenn es passt: weiter zum Anhänger. Oder tippe „Nochmal von vorne“.`;
  } else if (step === 'done') {
    if (/nochmal|neu|reset|von vorne/i.test(text)) {
      return { session: createChatSession() };
    }
    reply =
      'Alles gut. Schau rechts die Kunden-Ansicht an. Unter „Selbst anpassen“ kannst du Texte und Links ändern.';
  }

  return {
    session: {
      step,
      answers,
      messages: [...messages, msg('assistant', reply)],
    },
    config,
    applied,
  };
}

export { FEATURE_OPTIONS };
