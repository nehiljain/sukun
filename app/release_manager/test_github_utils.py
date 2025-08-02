# import unittest
# from datetime import datetime
# from .github_utils import (
#     get_previous_release,
# )
# from dataclasses import dataclass


# @dataclass
# class MockRelease:
#     tag_name: str
#     created_at: datetime


# class TestGetPreviousRelease(unittest.TestCase):
#     def test_copilotkit_releases(self):
#         releases = [
#             MockRelease("@copilotkit/shared@1.3.2", datetime(2023, 1, 6)),
#             MockRelease("@copilotkit/runtime@1.3.2", datetime(2023, 1, 5)),
#             MockRelease("@copilotkit/runtime-client-gql@1.3.2", datetime(2023, 1, 4)),
#             MockRelease("@copilotkit/shared@1.3.1", datetime(2023, 1, 3)),
#             MockRelease("@copilotkit/runtime@1.3.1", datetime(2023, 1, 2)),
#             MockRelease("@copilotkit/runtime-client-gql@1.3.1", datetime(2023, 1, 1)),
#         ]

#         current_release = MockRelease("@copilotkit/shared@1.3.2", datetime(2023, 1, 6))
#         previous_release = get_previous_release(current_release, releases)

#         self.assertEqual(previous_release.tag_name, "@copilotkit/shared@1.3.1")

#     def test_version_releases(self):
#         releases = [
#             MockRelease("v0.5.0", datetime(2023, 1, 5)),
#             MockRelease("v0.5.0-pre1", datetime(2023, 1, 4)),
#             MockRelease("v0.4.0", datetime(2023, 1, 3)),
#             MockRelease("v0.4.0-pre2", datetime(2023, 1, 2)),
#             MockRelease("v0.3.0", datetime(2023, 1, 1)),
#         ]

#         current_release = MockRelease("v0.4.0", datetime(2023, 1, 3))
#         previous_release = get_previous_release(current_release, releases)

#         self.assertEqual(previous_release.tag_name, "v0.3.0")

#     def test_version_releases_without_v_prefix(self):
#         releases = [
#             MockRelease("1.2.0", datetime(2023, 2, 5)),
#             MockRelease("1.1.3", datetime(2023, 2, 1)),
#             MockRelease("1.1.2", datetime(2023, 1, 25)),
#             MockRelease("1.1.1", datetime(2023, 1, 20)),
#             MockRelease("1.1.0", datetime(2023, 1, 15)),
#             MockRelease("1.0.0", datetime(2023, 1, 10)),
#         ]

#         current_release = MockRelease("1.1.3", datetime(2023, 2, 1))
#         previous_release = get_previous_release(current_release, releases)

#         self.assertEqual(previous_release.tag_name, "1.1.2")

#         current_release = MockRelease("1.2.0", datetime(2023, 2, 5))
#         previous_release = get_previous_release(current_release, releases)

#         self.assertEqual(previous_release.tag_name, "1.1.3")

#     def test_langchain_releases(self):
#         releases = [
#             MockRelease("langchain-core==0.2.41", datetime(2023, 1, 1)),
#             MockRelease("langchain-box==0.2.1", datetime(2023, 1, 2)),
#             MockRelease("langchain-robocorp==0.0.10.post1", datetime(2023, 1, 3)),
#             MockRelease("langchain-milvus==0.1.5", datetime(2023, 1, 4)),
#             MockRelease("langchain-core==0.3.1", datetime(2023, 1, 7)),
#             MockRelease("langchain==0.3.2", datetime(2023, 1, 6)),
#             MockRelease("langchain-core==0.3.0", datetime(2023, 1, 5)),
#         ]

#         current_release = MockRelease("langchain-core==0.3.1", datetime(2023, 1, 7))
#         previous_release = get_previous_release(current_release, releases)

#         self.assertEqual(previous_release.tag_name, "langchain-core==0.3.0")

#     def test_no_releases(self):
#         releases = []

#         current_release = MockRelease("v0.5.0", datetime(2023, 1, 5))
#         previous_release = get_previous_release(current_release, releases)

#         self.assertIsNone(previous_release)

#     def test_no_previous_release(self):
#         releases = [
#             MockRelease("v0.5.0", datetime(2023, 1, 5)),
#             MockRelease("v0.5.0-pre1", datetime(2023, 1, 4)),
#         ]

#         current_release = MockRelease("v0.5.0", datetime(2023, 1, 5))
#         previous_release = get_previous_release(current_release, releases)

#         self.assertIsNone(previous_release)


# if __name__ == "__main__":
#     unittest.main()
