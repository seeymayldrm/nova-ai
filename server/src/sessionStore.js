const MAX_TURNS = 12;
const MAX_SESSIONS = 200;
const SESSION_TTL_MS = 1000 * 60 * 60 * 6;

const sessions = new Map();

function cleanup() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.updatedAt > SESSION_TTL_MS) sessions.delete(id);
  }

  if (sessions.size > MAX_SESSIONS) {
    const oldest = [...sessions.entries()]
      .sort((a, b) => a[1].updatedAt - b[1].updatedAt)
      .slice(0, sessions.size - MAX_SESSIONS);
    for (const [id] of oldest) sessions.delete(id);
  }
}

function userStep(message) {
  return {
    type: "user_input",
    content: [{ type: "text", text: message }]
  };
}

export function buildInteractionInput(sessionId, currentMessage) {
  cleanup();
  const session = sessions.get(sessionId);
  const turns = session?.turns ?? [];

  return [
    ...turns.flatMap((turn) => [turn.userStep, ...turn.modelSteps]),
    userStep(currentMessage)
  ];
}

export function saveInteractionTurn(sessionId, message, modelSteps = []) {
  const session = sessions.get(sessionId) ?? {
    turns: [],
    updatedAt: Date.now()
  };

  session.turns.push({
    userStep: userStep(message),
    modelSteps
  });
  session.turns = session.turns.slice(-MAX_TURNS);
  session.updatedAt = Date.now();
  sessions.set(sessionId, session);
}

export function resetSession(sessionId) {
  sessions.delete(sessionId);
}
