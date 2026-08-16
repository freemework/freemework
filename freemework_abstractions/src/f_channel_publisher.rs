use futures::future::BoxFuture;

use super::f_channel_event::FChannelEvent;
use super::f_exception::FException;
use super::f_execution_context::FExecutionContext;

pub trait FChannelPublisher<T> {
    fn publish(
        &self,
        execution_context: FExecutionContext,
        event: FChannelEvent<T>,
    ) -> BoxFuture<'_, Result<(), FException>>;
}
