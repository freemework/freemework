from abc import ABC, abstractmethod
from typing import Generic, TypeVar

TChannelEventData = TypeVar("TData")

class FChannelEvent(ABC, Generic[TChannelEventData]):
    @property
    @abstractmethod
    def data(self) -> TChannelEventData:
        pass
