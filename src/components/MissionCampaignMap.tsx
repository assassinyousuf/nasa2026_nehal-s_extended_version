// ============================================================
// MissionCampaignMap — Interactive Earth-to-Space 76 Mission Campaign Map
// Visual timeline & mission selector spanning all eras of NASA history
// Powered by Three.js 3D WebGL Globe & Glassmorphic Aerospace UI
// ============================================================
import React, { useState } from 'react';
import {
  Rocket,
  Compass,
  Sparkles,
  Bot,
  Eye,
  CheckCircle2,
  Play,
  Trophy,
  Star,
  Search,
} from 'lucide-react';
import { MISSION_GAME_DATA, type MissionGameConfig, type GameType } from '../game/missionGameData';

const isHistoricalMission = (mission: MissionGameConfig) => /^NASA-M\d{3}$/.test(mission.id);
const historicalMissionCount = MISSION_GAME_DATA.filter(isHistoricalMission).length;
const trainingScenarioCount = MISSION_GAME_DATA.length - historicalMissionCount;
const missionYear = (mission: MissionGameConfig) => Number.parseInt(mission.year, 10);

interface MissionCampaignMapProps {
  completedMissions: string[];
  onLaunchMission: (missionId: string) => void;
  onClose?: () => void;
}

const CampaignGlobePreview: React.FC = () => {
  return (
    <div className="campaign-hero-globe-wrap" aria-hidden="true">
      <span className="campaign-globe-orbit" />
      <span className="campaign-globe-satellite" />
    </div>
  );
};

export const MissionCampaignMap: React.FC<MissionCampaignMapProps> = ({
  completedMissions,
  onLaunchMission,
}) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Keep the historical eras mutually exclusive so every catalog entry appears once.
  const eras = [
    {
      id: 'first-flights',
      title: 'First Flights',
      subtitle: 'Mercury to Gemini · 1961–1966',
      filter: (m: MissionGameConfig) => isHistoricalMission(m) && missionYear(m) <= 1966,
    },
    {
      id: 'moonshot',
      title: 'Moonshot & Space Stations',
      subtitle: 'Apollo, Surveyor & Skylab · 1967–1975',
      filter: (m: MissionGameConfig) => isHistoricalMission(m) && missionYear(m) >= 1967 && missionYear(m) <= 1975,
    },
    {
      id: 'shuttle-deep-space',
      title: 'Shuttle & Deep Space',
      subtitle: 'Reusable flight, planetary probes & observatories · 1976–1999',
      filter: (m: MissionGameConfig) => isHistoricalMission(m) && missionYear(m) >= 1976 && missionYear(m) <= 1999,
    },
    {
      id: 'modern-exploration',
      title: 'Modern Exploration',
      subtitle: 'Robotic worlds, orbiting labs & astronomy · 2000–2019',
      filter: (m: MissionGameConfig) => isHistoricalMission(m) && missionYear(m) >= 2000 && missionYear(m) <= 2019,
    },
    {
      id: 'current-era',
      title: 'Artemis & Current Missions',
      subtitle: 'Current and recent NASA programs · 2020–present',
      filter: (m: MissionGameConfig) => isHistoricalMission(m) && missionYear(m) >= 2020,
    },
    {
      id: 'training-scenarios',
      title: 'AstroCamp Training Scenarios',
      subtitle: 'Original practice missions · game simulations',
      filter: (m: MissionGameConfig) => !isHistoricalMission(m),
    },
  ];

  const getGameTypeIcon = (type: GameType) => {
    switch (type) {
      case 'launch':
        return <Rocket size={12} color="#34d399" />;
      case 'docking':
        return <Compass size={12} color="#38bdf8" />;
      case 'lunar_landing':
        return <Sparkles size={12} color="#fbbf24" />;
      case 'rover':
        return <Bot size={12} color="#fb923c" />;
      case 'telescope':
        return <Eye size={12} color="#c084fc" />;
      case 'deep_space':
        return <Sparkles size={12} color="#818cf8" />;
    }
  };

  const filteredMissions = MISSION_GAME_DATA.filter((m) => {
    const matchesFilter =
      selectedTypeFilter === 'all' || m.gameType === selectedTypeFilter;
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesSearch =
      m.missionName.toLowerCase().includes(normalizedQuery) ||
      m.programName.toLowerCase().includes(normalizedQuery) ||
      m.year.toLowerCase().includes(normalizedQuery);
    return matchesFilter && matchesSearch;
  });

  const completedMissionSet = new Set(
    completedMissions.filter((id) => MISSION_GAME_DATA.some((mission) => mission.id === id))
  );
  const completionPct = Math.round((completedMissionSet.size / MISSION_GAME_DATA.length) * 100);
  const typeCounts = new Map<GameType, number>();
  MISSION_GAME_DATA.forEach(({ gameType }) => typeCounts.set(gameType, (typeCounts.get(gameType) ?? 0) + 1));

  return (
    <div className="campaign-map-root">
      {/* ─── Hero Banner & Campaign Progress ─── */}
      <div className="campaign-hero-banner">
        <div className="campaign-hero-top">
          <div className="campaign-hero-info">
            <div className="campaign-hero-tag-row">
              <span className="campaign-hero-tag">
                {historicalMissionCount} HISTORICAL NASA MISSIONS · {trainingScenarioCount} ASTROCAMP SCENARIOS
              </span>
              <span className="campaign-hero-pill">1961 — PRESENT</span>
            </div>
            <h2 className="campaign-hero-title">Choose your next flight</h2>
            <p className="campaign-hero-desc">
              Explore NASA mission history, then fly short training simulations inspired by each mission.
              Game controls and physics are simplified for play; they are not flight-qualified models.
            </p>
          </div>

          <div className="campaign-hero-right">
            <CampaignGlobePreview />

            <div className="campaign-progress-badge">
              <div className="campaign-progress-icon">
                <Trophy size={22} />
              </div>
              <div>
                <div className="campaign-progress-numbers">
                  <span className="campaign-progress-count">{completedMissionSet.size}</span>
                  <span className="campaign-progress-total">/ {MISSION_GAME_DATA.length} FLIGHTS</span>
                </div>
                <div className="campaign-progress-status">
                  {completionPct}% COMPLETE
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          className="campaign-progress-bar-track"
          role="progressbar"
          aria-label="Campaign flights completed"
          aria-valuemin={0}
          aria-valuemax={MISSION_GAME_DATA.length}
          aria-valuenow={completedMissionSet.size}
        >
          <div
            className="campaign-progress-bar-fill"
            style={{ width: `${completionPct}%` }}
          />
        </div>

        {/* Filter Controls & Search */}
        <div className="campaign-toolbar">
          <div className="campaign-filter-tabs" role="group" aria-label="Filter missions by flight type">
            {[
              { id: 'all', label: `All ${MISSION_GAME_DATA.length}`, count: MISSION_GAME_DATA.length },
              { id: 'launch', label: 'Launch', count: typeCounts.get('launch') ?? 0 },
              { id: 'docking', label: 'Docking', count: typeCounts.get('docking') ?? 0 },
              { id: 'lunar_landing', label: 'Landing', count: typeCounts.get('lunar_landing') ?? 0 },
              { id: 'rover', label: 'Rover', count: typeCounts.get('rover') ?? 0 },
              { id: 'telescope', label: 'Telescope', count: typeCounts.get('telescope') ?? 0 },
              { id: 'deep_space', label: 'Deep Space', count: typeCounts.get('deep_space') ?? 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTypeFilter(tab.id)}
                className={`campaign-tab-btn ${selectedTypeFilter === tab.id ? 'active' : ''}`}
                aria-pressed={selectedTypeFilter === tab.id}
              >
                <span>{tab.label}</span>
                <span className="campaign-tab-count">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="campaign-search-box">
            <Search size={14} className="campaign-search-icon" />
            <input
              type="text"
              aria-label="Search missions"
              placeholder={`Search ${MISSION_GAME_DATA.length} flights by name, year, or program`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="campaign-search-input"
            />
          </div>
        </div>
        <p className="campaign-result-count" aria-live="polite">
          Showing {filteredMissions.length} of {MISSION_GAME_DATA.length} flights · {historicalMissionCount} historical NASA missions and {trainingScenarioCount} original training scenarios
        </p>
      </div>

      {/* ─── Eras & Mission Grid ─── */}
      <div className="campaign-eras-container">
        {eras.map((era) => {
          const eraMissions = filteredMissions.filter(era.filter);
          if (eraMissions.length === 0) return null;
          const eraCompleted = eraMissions.filter((mission) => completedMissionSet.has(mission.id)).length;

          return (
            <section key={era.id} className="campaign-era-section" aria-label={era.title}>
              <div className="campaign-era-header">
                <span className="campaign-era-dot" />
                <div className="campaign-era-copy">
                  <h3 className="campaign-era-title">{era.title}</h3>
                  <span className="campaign-era-sub">{era.subtitle}</span>
                </div>
                <span className="campaign-era-count">{eraCompleted}/{eraMissions.length} complete</span>
              </div>

              <div className="campaign-grid">
                {eraMissions.map((mission) => {
                  const isDone = completedMissionSet.has(mission.id);
                  const isTrainingScenario = !isHistoricalMission(mission);

                  return (
                    <article
                      key={mission.id}
                      className={`campaign-card ${isDone ? 'completed' : ''}`}
                    >
                      <div>
                        <div className="campaign-card-top">
                          <span className="campaign-type-pill">
                            {getGameTypeIcon(mission.gameType)}
                            <span>{mission.gameType.replace(/_/g, ' ')}</span>
                          </span>
                          <div className="campaign-card-meta">
                            <span className={`campaign-record-tag ${isTrainingScenario ? 'training' : ''}`}>
                              {isTrainingScenario ? 'PRACTICE' : 'NASA HISTORY'}
                            </span>
                            <span className="campaign-year-tag">
                              {mission.year}
                              {isDone && <CheckCircle2 size={14} aria-label="Completed" />}
                            </span>
                          </div>
                        </div>

                        <h4 className="campaign-card-title">{mission.missionName}</h4>
                        <p className="campaign-card-program">{mission.programName}</p>
                        <p className="campaign-card-desc">{mission.objective}</p>
                        <p className="campaign-card-fact">{mission.funFact}</p>
                      </div>

                      <div className="campaign-card-bottom">
                        <div className="campaign-difficulty" aria-label={`Difficulty ${mission.difficulty} of 5`}>
                          <div className="campaign-star-row" aria-hidden="true">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={13}
                              fill={star <= mission.difficulty ? 'currentColor' : 'none'}
                              className={star <= mission.difficulty ? 'is-filled' : ''}
                            />
                          ))}
                          </div>
                          <span>Level {mission.difficulty}/5</span>
                        </div>

                        <button
                          onClick={() => onLaunchMission(mission.id)}
                          className="campaign-play-btn"
                          aria-label={`${isDone ? 'Replay' : 'Start'} ${mission.missionName}`}
                        >
                          <span>{isDone ? 'Fly again' : 'Start mission'}</span>
                          <Play size={14} fill="currentColor" aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
        {filteredMissions.length === 0 && (
          <div className="campaign-empty-state" role="status">
            <Search size={22} aria-hidden="true" />
            <strong>No flights match that search.</strong>
            <span>Try another mission name, year, program, or flight type.</span>
          </div>
        )}
      </div>
    </div>
  );
};
