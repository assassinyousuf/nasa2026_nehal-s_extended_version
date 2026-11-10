import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import type { GameState } from '../types/game';
import { getStudentMentorReply } from '../utils/studentMentor';

interface MissionMentorProps {
  gameState: GameState;
}

interface MentorMessage {
  id: number;
  role: 'mentor' | 'student';
  text: string;
}

const starterQuestions = [
  'Can you help me with this mission?',
  'Why do astronauts need power?',
  'What if I make a mistake?',
];

export const MissionMentor: React.FC<MissionMentorProps> = ({ gameState }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<MentorMessage[]>([
    {
      id: 0,
      role: 'mentor',
      text: 'Hi, Cadet! I’m your Mission Mentor. You don’t have to figure everything out alone—we can take one question at a time. What would you like help with?',
    },
  ]);
  const nextId = useRef(1);
  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = (text: string) => {
    const question = text.trim();
    if (!question || isThinking) return;

    setMessages((current) => [...current, { id: nextId.current++, role: 'student', text: question }]);
    setDraft('');
    setIsThinking(true);

    window.setTimeout(() => {
      const reply = getStudentMentorReply(question, {
        activeEvent: gameState.activeEvent,
        destination: gameState.destination,
        currentSol: gameState.currentSol,
        isGameOver: gameState.isGameOver,
      });
      setMessages((current) => [...current, { id: nextId.current++, role: 'mentor', text: reply }]);
      setIsThinking(false);
    }, 350);
  };

  return (
    <aside className="mission-mentor" aria-label="Student Mission Mentor">
      {isOpen ? (
        <section className="mission-mentor__panel" aria-labelledby="mission-mentor-title">
          <header className="mission-mentor__header">
            <div className="mission-mentor__avatar" aria-hidden="true"><Sparkles size={19} /></div>
            <div className="mission-mentor__identity">
              <h2 id="mission-mentor-title">Mission Mentor</h2>
              <p>Your friendly in-app guide</p>
            </div>
            <button
              type="button"
              className="mission-mentor__close"
              aria-label="Close Mission Mentor"
              onClick={() => setIsOpen(false)}
            >
              <X size={19} />
            </button>
          </header>

          <div className="mission-mentor__messages" ref={messageListRef} aria-live="polite" aria-label="Conversation">
            {messages.map((message) => (
              <div key={message.id} className={`mission-mentor__message mission-mentor__message--${message.role}`}>
                {message.role === 'mentor' && <span className="mission-mentor__speaker">MISSION MENTOR</span>}
                <p>{message.text}</p>
              </div>
            ))}
            {isThinking && (
              <p className="mission-mentor__thinking" role="status">I’m thinking it through with you…</p>
            )}
          </div>

          {messages.length === 1 && (
            <div className="mission-mentor__starters" aria-label="Suggested questions">
              {starterQuestions.map((question) => (
                <button type="button" key={question} onClick={() => sendMessage(question)}>
                  {question}
                </button>
              ))}
            </div>
          )}

          <form
            className="mission-mentor__form"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(draft);
            }}
          >
            <label className="mission-mentor__sr-only" htmlFor="mission-mentor-input">Ask your Mission Mentor</label>
            <input
              id="mission-mentor-input"
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="It’s okay to ask for help…"
              maxLength={500}
              disabled={isThinking}
            />
            <button type="submit" aria-label="Send message" disabled={!draft.trim() || isThinking}>
              <Send size={17} />
            </button>
          </form>
          <p className="mission-mentor__note">A learning guide, not a live person. Answers use prepared learning content.</p>
        </section>
      ) : (
        <div className="mission-mentor__launcher-wrap">
          <p className="mission-mentor__nudge">You’re not on this mission alone.</p>
          <button
            type="button"
            className="mission-mentor__launcher"
            aria-label="Open Mission Mentor for help"
            onClick={() => setIsOpen(true)}
          >
            <MessageCircle size={21} />
            <span>Ask your mentor</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default MissionMentor;
