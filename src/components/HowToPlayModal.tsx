import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Clock,
  Scale,
  FlaskConical,
  AlertTriangle,
  Zap,
  Wind,
  Droplets,
  Radio,
} from 'lucide-react';
import { soundFx } from '../utils/audioEffects';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CONSTRUCTION' | 'SURVIVAL' | 'ROVER' | 'SCORING'>('OVERVIEW');

  if (!isOpen) return null;

  const handleTabChange = (tab: any) => {
    soundFx.playClick(800);
    setActiveTab(tab);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '860px',
          maxHeight: '90dvh',
          backgroundColor: 'var(--color-paper)',
          border: '1px solid var(--rule-light)',
          borderRadius: 0,
          overflowY: 'auto',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--rule-subtle)',
            backgroundColor: 'var(--color-paper-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BookOpen size={20} style={{ color: 'var(--color-accent)' }} />
            <div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--color-accent)',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Flight Operations Manual / Standard Procedure
              </div>
              <h2
                className="modal-title"
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: 'var(--color-ink)',
                  margin: '2px 0 0',
                }}
              >
                Mission Directives: Jr_AstroCamp Beyond Earth
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close Guide"
            style={{
              background: 'transparent',
              border: '1px solid var(--rule-subtle)',
              color: 'var(--color-ink-muted)',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--rule-subtle)',
            backgroundColor: 'var(--color-paper-3)',
            padding: '0 16px',
            gap: '4px',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'OVERVIEW', label: '1. Objective' },
            { id: 'CONSTRUCTION', label: '2. Mass Budget' },
            { id: 'SURVIVAL', label: '3. ECLSS & Night' },
            { id: 'ROVER', label: '4. Rover Tele-Op' },
            { id: 'SCORING', label: '5. AIB Debrief' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === t.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                color: activeTab === t.id ? 'var(--color-accent)' : 'var(--color-ink-muted)',
                fontWeight: activeTab === t.id ? 700 : 500,
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {activeTab === 'OVERVIEW' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
                NASA Flight Operations Briefing
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-ink-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                You enter flight status alongside Commander Dadu and Cadet Maya to establish humanity’s primary deep-space outpost at the <strong>Lunar South Pole (Shackleton Rim)</strong> or <strong>Mars (Jezero Crater)</strong>.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '16px', backgroundColor: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <Clock size={18} style={{ color: 'var(--color-accent)', marginBottom: '8px' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-ink)' }}>30 Sols Duration</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-faint)', marginTop: '4px', lineHeight: 1.5 }}>Advance daily shifts and mitigate real NASA-modeled environmental hazards.</div>
                </div>

                <div style={{ padding: '16px', backgroundColor: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <Scale size={18} style={{ color: 'var(--color-accent-green)', marginBottom: '8px' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-ink)' }}>Strict Trade-Offs</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-faint)', marginTop: '4px', lineHeight: 1.5 }}>Every system decision has consequences. Emergency power protects battery reserves but suspends lab cycles.</div>
                </div>

                <div style={{ padding: '16px', backgroundColor: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <FlaskConical size={18} style={{ color: 'var(--color-accent)', marginBottom: '8px' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-ink)' }}>Authentic Physics</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-faint)', marginTop: '4px', lineHeight: 1.5 }}>Calibrated with NASA Baseline Values for Exploration (BVAD), LRO altimetry, and Kilopower reactor specifications.</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'CONSTRUCTION' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Outpost Construction &amp; Cargo Mass Allocation
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-ink-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
                Before launch, allocate within strict payload mass boundaries (<strong>45,000 kg</strong> Lunar Artemis Base Camp; <strong>60,000 kg</strong> Mars Surface Architecture):
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--color-ink-muted)', marginBottom: '18px' }}>
                <div style={{ padding: '8px 12px', background: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <strong>Habitat:</strong> Inflatable TransHab (8,000 kg) vs 3D-Printed Regolith Dome (14,000 kg)
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <strong>Power:</strong> Deployable PV Array (4,000 kg) vs Kilopower Fission Reactor (8,500 kg)
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <strong>Life Support:</strong> Standard Open-Loop ECLSS (4,500 kg) vs Closed-Loop Sabatier System (8,000 kg)
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <strong>Greenhouse:</strong> Salad Pod (4,000 kg) vs Full Crop Biome (7,500 kg)
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <strong>Rover:</strong> Unpressurized LTV Buggy (3,000 kg) vs Pressurized Science Mobile Hab (6,500 kg)
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--color-paper-2)', border: '1px solid var(--color-error)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', color: 'var(--color-ink)' }}>
                  <strong>Over-budget lock:</strong> If total payload mass exceeds rocket lift capacity, the flight computer aborts ignition until mass is resolved.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'SURVIVAL' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
                ECLSS Life Support &amp; Lunar Night Survival
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-ink-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
                The simulator monitors 6 continuous telemetry channels every Sol:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px', fontSize: '0.82rem' }}>
                <div style={{ padding: '12px', backgroundColor: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent)', fontWeight: 700, marginBottom: '4px' }}>
                    <Zap size={14} /> Power (0–100%)
                  </div>
                  <div style={{ color: 'var(--color-ink-faint)', lineHeight: 1.4 }}>Drives thermal loops and scrubbers. At 0%, critical systems freeze and mission fails.</div>
                </div>

                <div style={{ padding: '12px', backgroundColor: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent-2)', fontWeight: 700, marginBottom: '4px' }}>
                    <Wind size={14} /> Oxygen (0–100%)
                  </div>
                  <div style={{ color: 'var(--color-ink-faint)', lineHeight: 1.4 }}>Sabatier reactors recycle exhaled carbon dioxide. Keep scrubber efficiency above 60%.</div>
                </div>

                <div style={{ padding: '12px', backgroundColor: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent-2)', fontWeight: 700, marginBottom: '4px' }}>
                    <Droplets size={14} /> Water Buffer (0–100%)
                  </div>
                  <div style={{ color: 'var(--color-ink-faint)', lineHeight: 1.4 }}>WRS distillation recycling loop sustains potable and crop hydrologic balance.</div>
                </div>

                <div style={{ padding: '12px', backgroundColor: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-error)', fontWeight: 700, marginBottom: '4px' }}>
                    <Radio size={14} /> Mission Dose Budget (&lt; 100%, simulated)
                  </div>
                  <div style={{ color: 'var(--color-ink-faint)', lineHeight: 1.4 }}>Galactic cosmic rays and solar particle events accumulate without regolith shielding.</div>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--color-paper-2)', border: '1px solid var(--rule-light)', padding: '12px 16px', fontSize: '0.82rem', color: 'var(--color-ink)' }}>
                <strong>Lunar Night Survival:</strong> Sols 16 through 27 bring 354 continuous hours of night (-130°C). Solar generation drops to 0 kW. Stored battery reserves or nuclear Kilopower are mandatory.
              </div>
            </div>
          )}

          {activeTab === 'ROVER' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Rover Tele-Robotic Science Missions
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-ink-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
                Deploy active manual control of the Lunar Terrain Vehicle (LTV) from Mission Control:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--color-ink-muted)', marginBottom: '16px' }}>
                <div style={{ padding: '8px 12px', background: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <strong style={{ color: 'var(--color-ink)' }}>Navigation:</strong> Arrow Keys or WASD to accelerate, reverse, and steer.
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <strong style={{ color: 'var(--color-ink)' }}>Hazards:</strong> Avoid steep slopes and boulder fields to preserve chassis and suspension integrity.
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <strong style={{ color: 'var(--color-ink)' }}>Targeting:</strong> Follow radar telemetry vectors into Permanently Shadowed Regions (PSRs) to prospect volatile water ice.
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <strong style={{ color: 'var(--color-ink)' }}>Core Sampling:</strong> Align inside designated sampling coordinates and hold Space to extract core cylinders.
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <strong style={{ color: 'var(--color-ink)' }}>Telemetry Telemetry:</strong> Samples generate between +35 and +80 Science Points and Cadet XP towards promotion rank.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'SCORING' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Accident Investigation Board (AIB) &amp; Flight Evaluation
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-ink-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
                At Sol 30 completion or upon catastrophic anomaly, the NASA Evaluation Board compiles an explainable assessment:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--color-ink-muted)', marginBottom: '16px' }}>
                <div style={{ padding: '10px 14px', background: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <strong style={{ color: 'var(--color-accent-green)' }}>Mission Success:</strong> Survived 30 Sols, fulfilled primary science goals, and held crew vitals above 50%.
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <strong style={{ color: 'var(--color-accent)' }}>Marginal Return:</strong> Base survived, but secondary scientific milestones or safety buffers were compromised.
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <strong style={{ color: 'var(--color-error)' }}>Mission Abort:</strong> A vital resource is depleted or the simulated mission dose budget reaches 100%. This is a game limit, not a medical threshold.
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--color-paper-2)', border: '1px solid var(--rule-subtle)' }}>
                  <strong style={{ color: 'var(--color-ink)' }}>Causal Analysis:</strong> The root-cause decision tree reveals the chain of operational trade-offs leading to the final status.
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid var(--rule-subtle)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: 0,
                border: '1px solid var(--color-accent)',
                backgroundColor: 'var(--color-accent)',
                color: '#000000',
                fontWeight: 700,
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Acknowledge Directive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
