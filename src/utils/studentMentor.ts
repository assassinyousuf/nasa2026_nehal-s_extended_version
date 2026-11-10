import type { GameState, MissionEvent } from '../types/game';

export interface StudentMentorContext {
  activeEvent: MissionEvent | null;
  destination: GameState['destination'];
  currentSol: number;
  isGameOver: boolean;
}

const NASA_SOURCES = {
  lifeSupport: 'NASA Baseline Values and Assumptions Document (BVAD): https://ntrs.nasa.gov/citations/20150002905',
  lunar: 'NASA Lunar Reconnaissance Orbiter (LOLA): https://lola.gsfc.nasa.gov/',
  power: 'NASA Kilopower: https://www.nasa.gov/directorates/stmd/game-changing-development-program/kilopower/',
  radiation: 'NASA DONKI: https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
};

function currentEventReply(event: MissionEvent | null, context: StudentMentorContext): string {
  if (!event) {
    return `You’re on Sol ${context.currentSol} at the ${context.destination === 'MARS' ? 'Mars' : 'Moon'} outpost. There isn’t a choice card open right now, but we can still work through a topic together. What feels tricky?`;
  }

  const choices = event.options
    .map((option, index) => `${index + 1}. ${option.title}: ${option.description} Trade-off: ${option.tradeOffText}`)
    .join('\n');

  return `You’re not alone, Cadet—we can take this one step at a time. This is ${event.title}.\n\n${event.options.length ? `Here are your choices:\n${choices}\n\nThere may not be a perfect choice. Look at which resource each option protects and what it costs, then choose the trade-off that best fits your mission.` : 'Let’s look at the mission together. What resource or consequence are you most concerned about?'}\n\n${event.nasaCitation.title ? `Science reference: ${event.nasaCitation.title} (${event.nasaCitation.docNumber}).` : ''}`;
}

export function getStudentMentorReply(
  message: string,
  context: StudentMentorContext,
): string {
  const question = message.trim().toLowerCase();
  if (!question) return 'I’m here with you. What would you like to figure out?';

  if (/\b(lonely|alone|scared|nervous|worried|sad|frustrat|give up|can't do|cannot do)\b/.test(question)) {
    return 'It’s okay to feel stuck—space missions are challenging, and you don’t have to solve everything at once. I’m here to help you think it through. Let’s start with one small question: which part feels hardest right now?';
  }

  if (/\b(help|what should i do|what do i do|which choice|choose|decision|current mission|current event)\b/.test(question)) {
    return currentEventReply(context.activeEvent, context);
  }

  if (/\b(oxygen|water|life support|bvad|air|breathe)\b/.test(question)) {
    return `Life support keeps the crew supplied with essentials like breathable oxygen and water. These supplies are limited, so recycling can help—but the system still needs power and maintenance. NASA’s BVAD publishes life-support planning baselines; the resource changes you see in the game are simplified for play.\n\nSource: ${NASA_SOURCES.lifeSupport}\n\nWant to connect that to the choice in your current mission?`;
  }

  if (/\b(power|solar|battery|lunar night|kilopower|energy)\b/.test(question)) {
    return `Power is a mission-wide trade-off: the habitat, communications, science tools, and life-support equipment all need it. Solar panels can be affected by darkness or dust, so storing energy or having another power source can help—but every system has a cost. NASA’s Kilopower work studies fission power for space exploration; game resource changes are simulated.\n\nSource: ${NASA_SOURCES.power}\n\nWhat would you want to keep powered first, and why?`;
  }

  if (/\b(radiation|solar flare|cme|space weather|shield)\b/.test(question)) {
    const dataLabel = context.activeEvent?.dataAttribution?.label;
    const dataNote = dataLabel === 'LIVE' || dataLabel === 'ARCHIVED'
      ? `This mission card is linked to a ${dataLabel.toLowerCase()} DONKI record.`
      : 'This mission’s radiation effects are a game scenario, not a medical measurement.';
    return `Radiation is energy from space that crews and spacecraft need to plan for. A shelter or shielding can help, but may use supplies or time. ${dataNote} The game’s radiation meter is not a real dose or a medical limit.\n\nSource: ${NASA_SOURCES.radiation}\n\nWould you like to compare the shielding choices in your mission?`;
  }

  if (/\b(food|plant|greenhouse|grow|crop)\b/.test(question)) {
    return 'Food planning is about more than growing plants: a greenhouse needs power, water, time, and care, while stored food takes space and has to last. Try comparing what each food choice gives the crew with what it uses. Those game quantities are simplified, so treat them as practice—not real astronaut ration instructions.';
  }

  if (/\b(communicat|delay|signal|light.?time|mars)\b/.test(question)) {
    return 'Messages cannot travel instantly across space. The farther away a spacecraft is, the longer a message can take to arrive, so crews and robots need plans for moments when they cannot wait for Earth to reply. What decision would you want the crew to be ready to make on their own?';
  }

  if (/\b(terrain|moon|luna|ice|rover|crater|lola)\b/.test(question)) {
    return `A rover team weighs a route’s science value against its terrain, time, and energy costs. NASA’s LOLA instrument mapped lunar elevation, which helps scientists study the Moon’s surface. The route and sensor readings in this practice game are simulated, not samples from a LOLA map.\n\nSource: ${NASA_SOURCES.lunar}\n\nWhat might make a route worth the extra effort?`;
  }

  if (/\b(orbit|gravity|rocket|launch|thrust|dock)\b/.test(question)) {
    return 'A useful way to learn spaceflight is to make a prediction, try a control, then compare what happened. For example, orbit is not a place without gravity: a spacecraft keeps falling while moving sideways fast enough to keep missing the ground. Which part would you like to explore—launch, orbit, or docking?';
  }

  if (/\b(fail|lost|game over|wrong|mistake|retry|reset)\b/.test(question) || context.isGameOver) {
    return 'A tough outcome is not a verdict on you—it’s useful mission data. Real teams study what happened, adjust their plan, and try again. In this simulation, look at the resource that changed first and trace which earlier choice affected it. What did you notice?';
  }

  if (/\b(nasa|source|data|real|accurate)\b/.test(question)) {
    const event = context.activeEvent;
    if (event?.dataAttribution?.label === 'LIVE' || event?.dataAttribution?.label === 'ARCHIVED') {
      return `This event is labeled ${event.dataAttribution.label}. ${event.dataAttribution.recordId ? `Its record ID is ${event.dataAttribution.recordId}. ` : ''}The game may simplify how that observation affects resources, so the gameplay effect is not itself a NASA measurement.${event.dataAttribution.sourceUrl ? `\n\nSource record: ${event.dataAttribution.sourceUrl}` : ''}`;
    }
    return 'Great question—knowing where information comes from matters. Some lessons use NASA references, and some values in the simulation are invented for practice. Check the NASA Data panel for citations and the mission card for whether an event is live, archived, or a game simulation. Which topic should we check together?';
  }

  return 'I’m glad you asked. I can help with your current mission, oxygen and water, power, radiation, food, communication delays, rovers, or spaceflight. If something feels confusing, tell me which part and we’ll work through it together.';
}
