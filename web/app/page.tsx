import Link from "next/link";
import { Wrench, Sparkles, MapPin, Shield, CheckCircle2, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Assisted Hyperlocal Matching
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            Find trusted skilled workers near you.
          </h1>

          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-slate-300">
            Describe your problem in plain language. Our AI understands the requirements, and our PostGIS engine connects you directly with the most qualified nearby trade professionals.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/request/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg hover:shadow-blue-500/25 transition duration-200"
            >
              <span>Find a Worker</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/signup?role=worker"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold px-7 py-3.5 rounded-xl border border-slate-600 transition"
            >
              <span>I&apos;m a Worker</span>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl">
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              How Project Unknown Works
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base">
              A transparent, 3-step pipeline from problem description to deterministic worker ranking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 space-y-4 hover:border-blue-300 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-lg">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900">Describe Your Issue</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Type what is broken or what service you need (e.g. &quot;My ceiling fan is making clicking noise and not spinning&quot;).
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 space-y-4 hover:border-blue-300 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600 text-white font-bold text-lg">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900">AI Intent Extraction</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Our Gemini-powered service maps your text to canonical trade skills (such as Fan Repair and Electrical Troubleshooting).
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 space-y-4 hover:border-blue-300 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-lg">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900">PostGIS Worker Ranking</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Workers are filtered and scored mathematically based on verified skills, distance within radius, rating, and years of experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Available Trade Categories */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="mx-auto max-w-6xl">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-2xl font-bold text-slate-900">
              Supported Trade Domains
            </h2>
            <p className="text-slate-600 text-sm">
              Discover certified skilled technicians across everyday residential and commercial trades.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold">
                <Wrench className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Plumbing</h4>
              <p className="text-xs text-slate-500">Pipe repair, leak fixing, drain cleaning</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 font-bold">
                <Sparkles className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Electrical</h4>
              <p className="text-xs text-slate-500">House wiring, fan repair, circuit breakers</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold">
                <Shield className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Carpentry</h4>
              <p className="text-xs text-slate-500">Furniture assembly, door lock fitting</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600 font-bold">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Appliances</h4>
              <p className="text-xs text-slate-500">AC servicing, refrigerator maintenance</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 px-4 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Project Unknown. Hyperlocal skilled services matching engine.</p>
      </footer>
    </div>
  );
}
