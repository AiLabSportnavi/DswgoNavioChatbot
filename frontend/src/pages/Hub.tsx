import ChatbotCard from '../components/ChatbotCard'
import { BOTS } from '../data/bots'

export default function Hub() {
  return (
    <div className="min-h-screen bg-bg-base pt-28 md:pt-32">
      <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-16">
        {/* intro */}
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">
            Chatbots
          </h1>
          <p className="mt-2 text-base text-zinc-600">
            Ready-made assistants you can embed on any website. One live today — more on the way.
          </p>
        </div>

        {/* single live bot */}
        <div className="mt-10 grid gap-5 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {BOTS.map((bot) => (
            <ChatbotCard key={bot.id} bot={bot} />
          ))}

          {/* coming soon placeholder */}
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-black/[0.12] p-6 text-center">
            <span className="font-display text-lg font-semibold text-zinc-400">more soon</span>
            <p className="mt-1 max-w-[14rem] text-sm text-zinc-400">
              New Sportnavi bots for voice and partner onboarding are in the works.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
