from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Awaitable, Callable, Generic, TypeVar

from .channel_event import FChannelEvent, TChannelEventData
from .execution_context import FExecutionContext

TChannelConsumerUnbreakableCallbackEvent = TypeVar("TEvent", bound="FChannelEvent[TChannelEventData]")

FChannelConsumerUnbreakableCallback = Callable[[FExecutionContext, TChannelConsumerUnbreakableCallbackEvent], Awaitable[None]]

class FChannelConsumerUnbreakable(ABC, Generic[TChannelEventData, TChannelConsumerUnbreakableCallbackEvent]):
    @abstractmethod
    def add_handler(self, cb: FChannelConsumerUnbreakableCallback[TChannelConsumerUnbreakableCallbackEvent[TChannelEventData]]) -> None:
        pass

    @abstractmethod
    def remove_handler(self, cb: FChannelConsumerUnbreakableCallback[TChannelConsumerUnbreakableCallbackEvent[TChannelEventData]]) -> None:
        pass
