"""Validated public training parameters, independent of CUDA initialization."""
import math

PRESETS = {
    'balanced': dict(progress=1, survival=.08, offtrack=.12, smoothness=.04, speed=0),
    'safe': dict(progress=.8, survival=.25, offtrack=.4, smoothness=.1, speed=0),
    'pace': dict(progress=1.25, survival=.06, offtrack=.16, smoothness=.03, speed=.05),
}
BEHAVIORS = dict(separation=.45, avoidance=1.6, borders=.8)

def resolve_weights(objective='balanced', overrides=None):
    if objective not in PRESETS: raise ValueError('Invalid training objective')
    values = {**PRESETS[objective], **BEHAVIORS}
    if overrides is not None:
        if not isinstance(overrides, dict): raise ValueError('weights must be an object')
        for key, value in overrides.items():
            if key not in values: raise ValueError('Unknown training weight: '+str(key))
            limit = 5 if key in BEHAVIORS else 3
            if type(value) not in (int,float) or not math.isfinite(value) or not 0 <= value <= limit:
                raise ValueError(f'{key} weight must be between 0 and {limit}')
            values[key] = float(value)
    if not any(values[k] for k in PRESETS[objective]): raise ValueError('At least one score weight must be positive')
    return values
