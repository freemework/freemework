use futures::future::BoxFuture;

use super::f_exception::FException;

use crate::{sync::f_channel_event::FChannelEvent, sync::f_execution_context::FExecutionContext};

pub trait FChannelPublisher<T: Send + Sync>: Send + Sync {
    fn publish(
        &self,
        execution_context: FExecutionContext,
        event: FChannelEvent<T>,
    ) -> BoxFuture<'_, Result<(), FException>>;
}
