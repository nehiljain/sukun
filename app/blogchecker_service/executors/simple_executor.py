from typing import List
from blogchecker_service.executors.base import BaseExecutor
from blogchecker_service.checkers.base import CheckOutput
import logging

logger = logging.getLogger(__name__)

class SimpleExecutor(BaseExecutor):

    def __init__(self):
        super().__init__()

    def run(self, url: str) -> List[CheckOutput]:
        """Run all checkers on the given URL."""
        results = []
        for checker in self.checkers:
            logger.info(f"Running checker: {checker.__class__.__name__}")
            try:
                result = checker.run(url)
                logger.info(f"Run Complete: {checker.__class__.__name__}")
                logger.debug(f"{checker.__class__.__name__} Run Result: {result}")
                results.append(result)
            except Exception as e:
                logger.error(f"Error running checker: {checker.__class__.__name__}")
                logger.error(f"Error: {e}")
                results.append(
                    CheckOutput(
                        success=False,
                        link=url,
                        checker_name=checker.__class__.__name__,
                        output={"error": str(e)},
                    )
                )
        return results
