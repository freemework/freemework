use futures::future::BoxFuture;

use super::FException;
use super::FExecutionContext;

pub trait FChannelInvoke<TIn: Send + Sync, TOut: Send + Sync> {
    fn invoke(
        &self,
        execution_context: FExecutionContext,
        args: TIn,
    ) -> BoxFuture<'_, Result<TOut, FException>>;
}
