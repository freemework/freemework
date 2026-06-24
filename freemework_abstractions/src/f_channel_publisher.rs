use std::pin::Pin;

use crate::{f_channel_event::FChannelEvent, f_execution_context::FExecutionContext};

pub trait FChannelPublisher<T> {
    type Error;

    fn publish(
        &self,
        execution_context: FExecutionContext,
        event: FChannelEvent<T>,
    ) -> Pin<Box<dyn Future<Output = Result<(), Self::Error>>>>;
}
