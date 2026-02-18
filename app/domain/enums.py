from enum import Enum


class Phase(str, Enum):
    READY = "ready"
    INHALE = "inhale"
    PAUSE_IN = "pause_in"
    EXHALE = "exhale"
    PAUSE_OUT = "pause_out"
    COMPLETE = "complete"
