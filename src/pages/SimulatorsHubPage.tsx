import React, { useState } from 'react';
import type { AppRoute } from '../router/useAppRouter';
import { SpaceGamesHubModal } from '../components/SpaceGamesHubModal';
import { MarsEDLSimulatorModal } from '../components/MarsEDLSimulatorModal';
import { MoonbaseAlphaSimulator } from '../components/MoonbaseAlphaSimulator';
import { BlackHoleSimulator } from '../components/BlackHoleSimulator';
import { EarthToMoonExpeditionModal } from '../components/EarthToMoonExpeditionModal';
import { RoverExplorationModal } from '../components/RoverExplorationModal';
import { MoonquakeMapModal } from '../components/MoonquakeMapModal';
import { soundFx } from '../utils/audioEffects';
import {
  Gamepad2,
  Flame,
  Globe,
  Radio,
  Compass,
  Rocket,
  Activity,
} from 'lucide-react';

export type SimulatorTab =
  | 'SPACE_SUITE'
  | 'MARS_EDL'
  | 'MOONBASE'
  | 'BLACK_HOLE'
  | 'EXPEDITION'
  | 'ROVER'
  | 'MOONQUAKE';

export interface SimulatorsHubPageProps {
  initialSimulator?: string;
  onNavigate: (route: AppRoute, params?: Record<string, string>) => void;
  onCompleteRoverMission?: (earnedScience: number, earnedXp: number, summary: string) => void;
}

export const SimulatorsHubPage: React.FC<SimulatorsHubPageProps> = ({
  initialSimulator,
  onNavigate,
  onCompleteRoverMission,
}) => {
  const getInitialTab = (sim?: string): SimulatorTab => {
    switch (sim) {
      case 'mars-edl': return 'MARS_EDL';
      case 'moonbase': return 'MOONBASE';
      case 'black-hole': return 'BLACK_HOLE';
      case 'expedition': return 'EXPEDITION';
      case 'rover': return 'ROVER';
      case 'moonquake': return 'MOONQUAKE';
      default: return 'SPACE_SUITE';
    }
  };

  const [activeTab, setActiveTab] = useState<SimulatorTab>(() => getInitialTab(initialSimulator));

  const tabs: { id: SimulatorTab; label: string; icon: React.ReactNode; desc: string; tag: string }[] = [
    {
      id: 'SPACE_SUITE',
      label: '3D Space Flight Suite',
      icon: <Gamepad2 size={16} />,
      desc: 'Cadet NMS Surface, Officer KSP Orbital Burns & Commander SC 6-DOF',
      tag: 'FLAGSHIP',
    },
    {
      id: 'MARS_EDL',
      label: 'Mars 2020 EDL',
      icon: <Flame size={16} />,
      desc: '7 Minutes of Terror: Heat shield, supersonic parachute & skycrane',
      tag: 'PHYSICS',
    },
    {
      id: 'MOONBASE',
      label: 'Moonbase Alpha 3D',
      icon: <Globe size={16} />,
      desc: 'Shackleton Base surface life-support, power array & lunar modules',
      tag: 'OUTPOST',
    },
    {
      id: 'BLACK_HOLE',
      label: 'Black Hole Lab',
      icon: <Radio size={16} />,
      desc: 'General relativistic gravitational lensing, event horizon & accretion disk',
      tag: 'ASTROPHYSICS',
    },
    {
      id: 'EXPEDITION',
      label: 'Earth-to-Moon Flight',
      icon: <Rocket size={16} />,
      desc: 'Translunar injection trajectory, orbital mechanics & lunar capture',
      tag: 'TRAJECTORY',
    },
    {
      id: 'ROVER',
      label: 'Surface Rover EVA',
      icon: <Compass size={16} />,
      desc: 'Drive the VIPER/Perseverance lunar rover across extreme craters',
      tag: 'SORTIE',
    },
    {
      id: 'MOONQUAKE',
      label: 'Moonquake Seismology',
      icon: <Activity size={16} />,
      desc: '3D Apollo seismic sensor network & lunar interior heat dissipation',
      tag: 'SEISMOLOGY',
    },
  ];

  const handleSelectTab = (tab: SimulatorTab) => {
    soundFx.playClick(750);
    setActiveTab(tab);
  };

  return (
    <div className="page-simulators-hub" style={{
      minHeight: 'calc(100dvh - 52px)',
      background: 'var(--color-paper)',
      color: 'var(--color-ink)',
      padding: '20px 24px 60px',
    }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header Bar */}
        <div style={{
          background: 'var(--color-paper-2)',
          border: 'var(--rule-hair) solid var(--color-rule)',
          borderRadius: 'var(--radius-card)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <div style={{
              fontSize: '11px',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              letterSpacing: 'normal',
              color: 'var(--color-accent)',
            }}>
              NASA Flight Test Corps • Interactive 3D Simulation Hangar
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '2px 0 0', color: 'var(--color-ink)', fontFamily: 'var(--font-display)' }}>
              Advanced Space Simulators &amp; Physics Laboratories
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => onNavigate('home')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-card)',
                background: 'var(--color-paper-card)',
                border: 'var(--rule-hair) solid var(--color-rule)',
                color: 'var(--color-ink)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Return to 3D Solar System Orrery Home"
            >
              <Compass size={14} style={{ color: 'var(--color-accent-2)' }} />
              <span>← Home (3D Orrery)</span>
            </button>


          </div>
        </div>

        {/* Simulator Selector Tabs Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '8px',
        }}>
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleSelectTab(t.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-card)',
                  background: isActive ? 'var(--color-paper-3)' : 'var(--color-paper-2)',
                  border: isActive ? '1px solid var(--color-accent)' : 'var(--rule-hair) solid var(--color-rule)',
                  color: isActive ? 'var(--color-ink)' : 'var(--color-muted)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'opacity 0.15s ease, background-color 0.15s ease, border-color 0.15s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                  <span style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-muted)' }}>{t.icon}</span>
                  <span style={{
                    fontSize: '9.5px',
                    fontFamily: 'var(--font-outlier)',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-pill)',
                    background: isActive ? 'var(--color-accent-ink)' : 'var(--color-paper-card)',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-muted)',
                    border: '1px solid var(--color-rule)',
                  }}>
                    {t.tag}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: isActive ? '#ffffff' : '#e2e8f0' }}>
                  {t.label}
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '3px', lineHeight: 1.3 }}>
                  {t.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Simulator Mount */}
        <div style={{
          minHeight: '680px',
          borderRadius: '8px',
          overflow: 'hidden',
          background: 'rgba(7, 12, 22, 0.95)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          position: 'relative',
        }}>
          {activeTab === 'SPACE_SUITE' && (
            <SpaceGamesHubModal
              isOpen={true}
              onClose={() => {}}
              isFullPage={true}
            />
          )}

          {activeTab === 'MARS_EDL' && (
            <MarsEDLSimulatorModal
              isOpen={true}
              onClose={() => {}}
            />
          )}

          {activeTab === 'MOONBASE' && (
            <MoonbaseAlphaSimulator
              isOpen={true}
              onClose={() => {}}
            />
          )}

          {activeTab === 'BLACK_HOLE' && (
            <BlackHoleSimulator
              isOpen={true}
              onClose={() => {}}
            />
          )}

          {activeTab === 'EXPEDITION' && (
            <EarthToMoonExpeditionModal
              isOpen={true}
              onClose={() => {}}
            />
          )}

          {activeTab === 'ROVER' && (
            <RoverExplorationModal
              isOpen={true}
              onClose={() => {}}
              destinationName="Shackleton Crater"
              isMoon={true}
              onCompleteRoverMission={onCompleteRoverMission}
            />
          )}

          {activeTab === 'MOONQUAKE' && (
            <MoonquakeMapModal
              isOpen={true}
              onClose={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulatorsHubPage;
