from dataclasses import dataclass


@dataclass
class BreathingPattern:
    inhale: float
    exhale: float
    pause_in: float = 1.0
    pause_out: float = 1.0

    @property
    def total_cycle(self) -> float:
        return self.inhale + self.pause_in + self.exhale + self.pause_out
