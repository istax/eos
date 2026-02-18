import time
from .enums import Phase
from .pattern import BreathingPattern


class BreathingSession:

    def __init__(self, pattern: BreathingPattern, duration_minutes: int = 0):
        self.pattern = pattern
        self.duration_minutes = duration_minutes

        self.phase = Phase.READY
        self.phase_start = None
        self.session_start = None

        self.is_active = False
        self.cycles_completed = 0
        self._ended_by_timer = False

    def start(self):
        now = time.time()
        self.session_start = now
        self.phase_start = now
        self.phase = Phase.INHALE
        self.is_active = True

    def stop(self):
        self.phase = Phase.COMPLETE
        self.is_active = False

    def _phase_duration(self):
        return {
            Phase.INHALE: self.pattern.inhale,
            Phase.PAUSE_IN: self.pattern.pause_in,
            Phase.EXHALE: self.pattern.exhale,
            Phase.PAUSE_OUT: self.pattern.pause_out,
        }.get(self.phase, 0)

    def _advance_phase(self):
        transitions = {
            Phase.INHALE: Phase.PAUSE_IN,
            Phase.PAUSE_IN: Phase.EXHALE,
            Phase.EXHALE: Phase.PAUSE_OUT,
            Phase.PAUSE_OUT: Phase.INHALE,
        }

        if self.phase == Phase.PAUSE_OUT:
            self.cycles_completed += 1

        self.phase = transitions.get(self.phase, Phase.COMPLETE)
        self.phase_start = time.time()

    def update(self):
        if not self.is_active:
            return self.phase

        now = time.time()

        if self.duration_minutes > 0:
            if now - self.session_start >= self.duration_minutes * 60:
                self._ended_by_timer = True
                self.stop()
                return self.phase

        if now - self.phase_start >= self._phase_duration():
            self._advance_phase()

        return self.phase

    def state(self):
        now = time.time()
        elapsed = int(now - self.session_start) if self.session_start else 0
        remaining = max(0, self.duration_minutes * 60 - elapsed) if self.duration_minutes > 0 else -1

        out = {
            "phase": self.phase,
            "active": self.is_active,
            "cycles_completed": self.cycles_completed,
            "elapsed": elapsed,
            "remaining": remaining,
            "duration_minutes": self.duration_minutes,
        }
        if not self.is_active:
            out["ended_by"] = "timer" if self._ended_by_timer else "user"
        return out
