import type { ComponentType, SVGProps } from 'react'
import { Bot, Compass, CreditCard, Briefcase, Globe } from '../components/icons'

export type Category = 'support' | 'sales' | 'voice' | 'faq' | 'booking'
export type Status = 'live' | 'offline'
type IconType = ComponentType<SVGProps<SVGSVGElement>>

export type Capability = { icon: IconType; title: string; body: string }
export type Stat = { value: string; label: string }
export type Repo = { name: string; url: string; language: string; description: string }
export type Privacy = { notice: string; url: string }

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
    lang: 'de · en',
    category: 'support',
    status: 'live',
    stats: [
      { value: 'gpt-4.1', label: 'azure openai' },
      { value: 'de · en', label: 'languages' },
      { value: '24/7', label: 'always on' },
    ],
    capabilities: [
      { icon: Compass, title: 'Find offers', body: 'Points members to gyms, pools, yoga, climbing and wellness across the network.' },
      { icon: CreditCard, title: 'Membership & check-in', body: 'Explains plans, QR / app check-in, and cancellation in plain language.' },
      { icon: Briefcase, title: 'Companies & partners', body: 'Guides employers on the benefit, and studios on joining the network.' },
      { icon: Globe, title: 'German & English', body: 'Replies in the visitor’s language, grounded only in the knowledge base.' },
    ],
    greeting: `Hi, ich bin Navio 👋🏻
Dein Guide durch die Sportnavi Welt. Wobei kann ich dir helfen?

Hi, I’m Navio 👋🏻
Your guide through the Sportnavi world. How can I help you?`,
    quickReplies: [
      'Find sport & wellness offers',
      'How do I check in?',
      'Become a partner',
      'Sportnavi for companies',
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
]

export function getBot(id: string): Chatbot | undefined {
  return BOTS.find((b) => b.id === id)
}
