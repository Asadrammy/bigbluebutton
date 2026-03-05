import Link from 'next/link';

const heroStats = [
  { label: 'Latency p95', value: '380 ms' },
  { label: 'Languages live', value: '9 EU + ASL' },
  { label: 'Deployments', value: '27 sites' },
];

const heroNotes = [
  'Edge capture secured with MediaRecorder + consent prompts.',
  'Per-language PyTorch registry powering the TIM avatar mixer.',
  'Hetzner-ready Docker stack (FastAPI · Next.js · Redis).',
];

const capabilityPillars = [
  {
    title: 'Native capture fidelity',
    body: 'Webcam, depth, and microphone modules run locally, buffer frames, and enforce policy-driven limits.',
    stats: '4K video · 48 kHz audio · Offline fallback',
  },
  {
    title: 'Avatar-grade linguistics',
    body: 'PyTorch checkpoints per language stream into a physically based avatar rig with manual override controls.',
    stats: '120+ key joints · Viseme sync · Speed cues',
  },
  {
    title: 'Audit-ready history',
    body: 'Every translation lands in a unified history service with retention policies, export hooks, and encryption.',
    stats: '256-bit at rest · 30 / 90 / 365 day tiers',
  },
];

const translatorModes = [
  {
    title: 'Sign → Text Studio',
    description: 'Adaptive webcam batching streams gestures to the FastAPI recognizer without leaking frames.',
    badge: 'Webcam capture',
    link: '/dashboard/translator/sign-to-text',
    highlights: ['Edge buffering with privacy guardrails', 'Live confidence ribbons + saved transcripts'],
  },
  {
    title: 'Speech → Sign Avatar',
    description: 'Whisper-grade speech-to-text flows straight into the TIM avatar rig for instant playback.',
    badge: 'Audio ingestion',
    link: '/dashboard/translator/speech-to-sign',
    highlights: ['Sentence-aware avatar cues', 'History logging for compliance audits'],
  },
  {
    title: 'Text Relay Hub',
    description: 'Bi-directional text translator used by contact centers, kiosks, and remote interpreters.',
    badge: 'Text workspace',
    link: '/dashboard/translator/text',
    highlights: ['Saved presets per desk or team', 'Copy/export macros for escalations'],
  },
];

const operationsStack = [
  {
    title: 'Consent & compliance',
    bullets: ['GDPR + DSGVO compliant capture prompts', 'Auto-redaction for staff handoffs'],
  },
  {
    title: 'Ops cockpit',
    bullets: ['Health dashboards for avatar render nodes', 'Usage quotas across kiosks and counters'],
  },
  {
    title: 'Developer toolkit',
    bullets: ['REST + WebSocket APIs', 'IaC-ready Docker compose + Terraform modules'],
  },
];

const deployments = [
  {
    city: 'Hamburg Mobility Office',
    summary: 'Deployed TIM-AI booths across two Bürgerämter for DGS-first citizens.',
    metrics: [
      { label: 'Wait time reduction', value: '-41%' },
      { label: 'Staff adoption', value: '92% daily usage' },
    ],
  },
  {
    city: 'Zurich Airport Assistance',
    summary: 'Speech→Sign avatars greet travelers at transfers and customs.',
    metrics: [
      { label: 'Passengers served / day', value: '1.6k' },
      { label: 'Languages live', value: 'ASL · DGS · LSF' },
    ],
  },
  {
    city: 'Madrid Telehealth Network',
    summary: 'Clinicians trigger avatars mid-call for medication instructions.',
    metrics: [
      { label: 'Interpreter call-outs', value: '-55%' },
      { label: 'Avg. session length', value: '12 min' },
    ],
  },
];

const timeline = [
  {
    label: 'Week 0',
    title: 'Pilot scoping',
    detail: 'Map counters, kiosks, or clinics, define sign + spoken language mix, align on data retention.',
  },
  {
    label: 'Week 3',
    title: 'Stack provisioning',
    detail: 'Deploy FastAPI + Redis + PostgreSQL on Hetzner, configure CDN for avatar assets, connect SSO.',
  },
  {
    label: 'Week 6',
    title: 'Onsite activation',
    detail: 'Roll out desktop and kiosk clients, train staff, enable monitoring dashboards, and lock compliance gates.',
  },
  {
    label: 'Week 10',
    title: 'Scale + analyze',
    detail: 'Extend to adjacent sites, tune models with recorded sessions, and export audit packs.',
  },
];

export default function Home() {
  return (
    <main className="bg-slate-950 text-white">
      <section className="relative isolate overflow-hidden px-6 py-24 sm:py-32 lg:px-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.4),_transparent_65%)]" />
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.4em] text-cyan-200">
              Continental sign intelligence
            </span>
            <div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                A translator cockpit for sign ↔ speech ↔ text teams.
              </h1>
              <p className="mt-4 text-lg text-slate-200">
                TIM-AI unifies webcam capture, Whisper-grade speech recognition, and a controllable avatar renderer so
                accessibility leaders can serve citizens in any European sign language.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="mailto:founders@tim-ai.eu"
                className="rounded-full bg-cyan-400 px-6 py-3 text-slate-950 font-semibold shadow-lg shadow-cyan-500/20"
              >
                Book a pilot call
              </Link>
              <Link href="/dashboard" className="rounded-full border border-white/30 px-6 py-3 text-white hover:bg-white/10">
                View dashboard demo
              </Link>
            </div>
            <dl className="grid gap-4 sm:grid-cols-3">
              {heroStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-xs uppercase tracking-wide text-slate-300">{stat.label}</dt>
                  <dd className="mt-2 text-2xl font-semibold text-white">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-slate-900/60 p-8 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.4em] text-cyan-200">Implementation blueprint</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">
              Plug TIM-AI into kiosks, contact centers, or telehealth tablets without rebuilding your stack.
            </h3>
            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              {heroNotes.map((note) => (
                <li key={note} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Current focus</p>
              <p className="mt-3 text-lg font-semibold">DGS · ASL · BSL · LSF · LIS · LSE · NGT · OGS · SSL</p>
              <p className="text-xs text-slate-300">Next up: FinSL · LGP · Libras · Vlaamse Gebarentaal</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 px-6 py-20 lg:px-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-cyan-400">Capabilities</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Engineered for public-sector scale.</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {capabilityPillars.map((pillar) => (
              <div key={pillar.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-xl font-semibold text-white">{pillar.title}</h3>
                <p className="mt-3 text-sm text-slate-200">{pillar.body}</p>
                <p className="mt-4 text-xs uppercase tracking-wide text-cyan-200">{pillar.stats}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900/60 px-6 py-20 lg:px-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-cyan-400">Translator suite</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Three production-ready flows ship on day one.</h2>
              <p className="mt-3 text-slate-300">
                Each module talks to the same FastAPI history log, auth context, and Hetzner-friendly deployment target.
              </p>
            </div>
            <p className="text-sm text-slate-400">Next.js 15 · FastAPI · WebRTC · Three.js</p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {translatorModes.map((mode) => (
              <div key={mode.title} className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                <span className="text-xs uppercase tracking-[0.3em] text-cyan-200">{mode.badge}</span>
                <h3 className="mt-3 text-xl font-semibold text-white">{mode.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{mode.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  {mode.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href={mode.link} className="mt-6 inline-flex items-center text-sm font-semibold text-cyan-300">
                  Open module →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white text-slate-900 px-6 py-20 lg:px-24">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-semibold text-cyan-600">Pipeline</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">From capture to avatar in predictable stages.</h2>
          <p className="mt-3 text-slate-600">
            Built for infrastructure teams who need audit trails, low latency, and the ability to switch sign languages on the fly.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {capabilityPillars.map((pillar, index) => (
            <div key={pillar.title} className="rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="text-xs font-mono text-slate-400">0{index + 1}</div>
              <h3 className="mt-2 text-lg font-semibold">{pillar.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-b from-slate-950 to-slate-900 px-6 py-20 lg:px-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-cyan-400">Field operations</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Orchestrate sign services like a mission control.</h2>
            </div>
            <p className="text-sm text-slate-400">Kiosks · Contact centers · Telehealth · Interpreter dispatch</p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {operationsStack.map((block) => (
              <div key={block.title} className="rounded-3xl border border-slate-800 bg-black/30 p-6">
                <h3 className="text-xl font-semibold text-white">{block.title}</h3>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  {block.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900/70 px-6 py-20 lg:px-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-cyan-400 text-center">Live deployments</p>
          <h2 className="mt-2 text-3xl font-bold text-center tracking-tight">Case studies from across the TIM-AI network.</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {deployments.map((study) => (
              <div key={study.city} className="rounded-3xl border border-slate-800 bg-black/30 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">{study.city}</p>
                <p className="mt-3 text-lg font-semibold text-white">{study.summary}</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {study.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-white/10 p-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</p>
                      <p className="mt-1 text-xl font-semibold text-white">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 text-slate-900 lg:px-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold text-cyan-600">Timeline</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Deploy TIM-AI in ten weeks, in public view.</h2>
          <div className="mt-10 space-y-6">
            {timeline.map((item) => (
              <div key={item.label} className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="text-xs font-mono text-cyan-600">{item.label}</div>
                <h3 className="mt-2 text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 lg:px-24">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-950 p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Next steps</p>
          <h2 className="mt-3 text-3xl font-bold text-white">Ready to deploy TIM-AI?</h2>
          <p className="mt-3 text-lg text-slate-200">
            Spin up the FastAPI backend, point the Next.js dashboard to your Hetzner stack, and deliver interpreters a unified translation cockpit.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/dashboard" className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-900">
              Enter dashboard
            </Link>
            <Link href="mailto:founders@tim-ai.eu" className="rounded-full border border-white/40 px-6 py-3 text-white hover:bg-white/10">
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
