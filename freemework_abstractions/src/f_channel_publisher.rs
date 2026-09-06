use futures::future::LocalBoxFuture;

use super::f_channel_event::FChannelEvent;
use super::f_exception::FException;
use super::f_execution_context::FExecutionContext;

///
/// Define some kind of Publish-Subscribe pattern. See https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern
///
pub trait FChannelPublisher<TEventArgs> {
    fn publish(
        &self,
        execution_context: FExecutionContext,
        event: FChannelEvent<TEventArgs>,
    ) -> LocalBoxFuture<'_, Result<(), FException>>;
}
