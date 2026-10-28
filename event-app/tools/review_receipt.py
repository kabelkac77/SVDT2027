"""Validate a submitted review authorizes a fix at an exact, open PR head."""

import re

INVALID_REVIEW = "invalid_review"

_SHA_RE = re.compile(r"^[0-9a-f]{40}$")
_SUBMITTED_STATES = frozenset({"APPROVED", "CHANGES_REQUESTED", "COMMENTED"})


def _fail():
    raise ValueError(INVALID_REVIEW)


def _require_dict(value):
    if not isinstance(value, dict):
        _fail()
    return value


def _require_nonempty_str(value):
    if not isinstance(value, str) or not value:
        _fail()
    return value


def validate_review(review, pull_request, expected_head, actor, repository):
    _require_dict(review)
    _require_dict(pull_request)
    _require_nonempty_str(expected_head)
    _require_nonempty_str(actor)
    _require_nonempty_str(repository)

    if not _SHA_RE.match(expected_head):
        _fail()

    if pull_request.get("state") != "open":
        _fail()

    head = _require_dict(pull_request.get("head"))
    head_repo = _require_dict(head.get("repo"))
    if head_repo.get("full_name") != repository:
        _fail()

    head_sha = head.get("sha")
    if not isinstance(head_sha, str) or head_sha != expected_head:
        _fail()

    base = _require_dict(pull_request.get("base"))
    base_repo = _require_dict(base.get("repo"))
    if base_repo.get("full_name") != repository:
        _fail()

    user = _require_dict(review.get("user"))
    if user.get("login") != actor:
        _fail()

    if review.get("commit_id") != expected_head:
        _fail()

    submitted_at = review.get("submitted_at")
    if not isinstance(submitted_at, str) or not submitted_at:
        _fail()

    state = review.get("state")
    if state not in _SUBMITTED_STATES:
        _fail()

    return True
