use futures::future::BoxFuture;

use super::f_channel_event::FChannelEvent;
use super::f_exception::FException;
use super::f_execution_context::FExecutionContext;

///
/// Define some kind of Publish-Subscribe pattern. See https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern
///
pub trait FChannelPublisher<TEventArgs: Send + Sync>: Send + Sync {
    fn publish(
        &self,
        execution_context: FExecutionContext,
        event: FChannelEvent<TEventArgs>,
    ) -> BoxFuture<'_, Result<(), FException>>;
}
