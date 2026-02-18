from app.domain.pattern import BreathingPattern
from app.domain.session import BreathingSession


class SessionManager:

    def __init__(self):
        self.session = None

    def create_session(self, inhale=5, exhale=5, pause_in=1, pause_out=1, duration=0):
        pattern = BreathingPattern(
            inhale=inhale,
            exhale=exhale,
            pause_in=pause_in,
            pause_out=pause_out,
        )
        self.session = BreathingSession(pattern, duration)
        return self.session

    def get_session(self):
        return self.session
