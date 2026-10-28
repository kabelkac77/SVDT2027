"""Synthetic, non-production unit tests for review_receipt.validate_review."""

import copy
import importlib.util
import pathlib
import unittest

_MODULE_PATH = pathlib.Path(__file__).resolve().parents[1] / "tools" / "review_receipt.py"
_SPEC = importlib.util.spec_from_file_location("review_receipt", _MODULE_PATH)
review_receipt = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(review_receipt)

validate_review = review_receipt.validate_review
INVALID_REVIEW = review_receipt.INVALID_REVIEW

EXPECTED_HEAD = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
STALE_HEAD = "cafebabecafebabecafebabecafebabecafebabe"
REPOSITORY = "octo-fictional/svdt-demo"
FOREIGN_REPOSITORY = "octo-fictional/other-repo"
ACTOR = "svdt-fictional-reviewer"
FOREIGN_ACTOR = "svdt-outsider"


def _make_pull_request(**overrides):
    pull_request = {
        "state": "open",
        "head": {"sha": EXPECTED_HEAD, "repo": {"full_name": REPOSITORY}},
        "base": {"repo": {"full_name": REPOSITORY}},
    }
    pull_request.update(overrides)
    return pull_request


def _make_review(**overrides):
    review = {
        "user": {"login": ACTOR},
        "commit_id": EXPECTED_HEAD,
        "submitted_at": "2026-10-28T12:00:00Z",
        "state": "APPROVED",
    }
    review.update(overrides)
    return review


class ValidateReviewTest(unittest.TestCase):
    def test_valid_review_returns_true(self):
        for state in ("APPROVED", "CHANGES_REQUESTED", "COMMENTED"):
            with self.subTest(state=state):
                self.assertTrue(
                    validate_review(
                        _make_review(state=state),
                        _make_pull_request(),
                        EXPECTED_HEAD,
                        ACTOR,
                        REPOSITORY,
                    )
                )

    def test_does_not_mutate_inputs(self):
        review = _make_review()
        pull_request = _make_pull_request()
        review_copy = copy.deepcopy(review)
        pull_request_copy = copy.deepcopy(pull_request)

        validate_review(review, pull_request, EXPECTED_HEAD, ACTOR, REPOSITORY)

        self.assertEqual(review, review_copy)
        self.assertEqual(pull_request, pull_request_copy)

    def test_rejects_non_mapping_review(self):
        with self.assertRaises(ValueError) as ctx:
            validate_review(["not", "a", "dict"], _make_pull_request(), EXPECTED_HEAD, ACTOR, REPOSITORY)
        self.assertEqual(str(ctx.exception), INVALID_REVIEW)

    def test_rejects_non_mapping_pull_request(self):
        with self.assertRaises(ValueError):
            validate_review(_make_review(), "not-a-dict", EXPECTED_HEAD, ACTOR, REPOSITORY)

    def test_rejects_malformed_expected_head(self):
        for bad_head in ("short", "g" * 40, EXPECTED_HEAD.upper(), 12345, None, ""):
            with self.subTest(bad_head=bad_head):
                with self.assertRaises(ValueError):
                    validate_review(_make_review(), _make_pull_request(), bad_head, ACTOR, REPOSITORY)

    def test_rejects_missing_or_invalid_actor(self):
        for bad_actor in (None, "", 123):
            with self.subTest(bad_actor=bad_actor):
                with self.assertRaises(ValueError):
                    validate_review(_make_review(), _make_pull_request(), EXPECTED_HEAD, bad_actor, REPOSITORY)

    def test_rejects_missing_or_invalid_repository(self):
        for bad_repo in (None, "", 123):
            with self.subTest(bad_repo=bad_repo):
                with self.assertRaises(ValueError):
                    validate_review(_make_review(), _make_pull_request(), EXPECTED_HEAD, ACTOR, bad_repo)

    def test_rejects_closed_pull_request(self):
        with self.assertRaises(ValueError):
            validate_review(
                _make_review(),
                _make_pull_request(state="closed"),
                EXPECTED_HEAD,
                ACTOR,
                REPOSITORY,
            )

    def test_rejects_foreign_head_repository(self):
        pull_request = _make_pull_request(
            head={"sha": EXPECTED_HEAD, "repo": {"full_name": FOREIGN_REPOSITORY}}
        )
        with self.assertRaises(ValueError):
            validate_review(_make_review(), pull_request, EXPECTED_HEAD, ACTOR, REPOSITORY)

    def test_rejects_foreign_base_repository(self):
        pull_request = _make_pull_request(base={"repo": {"full_name": FOREIGN_REPOSITORY}})
        with self.assertRaises(ValueError):
            validate_review(_make_review(), pull_request, EXPECTED_HEAD, ACTOR, REPOSITORY)

    def test_rejects_stale_head_sha(self):
        pull_request = _make_pull_request(
            head={"sha": STALE_HEAD, "repo": {"full_name": REPOSITORY}}
        )
        with self.assertRaises(ValueError):
            validate_review(_make_review(), pull_request, EXPECTED_HEAD, ACTOR, REPOSITORY)

    def test_rejects_foreign_review_author(self):
        review = _make_review(user={"login": FOREIGN_ACTOR})
        with self.assertRaises(ValueError):
            validate_review(review, _make_pull_request(), EXPECTED_HEAD, ACTOR, REPOSITORY)

    def test_rejects_mismatched_commit_id(self):
        review = _make_review(commit_id=STALE_HEAD)
        with self.assertRaises(ValueError):
            validate_review(review, _make_pull_request(), EXPECTED_HEAD, ACTOR, REPOSITORY)

    def test_rejects_missing_submitted_at(self):
        for bad_submitted_at in (None, "", 0):
            with self.subTest(bad_submitted_at=bad_submitted_at):
                review = _make_review(submitted_at=bad_submitted_at)
                with self.assertRaises(ValueError):
                    validate_review(review, _make_pull_request(), EXPECTED_HEAD, ACTOR, REPOSITORY)

    def test_rejects_pending_review(self):
        review = _make_review(state="PENDING")
        with self.assertRaises(ValueError):
            validate_review(review, _make_pull_request(), EXPECTED_HEAD, ACTOR, REPOSITORY)

    def test_rejects_missing_nested_fields(self):
        pull_request = _make_pull_request()
        del pull_request["head"]
        with self.assertRaises(ValueError):
            validate_review(_make_review(), pull_request, EXPECTED_HEAD, ACTOR, REPOSITORY)

    def test_error_category_never_leaks_payload(self):
        review = _make_review(user={"login": FOREIGN_ACTOR})
        with self.assertRaises(ValueError) as ctx:
            validate_review(review, _make_pull_request(), EXPECTED_HEAD, ACTOR, REPOSITORY)
        message = str(ctx.exception)
        self.assertEqual(message, INVALID_REVIEW)
        self.assertNotIn(FOREIGN_ACTOR, message)
        self.assertNotIn(EXPECTED_HEAD, message)
        self.assertNotIn(REPOSITORY, message)


if __name__ == "__main__":
    unittest.main()
