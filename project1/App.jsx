import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  AudioLines,
  BookOpen,
  Check,
  Compass,
  Film,
  Gamepad2,
  Globe2,
  Headphones,
  LoaderCircle,
  Plus,
  RotateCcw,
  Sparkles,
  
} from "lucide-react";

const DEMO_PROFILE = [
  "Björk",
  "Outer Wilds",
  "Ursula K. Le Guin",
  "slow-burn science fiction",
  "dreamy electronic music",
  "stories about memory",
  "hand-drawn animation",
  "beautifully designed games",
  "quietly ambitious films"
];
const STORAGE_KEY = "anti-recommender-session-v1";

const TYPE_ICONS = {
  Music: AudioLines,
  Film,
  Books: BookOpen,
  Games: Gamepad2,
  Podcasts: Headphones,
  Documentaries: Globe2
};

function readSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      targetDistance: Number.isFinite(saved.targetDistance)
        ? saved.targetDistance
        : Number.isFinite(saved.tolerance) ? saved.tolerance : 54,
      history: Array.isArray(saved.history) && saved.history.length
        ? saved.history
        : [{ score: 54 }]
    };
  } catch {
    return { targetDistance: 54, history: [{ score: 54 }] };
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function IconForType({ type, size = 15 }) {
  const Icon = TYPE_ICONS[type] || Sparkles;
  return <Icon size={size} strokeWidth={1.8} />;
}

function TasteMap({ tasteMap }) {
  if (!tasteMap) {
    return (
      <div className="map-empty">
        <div className="map-empty-orbit orbit-one" />
        <div className="map-empty-orbit orbit-two" />
        <div className="map-empty-core"><Compass size={21} /></div>
        <p>Your taste has an orbit.</p>
        <span>Let’s find something outside it.</span>
      </div>
    );
  }

  const lovedCenter = tasteMap.loved.reduce(
    (center, point) => ({ x: center.x + point.x / tasteMap.loved.length, y: center.y + point.y / tasteMap.loved.length }),
    { x: 0, y: 0 }
  );
  const picked = tasteMap.picked;

  return (
    <svg className="taste-map-svg" viewBox="0 0 100 100" role="img" aria-label="Map of your taste and the recommendation">
      <defs>
        <pattern id="map-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".3" fill="rgba(226,237,221,.1)" />
        </pattern>
        <filter id="picked-glow" x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="1.7" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill="url(#map-grid)" />
      {tasteMap.catalog.map((point) => (
        <circle key={point.id} cx={point.x} cy={point.y} r=".6" className={`catalog-dot dot-${point.type.toLowerCase()}`} />
      ))}
      <line
        x1={lovedCenter.x}
        y1={lovedCenter.y}
        x2={picked.x}
        y2={picked.y}
        className="taste-bridge-line"
      />
      {tasteMap.loved.map((point, index) => (
        <g key={`loved-${index}`}>
          <circle cx={point.x} cy={point.y} r="1.5" className="loved-halo" />
          <circle cx={point.x} cy={point.y} r=".75" className="loved-dot" />
        </g>
      ))}
      <circle cx={picked.x} cy={picked.y} r="3.1" className="picked-halo" filter="url(#picked-glow)" />
      <circle cx={picked.x} cy={picked.y} r="1.25" className="picked-dot" />
      <text x={clamp(lovedCenter.x + 4, 3, 83)} y={clamp(lovedCenter.y - 3, 6, 96)} className="map-label">YOUR TASTE</text>
      <text x={clamp(picked.x + 4, 3, 83)} y={clamp(picked.y - 3, 6, 96)} className="map-label picked-label">THE WILD CARD</text>
    </svg>
  );
}

function ToleranceChart({ history }) {
  const width = 300;
  const height = 88;
  const points = history.map((entry, index) => {
    const x = history.length === 1 ? 8 : 8 + (index / (history.length - 1)) * (width - 16);
    const y = height - 8 - (entry.score / 100) * (height - 20);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className="tolerance-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="Stretch tolerance history">
      {[25, 50, 75].map((value) => {
        const y = height - 8 - (value / 100) * (height - 20);
        return <line key={value} x1="0" x2={width} y1={y} y2={y} className="chart-grid-line" />;
      })}
      {history.length > 1 && <polyline points={points} fill="none" className="chart-line" />}
      {history.map((entry, index) => {
        const x = history.length === 1 ? 8 : 8 + (index / (history.length - 1)) * (width - 16);
        const y = height - 8 - (entry.score / 100) * (height - 20);
        return <circle key={`${index}-${entry.score}`} cx={x} cy={y} r="2.1" className="chart-point" />;
      })}
    </svg>
  );
}

function App() {
  const [profile, setProfile] = useState(DEMO_PROFILE);
  const [draft, setDraft] = useState("");
  const [{ targetDistance, history }, setSession] = useState(readSession);
  const [recommendation, setRecommendation] = useState(null);
  const [tasteMap, setTasteMap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [vibe, setVibe] = useState("");
  const [savedFeedback, setSavedFeedback] = useState(false);

  const currentLabel = useMemo(() => {
    if (!recommendation) return "A little left of familiar";
    if (recommendation.distancePercent > 78) return "Way outside your orbit";
    if (recommendation.distancePercent > 52) return "A proper left turn";
    return "An unexpected side street";
  }, [recommendation]);

  function addItem(event) {
    event.preventDefault();
    const values = draft.split(",").map((value) => value.trim()).filter(Boolean);
    const next = [...profile];
    for (const value of values) {
      if (next.length >= 10) break;
      if (!next.some((item) => item.toLowerCase() === value.toLowerCase())) next.push(value);
    }
    setProfile(next);
    setDraft("");
    setError("");
  }

  function removeItem(item) {
    setProfile((current) => current.filter((entry) => entry !== item));
  }

  async function findSomethingUnexpected() {
    if (profile.length < 8 || profile.length > 10) {
      setError("A good taste map needs 8–10 things you love. Add a few more to get started.");
      return;
    }
    setLoading(true);
    setError("");
    setSavedFeedback(false);
    setRating(0);
    setVibe("");

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lovedItems: profile })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Something went sideways. Try again.");
      setRecommendation(result);
      setTasteMap(result.tasteMap);
    } catch (requestError) {
      setError(requestError.message || "Couldn't reach the recommendation engine. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  function saveFeedback() {
    if (!rating || !vibe || !recommendation) return;
    const distance = recommendation.distancePercent;
    let nextTarget = targetDistance;
    if (rating >= 4) {
      nextTarget = Math.min(100, Math.max(targetDistance + 1, distance + 5));
    } else if (rating <= 2) {
      nextTarget = distance >= targetDistance - 15
        ? Math.max(0, Math.min(targetDistance - 1, distance - 8))
        : Math.max(0, targetDistance - 2);
    } else if (vibe === "Too safe") {
      nextTarget = Math.min(100, targetDistance + 3);
    } else if (vibe === "Too weird") {
      nextTarget = Math.max(0, targetDistance - 3);
    } else {
      nextTarget = clamp(targetDistance + (distance >= targetDistance ? 1 : -1), 0, 100);
    }
    const nextHistory = [...history, { score: nextTarget }].slice(-14);
    setSession({ targetDistance: nextTarget, history: nextHistory });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ targetDistance: nextTarget, history: nextHistory }));
    } catch {
      setError("Feedback saved for this session, but couldn't be stored on this device.");
    }
    setSavedFeedback(true);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#" aria-label="The Anti-Recommender home">
          <span className="brand-mark"><Sparkles size={17} strokeWidth={1.8} /></span>
          <span>anti<span className="wordmark-light">/</span>recommender</span>
        </a>
        <div className="topbar-right">
          <span className="demo-pill"><span className="live-dot" /> STAGE-READY DEMO</span>
          <span className="topbar-divider" />
          <span className="catalog-count">300 CURATED PICKS</span>
        </div>
      </header>

      <main>
        <section className="intro">
          <div className="eyebrow"><span className="eyebrow-line" /> A DIFFERENT KIND OF GOOD TASTE</div>
          <h1>Your next favorite<br />thing is <span>out there.</span></h1>
          <p className="intro-copy">It just doesn’t look like the things you already love.<br className="desktop-break" /> Let’s find the connection anyway.</p>
        </section>

        <section className="profile-card panel">
          <div className="profile-head">
            <div className="section-index">01</div>
            <div className="profile-heading">
              <div className="section-kicker">YOUR TASTE, IN A NUTSHELL</div>
              <div className="profile-title-line">
                <h2>Things you love</h2>
                <span className="item-count">{profile.length} <span>/ 10</span></span>
              </div>
            </div>
            <span className="profile-note"><Sparkles size={13} /> {profile.length >= 8 ? "Demo profile · make it yours" : "Add 8–10 to get your map"}</span>
          </div>
          <div className="taste-chips">
            {profile.map((item) => (
              <span className="taste-chip" key={item}>
                {item}
                <button type="button" aria-label={`Remove ${item}`} onClick={() => removeItem(item)}><X size={12} /></button>
              </span>
            ))}
            {profile.length < 10 && (
              <form className="add-taste-form" onSubmit={addItem}>
                <Plus size={14} />
                <input
                  aria-label="Add something you love"
                  placeholder="Add a song, story, world…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
              </form>
            )}
          </div>
        </section>

        <div className="dashboard-grid">
          <div className="left-column">
            <section className="discover-card panel">
              <div className="discover-overline"><span className="sparkle-small"><Sparkles size={13} /></span> THE ANTI-ALGORITHM</div>
              <h2>Let’s take<br />the <em>scenic route.</em></h2>
              <p>Something critically loved, deliberately unlike your usual picks. With a little bridge to get you there.</p>
              <button
                type="button"
                className="discover-button"
                onClick={findSomethingUnexpected}
                disabled={loading}
              >
                {loading
                  ? <><LoaderCircle className="spin" size={18} /> Finding your left turn…</>
                  : <><Sparkles size={17} /> Show me something I’d never pick <ArrowRight size={17} /></>}
              </button>
              <div className="discover-footnote"><span><span className="green-dot" /> No algorithmic comfort zone</span><span>Just one very good detour.</span></div>
              {error && <div className="error-message" role="alert">{error}</div>}
            </section>

            <section className={`result-card panel ${recommendation ? "has-pick" : ""}`}>
              <div className="card-topline">
                <span className="section-kicker">{recommendation ? "YOUR WILD CARD" : "THE PICK"}</span>
                {recommendation && <span className="pick-quality"><Sparkles size={12} /> CRITICALLY LOVED · {recommendation.item.qualityScore}/10</span>}
              </div>
              {recommendation ? (
                <>
                  <div className="pick-type"><IconForType type={recommendation.item.type} /> {recommendation.item.type} <span className="type-dot">·</span> {recommendation.item.creator}</div>
                  <h3 className="pick-title">{recommendation.item.title}</h3>
                  <div className="pick-description">{recommendation.item.description}</div>
                  <div className="bridge-box">
                    <div className="bridge-label"><span><Sparkles size={12} /> THE HIDDEN BRIDGE</span><ArrowDownRight size={15} /></div>
                    <p>{recommendation.bridge}</p>
                  </div>
                  <div className="distance-row">
                    <div className="distance-copy"><span>DISTANCE FROM YOUR TASTE</span><strong>{currentLabel}</strong></div>
                    <div className="distance-value">{recommendation.distancePercent}<small>%</small></div>
                  </div>
                  <div className="distance-track"><span style={{ width: `${recommendation.distancePercent}%` }} /></div>
                  <div className="distance-ends"><span>FAMILIAR</span><span>UNCHARTED</span></div>
                </>
              ) : (
                <div className="pick-empty">
                  <div className="pick-empty-icon"><ArrowDownRight size={22} /></div>
                  <h3>No safe bets here.</h3>
                  <p>Your first wild card is one click away. The only thing it has to share with your taste is being excellent.</p>
                  <div className="empty-tags"><span>High quality</span><span>Low similarity</span><span>Good bridge</span></div>
                </div>
              )}
            </section>
          </div>

          <div className="right-column">
            <section className="map-card panel">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">02 · THE BIG PICTURE</div>
                  <h2>Your taste, mapped</h2>
                </div>
                <span className="map-dimension">2D · PCA</span>
              </div>
              <div className="map-canvas"><TasteMap tasteMap={tasteMap} /></div>
              <div className="map-legend">
                <span><i className="legend-dot legend-taste" /> Your taste</span>
                <span><i className="legend-dot legend-catalog" /> The catalog</span>
                <span><i className="legend-dot legend-pick" /> The wild card</span>
              </div>
              <div className="map-caption">{tasteMap ? "A little farther out. A lot worth finding." : "Your favorites make a constellation. The catalog is the whole sky."}</div>
            </section>

            <section className="stretch-card panel">
              <div className="stretch-head">
                <div>
                  <div className="section-kicker">03 · YOUR OPEN-MIND METER</div>
                  <h2>Stretch tolerance</h2>
                </div>
                <div className="tolerance-number">{targetDistance}<span>/100</span></div>
              </div>
              <div className="gauge-track"><span style={{ width: `${targetDistance}%` }} /><i style={{ left: `${targetDistance}%` }} /></div>
              <div className="gauge-labels"><span>IN MY LANE</span><span>WIDE OPEN</span></div>
              <div className="chart-wrap">
                <div className="chart-label">YOUR OPENNESS, OVER TIME <span>{history.length - 1} {history.length === 2 ? "PICK" : "PICKS"}</span></div>
                <ToleranceChart history={history} />
                <div className="chart-axis"><span>START</span><span>NOW</span></div>
              </div>
              <p className="stretch-note"><Sparkles size={13} /> Good with a far-out pick? Your range expands.</p>
            </section>

            <section className="feedback-card panel">
              <div className="section-kicker">04 · TRUST YOUR GUT</div>
              {savedFeedback ? (
                <div className="feedback-thanks"><span className="thanks-icon"><Check size={16} /></span><span>Your openness just grew. <strong>Nice work.</strong></span></div>
              ) : (
                <>
                  <div className="feedback-question">{recommendation ? "Did it land?" : "After the pick, tell us how it felt."}</div>
                  <div className="rating-row" role="group" aria-label="Rate this pick from one to five">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-label={`${value} out of 5`}
                        aria-pressed={rating === value}
                        className={`rating-button ${rating >= value ? "is-rated" : ""}`}
                        onClick={() => setRating(value)}
                        disabled={!recommendation}
                      >★</button>
                    ))}
                    <span className="rating-hint">{rating ? `${rating} / 5` : "1 = not for me · 5 = a new favorite"}</span>
                  </div>
                  <div className="vibe-row">
                    {["Too weird", "Just right", "Too safe"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`vibe-button ${vibe === option ? "is-selected" : ""}`}
                        aria-pressed={vibe === option}
                        onClick={() => setVibe(option)}
                        disabled={!recommendation}
                      >{option}</button>
                    ))}
                  </div>
                  {recommendation && (
                    <button className="feedback-save" type="button" disabled={!rating || !vibe} onClick={saveFeedback}>
                      Save my reaction <Check size={14} />
                    </button>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </main>

      <footer className="footer">
        <span>MADE FOR THE PLEASURE OF GETTING LOST.</span>
        <span><span className="footer-dot" /> A little less of the same, please.</span>
        {recommendation && (
          <button type="button" className="another-pick" onClick={findSomethingUnexpected} disabled={loading}>
            <RotateCcw size={12} /> Another left turn
          </button>
        )}
      </footer>
    </div>
  );
}

export default App;
