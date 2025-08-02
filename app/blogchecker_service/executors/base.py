from abc import ABC, abstractmethod
from typing import List
from blogchecker_service.checkers.base import BaseChecker, CheckOutput

class BaseExecutor(ABC):

    def __new__(cls, *args, **kwargs):
        if cls is BaseExecutor:
            raise TypeError("BaseExecutor is an abstract class and cannot be instantiated")
        return super().__new__(cls)

    def __init__(self):
        self.checkers: List[BaseChecker] = []
        super().__init__()

    def add_checker(self, checker: BaseChecker):
        """Add a new checker to the service."""
        self.checkers.append(checker)

    @abstractmethod
    def run(self, url: str) -> List[CheckOutput]:
        pass
