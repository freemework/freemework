from abc import ABC, abstractmethod
from typing import Generic, TypeVar

from .execution_context import FExecutionContext

TData = TypeVar('TData')

class FChannelPublisher(ABC, Generic[TData]):
    @abstractmethod
    def publish(executionContext: FExecutionContext, data: TData) -> None:
        pass