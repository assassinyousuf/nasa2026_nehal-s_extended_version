import React from 'react';
import type { AppRoute } from '../router/useAppRouter';
import { MissionCampaignMap } from '../components/MissionCampaignMap';
import { Rocket } from 'lucide-react';
import { soundFx } from '../utils/audioEffects';
import type { ShackletonProgress } from '../utils/shackletonProgress';

export interface MissionCampaignPageProps {
  completedMissions: string[];
  onLaunchMission: (missionId: string) => void;
  onLaunchShackleton: () => void;
  shackletonProgress: ShackletonProgress;
  onNavigate: (route: AppRoute, params?: Record<string, string>) => void;
}

export const MissionCampaignPage: React.FC<MissionCampaignPageProps> = ({
  completedMissions,
  onLaunchMission,
  onLaunchShackleton,
  shackletonProgress,
  onNavigate,
}) => {
  return (
    <div className="page-mission-campaign">
      <div className="mission-campaign-layout">
        <section className="campaign-featured-mission" aria-label="Featured training mission">
          <div className="campaign-featured-copy">
            <span className="campaign-featured-kicker">FEATURED TRAINING RUN · GAME SIMULATION</span>
            <h2>Shackleton Ice Run</h2>
            <p>
              Drive a lunar rover, manage battery and heat, and collect practice ice samples.
              Terrain and readings are simulated, not NASA measurements.
            </p>
            <div className="campaign-featured-stock">
              <span>{shackletonProgress.waterStockUnits} water units</span>
              <span>{shackletonProgress.fuelStockUnits} fuel units</span>
              <span>{shackletonProgress.iceFinderBadgeEarned ? 'Ice Finder badge earned' : 'Badge available'}</span>
            </div>
          </div>
          <div className="campaign-featured-actions">
            <button
              type="button"
              className="campaign-featured-launch"
              onClick={() => {
                onLaunchShackleton();
                soundFx.playClick(850);
              }}
            >
              <Rocket size={16} aria-hidden="true" />
              <span>Start Ice Run</span>
            </button>
            <button
              type="button"
              className="campaign-featured-school"
              onClick={() => {
                onNavigate('academy');
                soundFx.playClick(750);
              }}
            >
              Ground school
            </button>
          </div>
        </section>

        <div className="campaign-catalog-shell">
          <MissionCampaignMap
            completedMissions={completedMissions}
            onLaunchMission={onLaunchMission}
          />
        </div>
      </div>
    </div>
  );
};

export default MissionCampaignPage;
