import type { ComponentType, SVGProps } from 'react'
import { Bot, Compass, CreditCard, Briefcase, Globe, Sparkles } from '../components/icons'

export type Category = 'support' | 'sales' | 'voice' | 'faq' | 'booking'
export type Status = 'live' | 'offline'
type IconType = ComponentType<SVGProps<SVGSVGElement>>

export type Capability = { icon: IconType; title: string; body: string }
export type Stat = { value: string; label: string }
export type Repo = { name: string; url: string; language: string; description: string }
export type Privacy = { notice: string; url: string }

/**
 * Optional Kontakt-Formular config — only used by bots whose `flow` is 'menu'.
 * The dropdown options (Grund/CaseGrounds, Thema/Topic, Kurzbeschreibung/
 * ShortDescription) are the exact Salesforce picklist values and live in
 * data/salesforceOptions.ts (shared, generated from the live Salesforce picklists).
 * Here we only keep the Widerruf URL for the consent checkbox.
 */
export type KontaktConfig = {
  widerrufUrl: string
}

export type Chatbot = {
  id: string
  name: string
  icon: IconType
  role: string
  description: string
  tagline: string
  lang: string
  category: Category
  status: Status
  stats: [Stat, Stat, Stat]
  capabilities: Capability[]
  greeting: string
  quickReplies: string[]
  repo: Repo
  /** Real backend chat endpoint, used in the embed snippet. */
  apiUrl: string
  /** Datenschutz / privacy consent shown before the chat (editable later). */
  privacy: Privacy
  /**
   * Conversation flow after consent. 'chat' (default) drops straight into the
   * FAQ chat; 'menu' shows the Navio menu (FAQ agent + Kontakt-Formular) first.
   */
  flow?: 'chat' | 'menu'
  /** Required when `flow` is 'menu'. */
  kontakt?: KontaktConfig
}

export const BOTS: Chatbot[] = [
  {
    id: 'navio',
    name: 'Navio',
    icon: Bot,
    role: 'your sportnavi guide',
    description:
      'Your friendly guide to Sportnavi — finds sport & wellness offers, answers membership questions, and helps companies and partners get started.',
    tagline:
      'Navio is your friendly guide through Sportnavi — Germany’s corporate-fitness network. Ask about offers, memberships, partners, or bringing Sportnavi to your company.',
    lang: 'any language',
    category: 'support',
    status: 'live',
    stats: [
      { value: 'gpt-4.1', label: 'azure openai' },
      { value: 'any', label: 'language' },
      { value: '24/7', label: 'always on' },
    ],
    capabilities: [
      { icon: Compass, title: 'Find offers', body: 'Points members to gyms, pools, yoga, climbing and wellness across the network.' },
      { icon: CreditCard, title: 'Membership & check-in', body: 'Explains plans, QR / app check-in, and cancellation in plain language.' },
      { icon: Briefcase, title: 'Companies & partners', body: 'Guides employers on the benefit, and studios on joining the network.' },
      { icon: Globe, title: 'Speaks your language', body: 'Write in any language — Navio replies in yours, grounded only in the official Sportnavi knowledge base.' },
    ],
    greeting: `Hi, ich bin Navio 👋🏻
Dein Guide durch die Sportnavi Welt. Wobei kann ich dir helfen?

Hi, I’m Navio 👋🏻
Your guide through the Sportnavi world. How can I help you?`,
    quickReplies: [
      'Angebote finden',
      'Wie checke ich ein?',
      'Partner werden',
      'Sportnavi für Firmen',
    ],
    repo: {
      name: 'AiLabSportnavi/DswgoNavioChatbot',
      url: 'https://github.com/AiLabSportnavi/DswgoNavioChatbot',
      language: 'Python',
      description: 'FastAPI + Azure OpenAI backend, React + Vite frontend.',
    },
    apiUrl: 'https://navio.sportnavi.de/api/chat',
    privacy: {
      notice:
        'Um dir bestmöglich zu helfen, verarbeitet Navio deine Eingaben. Weitere Details findest du in unserer Datenschutzerklärung.',
      url: 'https://www.sportnavi.de/datenschutz/',
    },
  },
  {
    id: 'navio-plus',
    name: 'Navio Plus',
    icon: Sparkles,
    role: 'menü · faq-agent + kontaktformular',
    description:
      'Wie Navio – aber mit Menü. Erst der Datenschutzhinweis, dann die Wahl: mit dem FAQ-Agenten chatten oder direkt ein modernes Kontaktformular ausfüllen.',
    tagline:
      'Navio Plus begrüßt jeden Besucher mit einem kleinen Menü: zuerst die Zustimmung zum Datenschutz, dann die freie Wahl zwischen dem FAQ-Agenten und einem schlanken, modernen Kontaktformular – beides im selben Widget.',
    lang: 'any language',
    category: 'support',
    status: 'live',
    stats: [
      { value: '2-in-1', label: 'faq + kontakt' },
      { value: 'gpt-4.1', label: 'azure openai' },
      { value: 'DSGVO', label: 'consent-first' },
    ],
    capabilities: [
      { icon: Compass, title: 'Menü zuerst', body: 'Nach der Zustimmung wählt der Besucher: FAQ-Agent oder Kontaktformular.' },
      { icon: Bot, title: 'FAQ-Agent', body: 'Derselbe Live-Chat wie bei Navio – Antworten nur aus der offiziellen Sportnavi-Wissensbasis.' },
      { icon: Briefcase, title: 'Kontaktformular', body: 'Ein modern gestaltetes Formular mit allen Feldern der echten Sportnavi-Kontaktseite.' },
      { icon: Globe, title: 'Speaks your language', body: 'Schreib in jeder Sprache – der FAQ-Agent antwortet in deiner.' },
    ],
    greeting: `Hi, ich bin Navio 👋🏻
Dein Guide durch die Sportnavi Welt. Wobei kann ich dir helfen?

Hi, I'm Navio 👋🏻
Your guide through the Sportnavi world. How can I help you?`,
    quickReplies: [
      'Angebote finden',
      'Wie checke ich ein?',
      'Partner werden',
      'Sportnavi für Firmen',
    ],
    repo: {
      name: 'AiLabSportnavi/DswgoNavioChatbot',
      url: 'https://github.com/AiLabSportnavi/DswgoNavioChatbot',
      language: 'Python',
      description: 'FastAPI + Azure OpenAI backend, React + Vite frontend.',
    },
    apiUrl: 'https://navio.sportnavi.de/api/chat',
    privacy: {
      notice:
        'Um dir bestmöglich zu helfen, verarbeitet Navio deine Eingaben. Weitere Details findest du in unserer Datenschutzerklärung.',
      url: 'https://www.sportnavi.de/datenschutz/',
    },
    flow: 'menu',
    kontakt: {
      widerrufUrl: 'https://www.sportnavi.de/widerrufsbelehrung/',
    },
  },
]

export function getBot(id: string): Chatbot | undefined {
  return BOTS.find((b) => b.id === id)
}
