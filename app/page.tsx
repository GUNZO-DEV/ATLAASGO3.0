import CityDropdown from "@/components/CityDropdown";
import CityModal from "@/components/CityModal";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Request",
    description: "Tell us what you need and where. From lunch to groceries — we handle it.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    step: "02",
    title: "Track",
    description: "Watch your order move in real time. Know exactly when your driver is on the way.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
  {
    step: "03",
    title: "Receive",
    description: "Your order arrives at your door. Pay the flat 15 MAD fee — no surprises.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <CityModal />

      {/* Hero */}
      <section className="relative overflow-hidden bg-emerald-atlaasgo px-6 pt-16 pb-24 flex flex-col items-center text-center"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      >
        {/* Decorative circle */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5" />

        {/* Logo */}
        <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gold flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-white tracking-tight">Atlaasgo</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight">
            Delivery across Morocco,<br />
            <span className="text-gold-light">fast & simple.</span>
          </h1>
          <p className="text-white/70 text-lg">
            Order anything from local restaurants and shops. Flat 15 MAD delivery fee. No surprises.
          </p>

          {/* City selector */}
          <div className="w-full max-w-sm bg-white/10 backdrop-blur-sm rounded-2xl p-5 flex flex-col gap-4 border border-white/20">
            <CityDropdown />
            <a href="/register" className="btn-primary text-center block">
              Start Ordering
            </a>
            <p className="text-center text-white/50 text-xs">
              Already have an account?{" "}
              <a href="/dashboard" className="text-gold-light hover:underline font-medium">
                Go to dashboard
              </a>
            </p>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 48h1440V24C1200 8 960 0 720 0S240 8 0 24v24z" fill="#f9fafb" />
          </svg>
        </div>
      </section>

      {/* How it Works */}
      <section className="px-6 py-16 max-w-4xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-emerald-atlaasgo">How it Works</h2>
          <p className="text-gray-500 mt-2">Three simple steps to get anything delivered.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="card-moroccan flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-atlaasgo/10 flex items-center justify-center text-emerald-atlaasgo">
                {item.icon}
              </div>
              <div>
                <span className="text-xs font-bold text-gold tracking-widest">{item.step}</span>
                <h3 className="text-lg font-bold text-gray-800 mt-0.5">{item.title}</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Atlaasgo — Morocco&apos;s Delivery Platform
      </footer>
    </main>
  );
}
