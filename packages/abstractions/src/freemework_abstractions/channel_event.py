from typing import Generic, TypeVar

TChannelEventData = TypeVar("TData")

class FChannelEvent(Generic[TChannelEventData]):
    def __init__(self, data: TChannelEventData):
        super().__init__()
        self._data: TChannelEventData = data

    @property
    def data(self) -> TChannelEventData:
        return self._data
