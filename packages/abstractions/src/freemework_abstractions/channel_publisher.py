from abc import ABC, abstractmethod
from typing import Awaitable, Generic

from .channel_event import FChannelEvent, TChannelEventData
from .execution_context import FExecutionContext

class FChannelPublisher(ABC, Generic[TChannelEventData]):
    @abstractmethod
    def publish(self, executionContext: FExecutionContext, event: FChannelEvent[TChannelEventData]) -> Awaitable[None]:
        pass