import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { providerUrl } from '../lib/providerUrl';

const ROTATION_WINDOW_MS = 1000 * 60 * 60 * 4;
const FEATURED_PRIORITY = [
  'jacob feit',
  'joshua trauring',
  'kenny shapiro',
];

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function serviceLabel(provider) {
  return provider.title || provider.subcategory || provider.custom_category || {
    tutor: 'Tutoring',
    barber: 'Barber',
    'hebrew tutor': 'Hebrew tutoring',
    fitness: 'Fitness',
    tennis: 'Tennis',
    other: 'Campus service',
  }[provider.category] || 'Campus service';
}

function dedupeFeaturedProviders(providers) {
  const grouped = new Map();

  for (const provider of providers) {
    if (!provider?.id || !provider?.name) continue;
    const key = String(provider.user_id || provider.username || provider.name).toLowerCase();
    const current = grouped.get(key);
    const service = serviceLabel(provider);
    const price = Number(provider.price_per_session);

    if (!current) {
      grouped.set(key, {
        ...provider,
        services: service ? [service] : [],
        lowestPrice: Number.isFinite(price) && price > 0 ? price : null,
      });
      continue;
    }

    if (service && !current.services.includes(service)) current.services.push(service);
    if (Number.isFinite(price) && price > 0) {
      current.lowestPrice = current.lowestPrice === null ? price : Math.min(current.lowestPrice, price);
    }

    const currentScore = Number(current.review_count || 0) * 10 + Number(current.rating || 0);
    const nextScore = Number(provider.review_count || 0) * 10 + Number(provider.rating || 0);
    if (nextScore > currentScore) {
      Object.assign(current, {
        ...provider,
        services: current.services,
        lowestPrice: current.lowestPrice,
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const aPriority = FEATURED_PRIORITY.indexOf(String(a.name || '').toLowerCase());
    const bPriority = FEATURED_PRIORITY.indexOf(String(b.name || '').toLowerCase());
    if (aPriority !== -1 || bPriority !== -1) {
      if (aPriority === -1) return 1;
      if (bPriority === -1) return -1;
      return aPriority - bPriority;
    }
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

function selectFeaturedProviders(providers) {
  const uniqueProviders = dedupeFeaturedProviders(providers);
  if (uniqueProviders.length <= 3) return uniqueProviders;

  const priorityCount = Math.min(3, uniqueProviders.length);
  const pinned = uniqueProviders.slice(0, priorityCount);
  const rotatable = uniqueProviders.slice(priorityCount);
  if (!rotatable.length) return pinned;

  const rotation = Math.floor(Date.now() / ROTATION_WINDOW_MS);
  const offset = rotation % rotatable.length;
  const rotated = Array.from({ length: Math.min(rotatable.length, 3) }, (_, index) => rotatable[(offset + index) % rotatable.length]);
  return [...pinned.slice(0, Math.max(0, 3 - rotated.length)), ...rotated].slice(0, 3);
}

function cardAccent(name) {
  const lower = String(name || '').toLowerCase();
  if (lower.includes('joshua')) return '#2C5F8A';
  if (lower.includes('kenny')) return '#3D5A80';
  return '#1B3A6B';
}

function ProviderCard({ provider, index }) {
  const profileHref = providerUrl(provider.name, provider.id, provider.username);
  const rating = Number(provider.rating);
  const services = provider.services?.slice(0, 2) || [];
  const extraServices = Math.max(0, (provider.services?.length || 0) - services.length);

  return (
    <Link
      to={profileHref}
      className="provider-card-home flex h-full flex-col rounded-[20px] border border-[rgba(27,58,107,0.07)] bg-white p-10 no-underline transition"
      style={{ animationDelay: `${0.05 + (index * 0.07)}s` }}
    >
      <div
        className="mb-6 flex h-[50px] w-[50px] items-center justify-center rounded-[13px] text-[19px] text-white"
        style={{ background: cardAccent(provider.name), fontFamily: '"DM Serif Display", serif', fontWeight: 400 }}
      >
        {initials(provider.name)}
      </div>

      <div className="mb-[2px] text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#C9A84C' }}>
        Featured Provider
      </div>

      <h3 className="provider-name-home mt-[15px] mb-[14px] font-['DM_Serif_Display'] text-[28px] leading-[0.98] tracking-[-0.5px] text-[#112345]">
        {provider.name}
      </h3>

      <div className="mb-[30px] flex flex-wrap gap-[8px]">
        {services.map(service => (
          <span key={service} className="rounded-[20px] bg-[#F2EDE4] px-[12px] py-[5px] text-[12px] font-medium text-[#3D3530]">
            {service}
          </span>
        ))}
        {extraServices > 0 && (
          <span className="rounded-[20px] bg-[#F2EDE4] px-[12px] py-[5px] text-[12px] font-medium text-[#3D3530]">
            +{extraServices} more
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-[rgba(27,58,107,0.06)] pt-6">
        <div>
          <div className="provider-price-home font-['DM_Serif_Display'] text-[21px] leading-none tracking-[-0.4px] text-[#1B3A6B]">
            {provider.lowestPrice ? `$${provider.lowestPrice}` : 'Ask'}
          </div>
          <div className="mt-[5px] text-[12px] text-[#7A6E65]">
            {provider.lowestPrice ? 'per session' : 'contact for price'}
            {Number.isFinite(rating) && rating > 0 && <> &middot; ★ {rating.toFixed(1)}</>}
          </div>
        </div>
        <span className="rounded-[8px] bg-[#1B3A6B] px-[18px] py-[9px] text-[13px] font-semibold text-white">
          Book
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    let mounted = true;

    api.get('/providers', { params: { sort: 'rating' } })
      .then(({ data }) => {
        if (mounted) setProviders(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (mounted) setProviders([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const featuredProviders = useMemo(() => selectFeaturedProviders(providers), [providers]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#3D3530]">
      <style>{`
        .home-shell {
          max-width: 1280px;
          margin: 0 auto;
          padding-left: 48px;
          padding-right: 48px;
        }
        .home-hero {
          padding-top: 136px;
          padding-bottom: 132px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 112px;
          align-items: center;
        }
        .hero-left {
          animation: fadeUp 0.55s ease both;
        }
        .hero-right {
          animation: fadeUp 0.55s 0.08s ease both;
        }
        .provider-card-home:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(27,58,107,0.1);
        }
          .provider-card-home {
          animation: fadeUp 0.5s ease both;
        }
        .feature-card-home:hover {
          box-shadow: 0 8px 32px rgba(27,58,107,0.09);
          transform: translateY(-2px);
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 1024px) {
          .home-shell {
            padding-left: 24px;
            padding-right: 24px;
          }
          .home-hero {
            grid-template-columns: 1fr;
            gap: 68px;
            padding-top: 92px;
            padding-bottom: 96px;
          }
        }
        @media (max-width: 768px) {
          .home-shell {
            padding-left: 16px;
            padding-right: 16px;
          }
          .home-hero {
            gap: 22px;
            padding-top: 44px;
            padding-bottom: 48px;
          }
          .provider-card-home {
            min-height: 0;
            padding: 22px;
          }
          .provider-name-home {
            font-size: 22px;
          }
          .provider-price-home {
            font-size: 18px;
          }
          .feature-card-home {
            padding: 18px 18px 18px 16px;
            gap: 12px;
          }
          .feature-card-home h2 {
            font-size: 16px;
          }
          .feature-card-home p {
            font-size: 12.5px;
          }
          .hero-title-home {
            font-size: 36px;
            line-height: 1.08;
          }
          .hero-copy-home {
            font-size: 14px;
            max-width: 100%;
          }
          .hero-actions-home {
            margin-top: 24px;
            flex-direction: column;
            align-items: stretch;
          }
          .hero-actions-home a {
            width: 100%;
            text-align: center;
          }
          .home-shell section {
            padding-top: 48px;
            padding-bottom: 48px;
          }
          .featured-provider-grid {
            gap: 18px;
          }
          .section-header-home {
            align-items: flex-start;
            flex-direction: column;
          }
          .section-header-home h2 {
            font-size: 30px;
          }
          .how-grid-home {
            gap: 24px;
          }
          .how-grid-home h3 {
            font-size: 20px;
          }
          .how-grid-home p {
            font-size: 13px;
          }
          .provider-cta-home {
            padding-top: 88px;
            padding-bottom: 88px;
          }
          .provider-cta-home h2 {
            font-size: 38px;
          }
          .provider-cta-home p {
            font-size: 14px;
          }
        }
      `}</style>

      <section className="overflow-hidden">
        <div className="home-shell">
          <div className="home-hero">
            <div className="hero-left">
              <div className="mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1B3A6B] opacity-65">
                <span className="block h-px w-6 bg-[#1B3A6B]" />
                ASK Marketplace
              </div>

              <h1 className="hero-title-home font-['DM_Serif_Display'] text-[62px] leading-[1.06] tracking-[-1.5px] text-[#112345]">
                Find the right
                <br />
                student service,
                <br />
                <em className="italic text-[#1B3A6B]">without the noise.</em>
              </h1>

              <p className="hero-copy-home mt-6 max-w-[400px] text-[17px] font-light leading-[1.65] text-[#7A6E65]">
                Tutors, barbers, trainers, language help, and more. Search by subject, price, or availability and book directly on campus.
              </p>

              <div className="hero-actions-home mt-10 flex flex-wrap items-center gap-4">
                <Link
                  to="/browse"
                  className="inline-block rounded-[10px] bg-[#1B3A6B] px-7 py-[14px] text-[15px] font-semibold text-white no-underline transition hover:-translate-y-[1px] hover:bg-[#112345]"
                >
                  Browse providers
                </Link>
                <Link
                  to="/become-a-provider"
                  className="border-b border-[rgba(27,58,107,0.3)] pb-[2px] text-[15px] font-medium text-[#1B3A6B] no-underline"
                >
                  Become a provider →
                </Link>
              </div>
            </div>

            <div className="hero-right flex flex-col gap-[14px]">
              {[
                ['Fast search', 'Search by subject, service, price, or plain-English need.'],
                ['Verified booking flow', 'Book through ASK so reviews stay tied to real sessions.'],
                ['Campus-first payments', 'Handle payment directly with Zelle or Venmo after booking.'],
              ].map(([title, copy], index) => (
                <div
                  key={title}
                  className="feature-card-home flex items-start gap-[18px] rounded-[16px] border border-[rgba(27,58,107,0.07)] bg-white px-7 py-[26px] transition"
                >
                  <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#1B3A6B] text-[12px] font-bold text-white">
                    0{index + 1}
                  </div>
                  <div>
                    <h2 className="font-['DM_Serif_Display'] text-[18px] text-[#112345]">
                      {title}
                    </h2>
                    <p className="mt-1 text-[13.5px] font-light leading-[1.5] text-[#7A6E65]">
                      {copy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="home-shell border-t border-[rgba(27,58,107,0.07)]" />

      <section className="py-[144px]">
        <div className="home-shell">
          <div className="section-header-home mb-16 flex items-end justify-between gap-10">
            <div>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1B3A6B] opacity-60">
                Featured on campus
              </div>
              <h2 className="font-['DM_Serif_Display'] text-[42px] leading-[1.1] tracking-[-0.8px] text-[#112345]">
                Real providers,
                <br />
                <em className="italic text-[#1B3A6B]">without the repeat cards.</em>
              </h2>
            </div>
            <Link
              to="/browse"
              className="mb-2 whitespace-nowrap border-b border-[rgba(27,58,107,0.25)] pb-[2px] text-[14px] font-medium text-[#1B3A6B] no-underline"
            >
              See all providers →
            </Link>
          </div>

          <div className="featured-provider-grid grid gap-8 lg:grid-cols-3">
            {featuredProviders.map((provider, index) => (
              <ProviderCard key={provider.user_id || provider.username || provider.id} provider={provider} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F2EDE4] py-[144px]">
        <div className="home-shell">
          <div className="mb-16">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1B3A6B] opacity-60">
              How it works
            </div>
            <h2 className="font-['DM_Serif_Display'] text-[42px] leading-[1.1] tracking-[-0.8px] text-[#112345]">
              Three steps,
              <br />
              <em className="italic text-[#1B3A6B]">zero friction.</em>
            </h2>
          </div>

          <div className="how-grid-home grid gap-14 lg:grid-cols-3">
            {[
              ['01', 'Browse', 'Search by subject, service, price, format, and availability. Real providers with real reviews.'],
              ['02', 'Book', 'Lock in a time and message directly through the platform. No back-and-forth DMs needed.'],
              ['03', 'Pay offline', 'Handle payment with Zelle or Venmo once the session is confirmed. Simple.'],
            ].map(([num, title, copy]) => (
              <div key={title}>
                <div className="mb-3 font-['DM_Serif_Display'] text-[52px] leading-none tracking-[-2px] text-[rgba(27,58,107,0.10)]">
                  {num}
                </div>
                <h3 className="font-['DM_Serif_Display'] text-[21px] tracking-[-0.3px] text-[#112345]">
                  {title}
                </h3>
                <p className="mt-3 text-[14px] font-light leading-[1.65] text-[#7A6E65]">
                  {copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="provider-cta-home bg-[#1B3A6B] px-6 py-[144px] text-center sm:px-10 lg:px-12">
        <div className="mx-auto max-w-[600px]">
          <div className="mb-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.4)]">
            For providers
          </div>
          <h2 className="font-['DM_Serif_Display'] text-[52px] leading-[1.08] tracking-[-1.2px] text-white">
            Turn your skill into
            <br />
            <em className="italic text-[rgba(255,255,255,0.6)]">booked sessions.</em>
          </h2>
          <p className="mx-auto mt-5 max-w-[460px] text-[16px] font-light leading-[1.65] text-[rgba(255,255,255,0.55)]">
            Post a listing, set your availability, and grow your profile with verified reviews from every session.
          </p>
          <Link
            to="/become-a-provider"
            className="mt-10 inline-block rounded-[10px] bg-white px-8 py-[14px] text-[15px] font-semibold text-[#1B3A6B] no-underline transition hover:-translate-y-[1px] hover:bg-[#FAF7F2]"
          >
            Become a provider
          </Link>
        </div>
      </section>
    </div>
  );
}
