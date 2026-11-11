import React, { useState, useEffect } from 'react';
import type { TeachingFlashcard } from '../data/teachingFlashcards';
import type { DifficultyTier } from '../data/difficultyTiers';
import {
  X,
  Volume2,
  VolumeX,
  BookMarked,
  Check,
  Sparkles,
  FileText,
  HelpCircle
} from 'lucide-react';
import { soundFx } from '../utils/audioEffects';
import { speechEngine } from '../utils/speechEngine';

interface AudioTeachingFlashcardProps {
  card: TeachingFlashcard | null;
  isOpen: boolean;
  onClose: () => void;
  tier: DifficultyTier;
  onSaveToNotebook: (card: TeachingFlashcard) => void;
  isSaved?: boolean;
}

export const AudioTeachingFlashcard: React.FC<AudioTeachingFlashcardProps> = ({
  card,
  isOpen,
  onClose,
  tier,
  onSaveToNotebook,
  isSaved = false
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      speechEngine.stop();
    }
  }, [isOpen]);

  if (!isOpen || !card) return null;

  const handleClose = () => {
    if (isSpeaking) {
      speechEngine.stop();
      setIsSpeaking(false);
    }
    onClose();
  };

  const currentTierContent = card.ageAdaptations[tier] || card.ageAdaptations.CADET;

  const handleSpeak = () => {
    if (isSpeaking) {
      speechEngine.stop();
      setIsSpeaking(false);
      return;
    }

    const fullAudioText = `${card.title}. ${currentTierContent.text} Key takeaway: ${currentTierContent.keyTakeaway}`;
    setIsSpeaking(true);
    speechEngine.speak(
      fullAudioText,
      'CADET_MAYA',
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  };

  const handleSave = () => {
    soundFx.playTelemetryChirp();
    onSaveToNotebook(card);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={handleClose} style={{ zIndex: 1001 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '620px',
          overflow: 'hidden',
          padding: 0,
          backgroundColor: 'var(--color-paper-2)',
          border: 'var(--rule-hair) solid var(--color-rule)',
          borderRadius: '0px',
        }}
      >
        {/* Top Header Banner */}
        <div style={{
          backgroundColor: 'var(--color-paper-3)',
          borderBottom: 'var(--rule-hair) solid var(--color-rule)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '2rem' }}>{card.emoji}</span>
            <div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-outlier)', color: 'var(--color-accent-2)' }}>
                NASA SCIENCE FLASHCARD · {card.category}
              </div>
              <h2 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
                {card.title}
              </h2>
            </div>
          </div>
          <button onClick={handleClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        {/* Card Body */}
        <div style={{ padding: '20px 24px' }}>
          {/* Audio Voiceover Bar */}
          <div style={{
            backgroundColor: 'var(--color-paper-card)',
            border: 'var(--rule-hair) solid var(--color-rule)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Volume2 size={16} color={isSpeaking ? 'var(--color-accent-green)' : 'var(--color-accent-2)'} />
              <span style={{ fontSize: '12px', color: 'var(--color-ink-2)' }}>
                {isSpeaking ? 'Voice Teacher is speaking...' : 'Listen to CapCom voice lesson'}
              </span>
            </div>
            <button
              onClick={handleSpeak}
              className={isSpeaking ? 'hm-btn-secondary' : 'hm-btn-primary'}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                fontFamily: 'var(--font-outlier)',
              }}
            >
              {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
              <span>{isSpeaking ? 'Pause' : 'Read Aloud'}</span>
            </button>
          </div>

          {/* Equation or Formula Pill (if available) */}
          {card.equationOrFormula && (
            <div style={{
              backgroundColor: 'var(--color-paper-3)',
              border: 'var(--rule-hair) solid var(--color-rule)',
              padding: '10px 14px',
              fontFamily: 'var(--font-outlier)',
              fontSize: '13px',
              color: 'var(--color-accent-2)',
              marginBottom: '16px',
              textAlign: 'center',
              fontWeight: 700
            }}>
              {card.equationOrFormula}
            </div>
          )}

          {/* Age-Tier Adapted Lesson */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent)', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-outlier)', marginBottom: '6px' }}>
              <Sparkles size={13} />
              <span>THE SCIENCE LESSON:</span>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--color-ink-2)', lineHeight: 1.55, margin: 0 }}>
              {currentTierContent.text}
            </p>
          </div>

          {/* Key Takeaway Box */}
          <div style={{
            backgroundColor: 'var(--color-paper-3)',
            borderLeft: '2px solid var(--color-accent-green)',
            borderTop: 'var(--rule-hair) solid var(--color-rule)',
            borderRight: 'var(--rule-hair) solid var(--color-rule)',
            borderBottom: 'var(--rule-hair) solid var(--color-rule)',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginBottom: '18px'
          }}>
            <HelpCircle size={16} color="var(--color-accent-green)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-accent-green)', fontFamily: 'var(--font-outlier)' }}>
                Key STEM Takeaway:
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: 600, marginTop: '2px' }}>
                {currentTierContent.keyTakeaway}
              </div>
            </div>
          </div>

          {/* NASA Document Citation */}
          <div style={{
            fontSize: '11px',
            color: 'var(--color-muted)',
            fontFamily: 'var(--font-outlier)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '18px'
          }}>
            <FileText size={13} />
            <span>Ref: {card.nasaDocReference}</span>
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={onClose} className="hm-btn-secondary" style={{ padding: '6px 14px', fontSize: '11px', fontFamily: 'var(--font-outlier)' }}>
              Close Card
            </button>
            <button
              onClick={handleSave}
              className={isSaved || justSaved ? 'hm-btn-secondary' : 'hm-btn-primary'}
              style={{
                padding: '8px 16px',
                fontSize: '11px',
                fontFamily: 'var(--font-outlier)',
              }}
            >
              {isSaved || justSaved ? <Check size={14} /> : <BookMarked size={14} />}
              <span>{isSaved || justSaved ? 'Saved in Flight Notebook' : 'Save to Flight Notebook'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
