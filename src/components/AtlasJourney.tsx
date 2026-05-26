/**
 * AtlasJourney — pinned-scroll 3D isometric scene.
 *
 * Replaces the chapter-based "From the medina to your dorm door" pinned
 * narrative with a single tilted-plane diorama: a rider on a moped travels
 * from Café Hassan (Moroccan medina building, bottom-left) along a dashed
 * route to AUI Dorm 16 (top-right). HUD cards float over the scene with
 * live ETA, the rider's identity, order-status timeline, and Atlas weather.
 *
 * As the user scrolls the page through the section's 320vh height, the
 * sticky 100vh stage's camera tilts, the rider advances along an 11-point
 * curve, the dashed route fills, the ETA counts down from 22→1 min, the
 * km counter ticks 8.4→0, and the six timeline stages light up.
 *
 * All scroll-driven mutations bypass React state — refs + a single rAF
 * coalesced scroll handler keep it 60fps even on low-end Androids.
 */
import { useEffect, useRef } from 'react';
import * as I from '../icons/Icon';

type Pt = [number, number];

// 11 waypoints, scene-center coordinates (bottom-left medina → top-right campus)
const PATH: Pt[] = [
  [-440, -260], [-360, -200], [-260, -150], [-160, -110], [-60, -60],
  [40,   -20], [140,   30], [220,   80], [300,   140], [360,   200], [420,  240],
];

// Same shape with z-offsets that the rider uses for its position math
const PATH_RIDER: Pt[] = [
  [-380, 200], [-310, 150], [-220, 90], [-130, 40], [-40, -10],
  [50,    -30], [140,  -50], [220,  -90], [300,  -140], [360,  -180], [400,  -220],
];

// Scroll-progress break-points (0..1) at which each timeline stage flips to "done"
const STAGE_BREAKS = [0.05, 0.15, 0.25, 0.4, 0.95];

const STAGES = [
  'Order placed',
  'Kitchen accepted',
  'Cooking',
  'Rider assigned',
  'En route',
  'At your dorm',
];

export default function AtlasJourney() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const riderRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const etaNumRef = useRef<HTMLDivElement | null>(null);
  const kmRef = useRef<HTMLSpanElement | null>(null);
  const dashRef = useRef<SVGPathElement | null>(null);
  const stageRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const update = () => {
      const sec = sectionRef.current;
      if (!sec) return;
      const r = sec.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = Math.max(1, r.height - vh);
      const scrolled = Math.max(0, -r.top);
      const p = Math.max(0, Math.min(1, scrolled / total));

      // Camera tilt: ease as user scrolls
      if (sceneRef.current) {
        const camRotX = 58 - p * 14;
        const camRotZ = -36 + p * 10;
        const camY = -30 + p * 20;
        sceneRef.current.style.transform = `translateY(${camY}px) rotateX(${camRotX}deg) rotateZ(${camRotZ}deg)`;
      }

      // Rider position along the curve
      const seg = p * (PATH_RIDER.length - 1);
      const i = Math.min(PATH_RIDER.length - 2, Math.floor(seg));
      const t = seg - i;
      const px = PATH_RIDER[i][0] + (PATH_RIDER[i + 1][0] - PATH_RIDER[i][0]) * t;
      const py = PATH_RIDER[i][1] + (PATH_RIDER[i + 1][1] - PATH_RIDER[i][1]) * t;
      const heading =
        (Math.atan2(PATH_RIDER[i + 1][1] - PATH_RIDER[i][1], PATH_RIDER[i + 1][0] - PATH_RIDER[i][0]) * 180) /
        Math.PI;
      if (riderRef.current) {
        riderRef.current.style.setProperty('--x', `${px}px`);
        riderRef.current.style.setProperty('--y', `${py}px`);
        riderRef.current.style.setProperty('--rot', `${heading}deg`);
      }

      // Dashed route fills in
      if (dashRef.current) {
        dashRef.current.setAttribute('stroke-dashoffset', String(1 - p));
      }

      // HUD
      if (barRef.current) barRef.current.style.width = `${p * 100}%`;
      if (etaNumRef.current && etaNumRef.current.firstChild) {
        etaNumRef.current.firstChild.textContent = String(Math.max(1, Math.round(22 * (1 - p))));
      }
      if (kmRef.current) kmRef.current.textContent = `${(8.4 * (1 - p)).toFixed(1)} km left`;

      // Stages
      stageRefs.current.forEach((el, k) => {
        if (!el) return;
        const done = k === 0 || p > STAGE_BREAKS[k - 1];
        el.classList.toggle('done', done);
      });
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // Initial paint + re-paint after fonts / layout settle
    update();
    const t1 = setTimeout(update, 100);
    const t2 = setTimeout(update, 500);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Trees scattered around the plateau — fixed seed so layout is consistent
  const TREES: [number, number][] = [
    [-380, 80], [-280, 140], [-180, 200], [-80, 160], [20, 200],
    [120, 180], [220, 140], [-340, -100], [-220, -140], [-120, -180],
    [-20, -200], [80, -180], [180, -160], [280, -120], [360, -60],
  ];

  return (
    <section className="bloc journey-bloc" id="journey" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="journey-pin">
        <div className="container journey-head">
          <div className="section-tag">
            <I.Pin size={11} /> Live Order Tracking
          </div>
          <h2 className="section-title">
            From the medina to<br />
            your dorm door.
          </h2>
          <p className="section-sub">
            Scroll to watch a real delivery cross the Atlas — six stages, weather-aware ETA, and
            door-precise dorm drop. Every order, every time.
          </p>
        </div>

        <div className="journey-stage">
          <div className="journey-scene" ref={sceneRef}>
            {/* Ground plate */}
            <div className="iso-ground">
              <div className="iso-grid" />
              <div className="iso-river" />
            </div>

            {/* Mountains */}
            <div className="iso-mtn iso-mtn-1"><b /></div>
            <div className="iso-mtn iso-mtn-2"><b /></div>
            <div className="iso-mtn iso-mtn-3"><b /></div>
            <div className="iso-mtn iso-mtn-4"><b /></div>

            {/* Trees */}
            {TREES.map(([x, y], k) => (
              <div
                key={k}
                className="iso-tree"
                style={
                  {
                    '--x': `${x}px`,
                    '--y': `${y}px`,
                    '--h': `${30 + (k % 3) * 14}px`,
                  } as React.CSSProperties
                }
              />
            ))}

            {/* Medina building (Café Hassan) */}
            <div
              className="iso-building iso-medina"
              style={{ '--x': '-380px', '--y': '200px' } as React.CSSProperties}
            >
              <div className="b-roof" />
              <div className="b-side b-front" />
              <div className="b-side b-right" />
              <div className="b-door" />
              <div className="iso-label">Café Hassan</div>
            </div>

            {/* Campus building (AUI Dorm 16) */}
            <div
              className="iso-building iso-campus"
              style={{ '--x': '400px', '--y': '-220px' } as React.CSSProperties}
            >
              <div className="b-roof" />
              <div className="b-side b-front" />
              <div className="b-side b-right" />
              <div className="b-door" />
              <div className="b-window w1" />
              <div className="b-window w2" />
              <div className="b-window w3" />
              <div className="b-window w4" />
              <div className="iso-label">AUI Dorm 16</div>
            </div>

            {/* Route */}
            <svg className="iso-path-svg" viewBox="-550 -350 1100 700" preserveAspectRatio="none">
              <defs>
                <linearGradient id="journeyPathGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FF5722" />
                  <stop offset="1" stopColor="#FFB74D" />
                </linearGradient>
              </defs>
              {/* Faint background dash line */}
              <path
                d={
                  `M ${PATH[0][0]} ${PATH[0][1]} ` +
                  PATH.slice(1).map((p) => `L ${p[0]} ${p[1]}`).join(' ')
                }
                stroke="rgba(255,87,34,0.20)"
                strokeWidth="6"
                strokeDasharray="8 6"
                fill="none"
                strokeLinecap="round"
              />
              {/* Gradient progress line */}
              <path
                ref={dashRef}
                d={
                  `M ${PATH[0][0]} ${PATH[0][1]} ` +
                  PATH.slice(1).map((p) => `L ${p[0]} ${p[1]}`).join(' ')
                }
                stroke="url(#journeyPathGrad)"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset="1"
              />
            </svg>

            {/* Rider */}
            <div
              className="iso-rider"
              ref={riderRef}
              style={{ '--x': '-380px', '--y': '200px', '--rot': '0deg' } as React.CSSProperties}
            >
              <div className="rider-shadow" />
              <div className="rider-body">
                <div className="rider-helmet" />
                <div className="rider-box" />
                <div className="rider-bike" />
                <div className="rider-trail" />
              </div>
            </div>
          </div>

          {/* HUD: ETA */}
          <div className="journey-hud hud-eta">
            <div className="hud-lbl">Arrival in</div>
            <div className="hud-row">
              <div className="hud-num" ref={etaNumRef}>
                22<span>min</span>
              </div>
            </div>
            <div className="hud-bar">
              <div className="hud-bar-fill" ref={barRef} style={{ width: '0%' }} />
            </div>
            <div className="hud-meta">
              <span ref={kmRef}>8.4 km left</span>
              <span className="dot" />
              <span>Building 16 · Room 204</span>
            </div>
          </div>

          {/* HUD: Rider */}
          <div className="journey-hud hud-rider">
            <div className="hud-rider-avatar">Y</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="hud-lbl-tiny">Your rider</div>
              <div className="hud-rider-name">
                Youssef <span aria-hidden>·</span> <I.Star /> 4.9
              </div>
            </div>
            <button className="hud-call" aria-label="Call rider">
              <I.Phone size={14} />
            </button>
            <button className="hud-call" aria-label="Chat with rider">
              <I.Chat size={14} />
            </button>
          </div>

          {/* HUD: Stages */}
          <div className="journey-hud hud-stages">
            <div className="hud-lbl-tiny" style={{ marginBottom: 10 }}>
              Order timeline
            </div>
            <ul>
              {STAGES.map((s, k) => (
                <li
                  key={s}
                  ref={(el) => {
                    stageRefs.current[k] = el;
                  }}
                  className={k === 0 ? 'done' : ''}
                >
                  <span className="hud-stage-dot">
                    <span className="dot-num">{k + 1}</span>
                    <span className="dot-check">
                      <I.Check size={10} />
                    </span>
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* HUD: Weather */}
          <div className="journey-hud hud-weather">
            <div className="hud-weather-icon" aria-hidden>
              ☁
            </div>
            <div>
              <div className="hud-lbl-tiny">Atlas weather</div>
              <div className="hud-weather-temp">12°C · Light snow at Michlifen</div>
              <div className="hud-weather-eta">+3 min ETA buffer applied</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
