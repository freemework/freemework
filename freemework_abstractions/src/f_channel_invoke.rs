use futures::future::LocalBoxFuture;

use super::{FException, FExecutionContext};

pub trait FChannelInvoke<TIn, TOut> {
    fn invoke(
        &self,
        execution_context: FExecutionContext,
        args: TIn,
    ) -> LocalBoxFuture<'_, Result<TOut, FException>>;
}
