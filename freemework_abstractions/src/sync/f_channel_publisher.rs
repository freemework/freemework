use futures::future::BoxFuture;

use crate::{sync::f_channel_event::FChannelEvent, sync::f_execution_context::FExecutionContext};

pub trait FChannelPublisher<T: Send + Sync>: Send + Sync {
    type Error;

    fn publish(
        &self,
        execution_context: FExecutionContext,
        event: FChannelEvent<T>,
    ) -> BoxFuture<'static, Result<(), Self::Error>>;
}
