from fastapi import APIRouter
from app.services.session_manager import SessionManager

router = APIRouter()
manager = SessionManager()


@router.post("/start")
def start_session(
    duration: int = 10,
    inhale: float = 5,
    hold_in: float = 1,
    exhale: float = 5,
    hold_out: float = 1,
):
    session = manager.create_session(
        inhale=inhale,
        exhale=exhale,
        pause_in=hold_in,
        pause_out=hold_out,
        duration=duration,
    )
    session.start()
    return {"status": "started"}


@router.post("/stop")
def stop_session():
    session = manager.get_session()
    if session:
        session.stop()
    return {"status": "stopped"}


@router.get("/state")
def get_state():
    session = manager.get_session()
    if not session:
        return {"phase": "ready", "active": False}

    session.update()
    return session.state()
