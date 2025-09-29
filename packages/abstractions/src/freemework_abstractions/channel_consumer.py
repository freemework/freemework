from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Awaitable, Callable, Generic, TypeVar, Union

from .channel_event import FChannelEvent, TChannelEventData
from .execution_context import FExecutionContext
from .exception import FException

TChannelConsumerCallbackEvent = TypeVar("TEvent", bound="FChannelEvent[TChannelEventData]")

FChannelConsumerCallback = Callable[[FExecutionContext, Union[TChannelConsumerCallbackEvent, FException]], Awaitable[None]]

class FChannelConsumer(ABC, Generic[TChannelEventData, TChannelConsumerCallbackEvent]):
    @abstractmethod
    def add_handler(self, cb: FChannelConsumerCallback[TChannelConsumerCallbackEvent[TChannelEventData]]) -> None:
        pass

    @abstractmethod
    def remove_handler(self, cb: FChannelConsumerCallback[TChannelConsumerCallbackEvent[TChannelEventData]]) -> None:
        pass
