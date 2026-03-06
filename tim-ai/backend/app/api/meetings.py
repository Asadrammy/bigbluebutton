"""
BigBlueButton Meeting Management API
Provides endpoints to create, join, list, and end BBB meetings.
"""
import hashlib
import logging
import time
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class CreateMeetingRequest(BaseModel):
    meeting_name: str = Field(
        default=None,
        description="Human-readable meeting name (defaults to server config)",
    )
    meeting_id: Optional[str] = Field(
        default=None,
        description="Custom meeting ID. Auto-generated if omitted.",
    )
    attendee_password: str = Field(default="ap", description="Password for attendee role")
    moderator_password: str = Field(default="mp", description="Password for moderator role")
    welcome_message: str = Field(
        default="Welcome to the Sign Language Translation meeting.",
        description="Message shown when participants join",
    )
    max_participants: int = Field(default=50, ge=2, le=500)
    record: bool = Field(default=False, description="Whether to record the meeting")
    mute_on_start: bool = Field(default=True)


class JoinMeetingRequest(BaseModel):
    meeting_id: str
    full_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(default="attendee", pattern="^(attendee|moderator)$")
    password: Optional[str] = None


class EndMeetingRequest(BaseModel):
    meeting_id: str
    password: str = Field(default="mp", description="Moderator password")


class MeetingResponse(BaseModel):
    meeting_id: str
    meeting_name: str
    join_url: Optional[str] = None
    created: bool = False
    message: str = ""


# ---------------------------------------------------------------------------
# BBB API helpers
# ---------------------------------------------------------------------------

def _bbb_checksum(api_call: str, query_string: str) -> str:
    """Generate SHA-1 checksum required by the BBB API."""
    raw = api_call + query_string + settings.bbb_shared_secret
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def _bbb_api_url(api_call: str, params: dict) -> str:
    """Build a full BBB API URL with the correct checksum."""
    query_parts = []
    for key, value in params.items():
        if value is not None:
            query_parts.append(f"{key}={value}")
    query_string = "&".join(query_parts)

    checksum = _bbb_checksum(api_call, query_string)
    if query_string:
        query_string += f"&checksum={checksum}"
    else:
        query_string = f"checksum={checksum}"

    base = settings.bbb_server_url.rstrip("/")
    return f"{base}/api/{api_call}?{query_string}"


async def _bbb_get(api_call: str, params: dict) -> str:
    """Perform a GET request to the BBB API and return the response text."""
    url = _bbb_api_url(api_call, params)
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.text


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/create", response_model=MeetingResponse)
async def create_meeting(body: CreateMeetingRequest):
    """
    Create a new BigBlueButton meeting.

    The meeting will be available for participants to join until it is
    explicitly ended or times out.
    """
    if not settings.bbb_shared_secret:
        raise HTTPException(
            status_code=503,
            detail="BigBlueButton is not configured. Set BBB_SERVER_URL and BBB_SHARED_SECRET.",
        )

    meeting_id = body.meeting_id or f"sign-meeting-{int(time.time())}"
    meeting_name = body.meeting_name or settings.bbb_default_meeting_name

    params = {
        "meetingID": meeting_id,
        "name": meeting_name,
        "attendeePW": body.attendee_password,
        "moderatorPW": body.moderator_password,
        "welcome": body.welcome_message,
        "maxParticipants": str(body.max_participants),
        "record": str(body.record).lower(),
        "muteOnStart": str(body.mute_on_start).lower(),
    }

    try:
        response_text = await _bbb_get("create", params)
        logger.info("BBB create response: %s", response_text[:300])

        if "<returncode>SUCCESS</returncode>" in response_text:
            return MeetingResponse(
                meeting_id=meeting_id,
                meeting_name=meeting_name,
                created=True,
                message="Meeting created successfully",
            )
        else:
            raise HTTPException(status_code=502, detail=f"BBB returned error: {response_text[:500]}")

    except httpx.HTTPError as exc:
        logger.error("BBB API request failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Could not reach BBB server: {exc}")


@router.post("/join", response_model=MeetingResponse)
async def join_meeting(body: JoinMeetingRequest):
    """
    Generate a join URL for a BigBlueButton meeting.

    The URL can be opened in a browser or embedded in a WebView/iframe.
    """
    if not settings.bbb_shared_secret:
        raise HTTPException(
            status_code=503,
            detail="BigBlueButton is not configured. Set BBB_SERVER_URL and BBB_SHARED_SECRET.",
        )

    password = body.password or ("mp" if body.role == "moderator" else "ap")

    params = {
        "meetingID": body.meeting_id,
        "fullName": body.full_name,
        "password": password,
    }

    join_url = _bbb_api_url("join", params)

    return MeetingResponse(
        meeting_id=body.meeting_id,
        meeting_name="",
        join_url=join_url,
        message="Join URL generated successfully",
    )


@router.get("/list")
async def list_meetings():
    """
    List all active BigBlueButton meetings.
    """
    if not settings.bbb_shared_secret:
        raise HTTPException(
            status_code=503,
            detail="BigBlueButton is not configured. Set BBB_SERVER_URL and BBB_SHARED_SECRET.",
        )

    try:
        response_text = await _bbb_get("getMeetings", {})
        logger.info("BBB getMeetings response: %s", response_text[:500])
        
        # Simple XML parsing using the standard library
        import xml.etree.ElementTree as ET
        root = ET.fromstring(response_text)
        
        meetings = []
        meetings_node = root.find("meetings")
        if meetings_node is not None:
            for meeting in meetings_node.findall("meeting"):
                meetings.append({
                    "meeting_id": meeting.findtext("meetingID"),
                    "meeting_name": meeting.findtext("meetingName"),
                    "created": True,
                    "message": "Active"
                })
        
        return {"meetings": meetings, "message": "Meeting list retrieved"}

    except Exception as exc:
        logger.error("BBB API request failed or Parse Error: %s", exc)
        # return empty list if something goes wrong (e.g. no meetings yet)
        return {"meetings": [], "message": f"Info: {exc}"}


@router.post("/end/{meeting_id}")
async def end_meeting(meeting_id: str, password: str = Query(default="mp")):
    """
    End an active BigBlueButton meeting.
    """
    if not settings.bbb_shared_secret:
        raise HTTPException(
            status_code=503,
            detail="BigBlueButton is not configured. Set BBB_SERVER_URL and BBB_SHARED_SECRET.",
        )

    params = {"meetingID": meeting_id, "password": password}

    try:
        response_text = await _bbb_get("end", params)
        logger.info("BBB end response: %s", response_text[:300])

        if "<returncode>SUCCESS</returncode>" in response_text:
            return {"meeting_id": meeting_id, "ended": True, "message": "Meeting ended successfully"}
        else:
            raise HTTPException(status_code=502, detail=f"BBB returned error: {response_text[:500]}")

    except httpx.HTTPError as exc:
        logger.error("BBB API request failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Could not reach BBB server: {exc}")


@router.get("/info/{meeting_id}")
async def meeting_info(meeting_id: str):
    """
    Get information about a specific BigBlueButton meeting.
    """
    if not settings.bbb_shared_secret:
        raise HTTPException(
            status_code=503,
            detail="BigBlueButton is not configured. Set BBB_SERVER_URL and BBB_SHARED_SECRET.",
        )

    params = {"meetingID": meeting_id}

    try:
        response_text = await _bbb_get("getMeetingInfo", params)
        return {"meeting_id": meeting_id, "raw_response": response_text}

    except httpx.HTTPError as exc:
        logger.error("BBB API request failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Could not reach BBB server: {exc}")
